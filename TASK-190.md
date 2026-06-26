# Task 190

### 190. [ ] Auto-update skeleton: gated release pipeline + in-app update UI (keys deferred)

**Status:** Not started
**Depends on:** none
**Created:** 2026-06-26

**Description**

Stand up the **foundation** for in-app auto-update so it's ready to switch on once a real
Tauri signing keypair is generated (a later task). This **re-introduces** the mechanism
that **#62 removed** (#62 deleted the #15 Tauri-updater: the updater/process plugins, the
baked-in minisign pubkey, and the release workflow — see git `24791c4` add, `11559ec` /
`0e828c2` remove). The earlier #15 implementation is the reference; this task rebuilds it
**more completely** (gated pipeline + a richer UI) and **without committing a real key**
(keys are deferred and generated later).

**This reverses a v1-scope rule.** CLAUDE.md currently states "no in-app auto-update and no
release pipeline" (#62). This task deliberately reverses that — the implementer must update
CLAUDE.md (and README) to describe the new updater skeleton. Apple code-signing /
notarization stays out of scope; the updater uses **minisign** (its own keypair, separate
from Apple notarization), and that keypair is deferred.

**What ships in this skeleton.**

1. **Release pipeline** (`.github/workflows/release.yml`) — on push to `main`, a job that
   (a) **guards on a version bump** (config version higher than the latest `v*` tag, from
   #15) **and** (b) **guards on the signing secret being present** — if
   `secrets.TAURI_SIGNING_PRIVATE_KEY` is empty/absent, the workflow **ends early** (logs a
   clear "no signing key — skipping release" notice, exits success). When both hold, it
   builds a universal macOS bundle and creates a **draft** GitHub release carrying the
   updater artifacts (`latest.json`, `.sig`, `.app.tar.gz`, `.dmg`) via `tauri-apps/
   tauri-action`. So with **no key configured (today), the pipeline no-ops**; adding the
   secret later activates it with **zero further code changes**.
2. **Tauri updater + process plugins, re-wired** — JS deps `@tauri-apps/plugin-updater` +
   `@tauri-apps/plugin-process`; Rust crates `tauri-plugin-updater` +
   `tauri-plugin-process` in `Cargo.toml`, initialized in `lib.rs`
   (`.plugin(tauri_plugin_updater::Builder::new().build())` + `tauri_plugin_process::init()`);
   `capabilities/default.json` grants `updater:default` + `process:allow-restart`;
   `tauri.conf.json` gets a `plugins.updater` block with `endpoints` (the GitHub releases
   `latest.json` URL, as #15) and a **placeholder `pubkey`** (clearly marked TODO — the
   real one is baked by the later signing-key task). **`createUpdaterArtifacts` stays off**
   in `tauri.conf.json` so **local `npm run tauri build` keeps producing an unsigned
   `.app`/`.dmg` without a key** (the workflow/tauri-action turns on signed artifacts only
   when the secret is present). _Build-safety is a hard requirement: the app must compile,
   run, and `tauri build` locally with no key._
3. **`src/updater.ts`** (restore + extend #15's) — wraps the plugin: `checkForUpdate()`
   (returns `{version} | null`, holds the non-serializable `Update` object module-side like
   the outputBus pattern) and `downloadAndRelaunch(onProgress)` (calls
   `update.downloadAndInstall` forwarding the updater's `Started{contentLength}` /
   `Progress{chunkLength}` / `Finished` events to a 0–100 progress callback, then
   `relaunch()` from `@tauri-apps/plugin-process`).
4. **Store `update` slice + actions** — `update: { status: "idle"|"checking"|"available"|
   "downloading"|"error", version: string|null, progress: number, error?: string }`, plus
   `checkForUpdate()` (best-effort; sets `available`+`version` or stays idle),
   `openUpdateConfirm()` / `cancelUpdate()`, and `installUpdate()` (sets `downloading`,
   updates `progress` from the callback, on success relaunches; on failure → `error`).
   Boot calls `checkForUpdate()` best-effort (returns null with no real release, today).
   **The state machine is structured so the mock task (#193) can drive every state without
   a real release.**
5. **UI — sidebar indicator box** (`src/components/Update/UpdateIndicator.tsx`) — a small
   box in the **sidebar footer, directly above the Settings gear** (`Sidebar.tsx` footer,
   ~line 1597–1604). Hidden when `status === "idle"`; when `available`, shows "Update
   available · v<version>" and is clickable → `openUpdateConfirm()`. Compact + collapses
   gracefully when the sidebar is in its narrow rail (#168).
6. **UI — confirm + install modal** (`src/components/Update/UpdateModal.tsx`) — when
   `status === "available"` and confirm is requested: an "Update to v<version>? The app
   will restart." dialog (OK / Cancel). **OK → `installUpdate()`**, which switches to a
   **full-window blocking overlay that freezes input** (a `--scrim` cover, no dismiss) with
   a **progress bar** bound to `update.progress`; on completion the app **relaunches**.
   Cancel/Escape closes (only before install starts).
7. **Post-update toast** — persist the app version across launches (a small persisted value
   — extend the settings/store blob with `lastVersion`); on `init`, compare the running
   `getVersion()` (Tauri) to `lastVersion`; if it increased, `pushToast("Updated to
   v<new>", "success")` and store the new version. This is the "restarts updated → toast
   with the new version" step, and is independently triggerable by the mock (#193).

**Scope.** The skeleton is **fully wired but inert** without a key: today `checkForUpdate`
returns null (no published release / placeholder pubkey), so the indicator stays hidden and
nothing installs. Activation later needs only (a) generating the minisign keypair, (b)
baking the real `pubkey` + turning on `createUpdaterArtifacts`, and (c) adding the
`TAURI_SIGNING_PRIVATE_KEY[_PASSWORD]` GitHub secrets — all deferred to a later "provide
signing key" task. The **interactive** flow (indicator → modal → freeze/progress → restart
→ toast) is **runtime-verified via the mock task (#193)** since there's no real release yet.

**Out of scope (own cards — do NOT build here).**
- The **settings "Updates" screen** with a "Check for updates" button ("Alternative settings
  screen for updating" card → depends on #190).
- **Patchnotes** JSON + the settings patch-notes view (card → depends on #190).
- The **dev mock** of an available update (card → depends on #190).
- Generating/committing the real signing keypair, enabling `createUpdaterArtifacts`, Apple
  notarization (all later).

**Concrete files/symbols.**
- **New** `.github/workflows/release.yml` (base on `git show 24791c4:.github/workflows/
  release.yml`, add the secret-presence guard).
- `package.json` / `src-tauri/Cargo.toml` — add updater + process plugins (JS + Rust).
- `src-tauri/src/lib.rs` — init both plugins (near the existing
  `.plugin(tauri_plugin_dialog::init())`, line ~40); call best-effort `checkForUpdate` is
  frontend-side on boot.
- `src-tauri/capabilities/default.json` — add `"updater:default"`, `"process:allow-restart"`
  to `permissions`.
- `src-tauri/tauri.conf.json` — add `plugins.updater { endpoints, pubkey: <placeholder> }`;
  leave `createUpdaterArtifacts` off.
- **New** `src/updater.ts` (restore #15 + progress callback).
- **New** `src/components/Update/UpdateIndicator.tsx` + `UpdateModal.tsx` (+ CSS).
- `src/store.ts` — `update` slice + actions; `lastVersion` persistence; boot
  `checkForUpdate` + post-update toast; `pushToast` (~1371) reused.
- `src/components/Sidebar/Sidebar.tsx` — mount `<UpdateIndicator />` above the footer gear.
- `src/App.tsx` — mount `<UpdateModal />` (like the old `UpdatePopup`, ~#15).
- CLAUDE.md / README — document the updater skeleton (reverse the #62 note).

**Subtasks**

1. [ ] Re-add updater + process plugins (JS deps + Rust crates + `lib.rs` inits +
   capabilities) and the `tauri.conf.json` `plugins.updater` block with a **placeholder
   pubkey**; confirm `npm run tauri build` still produces an unsigned bundle **with no key**.
2. [ ] Restore + extend `src/updater.ts` (`checkForUpdate`, `downloadAndRelaunch(onProgress)`
   with the updater progress events).
3. [ ] Add the store `update` slice + actions (`checkForUpdate`, `openUpdateConfirm`,
   `cancelUpdate`, `installUpdate` driving `status`/`progress`/`error`), structured so the
   mock (#193) can set states.
4. [ ] `lastVersion` persistence + boot compare → `pushToast("Updated to v…")`.
5. [ ] `UpdateIndicator` in the sidebar footer above the gear (hidden when idle; clickable
   when available).
6. [ ] `UpdateModal`: confirm dialog → OK → full-window input-blocking overlay + progress
   bar → relaunch; Cancel/Escape before install.
7. [ ] `.github/workflows/release.yml`: version-bump guard **and** signing-secret-present
   guard → otherwise end early; else build universal bundle + **draft** release with updater
   artifacts.
8. [ ] Update CLAUDE.md + README (reverse the #62 "no auto-update / no pipeline" note;
   document the deferred-key skeleton).
9. [ ] **Verify** — `npm run build`, `npm run lint`, `npm test`, `cargo build`/`clippy` green;
   `npm run tauri build` succeeds locally **without a key**; the workflow's guard ends early
   when the secret is absent (review the `if:`/guard logic). Note that the **interactive
   update flow is verified via the mock (#193)**, not in this task.

**Acceptance criteria**

- [ ] Updater + process plugins are wired (JS + Rust + capabilities + `tauri.conf.json`
      `plugins.updater` with a placeholder pubkey); **`npm run tauri build` still succeeds
      locally with no signing key** and the app runs.
- [ ] `.github/workflows/release.yml` exists and **ends early when
      `TAURI_SIGNING_PRIVATE_KEY` is absent** (and when the version isn't bumped); otherwise
      it builds and creates a **draft** release with updater artifacts.
- [ ] The **sidebar footer shows an update box above the Settings gear** that is hidden when
      idle and, when an update is available, opens a **confirm modal**; OK → a **full-window
      input-blocking overlay with a progress bar**, then **relaunch**; after a version
      increase a **toast shows the new version**. (All states reachable/inspectable; the
      live download path is exercised by #193 / a real signed release.)
- [ ] CLAUDE.md/README updated to reflect the reversed scope.
- [ ] `npm run build`, `npm run lint`, `npm test`, and Rust build/clippy pass.

**Notes**

- **Autonomous refine (2026-06-26):** user not responding; decisions logged in
  `ASSUMPTIONS.md`.
  - **Reuse #15's removed implementation** (git `24791c4`) as the base; rebuild richer (gated
    pipeline + sidebar box + confirm/freeze/progress + post-update toast).
  - **Keys deferred → placeholder pubkey + `createUpdaterArtifacts` off**, so local unsigned
    builds keep working; the pipeline's secret guard means it no-ops until the key lands. A
    later "provide signing key" task bakes the real pubkey, flips `createUpdaterArtifacts`,
    and adds the secrets — **no other code change needed** ("ready to go").
  - **Pipeline guards on BOTH** a version bump (from #15) **and** the signing secret's
    presence; ends early otherwise (the card's "ends early if the secret isn't present").
  - **Indicator placement:** sidebar footer, directly above the Settings gear (per the card).
  - **Freeze = full-window input-blocking overlay** (`--scrim`, no dismiss) with a progress
    bar bound to the updater's download progress; then `relaunch()` (process plugin).
  - **Post-update toast** via a persisted `lastVersion` compared to Tauri `getVersion()` on
    boot — also the hook the mock (#193) uses.
  - **Reverses #62 / the v1 "no auto-update, no pipeline" rule** (and partially the #15
    removal); Apple notarization still out of scope (minisign only, deferred).
  - **Testability:** with no key/release, the interactive flow can't run for real; the state
    machine is shaped so the **mock (#193)** drives every state. This task's own verification
    is build/lint/test + guard review + idle UI.
- **Depends on: none** — it's the **foundation** of the auto-update group; the other three
  cards (settings update screen, patchnotes, mock) **depend on this #190**.
- **References:** git `24791c4` (#15 add: `release.yml`, `updater.ts`, `UpdatePopup`,
  `tauri.conf.json` updater block w/ endpoints+pubkey, `capabilities` `updater:default` +
  `process:allow-restart`, `store.ts` update slice), `11559ec`/`0e828c2` (#62 removal);
  current `Sidebar.tsx` footer (~1597), `store.ts pushToast` (~1371), `lib.rs` plugin init
  (~40), `tauri.conf.json`/`package.json` version `0.0.1`. CLAUDE.md "Builds & distribution".
