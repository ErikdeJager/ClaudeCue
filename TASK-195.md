# Task 195

### 195. [x] Clean up Kanban card UI — hover-revealed actions, declutter the title row

**Status:** Done
**Depends on:** #194
**Created:** 2026-06-26

**Description**

The Kanban card (`src/components/Kanban/KanbanPanel.tsx`, the `Card` render + `CardPreview`)
packs everything into one inline row (`.cardTop`): drag **grip** → **checkbox** → **title**
→ a `.cardActions` group with the **edit (pencil)** and **delete (trash)** buttons. Those
always-visible action icons sit immediately after the title and **crowd it**, and the
overall card reads as cramped/busy. Redesign for a cleaner look by **repositioning the
checkbox and action icons**.

**Web research (the card asked for it).** Modern Kanban cards (Trello, Linear-style, current
shadcn/ui kanban templates) converge on one pattern: **action buttons are hidden by default
and revealed on hover/focus** (typically a top-right cluster), keeping the resting card clean
and giving the **title full width**; the checkbox stays small/subtle at the left; the body /
metadata sit below. (Sources in Notes.) This task applies that pattern.

**Target design.**
- **Title gets the full row width.** Remove the inline `.cardActions` from the flex flow so
  it no longer competes with the title for horizontal space.
- **Edit + delete move to a hover/focus-revealed cluster** absolutely positioned in the card's
  **top-right corner**: hidden at rest (`opacity: 0` / `pointer-events: none`), shown on
  `.card:hover` **and** `.card:focus-within` (so keyboard users reach them too). Add a small
  right padding / gradient-safe spacing to the title so revealed buttons never overlap text.
- **Checkbox** stays at the **left** of the title, small and quiet. **Must handle #194's
  optional checkbox**: when `card.checked === null` render **no** checkbox and let the title
  align flush-left (no empty gap).
- **Drag grip**: keep dnd working but make the grip **subtle** — a quiet hover-revealed
  affordance (or fold the listeners onto the card/title area) rather than a permanent column
  of its own. Don't re-architect the dnd wiring (it stays on the same element that holds
  `{...attributes} {...listeners}`); just restyle/reposition it.
- **Edit mode unchanged in capability**: while `editing`, the title `<input>`, body
  `<textarea>`, and the **Done (check)** button stay **visible** (not hover-gated — you're
  actively editing). The Done button can live in the same top-right cluster but forced-visible
  in edit mode.
