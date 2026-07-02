#!/usr/bin/env bash
# Re-sign a locally built ReCue.app with the Hardened Runtime + ReCue's entitlements
# and a STABLE identity so macOS permissions (microphone / voice, protected folders,
# system settings) prompt ONCE, actually work after "Allow", AND persist across
# rebuilds. macOS-only. (#292 built the machinery; #314 makes a plain build apply it.)
#
# WHY this script is MANDATORY, not optional
# ------------------------------------------
# A plain `npm run tauri build` does NOT embed the entitlements or the Hardened
# Runtime. bundle.macOS.entitlements (Entitlements.plist) + `codesign --options
# runtime` are only applied by the Tauri macOS bundler when a signing identity is
# configured. With no identity — the local + dormant-CI default — the bundler leaves
# the binary in its linker-signed *ad-hoc* state and re-signs nothing. Inspecting such
# a build shows (all defects, empirically confirmed on-box):
#   * Identifier=recue-…            (linker-derived, NOT com.recue.app)
#   * flags=0x20002(adhoc,linker-signed)   (NO 0x10000 "runtime" → Hardened Runtime OFF)
#   * Signature=adhoc, Info.plist=not bound, Sealed Resources=none
#   * 0 audio-input entitlements
#   * designated => cdhash H"…"      (DR pinned to the exact binary hash)
# So BOTH failure halves are present in every unsigned build:
#   1. "Allow" never works — the com.apple.security.device.audio-input entitlement is
#      absent and the Hardened Runtime is off, so macOS cannot grant mic access even
#      after Allow (same story for protected folders / system settings — the
#      NS*UsageDescription string alone is not enough); and
#   2. prompts repeat / never persist — the Designated Requirement is a per-build
#      cdhash and the signature is malformed, so TCC cannot record or match a durable
#      grant, and every access attempt re-prompts.
# This script FORCE re-signs the built .app to fix all of the above.
#
# HOW A STABLE IDENTITY MAKES GRANTS PERSIST (no Apple account needed)
# -------------------------------------------------------------------
# TCC keys a grant by service + bundle id + the app's Designated Requirement (DR)
# captured at grant time:
#   * Self-signed cert (NOT ad-hoc) → the DR references that cert's hash → stable
#     across rebuilds as long as the SAME cert signs → grants persist. No Apple
#     account required. (Gatekeeper still warns for a downloaded build — that is a
#     separate concern from TCC.)
#   * Ad-hoc / linker-signed (`-`)  → no cert → the DR degrades to `cdhash H"<hash>"`
#     → every rebuild is a brand-new app to TCC → the prompt returns every time.
# The Hardened Runtime (codesign --options runtime, CodeDirectory flag 0x10000) is
# required for entitlements like audio-input to be honored at all.
#
# USAGE
# -----
#   ./scripts/sign-macos-local.sh <path-to-ReCue.app>
#
# The signing identity is resolved in this order:
#   1. $SIGN_IDENTITY, if set                       — used verbatim (Developer ID or self-signed).
#   2. a local identity named $RECUE_SIGN_IDENTITY_NAME
#      (default "ReCue Local Signing"), if it already exists in your keychain.
#   3. if $RECUE_CREATE_IDENTITY=1, that named self-signed code-signing identity is
#      CREATED non-interactively (login keychain) and used.
#   4. otherwise the script REFUSES to sign ad-hoc (which would silently reproduce the
#      broken, non-persistent state) and tells you how to fix it. Set
#      $RECUE_ALLOW_ADHOC=1 to force an ad-hoc signature anyway (grants will NOT
#      persist — for a throwaway check only).
#
# One-command build + sign (macOS only):  npm run build:mac
# (that runs `tauri build` then this script with RECUE_CREATE_IDENTITY=1).
#
# Examples:
#   # First run: create a stable self-signed identity and sign with it.
#   RECUE_CREATE_IDENTITY=1 ./scripts/sign-macos-local.sh \
#     src-tauri/target/universal-apple-darwin/release/bundle/macos/ReCue.app
#   # Subsequent runs reuse the same identity automatically (grants persist):
#   ./scripts/sign-macos-local.sh path/to/ReCue.app
#   # Use a specific identity (e.g. a real Developer ID):
#   SIGN_IDENTITY="Developer ID Application: You (TEAMID)" ./scripts/sign-macos-local.sh path/to/ReCue.app
#
# VERIFY (this script also asserts these and FAILS if any is wrong):
#   codesign -dv --verbose=4 <app>          → flags line includes "runtime"; Identifier=com.recue.app
#   codesign -d --entitlements - <app>      → lists com.apple.security.device.audio-input
#   codesign --verify --strict <app>        → passes
#   codesign -d -r - <app>                  → a cert/identifier-based DR (NOT `cdhash H"…"`)
#
# RECOVERY (if an earlier broken build already poisoned TCC):
#   tccutil reset Microphone com.recue.app
# then remove any stale "ReCue" rows under System Settings ▸ Privacy & Security, move
# the app to /Applications (defeat App Translocation), and re-grant once. Full
# walkthrough: docs/macos-permissions.md.
set -euo pipefail

