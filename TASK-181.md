# TASK-181

### 181. [ ] "Pull" action in the repo + worktree context menus (ff-only)

**Status:** Not started
**Depends on:** none
**Created:** 2026-06-26

**Description**

There's no way to pull a folder's latest changes from inside ClaudeCue — the user
has to drop into a terminal and run `git pull`. Add a **"Pull"** item to the
**repo context menu** and the **worktree header context menu** in the sidebar that
fast-forwards the folder's currently-checked-out branch to its upstream and reports
the result as a toast.

You can only pull into the branch that is **checked out** in a given working tree, so
"pull a branch" here means: pull the **current branch** of that folder (for a repo
folder, its repo path; for a worktree, the worktree path) — i.e. `git -C <path> pull
--ff-only`.

**User decisions (refine Q&A, 2026-06-26):**
1. **Strategy = fast-forward only** (`git pull --ff-only`). Advances the branch when
   possible; if it has diverged from upstream, fails cleanly with a clear message —
   never a merge commit, never a half-finished merge/conflict state in a folder an
   agent may be using. The user resolves a diverged branch in the terminal.
2. **No confirm gate.** Run immediately and show the outcome as a toast (success
   summary or the git error). With `--ff-only`, git refuses to overwrite uncommitted
   changes, so a busy/dirty folder simply yields an error toast — nothing is lost.

**Grounding (current code):**
- Sidebar context menus live in `src/components/Sidebar/Sidebar.tsx`:
  - **Repo menu** (the `menuMode` default branch, ~`1700`–`1812`): New session /
    Views / **Reveal in Finder** / **Copy path** / Change color… / [Kill all / Close
    all / Forget folder]. Actions call store methods (e.g. `revealPath(menu.repo)`,
    `copyToClipboard`, `forgetRepo`).
  - **Worktree header menu** (`WorktreeHeader`, ~`932`–`985`): New session / Views /
    **Reveal in Finder** / **Copy absolute path** / Close worktree, scoped to the
    worktree's own `path`.
- Git writes shell out via `git -C <cwd> …` in `src-tauri/src/git.rs` (e.g.
  `checkout_branch` `git.rs:225`). #180 added `fetch_remotes` — a best-effort
  `git fetch --prune` with `GIT_TERMINAL_PROMPT=0` — which is the **model** for a new
  network git write's env guard + error handling.
- The store exposes a toast mechanism (`toasts` + a push helper, used by e.g. the
  "Agent exited" toast) and per-folder current branch in `branches` (`branches[path]`
  = current branch name, `""` for non-git/unknown).

**Scope**

Backend (`src-tauri/src`):
- New `git::pull_ff(cwd: impl AsRef<Path>) -> Result<String, String>`: runs
  `git -C <cwd> pull --ff-only` with `GIT_TERMINAL_PROMPT=0` in the child env (and
  optionally `GIT_SSH_COMMAND="ssh -oBatchMode=yes"`), mirroring `fetch_remotes`'
  pattern. On success returns git's **trimmed stdout** (e.g. `"Already up to date."`
  or `"Updating <range>\nFast-forward\n …"`) for the toast; on a non-zero exit returns
  the **trimmed stderr** (e.g. `"fatal: Not possible to fast-forward, aborting."`,
  `"There is no tracking information for the current branch."`, `"fatal: not a git
  repository"`). Never panics. (`--ff-only` itself fetches then fast-forwards, so no
  separate fetch is needed.)
- New Tauri command `pull_branch(cwd: String) -> Result<String, SessionError>`
  (`commands.rs`) wrapping `git::pull_ff`, mapping the error string to
  `SessionError::Git`; register it in `lib.rs`'s `invoke_handler`.
- `src/ipc.ts`: add `pull(cwd: string): Promise<string>` invoking `pull_branch`
  (resolves the summary, rejects with the error message).

