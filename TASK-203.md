### 203. [ ] Restyle the sidebar-footer update indicator: inset, slimmer, less prominent

**Status:** Not started
**Depends on:** none
**Created:** 2026-06-27

**Description**

The in-app **update indicator** chip in the sidebar footer (#190) is too loud. Today it
reads as a primary call-to-action: a full-width box with a solid accent border, an
accent-tinted fill, a 15px icon, and a stacked two-line label — and on hover it floods to
a solid accent fill. For something that is *available-but-optional* (and inert until a
signed release exists), this over-emphasizes. The user wants it restyled to be **inset
from the sidebar's edges, smaller, thinner, slicker, and less prominent** — a quiet,
tasteful hint rather than a banner.

This is a **pure visual restyle** of one existing, shipped component. No behavior, store,
or IPC changes.

**The component as it stands:**

- `src/components/Update/UpdateIndicator.tsx` — a sidebar-footer `<button>`, mounted in
  `src/components/Sidebar/Sidebar.tsx` (~line 1648) directly **above** the `.footer` div
  (the Settings gear + collapse chevron). Hidden unless `update.status` is `"available"`
  or `"error"`. On click it opens Settings → Updates (`setSettingsOpen(true, "updates")`).
  In the collapsed rail (`sidebarCollapsed`) it renders **icon-only** (the `.indicatorText`
  span is omitted). The available state shows a `Download` icon + "Update available" title
  + a "v<version>" line; the `error` state shows "Update failed" with an
  `indicatorError` modifier.
- `src/components/Update/Update.module.css` — the relevant classes are
  `.indicator`, `.indicator:hover`, `.indicatorError`, `.indicatorError:hover`,
  `.indicatorIcon` (+ hover/error variants), `.indicatorText`, `.indicatorTitle`,
  `.indicatorVersion` (+ hover variants). Current `.indicator`: `width: 100%`,
  `margin-bottom: var(--space-6)` (**no horizontal margin → touches the sidebar edges**),
  `padding: var(--space-6) var(--space-8)`, `border: 1px solid var(--accent)`,
  `background: var(--accent-dim)`, `gap: var(--space-8)`. The text block is a 2-line
  column (`.indicatorText { flex-direction: column }`). Hover floods to
  `background: var(--accent); color: var(--accent-fg)`.
- The **other footer/sidebar controls** for reference: `.footer` (in
  `Sidebar.module.css`) has `padding: 0 var(--space-8)`; the New/Schedule buttons inset
  `var(--space-12)` on each side; spacing tokens are `--space-2/4/6/8/12/16` and radii
  `--radius-control` (7px) / `--radius-chip` (5px); type sizes `--fs-meta` (12) /
  `--fs-meta-sm` (11) / `--fs-meta-xs` (10).

The four requested qualities map to concrete changes (recommended values — the implementer
may fine-tune within the intent):

1. **Inset from the left-panel borders.** Remove `width: 100%` (the sidebar is a column
   flex, so the button stretches by default) and give it horizontal + bottom margins so it
   no longer touches the sidebar edges. Recommended `margin: 0 var(--space-8)
   var(--space-8)` so its left edge aligns with the footer's `0 var(--space-8)` content
   inset directly below it.
2. **Smaller / thinner.** Reduce vertical padding (recommended `var(--space-4)
   var(--space-8)`); shrink the `Download` icon to ~13px; tighten the gap to
   `var(--space-6)`. **Collapse the label to a single line** (icon + title + version on one
   baseline-aligned row) instead of the current two-line stack — this is the main "thinner"
   move. The version stays mono/`--fs-meta-xs`; the title drops to `--fs-meta-sm` (or stays
   there). The whole label truncates with an ellipsis as before.
3. **Slicker / less prominent.** Drop the solid accent fill and full accent border. Use a
   **hairline border** (`var(--border-hairline)`) and a transparent (or no) background, so
   the only accent touch is the **icon color**. Hover becomes a **subtle** `var(--bg-hover)`
   with `var(--text-primary)` — **not** the full accent flood it does today.
4. **Error variant stays consistent.** Apply the same slim shape (inset, single-line,
   reduced padding/icon) to `.indicatorError`; keep `var(--status-error)` as the icon tint
   and a subtle error-tinted hairline border, transparent background, subtle hover.

**Collapsed rail:** ensure the icon-only state still looks tidy — centered in the inset
button (add `justify-content: center` and/or a collapsed modifier so the icon isn't
left-stuck), parity with the footer buttons. Keep the rail behavior (text hidden) exactly
as today; this is just making sure the new margins/centering don't misalign the icon.

**Scope**

- Restyle **only** the sidebar-footer indicator chip: the `.indicator*` classes in
  `Update.module.css`, and any minimal markup tweak in `UpdateIndicator.tsx` needed to put
  the label on one line (e.g. switching `.indicatorText` to a row, or a small class change)
  and to center the icon when collapsed.
- Keep all existing behavior: hidden when idle/checking/downloading, shows on
  `available`/`error`, click opens Settings → Updates, collapses to icon-only in the rail,
  same `title`/`aria-label` text.

**Out of scope**

- **No** changes to the `UpdateModal`, the install/progress overlay, or any `.overlay /
  .dialog / .installBox / .progress*` styles in the same CSS module.
- **No** changes to the Settings → Updates pane (`components/Settings`).
- **No** store / IPC / updater-logic changes (`src/updater.ts`, the `update` store slice),
  and **no** change to *when* the indicator appears or *what* it links to.
- No new design tokens unless an existing one genuinely doesn't fit (prefer the existing
  `--space-*`, `--border-hairline`, `--radius-control`, `--accent`, `--status-error`,
  `--bg-hover` tokens).

