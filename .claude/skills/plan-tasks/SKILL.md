---
name: plan-tasks
description: >-
  The plan lane of the kanban-dev-pima board: drain the PLAN column of KANBAN.md — for each
  terse card, explore the codebase, write a PLAN-<N>.md, record assumptions, set dependencies,
  and move it to IMPLEMENT — then park on a Monitor watching PLAN and resume automatically when
  a new idea appears. Invoke once as /plan-tasks in its own terminal; it loops itself via a
  Monitor (never /loop).
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Monitor, TaskStop, TaskList
---

# plan-tasks — lane orchestrator

You are the **plan** lane of a Kanban development board (`kanban-dev-pima`). You turn terse PLAN
cards into implementation-ready tasks in IMPLEMENT. You **loop yourself**: drain every card that
is currently in PLAN, then **arm a `Monitor`** on the PLAN column and wait — the moment a new
idea is dropped in, the Monitor wakes you and you process it. You never stop the session.

**Stay on the current branch the entire time — never run `git checkout`/`switch`/`branch`.**
All feature work happens later, in worktrees; your job is planning only.

**How you loop (read this first — it replaces `/loop`).** The *only* tools you use to wait and
resume are `Monitor` (to wait), `TaskStop` (to retire the one that fired), and `TaskList` (to
find its id). **Never invoke `/loop`, never call `ScheduleWakeup`, never create a cron/routine.**
Idle means *parked on a `Monitor`* — nothing else.

## Board protocol (shared by every lane)

The board lives at the repo root in `KANBAN.md`, with four columns: `## PLAN`,
`## IMPLEMENT`, `## MERGE`, `## ARCHIVE`. Cards use this shape:

```
- [ ] Task <N>: <fitting title> — PLAN-<N>.md
  - deps: <comma-separated task numbers, or "none">
  - PR: <url, once opened>
```

- **`PLAN-<N>.md`** — a per-task plan at the repo root (git-ignored).
- **`ASSUMPTIONS.md`** — interpretation notes, one `## Task <N>` section per task
  (**tracked**: this lane commits & pushes it).
- **`TASK_ARCHIVE.md`** — permanent record of finished tasks (tracked). Distinct from the
  `## ARCHIVE` board column, which is transient staging for merged cards awaiting archival.
- **Numbering** — `N` is a strictly increasing integer; the next free number is one greater
  than the highest used **anywhere** (board cards, `PLAN-*.md`, `TASK_ARCHIVE.md`).
- **Dependencies** — a downstream lane treats a card as unblocked only when every task in
  its `deps:` is in `## ARCHIVE` or in `TASK_ARCHIVE.md`.

## Processing playbook — drain the PLAN column

Process cards one at a time, **continuing while PLAN still holds un-refined cards** (don't stop
after one). Because four lanes share `KANBAN.md`, **re-read it right before each edit** and touch
only the PLAN/IMPLEMENT regions you're moving a card between.

For each card:

1. **Pick the next card.** Read the `## PLAN` column and take the topmost un-refined card (a
   terse one-liner). If the column holds no un-refined card, go to **Idle & wait** below.
2. **Understand it.** PLAN cards are low-context. Explore the codebase to learn what the task
   actually implies, and read related/completed work for consistency — other cards, existing
   `PLAN-*.md`, and `TASK_ARCHIVE.md`. *(If agents like `code-explorer` / `code-architect` or a
   `feature-dev` skill are installed, use them here; don't require them.)*
3. **Resolve ambiguity yourself.** Where the author's intent is unclear, choose the most
   reasonable interpretation. **Record each such decision** under a `## Task <N>` section in
   `ASSUMPTIONS.md` (create the file if missing).
4. **Assign the next number `N`** — one greater than the highest number used anywhere across
   the board, `PLAN-*.md`, and `TASK_ARCHIVE.md`.
5. **Write `PLAN-<N>.md`** at the repo root: goal, acceptance criteria, the concrete
   implementation approach, the files to touch, and how to test/verify it. Make it
   self-contained — an implementer will have only this file and the codebase.
6. **Set dependencies.** Identify which other tasks must land first; list them on the card's
   `deps:` line (or `none`). This keeps the card blocked downstream until they're done.
7. **Refine and move the card.** Rename it to a fitting title linking the plan
   (`Task <N>: <title> — PLAN-<N>.md`, with `deps:` and an empty `PR:`) and move it from
   `## PLAN` to `## IMPLEMENT`.
8. **Commit and push `ASSUMPTIONS.md`.** Stage **only** `ASSUMPTIONS.md` (the board and
   `PLAN-<N>.md` stay git-ignored), commit it on the current branch, and push so the
   assumptions are durable and visible upstream:
   `git add ASSUMPTIONS.md && git commit -m "plan: assumptions for task <N>" && git push`.
   Stay on the current branch — never `checkout`/`switch`/`branch`.

Then loop back to step 1 for the next card.

## Idle & wait (Monitor) — start a fresh Monitor each time the column drains

When no un-refined card remains in `## PLAN`:

1. **Report** what you refined this burst (task numbers, titles, deps, assumptions recorded).
2. **Arm a new `Monitor`** (`persistent: true`) that watches the PLAN column and emits one line
   only when it changes:

   ```bash
   sig() { awk '/^## PLAN[ \t]*$/{f=1;next} /^## /{f=0} f' KANBAN.md 2>/dev/null | cksum; }
   prev=$(sig)
   while true; do
     cur=$(sig)
     [ "$cur" != "$prev" ] && { echo "PLAN column changed @ $(date -u +%H:%M:%S)"; prev=$cur; }
     sleep 5
   done
   ```

   with `description: "PLAN column of KANBAN.md changed (new idea to plan)"`. The poll is silent
   until a card is added, so it costs nothing while idle.
3. **End your turn.** Stay parked. When the Monitor's notification arrives, **`TaskStop` that
   monitor** (use its id from context, or `TaskList` to find it) so only one is ever alive, then
   return to the processing playbook and drain the column again. Repeat forever.
