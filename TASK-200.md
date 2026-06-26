# Task 200

### 200. [x] Worktree removal must not freeze the UI — run `git worktree remove` off the main thread

**Status:** Done
**Depends on:** #199
**Created:** 2026-06-26

**Description**

When the last item in a worktree is closed, the worktree is deleted via the Rust
`remove_worktree` command (`src-tauri/src/commands.rs` ~217) → `git::worktree_remove`
(`git worktree remove`, which removes the worktree directory from the filesystem). Today
this is a **synchronous** `#[tauri::command]`:

```rust
#[tauri::command]
pub fn remove_worktree(parent: String, dest: String, force: bool) -> Result<(), SessionError> {
    git::worktree_remove(&parent, &dest, force).map_err(SessionError::Git)
}
```

In Tauri v2 a **non-`async`** command runs on the **main (webview) thread**, so deleting a
worktree dir — potentially thousands of files (`node_modules`, build output, etc.) — **blocks
the UI**: the whole app freezes and is unresponsive until the FS delete finishes. The user
wants this to happen **in the background** so they can keep using the app.

**Goal & why.** Make worktree deletion non-blocking. Closing the last worktree item should
return immediately and the app stay responsive while the directory is removed in the
background.

**Design.**
- **Run the git removal off the main thread.** Convert `remove_worktree` to an **`async`**
  command and execute the blocking git/FS work via **`tauri::async_runtime::spawn_blocking`**
  (a dedicated blocking pool), awaiting its result — so the main thread is never blocked by
  the FS delete. (An `async` command already runs off the main thread on the async runtime;
  `spawn_blocking` keeps the synchronous `git` shell-out from starving that runtime.)
