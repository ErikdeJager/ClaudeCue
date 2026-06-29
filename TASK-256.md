### 256. [ ] Release v1.0.1 — version bump, patch notes, green test/lint suite, push to main

**Status:** Not started
**Depends on:** none
**Created:** 2026-06-29

**Description**

Cut **v1.0.1**, the first incremental release after the v1.0.0 launch. Per the card:
"Increment version number to 1.0.1. And write a patchnotes file for v1.0.1 based on all
changes that were made since release tag 1.0.0. Run all tests, make sure all clippy
warnings are satisfied and no tests fail. Then commit & push changes when done directly
to main."

This is an **intentional, user-requested version bump** (the implementing agent performs
it — the standing "never bump the version" guard is a refine/loop-agent rule, explicitly
overridden by this task).

**Grounding (release machinery):**

- **Version lives in two files, both currently `1.0.0`:**
  `src-tauri/tauri.conf.json` (`"version"`, line 4 — the one the **pipeline gate
  reads**) and `package.json` (`"version"`, line 4). They are in sync today and must
  **both** move to `1.0.1`.
- **Patch notes** are authored in-repo as `src/patchnotes/<version>.json`
  (`src/patchnotes.ts`, #192): `{ "version", "date", "changes": [{ "category",
  "items": [string, …] }] }`. Categories normalize via `categoryLabel` —
  `feature`→"Features", `fix`→"Fixes", `improvement`→"Improvements", `other`→"Other";
  any other string is Title-Cased. A file is valid only with a non-empty `version` and
  ≥1 change group with ≥1 non-empty item (else `normalizePatchNotes` drops it). The
  current `1.0.0.json` uses a single `welcome` group (the launch intro); **1.0.1 is the
  first real changelog**, so use `feature`/`improvement`/`fix` groups.
- **The release pipeline is automatic** (`.github/workflows/release.yml`): on push to
  `main` it gates on a **strict version bump past the latest `v*` tag** (reads
  `src-tauri/tauri.conf.json`) **and** no existing release for that tag; if it passes it
  asks Claude to **construct the release body** from changes since the last tag, opens
  **one draft** GitHub release, and builds **signed** macOS + Windows bundles, merging
  `latest.json`. A maintainer then **publishes** the draft. So this task's push **starts**
  the release; it does not need to build bundles or tag (the pipeline's `tag` job tags the
  commit `v1.0.1`). The in-app `src/patchnotes/1.0.1.json` is the **installed-version**
  "What's new" (Settings → Updates); the auto-generated release body is the **update
  notification** body — both are produced, from different sources.
- **The version-gate also requires no existing `v1.0.1` release/tag** — assume none
  exists (it doesn't today); if a prior partial attempt left one, that's a manual cleanup
  outside this task.

**Changes since `v1.0.0` to summarize** (gather authoritatively at implementation time —
see Subtask 2; the set below is what has merged so far and will likely be the content):

- **#252** — File-tree rows are colored by git status (new = green, edited = yellow,
  deleted = red), with folder roll-up + red ghost rows for deletions.
- **#253** — Drag files from the OS (Finder/Explorer) into the file tree to move them
  into a folder or the repo root, with drop-target highlighting.
- **#254** — Mermaid diagrams render in the file viewer's rendered markdown
  (` ```mermaid ` blocks).
- **#255** — Keyboard navigation between files in the diff viewer (←/→ in Focused, ↑/↓
  in Accordion).

(If more tasks land before this is implemented, include them — Subtask 2 derives the real
list from `git log v1.0.0..HEAD` and the DONE/archived task entries.)

**Scope**

- Bump the version to **1.0.1** in `src-tauri/tauri.conf.json` **and** `package.json`.
- Author **`src/patchnotes/1.0.1.json`** summarizing every user-facing change since
  `v1.0.0`, in the documented schema, with categories.
- Run the **full green suite** — type-check/build, frontend lint + tests, Rust clippy
  (`-D warnings`) + tests, and the formatters' checks — and fix anything red (the bump +
  patchnotes themselves shouldn't break anything; address any pre-existing breakage that
  blocks a clean release, or surface it if out of scope).
- **Commit and push directly to `main`** (explicitly requested — no branch/PR), which
  triggers the release pipeline.

**Out of scope**

