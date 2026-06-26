# Task 186

### 186. [ ] Distribute Canvas panels evenly (tab-strip button + border double-click)

**Status:** Not started
**Depends on:** none
**Created:** 2026-06-26

**Description**

The Canvas (#46/#47) is a binary **BSP tree** (`src/components/Canvas/canvasTree.ts`):
every `split` node carries `sizes: [a, b]` (two percentage shares) and is rendered as a
react-resizable-panels `Group` (`CanvasSurface.tsx`). New panels are added by
`splitLeaf`, which always creates the split `sizes: [50, 50]`. Because the tree is
binary, three panels added to one row nest as
`split(row, leaf1, split(row, leaf2, leaf3))` and end up **50% / 25% / 25%** — visibly
uneven. The user wants a one-shot "distribute / equalize" action that rebalances an
existing layout so **every panel is the same size** (the design-tool "distribute"
operation), without changing the add-time halving behavior.

**Goal & why.** Give the user two ways to even out a canvas:

1. A **"Distribute evenly" button** in the Canvas **tab strip** (`CanvasTabs.tsx`,
   alongside the existing `+` and `▾ Templates` controls) — equalizes the **whole active
   canvas**.
2. **Double-clicking the border** (the resize `Separator`) **between two panels** —
   equalizes just the **region that border divides** (the subtree rooted at that
   `Separator`'s split), giving the user a precise "even out these panels" gesture.

**Semantics ("even" = equal area, leaf-count weighting).** To make every leaf equal
**area**, set each split's `sizes` proportional to the **number of leaves in each child
subtree**: for split `S` with `na` leaves under `a` and `nb` under `b`, use
`sizes = [na/(na+nb) * 100, nb/(na+nb) * 100]`. By induction this gives every leaf an
equal share `1/total` regardless of how rows/cols nest — and for a simple N-panel row it
collapses to exactly equal widths (a 3-panel row → true thirds). This is what the user
confirmed (see Notes): "things on the same row or column are just as big as each other."
(The naive alternative — resetting each split to `[50, 50]` — leaves a 3-panel row at
50/25/25 and was explicitly rejected.)

**The implementation wrinkle (read this before coding).** A `Group`'s `defaultLayout`
prop is **initial-only** ("remembered between page reloads") — changing it after mount
does **not** re-apply to a live Group. Today nothing does a *pure size change* on a
mounted Group: drag-resize updates the lib's own state (we only mirror it to the store in
`onLayoutChanged` for persistence), and `moveLeaf`/`removeLeaf` change *structure* (new
split ids → the Group remounts → `defaultLayout` applies). Equalize is the **first**
programmatic size-only change, so committing the new tree to the store is **not enough to
update the view**. `Group` exposes an **imperative handle** via the `groupRef` prop
(`GroupImperativeHandle` with `getLayout()` / `setLayout(layout)`); push the new sizes
through that — **never** by bumping a React `key` (a remount would tear down the panel
subtree and churn the #18 pooled terminals). The reconcile must be **remount-free** so a
busy agent terminal keeps its scrollback.

**Border double-click feasibility (verified against the installed
`react-resizable-panels`).** `Separator`'s props are
`Omit<HTMLAttributes<HTMLDivElement>, "role" | "tabIndex">` plus extras, so it forwards a
standard **`onDoubleClick`** through `...rest`. It also has a **`disableDoubleClick`**
prop because it ships a built-in double-click handler — but that built-in only resets a
panel to its `panelConstraints.defaultSize`, and our `<Panel>`s set **only `minSize="10%"`
(no `defaultSize`)**, so the built-in is currently **inert**. Set `disableDoubleClick` on
our Separators (to fully own the gesture and avoid any future conflict) and attach our own
`onDoubleClick`. The handler runs inside `renderNode(node)` where the split's `node.id` is
in scope, so it knows exactly which split to equalize.

**Scope.** Active canvas only. The button equalizes the whole active layout; the border
double-click equalizes the subtree of the double-clicked split (a distinct, useful "even
this region" action — not a duplicate of the button). Both go through the same store
action + the same imperative reconcile, persist via the existing `setActiveCanvasLayout`
(which already broadcasts `canvas://changed` so a detached window #84 picks it up), and
work in detached canvas windows via the border gesture (detached windows have no tab
strip, so the button is main-window-only — acceptable).

**Out of scope.**
- Changing the add-time `[50, 50]` halving in `splitLeaf` (the user said that part "is
  fine").
- Animating the resize (apply instantly).
- Any per-tab right-click context menu (none exists; not building one here).
- The separate Refine card "double click drag bar renames" — that double-clicks the
  **agent header bar** (`styles.panelHeader`) to rename; **this** task double-clicks the
  **Separator** between panels. Different DOM targets, no conflict (call it out so an
  implementer doesn't conflate them).

**Concrete files/symbols.**
- `src/components/Canvas/canvasTree.ts` — add pure ops (`leafCount`, `equalize`,
  `equalizeSplit`, `collectSplits`). Mirror the existing identity-preserving style
  (unchanged subtrees keep object identity).
- `src/components/Canvas/canvasTree.test.ts` — add unit tests.
- `src/components/Canvas/CanvasSurface.tsx` — `renderNode` builds each `Group`; add a
  `groupRef` registry, a guarded reconcile effect, and the Separator `onDoubleClick` +
  `disableDoubleClick`. Existing `setActiveCanvasLayout` / `activeLayout()` helpers are
  already here.
- `src/components/Canvas/CanvasTabs.tsx` — add the button next to `+`/`▾ Templates`
  (reuse the `styles.tabAdd` class).
- `src/store.ts` — add an `equalizeCanvas(splitId?)` action (near
  `setActiveCanvasLayout`, line ~1975).
- `src/components/Canvas/Canvas.module.css` — minor (button reuses `.tabAdd`; optionally a
  hover cue on `.handle` to hint double-click).

**Subtasks**

1. [ ] **Pure ops in `canvasTree.ts`:**
   - [ ] `leafCount(node: CanvasNode): number` — leaves in the subtree.
   - [ ] `equalize(node: CanvasNode): CanvasNode` — return a tree where **every** split's
         `sizes` = `[leafCount(a)/(leafCount(a)+leafCount(b))*100, …]`; recurse into
         children first. Preserve object identity for subtrees whose sizes are already
         equal (mirrors `updateSizes`/`removeLeaf`), so an already-even region doesn't
         needlessly re-render.
   - [ ] `equalizeSplit(tree: CanvasNode, splitId: string): CanvasNode` — find the split
         with `id === splitId` and replace its subtree with `equalize(subtree)`,
         identity-preserving elsewhere; return the tree unchanged if not found or if the
         id is a leaf.
   - [ ] `collectSplits(tree: CanvasNode | null): { id: string; aId: string; bId: string; sizes: [number, number] }[]`
         — every split node (used by the reconcile effect to drive `setLayout`).
2. [ ] **Unit tests in `canvasTree.test.ts`:**
   - [ ] single leaf → `equalize` is a no-op (same reference); `leafCount` = 1.
   - [ ] 3-panel row `split(leaf1, split(leaf2, leaf3))` → outer sizes `[33.33…, 66.66…]`,
         inner `[50, 50]`; assert each leaf's rendered share via `leafRects` ≈ 33.33
         (use `toBeCloseTo`).
   - [ ] nested **mixed** row/col tree → every leaf's `leafRects` area ≈ `100/total`.
   - [ ] already-even tree → `equalize` returns the **same reference** (idempotent).
   - [ ] `equalizeSplit` only touches the named subtree (sizes outside it unchanged /
         same reference); unknown id and leaf id → tree unchanged.
3. [ ] **Store action `equalizeCanvas(splitId?: string)`** (`store.ts`): read the active
   layout (as `setActiveCanvasLayout` does), compute `equalize(layout)` when no `splitId`
   else `equalizeSplit(layout, splitId)`, and commit via `setActiveCanvasLayout` (persist
   + broadcast). No-op when there's no active layout. Add to the store type + `useStore`.
4. [ ] **CanvasSurface — imperative reconcile (remount-free):**
   - [ ] Keep `const groupHandles = useRef<Map<string, GroupImperativeHandle>>(new Map())`.
         In `renderNode`, give each `Group` a callback `groupRef={(h) => { h ?
         groupHandles.current.set(node.id, h) : groupHandles.current.delete(node.id); }}`.
         (Import `GroupImperativeHandle` from `react-resizable-panels`; confirm the export
         name — `useGroupRef`/`useGroupCallbackRef` hooks also exist.)
   - [ ] Add `useEffect(() => { for (const s of collectSplits(rawLayout)) { const h =
         groupHandles.current.get(s.id); if (!h) continue; const cur = h.getLayout();
         if (already-matches `s.sizes` within ~0.5%) continue; h.setLayout({ [s.aId]:
         s.sizes[0], [s.bId]: s.sizes[1] }); } }, [rawLayout])`. The
         "already-matches" guard makes the effect a **no-op on user drag-resize** (the
         store already holds the dragged values) and only does real work after a
         programmatic equalize — preventing any feedback with `onLayoutChanged`.
   - [ ] Separator: `disableDoubleClick` + `onDoubleClick={() =>
         equalizeCanvas(node.id)}` (wire `equalizeCanvas` from the store). Keep the
         existing `className={styles.handle}`.
5. [ ] **CanvasTabs — "Distribute evenly" button:** next to `+`/`▾ Templates`, reuse
   `styles.tabAdd`, a Lucide icon that reads as "even grid" (e.g. `LayoutGrid` or
   `Grid2x2`), `title="Distribute panels evenly"` / matching `aria-label`. `onClick={() =>
   equalizeCanvas()}`. **Disable** (greyed) when the active canvas has `<2` panels
   (`layout` is null or a `leaf` — i.e. nothing to equalize); derive from the store's
   `canvases`/`activeCanvasId` (already read here).
6. [ ] **Styling** (`Canvas.module.css`): the button reuses `.tabAdd`; optionally add a
   subtle hover affordance / `title` on `.handle` so the double-click is discoverable.
7. [ ] **Verify** — `npm run build`, `npm run lint`, `npm test` green; Rust untouched.
   Manually (or note as runtime-unverified): (a) 3 panels in a row → button → equal
   thirds; (b) a mixed nested layout → button → all panels equal area; (c) double-click a
   border → only that region evens out; (d) reload → sizes persisted; (e) pop a canvas out
   (#84) and equalize in one window → the other window updates; (f) a **busy agent
   terminal keeps its scrollback** through an equalize (pool intact, no remount).

**Acceptance criteria**

- [ ] `equalize`, `equalizeSplit`, `leafCount`, `collectSplits` exist in `canvasTree.ts`
      with passing unit tests covering: 3-panel row → equal thirds, mixed nested → equal
      area, idempotent on an already-even tree, and `equalizeSplit` scoping.
- [ ] A **"Distribute evenly"** button is present in the Canvas tab strip; clicking it
      makes **every panel in the active canvas the same size**, applied **instantly** with
      **no terminal remount** (a busy agent keeps its scrollback). It is disabled when the
      active canvas has fewer than 2 panels.
- [ ] **Double-clicking the border between two panels** equalizes the panels under that
      split (its region) instantly; the library's built-in Separator double-click is
      suppressed (`disableDoubleClick`) so there's no conflicting behavior.
- [ ] The equalized sizes **persist across reload** and **sync to a detached canvas
      window** (#84).
- [ ] No change to add-time `[50,50]` halving; the agent **header-bar** drag/rename target
      is untouched.
- [ ] `npm run build`, `npm run lint`, `npm test` pass; no Rust changes.

**Notes**

- **User answers (refine, 2026-06-26):**
  - *Trigger:* "Tab-strip button, but also done automatically by double clicking the
    borders between cards. See if this is possible and has good UX." → Both affordances;
    feasibility of the border double-click was investigated and **confirmed** (see below).
  - *Semantics:* chose **"Equal size for every panel"** (leaf-count weighting) over the
    "reset every split to 50/50" alternative (which leaves a 3-panel row at 50/25/25).
- **Decision made by the refine agent (the user delegated UX judgment with "see if this
  … has good UX"):** the **button** equalizes the **whole canvas**; the **border
  double-click** equalizes only the **subtree of that split** (the region the border
  divides). This gives two distinct, learnable tools rather than two triggers for the
  identical action. If the user later prefers border-double-click to equalize the *whole*
  canvas, it's a one-line change (call `equalizeCanvas()` instead of
  `equalizeCanvas(node.id)`).
- **Feasibility findings (verified against the installed `react-resizable-panels`
  `dist/*.d.ts` + `.js`):**
  - `Separator` forwards `onDoubleClick` (its props extend `HTMLAttributes<HTMLDivElement>`)
    and has a `disableDoubleClick` prop; its built-in double-click only resets a panel to
    `panelConstraints.defaultSize`, which our Panels don't set (`minSize="10%"` only) → the
    built-in is inert today. We set `disableDoubleClick` and use our own handler.
  - `Group.defaultLayout` is initial-only; programmatic size changes must go through the
    `groupRef` imperative handle (`GroupImperativeHandle.setLayout`). The reconcile effect
    is the mechanism. **Do not** remount Groups (would churn the #18 terminal pool).
- **Edge case — the 10% min-size floor:** each `<Panel minSize="10%">` clamps to 10% of
  its Group. Equal *area* across many panels can require a side below 10% (e.g. a 1-vs-10
  leaf split → ~9.09%), which the library clamps to 10% — so perfect equal area isn't
  achievable past ~10 panels in one nesting chain. Acceptable; for typical canvases (2–6
  panels) it's exact. No special handling required.
- **Not to be confused with** the separate Refine card *"double click drag bar renames"*
  (double-clicking the agent **header bar** to rename). That targets `styles.panelHeader`;
  this task targets the `Separator`. Independent and non-conflicting.
- **References:** `canvasTree.ts` (`splitLeaf` sizes `[50,50]`, `appendLeaf` `[70,30]`,
  `leafRects` for area math, `updateSizes` for the identity-preserving pattern);
  `CanvasSurface.tsx` `renderNode`/`commitResize`/`activeLayout`; `CanvasTabs.tsx`
  (`+`/Templates controls); CLAUDE.md "Canvas (#46/#47/#58)" + the #84 cross-window sync
  note.
