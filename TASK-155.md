### 155. [x] Canvas panel drag: lift on drag-start, restore on cancel

**Status:** Done
**Depends on:** none
**Created:** 2026-06-24

**Description**

Inside a Canvas tab you can already drag an **existing** panel by its header to
reorder/reposition it (#135 `moveLeaf` / #144 whole-header grip). But the mechanic
feels wrong: the dragged panel **stays in the layout for the entire drag**, so its
space is still occupied and the user can't freely choose where to drop it — there's
no clear view of the area the panel would vacate. The move is computed **atomically
on drop** (see the comment at `CanvasSurface.tsx:94-99` and `canvasTree.ts moveLeaf`,
lines 65-98), so nothing reflows until the very end.

**Goal / why:** make dragging an existing panel feel direct: at **drag start** the
panel is **lifted out** of the layout — the remaining panels immediately reflow to
fill the gap, exposing clear drop targets across the whole canvas — a drag **ghost**
follows the cursor, and on **drop** the panel lands in the chosen spot. If the drag
is **cancelled** (Esc) or released **outside any drop zone**, the panel is restored
to its **exact previous position**. This is the behavior the card asks for:
"automatically removed from the canvas when I start a drop … If I stop the drop
action it should reposition that element at its previous position."

**Grounding (concrete files / symbols):**

- `src/components/Canvas/CanvasSurface.tsx`
  - The `move-leaf` drag **source**: `useDraggable({ id: "move:"+leaf.id, data: {
    kind: "move-leaf", leafId } })` (≈ lines 100-107). The comment at 94-99 states
    the layout deliberately stays put and the move is atomic-on-drop — this is what
    changes.
  - Per-panel **edge drop-zones** `EdgeZone` (`id: "panel:<id>:<edge>"`) rendered
    only while `dragActive` (≈ line 312), and the empty-canvas **center** droppable
    `id: "canvas-center"` (≈ line 33, shown when the layout is null/empty).
- `src/App.tsx` (main window DndContext): `onDragStart` only does
  `setDragActive(true)`; `onDragEnd` (≈ line 98) routes `move-leaf` →
  `applyCanvasMove`, else `payloadToContent` → `applyCanvasDrop`; `onDragCancel`
  only clears `dragActive`. Uses `collisionDetection={pointerWithin}`.
- `src/components/CanvasWindow/CanvasWindow.tsx` (detached window DndContext, #84):
  the **same** handlers, `move-leaf` only (≈ lines 45-49, 77-85). The new behavior
  must work here too.
- `src/components/Canvas/canvasDrop.ts`: `applyCanvasMove(sourceLeafId, overId)`
  parses `panel:<target>:<edge>` and calls `moveCanvasLeaf`; `applyCanvasDrop`
  handles sidebar/new-content drops (unchanged by this task).
- `src/components/Canvas/canvasTree.ts`: pure ops `removeLeaf` (collapses the
  sibling), `splitLeaf`, `moveLeaf` (atomic remove+resplit, **reuses the source's
  original id + content** so the #18 pooled terminal reparents instead of being
  recreated — preserve this guarantee), `collectLeaves`, `leafIds`.
- `src/store.ts`: `moveCanvasLeaf` (≈ line 1729) calls `moveLeaf` then
  `setActiveCanvasLayout` (which **persists** to the backend `canvases` blob).

**Design decision — non-destructive lift (record as the chosen approach):** keep the
lift **out of persisted state**. On drag start, snapshot nothing destructive: store a
**transient** `liftedLeaf` ref (`{ canvasId, leafId }`, not part of the `canvases`
blob, not persisted). The Canvas renders a **derived** layout = active layout with
`liftedLeaf.leafId` removed (`removeLeaf`), so panels reflow and the lifted panel is
no longer a (self) drop target. Persist **only on a committed drop**: splice the
lifted leaf into the pruned tree at the target edge **reusing its original id +
content** (so the pooled terminal reparents, never recreated), then
`setActiveCanvasLayout`. On cancel / invalid drop, just clear `liftedLeaf` — since
the persisted layout was never mutated, the panel is restored exactly. This
supersedes #135's atomic-on-drop path and guarantees an interrupted drag (Esc, window
close, crash) can never lose a panel.

Because the active draggable's DOM node is removed during the lift, a dnd-kit
**`<DragOverlay>`** is required to keep a drag preview visible — render a lightweight
ghost (the panel's title/icon) in both DndContexts.

**Scope:** the lift/restore behavior for **existing-panel** (`move-leaf`) drags in
both the main and detached Canvas windows, plus the DragOverlay ghost and the reflow.

**Explicitly out of scope:**

- Sidebar→Canvas drops of **new** content (sessions/files/diffs/kanban): unchanged —
  they still go through `payloadToContent` + `applyCanvasDrop`, no lift.
- **Cross-window** drag (moving a panel between the main window and a detached
  window) — still not supported.
- Overview-wall card reorder and sidebar-row drags (separate dnd contexts) —
  untouched.
- Fancy reflow/ghost **animation** — a CSS transition is a nice-to-have, not
  required; correctness first.

**Subtasks**

1. [ ] **Transient lift state (store):** add non-persisted `liftedLeaf: { canvasId,
   leafId } | null` and actions `beginCanvasLift(leafId)`, `commitCanvasLift(targetId,
   edge)`, `cancelCanvasLift()`. `beginCanvasLift` records the active tab id + leaf
   id; `cancelCanvasLift` clears it (no layout write); `commitCanvasLift` prunes the
   lifted leaf and `splitLeaf`s it onto the target **reusing its original id +
   content**, then `setActiveCanvasLayout`, then clears the lift. Ensure `liftedLeaf`
   is excluded from anything that serializes `canvases`.
2. [ ] **Derived display layout (pure):** add a helper (e.g. `displayedLayout(layout,
   liftedLeafId)` in `canvasTree.ts`) returning the layout with the lifted leaf
   removed (or the original when none). Use it where `CanvasSurface`/`Canvas` reads
   the active tab's layout to render, so the reflow happens during the lift without
   touching persisted state.
3. [ ] **Commit logic:** implement `commitCanvasLift` for both cases — (a) target is
   another panel edge: prune lifted from the original layout, `splitLeaf(target,
   edge, content, originalId, newSplitId)`; (b) the lifted panel was the **only**
   panel: pruned layout is null → set the lifted leaf as the **sole** leaf on the
   target `canvas-center`. Replace/retire the now-unused atomic `moveCanvasLeaf` path
   (or repoint `applyCanvasMove` at the commit action) — keep `moveLeaf`'s
   id-preservation behavior available for tests if still referenced.
4. [ ] **Main window handlers (`App.tsx`):** in `onDragStart`, when
   `active.data.current?.kind === "move-leaf"`, call `beginCanvasLift(leafId)` (plus
   `setDragActive(true)`). In `onDragEnd`, for `move-leaf`: if `over` is a valid
   `panel:<target>:<edge>` (target ≠ lifted) or `canvas-center`, call
   `commitCanvasLift(...)`; otherwise `cancelCanvasLift()`. In `onDragCancel`, call
   `cancelCanvasLift()`. Leave the sidebar-drop branch (`applyCanvasDrop`) intact.
5. [ ] **Detached window handlers (`CanvasWindow.tsx`):** mirror subtask 4 (move-leaf
   only). Factor the shared start/end/cancel logic into `canvasDrop.ts` helpers (as
   `applyCanvasMove` is already shared) to avoid drift between the two windows.
6. [ ] **DragOverlay ghost:** add `<DragOverlay>` to both DndContexts; while a
   move-leaf drag is active, render a minimal ghost (panel title + icon, reusing the
   panel-header label logic / `panelTitle`). Track the active leaf's title via the
   lift state or `onDragStart` payload.
7. [ ] **CanvasSurface source:** ensure the lifted panel is not rendered during its
   own drag (it's removed by the derived layout) so it can't be a self drop target;
   update the stale comment at lines 94-99 to describe lift-on-start / restore-on-
   cancel. Edge zones already gate on `dragActive`; confirm they now cover the
   reflowed space.
8. [ ] **Tests (Vitest, mirror `canvasTree.test.ts` / `canvasDrop.test.ts`):**
   `displayedLayout` removes the lifted leaf (and is identity when none); commit
   reuses the original id + content and places it at the target edge; commit of a
   sole panel onto center yields a single-leaf layout; cancel leaves the original
   layout byte-for-byte unchanged.
9. [ ] **Verify:** `npm run build`, `npm run lint`, `npm test` pass. Manual: in a
   multi-panel canvas, grab a panel header → it lifts out and the rest reflow → drop
   into the freed space → it lands there with its terminal intact (no recreate);
   press Esc mid-drag → it snaps back to its original spot; repeat in a detached
   canvas window and with a single-panel canvas.

**Acceptance criteria**

- [ ] Starting to drag an existing panel's header immediately removes it from the
      visible layout; the remaining panels reflow to fill the gap, and a drag ghost
      follows the cursor.
- [ ] Drop zones cover the reflowed layout, so the panel can be dropped in regions
      the source previously occupied (the original complaint).
- [ ] Dropping on a valid target places the panel there while preserving its content
      and its #18 pooled terminal (no reload / dispose-recreate).
- [ ] Cancelling the drag (Esc) or releasing outside any drop zone restores the panel
      to its **exact** previous position.
- [ ] Lifting the only panel exposes the empty-canvas center target; dropping re-
      places it and cancel restores it.
- [ ] Behavior is identical in the main window and a detached canvas window (#84).
- [ ] The persisted `canvases` layout is written only on a committed drop — a
      cancelled or interrupted drag leaves it unchanged.
- [ ] `npm run build`, `npm run lint`, `npm test` pass; pure-logic tests cover the
      lift / commit / cancel paths.

**Notes**

- **Assumption — wording:** "automatically removed when I start a drop" = lifted at
  **drag start**; "reposition at its previous position if I stop the drop action" =
  **restore on cancel / drop-on-nothing**.
- **Assumption — non-destructive lift** (transient state, persist only on commit) is
  chosen over mutating-then-restoring so a cancel is an exact restore and an
  interrupted drag can never strand a panel. This deliberately supersedes #135's
  atomic-on-drop computation; the `moveLeaf` id-preservation guarantee is retained in
  the commit path so pooled terminals reparent rather than being recreated.
- **DragOverlay is required** because the active draggable leaves the DOM during the
  lift; without it dnd-kit has nothing to render as the drag preview.
- **Dependencies:** none — builds on shipped systems: the #135 move-leaf grip, the
  #18 persistent terminal pool, the #84 dual (main + detached) DndContext, and the
  pure `canvasTree` ops. Independent of the open #154 (kanban template block).
- **References:** `CLAUDE.md` (Canvas #46/#47/#58; #135 `moveLeaf`; #144 header grip;
  #84 detached windows + `applyCanvasMove` sharing), and the files under Grounding.

**Implementation note (done 2026-06-24)**

All subtasks (1–9) shipped:
- **Transient lift state** (`store.ts`): non-persisted `liftedLeaf: { canvasId,
  leafId } | null` + `beginCanvasLift` / `commitCanvasLift` / `cancelCanvasLift`.
  The old atomic `moveCanvasLeaf` action and `applyCanvasMove` helper were removed
  (retired per subtask 3); the pure `moveLeaf` op is retained — `commitCanvasLift`
  calls it for an edge drop (so it keeps the id-preservation guarantee + its tests).
- **Derived layout** (`canvasTree.ts`): `displayedLayout(layout, liftedLeafId)` —
  the active layout with the lifted leaf removed (identity when none), used by
  `CanvasSurface` so the panels reflow during the lift without persisting.
- **Commit/cancel**: edge drop → `moveLeaf` (prune + re-split reusing id+content);
  sole-panel center drop → already the whole tree, just clear the lift; cancel /
  drop-on-nothing → clear the lift (no layout write = exact restore).
- **Both windows**: `App.tsx` + `CanvasWindow.tsx` get `onDragStart` →
  `beginCanvasLift`, `onDragEnd` → shared `applyCanvasLiftEnd(over)` (commit or
  restore; never an early `!over` return that would strand the panel), `onDragCancel`
  → `cancelCanvasLift`, and a `<CanvasDragOverlay>` ghost.
- **DragOverlay ghost**: `CanvasDragOverlay` + `PanelDragGhost` (exported from
  `CanvasSurface`) render a header-like chip (grip + the same title via the new
  `leafTitleText` helper) since the lifted panel's DOM node leaves the tree.
- **Terminal preservation**: the reconcile effect keys on the *persisted* `canvases`
  (unchanged during a lift) so a lifted agent/terminal PTY is never disposed; its
  pooled xterm parks on unmount and reparents on commit/cancel (no reload).
- **Tests**: `displayedLayout` (remove / identity) in `canvasTree.test.ts`; lift
  begin/commit/center/cancel in `store.test.ts`. `npm run build`, `npm run lint`,
  `npm test` (196) and `prettier --check` all pass.
- **Out of scope, left untouched**: sidebar→Canvas new-content drops, cross-window
  drag, Overview/sidebar dnd contexts, reflow/ghost animation.
