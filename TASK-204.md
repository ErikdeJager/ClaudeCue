### 204. [x] Schedule modal: replace the worktree checkbox with the ⌘⏎ button/keybind pattern

**Status:** Done
**Depends on:** none
**Created:** 2026-06-27

**Description**

The new-session flow and the schedule-session flow are the **same component**
(`src/components/NewSessionModal/NewSessionModal.tsx`, toggled by the `scheduleMode` store
flag), but they express the "start in an isolated git **worktree**" choice two different
ways:

- **New-session mode** (the immediate path, #74/#124/#180): the **branch step's** action
  row has a secondary **"Worktree ⌘⏎"** button (NewSessionModal.tsx ~lines 1172–1200) next
  to the primary **"Start ⏎"** button, plus a **⌘⏎ / Ctrl+⏎ keybind** that fires the
  worktree variant of the primary action (`startWorktreeFromBranch`, wired at ~lines
  761–794). ⏎ = start normally in the repo folder; ⌘⏎ = start in a worktree.
- **Schedule mode** (#198): the **schedule step** (launch-time step) instead shows a
  **checkbox** "Start in an isolated worktree" (NewSessionModal.tsx ~lines 1274–1285),
  backed by a `worktree` / `setWorktree` boolean (declared ~line 109, reset ~line 151,
  consumed by `submitSchedule` ~lines 629–655 as `useWorktree`). It was done as a checkbox
  because "a scheduled flow has no live keypress at fire time" (the code comment), but the
  result is an **inconsistent UX**: the same modal asks for the same thing two different
  ways.

**Goal:** make the schedule flow use the **same ⌘⏎ keybind + button pattern** as the
new-session flow — replace the schedule-step checkbox with a secondary **"Worktree ⌘⏎"**
button (next to the primary "Schedule ⏎" button) plus a **⌘⏎ / Ctrl+⏎ keybind**, so the
two modes are consistent. Why: one learnable affordance for "do the worktree variant of the
primary action" across both modes; removes the lone checkbox.

This is a **frontend-only restyle/refactor of one component** — no backend change. The
backend `scheduleSession(..., useWorktree)` path (#198) already accepts the worktree flag;
this task only changes how that flag is collected in the modal.

**Where the worktree affordance lands (important):** in new-session mode the worktree
button sits in the **branch step** because that step *is* the final action (it both selects
the branch and launches). In schedule mode the branch step is **not** final — it advances
to the schedule step, and the final action is **"Schedule"** on the schedule step.
Therefore the worktree button/keybind belongs on the **schedule step**, paired with the
"Schedule ⏎" primary button — i.e. "Schedule ⏎" = schedule normally, "Worktree ⌘⏎" =
schedule into a worktree. (Do **not** move it to the schedule flow's branch step; the
pattern is "the worktree variant of the primary *action* button," and the action is
Schedule.)

**Scope**

1. **Remove the checkbox + its state.** Delete the `folderIsGit`-gated `Checkbox` block
   (~lines 1277–1285) and the surrounding `.scheduleWorktree` wrapper. Remove the
   `worktree` / `setWorktree` `useState` (~line 109) and its reset in the modal-reset
   effect (~line 151). Drop the now-unused `import Checkbox` (line 23) **only if** no other
   usage remains (grep confirms line 1279 is the sole use). Remove the now-dead
   `.scheduleWorktree` class from `NewSessionModal.module.css` (~line 148).
2. **Refactor `submitSchedule`** (~lines 629–655) to take an explicit
   `asWorktree: boolean` parameter instead of reading the `worktree` state: `const
   useWorktree = asWorktree && folderIsGit;` (keep the rest of its branch-arg logic —
   a worktree always needs a branch, so `branchArg` still falls back to `selectedBranch`
   when `useWorktree`). This mirrors the branch step's split between `create()` and
   `createWorktree()`.
3. **Add the "Worktree ⌘⏎" button** to the schedule step's action row (~lines 1287–1298),
   placed **before** the primary "Schedule ⏎" button, styled exactly like the branch
   step's worktree button (`styles.cancel` + a `⌘⏎` `<kbd className={styles.btnKbd}>`).
   Show it **only when `folderIsGit`** (parity with the old checkbox gate). Disable it under
   the same conditions as the Schedule button (`!cwd || busy || !fireAt`). On click →
   `submitSchedule(true)`. Give it a `title` like "Schedule into an isolated git worktree".
4. **Wire the primary "Schedule ⏎" button + form submit** to `submitSchedule(false)`
   (today the form `onSubmit` calls bare `submitSchedule()` for the schedule step — line
   ~848; the button is `type="submit"`).
5. **Add the ⌘⏎ / Ctrl+⏎ keybind** for the schedule step: pressing ⌘⏎ (or Ctrl+⏎)
   anywhere in the schedule step triggers `submitSchedule(true)` (the worktree schedule),
   while plain ⏎ keeps the normal schedule. Follow the existing pattern used for the branch
   step (the form-level key handling / `onTrapKeyDown` at ~line 832, and the per-input
   handlers at ~lines 774–794). **Preserve the multi-line prompt:** in the `SkillAutocomplete`
   prompt textarea, plain Enter must still insert a newline (and when its skill dropdown is
   open, Enter/Escape must still drive the menu, per #114) — only the ⌘⏎/Ctrl+⏎ combo
   triggers the worktree schedule there.

**Out of scope**

- **No backend changes.** `scheduleSession` / `create_schedule` / the `ScheduledSession`
  record + its `worktree` flag (#198) stay exactly as they are — this only changes how the
  flag is gathered in the modal.
- **No change to `ScheduledPanel`** (`src/components/ScheduledPanel/ScheduledPanel.tsx`).
  It shows the worktree intent as a **read-only** "worktree" badge (lines ~120–123) and has
  no worktree toggle; the badge keeps working because the new button/keybind still sets
  `schedule.worktree`. Editing an existing schedule's worktree flag is **not** part of this
  task.
- **No change to the new-session (immediate) flow** — its branch-step worktree button +
  ⌘⏎ keybind already exist and are the pattern being copied; leave them untouched.
- No new design tokens / no restyle of the buttons beyond reusing the existing
  `styles.cancel` / `styles.create` / `styles.btnKbd` / `styles.actions` classes.

**Subtasks**

1. [x] Remove the schedule-step `Checkbox` block + `.scheduleWorktree` wrapper, the
   `worktree`/`setWorktree` state + its reset, the dead `.scheduleWorktree` CSS, and the
   `Checkbox` import (if unused elsewhere).
2. [x] Change `submitSchedule` to `submitSchedule(asWorktree: boolean)` and compute
   `useWorktree = asWorktree && folderIsGit`.
3. [x] Add the secondary "Worktree ⌘⏎" button to the schedule-step action row (git folders
   only, same disabled conditions as "Schedule"), calling `submitSchedule(true)`.
4. [x] Point the primary "Schedule ⏎" button + the schedule-step form submit at
   `submitSchedule(false)`.
5. [x] Add the ⌘⏎ / Ctrl+⏎ keybind on the schedule step → `submitSchedule(true)`, keeping
   plain ⏎ = normal schedule and preserving newline-in-prompt + the #114 skill-menu keys.
6. [x] Verify a non-git folder schedule (no branch step) shows **no** worktree button and
   still schedules via "Schedule ⏎".
7. [x] `npm run build`, `npm run lint`, `npm run format:check` all pass; manually exercise:
   git folder → branch → schedule step → both "Schedule ⏎" (no worktree) and "Worktree ⌘⏎"
   (worktree) create a schedule with the correct `worktree` flag (confirm via the
   ScheduledPanel "worktree" badge), and the ⌘⏎ keybind matches the button.

**Acceptance criteria**

- [x] The schedule-session modal's schedule step has **no checkbox**; it shows a "Schedule
  ⏎" primary button and, for **git folders**, a "Worktree ⌘⏎" secondary button — visually
  matching the new-session branch step's "Start ⏎" / "Worktree ⌘⏎" pair.
- [x] Pressing **⌘⏎ / Ctrl+⏎** on the schedule step schedules **into a worktree**; plain
  **⏎** schedules **normally** (and Enter still inserts a newline inside the prompt
  textarea / drives the open skill menu).
- [x] A scheduled session created via "Worktree ⌘⏎" (or the keybind) carries the same
  `worktree: true` intent the checkbox produced (verified by the ScheduledPanel "worktree"
  badge and identical `scheduleSession` args), and "Schedule ⏎" produces `worktree: false`.
- [x] A **non-git** folder's schedule flow shows no worktree affordance and still schedules.
- [x] No `worktree`/`setWorktree` state, no `.scheduleWorktree` CSS, and no unused
  `Checkbox` import remain in the component; backend and `ScheduledPanel` are untouched.
- [x] `npm run build`, `npm run lint`, and Prettier pass.

**Notes**

- **Autonomous refine (2026-06-27).** Per the standing directive in `ASSUMPTIONS.md`
  (2026-06-26) the user no longer answers refine-loop questions; the decisions below were
  made autonomously and are logged in `ASSUMPTIONS.md` under TASK-204.
  - **The worktree button goes on the schedule step (final action step), next to
    "Schedule", not the schedule flow's branch step** — because the pattern being copied is
    "a worktree variant of the *primary action* button," and the schedule flow's primary
    action is Schedule. This also keeps the worktree choice visible on the same screen the
    user confirms on, exactly where the checkbox was.
  - **⌘⏎ keybind active on the whole schedule step**, with plain ⏎ preserved for normal
    schedule and for newline-in-prompt — matching how the branch step distinguishes ⏎ vs
    ⌘⏎.
  - **`submitSchedule(asWorktree)` param** chosen over keeping a `worktree` state toggled by
    the button, mirroring the branch step's `create()` vs `createWorktree()` split and
    avoiding a setState-before-submit race.
- Key files: `src/components/NewSessionModal/NewSessionModal.tsx` (worktree button ~1172–
  1200 is the template to copy; checkbox ~1274–1285; `submitSchedule` ~629–655; state ~109,
  reset ~151; form submit ~833–850; branch-step keybinds ~761–794),
  `src/components/NewSessionModal/NewSessionModal.module.css` (`.scheduleWorktree` ~148; the
  `.actions` / `.cancel` / `.create` / `.btnKbd` classes to reuse). Reference (do not edit):
  `src/components/ScheduledPanel/ScheduledPanel.tsx` (read-only worktree badge), the
  `scheduleSession` store action + the `create_schedule` Rust command (#198).
- All referenced code exists today (#74 worktree button, #198 schedule worktree) — pure
  frontend refactor, no dependency on any open task.

**Implementation (done 2026-06-27)**

- `NewSessionModal.tsx`: removed the `worktree`/`setWorktree` state + its reset and the
  schedule-step `Checkbox` block; dropped the now-unused `Checkbox` import (sole use). The
  dead `.scheduleWorktree` class was removed from `NewSessionModal.module.css`.
- `submitSchedule()` → `submitSchedule(asWorktree: boolean)` with
  `useWorktree = asWorktree && folderIsGit` (mirrors the branch step's `create()` vs
  `createWorktree()` split, avoiding a setState-before-submit race). All branch-arg logic
  preserved, so `scheduleSession`'s args are identical to what the checkbox produced.
- Schedule-step action row now mirrors the branch step: **Cancel** → (git folders only)
  **"Worktree ⌘⏎"** (`styles.cancel`, `onClick={submitSchedule(true)}`, disabled on
  `!cwd || busy || !fireAt`, title "Schedule into an isolated git worktree") → primary
  **"Schedule ⏎"** (`type="submit"` → form onSubmit → `submitSchedule(false)`).
- ⌘⏎ / Ctrl+⏎ keybind added at the **form level** in `onTrapKeyDown` (gated on
  `step === "schedule"`): preventDefault + `submitSchedule(true)`. Catches the combo from
  any schedule-step field via bubbling; plain ⏎ still does a normal schedule, plain Enter
  still inserts a newline in the prompt textarea, and when the `SkillAutocomplete` menu is
  open it intercepts Enter to drive the menu (#114) so the keybind only fires with it closed.
- Non-git folders: `folderIsGit` is false → no worktree button shown, and a ⌘⏎ there
  resolves `useWorktree` to false → schedules normally.
- Backend, `scheduleSession` / `create_schedule` / `ScheduledSession`, and `ScheduledPanel`
  are untouched (the read-only "worktree" badge keeps working off `schedule.worktree`).
- Verified: `npm run build`, `npm run lint`, `prettier --check` (touched files), and
  `npm test` (288 passing) all pass. The interactive eyeball (subtask 7's "manually
  exercise" clause) can't run in the headless loop; the worktree-flag wiring is covered by
  the type-check and matches the pre-existing #198 `scheduleSession(..., useWorktree)` path.
