# Task 199

### 199. [x] Worktree auto-delete guard: count ALL item types, and run on every item close

**Status:** Done
**Depends on:** none
**Created:** 2026-06-26

**Description**

A worktree (#74) is app-managed and should be removed **the moment its last item is
closed**, but **never while any item still references it**. The current ref-counted cleanup
**only counts agents**: `cleanupWorktreeIfEmpty(parent, dest)` (`src/store.ts` ~2734) does

```ts
const stillActive = get().sessions.some(
  (s) => s.repoPath === dest && s.exitedCode === undefined,
);
if (stillActive) return;
await ipc.removeWorktree(parent, dest, false); // non-forced; dirty kept
```

**This is the confirmed gap** (the card asked to verify it): the guard ignores a worktree's
**non-agent items** — `overviewPanels[dest]` (file / diff / terminal / kanban / filetree
viewers keyed to the worktree folder, #164) and **scheduled sessions** targeting the
worktree (#198). So a worktree with a file viewer (or a pending schedule) but no live agent
can be deleted out from under those items when the last agent goes; and closing a non-agent
item never triggers cleanup at all (only agent removal does). Fix both halves.

**Goal & why.** Make the worktree lifecycle match the user's mental model: a worktree lives
exactly as long as **any** item (agent, scheduled session, or panel) for it is shown, and is
auto-deleted the instant the **last** one closes — regardless of which item type it was.

**Design.**
- **Broaden the "still in use" check** in `cleanupWorktreeIfEmpty(parent, dest)` to count
  every item type keyed to `dest`:
  - any **session** with `repoPath === dest` (an exited-but-still-shown agent still occupies
    the worktree — keep the worktree while its Restart overlay is visible; only a
    forgotten/removed agent stops counting). _(Decide exited handling: a non-clean exited
    agent still has a sidebar row + Restart, so it should count; a clean-exit agent is
    already forgotten. See Notes.)_
  - any **`overviewPanels[dest]`** entry (file/diff/terminal/kanban/filetree).
  - any **schedule** whose target folder is `dest`.
  Only when **none** remain does it `removeWorktree` (non-forced — a dirty worktree is still
  kept, #74).
- **Run the guard on every item-close path**, not just agent removal: `removeSession` already
  calls it (~2969); also call it after **`removeOverviewPanel`** (when the removed panel's
  `repoPath` is a worktree dest) and after **`cancelSchedule`** (when the schedule targeted a
  worktree). Derive the `parent` from a session's `worktreeParent` or the worktree path
  mapping (`wtParent`, store.ts ~281) so a panel/schedule close can resolve its parent repo.
- **Unit-test the pure predicate.** Extract the "is this worktree still referenced?" decision
  into a pure helper `worktreeHasItems(state, dest)` and test it across agent-only,
  panel-only, schedule-only, mixed, and empty cases.

**Scope.** The guard's coverage + its trigger points + a tested pure predicate. The actual
`git worktree remove` call is unchanged here (non-blocking removal is **#200**).

**Out of scope.**
- Making the removal non-blocking/background — **#200**.
- The schedule-into-worktree feature itself — **#198** (it *uses* this guard on cancel).
- Force-deleting dirty worktrees (still kept, #74).

**Concrete files/symbols.**
- `src/store.ts` — `cleanupWorktreeIfEmpty` (~2734): broaden the check (sessions +
  `overviewPanels[dest]` + `schedules` for `dest`); a pure `worktreeHasItems(...)` helper;
  call the guard from `removeOverviewPanel` + `cancelSchedule` (resolving `parent` via
  `worktreeParent` / the worktree→parent map ~281). `removeSession` already calls it (~2969).
- `src/store.test.ts` — tests for `worktreeHasItems` across all item-type combinations.
- (Schedule "target folder" field: confirm how a schedule records its folder so a worktree
  schedule can be matched to `dest` — align with #198.)

**Subtasks**

1. [x] Pure, exported `worktreeHasItems(state, dest)` — true if any session
   (`repoPath === dest`, incl. an exited-but-shown agent), overview panel
   (`overviewPanels[dest]` non-empty), or schedule (`cwd === dest`) references it.
2. [x] Rewrote `cleanupWorktreeIfEmpty` to use it (replacing the agent-only
   `exitedCode === undefined` check); non-forced removal kept (dirty → toast + kept).
3. [x] Trigger the guard from `removeOverviewPanel` + `cancelSchedule` (in addition to the
   existing `removeSession`), with the worktree's parent resolved by `worktreeParentOf` (a
   live session of the worktree, else a recorded `worktreeParents` module map — see Notes,
   needed because the panel may outlive the last agent and `git worktree remove` requires the
   parent).
4. [x] Unit tests for `worktreeHasItems` (6 cases: empty / agent / panel-non-empty &
   panel-empty / schedule / other-folder / mixed → only true emptiness is removable).
5. [x] **Verify** — `npm run build`, `npm run lint`, `npm test` (288, +6) green; **no Rust
   changes**. The live two-close-orders flow is **runtime-unverified** in this loop (no GUI) —
   see Notes; the predicate + the agent-first parent resolution are covered by code review +
   unit tests.

**Acceptance criteria**

- [x] A worktree is **not** removed while **any** agent, scheduled session, or panel for it
      remains; it **is** removed the moment the **last** such item (any type) closes
      (`worktreeHasItems` + the guard on every close path; the parent stays resolvable after
      the last agent via `worktreeParents`).
- [x] Closing a **non-agent** item (panel) or **cancelling a schedule** can trigger the
      removal — `removeOverviewPanel`/`cancelSchedule` now call the guard, not only
      `removeSession`.
- [x] `worktreeHasItems` is pure + unit-tested across all item-type combinations.
- [x] A dirty worktree is still kept (non-forced `removeWorktree`; the catch keeps + warns);
      `npm run build`/`lint`/`test` pass; no Rust changes.

**Notes**

- **Autonomous refine (2026-06-26):** the card asked to confirm the existing guard covers all
  item types — it **does not** (agents only, `store.ts` ~2737), so this is authored as a
  **fix** (not removed). Decisions logged in `ASSUMPTIONS.md`.
  - **Count exited-but-shown agents** (a non-clean exit keeps a sidebar row + Restart → the
    worktree is still "in use"); clean-exit agents are already forgotten so they drop out
    naturally. (If runtime testing shows a stuck worktree from a crashed agent, revisit.)
  - **Trigger on every close path** (agent, panel, schedule), not just agent removal.
  - **Pure `worktreeHasItems` predicate** for testability.
- **Depends on: none** — foundational. **#198** (schedule→worktree cancel cleanup) and **#200**
  (non-blocking removal) build on it.
- **References:** `store.ts cleanupWorktreeIfEmpty` (~2734), `removeSession` worktree cleanup
  (~2969), worktree→parent map (~281), `removeOverviewPanel`/`cancelSchedule`,
  `overviewPanels`; `commands.rs remove_worktree` (~214). CLAUDE.md worktree scope (#74).

**Implementation notes (2026-06-26 — done)**

- All changes in `src/store.ts` + `src/store.test.ts`. **No Rust.** `git worktree remove`
  takes the parent (`remove_worktree(parent, dest, force)`), so the parent must stay
  resolvable even after the worktree's last agent leaves.
- **The parent-resolution gap (key design call):** the plan said resolve the parent from a
  session's `worktreeParent` / the `wtParent` map — both **session-derived**. But the plan's
  own scenario (close the agent *first*, then the panel) leaves **no session** in the
  worktree when the panel closes, so a session-only lookup can't resolve the parent and the
  worktree would never auto-remove. Fixed with a module-level `worktreeParents` map (mirrors
  `intentionalKills`): `cleanupWorktreeIfEmpty` records `dest → parent` every time it runs
  (i.e. at each agent removal — so the mapping is captured *before* the worktree becomes
  panel-only) and deletes it on a successful removal. `worktreeParentOf(state, dest)` =
  live-session lookup ?? the recorded map. In-memory (rebuilt from the session lifecycle each
  run); not persisted, since the plan forbids Rust changes.
- **Counts exited-but-shown agents:** `worktreeHasItems` checks `repoPath === dest` (any
  session), not just `exitedCode === undefined` — so a crashed agent's Restart overlay keeps
  the worktree (the plan's stated intent; the old guard could delete a worktree out from
  under a crashed agent's still-visible row).
- **Trigger points:** `removeSession` (existing), `removeOverviewPanel`, and `cancelSchedule`
  now all call the guard. `removeOverviewPanel`/`cancelSchedule` no-op for a regular repo
  folder (`worktreeParentOf` → undefined). Bulk paths (`killAgentsInRepo`/`closeAllItems`)
  already call the guard and are unaffected (they don't route single panel closes through
  `removeOverviewPanel`).
- **Two known, documented limitations (both fail *safe* = worktree kept, never wrong-deleted):**
  (1) a **clean-exit** of a worktree agent (`forgetExitedSession`) still doesn't trigger
  cleanup — that path was outside the plan's enumerated triggers and is pre-existing; left it
  to keep scope tight (the plan's scenario uses a manual *Remove*, which goes through
  `removeSession` → the guard). (2) An **orphan** worktree (a panel but no agent) that
  survives an app **restart** can't auto-resolve its parent (the in-memory `worktreeParents`
  is empty and there's no session) — it lingers until manually cleaned; persisting the map
  would need Rust (out of scope).
- **Runtime-unverified (autonomous loop, no GUI):** the live close-order flows. The pure
  predicate is unit-tested across all item-type combinations, and the agent-first parent
  resolution is traced in code review; recommend a `npm run tauri dev` pass (worktree + agent
  + file panel; Remove the agent → kept; close the panel → removed).
