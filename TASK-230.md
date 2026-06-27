### 230. [ ] Add a "Commits" source to the diff viewer (list commits → show a commit's diff)

**Status:** Not started
**Depends on:** none
**Created:** 2026-06-28

**Description**

Add a **"Commits"** option to the diff viewer alongside the existing **Working** (working
tree vs HEAD) and **Compare** (two-branch, #81) sources. In Commits mode the viewer
**lists previous commits**; **clicking a commit shows what changed in that commit** in the
same diff body.

**Grounding:**

- `src/components/DiffInspector/DiffInspector.tsx`:
  - `type DiffMode = "unified" | "split"` (render mode, line 19); `type DiffSource =
    "working" | "compare"` (the source toggle, #81, line 21).
  - State: `source`/`base`/`target` seeded from the repo's persisted diff panel
    (`diffPanel()?.diff_source/compare_base/compare_target`, lines 128-137) and persisted
    via `setDiffCompare(repoPath, { diff_source, compare_base, compare_target })`
    (lines 165-172).
  - The diff body renders a `WorkingDiff` (`{ files: FileDiff[] }`) via `DiffFile` →
    `UnifiedRow`/`SplitRow`. It already handles a file list + selected file
    (`selectedFile`, `:254`, `:377-386`).
  - It fetches via `workingDiff(repoPath)` / `compareBranches(repoPath, base, target)`
    (`src/ipc.ts:298`,`:302`).
- Backend `src-tauri/src/git.rs`: `working_diff` (line 144), `compare_branches` (line 210,
  `git diff base target` → `parse_unified_diff`), `list_branches`, and the shared pure
  **`parse_unified_diff(diff) -> Vec<FileDiff>`** (line 534). Git calls go through the
  cross-platform `run_git`/hidden-command helper. Commands are registered in
  `src-tauri/src/commands.rs` and wrapped in `src/ipc.ts`.
- No commit-listing or single-commit-diff command exists yet.

**Decided approach (autonomous — see Notes/ASSUMPTIONS.md):**

**Backend (new git-read commands — no writes, consistent with the read-mostly git rule):**

1. **`list_commits(cwd, limit)`** in `git.rs` (+ `commands.rs` + `ipc.ts`): run `git log`
   on the folder's current HEAD with a NUL-delimited format and a bounded count, e.g.
   `git log -n <limit> --pretty=format:%H%x00%h%x00%an%x00%ad%x00%s --date=short`, parsed
   into `Vec<CommitInfo>` where `CommitInfo { sha, short_sha, author, date, subject }`
   (new serde type mirrored in `src/types`). Cap `limit` (e.g. 100) and **surface the cap**
   (a "showing the latest N" note) so the payload stays bounded on large histories. Empty
   / non-git / no-commits → empty list, no error (like `working_diff`).
2. **`commit_diff(cwd, sha)`**: run `git show --no-color --format= <sha>` (just the patch),
   parsed by the existing **`parse_unified_diff`** into the same `WorkingDiff`/`FileDiff`
   shape the body already renders. This handles the **root commit** (no parent → full
   initial diff) and normal commits. For a **merge commit** (`git show` emits no diff by
   default), accept the empty/first-parent behavior for v1 (note it). Validate `sha`
   (pass it as a single arg to `run_git`; reject empty).

**Frontend (DiffInspector):**

3. **Add `"commits"` to `DiffSource`** and a **"Commits"** entry to the source toggle
   (Working / Compare / Commits).
4. **Commits mode UI:** fetch `list_commits(repoPath)` and render a **commit list/picker**
   (short sha + subject + author · date). Selecting a commit fetches `commit_diff(repoPath,
   sha)` and renders it in the existing diff body (reusing `DiffFile`/file-list/`mode`
   toggle). Show a loading/empty/error state consistent with the existing modes.
5. **Persist** the commits source + selected sha on the repo's diff panel (extend the
   `setDiffCompare`/diff-panel persistence with `diff_source: "commits"` + a `commit_sha`),
   so a configured commits view survives view switches / restart — mirroring how
   compare base/target persist. (If extending the persisted shape is undesirable, an
   ephemeral selection is an acceptable fallback — note it.)
6. The **Unified/Split** render toggle and the **file list** work unchanged in commits mode
   (the commit's diff is just another `WorkingDiff`).

**Out of scope:**

- The broader **diff-viewer UI redesign** (a separate, later card) — this task just adds
  the Commits **source + data**; the redesign will restyle it and is expected to **depend
  on this task** to keep "commits" available.
- Pagination / "load more" beyond the bounded list (note the cap; a later enhancement can
  paginate).
- Per-commit **syntax highlighting** comes for free once #229 lands (commit diffs render
  through the same rows); not required here.
- Any git **writes** (checkout to a commit, etc.) — read-only: list + show.
- Combined/merge-commit multi-parent diffs beyond git's default `show` behavior.

**Cross-platform (hard requirement):** all git access goes through the existing
cross-platform `run_git`/hidden-command helper (the `CREATE_NO_WINDOW` console-flash guard
on Windows); no OS-specific code; the parser and UI are platform-neutral. Verify on macOS
and Windows.

**Subtasks**

1. [ ] `git.rs`: add `list_commits(cwd, limit)` (`CommitInfo` type, NUL-delimited
   `git log`, bounded) and `commit_diff(cwd, sha)` (`git show … --format=` →
   `parse_unified_diff`); unit-test both against a temp repo (commits + a root commit).
2. [ ] `commands.rs` + `lib.rs`: register the two commands; `src/ipc.ts` + `src/types`:
   typed wrappers + `CommitInfo`.
3. [ ] `DiffInspector.tsx`: add the `"commits"` `DiffSource`, the toggle entry, the commit
   list/picker, and selected-commit diff rendering reusing the existing body.
4. [ ] Persist `diff_source: "commits"` + `commit_sha` on the diff panel (or ephemeral
   per the fallback); seed state from it on mount.
5. [ ] `npm run build`, `npm run lint`, `npm test`, `npm run lint:rust`,
   `cargo test --manifest-path src-tauri/Cargo.toml` pass.

**Acceptance criteria**

- [ ] The diff viewer has a **Commits** source toggle (next to Working / Compare). In
      Commits mode it lists recent commits (short sha + subject + author · date), bounded
      with the cap surfaced.
- [ ] **Clicking a commit** shows that commit's changes in the diff body (correct for a
      normal commit and the **root** commit), with the Unified/Split toggle and file list
      working as in the other modes.
