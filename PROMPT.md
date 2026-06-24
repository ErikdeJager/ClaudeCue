# Development prompts

The backlog lives in **`KANBAN.md`** (an Obsidian-Kanban markdown board). Work flows
left-to-right through three columns, each driven by one of the looping agents below:

```
Refine  ──(refine agent)──▶  READY  ──(implementation agent)──▶  DONE  ──(archive agent)──▶  removed
```

- A **human** drops a rough idea — one free-text card — into the **Refine** column.
- The **refine agent** turns each Refine card into a detailed `TASK-<N>.md` plan file and
  moves it to **READY** with a plan reference and dependencies.
- The **implementation agent** picks one unblocked **READY** task, implements it, and moves
  it to **DONE**.
- The **archive agent** summarizes each **DONE** task into `TASK_ARCHIVE.md` and removes the
  card from the board.

These three prompts are meant to run **on a loop** (one fires, does a single unit of work,
commits, and ends; the next firing re-checks the board). So every prompt below is scoped to
**one card per run** — never try to drain a whole column in a single pass.

## Conventions shared by all three agents

- **Always start by syncing `main`:** `git fetch origin && git checkout main && git pull --ff-only origin main`.
  The board, plan files, and archive are the shared state — you must act on the latest.
- **One card per run.** Pick the **topmost eligible** card in your column, do that card's work,
  then stop. The loop will fire again for the next one.
- **The board is `KANBAN.md`.** It is Obsidian-Kanban format: a column is `## Name`, a card is
  `- [ ] <text>` with optional **tab-indented** detail lines beneath it. Preserve the
  frontmatter, the `kanban-plugin: board` line, and any `%% kanban:settings %%` block verbatim.
- **Task numbers are global and permanent.** A task keeps its `<N>` from creation through
  archival. Never reuse or renumber.
- **A READY/DONE card** carries its number, a plan link, and its dependencies, e.g.:

  ```
  - [ ] #154 — Kanban option in the canvas template editor
  	Plan: TASK-154.md
  	Depends on: none
  ```

- **Finish by committing and pushing to `main`** (`git add -A && git commit && git push origin main`).
  If the push is rejected as out of date, `git pull --ff-only origin main` and retry. Then **end** —
  do not loop yourself.
- **Be autonomous.** There is no human to ask. Ground every decision in the repo (read the code,
  `referances/`, design docs, git history); when you must assume, choose the most reasonable option
  and record it in the plan/commit. Never skip a card for being big, risky, or unclear.

---

## 1. Refine agent — `Refine` ▶ `READY`

You convert one rough idea into a complete, build-ready plan. You are the autonomous successor
to the old interactive `/task` skill: same rigor, but you make the calls yourself instead of
interrogating a user.

1. **Sync `main`** (see shared conventions).
2. **Read `KANBAN.md`.** Look at the **Refine** column. If it is empty, there is nothing to do —
   **end**. Otherwise take the **topmost** Refine card; its text (title + any indented detail) is
   your raw request.
