---

kanban-plugin: board

---

## Refine

- [ ] Updating setup (skeleton for future auto-update)
	Set up the update feature in its first setup for later. We'll need tauri keys for this, but that's deferred and generated later. For now set up everything for future deployment: a GitHub pipeline that makes a draft release per version of the app, but it checks if the secret key is present in GitHub secrets — if not present the workflow ends early. The UI has an update indicator in the left panel, in a little box at the bottom (box above the settings). A modal appears asking if the user is sure; clicking OK freezes the app (block user input) and shows a progress bar for downloads etc. App restarts updated and shows a toast with the new version. This skeleton needs to be ready to go once a full tauri signing key is provided in a later task.
- [ ] Alternative settings screen for updating
	An alternative settings screen for updating, with a button to check for updates. This settings screen is opened when the user wants to update, to see what will be installed.
- [ ] Patchnotes JSON baked into app + settings patch-notes view
	Patchnotes JSON baked into the app, and settings displaying patch notes. The JSON structure must be updated with every version bump; the pipeline should check if the version is still up to date — if not, the GitHub pipeline ends early. The patchnotes JSON is a simple structure containing a list of bullet-point changes grouped by category (e.g. feature, fix). Separate JSON file for each update, and the UI loads them and shows them in the settings screen for updating. The patchnotes should be part of the release in some way: the user should be able to read the patchnotes of a new update that has not been installed yet. Think of a smart solution for this.
- [ ] Mock update (dev testing)
	In dev runs, be able to insert a command to mock an available update. Mocking this will change the UI and show a fake update status, allowing testing of the UI.

## READY

- [ ] #186 — Distribute Canvas panels evenly (button + border double-click)
	Plan: TASK-186.md
	Depends on: none
- [ ] #187 — "Save current canvas as template" (seed Template Editor from a live canvas)
	Plan: TASK-187.md
	Depends on: none
- [ ] #188 — Double-click a panel/card header to rename the agent inline
	Plan: TASK-188.md
	Depends on: none
- [ ] #189 — Keyboard-driven panel-creation modal (⌘K) + per-type shortcuts
	Plan: TASK-189.md
	Depends on: none

## DONE

