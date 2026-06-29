---
name: prioritize-backlog
description: >-
  Reprioritizes a project's Kanban / backlog file by REORDERING its items — highest
  priority first — without ever changing an item's text. Use when the user invokes
  /prioritize-backlog or asks to prioritize / re-prioritize / reorder / rank / sort /
  triage their backlog, KANBAN.md, board, to-do list, or task queue. Looks for KANBAN.md
  at the project root, otherwise searches the project, otherwise asks where the backlog
  is. Honors any ordering instruction the user gives (e.g. "keep the top two, reorder the
  rest", "X before Y", "deprioritize Z"), reads the project to judge priority critically,
  then permutes the cards in place. It NEVER edits, rewrites, adds, removes, renumbers, or
  restates an item, never toggles checkboxes, and never moves items between columns — it
  only changes their order.
allowed-tools: Read Edit Glob Grep Bash
---

# prioritize-backlog — reorder a backlog by priority, never rewrite it

Reorder the items in a backlog/Kanban file so the highest-priority work sits at the top.

## The one inviolable rule

**You reorder items. You never change them.** An item (a card / list entry and all the
lines that belong to it — its sub-bullets, `deps:`/`PR:`/metadata lines, checkbox state)
is an **opaque block**. Reprioritizing means *permuting whole blocks*; it must be
byte-for-byte impossible to tell the contents apart before and after — only the sequence
differs. You **do not**:

- edit, reword, fix, summarize, renumber, or re-title any item;
- toggle a checkbox (`[ ]` ↔ `[x]`) or change status/labels/deps/PR/metadata;
- add a new item, delete an item, or split/merge items;
- move an item from one column/section into another (that changes its state, not its priority).

If you ever feel the urge to "improve" an item's wording while reordering — stop. That is a
different task. This skill only changes order. A §"Verify" gate below enforces this.

## Configuration

Set these when the skill is installed (the installer replaces each token in the installed
copy; the source keeps the placeholder):

- `KANBAN.md` — the backlog/Kanban filename to look for first at the project root.
  Default: `KANBAN.md`.
- `BACKLOG` — which section heading(s) to reprioritize, comma-separated, or the
  word `backlog` to auto-detect the upcoming-work / to-do / queue column. Default: `backlog`.
  (A user instruction at invocation time always overrides this.)

## 1 · Locate the backlog file

1. Look for `KANBAN.md` at the project root.
2. If absent, search the project for a backlog by common names and content:
   ```bash
   # filename candidates (case-insensitive)
   find . -path ./.git -prune -o -iregex '.*\(kanban\|backlog\|todo\|roadmap\).*\.md' -print
   # or files that look like a board (a "## Backlog"/"## To Do"/"## TODO" heading)
   grep -rilE '^##+ *(backlog|to ?do|todo|upcoming|next)\b' --include='*.md' .
   ```
3. **Exactly one clear candidate** → use it (state which one). **Zero, or several
   ambiguous ones** → **ask the user** for the path; don't guess. Never invent a file.

## 2 · Read the file and map its structure

`Read` the whole file. Determine its shape and capture every item **verbatim**:

- **Sections / columns** = headings (`## Backlog`, `## In Progress`, …). A flat file with
  no headings is one implicit section.
- **Item blocks** = each top-level list entry (`- `, `* `, `- [ ]`, `1.` …) **plus every
  following more-indented line** (sub-bullets, `deps:`/`PR:` lines, wrapped text) up to the
  next sibling item, heading, or end of section. Keep each block's text exactly as written.
- **Target section(s)** = what `BACKLOG` (or the user's instruction) selects.
  By default reorder only the **backlog / upcoming-work** column — the queue of unstarted
  work. Do **not** reorder `In Progress` / `Done`-style columns unless the user asks
  (their order is active/historical, and you never move cards between columns anyway).
- If the structure is unusual or you can't tell which section is the queue, say what you
  see and ask which section(s) to reorder.

## 3 · Gather the priority signals (in precedence order)

Build the ranking from these, **highest precedence first** — higher tiers override lower:

1. **The user's explicit instruction (hard constraints).** Parse exactly what they said:
   pins ("keep the top two on top", "leave #1 where it is"), relative orders ("X before Y"),
   and demotions ("push Z to the bottom"). These are non-negotiable — satisfy them first,
   then order everything else around them.
2. **Declared dependencies / blockers.** If items reference each other (`deps:`,
   "depends on", "blocked by", "after #N"), **never rank an item above something it depends
   on.** Keep the order topologically consistent.
3. **Explicit priority markers already on the items.** Honor existing signals —
   `P0/P1/P2`, `high/med/low`, `🔴/🟡/🟢`, `[urgent]`, due dates. Don't invent new ones.
4. **Critical judgement (this is the point of the skill).** Among items the above don't
   fully order, rank by:
   - **blockers & breakage first** — bugs/outages and work that blocks other work;
   - **unblocks-the-most** — items many others depend on (high fan-out) come earlier;
   - **impact vs effort** — high-impact / low-effort quick wins rise; big speculative items sink;
   - **risk reduction / foundational work** that de-risks later items;
   - **strategic fit** with the project's stated goals;
   - **freshness** as a tiebreaker (stale, still-relevant items shouldn't languish forever).

### Understand the project when ranking needs it

Priority is often not judgeable from the card text alone. When it helps, read the project:
`README`, docs, `ROADMAP`, recent `git log`, open issues/PRs, and any plan files the cards
reference (e.g. `PLAN-<N>.md`). *(If agents like `Explore` / `code-explorer` or a
`feature-dev` skill are installed, use them to assess impact and dependencies; don't
require them.)* Keep this proportional — a quick read to inform ranking, not a deep audit.

## 4 · Decide the new order

Produce, for each target section, a **permutation of its existing item blocks** — a new
sequence of the *same* blocks. Sanity-check it against §3: user pins respected, no item
above its dependency, explicit markers honored. Note a one-line reason for each item that
moves a meaningful distance; you'll report these.

## 5 · Apply it as a pure permutation

1. **Back up first** so you can prove and, if needed, undo the change:
   ```bash
   cp "<board-file>" "$(mktemp -t backlog-backup.XXXX).md"   # remember this path as $BAK
   ```
2. Rewrite **only** the target section's body: emit its item blocks in the new order, each
   block **copied verbatim**, preserving the original inter-item spacing (e.g. one blank
   line between cards if the file used that). Use a single `Edit` whose `old_string` is the
   current ordered block list and `new_string` is the reordered one. Leave the preamble,
   the headings, every non-target section, and all other lines **byte-for-byte unchanged**.

## 6 · Verify the content-invariant (HARD GATE — do not skip)

Prove that only order changed. The whole file must contain *exactly the same lines* as
before — same set, same counts — just rearranged:

```bash
diff <(sort "$BAK") <(sort "<board-file>")
```

- **Empty output ⇒ pass**: no line was added, removed, or altered anywhere — the change is
  purely a reordering. (This holds because you permuted whole blocks.)
- **Any output ⇒ fail**: you changed contents. **Restore the backup**
  (`cp "$BAK" "<board-file>"`) and either redo the reorder as a clean permutation or stop
  and report what went wrong. Never leave a content-altering change in place.

Then eyeball the positional diff to confirm the moves match your intent and that items
outside the target section(s) didn't move:

```bash
git diff -- "<board-file>"   # if tracked — every change should be a line MOVE, never an edit
```

## 7 · Report

- Which file you reordered and which section(s).
- The **new top-to-bottom order** (titles only — you didn't change them), and for each item
  that moved, a one-line reason (e.g. "↑ unblocks #4 and #5", "↓ nice-to-have, no users
  waiting", "pinned by you").
- Which user constraints you applied (pins / relative orders / demotions).
- Confirmation that the content-invariant check passed (contents unchanged; order only).
- How to revert: it's one file — `git checkout -- <file>` if tracked, or restore `$BAK`.

## Guardrails

- **Reorder ≠ rewrite.** If you cannot achieve the goal without editing an item's text, the
  goal is out of scope — say so; don't quietly reword.
- **Within a section only.** Never promote/demote an item by moving it to another column.
- **No new priority metadata.** Don't stamp `P1`/labels onto items to justify an order —
  the order itself is the output.
- **When direction is unclear** (which file, which section, conflicting pins), ask rather
  than guess.
