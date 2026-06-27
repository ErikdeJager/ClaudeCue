### 206. [ ] Add a ⌘T keybind to create a new Canvas tab, and surface it in the UI

**Status:** Not started
**Depends on:** #205
**Created:** 2026-06-27

**Description**

There is no keyboard shortcut to create a new Canvas tab — the only way is clicking the `+`
in the tab strip. Add a global shortcut and show it in the UI so it's discoverable.

The app's global shortcuts live in `src/useKeyboardNav.ts` (a single capture-phase
`keydown` listener on `window`, so ⌘-combos are intercepted before xterm forwards them to a
focused PTY). Existing combos: ⌘S (save), ⌘N (new session), ⌘⇧N (schedule), ⌘B (sidebar),
⌘K (create-panel launcher), ⌘⌥1–6 (launcher by type), ⌘\ (toggle Overview↔Canvas), ⌘1–9
(jump to canvas N). **⌘T is unused.** The store action that creates a tab is `addCanvas()`
(`src/store.ts` ~line 2678): it appends a `Canvas N` tab and makes it active
(`activeCanvasId`), but does **not** change `view`.

**Goal:** bind **⌘T / Ctrl+T** to "new Canvas tab", and surface the `⌘T` hint on the
**"New tab"** item of the `+` dropdown that TASK-205 introduces (plus the trigger's
tooltip), so the shortcut is visible where the user creates tabs.

**Decisions (made autonomously — see Notes):**

- **⌘T is a *create* action, available from anywhere in the main window** (like ⌘N / ⌘K),
  not a navigation action scoped to Canvas view (unlike ⌘1–9). The handler **switches to
  Canvas view** (so the user actually sees the new tab) and then calls `addCanvas()` (which
  makes it active). Concretely: `if (IS_MAIN_WINDOW && !newSessionOpen && !createPanelOpen)
  { setView("canvas"); addCanvas(); }`.
- **Main window only**, swallowed-but-inert in a detached canvas window (#84 — it has the
  tab content but tab *creation* belongs to the main strip), matching the other
  main-window-only combos. Inert while the new-session modal or the create-panel launcher is
  open (mirrors ⌘K's guard).
- **Surface = a `⌘T` `<kbd>` hint on the "New tab" dropdown item** (from TASK-205) and in
  the `+` trigger's `title`. (This is why it depends on #205 — the dropdown item is the home
  for the hint.)

**Scope**

1. **Keybind** (`useKeyboardNav.ts`): add a handler for `(e.metaKey || e.ctrlKey) &&
   !e.shiftKey && !e.altKey && e.key.toLowerCase() === "t"` that `preventDefault()` +
   `stopPropagation()` (so a webview default / PTY never sees it), and — main window, no
   modal open — switches `view` to `"canvas"` and calls `addCanvas()`. Add it alongside the
   other ⌘-letter handlers and extend the file's header comment block (the shortcut legend
   at the top) with the ⌘T line.
2. **UI surface** (`src/components/Canvas/CanvasTabs.tsx`): in the `+` dropdown built by
   TASK-205, add a right-aligned `⌘T` `<kbd>` to the **"New tab"** item (reuse the existing
   `kbd`/menu styles; the schedule/new-session modals already render `⌘⏎` `<kbd>`s as a
   precedent). Update the `+` trigger's `title`/`aria-label` to mention "⌘T".
3. **No other behavior changes.**

**Out of scope**

- The `+`-dropdown restructure itself (TASK-205) — this task assumes it exists and only adds
  the keybind + its hint. If implemented before #205 lands, coordinate: the dropdown item is
  the surface.
- No new shortcut for closing tabs, switching tabs (⌘1–9 already exists), or renaming.
- No detached-window tab creation.
- No settings/keybinding-customization UI.

**Subtasks**

1. [ ] Add the ⌘T / Ctrl+T handler in `useKeyboardNav.ts` (main window, guarded by
   `newSessionOpen`/`createPanelOpen`), switching to Canvas view + `addCanvas()`; update the
   header legend comment.
2. [ ] Confirm ⌘T is not already claimed by another handler/component (grep; the global
   legend shows it free).
3. [ ] Add the `⌘T` `<kbd>` hint to the "New tab" item of the `+` dropdown and to the
   trigger tooltip (TASK-205's dropdown).
4. [ ] `npm run build`, `npm run lint`, `npm run format:check`, `npm test` pass.
5. [ ] Manually verify: ⌘T from Overview switches to Canvas and opens a new active tab; ⌘T
   in Canvas opens a new active tab; ⌘T does nothing while the new-session/create-panel
   modals are open; ⌘T never reaches a focused terminal; the `⌘T` hint shows on the "New
   tab" dropdown item.

**Acceptance criteria**

- [ ] Pressing **⌘T (or Ctrl+T)** in the main window creates a new Canvas tab, makes it
  active, and ensures the Canvas view is shown — from either Overview or Canvas.
- [ ] ⌘T is inert while the new-session modal or create-panel launcher is open, and is
  swallowed (no webview/PTY side effect) when a terminal is focused.
- [ ] The **"New tab"** item in the `+` dropdown shows a `⌘T` hint, and the `+` trigger's
  tooltip mentions it.
- [ ] The shortcut legend at the top of `useKeyboardNav.ts` documents ⌘T.
- [ ] `npm run build`, `npm run lint`, Prettier, and `npm test` pass.

**Notes**

- **Autonomous refine (2026-06-27).** Per the `ASSUMPTIONS.md` standing directive
  (2026-06-26); decisions logged in `ASSUMPTIONS.md` under TASK-206:
  - **⌘T** chosen (conventional "new tab", unused here). It's a *create* action → works from
    anywhere in the main window and **switches to Canvas** (over a Canvas-view-only scoping
    like ⌘1–9), so it's never a dead-end from Overview. Rationale: aligns with ⌘N/⌘K (global
    create) rather than ⌘1–9 (navigation).
  - Surface on the `+` dropdown's "New tab" item → **depends on TASK-205**.
- **Dependency rationale** (per the iteration-task-dependency rule): #206 *builds on* #205's
  reworked `+` dropdown (the hint's home), so it depends on #205 — not a cycle.
- Key files: `src/useKeyboardNav.ts` (add the handler + legend), `src/store.ts`
  (`addCanvas` ~2678, `setView`), `src/components/Canvas/CanvasTabs.tsx` (the TASK-205 `+`
  dropdown), `src/windowContext.ts` (`IS_MAIN_WINDOW`).