# ---------------------------------------------------------------------------
# Inputs / paths
# ---------------------------------------------------------------------------
app="${1:?usage: sign-macos-local.sh <path-to-ReCue.app>}"
[ -d "$app" ] || {
	echo "sign-macos-local: no such .app bundle: $app" >&2
	exit 1
}

# Entitlements live next to this script's repo (…/scripts/ → …/src-tauri/Entitlements.plist).
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
entitlements="$here/../src-tauri/Entitlements.plist"
[ -f "$entitlements" ] || {
	echo "sign-macos-local: entitlements not found: $entitlements" >&2
	exit 1
}

# codesign's AMFI entitlements parser is stricter than plutil and REJECTS the XML
# comment block that the tracked Entitlements.plist carries for humans ("Failed to
# parse entitlements: AMFIUnserializeXML: syntax error"). Feed codesign a comment-free,
# canonical copy generated at sign time — the tracked file is left untouched.
sign_tmp="$(mktemp -d)"
cleanup() { rm -rf "$sign_tmp"; }
trap cleanup EXIT
entitlements_signing="$sign_tmp/Entitlements.plist"
if ! plutil -convert xml1 -o "$entitlements_signing" "$entitlements" >/dev/null 2>&1; then
	# plutil missing/failed — fall back to the original file so a real problem surfaces
	# loudly at codesign rather than being silently mis-signed.
	entitlements_signing="$entitlements"
fi

RECUE_SIGN_IDENTITY_NAME="${RECUE_SIGN_IDENTITY_NAME:-ReCue Local Signing}"

warn() { printf '\n\033[1;33m%s\033[0m\n' "$*" >&2; }
note() { printf 'sign-macos-local: %s\n' "$*"; }

# ---------------------------------------------------------------------------
# Stable self-signed identity helpers
# ---------------------------------------------------------------------------
# True if a code-signing identity with the given name already exists AND can be used
# by codesign. NOTE: we deliberately do NOT pass `-v` (valid-only): a self-signed cert
# is untrusted (`CSSMERR_TP_NOT_TRUSTED`) so `-v` hides it, yet codesign can still SIGN
# with it (trust only gates verification/Gatekeeper, not signing). Listing without `-v`
# reflects what codesign can actually use.
identity_exists() {
	local name="$1"
	security find-identity -p codesigning 2>/dev/null | grep -qF "\"$name\""
}

# Create a self-signed CODE-SIGNING identity in the login keychain, non-interactively
# and idempotently. macOS-only, opt-in (RECUE_CREATE_IDENTITY=1). Touching the login
# keychain may require your login password once. Returns non-zero on any failure so
# the caller can fall back rather than abort.
create_identity() {
	local name="$1"
	identity_exists "$name" && return 0 # already present → no-op

	command -v openssl >/dev/null 2>&1 || {
		warn "sign-macos-local: openssl not found — cannot create a self-signed identity."
		return 1
	}

	local tmp key crt p12 cfg p12pw keychain
	tmp="$(mktemp -d)" || return 1
	key="$tmp/key.pem"
	crt="$tmp/cert.pem"
	p12="$tmp/cert.p12"
	cfg="$tmp/openssl.cnf"
	p12pw="recue-local-signing"

	# A minimal self-signed cert with the Code Signing extended key usage so it shows
	# up under `security find-identity -p codesigning` and codesign will accept it.
	cat >"$cfg" <<-EOF
		[req]
		distinguished_name = dn
		x509_extensions    = ext
		prompt             = no
		[dn]
		CN = $name
		[ext]
		basicConstraints     = critical, CA:false
		keyUsage             = critical, digitalSignature
		extendedKeyUsage     = critical, codeSigning
	EOF

	if ! openssl req -x509 -newkey rsa:2048 -keyout "$key" -out "$crt" \
		-days 3650 -nodes -config "$cfg" >/dev/null 2>&1; then
		warn "sign-macos-local: openssl could not generate the self-signed certificate."
		rm -rf "$tmp"
		return 1
	fi
	# Bundle the cert + key into a .p12 that macOS's keychain can import. OpenSSL 3.x
	# defaults to AES/PBES2 encryption that `security import` CANNOT read (it imports
	# the cert but silently drops the private key → no usable identity), so we ask for
	# the legacy (3DES/SHA1) encryption via `-legacy`. Stock macOS ships LibreSSL, which
	# does not know `-legacy` but already defaults to the compatible legacy algorithms —
	# so fall back to a plain export there.
	if ! openssl pkcs12 -export -legacy -inkey "$key" -in "$crt" -out "$p12" \
		-passout "pass:$p12pw" -name "$name" >/dev/null 2>&1; then
		if ! openssl pkcs12 -export -inkey "$key" -in "$crt" -out "$p12" \
			-passout "pass:$p12pw" -name "$name" >/dev/null 2>&1; then
			warn "sign-macos-local: openssl could not bundle the .p12."
			rm -rf "$tmp"
			return 1
		fi
	fi

	# Default (login) keychain; strip the surrounding quotes/whitespace security prints.
	keychain="$(security default-keychain -d user 2>/dev/null | sed -e 's/^[[:space:]]*"//' -e 's/"[[:space:]]*$//')"
	[ -n "$keychain" ] || keychain="$HOME/Library/Keychains/login.keychain-db"

	# Import cert + private key, pre-authorizing /usr/bin/codesign to use the key.
	if ! security import "$p12" -k "$keychain" -P "$p12pw" -T /usr/bin/codesign >/dev/null 2>&1; then
		warn "sign-macos-local: could not import the identity into the login keychain."
		rm -rf "$tmp"
		return 1
	fi
	# Let codesign read the key without an interactive prompt on every run. Best-effort:
	# needs the keychain unlock password (RECUE_KEYCHAIN_PASSWORD, else empty). If this
	# fails, codesign may prompt for keychain access once via a GUI dialog — harmless.
	security set-key-partition-list -S apple-tool:,apple: \
		-k "${RECUE_KEYCHAIN_PASSWORD:-}" "$keychain" >/dev/null 2>&1 || true

	rm -rf "$tmp"
	identity_exists "$name"
}

