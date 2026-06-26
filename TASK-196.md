# Task 196

### 196. [x] Worktree header: icon-only marker + an inline "new session" button like repos

**Status:** Done
**Depends on:** none
**Created:** 2026-06-26

**Description**

In the sidebar tree a **worktree** (#74) renders as a sub-group header
(`WorktreeHeader` in `src/components/Sidebar/Sidebar.tsx`, ~line 846) nested under its
parent repo. Today that header shows a `GitBranch` icon **plus the literal word
"worktree"** (`<span className={styles.worktreeBadge}>worktree</span>`, ~line 903), and —
unlike a **repo** header — it has **no inline "+" new-session button**: a repo header
carries an always-visible `+` (`onClick={() => startRepoSession(repo)}`, "New session in
this repo", ~line 1481), while a worktree's create flow is buried in its right-click menu.
The user wants the worktree header to (a) **drop the word in favor of a simple icon** that
marks it as a worktree, and (b) gain the **same inline new-session button** repos have, with
items created still landing **in that worktree**.

**Goal & why.** Make a worktree header read cleanly (an icon, not a text badge) and behave
like a repo header for the common "start something here" action — consistency + less visual
noise. The worktree's full add-view set already lives in its right-click menu (the shared
`ViewsMenu`, #164/#166); this adds the **inline** convenience the repo header has.

**Changes.**
1. **Drop the "worktree" text badge** (the `worktreeBadge` span, ~line 903). The existing
   **`GitBranch` icon** (~line 896) remains as the worktree marker (it already distinguishes
   a worktree from a repo, whose header uses the `Folder` icon, #128). Keep a `title` /
   `aria-label` conveying "worktree" so the meaning isn't lost with the word gone. _(Optional:
   swap `GitBranch` → `FolderGit2` to parallel the repo's `Folder` icon as a clearer
   "worktree folder" cue — see Notes; default is to keep `GitBranch` for a minimal change.)_
2. **Add an inline "+" new-session button** to the worktree header, mirroring the repo
   header's `+` (same `Plus` icon, same placement at the row's trailing edge, same styling —
   reuse the repo `+` class or a `worktree`-scoped variant). Its `onClick` calls
   **`spawnWorktreeSession(parent, branch)`** (the store action the worktree menu's "New
   session" already uses, ~line 945) so the new agent **reuses that worktree** (ref-count++,
   #166). **Disable** it (like the menu item, ~line 941–942) when `parent` is unknown
   (`title="Worktree parent unknown"`). Stop the row's context-menu / selection from firing
   on the button click as the repo `+` does.
3. **Layout**: with the badge removed and a trailing `+` added, the header row becomes
   `icon + branch-name (flex-grow) + "+"` — mirror the repo header's flex layout so the `+`
   sits at the right edge and the name truncates. Compact-rail mode (`compact`) keeps just the
   icon (no name/badge/button), unchanged.

**Scope.** The `WorktreeHeader` markup + the small CSS for the inline button/layout. Reuses
`spawnWorktreeSession` (#166), the repo `+` pattern (#127-style), and leaves the right-click
menu (New session / Views / Reveal / Copy / Pull / Close worktree) intact.

**Out of scope.**
- The other worktree cards: **click-to-filter Overview**, **schedule into a worktree**, and
  the **auto-delete guard** — separate cards (this only touches the header's marker + inline
  button). They touch the same component but aren't dependency-linked.
- Changing what the inline `+` creates (it starts a **session**, exactly like the repo `+`);
  other panel types stay in the worktree's right-click `ViewsMenu` (as for repos).
- The repo header (unchanged).

**Concrete files/symbols.**
- `src/components/Sidebar/Sidebar.tsx` — `WorktreeHeader` (~846–1020): remove the
  `worktreeBadge` span (~903); add the inline `+` button (model it on the repo header's
  `+` ~1481–1485) calling `spawnWorktreeSession(parent, branch)`; keep the `GitBranch` icon +
  a worktree `title`/`aria-label`.
- `src/components/Sidebar/Sidebar.module.css` — `.worktreeHeader` layout (flex, trailing
  button), a worktree `+` button class (reuse/parallel the repo `+`); drop/repurpose
  `.worktreeBadge`.

**Subtasks**

1. [x] Removed the `worktreeBadge` "worktree" text span; the `GitBranch` icon now carries
   `role="img" aria-label="worktree"` (was `aria-hidden`) so the meaning survives without the
   word; the header keeps its absolute-path `title`.
2. [x] Added the inline `+` button (repo-header `.plus` styling) → `spawnWorktreeSession(parent,
   branch)`; native `disabled={!parent}` (greyed via a new `.plus:disabled`,
   `title="Worktree parent unknown"`); `onClick` `stopPropagation` so it never opens the row's
   context menu/select.
3. [x] CSS: `.worktreeName` gains `flex: 1` so the row is `icon + branch-name(grow) + "+"` with
   the name truncating, mirroring `.repoTitle`; dropped the dead `.worktreeBadge` rule; added
   `.plus:disabled`. Compact-rail (`!compact` gates the name + `+`) unchanged.
4. [x] **Verify** — `npm run build`, `npm run lint`, `npm test` (277) green; **no Rust
   changes**; both files prettier-clean. The live render/click is **runtime-unverified** in
   this loop (no GUI) — see Notes.

**Acceptance criteria**

- [x] The worktree header **no longer shows the literal word "worktree"**; the `GitBranch` icon
      marks it (with an accessible `aria-label="worktree"`), distinct from a repo's `Folder`.
- [x] The worktree header has an **inline "+" new-session button** matching the repo header's
      `.plus`; clicking it calls `spawnWorktreeSession(parent, branch)` (reuses that worktree,
      ref-count++ #166), and is `disabled` when the parent repo is unknown. _(Live click
      runtime-unverified — see Notes.)_
- [x] The right-click menu (New session / Views / Reveal / Copy / Pull / Close worktree) is
      untouched, and compact-rail rendering (just the icon) is unchanged.
- [x] `npm run build`, `npm run lint`, `npm test` pass; no Rust changes.

**Notes**

- **Autonomous refine (2026-06-26):** user not responding; decisions logged in
  `ASSUMPTIONS.md`.
  - **Icon stays `GitBranch`** (already present, already distinguishes a worktree from the
    repo's `Folder` icon); just drop the word + keep an accessible "worktree" title.
    `FolderGit2` noted as a clearer parallel-to-`Folder` alternative if desired — minimal
    change wins here.
  - **Inline `+` mirrors the repo `+`** = starts a **session** (`spawnWorktreeSession`), not a
    type menu; other panel types remain in the worktree's right-click `ViewsMenu` (#164),
    exactly as for repos. "Items created go into that worktree" = the reused worktree folder.
  - **Disabled when `parent` unknown**, matching the existing menu item's guard.
- **Depends on: none** — reuses shipped `spawnWorktreeSession` (#166), `ViewsMenu` (#164), and
  the repo `+` pattern. Sibling worktree cards (filter-on-click, schedule-into-worktree,
  auto-delete guard) touch the same area but aren't prerequisites.
- **References:** `Sidebar.tsx` `WorktreeHeader` (~846, icon ~896, badge ~903, menu New
  session ~937–950), repo header `+` (~1481–1485, `startRepoSession`), `spawnWorktreeSession`
  / `ViewsMenu`. CLAUDE.md "Sidebar tree (#45/#59)" + worktree notes (#74/#96/#133/#164/#166).

**Implementation notes (2026-06-26 — done)**

- Touched only `Sidebar.tsx` (`WorktreeHeader` markup) + `Sidebar.module.css`. **No Rust.**
- **Reused, not re-created:** the inline `+` uses the repo header's existing `.plus` class and
  the shipped `spawnWorktreeSession(parent, branch)` (the same action the worktree menu's "New
  session" already calls), so a new agent reuses the app-managed worktree (ref-count++, #166).
- **Disabled vs aria-disabled:** the plan said "like the menu item" (which uses
  `aria-disabled` + a guard). For a plain icon button, native `disabled={!parent}` is cleaner
  (it natively blocks the click and greys via the new `.plus:disabled`); kept the guard
  (`if (parent)`) too for belt-and-suspenders. The menu item is unchanged.
- **Icon a11y:** dropping the word risked losing meaning, so the icon went from `aria-hidden`
  to `role="img" aria-label="worktree"`. No jsx-a11y linter in the repo, so this is purely a
  semantic improvement; visually identical.
- **`stopPropagation` added** (the repo `+` doesn't, but its DOM structure already isolates it)
  so the worktree `+` click never bubbles to a (current/future, e.g. #197 click-to-filter)
  header handler — honoring the plan's explicit "stop the row's context-menu/selection".
- **Runtime-unverified (autonomous loop, no GUI session):** the rendered header (icon + name +
  `+`, no badge) and that clicking `+` spawns an agent nested under the same worktree. The
  change is small, mirrors the verified repo `+`, reuses shipped actions, and passes
  build/lint/test. Recommend a quick `npm run tauri dev` pass with a worktree present.