- Building/signing bundles, creating the GitHub release, or git-tagging — the pipeline
  does these. Publishing the resulting **draft** release is a manual maintainer step
  (note it in the commit/PR-less summary, but don't attempt it here).
- Changing release infrastructure (`release.yml`, `scripts/*`), the updater, or signing
  keys.
- Any feature work — this task only versions + documents what already shipped.

**Subtasks**

1. [ ] **Bump the version to `1.0.1`** in both `src-tauri/tauri.conf.json` and
   `package.json` (keep them identical). Do **not** touch `Cargo.toml`'s crate version
   unless it currently tracks the app version (it doesn't need to for the release gate);
   leave it as-is unless a check shows it must match.

2. [ ] **Derive the change list authoritatively.** Run `git log --oneline v1.0.0..HEAD`
   and cross-reference the **DONE** column / `TASK_ARCHIVE.md` entries to list every
   user-facing change since v1.0.0 (filter out pure refine/archive/CI commits — keep the
   *implemented features/fixes*). This is the source of truth for the notes (don't rely
   solely on the list above, which may be stale).

3. [ ] **Author `src/patchnotes/1.0.1.json`** in the schema
   (`{ version, date, changes: [{ category, items }] }`):
   - `version`: `"1.0.1"`; `date`: the release date (today at implementation, `YYYY-MM-DD`).
   - Group the Subtask-2 changes under `feature` / `improvement` / `fix` (most of the
     known set are `feature`s). Write **user-facing**, plain-language items (not "TASK-252"
     — describe the capability, e.g. "The file tree now colors files by git status…").
   - Validate it loads: it must satisfy `normalizePatchNotes` (non-empty version, ≥1
     group with ≥1 item). A quick `npm test` / a temporary `patchnotesFor("1.0.1")` check
     confirms it's picked up by the eager glob.
   - Recommended starting content (reconcile with Subtask 2):
     ```json
     {
       "version": "1.0.1",
       "date": "<release date>",
       "changes": [
         { "category": "feature", "items": [
           "The file tree now colors files by git status — green for new files, yellow for edited, and red for deletions (with folders flagging changes inside them).",
           "Drag files from Finder or Explorer straight into the file tree to move them into a folder or the repository root, with a highlight showing where they'll land.",
           "Markdown files now render Mermaid diagrams in the file viewer's rendered view.",
           "Jump between files in the diff viewer with the keyboard — arrow keys step through files in Focused mode and between cards in Accordion mode."
         ]}
       ]
     }
     ```

4. [ ] **Run the full suite and make it green** (fix anything the change touches; do not
   leave a red gate):
   - `npm run build` (tsc + vite build) — type-check passes.
   - `npm run lint` (eslint) and `npm run format:check` (prettier) — clean.
   - `npm test` (vitest run) — all pass, including any patchnotes test.
   - `npm run lint:rust` (`cargo clippy … -D warnings`) — **zero** warnings (the card's
     "all clippy warnings are satisfied").
   - `cargo test --manifest-path src-tauri/Cargo.toml` — all pass.
   - `npm run format:rust` if needed so `cargo fmt --check` would pass.

5. [ ] **Commit and push directly to `main`.** A single commit (e.g. `Release v1.0.1`)
   carrying the two version bumps + `src/patchnotes/1.0.1.json` (+ any
   formatting/test fixes). Push to `main`. Confirm the **release pipeline** triggers
   (the version gate sees `1.0.1` > `v1.0.0`). Note in the wrap-up that the resulting
   **draft** GitHub release must be **published by a maintainer** to go live.

**Acceptance criteria**

- [ ] `src-tauri/tauri.conf.json` and `package.json` both read `"version": "1.0.1"`.
- [ ] `src/patchnotes/1.0.1.json` exists, is valid (loads via `normalizePatchNotes` /
  `patchnotesFor("1.0.1")`), and summarizes the real changes since `v1.0.0` in
  user-facing language under appropriate categories.
- [ ] `npm run build`, `npm run lint`, `npm run format:check`, `npm test`,
  `npm run lint:rust` (no clippy warnings), and `cargo test` all pass — **nothing red**.
- [ ] The change is committed and **pushed to `main`**; the release workflow's version
  gate accepts `1.0.1` (a draft release run starts).
- [ ] No feature/behavior code changed beyond the version + patch notes (and any
  formatting fix required to keep the suite green).
- [ ] Cross-platform integrity preserved: this is a version + JSON + docs change with no
  platform-specific code; the suite (which both macOS and Windows CI run) stays green, and
  the pipeline builds **both** OS bundles from the bump.

**Notes**

- **Asking the user — deferred per the standing directive.** Per `ASSUMPTIONS.md`
  (2026-06-26), open points decided autonomously:
  - **Bump both `tauri.conf.json` and `package.json`** (kept in sync today); the gate
    reads `tauri.conf.json`, but leaving `package.json` stale would be inconsistent.
  - **Patch-notes categories = `feature`/`improvement`/`fix`** (not the launch's
    `welcome` group); 1.0.1 is the first real changelog. Items are **user-facing prose**,
    not task numbers.
  - **Change list is regenerated from `git log v1.0.0..HEAD` at implementation time** —
    the four known features (#252–#255) are the expected content, but more may land first.
  - **Push directly to `main`, no branch/PR** — explicitly requested by the card and
    required to trigger the on-`push`-to-`main` release pipeline.
  - **The version bump is intentional and user-requested** — it overrides the
    refine/loop agent's standing "never bump the version" guard (which protects against
    *accidental* bumps, not an explicit release task). The implementing agent performs the
    bump; the refine agent only writes this plan.
- **Pipeline reminder:** the push produces a **draft** release that a maintainer must
  **publish** for `latest.json`/the updater to serve it; the pipeline tags the commit
  `v1.0.1` and builds signed macOS + Windows bundles. The in-app `1.0.1.json` shows once
  that build is installed (Settings → Updates "What's new"); the updater's pre-install
  "What's new" comes from the auto-constructed release body.
- **Key references:** `src-tauri/tauri.conf.json` (`version`),
  `package.json` (`version`), `src/patchnotes/1.0.0.json` (schema example),
  `src/patchnotes.ts` (`normalizePatchNotes`/`categoryLabel`/`patchnotesFor`),
  `.github/workflows/release.yml` (push-to-main version gate),
  `CLAUDE.md` "Builds & distribution" / "Releasing" notes; test/lint commands in
  `package.json` scripts + `CLAUDE.md` Commands.
