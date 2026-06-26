# TASK-175

### 175. [x] File-tree click: jump to an already-open file (don't double-open) and open in the current view

**Status:** Done
**Depends on:** none
**Created:** 2026-06-26

**Description**

Clicking a file row in the **file-tree panel** (#167, `src/components/FileTree/
FileTree.tsx`) today always calls:

```ts
const openFile = (file: string) =>
  void addOverviewPanel(repoPath, "markdown", file);
```

`addOverviewPanel` (`src/store.ts` ~line 1611) dedups markdown panels by file, but on a
hit it only fires a **dead-end "Already open" toast** — it does **not** take you to the
existing panel. Worse, it **always** targets the **Overview** panel list
(`overviewPanels`) even when the file tree is rendered inside a **Canvas** panel — so a
click in Canvas appears to do nothing (the new column is added to Overview, which isn't
mounted). That mismatch is the "open double" frustration this card names.

**Desired behavior (confirmed with the user — see Notes):** clicking a file in the tree
should be **view-aware** and **jump-to-existing**, never a silent no-op or a duplicate:

- **Already open in the current view → jump to and show it.**
  - In **Overview**: select the existing file column and scroll it into view (the
    existing `selectedId` → `data-item-id` scroll effect in `Overview.tsx`).
  - In **Canvas**: focus the existing leaf for that file (switching to its tab if it
    lives in another tab; raising its window if that tab is detached, #84) — mirroring
    `openSessionInCanvas`.
- **Not open in the current view → open it in the current view.**
  - In **Overview**: add a new Overview file column (today's `addOverviewPanel`
    behavior) and select it.
  - In **Canvas** (including a detached canvas window, where `!IS_MAIN_WINDOW`): open the
    file as a **Canvas panel appended to the active tab** (the `setActiveCanvasLayout(
    appendLeaf(...))` pattern used by `forkSession`), and focus it.

"Present" is judged **relative to the current view**: in Canvas, a file that is recorded
as an Overview panel but is **not** a leaf in any canvas tab counts as *not present in the
canvas* → it gets appended as a Canvas panel (this is exactly the card's "open the file
in the canvas if not present").

**Source-of-truth (confirmed — register everywhere):** whenever a file is opened from the
tree — Overview column **or** Canvas panel — it must be recorded in `overviewPanels`, the
single source of truth (#152) that drives the **sidebar tree** (#59) and the **Overview
wall**. So a file opened into the Canvas also appears as a sidebar row + an Overview
column, and removing it cascades (the existing `removeOverviewPanel` → Canvas-leaf cascade,
#152). This matches how template-opened items register via `registerOverviewPanel`
(`store.ts` ~line 999).

**Current-view detection.** Canvas mode = `!IS_MAIN_WINDOW || get().view === "canvas"`
(the store already imports `IS_MAIN_WINDOW`/`DETACHED_CANVAS_ID` from `./windowContext`;
a detached canvas window is always Canvas). Only one main-window view is mounted at a
time, so a file tree in an Overview column is interactive only while `view === "overview"`
and one in a Canvas panel only while `view === "canvas"` — `get().view` disambiguates
which tree the user clicked.

**Scope**

- Plain **file-viewer** open from the tree: the left-click on a file row **and** the
  right-click menu's **"Open in file viewer"** item (both currently call `openFile`) route
  through the new view-aware logic.
- For consistency, the right-click **"Open as Kanban board"** (`.md` only) item should use
  the **same** view-aware open (it currently calls `addOverviewPanel(repoPath, "kanban",
  file)` with the same dead-end/overview-only problems). Generalize the new logic over the
  panel kind (`"markdown"` | `"kanban"`) so both routes behave identically. (Map: markdown
  panel → `CanvasContent {kind:"file"}`; kanban panel → `{kind:"kanban"}`, per
  `overviewPanelToContent`.)

**Out of scope**

- Any change to the file tree's **folder** rows, **Reveal in Finder**, or **Copy path**
  menu items (unchanged).
- The Overview Shift+arrow navigation (that's #174) and the third Refine card ("open view
  in folder session option") — unrelated.
- Changing how files are **dragged** from the tree/sidebar into the Canvas (the dnd-kit
  path in `App.tsx`/`canvasDrop.ts` stays as-is) — this card is about the **click**.
- Backend changes — none. Same data sources (`overviewPanels`, `canvases`).

**Subtasks**

1. [ ] **Make `addOverviewPanel` return the panel id** (`src/store.ts` ~line 1611):
   return the **new** panel's id on success, the **existing** panel's id on a dedup hit
   (instead of just toasting and returning `void`), and `null` only on a real failure
   (e.g. terminal spawn error). Update its type in the store interface
   (`addOverviewPanel: (...) => Promise<string | null>`). Existing callers that ignore the
   return value keep working (they `void` it). This lets a caller select/focus the panel.
2. [ ] **Add a view-aware open action** to the store — suggested name
   `openFileFromTree(repoPath: string, file: string, kind: "markdown" | "kanban")`
   (declare it in the store interface near `openSessionInCanvas`, ~line 861):
   - Compute `const inCanvas = !IS_MAIN_WINDOW || get().view === "canvas";`.
   - Compute the matching `CanvasContent`: `kind === "kanban" ? {kind:"kanban", repoPath,
     file} : {kind:"file", repoPath, file}`.
   - **Overview branch (`!inCanvas`):** `const id = await get().addOverviewPanel(repoPath,
     kind, file); if (id) set({ selectedId: id });`. (A dedup hit returns the existing id →
     selecting it jumps/scrolls the existing column into view; a new panel is added and
     selected. Keep the existing "Opened…/Already open" toast — harmless feedback.)
   - **Canvas branch (`inCanvas`):**
     1. **Find an existing leaf** for this file across **all** tabs: iterate
        `get().canvases`, `collectLeaves(c.layout)`, match with `matchesCanvasItem(leaf.
        content, {id:"", kind: kind === "kanban" ? "kanban" : "file", repoPath, file})`
        (or compare content fields directly).
     2. **Resolve/ensure the source-of-truth panel id:** find an existing
        `overviewPanels[repoPath]` entry (`p.kind === kind && p.file === file`); if none,
        register one **without a toast** (reuse/extend the internal `registerOverviewPanel`
        helper, `store.ts` ~line 999, so it returns the new/existing id — or inline a
        find-or-create that `set`s `overviewPanels` and persists via
        `ipc.setOverviewPanels`). Call this `panelId`.
     3. **If a leaf was found:** mirror `openSessionInCanvas` (~line 2696): if that tab is
        in `detachedCanvasIds` → `focusCanvasWindow(tab.id)` + `set({selectedId: panelId})`;
        else `set({view:"canvas", activeCanvasId: tab.id, activeLeafId: leaf.id,
        selectedId: panelId})` and persist `ipc.setCanvases({canvases, activeId: tab.id})`.
        Return.
     4. **If no leaf:** append a leaf to the active tab — mirror `forkSession` (~line 2540):
        `const layout = canvases.find(c => c.id === activeCanvasId)?.layout ?? null; const
        leafId = crypto.randomUUID(); get().setActiveCanvasLayout(layout ? appendLeaf(
        layout, content, leafId, crypto.randomUUID()) : {type:"leaf", id: leafId,
        content});` then `set({activeLeafId: leafId, selectedId: panelId})`.
        (`setActiveCanvasLayout` already persists + broadcasts `canvas://changed`, #84, and
        targets `DETACHED_CANVAS_ID` in a detached window.)