3. **Assign the next task number `N`.** Scan every source of an existing number — all `TASK-*.md`
   files, every card on the board, and `TASK_ARCHIVE.md` — and set `N` = (highest found) + 1.
   (Because you synced `main` first, this won't collide with another branch.)
4. **Investigate the repo to ground the task** — adaptively, as deep as the request needs:
   - **Change to existing behavior / bug:** grep & read the code actually in play so the plan
     describes the real defect, not a vague complaint.
   - **New feature:** check what exists vs. what's missing; read `referances/` and any design docs
     (e.g. `CLAUDE.md`, `HANDOFF.md`).
   - **Future code:** if it targets code that doesn't exist yet, that's normal here — it means the
     task depends on whatever task will build that code (next step).
   - For a broad dig, spawn a read-only `Explore` subagent, then continue.
5. **Resolve dependencies.** Determine what this task truly waits on:
   - An open task (a `TASK-*.md` plan / a card still on the board) will produce what it needs →
     depend on that task's `#X`.
   - Nothing will produce it and it's genuinely needed first → **author that prerequisite as its
     own Refine→READY card too** (repeat this flow for it, lower number) and depend on it.
   - Genuinely independent → `Depends on: none`.
6. **Write the plan file `TASK-<N>.md`** at the repo root, following **`PLAN_TEMPLATE.md`** exactly:
   number + title, **Status: Not started**, **Depends on:** the resolved list, **Created:** today,
   a complete **Description** (goal + why, scope, explicit out-of-scope), ordered **Subtasks**,
   verifiable **Acceptance criteria**, and **Notes** (assumptions you made, references). Write it in
   enough detail that a coding agent who has never seen this conversation can implement it cold.
7. **Move the card to `READY`** in `KANBAN.md`: remove it from **Refine**, add it to the **bottom**
   of **READY** rewritten as `- [ ] #<N> — <concise title>` with tab-indented `Plan: TASK-<N>.md`
   and `Depends on: <same list as the plan>` lines. The card's dependencies and the plan's
   `Depends on` **must match** — you own keeping them in sync.
8. **Commit & push** (`TASK-<N>.md` + `KANBAN.md`, plus any prerequisite you authored):
   `Refine task #<N>: <title>`. **End.**

---

## 2. Implementation agent — `READY` ▶ `DONE`

You implement one ready, unblocked task end-to-end.

1. **Sync `main`** (see shared conventions).
2. **Read `KANBAN.md`.** Look at the **READY** column. If it is empty, **end**.
3. **Pick the task.** Going top-to-bottom, choose the **first** READY card whose dependencies are
   **all satisfied**. A dependency `#X` is satisfied when task `#X` is **in the DONE column** or
   **already recorded in `TASK_ARCHIVE.md`** (i.e. finished). A card with `Depends on: none` is
   always eligible. If every READY card is blocked, **end** (the loop retries later).
4. **Read its plan file `TASK-<N>.md`** in full. Understand the goal, scope, subtasks, and
   acceptance criteria. Plan your implementation carefully before touching code.
5. **Implement the task completely.** Follow the repo's conventions (`CLAUDE.md`). Satisfy every
   acceptance criterion. Run the relevant checks (`npm run build`, `npm test`, `npm run lint`,
   `cargo test`/`clippy` as appropriate) and fix what you broke. **Never skip the task** for being
   big or hard — if it's genuinely too large for one pass, that is a refine-stage failure; do as
   much as is correct and record precisely what remains in the card's detail and the plan's Notes,
   but prefer to finish it.
6. **Mark it done.** In `TASK-<N>.md` set **Status: Done**. In `KANBAN.md` move the card from
   **READY** to the **bottom** of **DONE** (keep its `#<N> — <title>` and `Plan:` line).
7. **Commit & push** (the implementation + `TASK-<N>.md` + `KANBAN.md`):
   `Implement task #<N>: <title>`. **End.**

---

## 3. Archive agent — `DONE` ▶ archived & removed

You record finished work for posterity and clear the board.

1. **Sync `main`** (see shared conventions).
2. **Read `KANBAN.md`.** Look at the **DONE** column. If it is empty, **end**. Otherwise take the
   **topmost** DONE card.
3. **Summarize what was actually built.** Read its plan file `TASK-<N>.md` and the relevant git
   history (`git log`, the implementing commit) so the summary reflects what shipped, not just what
   was planned.
4. **Append to `TASK_ARCHIVE.md`.** Add one entry under the appropriate section capturing: the
   task number + title, a concise summary of what was implemented and why, the key files/areas
   touched, and the dependencies it had. This file is the permanent record of every executed task.
5. **Remove the card from the board entirely** (delete it from **DONE** in `KANBAN.md`) and
   **delete the now-archived `TASK-<N>.md`** plan file — its detail now lives in `TASK_ARCHIVE.md`,
   and dependency checks for `#<N>` resolve against the archive.
6. **Commit & push** (`TASK_ARCHIVE.md` + `KANBAN.md` + the deleted plan file):
   `Archive task #<N>: <title>`. **End.**
