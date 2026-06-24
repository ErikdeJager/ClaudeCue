# Plan Template

> The **refine agent** copies everything between the rulers into a new
> **`TASK-<N>.md`** plan file (one file per task), filling in the real number and
> content. Delete the optional sections a small task doesn't need — but err toward
> detail: the implementation agent reads this file cold, with none of the context that
> produced it.

Each plan file is named `TASK-<N>.md` where `<N>` is the task's **global, permanent
number**, and carries a top-level **completion marker** — `[ ]` for open, `[x]` for done.

---

### 1. [ ] Task title goes here

**Status:** Not started · _(Not started | In progress | Done)_
**Depends on:** none · _(task numbers this waits for, e.g. #2, #3 — leave "none" if independent; must match the READY card)_
**Created:** YYYY-MM-DD · **Due:** YYYY-MM-DD _(optional)_

**Description**

A clear, complete description of what needs to happen and *why*. Capture enough
context that an agent picking this up cold understands the goal. Spell out the
background, the scope, and anything explicitly **out of scope**. Reference concrete
files/symbols found while grounding the task in the repo.

**Subtasks**

Break the work into ordered, checkable steps:

1. [ ] First concrete step
2. [ ] Second step
3. [ ] Third step
   - [ ] Nested detail, if a step needs its own breakdown

**Acceptance criteria**

- [ ] Condition that must be true for this task to count as done
- [ ] Another measurable / verifiable condition

**Notes**

- Assumptions the refine agent made, links, references, decisions, or blockers worth recording.

---
