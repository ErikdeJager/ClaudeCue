### 221. [x] Fix the terminal font rendering "jiggly" on Windows (JetBrains Mono not loaded into the WebGL atlas)

**Status:** Done
**Depends on:** none
**Created:** 2026-06-28

**Description**

On **Windows**, terminal output renders with subtly malformed / "jiggly" glyphs (the
letter **"C"** especially), though still readable — the bundled **JetBrains Mono**
isn't being applied correctly in the terminal. This is **Windows-only**; make the
terminal render in crisp JetBrains Mono on Windows.

**Root cause (grounded):**

- The terminal is a pooled xterm.js created in
  `src/components/Terminal/terminalPool.ts` (`createHost`). Its `fontFamily` is
  `cssToken("--mono", '"JetBrains Mono", ui-monospace, "SF Mono", monospace')`
  (`terminalPool.ts:118-121`); `--mono` is `"JetBrains Mono", ui-monospace, "SF Mono",
  monospace` (`src/styles/tokens.css:69`). The font is bundled offline via `@fontsource`
  (`src/main.tsx:3-5`, weights 400/500/700).
- The main window renders the terminal with the **WebGL addon**
  (`terminalPool.ts:150-160`): `term.open(container)` (line 142) then a `WebglAddon` is
  loaded. The **only** font-related post-load step is
  `void document.fonts?.ready.then(safeFit)` (`terminalPool.ts:241`), and `safeFit` only
  calls `fit.fit()` (line 173-179) — it **re-fits rows/cols, but does not rebuild the
  WebGL glyph atlas or re-measure the character cell**.