# ---------------------------------------------------------------------------
# Resolve the signing identity (see the ordered contract in the header)
# ---------------------------------------------------------------------------
identity=""
identity_source=""

if [ -n "${SIGN_IDENTITY:-}" ]; then
	identity="$SIGN_IDENTITY"
	identity_source="\$SIGN_IDENTITY"
elif identity_exists "$RECUE_SIGN_IDENTITY_NAME"; then
	identity="$RECUE_SIGN_IDENTITY_NAME"
	identity_source="auto-detected local identity"
elif [ "${RECUE_CREATE_IDENTITY:-0}" = "1" ]; then
	note "creating stable self-signed identity: $RECUE_SIGN_IDENTITY_NAME"
	if create_identity "$RECUE_SIGN_IDENTITY_NAME"; then
		identity="$RECUE_SIGN_IDENTITY_NAME"
		identity_source="freshly-created self-signed identity"
	else
		warn "sign-macos-local: identity creation failed; see the messages above."
	fi
fi

if [ -z "$identity" ]; then
	# No stable identity available. Refuse to silently ad-hoc-sign — that reproduces
	# the exact broken state (per-build cdhash DR → grants never persist).
	if [ "${RECUE_ALLOW_ADHOC:-0}" = "1" ]; then
		identity="-"
		identity_source="AD-HOC (RECUE_ALLOW_ADHOC=1)"
		warn "===================================================================="
		warn " SIGNING AD-HOC. Grants will NOT persist across rebuilds, because an"
		warn " ad-hoc signature has a per-build cdhash Designated Requirement that"
		warn " macOS TCC treats as a brand-new app each time. Use this only for a"
		warn " throwaway check. For persistent permissions, sign with a stable"
		warn " identity (see below)."
		warn "===================================================================="
	else
		warn "===================================================================="
		warn " REFUSING to ad-hoc-sign: an ad-hoc signature has a per-build cdhash"
		warn " Designated Requirement, so macOS re-prompts every rebuild and the"
		warn " grant never persists — the exact bug this script exists to fix."
		warn ""
		warn " Fix (pick one):"
		warn "   * Create + use a stable self-signed identity (recommended, no"
		warn "     Apple account needed):"
		warn "       RECUE_CREATE_IDENTITY=1 $0 \"$app\""
		warn "     (or simply: npm run build:mac)"
		warn "   * Use an existing identity by exact name:"
		warn "       SIGN_IDENTITY=\"Developer ID Application: You (TEAMID)\" $0 \"$app\""
		warn "   * Force ad-hoc anyway (grants will NOT persist):"
		warn "       RECUE_ALLOW_ADHOC=1 $0 \"$app\""
		warn "===================================================================="
		exit 2
	fi
fi

note "signing with identity: $identity  ($identity_source)"