Frontend (`src`):
- `store.ts`: add an action `pullFolder(cwd: string)` that calls `ipc.pull(cwd)` and:
  - on success → push a toast with a concise outcome (e.g. `"Already up to date"` when
    the summary says so, else `"Pulled <repoName>"` — the implementer may include the
    fast-forward summary's first line);
  - on failure → push an error toast (e.g. `"Pull failed: <message>"`).
  Reuse the existing toast helper. (Optional nicety, not required: a transient
  "Pulling…" toast while in flight.)
- `Sidebar.tsx`: add a **"Pull"** neutral menu item (using the existing `menuItem`
  style) to **both** menus, placed in the non-destructive utilities cluster (next to
  Reveal in Finder / Copy path):
  - Repo menu → `onClick` calls `void pullFolder(menu.repo); closeMenu();`
  - Worktree header menu → `onClick` calls `void pullFolder(path); close();`
  - **Visibility:** show the Pull item only when a current branch is known for that
    folder (`branches[path]` is non-empty) — pulling requires a checked-out branch;
    this hides it for non-git folders. (A detached HEAD may still show it and will
    surface git's "not on a branch" error as a toast — acceptable.)
  - Label "Pull"; `title` (tooltip) "git pull --ff-only".

Docs:
- Update CLAUDE.md's "Git is read-mostly, with a small set of deliberate writes"
  section to add **`git pull --ff-only`** (`pull_branch`) as a new deliberate git
  network write, invoked from the repo + worktree context menus. Update the sidebar
  context-menu architecture line(s) to mention the **Pull** item.

**Out of scope**

- **No merge or rebase pull** — only `--ff-only` (per the user). A diverged branch is
  reported, not merged.
- **No pull of a non-checked-out branch**, no branch selection — it always pulls the
  folder's current branch.
- **No push, no remote management, no auto-pull**, no periodic background pull.
- **No conflict-resolution UI** — `--ff-only` can't conflict; any failure is a toast.
- No confirm gate (per the user); no new busy/loading indicator beyond the optional
  transient toast.

**Subtasks**

1. [ ] `git.rs`: add `pull_ff(cwd) -> Result<String, String>` (`git pull --ff-only`,
   `GIT_TERMINAL_PROMPT=0`, trimmed stdout on success / stderr on failure), modeled on
   `fetch_remotes`.
2. [ ] `commands.rs` + `lib.rs`: add + register `pull_branch(cwd) -> Result<String,
   SessionError>`.
3. [ ] `ipc.ts`: add `pull(cwd)`.
4. [ ] `store.ts`: add `pullFolder(cwd)` (toast success summary / error).
5. [ ] `Sidebar.tsx`: add the "Pull" item to the repo menu and the worktree header
   menu, gated on a known current branch; wire to `pullFolder`.
6. [ ] Rust tests (`git.rs` tests module, `init_repo`/`git_in`/`commit_all`, skip if
   git unavailable):
   - **fast-forward success:** create an `origin` repo with a commit; `git clone` it
     into a second dir; add another commit in `origin`; `pull_ff(clone)` → `Ok`, the
     new file exists in the clone.
   - **diverged → error:** after cloning, commit locally in the clone *and* a different
     commit in `origin`; `pull_ff(clone)` → `Err` (not fast-forwardable).
   - **no upstream → error:** a fresh `init_repo` with a commit and no remote;
     `pull_ff(dir)` → `Err`.
7. [ ] Update CLAUDE.md (git scope note + sidebar context-menu line).
8. [ ] `npm run build`, `npm test`, `npm run lint`, `cargo test`, `npm run lint:rust`
   green.

**Acceptance criteria**

- [ ] Right-clicking a repo folder in the sidebar shows a "Pull" item; clicking it
  runs `git pull --ff-only` in that folder and shows a toast with the result
  ("Already up to date", a fast-forward summary, or the git error).
- [ ] Right-clicking a worktree header shows the same "Pull" item, scoped to the
  worktree's path, with the same behavior.
- [ ] A diverged or upstream-less branch produces a clear error toast and makes **no**
  changes (no merge commit, no partial merge state).
- [ ] The Pull item is hidden for a folder with no known current branch (non-git).
- [ ] Rust tests cover ff success, divergence error, and no-upstream error;
  `cargo test` + `cargo clippy` green; frontend type-checks, lints, unit tests pass.

**Notes**

- User answers (2026-06-26): **fast-forward only** (`git pull --ff-only`); **no
  confirm — just toast the result**.
- Independent of #180, but #180's `fetch_remotes` (`git fetch --prune`,
  `GIT_TERMINAL_PROMPT=0`) is the code model to follow for the new network git write's
  env guard + best-effort error handling. The `--ff-only` flag aligns with the app's
  "read-mostly, deliberate-and-safe writes" philosophy (CLAUDE.md).
- Grounding (file:line): repo menu items `Sidebar.tsx:1700–1812` (Reveal/Copy at
  ~1725–1746); worktree header menu `Sidebar.tsx:932–985` (Reveal/Copy at ~957–978);
  git write pattern `git.rs` `checkout_branch:225`; `fetch_remotes` (#180) as the
  network-write model; per-folder current branch in the store's `branches` map; the
  sidebar already imports `revealPath`/`copyToClipboard`-style store actions to model
  `pullFolder` on.
- This was the topmost Refine card after #180; the next Refine card (if any) is
  handled in a later run.
