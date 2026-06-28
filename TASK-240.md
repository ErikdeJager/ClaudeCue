# TASK-240

### 240. [ ] Make the Kanban "Add card" / "Cancel" buttons roomier (fix their dropped padding from the undefined `--space-10` token)

**Status:** Not started
**Depends on:** none
**Created:** 2026-06-28

**Description**

The Kanban add-card composer's **"Add card"** and **"Cancel"** buttons look cramped — the
text sits flush against the button edges. The root cause is a **bug**, not just a styling
preference: both buttons declare `padding: var(--space-2) var(--space-10)`
(`src/components/Kanban/KanbanPanel.module.css`, `.composerAdd` and `.composerCancel`),
but **`--space-10` is not defined** in `src/styles/tokens.css` — the spacing scale is
`--space-1/2/4/6/8/12/16/20/24/32`, with **no `--space-10`**. A `var()` referencing an
undefined custom property with **no fallback** makes the whole `padding` shorthand
*invalid at computed-value time*, so the buttons fall back to `padding: 0` and get
**effectively zero horizontal padding**.

This task makes those two buttons **a bit bigger with comfortable padding** by replacing
the broken token with **valid** spacing tokens.

**User decisions (step 5):**

- **Scope = just the Kanban "Add card"/"Cancel" buttons** — i.e. `.composerAdd` and
  `.composerCancel` only. (Because **#238** made the inline-edit **Save**/**Cancel**
  buttons reuse these same two classes, they get the roomier padding too — consistent and
  intended.) The broader `--space-10` undefined-token bug at the **other 6 sites**
  (FileViewer, DiffInspector, Canvas, TemplateEditor) **and** the two other `--space-10`
  uses elsewhere in `KanbanPanel.module.css` (lines ~52 and ~534, different elements) are
  **out of scope** — flagged for a separate card (added to Refine alongside this one).
- **More padding only** — keep the current text size (`--fs-meta-sm` = 11px); just give
  the buttons comfortable breathing room (≈6px vertical, ≈12px horizontal). No font-size
  change.

**Grounding (current code).**

- `src/components/Kanban/KanbanPanel.module.css`:
  - `.composerAdd` (~line 696): `padding: var(--space-2) var(--space-10);` + accent fill,
    `font-size: var(--fs-meta-sm)`.
  - `.composerCancel` (~line 686/710): `padding: var(--space-2) var(--space-10);` +
    transparent/outline, `font-size: var(--fs-meta-sm)`.
  - These two classes are used by **both** the create composer (`KanbanPanel.tsx` ~lines
    518/525, "Add card"/"Cancel") **and** the #238 inline-edit action row
    (`.cardEditActions`, ~lines 211/218, "Save"/"Cancel").
- `src/styles/tokens.css`: spacing tokens `--space-1: 1px … --space-32: 32px` — **no
  `--space-10`** (confirmed: not defined anywhere in `src/`).

**Subtasks**

1. [ ] In `KanbanPanel.module.css`, change **`.composerAdd`** padding from
   `var(--space-2) var(--space-10)` to a valid, roomier value — **`var(--space-6)
   var(--space-12)`** (6px vertical, 12px horizontal). Keep `font-size: var(--fs-meta-sm)`.
2. [ ] Make the **`.composerCancel`** padding match (`var(--space-6) var(--space-12)`) so
   the two buttons stay the same height/size.
3. [ ] Confirm via the app (or DevTools) that the buttons now have real padding and read
   as comfortably sized in **both** the create composer **and** the #238 inline-edit
   action row (same classes). Optionally verify the buttons align with the textarea above.
4. [ ] **Do not** touch the other `--space-10` sites (out of scope — separate card). **Do
   not** alter font size, colors, borders, or layout beyond the padding.
5. [ ] Verify: `npm run build`, `npm run lint`, `npm test` pass.

**Acceptance criteria**

- [ ] The Kanban **"Add card"** and **"Cancel"** buttons have visible, comfortable
      horizontal **and** vertical padding (text no longer flush to the edges) and read as
      slightly bigger.
- [ ] Both buttons use **defined** spacing tokens (no `var(--space-10)` remains in
      `.composerAdd`/`.composerCancel`); the padding is no longer dropped to 0.
- [ ] The text size is unchanged (still `--fs-meta-sm`); only padding changed.
- [ ] The #238 inline-edit **Save**/**Cancel** buttons (which share these classes) inherit
      the same roomier padding — no separate regression.
- [ ] No other component's buttons change (the other `--space-10` sites are untouched).
- [ ] `npm run build`, `npm run lint`, `npm test` pass. Pure CSS — identical on macOS and
      Windows.

**Notes**

- **Root cause:** `--space-10` is undefined → `padding: var(--space-2) var(--space-10)` is
  invalid-at-computed-value → padding becomes `0`. Replacing with valid tokens both fixes
  the dropped padding and satisfies "a bit bigger with more padding."
- **User answers (step 5):** scope = **just the two Kanban composer buttons** (which also
  cover #238's edit Save/Cancel via shared classes); **more padding only**, keep 11px text;
  target ≈`var(--space-6) var(--space-12)`.
- **Separate follow-up (flagged, not in this task):** `--space-10` is referenced at ~8
  sites but never defined — a latent zero-padding bug across FileViewer, DiffInspector,
  Canvas, TemplateEditor, and two other `KanbanPanel.module.css` elements. A companion
  Refine card tracks fixing it globally (define `--space-10: 10px` in tokens.css, or
  replace every `var(--space-10)` with a defined token). This task does **not** depend on
  it.
- **Dependencies:** none. Builds on shipped Kanban CSS (#233/#238). Independent of #239
  (Kanban column colors) though both touch `KanbanPanel.module.css` in different rules.
- **Cross-platform:** pure CSS, no OS-specific anything — renders identically in WKWebView
  (macOS) and WebView2 (Windows).