# ---------------------------------------------------------------------------
# Sign — nested code first, then the outer bundle with entitlements
# ---------------------------------------------------------------------------
# Sign nested Mach-O bundles / libraries (frameworks, helper apps, dylibs) deepest
# first, WITHOUT the app identifier or entitlements (those apply to the main bundle
# only). This replaces the deprecated `codesign --deep`, which Apple discourages
# because it applies the outer flags/entitlements indiscriminately to nested code.
while IFS= read -r nested; do
	[ -n "$nested" ] || continue
	note "signing nested: ${nested#"$app"/}"
	codesign --force --options runtime --sign "$identity" "$nested"
done < <(
	find "$app/Contents" \
		\( -name '*.dylib' -o -name '*.so' -o -name '*.framework' -o -name '*.app' \) \
		2>/dev/null | awk '{ print length, $0 }' | sort -rn | cut -d' ' -f2-
)

# Sign the outer bundle. `-i com.recue.app` forces the signing identifier to match the
# bundle id (fixing the Identifier=recue-… / Info.plist=not bound defects of the
# linker-signed default); `--options runtime` turns on the Hardened Runtime so the
# entitlements are honored; `--entitlements` embeds audio-input + library-validation.
note "signing bundle: $app"
codesign --force --options runtime \
	--entitlements "$entitlements_signing" \
	-i com.recue.app \
	--sign "$identity" \
	"$app"

# ---------------------------------------------------------------------------
# Verify — fail loudly (non-zero exit) if the signature is not correct
# ---------------------------------------------------------------------------
fail=0
echo
note "verifying signature…"

info="$(codesign -dv --verbose=4 "$app" 2>&1 || true)"
flags_line="$(printf '%s\n' "$info" | grep -i 'flags=' || true)"
ident_line="$(printf '%s\n' "$info" | grep -i '^Identifier=' || true)"
printf '  %s\n' "$ident_line"
printf '  %s\n' "$flags_line"

if printf '%s' "$flags_line" | grep -qi 'runtime'; then
	note "OK: Hardened Runtime is ON (flags include 'runtime')."
else
	warn "FAIL: Hardened Runtime is OFF — the 'runtime' flag is missing. Entitlements will not be honored."
	fail=1
fi

if printf '%s' "$ident_line" | grep -q 'Identifier=com.recue.app'; then
	note "OK: Identifier is com.recue.app."
else
	warn "FAIL: Identifier is not com.recue.app (got: ${ident_line:-<none>})."
	fail=1
fi

ents="$(codesign -d --entitlements - "$app" 2>/dev/null || true)"
if printf '%s' "$ents" | grep -q 'audio-input'; then
	note "OK: com.apple.security.device.audio-input entitlement is present."
else
	warn "FAIL: the audio-input entitlement is missing from the signature."
	fail=1
fi
if printf '%s' "$ents" | grep -q 'disable-library-validation'; then
	note "OK: com.apple.security.cs.disable-library-validation entitlement is present."
else
	warn "FAIL: the disable-library-validation entitlement is missing (a self-signed Hardened-Runtime app may not launch)."
	fail=1
fi

if codesign --verify --strict --verbose=2 "$app" 2>&1; then
	note "OK: codesign --verify --strict passes."
else
	warn "FAIL: codesign --verify --strict did not pass."
	fail=1
fi

# Designated Requirement: a cert/identifier-based DR means grants persist across
# rebuilds; a `cdhash H"…"` DR (ad-hoc) means they will NOT.
dr="$(codesign -d -r - "$app" 2>&1 || true)"
echo
note "designated requirement:"
printf '  %s\n' "$dr"
if printf '%s' "$dr" | grep -qi 'cdhash'; then
	warn "NOTE: the Designated Requirement is cdhash-based → grants will NOT persist across rebuilds."
	warn "      Sign with a stable identity (RECUE_CREATE_IDENTITY=1 or SIGN_IDENTITY) so the DR is cert-based."
else
	note "OK: the Designated Requirement is cert/identifier-based → grants persist across rebuilds with this identity."
fi

# Gatekeeper assessment is informational only: an un-notarized self-signed build is
# *expected* to be rejected by spctl (Gatekeeper warns on download) even though its
# TCC signature is correct — so this never gates the result.
echo
note "Gatekeeper assessment (informational — a self-signed build is expected to be 'rejected'):"
spctl -a -vvv -t exec "$app" 2>&1 | sed 's/^/  /' || true

echo
if [ "$fail" -ne 0 ]; then
	warn "sign-macos-local: signature verification FAILED — see the FAIL lines above."
	exit 1
fi

note "signed + verified: $app"
note "If an earlier broken build already poisoned TCC, reset it once:"
note "    tccutil reset Microphone com.recue.app"
note "Then remove stale ReCue rows in System Settings ▸ Privacy & Security, move the"
note "app to /Applications (defeat App Translocation), relaunch, and grant once."
note "Full walkthrough + recovery: docs/macos-permissions.md"