- **Body + markdown rendering, drag overlay (`CardPreview`), `cardDone` styling, and all
  behavior (toggle, edit, delete, drag, body task-list checkboxes #173) are preserved** —
  this is a **layout/CSS** refactor, not a behavior change. Keep `CardPreview` visually
  consistent (it already omits the action buttons).

**Scope.** `KanbanPanel.tsx` card markup (move `.cardActions` out of the inline flow; ensure
the null-checkbox case) + `KanbanPanel.module.css` (positioning, hover/focus reveal, spacing,
title width). Visual/structural only.

**Out of scope.**
- The optional-checkbox parsing/round-trip itself (that's **#194** — this depends on it and
  must render the `null` case, but doesn't re-implement it).
- Card content features (labels, due dates, avatars) — not requested; only repositioning the
  existing checkbox + actions for a cleaner layout.
- Column/lane layout, the Board/Raw toggle, or the engine.
- Touch-only devices have no hover — keep actions reachable via `:focus-within` (tab) and the
  existing inline edit-on-title-click, so functionality never depends solely on hover.

**Concrete files/symbols.**
- `src/components/Kanban/KanbanPanel.tsx` — the `Card` component's `.cardTop` (grip ~155–164,
  `<Checkbox>` ~165–170, title button/input ~171–199, `.cardActions` edit/delete ~200–231)
  and `CardPreview` (~263–298). Move `.cardActions` to a hover/focus-revealed corner cluster;
  gate the `<Checkbox>` on `card.checked !== null` (per #194).
- `src/components/Kanban/KanbanPanel.module.css` — `.card`, `.cardTop`, `.cardActions`,
  `.cardBtn`, `.cardTitle`, `.cardCheck`, `.cardGrip`: relative card, absolute top-right
  actions, hover/focus reveal, title full-width, checkbox/grip subtlety.

**Subtasks**

1. [x] Restructured the `Card` markup: the edit/delete (+ edit-mode Done) `.cardActions`
   `<span>` moved **out** of `.cardTop` to be a direct child of the `.card` article, so the
   title's flex row is just `[grip] [checkbox?] [title]`.
2. [x] CSS: `.card { position: relative }`; `.cardActions` `position: absolute` top-right,
   `opacity: 0` + `pointer-events: none` at rest, revealed (opacity 1 + pointer-events auto)
   on `.card:hover, .card:focus-within` with the existing short opacity transition (the
   global `prefers-reduced-motion` killswitch drops it); a left→right card-colored
   **gradient backdrop** so a long title fades cleanly under the buttons; title
   `padding-right` (and a larger one on the editing input so its text clears Done). The grip
   stays the existing subtle hover/focus-revealed affordance (#161).
3. [x] No checkbox when `card.checked === null` (#194, already gated by the conditional
   `<Checkbox>`); with the actions out of flow the title now spans the row.
4. [x] `CardPreview` is consistent — it already omits the actions and shares `.cardTop` /
   `.cardTitle`, so the new resting layout (full-width title, no action icons) applies to it
   unchanged.
5. [x] **Verify** — `npm run build`, `npm run lint`, `npm test` (277) green; **no Rust
   changes**; both files prettier-clean. The live hover/focus reveal is **runtime-unverified**
   in this loop (no GUI) — see Notes.

**Acceptance criteria**

- [x] The edit + delete icons are **not shown at rest** (`opacity:0`/`pointer-events:none`);
      they appear on card **hover or focus-within** (keyboard-reachable) in the top-right, and
      no longer crowd the title (they're out of its flex flow). _(Live reveal
      runtime-unverified — see Notes.)_
- [x] The title spans the full card width at rest (actions absolute, not reserving flex
      space — only a small right-padding buffer); a card with **no checkbox** (#194 `null`)
      renders with no empty checkbox gap (the `<Checkbox>` is omitted).
- [x] All existing behavior is intact — only DOM position/CSS changed: toggle, click-to-edit,
      edit Done, delete, drag/reorder (incl. `CardPreview` overlay), and body task-list
      checkboxes (#173) keep their handlers/markup.
- [x] `npm run build`, `npm run lint`, `npm test` pass; no Rust changes.

**Notes**

- **Autonomous refine (2026-06-26):** user not responding; decisions logged in
  `ASSUMPTIONS.md`.
  - **Adopted the researched pattern: hover/focus-revealed top-right action cluster** +
    full-width title + quiet checkbox/grip (Trello / Linear / shadcn-kanban convention).
  - **Keyboard/touch fallback:** reveal on `:focus-within` too (not hover-only), and keep
    click-to-edit on the title, so actions never depend solely on hover.
  - **Layout-only** — no dnd re-architecture, no new card content (labels/dates), behavior
    preserved.
  - **Must render #194's `null` checkbox case** (no checkbox) — hence the dependency.
- **Depends on: #194** — the redesign must handle the optional (no-checkbox) card #194 adds;
  building this first would conflict on `KanbanPanel`'s checkbox render. Lowest-number-first
  ordering implements #194 before #195.
- **Sources (web research, per the card):**
  [shadcn/ui Kanban templates 2026](https://adminlte.io/blog/shadcn-ui-kanban-templates/) ·
  [Card UI design examples 2026](https://bricxlabs.com/blogs/card-ui-design-examples) ·
  [Kanban board UI system design](https://medium.com/@agrawalkanishk3004/kanban-board-ui-system-design-35665fbf85b5)
  — common finding: edit/remove buttons appear on hover to keep the card clean.
- **References:** `KanbanPanel.tsx` (`Card` ~145–257, `CardPreview` ~263–298),
  `KanbanPanel.module.css` (`.cardTop`/`.cardActions`/`.cardBtn`/`.cardTitle`/`.cardCheck`);
  TASK-194.md (optional checkbox). CLAUDE.md "markdown Kanban board (#141…)".

**Implementation notes (2026-06-26 — done)**

- **The premise was already partly true:** a prior refinement (#161) had *already* made the
  grip **and** the actions hover/focus-revealed (`opacity:0` → revealed on
  `.card:hover, .card:focus-within`). So the residual problem wasn't "always-visible" icons —
  it was that the `.cardActions` cluster still sat **in the flex flow** (reserving ~50px of
  horizontal space even while invisible), so the title never got that width. The fix moves
  `.cardActions` out of `.cardTop` (absolute top-right), freeing the title to span the row.
- **Overlap handled two ways:** a left→right card-colored gradient on the actions cluster
  (`linear-gradient(transparent → --bg-elevated)`) fades a long title under the buttons, plus
  a `padding-right` buffer on the title (and a larger one on the editing input so typed text
  clears the Done button). `pointer-events: none` at rest lets clicks/hover pass through the
  hidden cluster to the title beneath; `auto` once revealed.
- **Layout/CSS only — no behavior change:** the edit/delete/Done buttons keep their exact
  handlers; only their DOM position (out of `.cardTop`) and the CSS changed. dnd wiring is
  untouched (grip still holds `{...attributes}{...listeners}`). The `#194` null-checkbox path
  is unchanged (conditional `<Checkbox>`). 277 engine/ops tests still pass.
- **Grip kept as-is:** the plan allowed "restyle/reposition... rather than a permanent column"
  but warned against re-architecting dnd. The grip is already a subtle hover/focus-revealed
  affordance (#161); the remaining ~13px it reserves is the drag handle's slot, separate from
  the "checkbox gap" AC2 targets (which #194 already removed). Left it to avoid a hover
  layout-shift and to honor "don't re-architect the dnd wiring".
- **Runtime-unverified (autonomous loop, no GUI session):** the live look of the resting card
  + the hover/focus reveal + the gradient fade. The change is pure layout/CSS, type-checks,
  lints, and leaves every handler/markup intact; recommend a quick `npm run tauri dev` pass on
  a Kanban board (hover a card; check a no-checkbox card; edit/delete/drag still work).