- Two compounding problems on Windows (WebView2/Chromium):
  1. **A canvas/WebGL renderer does not cause the browser to fetch a webfont.** xterm
     draws glyphs into a canvas/GL texture, not as laid-out DOM text, so the
     `@font-face` JetBrains Mono may never be requested on xterm's behalf — and
     `document.fonts.ready` can resolve *before* (or without) JetBrains Mono actually
     loading.
  2. **The WebGL glyph atlas is built once, eagerly, with whatever metrics are current
     at `open()` time** (a fallback font). When JetBrains Mono later loads, nothing
     rebuilds the atlas or re-measures the cell, so glyphs keep rendering with stale
     metrics → the "jiggly"/wobbly look. (The code already acknowledges this family of
     defect: it **disables WebGL for detached windows** because of "doubled/ghosted
     glyphs and misaligned box-drawing — a known WebGL glyph-atlas / devicePixelRatio
     artifact" — `terminalPool.ts:144-149`.)
- macOS (WKWebView) is less affected — different font-load timing and a UI element using
  `--mono` (`src/styles/global.css:142`) triggers the load earlier — so the artifact
  shows on Windows.

**Goal:** ensure JetBrains Mono is actually loaded and the terminal re-measures /
rebuilds its glyph atlas with that font, so Windows terminals render crisply.

**Decided approach (autonomous — see Notes/ASSUMPTIONS.md):**

**Primary — explicit font load + atlas rebuild (keeps WebGL):**

1. **Explicitly load the font faces** xterm uses, instead of relying on a passive
   `document.fonts.ready`. In `createHost`, kick off
   `document.fonts.load('<weight> <fontSize>px "JetBrains Mono"')` for the weights the
   terminal needs (at least 400; include 500/700 if used), e.g.
   `Promise.all([...].map((w) => document.fonts.load(`${w} ${fontSize}px "JetBrains
   Mono"`)))`. This forces the bundled face to be fetched even though only the
   canvas/GL renderer uses it.
2. **After the faces resolve (and `document.fonts.ready`), force a re-measure + atlas
   rebuild** (guard against a disposed host): call `webgl?.clearTextureAtlas()` to
   rebuild glyphs with the now-correct font, force xterm to recompute the character cell
   (re-apply the font options — e.g. reassign `term.options.fontFamily` / nudge
   `fontSize` so xterm's char-size service re-measures), then `term.refresh(0, term.rows
   - 1)` and `fit.fit()`. Replace the current bare `document.fonts?.ready.then(safeFit)`
   (`terminalPool.ts:241`) with this stronger sequence.
3. Keep this **cross-platform and harmless on macOS** — making font loading explicit and
   rebuilding the atlas after load is correct on both OSes (macOS already looks right, so
   it must stay right).

**Documented fallback — DOM renderer on Windows (drop WebGL on Windows):** if real-box
Windows testing shows the jiggle persists with the primary fix (i.e. it's a deeper WebGL
glyph-atlas / devicePixelRatio artifact, the same class already worked around for
detached windows), **extend the existing WebGL gate** so the main window also uses the
**DOM renderer on Windows** — generalize the `IS_MAIN_WINDOW` condition at
`terminalPool.ts:151` to `IS_MAIN_WINDOW && !isWindows(platform)`. The DOM renderer
lays out real text, which loads the webfont correctly and sidesteps the GL atlas
entirely (visually equivalent, at the cost of GPU acceleration on Windows — accepted
only if needed). This mirrors the documented detached-window precedent.

**Out of scope:**

- Changing the font itself, adding new weights, or the UI (non-terminal) font.
- macOS rendering (must remain unchanged/crisp).
- Bundling/installing JetBrains Mono as a system font (it ships as a webfont via
  `@fontsource`; the fix is about loading/applying it in xterm, not OS installation).

**Cross-platform (hard requirement):** the primary fix is OS-neutral (explicit font load
+ atlas rebuild runs on both OSes, no `#[cfg]`/platform branch needed) and must keep
macOS crisp. The fallback uses the established `platform`/`isWindows(platform)` signal
(read from the store, as the WebLinks handler reads `metaKey || ctrlKey`) to gate the GL
renderer. Verify macOS terminals are visually identical before/after.

**Subtasks**

1. [ ] In `src/components/Terminal/terminalPool.ts` `createHost`, add an explicit
   `document.fonts.load(...)` for the JetBrains Mono weight(s) at the configured font
   size, awaited before the rebuild step.
2. [ ] Replace `void document.fonts?.ready.then(safeFit)` (line 241) with: on font load,
   if not disposed → `webgl?.clearTextureAtlas()`, force xterm to re-measure the char
   cell (re-apply font options), `term.refresh(0, term.rows - 1)`, then `safeFit()`.
3. [ ] Confirm the change is a no-op visual on macOS (still crisp) via a local run; build
   + lint pass: `npm run build`, `npm run lint`, `npm test`.
4. [ ] **Real-box verification (Windows):** open an agent terminal on Windows and confirm
   glyphs (notably "C") render crisp in JetBrains Mono, box-drawing aligns, and resizing
   keeps it crisp. If the jiggle persists, apply the **DOM-renderer-on-Windows fallback**
   (generalize the `IS_MAIN_WINDOW` WebGL gate with `!isWindows(platform)`) and re-verify.
5. [ ] Record the Windows outcome (which path resolved it, anything still open) in
   `TRAJECTORY_TO_WINDOWS.md`, per the CLAUDE.md untestable-path rule.

**Acceptance criteria**

- [ ] On **Windows**, agent and shell terminals render text in crisp **JetBrains Mono**
      — no "jiggly"/wobbly glyphs (incl. "C"), correct monospace metrics, aligned
      box-drawing — verified on a real Windows box.
- [ ] The fix survives resize / view re-tile / reparent (the font stays applied; no
      regression to a fallback after a reflow).
- [ ] **macOS unchanged** — terminals render identically to before (crisp).
- [ ] Whichever path resolved it (primary atlas-rebuild, or the DOM-renderer-on-Windows
      fallback) is recorded in `TRAJECTORY_TO_WINDOWS.md`.
- [ ] `npm run build`, `npm run lint`, `npm test` pass.

**Notes**

- **Autonomous decisions (user not answering; logged in `ASSUMPTIONS.md`):**
  - *Primary = explicit `document.fonts.load` + WebGL atlas rebuild/re-measure*, because
    it addresses the most likely root cause (atlas built before the webfont loads; a
    canvas renderer never triggers the webfont fetch) **and preserves GPU rendering** on
    Windows.
  - *Fallback = DOM renderer on Windows* (generalize the detached-window WebGL gate),
    chosen as the safety net because the "jiggly" symptom matches the WebGL glyph-atlas
    artifact this codebase already works around for detached windows. Accepted only if
    the primary fix doesn't fully resolve it on a real box; it trades GPU acceleration
    on Windows for guaranteed-correct text.
  - This is a **Windows-only GUI rendering path that can't be unit-tested here** (no
    Windows box, no live WebView2/ConPTY), so the plan is implement-for-both + real-box
    verify + log to `TRAJECTORY_TO_WINDOWS.md`.
- **Assumption:** the symptom is font-load/atlas timing (not a corrupt `@fontsource`
  bundle); the font is bundled and works on macOS, so the bundle is intact — the defect
  is in *applying* it under WebGL on Windows.
- **Depends on: none** — self-contained terminal-rendering fix on shipped code.
- References: `terminalPool.ts:117-160` (xterm create + WebGL gate + the detached-window
  precedent comment), `terminalPool.ts:173-179` (`safeFit`), `terminalPool.ts:241`
  (`document.fonts.ready` hook to replace), `src/main.tsx:3-5` (`@fontsource` import),
  `src/styles/tokens.css:69` (`--mono`), `src/styles/global.css:142` (a DOM `--mono`
  use), `src/platform.ts` (`isWindows`), `TRAJECTORY_TO_WINDOWS.md`.
