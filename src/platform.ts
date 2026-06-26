// Platform-dependent **display** strings (#143). The host OS family is read once at
// boot from the backend `platform()` command and cached in the store (`platform`);
// these helpers turn it into the right labels. Keyboard *handling* stays
// platform-agnostic (`metaKey || ctrlKey`) — only what the user *sees* changes, so
// macOS renders exactly as before.

/** True on Windows (the only non-macOS target, #143). */
export function isWindows(platform: string): boolean {
  return platform === "windows";
}

/** The OS file manager's "reveal" label — "Reveal in Explorer" on Windows, the
 * original "Reveal in Finder" on macOS (#129/#133/#143). */
export function revealLabel(platform: string): string {
  return isWindows(platform) ? "Reveal in Explorer" : "Reveal in Finder";
}

/** Render a keyboard hint for the platform: the macOS glyph form on macOS, a
 * "Ctrl+…" form on Windows (#143). Pass the exact strings to show for each. */
export function kbdHint(platform: string, mac: string, win: string): string {
  return isWindows(platform) ? win : mac;
}
