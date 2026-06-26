# TASK-180

### 180. [x] Show remote branches in the new-agent branch picker (auto-fetch + pull-on-select)

**Status:** Done
**Depends on:** none
**Created:** 2026-06-26

**Description**

The **new-session modal**'s branch step (`src/components/NewSessionModal/NewSessionModal.tsx`)
lists only **local** branches — the backend `list_branches` runs
`git for-each-ref refs/heads` (`src-tauri/src/git.rs:201`), so branches that exist
only on the remote (e.g. a teammate's `origin/feature-x`) are invisible. The user
can't start an agent on a remote branch without dropping to a terminal to fetch +
check it out first.

**Goal:** in the branch step, show the repo's **remote branches** under a separate
**"Remote branches"** header below the local list. Selecting one **pulls it
locally** — i.e. creates a local branch tracking the remote ref and starts the agent
on it — using the same two key bindings the local list already uses:
**Enter** = create the local tracking branch, check it out **in the folder**, and
start; **⌘⏎** = create it and start in an **isolated worktree** (#74).

**Key insight (reuse #124):** "pull a remote branch locally" is exactly "create a
new local branch named `<short>` based on `<remote-ref>`". The #124 create-branch
machinery already does this:
- in-folder: `git checkout -b <name> <base>` (`git::create_branch`, via the store's
  `createBranchSession` → `create_branch` + `spawn_session`);
- worktree: `git worktree add -b <name> <base> <dest>` (`git::worktree_add_new_branch`,
  via `createBranchWorktreeSession` → `spawn_worktree_agent_new_branch`).
With `<base>` = the remote ref (e.g. `origin/feature-x`) and `<name>` = the short
branch name (`feature-x`), `git` creates the local branch **and** sets upstream
tracking by default (`branch.autoSetupMerge`). So the only backend gap is that
`validate_new_branch` (`git.rs:285`) restricts `base` to **local** branches; it must
also accept **remote-tracking refs**. No brand-new spawn/checkout command is needed
for the pull itself — only the listing, the base-validation widening, and a fetch.

**User decisions (refine Q&A, 2026-06-26):**
1. **Remote source = auto-fetch on open.** When the branch step opens, run
   `git fetch --prune` so the remote list is current, then (re)list. Must be
   best-effort: an offline repo / missing remote / auth failure degrades to the
   cached remote-tracking refs, never blocking the modal.
2. **Mirror both Enter and ⌘⏎** for remote rows (in-folder checkout *and* worktree),
   as above.
3. **Separate header, dedup vs local.** A "Remote branches" header; rows labeled
   `<remote>/<name>`; exclude the symbolic `origin/HEAD`; **hide** a remote branch
   when a local branch of the same short name already exists.

**Scope**

Backend (`src-tauri/src`):
- Extend `BranchList` (`git.rs`) with a `remote: Vec<String>` field (qualified short
  refs, e.g. `["origin/feature-x"]`) and mirror it in the TS `BranchList`
  (`src/types/index.ts:56`). Keep `current` + `all` (local) unchanged so all existing
  consumers (`compare_branches`, checkout validation) keep working.
- `list_branches` (`git.rs:201`): after collecting local `refs/heads`, also collect
  `git for-each-ref --format=%(refname:short) refs/remotes`, then build `remote` by:
  - dropping any ref whose name part is `HEAD` (the `origin/HEAD` symbolic ref);
  - dropping any ref whose **short name** (everything after the first `/`) already
    appears in the local `all` list (dedup). Branch names can contain `/`, so split
    only on the **first** `/` (`split_once('/')`) — remote = first segment, name =
    remainder (`origin/feature/foo` → name `feature/foo`).
  - This adds no network call; it's two cheap `for-each-ref` reads.
- New `git::fetch_remotes(cwd) -> Result<(), String>`: runs
  `git -C <cwd> fetch --prune` with `GIT_TERMINAL_PROMPT=0` set in the child env (so a
  private remote fails fast instead of hanging on a credential prompt). Returns git's
  stderr on failure. (Optional hardening: also set `GIT_SSH_COMMAND="ssh -oBatchMode=yes"`
  to avoid SSH prompts.) This is a **new git network read** — note it in CLAUDE.md.
- Widen `validate_new_branch` (`git.rs:285`): the `base` existence check must accept a
  base that is either in `all` **or** in the new `remote` list. Membership-in-list
  validation still blocks arbitrary/flag-like refspecs at the IPC boundary. No change
  to the name validation. With this, `create_branch` and `worktree_add_new_branch`
  accept a remote-ref base unchanged.
- Add the `fetch_remotes` Tauri command (`commands.rs`) + register in `lib.rs`; add
  `fetchRemotes(cwd)` to `src/ipc.ts`. (No new pull/checkout command — the pull reuses
  `create_branch` / `spawn_worktree_agent_new_branch`.)

Frontend (`src`):
- `ipc.ts` / `types`: add `remote` to `BranchList`; add `fetchRemotes` wrapper.
- Branch-step load (`NewSessionModal.tsx`): when the branch step is shown for a git
  folder, in addition to the existing `listBranches` load, fire `fetchRemotes(cwd)`
  and, on completion (success or failure), re-call `listBranches(cwd)` to refresh the
  `remote` list. Show the local branches immediately (don't block on the fetch); show
  a subtle "fetching…" affordance in the remote section while in flight. This must run
  for both the normal folder→branch path and the #127 per-repo preload path (the
  seeded `initialBranches` may lack `remote` until the fetch+reload completes).
- Render a **"Remote branches"** subheader + rows below the local list (place it after
  the local list; the "+ add branch" affordance stays at the bottom). Each remote row
  shows `<remote>/<name>`. Omit the whole section when `remote` is empty.
- Keyboard nav + selection: extend the roving-tabindex listbox so ↑/↓ traverse
  local → remote → "+ add branch". Track which kind of row is highlighted (local
  branch name vs. remote ref vs. add-branch) — e.g. a discriminated highlight, or a
  parallel `selectedRemote` mutually exclusive with `selectedBranch`. Wire the actions:
  - remote row + **Enter** → `createBranchSession(cwd, shortName, remoteRef)` (creates
    local tracking branch, checks out **in the folder**, starts). Reuse the existing
    **destructive-confirm gate** (another agent already running in that folder) exactly
    as the local checkout-and-start path does.
  - remote row + **⌘⏎** → `createBranchWorktreeSession(repo, shortName, remoteRef)`
    (worktree on the new tracking branch; no folder disruption, so no confirm — matches
    local worktree behavior).
  - `shortName` = the remote ref with its first segment stripped (the same first-`/`
    split as the backend dedup).
  - The branch filter input must also filter remote rows.
- Error surfacing: a failed pull (e.g. dirty tree blocking checkout) reuses the
  existing branch-step error display, like `createBranchSession`'s current error path.

Docs:
- Update CLAUDE.md's "Git is read-mostly, with a small set of deliberate writes"
  section to note (a) the new `git fetch --prune` network read on the branch step, and
  (b) that the branch picker now lists remote branches and pulls one into a local
  tracking branch (reusing the #124 create-branch write). Update the `git.rs` /
  new-session-modal architecture lines accordingly.

**Out of scope**

- **No new dedicated pull/checkout command.** The pull reuses #124's
  `create_branch` / `worktree_add_new_branch`; do **not** add a separate
  `checkout_remote_branch` unless reuse proves insufficient (note it as the fallback).
- **No remote management** — no add/remove remote, no push, no `git pull` merge into an
  existing branch (selecting a remote always creates a *new* local branch; dedup means
  a same-named local branch is never offered as a remote row).
- **No background/periodic refetch** — fetch happens once when the branch step opens
  (plus the natural reload). No polling.
- **No multi-remote grouping UI** — all remotes share the single "Remote branches"
  header, rows qualified by `<remote>/`. (Most repos have only `origin`.)
- No change to the local-branch behavior, the schedule step, or fork.

**Subtasks**

1. [x] `git.rs`: add `remote: Vec<String>` to `BranchList`; mirror in
   `src/types/index.ts`.
2. [x] `git.rs` `list_branches`: collect `refs/remotes` via `for-each-ref`, exclude
   `*/HEAD`, dedup against local `all` by first-`/`-stripped short name; populate
   `remote`.
3. [x] `git.rs`: add `fetch_remotes(cwd)` (`git fetch --prune`, `GIT_TERMINAL_PROMPT=0`,
   stderr on failure).
4. [x] `git.rs` `validate_new_branch`: accept `base` present in `all` **or** `remote`.
5. [x] `commands.rs` + `lib.rs`: add the `fetch_remotes` command and register it;
   `ipc.ts`: add `fetchRemotes` + the `remote` field on `BranchList`.
6. [x] `NewSessionModal.tsx`: on branch-step show, fetch + reload; render the
   "Remote branches" section (dedup'd, `<remote>/<name>` rows, omitted when empty);
   "fetching…" affordance.
7. [x] `NewSessionModal.tsx`: extend keyboard nav + a discriminated highlight; wire
   remote-row Enter → `createBranchSession(cwd, shortName, remoteRef)` (with the
   destructive-confirm gate) and ⌘⏎ → `createBranchWorktreeSession(repo, shortName,
   remoteRef)`; extend the filter to remote rows.
8. [x] Rust tests (`git.rs` tests module, using `init_repo`/`git_in`/`commit_all`):
   - `list_branches` returns remote refs: after a commit, `git update-ref
     refs/remotes/origin/feat HEAD` → `remote` contains `origin/feat`.
   - excludes `origin/HEAD`: `git update-ref refs/remotes/origin/HEAD HEAD` → not in
     `remote`.
   - dedup: a local branch `dup` + `refs/remotes/origin/dup` → `origin/dup` absent.
   - `create_branch(dir, "feat-local", "origin/feat")` succeeds and `feat-local`
     appears in `all` (remote-ref base accepted by the widened validation).
   - Each test skips gracefully when git is unavailable (`let Some(dir) = init_repo(..) else return;`).
9. [x] Update CLAUDE.md (git scope note + architecture lines).
10. [x] `npm run build`, `npm test`, `npm run lint`, `cargo test`, `npm run lint:rust`
    all green.

**Acceptance criteria**

- [x] In a repo with remote-only branches, opening the new-agent branch step shows a
  "Remote branches" section listing `<remote>/<name>` rows (excluding `origin/HEAD`),
  with same-named local branches deduped out; the section is absent when there are no
  remote branches. _(Backend listing + dedup + HEAD-exclusion covered by Rust tests;
  the render is gated on `remoteList`.)_
- [x] Opening the branch step runs `git fetch --prune` (best-effort) and the remote
  list reflects freshly-fetched branches; an offline/auth-failing repo still opens the
  modal and shows cached remote refs (no hang, no blocking error). _(Fetch is
  fire-and-forget with `.catch` swallow; `GIT_TERMINAL_PROMPT=0` prevents hangs.)_
- [x] Selecting a remote branch + **Enter** creates a local tracking branch
  `<name>` (upstream set to the remote), checks it out in the folder, and starts the
  agent on it (with the destructive-confirm gate when another agent runs there).
  _(Reuses `createBranchSession`; warning banner extended for the remote case.)_
- [x] Selecting a remote branch + **⌘⏎** starts the agent on `<name>` in an isolated
  worktree tracking the remote. _(Reuses `createBranchWorktreeSession`.)_
- [x] Rust tests cover the remote listing, `origin/HEAD` exclusion, dedup, and
  remote-ref base acceptance; `cargo test` (75) + `cargo clippy` green.
- [x] Frontend type-checks, lints, and unit tests (248) pass; local-branch behavior is
  unchanged.
- [~] Manual GUI verification of the live picker (showing/selecting a remote row,
  pull-&-start, worktree) was **not** runtime-tested in the autonomous loop (no GUI);
  the logic is covered by the backend tests + type-check, and the render reuses the
  existing branch-row machinery.

**Notes**

- User answers (2026-06-26): remote source = **auto-fetch on open** (`git fetch
  --prune`, best-effort); selection mirrors **both Enter and ⌘⏎**; display = **separate
  "Remote branches" header with dedup vs local**.
- Architectural decision (mine): implement the "pull" by **reusing the #124
  create-branch path** (local branch named after the remote, based on the remote ref)
  rather than a new checkout command — `git checkout -b <name> <remote-ref>` /
  `git worktree add -b <name> <dest> <remote-ref>` both create the branch and set
  upstream tracking by default. The only backend change for the pull is widening
  `validate_new_branch`'s base check to accept remote-tracking refs. Fallback if reuse
  is insufficient: a dedicated `checkout_remote_branch` command (out of scope unless
  needed).
- `fetch_remotes` sets `GIT_TERMINAL_PROMPT=0` to avoid hanging on credential prompts
  for private remotes in a GUI-launched process; optionally `GIT_SSH_COMMAND="ssh
  -oBatchMode=yes"` for SSH remotes. A fetch failure is swallowed (cached refs shown).
- Grounding (file:line): backend `list_branches` `git.rs:201`; `validate_new_branch`
  `git.rs:285`; `create_branch` `git.rs:308`; `worktree_add_new_branch` `git.rs:334`;
  `BranchList` `git.rs:85` / `types/index.ts:56`; store actions `createBranchSession`
  / `createBranchWorktreeSession` `store.ts:2598`/`2624`; modal branch-step render
  `NewSessionModal.tsx:790–989`, key handlers `~618` (`onBranchKeyDown`) and `~594`
  (`onBranchQueryKeyDown`); ipc `listBranches`/`createBranch`/`spawnWorktreeAgentNewBranch`
  `ipc.ts:227/237/242`; git test harness `git.rs:712–744`. Confirmed greenfield for
  remotes (no existing `remote`/`origin`/`fetch`/`--track` code).
- Sibling: refined alongside #179 (file-tree dot-folders); independent of it. This was
  the last Refine card at authoring time.
- Implementation decision (autonomous): per the plan's "No change to the schedule
  step", **remote branches are shown only in new-session (immediate) mode** — in
  schedule mode the remote section is hidden, the auto-fetch is skipped, and remote
  rows are never selectable (`sortedRemotes` is `[]`). Selecting a remote is an
  immediate pull-&-start; scheduling a remote pull at fire time would require new
  schedule-firing semantics, which is out of scope here.
- Implementation note: `BranchList.remote` is **optional** (`remote?: string[]`) in
  TS so the `{ all: [], current: "" }` non-git fallbacks and existing test mocks stay
  valid; the Rust struct always serializes it, and the modal reads `branches?.remote
  ?? []`. Remote rows + the local list live in one listbox; nav traverses a combined
  `rows` array (locals then remotes) → "+ add branch", with a discriminated
  `selectedRemote` highlight mutually exclusive with `selectedBranch`/`addBranchActive`.
