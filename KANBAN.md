---

kanban-plugin: board

---

## Refine

- [ ] In the left panel, a scheduled task shows its full date and time. If the scheduled date is today, show only the time (omit the date) to keep the UI cleaner.

## READY

- [ ] #228 — Make agents in the collapsed sidebar rail clickable (left-click select + right-click menu)
	Plan: TASK-228.md
	Depends on: none
- [ ] #229 — Syntax-highlight the diff viewer (reusing the file viewer's languages)
	Plan: TASK-229.md
	Depends on: #227
- [ ] #230 — Add a "Commits" source to the diff viewer (list commits → show a commit's diff)
	Plan: TASK-230.md
	Depends on: none
- [ ] #231 — Redesign the diff viewer UI with selectable display modes (Accordion + Focused single-file)
	Plan: TASK-231.md
	Depends on: #229, #230

## DONE

- [x] #226 — Replace agent-header worktree badge with a folder + branch indicator
	Plan: TASK-226.md
- [x] #227 — Extend file-viewer syntax highlighting to more languages (C#, Go, Lua, SQL, Ruby, PHP, Gradle)
	Plan: TASK-227.md
