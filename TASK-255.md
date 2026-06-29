### 255. [ ] Keyboard navigation between files in the diff viewer (focused + accordion modes)

**Status:** Not started
**Depends on:** none
**Created:** 2026-06-29

**Description**

In the **diff viewer** (`src/components/DiffInspector/DiffInspector.tsx`), let the user
step between the changed files with the **keyboard** — arrow keys — instead of only the
on-screen controls. Per the card: "In the diff view I want to be able to use the arrow
keys (or some other keyboard shortcut) to jump between files when in focused mode. Also
look at accordion mode for a way to jump between items."

**Grounding (current state):**

- The diff viewer has two display modes (#231, persisted #237):
  - **Focused** (default): one file fills the body; a nav strip with a ‹ **prev**
    arrow, a **picker pill** showing `i/N` (a popover listbox of all files), and a ›
    **next** arrow. Stepping is the pure `stepFile(delta)` (DiffInspector.tsx:445) which
    wraps: `(activeIndex + delta + N) % N`, sets `selectedFile`, closes the picker. The
    ‹/› buttons are `disabled={files.length < 2}`.
  - **Accordion**: a vertical stack of single-open file **cards**; clicking a card
    header (`onClick={() => setSelectedFile(file.path)}`) opens that one (the rest
    collapse). Exactly one card (`activeFile`) is expanded.
- `selectedFile`/`activeFile`/`activeIndex` already track the current file in both
  modes; `files = diff?.files ?? []`.
- The panel root `<div className={styles.panel}>` is **not** focusable today (no
  `tabIndex`, no `onKeyDown`) and there is **no** keyboard handling. The app's global
  `useKeyboardNav` handles window-level shortcuts (⌘1–9, ⌘N, …) — diff file-nav must
  **not** go there: multiple diff panels can be mounted at once (Overview columns,
  Canvas panels, detached windows #84), so the handler must be **panel-scoped** and fire
  only when *that* panel has focus.

**Design (decided — see Notes):**

- Make the panel root **focusable** (`tabIndex={0}`) with a subtle `:focus-visible`
  outline, and attach a **panel-local `onKeyDown`**. It acts only when focus is within
  this panel (so other panels/terminals are unaffected) and the key target is **not** a
  text input / select / the branch-compare or commit pickers / the focused-mode file
  picker listbox (guard with `event.target.closest("input, textarea, select,
  [contenteditable], [role=listbox], [role=combobox]")` → ignore).
- **Plain (unmodified) arrow keys** — no Cmd/Ctrl/Alt — so the behavior is **identical
  on macOS and Windows** (no `metaKey||ctrlKey` needed for unmodified arrows).
- **Focused mode:** **ArrowLeft = previous file, ArrowRight = next file** (mirrors the
  ‹/› strip), via the existing `stepFile(-1/+1)`; `preventDefault` so the page/body
  doesn't also scroll. **ArrowUp/ArrowDown are left alone** so they still scroll the
  diff body vertically (no conflict).
- **Accordion mode:** **ArrowUp = previous card, ArrowDown = next card** (the natural
  vertical-list mapping), reusing `stepFile(-1/+1)`; `preventDefault`. After moving,
  **scroll the newly-opened card into view** (`scrollIntoView({ block: "nearest" })`
  on a ref to the open card header). The diff body still scrolls via the wheel/trackpad
  and PageUp/PageDown (which are not intercepted).
- No-op (and no `preventDefault`) when `files.length < 2`, matching the disabled ‹/›
  buttons.

**Scope**

- Arrow-key file stepping in **both** Focused (Left/Right) and Accordion (Up/Down)
  modes, panel-scoped, in every diff-viewer surface (sidebar-opened panel, Overview
  column, Canvas panel, detached canvas window).
- A focus affordance on the panel so the user can tab to it / sees it's focused; the
  existing ‹/› buttons, picker, and card clicks all keep working unchanged (clicking any
  of them focuses the panel subtree so subsequent arrows work).

**Out of scope**

- Arrow navigation **inside** the focused-mode picker popover listbox (selecting an
  option with Up/Down/Enter) — a possible nicety, not required; the picker stays
  mouse-driven (Escape closes it).
- A modifier-based alternate shortcut (e.g. Alt/Option+Arrow) — plain arrows answer the
  card; a modifier variant can be added later if the plain-arrow scroll trade-off in
  accordion proves annoying.
- Changing the **scroll** behavior of the diff body, or hjkl/vim bindings.
- Any backend / data change (this is purely interaction wiring).

**Subtasks**

1. [ ] **Make the panel focusable + add the key handler** (`DiffInspector.tsx`).
   - [ ] Add `tabIndex={0}` to the root `<div className={styles.panel}>` and an
     `onKeyDown={onPanelKeyDown}`.
   - [ ] Implement `onPanelKeyDown(e)`: bail if `files.length < 2`; bail if a modifier
     (`metaKey||ctrlKey||altKey`) is held; bail if `e.target` is within an
     input/select/contenteditable/listbox/combobox (the guard above). Then:
     - Focused mode: `ArrowLeft` → `stepFile(-1)`, `ArrowRight` → `stepFile(1)`;
       `preventDefault()` on a handled key.
     - Accordion mode: `ArrowUp` → `stepFile(-1)`, `ArrowDown` → `stepFile(1)`;
       `preventDefault()`.
   - [ ] (Optional, recommended) Extract the pure key→delta decision
     (`diffNavDelta(key, displayMode)` → `-1 | 1 | null`) so it can be unit-tested
     without the DOM.

2. [ ] **Accordion: scroll the active card into view.**
   - [ ] Add a ref to the **open** card's header element; in an effect keyed on
     `activeFile?.path` (only while `displayMode === "accordion"`), call
     `ref.scrollIntoView({ block: "nearest" })` so keyboard stepping keeps the open card
     visible. (Guard so it doesn't fight a mouse click that already scrolled.)

3. [ ] **Focus affordance + styles** (`DiffInspector.module.css`).
   - [ ] A subtle `.panel:focus-visible` outline (token-driven, e.g. `--accent` /
     `--border` — no off-system color, no platform-divergent CSS) so the focusable panel
     is discoverable; nothing on plain `:focus` to avoid an outline on every mouse click.
   - [ ] Optionally surface the shortcut in the ‹/› button `title`s (e.g. "Previous file
     (←)") and the accordion via `aria-keyshortcuts` — keeps it discoverable.

4. [ ] **Cross-platform + a11y.**
   - [ ] Confirm unmodified arrow keys behave identically on WKWebView (macOS) and
     WebView2 (Windows) — they do; no `platform` branching, no `metaKey||ctrlKey`
     needed (only unmodified arrows are bound). Note in the PR/commit that any *future*
     modifier shortcut here must route through `metaKey||ctrlKey`.
   - [ ] `aria-keyshortcuts` on the relevant controls; ensure `tabIndex={0}` doesn't trap
     focus or interfere with the existing buttons' tab order.

5. [ ] **Tests + docs.**
   - [ ] Vitest: unit-test the pure `diffNavDelta(key, mode)` mapping (Left/Right in
     focused, Up/Down in accordion, null otherwise) and that `stepFile`'s wrap math is
     correct at the ends (reuse/confirm the existing index math).
   - [ ] `npm run build` + `npm run lint` + `npm test` + `cargo test` green (frontend-
     only; Rust unaffected).
   - [ ] Update `CLAUDE.md`'s DiffInspector note (#231/#237) to mention arrow-key file
     navigation (Left/Right focused, Up/Down accordion), and add the shortcut to the
     keyboard-nav legend if one is user-visible.

**Acceptance criteria**

- [ ] In **Focused** mode, with the diff panel focused, **←/→** step to the
  previous/next changed file (wrapping), exactly like the ‹/› buttons; the diff body's
  vertical scroll via ↑/↓ still works.
- [ ] In **Accordion** mode, with the panel focused, **↑/↓** move the open card to the
  previous/next file and **scroll that card into view**.
- [ ] Arrow keys do nothing when the diff has fewer than 2 files, and never fire while a
  text input / branch-or-commit picker / the file-picker listbox has focus.
- [ ] The handler is **panel-scoped**: arrows in one diff panel never move another diff
  panel, a terminal, or the Canvas; it works in Overview columns, Canvas panels, and a
  detached canvas window.
- [ ] The focusable panel has a discoverable, token-styled `:focus-visible` affordance,
  and the existing ‹/› buttons, picker pill, and accordion clicks all still work.
- [ ] **Works on both macOS and Windows** (unmodified arrows, no platform branching, no
  `metaKey||ctrlKey` dependence; DOM-standard key handling identical in both WebViews).
- [ ] `npm run build`, `npm run lint`, `npm test`, and the Rust suite pass.

**Notes**

- **Asking the user — deferred per the standing directive.** Per `ASSUMPTIONS.md`
  (2026-06-26, honored since #186), open points were decided autonomously. Decisions:
  - **Plain arrow keys, direction matched to the layout:** Focused mode is a horizontal
    ‹/› strip → **Left/Right**; Accordion is a vertical list → **Up/Down**. This
    answers "arrow keys to jump between files in focused mode" and "accordion mode … a
    way to jump between items" while minimizing the scroll conflict (Focused leaves
    Up/Down for body scroll; Accordion accepts Up/Down for stepping, with wheel/PageUp-
    Down still scrolling). A modifier-based variant (Alt+Arrow) is the noted fallback.
  - **Panel-scoped `onKeyDown` + `tabIndex={0}`, not the global `useKeyboardNav`** —
    multiple diff panels (and detached windows) can be mounted, so a global listener
    couldn't know which one to move; scoping it to the focused panel is correct and
    keeps terminals/inputs unaffected.
  - **Reuse the existing `stepFile` (wraps)** for both modes rather than adding separate
    clamping logic — consistent with the ‹/› buttons that already wrap. (Clamping at the
    ends in accordion is a trivial alternative if preferred.)
  - **Scroll the active accordion card into view** after a keyboard step so the moved-to
    diff is actually visible.
- **Cross-platform:** unmodified arrow keys are identical on macOS and Windows; no
  `platform` signal or `#[cfg]` is involved. Per the CLAUDE.md rule, any *future*
  modifier shortcut added here must use `metaKey || ctrlKey`.
- **Key references:** `DiffInspector.tsx` — `stepFile` (:445), `selectedFile`/
  `activeFile`/`activeIndex` (:225/:428/:442), the focused nav strip (:670–740), the
  accordion cards (:638–665), the panel root (:469); `useKeyboardNav.ts` (intentionally
  **not** the home for this); `DiffInspector.module.css` (`.panel`, `.focusNav`,
  `.accordion`/`.card`). Builds on #231 (modes) + #237 (mode persistence) — both shipped.