**Subtasks**

1. [ ] Restyle `.indicator` in `Update.module.css`: remove `width: 100%`; add
   `margin: 0 var(--space-8) var(--space-8)`; reduce padding to `var(--space-4)
   var(--space-8)`; swap `border: 1px solid var(--accent)` → `1px solid
   var(--border-hairline)`; remove the `background: var(--accent-dim)` fill (transparent);
   tighten `gap` to `var(--space-6)`.
2. [ ] Restyle `.indicator:hover`: subtle `background: var(--bg-hover)` +
   `color: var(--text-primary)` (drop the accent flood); keep `.indicatorIcon` accent-tinted
   and not forced to `inherit` on hover (so the accent touch persists), or tune as looks best.
3. [ ] Make the label single-line: in `UpdateIndicator.tsx` (and/or CSS) lay out
   `.indicatorText` as a baseline-aligned **row** (`flex-direction: row; align-items:
   baseline; gap: var(--space-4)`); keep title (`--fs-meta-sm`) + version (mono,
   `--fs-meta-xs`, `--text-secondary`) and ellipsis-truncation.
4. [ ] Shrink the `Download` icon to ~13px (`size={13}`) in `UpdateIndicator.tsx`.
5. [ ] Apply the same slim treatment to `.indicatorError` / `.indicatorError:hover`:
   inset, single-line, reduced padding; `var(--status-error)` icon + subtle error hairline
   border; transparent bg; subtle hover.
6. [ ] Ensure the **collapsed rail** icon-only state stays centered and tidy with the new
   margins (e.g. `justify-content: center` and/or a collapsed modifier class driven by the
   existing `collapsed` flag); confirm text stays hidden as today.
7. [ ] Run `npm run build`, `npm run lint`, `npm run format:check` (or `npm run format`),
   and (since this is GUI-only and the updater is inert) exercise both states via the dev
   mock (#193) — `setUpdateState` to `available` and `error` — to eyeball the result in the
   expanded sidebar **and** the collapsed rail.

**Acceptance criteria**

- [ ] The indicator no longer spans edge-to-edge: it is visibly **inset** from the
  sidebar's left/right borders (and its bottom is inset from the footer), aligned with the
  footer's content inset.
- [ ] It is **thinner** (single-line label, reduced vertical padding) and **smaller** (icon
  ~13px) than before.
- [ ] It reads as **less prominent**: no solid accent fill, hairline border, accent
  reserved to the icon; hover is a subtle background change, not a full accent flood.
- [ ] The **error** state matches the new slim, inset, low-prominence treatment.
- [ ] In the **collapsed rail** the chip shows the icon only, centered, with no overflow or
  misalignment.
- [ ] Behavior is unchanged: hidden when idle; appears on `available`/`error`; click opens
  Settings → Updates; same `title`/`aria-label`.
- [ ] `npm run build`, `npm run lint`, and Prettier all pass.

**Notes**

- **Autonomous refine (2026-06-27).** Per the standing directive in `ASSUMPTIONS.md`
  (2026-06-26) the user no longer answers refine-loop questions; the design decisions below
  were made autonomously and are logged in `ASSUMPTIONS.md` under TASK-203. They are
  *recommendations* — the implementer may tune exact px/token values within the stated
  intent (inset · smaller · thinner · slicker · less prominent).
  - **Margin = `var(--space-8)` (8px) sides/bottom**, aligning with the footer's `0
    var(--space-8)` inset directly below — chosen over the New/Schedule buttons' 12px so the
    chip ties visually to the footer it sits above. Trivially retunable.
  - **Single-line label** chosen as the primary "thinner" move (over keeping the two-line
    stack with smaller fonts).
  - **Hairline border + transparent fill, accent only on the icon** chosen as the
    "less-prominent / slicker" treatment (over keeping a lighter accent border, or removing
    the border entirely). The icon keeps the accent so the chip still reads as a positive,
    actionable hint.
  - **Error variant restyled to match** (rather than left as-is) for consistency.
- This is a pure restyle of the **shipped** #190 component — no dependency on any open task.
- Key files: `src/components/Update/UpdateIndicator.tsx`,
  `src/components/Update/Update.module.css`. Reference context (do not edit): the footer
  markup in `src/components/Sidebar/Sidebar.tsx` (~line 1648) and `.footer` /
  `.footerButton` in `src/components/Sidebar/Sidebar.module.css`; tokens in
  `src/styles/tokens.css`.
- The updater is inert today (no signed release → `checkForUpdate` returns null), so the
  only way to see the indicator at runtime is the dev mock (#193, `setUpdateState`).
