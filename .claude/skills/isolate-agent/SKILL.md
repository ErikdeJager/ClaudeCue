---
name: isolate-agent
description: Runs one TASKS.md task to completion in an isolated git worktree under .worktree/<branch> off main. Idempotent state machine: creates the worktree, generates a handoff via the handoff skill, spawns a background subagent confined to that worktree to implement, commit, push and open a PR to main, then reviews against current main, resolves merge conflicts and surface issues, and auto-merges. Use when the user runs /isolate-agent <task-number>, asks to do a task "in isolation" or "in a worktree", or when the develop-tasks skill delegates a task. Non-blocking by default; pass --wait to run it end-to-end.
argument-hint: [task-number] [--wait]
allowed-tools: Bash(git:*), Bash(gh:*), Read, Grep, Glob, Edit, Write, Skill(handoff *), Task, Agent
---

# Isolated agent runner (one task)

Drives a single `TASKS.md` task to a merged PR using its own git worktree. A
background subagent does the implementation; you (the orchestrator) review, resolve
conflicts, and merge. **Idempotent** — safe to run repeatedly; each run advances the
task one step based on the *current* git / GitHub state, not memory.

Run **unattended**: never pause to ask the user. If genuinely blocked, stop and report.

- Task number: `$1`
- `--wait` present → after launching the worker, monitor it to completion and finalize in this same run (standalone use). Without `--wait`, return as soon as this step is done (develop-tasks uses this for parallelism).

## Naming (compute once)
- `ROOT` = `git rev-parse --show-toplevel`
- `SLUG` = short kebab-case of the task title (≤4 words)
- `BRANCH` = `task-$1-<SLUG>`
- `WT` = `<ROOT>/.worktree/<BRANCH>`  (ensure `.worktree/` is gitignored — it is by default here)
- `HANDOFF` = `<ROOT>/.handoffs/task-$1.md`

## Determine state — source of truth is git + GitHub
Run `git fetch origin --prune`, then classify:
- Task `[x]` in TASKS.md, **or** its branch already merged → **DONE**
- An **open PR** exists for `BRANCH` (`gh pr list --head <BRANCH> --state open --json number`) → **READY**
- `WT` exists, no open/merged PR → **RUNNING** — but if no background worker is active for it *and* no commits were pushed to the branch, treat as **STALLED**
- Nothing exists yet → **NEW**

## NEW → start
1. Make sure the worktree is based on the latest main: `git fetch origin`.
2. `git worktree add -b <BRANCH> <WT> origin/main`
3. Generate the brief: invoke the **handoff** skill → `/handoff $1 <HANDOFF>`.
4. Spawn the worker with the **Agent tool** (`subagent_type: general-purpose`, `run_in_background: true`) using the Worker brief below with `WT`, `HANDOFF`, `BRANCH`, `$1`, and the title substituted in. Background launch lets sibling tasks run in parallel.
5. Return `▶ task $1 started (branch <BRANCH>); worker running.` If `--wait`, continue into RUNNING.

## RUNNING
- Without `--wait`: return `⏳ task $1 in progress.`
- With `--wait`: monitor the worker until it finishes (poll its background output), then proceed to READY.

## STALLED → recover
Report the stall. If the branch has no pushed commits, remove the dead worktree
(`git worktree remove <WT> --force`) and restart from **NEW**. If it has commits but
no worker, leave it and report for inspection.

## READY → finalize & merge
1. `git fetch origin`.
2. `gh pr view <BRANCH> --json number,mergeable,mergeStateStatus`.
3. **Conflicts vs current main?** In the worktree, integrate latest main and resolve faithfully:
   `git -C <WT> merge origin/main` → resolve conflicts → `git -C <WT> commit` → `git -C <WT> push`. Re-check.
4. **Review**: read `gh pr diff <BRANCH>` against the task's acceptance criteria. Fix any surface issues directly on the branch in `<WT>` and push. If the project has tests/checks, run them; **do not merge on failure** — push fixes or report.
5. **Merge**: `gh pr merge <BRANCH> --squash --delete-branch`.
6. **Update main** in the primary tree: `git -C <ROOT> checkout main && git -C <ROOT> pull --ff-only origin main`.
7. **Mark done**: in `TASKS.md`, set the task's marker to `[x]` and Status to `Done`; `git -C <ROOT> commit -am "Mark task #$1 complete"` and `git -C <ROOT> push origin main`.
8. **Clean up**: `git worktree remove <WT> --force`; delete the local branch if it lingers (`git -C <ROOT> branch -D <BRANCH>`).
9. Return `✅ task $1 merged.`

## DONE
Return `✓ task $1 already complete.`

## Worker brief (fill placeholders, pass as the Agent prompt)

> You are implementing **one task** in an isolated git worktree.
> **Work only inside `<WT>`** — never create or edit files outside it.
> Your complete, self-contained brief is at `<HANDOFF>`; read it first.
>
> 1. Implement the task so every acceptance criterion in the brief is met, following the repo's conventions.
> 2. Use `git -C <WT> …` for all git operations. Commit in logical steps with clear messages.
> 3. Push the branch: `git -C <WT> push -u origin <BRANCH>`.
> 4. Open a PR to main:
>    `gh pr create --base main --head <BRANCH> --title "Task $1: <title>" --body "<short summary>\n\nCloses task #$1"`
> 5. Do **not** modify `TASKS.md`, do **not** merge, do **not** touch other branches, and do **not** commit `.handoffs/` or `.worktree/`.
>
> When finished, report the PR URL.