- **Frontend stays responsive / fire-and-forget.** `cleanupWorktreeIfEmpty` (`store.ts`
  ~2734, broadened by #199) currently `await`s `removeWorktree`. Keep the await for the
  dirty-worktree toast, but ensure the close action that triggers it (`removeSession` /
  `removeOverviewPanel` / `cancelSchedule`) **doesn't block on it** — i.e. let cleanup run
  asynchronously after the item is already removed from the UI (the panel/agent disappears
  instantly; the worktree dir deletes in the background; the "kept — dirty" toast still fires
  on the non-forced-failure path). Don't `await` the cleanup inside the synchronous part of a
  close handler.
- **Surface completion lightly** (optional): a quiet toast when a large worktree finishes
  removing, or nothing — the key requirement is no freeze.

**Scope.** Threading of `remove_worktree` (backend) + making the frontend cleanup
non-blocking. No change to *when* a worktree is removed (that's #199's guard) or to the
dirty-kept rule.

**Out of scope.**
- The all-item-types removal guard — **#199**.
- Scheduling into worktrees — **#198**.
- Force-deleting dirty worktrees (still kept).
- A progress UI for the deletion (a freeze fix, not a progress feature).

**Concrete files/symbols.**
- `src-tauri/src/commands.rs` — `remove_worktree` → `async` + `spawn_blocking` around
  `git::worktree_remove`.
- `src-tauri/src/git.rs` — `worktree_remove` (~488) unchanged (still the blocking shell-out;
  just invoked off-thread).
- `src/store.ts` — `cleanupWorktreeIfEmpty` (~2734) + its callers (`removeSession` ~2969,
  and the #199-added `removeOverviewPanel` / `cancelSchedule` calls): run cleanup
  fire-and-forget so the UI removal isn't gated on the FS delete.
- `src/ipc.ts` — `removeWorktree` wrapper unchanged (the command is still awaited where its
  result matters, just no longer blocking the main thread).

**Subtasks**

1. [x] `remove_worktree` is now an **`async`** command (`commands.rs` ~218) running
   `git::worktree_remove` via **`tauri::async_runtime::spawn_blocking`** and awaiting it; the
   `force`/dirty-tree error semantics and the typed `SessionError::Git` mapping are unchanged
   (the join error maps to `SessionError::Io`). This is the codebase's **first** async Tauri
   command. `git.rs worktree_remove` is untouched (still the blocking shell-out, now invoked
   off-thread).
2. [x] Frontend: the three per-item close handlers (`removeSession`, `removeOverviewPanel`,
   `cancelSchedule`) **already** remove the item from UI state first and fire cleanup with
   `void` (wired by #199), so they never block on the delete — no change needed there. For
   consistency I also converted the two **bulk** close paths (`killAgentsInRepo` ~1119, the
   close-all / forget-folder path ~1276) from `await` to **fire-and-forget `void`** so even a
   bulk "Forget folder" / "Kill all agents" over a huge worktree returns + toasts immediately.
   `cleanupWorktreeIfEmpty` keeps its inner `await ipc.removeWorktree` so the "kept — dirty"
   toast still fires (that await is now non-blocking because the backend is async).
3. [x] **Verify** — `npm run build` ✓, `npm run lint` ✓, `npm test` (288) ✓, `cargo build` ✓,
   `cargo clippy` ✓, `cargo fmt` ✓, `cargo test` (83) ✓, prettier ✓. The live "no freeze on a
   large delete" behavior is **runtime-unverified** in this autonomous loop (no GUI) — see
   Notes; the threading change is a standard Tauri pattern and the cleanup trigger logic
   (#199) is untouched.

**Acceptance criteria**

- [x] Removing a worktree (incl. a large directory) **does not freeze the UI** — the FS delete
      runs off the main (webview) thread, so the app stays responsive while it runs in the
      background. _(Runtime-unverified — see Notes.)_
- [x] `remove_worktree` runs its FS work **off the main thread** (`async` + `spawn_blocking`);
      the close actions remove the item + return without blocking on the delete.
- [x] The dirty-worktree-kept behavior + the removal trigger logic (#199) are unchanged
      (`cleanupWorktreeIfEmpty` ref-counting + non-forced-delete dirty guard intact;
      `git::worktree_remove` untouched).
- [x] `npm run build`, `npm run lint`, `npm test`, and `cargo build`/`clippy` pass.

**Notes**

- **Autonomous refine (2026-06-26):** decisions logged in `ASSUMPTIONS.md`.
  - **Root cause:** `remove_worktree` is a **sync** Tauri command → runs on the main thread →
    the FS delete freezes the webview. Fix = `async` + `spawn_blocking`.
  - **Frontend cleanup made fire-and-forget** so the UI removes the item instantly and the dir
    deletes in the background; the dirty-kept toast still fires on the non-forced failure.
- **Depends on: #199** — both touch the worktree-cleanup path (`cleanupWorktreeIfEmpty` + its
  callers); sequenced after the corrected guard so the async/fire-and-forget change builds on
  the right trigger logic rather than being reworked.
- **References:** `commands.rs remove_worktree` (~217, sync today), `git.rs worktree_remove`
  (~488), `store.ts cleanupWorktreeIfEmpty` (~2734) + callers, Tauri v2 `async_runtime::
  spawn_blocking`. CLAUDE.md "Backend (Rust)" + worktree scope (#74).

**Implementation notes (2026-06-26 — done)**

- **Root-cause fix is the backend.** `remove_worktree` was a synchronous `#[tauri::command]`,
  which in Tauri v2 runs on the **main (webview) thread** — so the `git worktree remove` FS
  delete (potentially a huge `node_modules`) froze the whole UI. Making it `async` moves the
  command onto the async runtime (off the main thread); `spawn_blocking` then runs the blocking
  `git` shell-out on a dedicated blocking pool so it can't starve the runtime's workers either.
  Net: the webview thread is never blocked, regardless of how the frontend invokes it.
- **Frontend was already non-blocking at the per-item level (#199).** The three named close
  handlers update store state (drop the agent / filter the panel / filter the schedule) and
  *then* call `cleanupWorktreeIfEmpty` via `void`, so the item vanishes instantly and cleanup
  is detached. The freeze was never the `void` — it was the synchronous backend command, which
  blocked the main thread even when JS didn't await its result. So the backend change is what
  actually fixes the freeze; the existing `void`s are correct as-is.
- **Bulk paths made consistent.** I converted the two remaining `await
  cleanupWorktreeIfEmpty(...)` loops in the **bulk** operations (`killAgentsInRepo`, the
  close-all/forget-folder path) to fire-and-forget `void`. State is already updated before each
  loop and nothing downstream depends on the FS delete completing, so this is safe and lets a
  bulk action over a large worktree return + show its summary toast immediately rather than
  waiting on the delete. (Out of the literal subtask-2 scope, but in the spirit of "stay
  responsive"; recorded here.)
- **Unchanged:** `cleanupWorktreeIfEmpty`'s non-forced `removeWorktree` (the dirty-worktree
  guard) + its `catch` → "kept — dirty" toast; `git::worktree_remove`; the #199 ref-counting /
  removal-trigger logic; the `ipc.removeWorktree` wrapper. Only the command's threading + the
  two bulk awaits changed.
- **Runtime-unverified (autonomous loop, no GUI):** the live "delete a large worktree without
  freezing" behavior. The change is a textbook Tauri `async` + `spawn_blocking` move and all
  automated gates pass; recommend a `npm run tauri dev` pass (close the last item of a worktree
  holding a big `node_modules` → app stays responsive; worktree disappears when the delete
  finishes; a dirty worktree still yields the "kept" toast).
