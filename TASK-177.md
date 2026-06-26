# TASK-177

### 177. [ ] "Open view in this folder" on every panel + an instant "New session" option

**Status:** Not started
**Depends on:** none
**Created:** 2026-06-26

**Description**

Two related additions to the per-folder **"Open view in this folder"** affordance:

**(A) Put the button on non-agent panels.** Today the `OpenViewButton` (#165,
`src/components/OpenViewButton/OpenViewButton.tsx`) — an icon button that opens the
shared **Views** popover (`ViewsPopover` → `ViewsMenu`: File viewer / Kanban board /
Diff viewer / File tree / Terminal, all scoped to a folder) — renders **only on agent
surfaces**:

- Overview `SessionCard` actions (`src/components/Overview/Overview.tsx`, non-worktree
  agents; worktree agents use the `WorktreeViewsBadge` instead).
- Canvas agent panel headers (`src/components/Canvas/CanvasSurface.tsx` ~line 215:
  `content.kind === "agent" && session && !session.worktreeParent`).

Non-agent panels (the Overview `ExtraPanel` and the non-agent Canvas panel headers) only
have **Maximize + Close**, even though they already carry a `repoPath`. The user wants
the same "Open view in this folder" button on **all non-agent folder panels** — file
viewer, kanban board, diff, terminal, file tree — in **both** the Overview column header
and the Canvas panel header (matching where agents have it). Pending **scheduled** cards
are excluded.

**(B) Add an instant "New session" option to the Views menu.** Add a **"New session
here"** item to the shared `ViewsMenu` that **immediately spawns an agent on the panel's
folder, on its current branch, with no modal**. This is deliberately different from the
repo context-menu's "New session" (which runs `startRepoSession` #127 → opens the
new-session modal at the branch step for a git repo): the card explicitly says it
"starts a new session on that specific folder and branch instantly (does not need to open
the new session modal)". The direct path is `store.spawnSession(repoPath)` — `spawnSession`
spawns on the **current** branch (it only checks out when passed a `branch` arg, which we
omit), works for git and non-git folders, selects the new agent, and toasts "Started …".
Because it lives in the **shared** `ViewsMenu`, the option appears **everywhere the
button does — including agent cards/panels** (confirmed desired, see Notes).

Net effect: every panel header (agent or not) gets the "Open view in this folder" button,
and its popover offers the five existing view types **plus** "New session here".

**Scope**

- Add a "New session here" item to `ViewsMenu` (instant `spawnSession(repoPath)`, no
  modal, current branch), placed visually distinct from the "add a view" items.
- Render `OpenViewButton` on every **non-agent** panel header in **Overview**
  (`ExtraPanel`) and **Canvas** (`CanvasSurface`) — file / kanban / diff / terminal /
  filetree — using each panel's own `repoPath`/`repoKey`.
- Broaden the `OpenViewButton` tooltip/aria wording slightly so it reflects "view **or**
  session" (it now offers New session too).

**Out of scope**

