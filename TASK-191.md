# Task 191

### 191. [ ] Settings → "Updates" section: check for updates + review what will be installed

**Status:** Not started
**Depends on:** #190
**Created:** 2026-06-26

**Description**

Add a dedicated **"Updates"** section to the Settings modal — the review-and-install
surface the user opens "when they want to update, to see what will be installed". It pairs
with the auto-update skeleton (#190): #190 wires the updater plugins, the `update` store
state/actions (`checkForUpdate` / `installUpdate` / `update.status|version|progress`), the
sidebar indicator box, and the freeze/progress/restart install flow. This task gives that
machinery a **manual, detailed home** in Settings: a **"Check for updates"** button, the
current vs. available version, and a place to show **what will be installed** before
committing.

**Goal & why.** Beyond #190's minimal auto-detected "update available → confirm" path, give
the user an explicit screen to (a) **manually check** for updates on demand, (b) **see the
available version and what's in it**, and (c) **install** from there. This is also the
surface the patch-notes view (#192) renders into ("what will be installed").

**The Settings modal today** (`src/components/Settings/Settings.tsx`) is a `SECTIONS` array
(`Terminal` / `Appearance` / `Behavior` / `Sessions` / `Data & About`) with a `section`
state switching the rendered pane; the "Data & About" pane already shows the app version via
`ipc.appVersion()`. Edits elsewhere are draft-staged and applied on **Save**, but action
panes (Data & About's "clear recents", "open data folder") call store actions **immediately**
— the Updates pane follows that **immediate-action** pattern (checking/installing is not a
draft-staged setting).

**What this adds.**

1. **A new `"updates"` section** in `SECTIONS` (icon e.g. Lucide `RefreshCw` /
   `DownloadCloud`, label "Updates"), with its own render block.
2. **Pane contents** (driven by #190's `update` store slice):
   - **Current version** (reuse the `appVersion()` already fetched for About).
   - A **"Check for updates"** button → `checkForUpdate()` (#190). While
     `update.status === "checking"` show a spinner/"Checking…"; results:
     **"You're up to date"** (idle/no update), **"Update available — v<version>"**, or an
     **error** line (`update.error`).
   - When an update is available: the **new version**, a **"what will be installed"** region
     — a **slot/placeholder** the patch-notes view (#192) fills (for this task, a labelled
     empty container + the version is sufficient) — and an **"Update now"** button →
     `installUpdate()` (#190's download→freeze/progress→relaunch flow).
   - While `update.status === "downloading"`, reflect `update.progress` (the full-window
     freeze overlay from #190 still covers the app during install).
3. **Deep-link from the #190 indicator** — clicking the sidebar update indicator opens
   **Settings at the Updates section** (rather than only #190's bare confirm modal). Extend
   the open path: `setSettingsOpen(open, section?)` (or a `settingsSection` store field the
   modal reads as its initial `section`), so the indicator calls
   `setSettingsOpen(true, "updates")`. This makes the Updates pane the primary "review then
   install" surface; #190's minimal confirm modal becomes redundant for the indicator path
   (keep or drop it — see Notes; reuse all of #190's install/progress/restart machinery
   either way).

**Scope.** A Settings section + the deep-link; **reuses #190's** store state, actions, and
install/freeze/progress/restart flow — **no new updater logic**. The actual "what's new"
content is **#192** (this task leaves a labelled slot).

**Out of scope.**
- The **patch-notes JSON + rendering** ("what will be installed" content) — that's #192,
  which renders into the slot this task provides.
- The **dev mock** of an available update — #193 (used to exercise this pane's states).
- Any change to the updater plugins / pipeline / signing (in #190 / later).
- Re-checking on a timer / background polling (boot-time check is #190's; this adds a manual
  button only).

**Concrete files/symbols.**
- `src/components/Settings/Settings.tsx` — add the `"updates"` entry to `SECTIONS` (~line
  31) and a `{section === "updates" && (…)}` render block; read the `update` slice +
  `checkForUpdate`/`installUpdate` from the store; reuse `appVer`.
- `src/components/Settings/Settings.module.css` — pane styles (status line, version rows,
  the patch-notes slot, the action buttons — mirror the Data/About + Behavior styles).
- `src/store.ts` — extend `setSettingsOpen` to accept an optional initial section (or add
  `settingsSection`); the `Section` type gains `"updates"`.
- `src/components/Update/UpdateIndicator.tsx` (from #190) — on click,
  `setSettingsOpen(true, "updates")` instead of (or in addition to) opening #190's confirm
  modal.

**Subtasks**

1. [ ] Add `"updates"` to the `Section` type + `SECTIONS` array (label + icon).
2. [ ] Render the Updates pane: current version; "Check for updates" button →
   `checkForUpdate()`; status feedback (checking / up to date / available v<version> /
   error); when available, the new version + a labelled **"What's new" slot** (for #192) +
   an **"Update now"** button → `installUpdate()`.
3. [ ] Extend `setSettingsOpen(open, section?)` (or add `settingsSection`) and default the
   modal's `section` state from it; point the #190 indicator at
   `setSettingsOpen(true, "updates")`.
4. [ ] CSS for the pane.
5. [ ] **Verify** — `npm run build`, `npm run lint`, `npm test` green; Rust untouched.
   Manual (or note as runtime-unverified, since a real update needs a release/key — exercise
   via the #193 mock once it lands): open Settings → Updates → "Check for updates" shows
   "up to date"; with a mocked available update, the version + slot + "Update now" appear and
   trigger #190's install flow; the sidebar indicator opens Settings directly at Updates.

**Acceptance criteria**

- [ ] Settings has an **"Updates"** section with a **"Check for updates"** button, the
      current version, and clear status (checking / up to date / available v<version> /
      error).
- [ ] When an update is available, the pane shows the **new version**, a **labelled slot for
      "what will be installed"** (filled by #192), and an **"Update now"** button that runs
      #190's install (freeze/progress/restart) flow.
- [ ] The **#190 sidebar indicator opens Settings directly at the Updates section**.
- [ ] No new updater/plugin/pipeline logic is added here (all reused from #190).
- [ ] `npm run build`, `npm run lint`, `npm test` pass; no Rust changes.

**Notes**

- **Autonomous refine (2026-06-26):** user not responding; decisions logged in
  `ASSUMPTIONS.md`.
  - **"Alternative settings screen" = a new "Updates" section in the existing Settings
    modal** (not a separate window), consistent with the modal's section pattern.
  - **Reuses #190 entirely** (store state, `checkForUpdate`/`installUpdate`, freeze/progress/
    restart) — adds only UI + a deep-link. No new updater logic.
  - **The indicator deep-links here**; this Updates pane becomes the primary "review what
    will be installed, then install" surface. #190's minimal confirm modal is now redundant
    for that path — the implementer may drop it or keep it as a quick path (reconcile with
    #190; either way reuse the same install flow). Recorded so an implementer doesn't build
    two competing confirm surfaces.
  - **"What will be installed" = a labelled slot** here; the actual patch-notes content is
    **#192** (which depends on this).
  - Update actions are **immediate** (not draft-staged), like Data & About's actions.
- **Depends on: #190** — needs its `update` store slice, `checkForUpdate`/`installUpdate`,
  the indicator, and the install flow. **#192 (patchnotes) depends on this #191** (renders
  into the "What's new" slot); **#193 (mock) is the way to exercise these panes** before a
  real signed release exists.
- **References:** `Settings.tsx` (`SECTIONS` ~31, `section` state ~78, About version fetch
  ~92, Data pane ~327); `store.ts` `setSettingsOpen`; TASK-190.md (the `update` slice +
  indicator + install flow). CLAUDE.md "Settings (#100/#102/#103/#107/#119)".
