# TASK-236

### 236. [ ] Show the current branch on its own line under each sidebar folder header (reuse the worktree branch indicator)

**Status:** Not started
**Depends on:** none
**Created:** 2026-06-28

**Description**

In the left sidebar, each top-level repo/folder header already shows the folder's
current git branch — but as an **inline, truncating badge next to the repo name**
(shipped in **#225**). With a long branch name that badge competes with the name, the
session count, and the `+` button for the same single header row, so it truncates early
and can crowd/break the header layout.

This task **moves the branch to its own dedicated line directly below the repo header**,
restyled to echo the existing **worktree branch indicator** (the `GitBranch` icon +
muted branch text used by `WorktreeHeader`). Because the branch gets a full line of its
own, a long branch name no longer breaks the header layout. The branch **data and sync**
shipped in #225 are reused unchanged — only the *rendering location and style* change.

**Grounding (current code).** Everything is in
`src/components/Sidebar/Sidebar.tsx` and `src/components/Sidebar/Sidebar.module.css`:

- `RepoGroup` (Sidebar.tsx, ~line 1174) renders the repo header. Inside the `.repoTitle`
  button (~lines 1268–1290) it currently renders the inline badge:
  ```tsx
  {branches[repo] && (
    <span className={styles.repoBranch} title={branches[repo]}>
      {branches[repo]}
    </span>
  )}
  ```
  immediately after `<span className={styles.repoName}>` and before the `.count`. The
  `branches` map (path → current branch) comes from the store; `branches[repo]` is
  empty for a non-git / unknown folder. `isFiltered = overviewRepoFilter === repo`, and
  the repo-name button's `onClick` does `setOverviewRepoFilter(repo); setView("overview")`
  (toggling the filter — `setOverviewRepoFilter` flips it off when already active).
- `WorktreeHeader` (Sidebar.tsx, ~line 940) is the indicator to reuse: a `GitBranch`
  size-12 strokeWidth-1.5 icon (`.worktreeIcon`, `aria-label="worktree"`) followed by a
  `.worktreeName` **button** whose `onClick` filters Overview to that worktree
  (`setOverviewRepoFilter(path); setView("overview")`, `aria-pressed={isFiltered}`).
  CSS: `.worktreeHeader` (flex row, gap, muted color), `.worktreeName` (mono,
  `--fs-meta-sm`, truncates, hover → `--text-secondary`), `.worktreeActive .worktreeName`
  (accent when filtered).
- CSS for the inline badge: `.repoBranch` (Sidebar.module.css ~lines 249–261, muted mono
  `--fs-meta-xs`, `max-width: 50%`, truncates). `.repoName` was given `flex: 0 1 auto`
  **by #225** (comment at ~line 236: "Don't grow (#225): so the branch badge sits right
  after the name") so the inline badge could sit next to it; `.count` uses
  `margin-left: auto` to stay right-aligned. `.repoFolder` has `margin-left: var(--space-16)`
  (16px) + width 14px — the indent reference for aligning the new line under the name.

**User decisions (step 5 — see Notes for context):**

1. **Replace** the inline #225 badge — do *not* keep both. The branch shows only on its
   own line below the header.
2. The branch line is **clickable**: clicking it filters Overview to the repo (toggle),
   exactly like clicking the repo name and like the worktree name's behavior.
3. **Indented, icon + text:** the line sits directly below the header (above the session
   rows), **indented to align under the repo name**, with the `GitBranch` icon + muted
   branch text — visually echoing the worktree sub-header but **without** its left-border
   sub-group framing (`.worktreeGroup`'s `border-left`).

**Out of scope (leave unchanged):**

- The **#225 sync logic** — the `branches` map, `refreshBranches`, the #212 busy→idle
  edge refresh, and the focus/visibility/15s-poll `useEffect` in `Sidebar` — is kept
  exactly as shipped. This task only re-renders the same data.
- The **collapsed icon rail** (no room for a text branch line; #225 already excluded it).
- **Worktree sub-group headers** (`WorktreeHeader`) — already show their own branch;
  unchanged.
- The **Overview/Canvas agent-header** folder+branch indicator (#226) — unrelated.
- **Session-row labels** and any **backend** change (none needed — pure frontend).

**Subtasks**

1. [ ] In `RepoGroup` (`Sidebar.tsx`), **remove** the inline `branches[repo] && <span
   className={styles.repoBranch}>…</span>` badge from inside the `.repoTitle` button.
2. [ ] Add a **new branch line** directly below the `.repoHeader` `<div>` (still inside
   the `.group`, **before** the `repoSessions.map(...)`), rendered only when
   `branches[repo]` is truthy. Make it a `<button type="button">` containing:
   - a `GitBranch` icon (`size={12}`, `strokeWidth={1.5}`, `aria-hidden` — the row has a
     text label, unlike the worktree's icon-only fallback), and
   - a `<span>` with `{branches[repo]}` and `title={branches[repo]}`.
   - `onClick`: `setOverviewRepoFilter(repo); setView("overview")` (same as the repo
     name — `setOverviewRepoFilter` toggles off when already active).
   - `aria-pressed={isFiltered}` and a `title` like `` `Filter Overview to ${repoName(repo)}` ``.
3. [ ] Add CSS in `Sidebar.module.css`:
   - A `.repoBranchLine` rule (flex row, `align-items: center`, gap matching the worktree
     header, muted color, transparent button reset like `.worktreeName`/`.repoTitle`),
     **indented** so the icon aligns under the repo name (account for `.repoFolder`'s
     16px `margin-left` + 14px width + the title's left padding/gaps — e.g. a
     `margin-left`/`padding-left` that lines the `GitBranch` icon up under the `Folder`
     icon or the name; pick whichever reads cleanly and document it in a comment).
   - The branch text: mono, muted (`--text-muted`), `--fs-meta-xs` (compact-tree size,
     matching `.repoBranch`/`.repoName`), `text-overflow: ellipsis`, `white-space: nowrap`,
     `overflow: hidden`, `min-width: 0` as a safety net for an extreme name.
   - Hover → `--text-secondary` and an **accent** color when `isFiltered` (mirror
     `.worktreeName:hover` / `.worktreeActive .worktreeName`).
   - **Remove** the now-unused `.repoBranch` rule.
4. [ ] Now that the inline badge is gone, optionally **restore `.repoName` to grow**
   (revert the #225 `flex: 0 1 auto` back toward `flex: 1`/its pre-#225 form) so the name
   reclaims the header width; verify the `.count` stays right-aligned (it uses
   `margin-left: auto`) and the `+` is unaffected. Update/trim the #225 comment.
5. [ ] Verify: `npm run build`, `npm run lint`, `npm test` pass; manually sanity-check the
   sidebar (a git repo shows the branch line; a non-git folder shows none; a very long
   branch name stays on its own line without breaking the header; clicking the line
   filters Overview and toggles off).

**Acceptance criteria**

- [ ] The repo header **no longer renders the branch inline** next to the repo name (the
      `.repoBranch` span is gone).
- [ ] Each top-level folder **with a known git branch** shows that branch on **its own
      line directly below the header** (above the session rows), indented to align under
      the repo name, with a `GitBranch` icon + muted branch text — visually matching the
      worktree branch indicator (no left-border sub-group framing).
- [ ] A **non-git / unknown-branch** folder shows **no** branch line.
- [ ] **Clicking** the branch line filters Overview to that repo and **toggles off** when
      clicked again while active, switching to the Overview view — same as clicking the
      repo name; `aria-pressed` reflects the filtered state.
- [ ] A **long branch name** occupies its own full line and does **not** break the header
      layout or push out the session count / `+`.
- [ ] The **#225 sync behavior is unchanged** — the branch line updates after an
      in-terminal/external `git checkout` (busy→idle edge, window focus/visibility, and
      the ~15s poll) exactly as the inline badge did.
- [ ] **Worktree sub-group headers** and the **collapsed icon rail** are unchanged.
- [ ] `npm run build`, `npm run lint`, and `npm test` pass. Pure frontend — renders
      identically on macOS and Windows (per the cross-platform requirement).

**Notes**

- **Why this exists:** #225 shipped the branch as an inline badge sharing the single
  header row; long branch names truncate early / crowd the name+count+`+`. Giving the
  branch its own line (the worktree-indicator style) fixes the layout while keeping #225's
  data + sync. This task **supersedes the inline rendering of #225**, not its sync logic.
- **User answers (step 5):** (1) **Replace** the inline badge — not keep both;
  (2) the line is **clickable** to filter Overview (like the worktree name); (3) **indented,
  GitBranch icon + muted text**, without the worktree sub-group's left border.
- **Reuse references:** `WorktreeHeader`'s `GitBranch` icon + `.worktreeName` /
  `.worktreeActive` styling; the repo-name button's `onClick`
  (`setOverviewRepoFilter` + `setView("overview")`); the `branches[repo]` truthiness
  guard; `isFiltered = overviewRepoFilter === repo`; `repoName(repo)` for the title text.
- **Cross-platform:** pure frontend. Branch reads go through the existing cross-platform
  `current_branches` git shell-out (no change); plain CSS — identical in WKWebView (macOS)
  and WebView2 (Windows).
- **Dependencies:** none. Builds on already-shipped code — the #225 inline badge + sync,
  the #212 `branches` map / `refreshBranches`, the #197 worktree Overview filter, and the
  worktree branch indicator — all archived/Done.
