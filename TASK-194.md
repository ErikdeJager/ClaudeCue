# Task 194

### 194. [x] Kanban: optional card checkbox — render plain `- bullet` lines as cards

**Status:** Done
**Depends on:** none
**Created:** 2026-06-26

**Description**

The Kanban engine (`src/components/Kanban/kanban.ts`) only treats a list item as a **card**
when it has a checkbox: `CARD_RE = /^- \[([ xX])\] ?(.*)$/` matches `- [ ] title` / `- [x]
title`. A **plain `- bullet`** (no `[ ]`/`[x]`) matches nothing in the parse loop and hits
the catch-all `flushCard()` (kanban.ts ~line 132), so it is **silently dropped** — the card
disappears from the board, and a parse → serialize round-trip **loses** it. The user wants a
card to be able to have **no checkbox**: a plain bullet should render as a card and
**round-trip back unchanged** as `- title`.

**Goal & why.** Make the checkbox **optional** on a card. Hand-authored Obsidian/markdown
boards (and other tools) often use plain `- bullet` items; today those vanish in ClaudeCue.
Supporting a no-checkbox card makes the board lossless for that content and lets a user keep
plain bullets as cards.

**Design — a tri-state `checked`.**
- **Data model** (`Card` in `kanban.ts`): change `checked: boolean` → **`checked: boolean |
  null`**, where `null` = **no checkbox** (`- title`), `false` = `- [ ]`, `true` = `- [x]`.
  Update the doc comment.
- **Parse** (`parseBoard`): after `CARD_RE` fails, test a new **plain-bullet** branch — a
  top-level `- ` line that isn't a checkbox card — e.g. `PLAIN_CARD_RE = /^- (.*)$/` (tried
  **after** `CARD_RE`, so `- [ ]`/`- [x]` still win; the indent-body, `**Complete**`, and
  heading checks already run earlier so they're unaffected). A match → start a card with
  `checked: null` and `title = match[1]`. A bare `- ` → empty title (still a card). Body
  continuation (tab/4-space indented lines) attaches exactly as for checkbox cards.
- **Serialize** (`serializeBoard`): emit `null` as **`- ${title}`** (no bracket), `false`/
  `true` as `- [ ] `/`- [x] ` as today:
  `const prefix = card.checked === null ? "- " : \`- [${card.checked ? "x" : " "}] \`;`.
  Guarantees `- title` ⇄ `{checked:null}` round-trips byte-stable.
- **Render** (`KanbanPanel.tsx`): at the two card render sites that use `card.checked`
  (`<Checkbox checked={card.checked}>` ~lines 165 & 274, and the `card.checked ?
  styles.cardDone` class ~lines 149 & 267), when `checked === null` **omit the `<Checkbox>`**
  entirely and don't apply `cardDone`. The card still shows its title/body and stays
  draggable / editable / deletable. (`Checkbox`'s `checked` prop is boolean, so a null card
  must not render it rather than coercing.)
- **Ops** (`kanbanOps.ts`): `addCard` (UI-created cards) keeps defaulting to **`checked:
  false`** (UI makes checkbox cards; plain bullets come from the markdown). `toggleCard` is
  only reachable from the checkbox, which a null card doesn't render, so null cards aren't
  toggled; keep `toggleCard` flipping the boolean and leave `null` untouched if it ever
  receives one (guard: `null` stays `null`, or document it's unreachable). `moveCard`/edit/
  delete must **preserve `checked` as-is** (including `null`) — the `**Complete**` lane marker
  is a column property, not per-card, so a move never rewrites `checked`.

**Scope.** The engine round-trip + the minimal render handling for a no-checkbox card.

**Out of scope.**
- The card-UI redesign ("Clean up Kanban card UI" card) — separate; this only adds the
  no-checkbox case (note: that redesign should account for the optional checkbox).
- A UI affordance to *add* a checkbox-less card or to remove a card's checkbox (not required;
  plain bullets originate from the markdown). Out of scope unless trivial.
- Numbered lists / other bullet markers (`*`, `+`) — only `- ` bullets (the Obsidian-Kanban
  marker), matching the existing engine.

**Concrete files/symbols.**
- `src/components/Kanban/kanban.ts` — `Card.checked` type; `parseBoard` plain-bullet branch
  + `PLAIN_CARD_RE`; `serializeBoard` prefix.
- `src/components/Kanban/kanban.test.ts` — round-trip + parse tests.
- `src/components/Kanban/KanbanPanel.tsx` — omit `<Checkbox>` + `cardDone` when `checked ===
  null` (both render sites).
- `src/components/Kanban/kanbanOps.ts` (+ `kanbanOps.test.ts`) — `addCard` default stays
  `false`; ensure move/edit/delete preserve `null`.

**Subtasks**

1. [x] `kanban.ts`: `Card.checked: boolean | null` (+ doc); `PLAIN_CARD_RE = /^- (.*)$/` + a
   plain-bullet branch in `parseBoard` **after** `CARD_RE`; `serializeBoard` emits `null` →
   `- ${title}` (else `- [ ] `/`- [x] `).
