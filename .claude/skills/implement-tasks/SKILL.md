---
name: implement-tasks
description: >-
  The build lane of the kanban-dev-pima board: dispatch worktree-implementer subagents to turn
  unblocked IMPLEMENT cards into open PRs — up to a configured number in parallel — moving each
  card to MERGE as its PR opens. When nothing is left to build, park on a Monitor watching
  IMPLEMENT and ARCHIVE and resume automatically when a new card arrives or a dependency lands.
  Invoke once as /implement-tasks in its own terminal; it loops itself via a Monitor (never /loop).
allowed-tools: Read, Edit, Bash, Glob, Grep, Task, Monitor, TaskStop, TaskList
---

# implement-tasks — lane orchestrator

You are the **build** lane of a Kanban development board (`kanban-dev-pima`). You turn ready,
unblocked tasks into open PRs by **dispatching `worktree-implementer` subagents** — each builds
one task in its own isolated git worktree and opens one PR. This is the one **fan-out** lane: you
keep **up to `5`** implementers running at once and top the pool back up as
they finish. You **loop yourself**: when no unblocked card remains and the pool has drained, you
**arm a `Monitor`** on the IMPLEMENT and ARCHIVE columns and wait — a new card or a freshly-landed
dependency wakes you. You never stop the session.

**Stay on the current branch the entire time — never run `git checkout`/`switch`/`branch`.**
Each subagent creates and tears down its own worktree; the main checkout never moves.

**How you loop (read this first — it replaces `/loop`).** The *only* tools you use to wait and
resume are `Monitor` (to wait), `TaskStop` (to retire the one that fired), and `TaskList` (to
find its id). **Never invoke `/loop`, never call `ScheduleWakeup`, never create a cron/routine.**
Idle means *parked on a `Monitor`* — nothing else. (Waiting on your own running subagents to
finish is normal in-session waiting, not idleness — only arm the Monitor once the pool is empty.)

## Board protocol (shared by every lane)

The board lives at the repo root in `KANBAN.md`, with columns `## PLAN`, `## IMPLEMENT`,
`## MERGE`, `## ARCHIVE`. Cards use this shape:

```
- [ ] Task <N>: <title> — PLAN-<N>.md
  - deps: <comma-separated task numbers, or "none">
  - PR: <url, once opened>
```

An IMPLEMENT card is **unblocked** when **every** task in its `deps:` is in the `## ARCHIVE` column
**or** recorded in `TASK_ARCHIVE.md`. A blocked card waits — skip it until a dependency lands.
Note that a dep reaches `## ARCHIVE` only via the **merge** lane (MERGE→ARCHIVE), never from your
own work — finishing a build moves a card to MERGE, which does **not** satisfy any dependency.
That is why you also watch ARCHIVE while idle (below).

## Processing playbook — keep the build pool full

Because four lanes share `KANBAN.md`, **re-read it right before each edit** and touch only the
IMPLEMENT/MERGE regions of the card you're moving.

1. **Bring the default branch up to date** (without leaving the current branch):
   `git fetch origin`, then fast-forward the local default branch to its remote so each
   worktree branches from the latest code. Don't assume the branch is named `main` — detect
   it (`git symbolic-ref --short refs/remotes/origin/HEAD`).
2. **Fill the pool.** While **fewer than `5`** implementers are running
   **and** an unblocked card is waiting in `## IMPLEMENT`, dispatch one: spawn a
   **`worktree-implementer`** subagent and hand it that card's task — read `PLAN-<N>.md` and
   pass its goal, acceptance criteria, and approach as the task description (plus the task
   number and title). It creates its own worktree + branch, implements, runs the project's
   own checks, commits, pushes, opens a PR, and removes its worktree.
3. **As each subagent finishes**, record its PR url on the card's `PR:` line and move the
   card from `## IMPLEMENT` to `## MERGE`. **Don't wait for the others** — go back to step 2 and
   top the pool back up if any unblocked card remains. If a subagent failed to produce a PR,
   leave its card in `## IMPLEMENT` with a short note and move on.
4. **When no unblocked card is waiting**, just wait for the running subagents to finish, moving
   each card to `## MERGE` as it completes, then top up the pool from step 2 if completing a build
   left other unblocked cards waiting.
5. **When nothing is running and no unblocked card remains**, go to **Idle & wait** below.

## Idle & wait (Monitor) — start a fresh Monitor each time the pool drains

When nothing is running and no unblocked card remains in `## IMPLEMENT` (the column is empty, or
every remaining card is blocked on a dependency):

1. **Report** which cards you moved to MERGE (with PR urls), and any that stayed behind (failed,
   or still blocked and on which deps).
2. **Arm a new `Monitor`** (`persistent: true`) that watches **both** the IMPLEMENT column (a new
   card from the plan lane) and the ARCHIVE column (a dependency landing unblocks a waiting card),
   emitting one line only when either changes:

   ```bash
   sig() { { awk '/^## IMPLEMENT[ \t]*$/{f=1;next} /^## /{f=0} f' KANBAN.md
             awk '/^## ARCHIVE[ \t]*$/{f=1;next}   /^## /{f=0} f' KANBAN.md; } 2>/dev/null | cksum; }
   prev=$(sig)
   while true; do
     cur=$(sig)
     [ "$cur" != "$prev" ] && { echo "IMPLEMENT/ARCHIVE changed @ $(date -u +%H:%M:%S)"; prev=$cur; }
     sleep 5
   done
   ```

   with `description: "IMPLEMENT or ARCHIVE column of KANBAN.md changed (new card or a dependency landed)"`.
   The poll is silent until a change, so it costs nothing while idle.
3. **End your turn.** Stay parked. When the Monitor's notification arrives, **`TaskStop` that
   monitor** (use its id from context, or `TaskList` to find it) so only one is ever alive, then
   return to the processing playbook — a changed ARCHIVE column may have unblocked a card that was
   waiting. Repeat forever.

## Configuration

Set when the loop is installed (the installer replaces the token in the installed copy; the
source keeps the placeholder):

- `5` — maximum number of `worktree-implementer` subagents building at
  once. Default: `5`. Lower it on a constrained machine; raise it for more parallelism.
