# Assumptions

This file records assumptions and judgment calls made **autonomously** when the user is
not available to answer clarifying questions.

## Standing directive (2026-06-26)

The user stated they will no longer respond in the refine/loop chat. From now on, when a
question would normally go to the user, **make the best decision yourself, proceed, and
record the assumption here** (newest entries at the bottom of the relevant task section).
Each entry: what was ambiguous, the decision taken, and the rationale — enough that the
choice can be revisited later.

---

## TASK-186 — Distribute Canvas panels evenly

The user *did* answer the two refine questions before going silent (recorded in
TASK-186.md Notes): both a tab-strip button **and** a border double-click; "equal size for
every panel" semantics. The following were decided autonomously (the user delegated UX
judgment with "see if this … has good UX"):

- **Border double-click scope = the double-clicked split's subtree (region), not the whole
  canvas.** The tab-strip button equalizes the whole canvas; the border gesture evens out
  only the panels that border divides. Rationale: two distinct, learnable tools beat two
  triggers for the identical action. Trivial to switch to whole-canvas later
  (`equalizeCanvas()` vs `equalizeCanvas(node.id)`).
- **"Equal" = equal area via leaf-count weighting** (each split's sizes ∝ its children's
  leaf counts). Provably gives every panel an equal share; for a simple row it is exact
  equal widths. Chosen over per-split 50/50 (which the user explicitly rejected).
- **Sizes stored as percentages summing to 100** (e.g. `[33.33, 66.67]`) to match the rest
  of the codebase (`[50,50]`, `[70,30]`), even though react-resizable-panels would accept
  relative weights.
- **Visual update via the `Group` `groupRef` imperative `setLayout`, never a key-bump
  remount.** `defaultLayout` is initial-only; a remount would churn the #18 terminal pool.
  A guarded reconcile effect (skip when the live layout already matches) keeps user
  drag-resize a no-op and avoids feedback loops.
- **Button is main-window-only** (the tab strip doesn't exist in detached canvas windows
  #84); the border double-click is the equalize affordance there. Accepted rather than
  duplicating the button into detached windows.
- **Icon = a Lucide "even grid" glyph (`LayoutGrid`/`Grid2x2`), label "Distribute panels
  evenly."** Matches the user's own word "distribute"; final glyph left to the implementer.
- **Button disabled when the active canvas has < 2 panels** (nothing to equalize).
- **10% min-size floor accepted as-is:** equal area past ~10 panels in one nesting chain
  can't dip below each Panel's `minSize="10%"`; the library clamps. No special handling —
  fine for typical 2–6 panel canvases.

---

## TASK-187 — "Save current canvas as template"

- **Trigger = a new item in the existing ▾ Templates menu** ("Save current canvas as
  template…"), not a separate toolbar button. Most consistent with "New template…".
- **Live→block mapping reuses the registry's `liveKind`** (reverse lookup, single source of
  truth) and **reuses each leaf's existing id** so the mapper stays pure/deterministic (no
  `crypto.randomUUID`; the editor deep-clones on open and instantiation reassigns ids).
  Split `dir` + `sizes` preserved.
- **Agent blocks carry the custom session name only** — not the auto-title (#97, not a
  deliberate label) and **not a prompt** (a live agent has a conversation, not a single
  recoverable initial prompt). The user can add a prompt in the editor before saving.
- **`repoPath` dropped** from file/kanban blocks (templates are folder-agnostic; the repo is
  chosen at use time). Only the relative `file` path travels.
- **`diff` → `open-diff` is working-tree only**; a branch-compare (#81) panel is not
  preserved as a compare.
- **`scheduled`/`pending` panels are dropped** (split collapses like `removeLeaf`); a canvas
  with nothing templatable → toast + no-op (don't open an empty editor).
- **Default template name = the active canvas's tab name** (editable before Save).
- **Seeding via new `templateEditorSeed`/`templateEditorSeedName` store fields**, cleared in
  `closeTemplateEditor` (mirrors the mounted-only-while-open editor). The draft is unsaved
  until the user hits Save (consistent with "New template…").
- **Depends on: none** — the whole template system (#117/#118) is already shipped.
