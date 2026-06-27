### 231. [ ] Redesign the diff viewer UI with selectable display modes (Accordion + Focused single-file)

**Status:** Not started
**Depends on:** #229, #230
**Created:** 2026-06-28

**Description**

Redesign the **diff viewer** (`DiffInspector`) to look more polished and improve the
reading experience, **keeping all existing functionality**. Add a **setting** to pick the
preferred **display mode**, with **at least two** modes (default = **Focused single
file**):

1. **Accordion files** — each changed file is its own **card** (a modified/added/deleted
   **badge**, **filename + subpath**, **+/− counts**). **Expand one card at a time** to
   read its diff inline (so what you're reading is never ambiguous). The panel **header**
   shows **`repo · branch`**, a **"N files changed +X −Y"** summary, and the
   **Unified/Split** toggle.
2. **Focused single file** (default) — **one file fills the panel**; step through files
   with **prev/next arrows** or jump via a **file picker** (e.g. a **"1/9" dropdown**) for
   maximum reading room. Keep the Unified/Split toggle.

All existing diff functionality must **stay available**: the **Working** source, the
**Compare** two-branch source (#81), the new **Commits** source (#230), **worktree** diffs,
and the **Unified/Split** toggle. (Note: the wireframes referenced in the card don't depict
worktree/compare/commits, but they must remain.)

**Grounding:**

- **The user provided two wireframes** (transcribed in the "Wireframe spec" section
  below — the images live in the refine conversation, not on disk). Implement to match
  them, using the app's existing visual language (Catppuccin tokens, `--fs-meta-*`, the
  `worktreeBadge`/segmented-control patterns).
- **`src/components/DiffInspector/DiffInspector.tsx`** (current structure): a **summary
  row** (branch label + Unified/Split toggle + Refresh, ~lines 268-303), a **source row**
  (Working/Compare buttons + branch `<select>`s, ~306-355), a **counts** line
  ("N files changed +X −Y", ~357-367), a **file list** (status glyph + path + +/− counts,
  ~374-393), and a **body** rendering the selected file via `DiffFile` →
  `UnifiedRow`/`SplitRow` (~395-397). State: `source` (working/compare, persisted),
  `mode` (unified/split, local), `selectedFile` (local), `base`/`target`,
  `diff: WorkingDiff`. Working-tree diff is polled (#29).
- **The data the redesign needs is already present** (`src/types/index.ts:136-165`,
  `src-tauri/src/git.rs`):
  - `FileDiff { path, status: "M"|"A"|"D", add, del, binary, hunks }` — per-file
    **badge** (status), **filename + subpath** (`path`), **+/− counts** (`add`/`del`).
  - `WorkingDiff.summary { branch, files_changed, adds, dels }` — the **"repo · branch"**
    (repo name from `repoPath` + `summary.branch`) and **"N files changed +X −Y"**.
  - So **no backend / type change** is needed for the header/cards.
- **Settings pattern** (to add the mode setting): `Settings` interface
  (`src/types/index.ts:~210`), `DEFAULT_SETTINGS` (`src/store.ts:~507`), `mergeSettings`
  (store), and the Settings modal `SECTIONS` (`src/components/Settings/Settings.tsx:48-79`).
  A **segmented select** already exists to mirror: `canvasCloseBehavior`
  (`Settings.tsx:335-353`, `.segmented`/`.segment`/`.segmentActive`); `defaultView` /
  `defaultAgent` are the "default …" precedents. The draft applies on Save via
  `applySettingsEffects`.
- **Reusable UI:** `FileSwitcher` (popover trigger + picker) for the "1/9" file dropdown;
  `ViewSwitch` (segmented, roving focus) for toggles; the existing file-list markup can be
  lifted into a popover for the focused-mode jump.

**Wireframe spec (provided by the user — match these):**

Both wireframes show the diff as a dark panel titled **"Diff"** with **"<repo> · <branch>"**
(e.g. "ClaudeCue · main") muted beside it and a **×** close at the top-right. In the app
this title bar corresponds to the **surrounding Canvas/Overview panel header** (which
already provides the title + close), so the redesign should render `repo · branch` there
(or in the DiffInspector header) **without duplicating** the panel's existing close — see
the panel-header note below.

- **Wireframe 01 · ACCORDION FILES** — "Each file is its own card. Open one at a time so
  the diff you read is never ambiguous."
  - A **summary row**: left = **"9 files changed"** with **"+509 −17"** beneath it (the
    `+` count green, the `−` count red); right = a **Unified | Split** segmented toggle
    (Unified active).
  - A vertical list of **file cards** (rounded, bordered). Each card's header row:
    - left: a small square **status badge** ("M" modified — peach/accent tinted; "A"
      added, "D" deleted analogously),
    - center: the **filename in bold mono** (`package-lock.json`); when the file is in a
      subdirectory, its **subpath** (`src-tauri/`, `src-tauri/capabilities/`,
      `src-tauri/src/`) renders on a **second line in muted text** beneath the filename,
    - right: **`+N −M`** counts (green / red).
  - **One card expanded at a time:** the open card (e.g. `package-lock.json`) shows its
    diff inline beneath the header — a lavender hunk header `@@ -13,6 +13,7 @@`, then
    context + added lines with **dual line-number gutters**, the added line highlighted on
    a green background. The other cards stay collapsed (header row only).
- **Wireframe 03 · FOCUSED SINGLE FILE** — "One file fills the panel. Step through with
  ‹ › or jump via the picker. Maximum room to read."
  - A **nav strip**: a **‹ prev** button (left), a center **picker pill** = status badge +
    filename + **`1/9`** index + a **▾** caret (click → a file picker to jump), and a
    **› next** button (right).
  - A **file sub-header**: the file path + **`+10 −14`** counts.
  - The **diff body fills the rest** of the panel: lavender hunk headers
    (`@@ -13,6 +13,7 @@`, `@@ -81,7 +82,6 @@`), dual line-number gutters, added lines
    green-highlighted, deleted lines red-highlighted (`- "peer": true,`), with generous
    empty reading room below.
  - (The wireframes are numbered 01 and 03; only these two modes are in scope — "at least
    these two", default = focused.)

**Panel-header note:** the diff already renders inside a Canvas/Overview panel whose header
shows a title + close ×. Surface `repo · branch` in that header (or the DiffInspector's own
header) and **do not add a second close**; the wireframe's "Diff … ×" is that existing
chrome.

**Decided approach (autonomous — see Notes/ASSUMPTIONS.md):**

1. **Setting:** add `diffDisplayMode: "focused" | "accordion"` to `Settings` +
   `DEFAULT_SETTINGS` (**default `"focused"`**, per the card). Render it as a **segmented
   control** in Settings → **Behavior** (where `defaultView`/`canvasCloseBehavior` live —
   it's a "default display mode"; Appearance is an acceptable alternative). Persisted via
   the existing `settings` blob; no new persistence.
2. **DiffInspector renders in the active display mode**, seeded from `settings.diffDisplayMode`
   on mount; **also add an in-panel segmented toggle (Accordion / Focused)** for quick
   switching of the **current** panel (local state seeded from the setting; the Settings
   value remains the persistent default). The source controls (Working/Compare/Commits) +
   branch pickers + Unified/Split toggle stay above the file display in both modes.
3. **Accordion mode:** render each `FileDiff` as a collapsible **card** — status badge
   (Added/Modified/Deleted, reuse a badge style), filename + subpath, +/− counts —
   **single-open** (expanding a card collapses the previously open one). Expanded card
   shows that file's diff inline via the existing `DiffFile` (respecting Unified/Split).
   Header: `repo · branch` + "N files changed +X −Y" + the Unified/Split toggle.
4. **Focused mode (default):** one file fills the body; a header strip with **prev/next**
   arrows (cycle the files array, wrap or clamp) and a **"i/N" file picker** (a popover
   listing files with their status/counts — reuse the file-list markup / FileSwitcher
   pattern) to jump; the Unified/Split toggle stays. `selectedFile`/current index is the
   focus.
5. **Preserve everything:** Working/Compare/**Commits (#230)** sources, branch pickers,
   worktree diffs (the panel is just pointed at the worktree folder — unchanged), and
   **per-line syntax highlighting (#229)** in the rows (it lives in the shared
   `UnifiedRow`/`SplitRow`, so both modes inherit it).

**Out of scope:**

- New diff **data** (backend/types) — everything needed already exists.
- A **third** display mode beyond the two specified (the card says "at least these two";
  keep to two unless trivial).
- Per-repo **per-panel** mode override — a **global** default + an in-panel session toggle
  is enough; a persisted per-panel override can be a later enhancement (note it).
- Changing the diff **sources** themselves (Working/Compare/Commits) — only the
  file-display layout + header are redesigned.

**Cross-platform (hard requirement):** pure frontend; no OS-specific code; `repo · branch`
uses `repoName` (`/` or `\` split, #143); renders identically on macOS and Windows. No new
git/backend calls.

**Subtasks**

1. [ ] Add `diffDisplayMode: "focused" | "accordion"` to `Settings`
   (`src/types/index.ts`) + `DEFAULT_SETTINGS` (`src/store.ts`, default `"focused"`); add
   a segmented control to Settings → Behavior (mirror `canvasCloseBehavior`).
2. [ ] Refactor `DiffInspector` to read `settings.diffDisplayMode` (seed local
   `displayMode` state) and add an in-panel Accordion/Focused toggle; keep the
   source/branch/Unified-Split controls.
3. [ ] Implement **Accordion mode** (wireframe 01): single-open file cards — status badge
   ("M"/"A"/"D") + **filename (bold) with the subpath on a muted second line** + `+N −M`
   counts; inline `DiffFile` on expand; summary row "N files changed +X −Y" + Unified/Split.
4. [ ] Implement **Focused mode** (default, wireframe 03): single-file body filling the
   panel + a nav strip = **‹ prev**, a center **picker pill (status badge + filename +
   `i/N` + ▾)** opening a file picker, **› next**; a file sub-header (path + counts);
   Unified/Split toggle.
5. [ ] Verify all sources (Working / Compare / **Commits #230**) + worktree diffs +
   **highlighting #229** work in both modes; polish styling to match the app.
6. [ ] `npm run build`, `npm run lint`, `npm test`, `npm run format:check` pass.

**Acceptance criteria**

- [ ] A **Settings** control picks the diff display mode (default **Focused single file**),
      persisted across restarts.
- [ ] **Accordion mode**: each changed file is a card (status badge + filename/subpath +
      +/− counts); expanding one collapses the previous; its diff reads inline; the header
      shows `repo · branch` + "N files changed +X −Y" + Unified/Split.
- [ ] **Focused mode**: one file fills the panel; prev/next arrows and a "i/N" file picker
      navigate; Unified/Split works; maximum reading room.
- [ ] **All existing functionality remains**: Working, Compare (#81), Commits (#230),
      worktree diffs, Unified/Split, working-tree polling — in **both** modes — and diff
      rows are **syntax-highlighted (#229)**.
- [ ] Renders cleanly on macOS and Windows; `npm run build`, `npm run lint`, `npm test`,
      `npm run format:check` pass.

**Notes**

- **Autonomous decisions (user not answering; logged in `ASSUMPTIONS.md`):**
  - *The user supplied two wireframes* (Accordion 01 + Focused 03), transcribed in the
    "Wireframe spec" section; the images are in the refine conversation (not committable as
    binaries here), so the textual spec is the durable reference. Match it.
  - *Mode setting = global `diffDisplayMode` (default "focused")* in Settings → Behavior
    (a "default … " setting, like `defaultView`), **plus an in-panel quick toggle**
    (local, seeded from the setting). Per-panel persisted override deferred.
  - *Accordion = single-open* ("expand one card at a time … never ambiguous"). All
    existing sources/worktree/Unified-Split preserved; #229 highlighting inherited via the
    shared rows.
  - *No backend/type change* — `FileDiff`/`WorkingDiff` already carry status, +/− counts,
    and the summary.
  - *Large but cohesive*: if a single pass proves too big, an acceptable split is
    **focused-mode + the setting first**, then **accordion mode** as a dependent sub-task —
    but it's authored as one task here.
- **Depends on: #229, #230** — the redesign must preserve **Commits (#230)** and inherit
  **highlighting (#229)**, and all three edit `DiffInspector`, so it lands **after** them
  (lowest-number-first, avoids large merge conflicts).
- References: `DiffInspector.tsx:266-401` (render), `:268-355` (toolbar/source), `:374-397`
  (file list + body); `types/index.ts:136-165` (`FileDiff`/`WorkingDiff`); `store.ts:~507`
  (`DEFAULT_SETTINGS`) + `mergeSettings`; `Settings.tsx:48-79` (SECTIONS), `:335-353`
  (segmented select to mirror); `FileSwitcher`/`ViewSwitch` (picker/toggle patterns);
  `repoName` (`src/paths.ts`).