- [ ] Empty / non-git / no-commits folders degrade gracefully (empty list, no error wall);
      the selection persists across view switches (or is ephemeral per the documented
      fallback).
- [ ] Read-only (no git writes); all git calls use the cross-platform helper; works on
      macOS and Windows.
- [ ] `npm run build`, `npm run lint`, `npm test`, `npm run lint:rust`, `cargo test` pass.

**Notes**

- **Autonomous decisions (user not answering; logged in `ASSUMPTIONS.md`):**
  - *Commits = a third `DiffSource`* (Working/Compare/Commits), reusing the existing diff
    body + `parse_unified_diff`; two new **read-only** git commands (`list_commits`,
    `commit_diff` via `git show`).
  - *Bounded list (~100) with the cap surfaced*; pagination deferred.
  - *Commit diff via `git show --format=`* (handles root + normal; merge commits accept
    git's default).
  - *Persist the source + selected sha* on the diff panel (ephemeral fallback allowed).
  - *Adds git **reads** only* — consistent with the read-mostly git rule (#27/#81).
- **Depends on: none** — new read-only feature on the shipped DiffInspector. The later
  **diff-viewer redesign** card depends on **this** (it must keep "commits" available); per
  #229, syntax highlighting will apply to commit diffs automatically once both land.
- References: `DiffInspector.tsx:19-21` (modes), `:128-172` (source state + persistence),
  `:254`/`:377-386` (file list), `git.rs:144` (`working_diff`), `:210` (`compare_branches`),
  `:534` (`parse_unified_diff`), `ipc.ts:298-307` (diff IPC), `commands.rs` (registration).