2. [x] `kanban.test.ts` (+4 tests): parse `- plain` → `checked: null`; a plain bullet keeps an
   indented body; **byte-stable round-trip** of a column mixing `- plain`, `- [ ]`, `- [x]`, a
   bodied plain bullet, and a bare `- ` empty-title card; a null-checked model round-trips
   deep-equal.
3. [x] `KanbanPanel.tsx`: both render sites omit `<Checkbox>` when `checked === null` (the
   `cardDone` class already no-ops on the falsy `null`); the grip/drag listeners, title edit,
   and delete button are untouched, so a plain card stays draggable/editable/deletable.
4. [x] `kanbanOps.ts`: `newCard` still defaults `checked: false`; `toggleCard` guards `null`
   (stays `null`, never `true`); `move`/`update`/`delete` already preserve `checked` as-is.
   `kanbanOps.test.ts` +3 tests (newCard default, toggle-null no-op, move preserves null).
5. [x] **Verify** — `npm run build`, `npm run lint`, `npm test` (277, +7) green; **no Rust
   changes**. The live `.md`-board render is **runtime-unverified** in this loop (no GUI), but
   the lossless round-trip — the disappearing-card bug's fix — is unit-tested; see Notes.

**Acceptance criteria**

- [x] A plain `- bullet` line under a column **renders as a card** (no checkbox) instead of
      disappearing — `parseBoard` now keeps it (`checked: null`) and `KanbanPanel` renders it
      without a checkbox.
- [x] `parseBoard` → `serializeBoard` **round-trips a plain bullet byte-for-byte** as
      `- title` (unit-tested), alongside `- [ ]`/`- [x]` cards (existing round-trips
      unaffected — checkbox serialization is byte-identical).
- [x] A no-checkbox card is draggable / editable / deletable like any other (only the checkbox
      is omitted; all other card chrome is unchanged); UI-created cards still get a `- [ ]`
      checkbox (`newCard` → `checked: false`).
- [x] `npm run build`, `npm run lint`, `npm test` pass; no Rust changes.

**Notes**

- **Autonomous refine (2026-06-26):** user not responding; decisions logged in
  `ASSUMPTIONS.md`.
  - **Tri-state `checked: boolean | null`** (null = no checkbox) is the minimal lossless model;
    chosen over a separate `hasCheckbox` flag.
  - **Only `- ` bullets** (the engine's existing marker); `*`/`+`/numbered lists stay out.
  - **UI-created cards still default to a `- [ ]` checkbox**; plain bullets originate from the
    markdown. No new UI to toggle a card's checkbox on/off (out of scope).
  - **`**Complete**` lane marker is per-column, not per-card**, so moves never rewrite
    `checked` — a no-checkbox card stays no-checkbox when moved.
- **Depends on: none** — a self-contained Kanban-engine + minimal-render change. Touches
  `KanbanPanel` but is independent of the "Clean up Kanban card UI" card (which should account
  for the optional checkbox when it's refined/built).
- **References:** `kanban.ts` (`CARD_RE` ~49, `parseBoard` loop ~97–134, `serializeBoard`
  ~145–163, `Card` ~20); `KanbanPanel.tsx` (`<Checkbox checked={card.checked}>` ~165/274,
  `cardDone` ~149/267); `kanbanOps.ts` (`addCard`/`toggleCard`/`moveCard`). CLAUDE.md
  "markdown Kanban board (#141…)".

**Implementation notes (2026-06-26 — done)**

- Implemented exactly as the tri-state plan: `Card.checked: boolean | null` (`null` = plain
  bullet). Files: `kanban.ts`, `kanban.test.ts`, `kanbanOps.ts`, `kanbanOps.test.ts`,
  `KanbanPanel.tsx`. **No Rust changes.**
- **`cardDone` needed no change:** `card.checked ? styles.cardDone : ""` already evaluates
  `null` as falsy → no `cardDone`, exactly the desired behaviour; only the `<Checkbox>` (whose
  prop is strictly `boolean`) had to be conditionally omitted (`{card.checked !== null && …}`).
- **Bare `- ` round-trips:** a dash-space-only line parses to `{title:"", checked:null}` and
  serializes back to `- ` — covered in the mixed round-trip test, so even an empty plain
  bullet is lossless.
- **`toggleCard` null guard** is defensive only (a `null` card renders no checkbox, so the
  toggle is UI-unreachable) — but it keeps `null` as `null` rather than `!null === true`,
  preventing a future bug if a caller ever toggles one.
- **Runtime-unverified (autonomous loop, no GUI session):** the live render of a plain-bullet
  card and its drag/edit/delete. The fix's core — the parse/serialize round-trip that stops
  the card from being dropped — is unit-tested (7 new cases); the render change is a minimal,
  type-checked checkbox omission that leaves the grip/edit/delete chrome intact. Recommend a
  quick `npm run tauri dev` pass opening a `.md` board with a `- plain` bullet.