- Pending **scheduled** cards (`ScheduleCard` in Overview, `scheduled` Canvas content) —
  no button (per the user's choice).
- **Sidebar** rows — unchanged (they keep their right-click `RowContextMenu`); this task
  is about the Overview/Canvas panel **headers**, matching where the agent button lives.
- The **worktree** agent badge (`WorktreeViewsBadge`, #164) — unchanged; worktree agents
  keep their badge, and it can optionally gain "New session here" only via the shared
  `ViewsMenu` it already renders (it already uses `ViewsMenu`, so it gets the new item for
  free — acceptable, no extra work).
- Any change to the repo context-menu "New session" (`startRepoSession`, modal path) — it
  stays as-is; this adds a *separate* instant entry point.
- Branch selection / checkout for the instant session — none; it uses the folder's
  current branch (no `git checkout`).

**Subtasks**

1. [ ] **Add the instant "New session here" item to `ViewsMenu`**
   (`src/components/ViewsMenu/ViewsMenu.tsx`):
   - Pull `spawnSession` from the store (`const spawnSession = useStore((s) =>
     s.spawnSession);`).
   - Add a menu entry (e.g. icon `Plus` or `TerminalSquare` from lucide) labeled **"New
     session here"** whose `run` does `void spawnSession(repoPath); onClose();`.
   - Place it as a **distinct action** from the five view items — recommended: render it
     first (or last) with a thin separator (a `<div className={styles.sep} />` or reuse an
     existing divider style) so "start a session" reads as separate from "add a view".
     Keep the existing five items unchanged.
2. [ ] **Render `OpenViewButton` on non-agent Overview panels** — in
   `src/components/Overview/Overview.tsx`, `ExtraPanel`'s `actions` (currently Maximize +
   Close, ~line 326): add `<OpenViewButton repoPath={repoPath} className={styles.action}
   />` as the **first** action (before Maximize), where `repoPath` is `ExtraPanel`'s
   `repoPath` prop (the panel's `repoKey` folder). `OpenViewButton` is already imported in
   this file (used by `SessionCard`).
3. [ ] **Render `OpenViewButton` on non-agent Canvas panels** — in
   `src/components/Canvas/CanvasSurface.tsx`, alongside the existing agent button (~line
   215) and the Maximize button (~line 256), add a branch that renders
   `<OpenViewButton repoPath={repoPath} className={styles.panelClose} />` when the content
   is a **non-agent folder panel** and `repoPath` is set — i.e. `content.kind` is one of
   `"file" | "diff" | "kanban" | "filetree" | "terminal"` (exclude `agent`, `scheduled`,
   `pending`). `OpenViewButton` is already imported (line 20). `repoPath` is already
   resolved for non-agent content (it gates the repo/branch meta at ~line 166).
4. [ ] **Broaden the button wording** in `OpenViewButton.tsx`: update `title` / `aria-label`
   from "Open a view in this folder" to something covering the new item, e.g. **"Open a
   view or start a session in this folder"** (keep it concise).
5. [ ] **Manual sanity** (`npm run tauri dev` if available): every Overview column header
   and Canvas panel header (agent and non-agent, except scheduled) shows the button; its
   popover lists the five views + **New session here**; clicking **New session here**
   spawns an agent in that folder on the current branch with **no modal**, and a "Started …"
   toast; the new agent appears in that repo's cluster/sidebar.
6. [ ] Run `npm run build`, `npm run lint`, `npm test`, `npm run format:check`, and
   `cargo test --manifest-path src-tauri/Cargo.toml` (+ `npm run lint:rust`); fix any
   issues. (Frontend-only; Rust unaffected but run per convention.)

**Acceptance criteria**

- [ ] The "Open view in this folder" button appears on **every non-agent panel** — file
      viewer, kanban, diff, terminal, file tree — in **both** the Overview column header
      and the Canvas panel header. Pending scheduled cards do **not** get it.
- [ ] The button's popover lists the existing five views **plus** a **"New session here"**
      item.
- [ ] **New session here** spawns an agent in that panel's folder on its **current branch**
      **without opening the new-session modal**, selects it, and toasts "Started …" — for
      both git and non-git folders.
- [ ] "New session here" is available from **every** panel's button, **including agent**
      cards/panels (shared `ViewsMenu`).
- [ ] The agent button behaves exactly as before plus the new item; the repo context-menu
      "New session" (modal path) is unchanged; scheduled cards and sidebar rows are
      unchanged.
- [ ] `npm run build`, `npm run lint`, `npm test`, `npm run format:check`, `cargo test`,
      and `npm run lint:rust` all pass.

**Notes**

- **User decisions (refine Q&A, 2026-06-26):**
  - **Which panels:** *all non-agent panels* (file / kanban / diff / terminal / filetree),
    in **both** Overview and Canvas headers. **Excludes** pending scheduled cards.
  - **New session option:** add it to the **shared Views menu so it appears everywhere,
    including agents**, as an **instant** spawn on the folder's **current branch** with **no
    modal** (the card's explicit ask). Suggested label **"New session here"** to set it
    apart from the repo menu's modal-based "New session".
- **Assumptions (reasonable defaults):**
  - The instant session is **unnamed** (auto-named like any normal spawn) and does **not**
    switch the main view (it just selects the new agent, as `spawnSession` already does).
  - No destructive-checkout warning is needed (no `git checkout` — current branch only).
  - A worktree agent's existing `WorktreeViewsBadge` popover (which already renders
    `ViewsMenu`) inherits the new "New session here" item for free — acceptable, no special
    handling.
- **Grounding references:**
  - `src/components/OpenViewButton/OpenViewButton.tsx` — the reusable button (props
    `repoPath`, `className`, `iconSize`) wrapping `ViewsPopover`.
  - `src/components/ViewsMenu/ViewsMenu.tsx` — the shared action set (File viewer / Kanban
    / Diff / File tree / Terminal via `addOverviewPanel`/`createKanbanBoard`); add the
    "New session here" item here. `ViewsPopover` hosts it as a popover.
  - `src/store.ts` — `spawnSession(cwd, name?, branch?)` (~line 2397; omit `branch` →
    current branch, no checkout; selects + toasts) and `startRepoSession` (~line 1381, the
    *modal* path — for contrast, not used here).
  - `src/components/Overview/Overview.tsx` — `SessionCard` (agent button precedent, has
    `OpenViewButton` imported) and `ExtraPanel` (`actions` = Maximize + Close, ~line 326;
    `repoPath` prop = the panel's `repoKey`).
  - `src/components/Canvas/CanvasSurface.tsx` — the panel header (`OpenViewButton` for
    agents ~line 215, Maximize ~line 256, close ~line 271; non-agent `repoPath` available
    ~line 166).
