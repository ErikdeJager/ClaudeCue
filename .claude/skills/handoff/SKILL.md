---
name: handoff
description: Generates a standalone "handoff" report for one TASKS.md task. Gathers the task's requirements plus the minimal surrounding repo context (relevant files, conventions, acceptance criteria) into a single self-contained document so a fresh agent can complete the task with no prior conversation context. Researches in a forked subagent to keep the caller's context clean and writes the report to .handoffs/task-<n>.md. Use when the user runs /handoff <task-number>, asks to "create a handoff" or "brief an agent" for a task, or when the isolate-agent or develop-tasks skills need a handoff.
argument-hint: [task-number] [output-path]
context: fork
agent: general-purpose
allowed-tools: Read, Grep, Glob, Write, Bash(git:*)
---

# Handoff generator

You produce a **standalone handoff** for one task so another agent can complete it
with **no prior conversation context**. You run in an isolated context: research only
from the repository, then write one self-contained Markdown file.

Keep it tight. Link to code by `path` or `path:line` — do **not** paste large code
blocks. The deliverable is a clean, complete brief, not an information dump. Do not
ask the user anything (you cannot); if something is wrong, write nothing and report it.

## Inputs
- Task number: `$1`
- Output path: `$2` — if empty, use `.handoffs/task-$1.md` (relative to the repo root from `git rev-parse --show-toplevel`).

If `$1` is empty or not a number, stop: report "handoff requires a task number" and write nothing.

## Steps
1. Read `TASKS.md`. Locate the task whose heading starts with `### $1.`. If it is missing, ambiguous, or already `[x]`, write nothing and report the problem.
2. Extract from that task block: title, status, full description, subtasks, acceptance criteria, notes, and the `Depends on` list.
3. Gather **only** the context needed to do the work:
   - Conventions: read `CLAUDE.md`, `README*`, and obviously relevant config (lint/test/build) **if present**. Skip what doesn't exist.
   - Relevant code: Grep/Glob the key nouns and terms from the task to find the files someone would touch. Record each as `path` or `path:line` with a one-line reason.
   - Resolve references the task makes (linked files, tasks it depends on) into concrete pointers.
4. Write the handoff to the output path using the template below. Create parent directories if needed.
5. Report back: the path written and a 2–3 line summary. Do **not** echo the full document.

## Handoff template

Write exactly this structure, filled in. Omit a section only if it is genuinely empty.

```markdown
# Handoff — Task $1: <title>

## Objective
<1–3 sentences: what to achieve and why.>

## Background & context
<Only what a fresh agent needs. Reference files by path, not by pasting them.>

## Scope
- In scope: <...>
- Out of scope: <...>

## Relevant files & pointers
- `path` — <why it matters>
- `path:line` — <what is here>

## Requirements
<Concrete, checkable items derived from the description and subtasks.>

## Acceptance criteria
- [ ] <copied / refined from the task>

## Conventions & constraints
<Coding style, test/build commands, patterns to follow. From CLAUDE.md / README if present; otherwise note "no project conventions found — follow the surrounding code".>

## Definition of done
<What "done" means: code + tests + docs as applicable, every acceptance criterion met, change committed on the task branch.>
```

Keep the whole document self-sufficient: a competent agent who has never seen this
repo should be able to start from it alone.