3. [ ] **Wire `FileTree.tsx`** to the new action:
   - Replace `const openFile = (file) => void addOverviewPanel(repoPath, "markdown",
     file);` with `const openFile = (file) => void openFileFromTree(repoPath, file,
     "markdown");`.
   - The right-click **"Open as Kanban board"** handler: replace `addOverviewPanel(repoPath,
     "kanban", menu.file)` with `openFileFromTree(repoPath, menu.file, "kanban")`.
   - Pull `openFileFromTree` from the store; drop the now-unused `addOverviewPanel` import
     if nothing else uses it.
4. [ ] **Unit tests** in `src/store.test.ts` (model on the existing `openSessionInCanvas
   (#153)` describe block, ~line 1154), covering `openFileFromTree`:
   - Overview, file not open → an Overview markdown panel is added **and** `selectedId`
     equals it.
   - Overview, file already open → **no duplicate** panel; `selectedId` equals the existing
     panel id.
   - Canvas, file not a leaf in any tab → the markdown panel is registered in
     `overviewPanels` (source of truth) **and** a `{kind:"file"}` leaf is appended to the
     active tab with `activeLeafId`/`selectedId` set.
   - Canvas, file already a leaf in the active tab → focuses it (`activeLeafId`/`selectedId`
     set), **no** second leaf appended, no duplicate panel.
   - Canvas, file leaf lives in a **detached** tab → `focusCanvasWindow` is called and
     `selectedId` is set (no main-view switch). (Mirror the detached test in the
     `openSessionInCanvas` block.)
   - `addOverviewPanel` returns the new id on add and the existing id on a dedup hit.
