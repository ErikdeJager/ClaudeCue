### 229. [ ] Syntax-highlight the diff viewer (reusing the file viewer's languages)

**Status:** Not started
**Depends on:** #227
**Created:** 2026-06-28

**Description**

The **DiffInspector** renders diff lines as plain, unhighlighted text. Apply the **same
syntax highlighting** the FileViewer uses (Prism) so diff code is highlighted too, using
the **same curated language set** delivered by task **#227** (C#, Go, Lua, SQL, Ruby, PHP,
Gradle, plus the existing Java/Rust/JS-TS/HTML/CSS/JSON/YAML/Python/etc.).

**Grounding:**

- `src/components/DiffInspector/DiffInspector.tsx`:
  - `UnifiedRow` (lines 27-46) renders each `HunkLine`: a hunk header, or gutters + a
    marker (`+`/`−`/` `) + the code as **plain text** —
    `<span className={styles.content}>{line.text}</span>` (line 43).
  - `SplitRow` (lines 48-...) renders the side-by-side view, also with
    `<span className={styles.content}>{line.text}</span>` (lines 62, 72) — plain text.
  - A `FileDiff` has `path` + `hunks: HunkLine[]`; each `HunkLine` has `type`
    (`hunk`/`add`/`del`/`context`), `old_no`, `new_no`, `text`. The selected file's `path`
    is available (`DiffInspector.tsx:254`, `:377-386`).
  - Rows are capped at `MAX_DIFF_ROWS` (line 85-86), so highlighting only touches the
    rendered (bounded) rows.
- **#227 deliverables to reuse** (both pure, already exported): `prismLang(file)` →
  Prism language id for a path's extension (`src/components/FileViewer/fileType.ts`), and
  `highlightToHtml(code, lang)` → Prism token HTML, **HTML-escaping** input and **falling
  back to escaped plain text** when the language isn't curated
  (`src/components/FileViewer/prism.ts`). After #227 these cover the card's full language
  list.

**Decided approach (autonomous — see Notes/ASSUMPTIONS.md):**

1. **Detect the language once per file** via `prismLang(file.path)` (memoize per
   rendered `FileDiff`); `undefined` → no highlighting (plain text, as today).
2. **Highlight each line's code content** with `highlightToHtml(line.text, lang)` and
   render it via `dangerouslySetInnerHTML` in place of the plain-text `content` span — in
   **both** `UnifiedRow` and `SplitRow`. This is safe: `highlightToHtml` escapes its input
   (Prism + the `escapeHtml` fallback), so there's no injection vector. The `+`/`−`/` `
   marker and the add/del/context row background classes stay exactly as they are
   (highlighting only re-styles the code text, not the diff coloring).
3. **Per-line highlighting** (each line tokenized independently) — the standard
   "lightweight" diff approach. Accept that multi-line constructs (block comments,
   template strings) aren't perfectly tokenized across line boundaries; this matches the
   card's "lightweight" intent and avoids reconstructing full-file context from a diff.
4. Reuse the FileViewer's Prism **token CSS** so diff highlighting matches the file
   viewer's theme (import/share the same token styles; verify the colors read well on the
   add/del row backgrounds).

**Out of scope:**

- **Context-aware multi-line tokenization** (stateful across lines) — per-line is
  sufficient and lightweight.
- **Intra-line word-level diff** highlighting — not requested.
- Adding languages — that's #227; this task only **consumes** the shared
  `prismLang`/`highlightToHtml`.
- The diff data/backend (`git.rs`) — unchanged; highlighting is purely render-side.

**Cross-platform (hard requirement):** pure frontend; language detection is by file
extension (diff paths are repo-relative, `/`-separated); no OS-specific code; identical on
macOS and Windows.

**Subtasks**

1. [ ] In `DiffInspector.tsx`, compute `lang = prismLang(file.path)` once per file
   (memoized) and thread it to `UnifiedRow`/`SplitRow`.
2. [ ] Replace the plain-text `content` spans with
   `dangerouslySetInnerHTML={{ __html: highlightToHtml(line.text, lang) }}` when `lang` is
   defined (plain text otherwise), in both unified and split rows; keep the marker + row
   background classes.
3. [ ] Ensure Prism token CSS applies in the diff (import/share the FileViewer's token
   styles); verify token colors on add/del backgrounds.
4. [ ] Verify highlighting for a few languages from #227's set in both unified and split
   views; large diffs stay within the `MAX_DIFF_ROWS` cap and remain responsive.
5. [ ] `npm run build`, `npm run lint`, `npm test`, `npm run format:check` pass.

**Acceptance criteria**

- [ ] Diff code is **syntax-highlighted** in both the unified and split views, using the
      same language set as the FileViewer (post-#227), with the add/del/context row
      backgrounds and `+`/`−` markers unchanged.
- [ ] A file whose type isn't curated falls back to plain (escaped) text — no crash, no
      raw-HTML injection.
- [ ] Highlighting is render-side only (no diff/backend change) and stays responsive
      within the existing row cap.
- [ ] `npm run build`, `npm run lint`, `npm test`, `npm run format:check` pass.

**Notes**

- **Autonomous decisions (user not answering; logged in `ASSUMPTIONS.md`):**
  - *Reuse #227's pure `prismLang` + `highlightToHtml`* (don't duplicate language config);
    *per-line highlighting* (lightweight, accepts imperfect cross-line tokenization);
    *render via `dangerouslySetInnerHTML`* is safe because `highlightToHtml` escapes input.
  - *Share the FileViewer's Prism token CSS* so the two viewers match.
- **Depends on: #227** — it provides the extended language set + the
  `prismLang`/`highlightToHtml` surface this task consumes, and both touch the shared
  highlight infra, so #229 lands after #227 (open task on the board → real dependency).
- References: `DiffInspector.tsx:27-46` (UnifiedRow), `:48-73` (SplitRow), `:254`/`:377-386`
  (selected file `path`), `:85-86` (row cap); #227's `fileType.ts` (`prismLang`) +
  `prism.ts` (`highlightToHtml`) + the Prism token CSS.
