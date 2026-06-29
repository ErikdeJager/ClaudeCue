// Pure keyboard-navigation mapping for the diff viewer (#255). Kept React-free so the
// key→step decision is unit-tested without the DOM. The modifier check and the
// input/listbox focus guard live in the panel's `onKeyDown` (they need the event).

/** How the diff viewer lays out its changed files (#231/#237). */
export type DisplayMode = "focused" | "accordion";

/**
 * Which file-step delta an arrow key maps to, or `null` when the key isn't a file-nav
 * key. **Focused** mode is a horizontal ‹/› strip → **ArrowLeft = −1 / ArrowRight = +1**
 * (Up/Down are left for the diff body's vertical scroll). **Accordion** mode is a
 * vertical list → **ArrowUp = −1 / ArrowDown = +1**. Direction is matched to each
 * layout; the same on macOS and Windows (DOM-standard `key` values).
 */
export function diffNavDelta(key: string, mode: DisplayMode): -1 | 1 | null {
  if (mode === "focused") {
    if (key === "ArrowLeft") return -1;
    if (key === "ArrowRight") return 1;
    return null;
  }
  // accordion
  if (key === "ArrowUp") return -1;
  if (key === "ArrowDown") return 1;
  return null;
}
