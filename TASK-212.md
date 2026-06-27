### 212. [ ] Keep the worktree branch label in the sidebar in sync after an in-terminal checkout

**Status:** Not started
**Depends on:** none
**Created:** 2026-06-27

**Description**

When an agent runs `git checkout <other-branch>` **inside its worktree** (directly in
the PTY terminal), the sidebar's worktree branch label keeps showing the **old**
branch until the app is restarted. The label should track the worktree's actual
current branch.

Root cause (grounded in the code):

- The sidebar's worktree label is `wtBranch = (branches[wt] ?? "") || repoName(wt)`
  (`src/components/Sidebar/Sidebar.tsx` ~line 1606); repo headers use
  `branches[repo]` the same way.
- `branches` is a `Record<path, branch>` populated by `refreshBranches`
  (`src/store.ts:2026`) → `ipc.currentBranches(repos)` where
  `repos = repoOrder(get().recents, get().sessions)`. Because `repoOrder` adds
  **every** session's `repoPath` (and a worktree agent's `repoPath` **is** the
  worktree folder), worktree folders are **already included** — so `current_branches`
  already resolves their HEADs. The backend `git::current_branches`
  (`src-tauri/src/git.rs:116`) runs `git -C <path> rev-parse --abbrev-ref HEAD` per
  path, which works for worktree folders.
- The problem is purely **when** `refreshBranches` runs. Today it fires only:
  (a) from the Sidebar effect keyed on `reposKey` — the **top-level repo set**
  changing (`Sidebar.tsx` ~line 1191); and (b) after app-initiated spawns/checkouts
  (`spawnSession` / `spawnWorktreeSession` / `createBranchSession` /
  `createBranchWorktreeSession`, `store.ts` ~2917/2940/2970/2986). A checkout the
  agent performs **inside the terminal** triggers none of these, so the label goes
  stale.

Fix: re-read branches on each session **busy→idle** transition (debounced/coalesced),
mirroring the #97 title reader, which re-reads claude's title on the busy→idle edge.
A checkout happens during a turn; the agent goes busy then settles to idle; reading
the branch on settle picks up the new branch with minimal git spawns. This naturally
covers **both** worktree labels and normal repo headers (a normal agent's in-terminal
`git checkout` has the identical staleness) in one batched `current_branches` call.

**Scope / out of scope**

- In scope: refreshing `branches` on busy→idle so worktree (and repo) labels track
  in-terminal checkouts; debouncing so bursts of sessions settling don't spam git.
- Out of scope: any backend change to `current_branches` (it already resolves
  worktree HEADs and is already called with worktree paths); a new dedicated
  branch-watcher thread; instant (sub-second) updates at the exact moment of checkout
  — a short lag until the next idle settle is acceptable.

**Subtasks**

1. [ ] In `src/store.ts`, find where `sessionBusy` is updated from the backend
   `session://state` event (the busy/idle handler). Detect the **busy→idle** edge
   (previous busy `true` → now `false`).
2. [ ] On that edge, schedule a **debounced** `refreshBranches()` (module-level timer,
   ~500ms–1s, like `sidebarWidthPersistTimer`) so multiple sessions settling together
   coalesce into a single `current_branches` call.
3. [ ] Confirm no backend change is needed: `refreshBranches` already passes worktree
   paths (via `repoOrder(recents, sessions)`) and `current_branches` resolves them.
4. [ ] Tests (`store.test.ts`): mock `ipc.currentBranches`; drive a session
   busy→idle and assert `refreshBranches` runs (after the debounce) and that a changed
   branch returned by the mock updates `branches[worktreePath]` (and a repo path).
5. [ ] Docs: add a one-line note to the Git/branch section of `CLAUDE.md` that branch
   labels refresh on the busy→idle edge (like the title reader), so an in-terminal
   `git checkout` is reflected.

**Acceptance criteria**

- [ ] After an agent checks out a different branch inside its worktree (in the
      terminal), the sidebar worktree label updates to the new branch by the next
      busy→idle settle — no app restart required.
- [ ] Repo headers' branch labels likewise track in-terminal checkouts.
- [ ] Branch refresh is debounced/coalesced — no per-event git spawn storm when many
      sessions toggle.
- [ ] `npm run lint`, `npm run build`, and `npm test` pass.

**Notes**

- Decided autonomously (refine loop, user not answering — see `ASSUMPTIONS.md`).
- Trigger = **busy→idle edge, debounced**, mirroring the #97 title-worker cadence;
  chosen over a periodic poll timer (chattier + laggier).
- Covers both worktree and normal-repo labels in one batched call — the worktree is
  the motivating case, but scoping it to worktrees only would leave the identical repo
  staleness unfixed for no benefit.
- No backend change: `current_branches` already resolves worktree HEADs and is
  already invoked with worktree paths included.
- A small lag (label updates at the next idle settle, not the instant of checkout) is
  expected and acceptable.