5. [ ] Run `npm run build`, `npm run lint`, `npm test`, `npm run format:check`, and
   `cargo test --manifest-path src-tauri/Cargo.toml` (+ `npm run lint:rust`); fix any
   issues. (Frontend-only change; run Rust checks per repo convention.)

**Acceptance criteria**

- [ ] In **Overview**, clicking a file in the tree that is **already open** selects that
      file's column and scrolls it into view (no duplicate column, no dead-end toast);
      clicking a file that is **not** open adds its column and selects it.
- [ ] In **Canvas** (and in a detached canvas window), clicking a file in the tree that is
      **not** already a panel in the canvas opens it as a **Canvas panel in the active
      tab** and focuses it; clicking a file that is **already** a canvas panel focuses that
      panel (switching to its tab, or raising its detached window) without adding a
      duplicate.
- [ ] A file opened from the tree into the Canvas also appears as a **sidebar row** and an
      **Overview column** (registered in `overviewPanels`), and removing it from the
      sidebar cascades to the Canvas panel (existing #152 behavior).
- [ ] The right-click **"Open in file viewer"** and **"Open as Kanban board"** items behave
      the same way as a left-click (view-aware, jump-to-existing).
- [ ] No regression to dragging files into the Canvas, to folder expand/collapse, or to the
      Reveal/Copy menu items.
- [ ] New `store.test.ts` cases pass; `npm run build`, `npm run lint`, `npm test`,
      `npm run format:check`, `cargo test`, and `npm run lint:rust` all pass.

**Notes**

- **User decisions (refine Q&A, 2026-06-26):**
  - **Open target = follow the current view.** Not-yet-open file → Overview column in
    Overview mode, Canvas panel (active tab) in Canvas mode. (Chosen over "always open in
    Canvas" because every other open-affordance is view-consistent and jumping the user out
    of Overview on a click would be jarring; the card's "open in the canvas" maps to the
    Canvas-mode branch.)
  - **Register everywhere.** A file opened into the Canvas is also recorded in
    `overviewPanels` so it shows in the sidebar tree + Overview and participates in the
    #152 removal cascade (chosen over Canvas-only).
- **Assumptions (reasonable defaults, not separately confirmed):**
  - "Present" is evaluated **per view** — in Canvas, an Overview-only file (no canvas leaf)
    is treated as *not present in the canvas* and gets appended as a leaf (this is the
    literal "open the file in the canvas if not present").
  - Dedup stays **kind-specific** (a `.md` open as a Kanban board is a different item from
    the same file open as a plain viewer) — matching today's `addOverviewPanel` dedup.
  - The existing "Opened…/Already open" toast is kept in the Overview branch (harmless
    feedback); the Canvas branch should not show a misleading "Already open" toast when it
    is actually appending the file to the canvas (register the source-of-truth panel
    **without** a toast in that branch).
- **#153 is already shipped** (`openSessionInCanvas` exists with tests, `store.test.ts`
  ~1154; called from `Sidebar.tsx:464`), despite CLAUDE.md still listing it as open — so
  this task does **not** depend on it; it just mirrors its detached-window-aware pattern.
- **Grounding references:**
  - `src/components/FileTree/FileTree.tsx` — `openFile` (line 77), the file-row `onClick`
    (line 132), the right-click menu's "Open in file viewer" (line 189) and "Open as Kanban
    board" (line 201) handlers.
  - `src/store.ts` — `addOverviewPanel` (~1611, make it return the id), `registerOverviewPanel`
    (~999, toast-less register), `openSessionInCanvas` (~2696, the reuse/switch/detached
    pattern), `forkSession` (~2540, the `setActiveCanvasLayout(appendLeaf(...))` append),
    `matchesCanvasItem` (~487), `leafItemId` (~518), `selectItem` (~2375), `collectLeaves`,
    `appendLeaf` (imported line 8), `IS_MAIN_WINDOW`/`DETACHED_CANVAS_ID` (import line 27).
  - `src/components/Canvas/canvasDrop.ts` — `overviewPanelToContent` (markdown→`file`,
    kanban→`kanban`) for the content mapping.
  - `src/components/Overview/Overview.tsx` — the `selectedId` → `data-item-id`
    scroll-into-view `useEffect` that realizes "jump to and show" in Overview.
  - `src/store.test.ts` — the `openSessionInCanvas (#153)` describe block to model new
    tests on.
