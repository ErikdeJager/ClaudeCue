# Task 196

### 196. [ ] Worktree header: icon-only marker + an inline "new session" button like repos

**Status:** Not started
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

1. [ ] Remove the `worktreeBadge` "worktree" text; ensure the `GitBranch` icon + a `title`/
   `aria-label` still mark the row as a worktree.
2. [ ] Add the inline `+` button (repo-header-style) → `spawnWorktreeSession(parent, branch)`;
   disabled when `parent` is unknown; click doesn't open the context menu / select.
3. [ ] CSS: worktree header flex layout with the trailing `+`; name truncation; compact-rail
   unchanged.
4. [ ] **Verify** — `npm run build`, `npm run lint`, `npm test` green; Rust untouched.
   Manual (or note as runtime-unverified): a worktree row shows an icon (no "worktree" word)
   and a `+`; clicking `+` spawns an agent **inside that worktree** (nested under the same
   header, ref-count++); the right-click menu still works; compact rail still shows just the
   icon.

**Acceptance criteria**

- [ ] The worktree header **no longer shows the literal word "worktree"**; an icon marks it
      (with an accessible "worktree" label/title).
- [ ] The worktree header has an **inline "+" new-session button** matching the repo header's;
      clicking it starts an agent **in that worktree** (via `spawnWorktreeSession`), and is
      disabled when the parent repo is unknown.
- [ ] The right-click menu (New session / Views / Reveal / Copy / Pull / Close worktree) and
      compact-rail rendering are unchanged.
- [ ] `npm run build`, `npm run lint`, `npm test` pass; no Rust changes.

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
