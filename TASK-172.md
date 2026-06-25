# TASK-172

### 172. [x] Empty-area (background) context menu for the left sidebar — add folder without an agent

**Status:** Done
**Depends on:** #168
**Created:** 2026-06-25

**Description**

Today the left sidebar only has context menus on **items**: agent rows, file/diff/
terminal/kanban/scheduled rows (the shared `RowContextMenu`, #132/#133), worktree
headers, and **repo headers** (`openRepoMenu`, #31/#54 — New session / Views /
Reveal / Copy / color / Kill all / Close all / Forget folder). Right-clicking the
**empty background** of the sidebar (the area below the repo list, or the whole panel
when no repos exist) does nothing.

Add a **background context menu** that opens when the user right-clicks the sidebar's
**empty space — not on any item or repo header**. It is a non-repo-scoped, "what do I
want to do here" menu. Its primary new capability is **"New folder…"**: browse to a
folder with the native picker and have it **appear in the sidebar as a folder group
without starting an agent** (i.e. add it to the persisted `recents`). A folder with no
sessions already renders as a greyed repo group with a coral **+** (see `Sidebar`'s
`repos.map`, `repoEmpty`/`plusCoral`), so "appears in the UI without an agent" is
exactly "added to `recents`".

The menu's other items mirror existing global affordances so the background is a
convenient launch point:

- **New folder…** — _new behavior_ (see below).
- **New session** — calls `openNewSession()` (the global ⌘N folder-step modal).
- **Schedule session** — calls `openSchedule()` (the global ⌘⇧N schedule modal).
- **Collapse sidebar / Expand sidebar** — toggles the #168 icon rail via
  `toggleSidebarCollapsed()`; label reflects current `sidebarCollapsed`.
- **Clear Overview filter** — _only shown when `overviewRepoFilter` is set_; calls
  `setOverviewRepoFilter(null)` to drop the active repo filter (#34).

This menu must also be reachable in the **collapsed icon rail (#168)** — right-clicking
the rail's empty background opens the same menu. That cross-mode requirement is why this
task **depends on #168** (the collapsed-rail render must exist to wire the handler onto
it).

**"New folder…" semantics (decided — see Notes):**

- Opens the native **directory** picker (`pickDirectory()` already in `ipc.ts`).
  Cancel = no-op.
- The chosen folder is an **existing** directory — this does **not** create a new
  directory on disk. (Label uses "…" + the gloss "Add an existing folder" to avoid the
  "make a new folder on disk" reading; see the label decision in Notes.)
- The folder is **added to the persisted `recents`** (most-recent-first, deduped) so it
  shows as a folder group immediately and survives restart. It does **not** spawn an
  agent, does **not** change the selected item, and does **not** switch the view. (If the
  folder is already a recent, it's simply moved to the top — no error.)
- Works for any folder, git or not — non-git folders already render by folder name (the
  existing `recents` union path in `Sidebar`).

Backend gap to close: the store already has `Store::touch_recent` (`src-tauri/src/
store.rs`, deduped + capped, persists) but it is **only called internally** by spawn/
schedule flows — there is **no Tauri command** to add a recent on its own. Add one
(`add_recent`, mirroring the existing `remove_recent` command at `commands.rs`), wire it
into `lib.rs`'s `invoke_handler`, expose it in the typed IPC layer, and call it from a new
store action.

**Out of scope**

- Creating a directory on disk (this only *opens/adds* an existing one).
- Any change to the existing repo-header menu (`openRepoMenu`) or the item
  `RowContextMenu`s — they stay as-is.
- Auto-selecting, filtering, or switching views when a folder is added.
- A keyboard shortcut for "New folder" (not requested).
- Settings / Open-data-folder entries (the user chose not to include these).

**Subtasks**

1. [ ] **Backend command** — in `src-tauri/src/commands.rs`, add an `add_recent`
   `#[tauri::command]` mirroring `remove_recent` (line ~366): take
   `store: State<'_, Store>, path: String`, call `store.touch_recent(&path)`, return
   `Result<(), SessionError>` (map the IO error like `remove_recent` does).
2. [ ] **Register** the command in `src-tauri/src/lib.rs`'s `tauri::generate_handler![…]`
   list, next to `commands::remove_recent` (~line 156).
3. [ ] **IPC wrapper** — in `src/ipc.ts`, add `export const addRecent = (path: string) =>
   invoke<void>("add_recent", { path });` next to `removeRecent`.
4. [ ] **Store action** — in `src/store.ts`, add an `addFolder()` action: call
   `ipc.pickDirectory()`; if it returns a path, `await ipc.addRecent(path)` then update
   state `recents: [path, ...recents.filter(r => r !== path)]` (mirror the dedupe used by
   `scheduleSession`/spawn at lines ~2766). Add it to the store type/interface. No toast
   needed (the folder visibly appears); optionally a brief "Added folder" toast — keep
   consistent with existing add flows (no toast preferred).
5. [ ] **Background menu state + render** in `src/components/Sidebar/Sidebar.tsx`:
   - Reuse the existing `useRowMenu()` hook for a new `bgMenu` instance (cursor-
     positioned `{x,y}`, Escape/overlay dismiss, viewport-clamped) and render it with the
     existing `RowContextMenu` component (it already maps an `items` array onto the shared
     `.menu`/`.menuOverlay`/`.menuItem` classes).
   - Build the `items` array (order above), conditionally appending **Clear Overview
     filter** only when `overviewRepoFilter` is set, and labelling the collapse item by
     `sidebarCollapsed`.
   - Pull the needed actions from the store: `openNewSession`, `openSchedule`,
     `toggleSidebarCollapsed`, `overviewRepoFilter`, `setOverviewRepoFilter`, and the new
     `addFolder` (several are already selected in `Sidebar`).
6. [ ] **Wire the trigger on empty space (expanded):** add `onContextMenu={bgMenu.openMenu}`
   to the `.repos` scroll container, **guarded so it only fires on the background**, not
   when bubbling from a repo header/row (whose own `onContextMenu` handlers don't all
   `stopPropagation`). Guard with `if (event.target !== event.currentTarget) return;` at
   the top of the handler (the empty area below the last group is the container's own
   target). Ensure the empty-state `emptyHint` ("No repositories yet.") path is also
   right-clickable — wire the handler so a zero-repo sidebar still opens the menu (attach
   to the hint or give the container a min-height background so there's always a target).
7. [ ] **Wire the trigger on empty space (collapsed rail, #168):** add the same
   guarded `onContextMenu={bgMenu.openMenu}` to the collapsed rail's container background
   so right-clicking the rail (not an icon) opens the identical menu.
8. [ ] **Verify** the double-fire guard: right-clicking a repo header still opens the
   **repo** menu only (not the background menu), and right-clicking a row still opens that
   row's menu only.
9. [ ] Run `npm run build`, `npm run lint`, `npm test`, and
   `cargo test --manifest-path src-tauri/Cargo.toml` (+ `npm run lint:rust`); fix
   any issues.

**Acceptance criteria**

- [ ] Right-clicking the **empty area** of the sidebar (below the repo list, or anywhere
      when there are no repos) opens a context menu with: **New folder…**, **New
      session**, **Schedule session**, **Collapse/Expand sidebar**, and (only when an
      Overview repo filter is active) **Clear Overview filter**.
- [ ] **New folder…** opens the native folder picker; choosing a folder makes it appear
      as a sidebar folder group **with no agent started**, persists across restart, and
      does not change the selection or current view. Cancelling the picker does nothing.
- [ ] Choosing a folder that is already listed just moves it to the top — no duplicate,
      no error.
- [ ] **New session** / **Schedule session** open the same modals as the ⌘N / ⌘⇧N
      buttons; **Collapse/Expand** toggles the rail; **Clear Overview filter** removes the
      active filter and the item is hidden when no filter is set.
- [ ] The menu also opens when right-clicking the **collapsed icon rail's** empty
      background (#168).
- [ ] Right-clicking a **repo header** or any **item row** still opens only that
      element's own menu (the background menu does not also appear).
- [ ] Escape and clicking the overlay dismiss the menu; it is clamped on-screen.
- [ ] `npm run build`, `npm run lint`, `npm test`, `cargo test`, and `npm run lint:rust`
      all pass.

**Notes**

- **User decisions (refine Q&A, 2026-06-25):**
  - **Extra items:** include **Collapse/expand sidebar** and **Clear Overview filter**
    (the latter shown only when a filter is active). The user explicitly did *not* want
    Settings or Open-data-folder entries.
  - **Collapsed rail:** the menu must work in **both** the expanded sidebar and the
    collapsed icon rail → this task **depends on #168**.
- **Label decision (refine agent):** the card called it "New folder", but the action
  *opens/adds an existing* folder (it does not create a directory). Use **"New folder…"**
  as the label to match the user's wording, but ensure the picker title and behavior make
  clear it's "choose an existing folder" (the native picker title is already "Choose a
  working directory"). If the implementer prefers the clearer **"Add folder…"**, that is
  acceptable — keep it unambiguous either way.
- **No-toast / no-select decision (refine agent, reasonable default):** adding a folder
  is visually self-evident (it appears in the list), mirrors how an empty recent already
  renders, and should not steal selection or switch views. Implementer may add a brief
  toast if it matches surrounding conventions, but the default is none.
- **Grounding references:**
  - `src/components/Sidebar/Sidebar.tsx` — `useRowMenu()` (the reusable cursor menu
    hook), `RowContextMenu` (items renderer), `openRepoMenu` (repo menu pattern to mirror
    for clamping), the `.repos` container / `repos.map` render, the collapsed-rail render
    (`sidebarCollapsed`, `SIDEBAR_RAIL_WIDTH`), and `emptyHint`.
  - `src/store.ts` — `openNewSession`, `openSchedule`, `toggleSidebarCollapsed`,
    `sidebarCollapsed`, `overviewRepoFilter`/`setOverviewRepoFilter`, and the
    `recents`/dedupe pattern (`scheduleSession`, ~line 2766).
  - `src/ipc.ts` — `pickDirectory()` (folder picker), `removeRecent`/`listRecents`/
    `clearRecents` (the command-wrapper pattern to copy for `addRecent`).
  - `src-tauri/src/store.rs` — `touch_recent` (already deduped/capped/persisted),
    `remove_recent`. `src-tauri/src/commands.rs` — `remove_recent` command (the shape to
    mirror). `src-tauri/src/lib.rs` — `invoke_handler` registration list.
- **Double-fire guard:** repo-header/row `onContextMenu` handlers don't all
  `stopPropagation`, so the background handler must self-guard with
  `event.target === event.currentTarget` rather than relying on propagation being stopped
  by children.

- **Implementation notes (2026-06-25):** Implemented as planned. Backend: `add_recent`
  command (reuses `Store::touch_recent`, deduped/capped/persisted) + `lib.rs` registration
  + `ipc.ts addRecent`. Store: `addFolder()` action — `pickDirectory()` → `addRecent` →
  move-to-top `recents` dedupe; no toast, no select, no view switch (cancel = no-op). In
  `Sidebar.tsx`: a second `useRowMenu()` instance (`bgMenu`) rendered via the shared
  `RowContextMenu`; a `bgMenuItems` array (New folder… / New session / Schedule session /
  Collapse-or-Expand sidebar / and Clear Overview filter only when `overviewRepoFilter` is
  set). Wired a guarded `openBgMenu` (`event.target === event.currentTarget`) onto the
  expanded `.repos` container **and** the collapsed-rail `.rail` + `.railRepos` containers,
  plus a direct (unguarded) handler on the zero-repo `emptyHint` so a folder-less sidebar is
  still right-clickable. Repo-header/row right-clicks still open only their own menus (the
  guard rejects bubbled events). All green: npm build / lint / test (221) / format:check;
  cargo test (73) / clippy / fmt. Live picker/Finder behavior not runtime-verified in the
  autonomous loop, but the flow reuses proven `pickDirectory` + `touch_recent` paths.
