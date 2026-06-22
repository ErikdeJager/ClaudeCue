// Pure keyboard-nav logic for the New-session / Schedule folder step (#123): the
// recents list plus the "Choose folder" picker as a virtual extra option after it,
// so ArrowDown past the last recent lands on the picker and ArrowUp returns. Split
// from the component so it's unit-testable (and the .tsx stays component-only).

/** The current folder-step highlight: a recents `index` (−1 = none) or the picker. */
export interface FolderHighlight {
  /** Index into the (filtered) recents list; −1 when nothing is highlighted. */
  index: number;
  /** The "Choose folder" picker (the virtual option after the last recent). */
  picker: boolean;
}

/**
 * The next highlight after an Arrow key in the folder step (#123). The picker sits
 * just past the last recent: ArrowDown from the last recent (or from an empty
 * filtered list) selects it; ArrowUp from the picker returns to the last recent
 * (or stays on the picker when there are no recents). Recents nav is clamped at 0.
 */
export function moveFolderHighlight(
  current: FolderHighlight,
  listLength: number,
  dir: "down" | "up",
): FolderHighlight {
  if (dir === "down") {
    if (current.picker) return current; // nothing below the picker
    const next = current.index < 0 ? 0 : current.index + 1;
    // Past the last recent (or an empty filtered list) → the picker.
    if (next >= listLength) return { index: -1, picker: true };
    return { index: next, picker: false };
  }
  // up
  if (current.picker) {
    // Back to the last recent, or stay on the picker when there are none.
    return listLength > 0 ? { index: listLength - 1, picker: false } : current;
  }
  const prev = Math.max((current.index < 0 ? 0 : current.index) - 1, 0);
  return { index: prev, picker: false };
}
