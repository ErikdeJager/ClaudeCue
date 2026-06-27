### 207. [ ] Sidebar click in Canvas mode: jump to Overview when the item isn't in the canvas

**Status:** Not started
**Depends on:** none
**Created:** 2026-06-27

**Description**

Clicking a sidebar row routes through the store action `selectItem` (`src/store.ts` ~line
2880, the #79 "select/jump in the current view" behavior):

- **Non-canvas view** (Overview): `set({ selectedId: item.id })` — Overview scrolls that
  column into view.
- **Canvas view**: it looks for the item as a leaf **in the active canvas tab**
  (`collectLeaves(activeLayout).find(matchesCanvasItem)`). If found → jump to that panel
  (`set({ selectedId, activeLeafId })`). **If not found → it does effectively nothing
  useful:** `set({ selectedId: null })` + a toast *"Item not present in canvas — drag to
  add"*. Per #79 it deliberately "never switches the view or tab."

That not-present case is a **dead end**: the user clicked an agent in the sidebar, but
because it isn't in the current canvas, nothing happens (just a toast + deselect). Since
Overview renders **every** sidebar item as a column (agents and non-agent panels and pending
schedules, #174), a better behavior is to **switch to Overview and select/jump to that
item there** — the user gets taken to the thing they clicked instead of a toast.

**Goal:** in `selectItem`, when in Canvas view and the clicked item is **not** present in
the active canvas tab, **switch `view` to "overview" and select the item** (so Overview
scrolls its column in) instead of deselecting + toasting.

**Decisions (made autonomously — see Notes):**

- **Applies to all sidebar item kinds, not only agents.** The card phrases it as "a sidebar
  agent," but the identical dead-end exists for files / diffs / terminals / kanban / pending
  schedules, and Overview has a column for every one of them (#174). Generalizing removes the
  dead-end uniformly; scoping to agents would leave an inconsistent toast for the rest.
  (Easy to restrict to `item.kind === "agent"` later if desired.)
- **"Present in the canvas" = present in the *active* canvas tab** — keeping `selectItem`'s
  existing scope (it has always only checked the active tab and never switches tabs). An item
  that lives in a *non-active* canvas tab therefore also routes to Overview on row-click.
  Cross-tab jumping already has its own affordance — the agent row's **"Open in canvas"**
  context item / `openSessionInCanvas` (#153), which searches all tabs and switches to the
  one containing the agent. Row-click stays "active tab, else Overview."
- **No toast on the switch** — the view change is self-evident; the *"not present in
  canvas"* toast is removed from this path. The present-in-active-tab jump is unchanged.
- This **intentionally reverses part of #79's "never auto-switch Overview↔Canvas" rule** for
  the not-present case only (the present case still never switches).
- `selectItem` is only ever invoked from the sidebar, which is **main-window only**, so there
  is no detached-window (`!IS_MAIN_WINDOW`, no Overview) edge to handle here.

**Scope**

1. In `selectItem` (`src/store.ts` ~2880), replace the not-present `else` branch's
   `set({ selectedId: null })` + `pushToast("Item not present in canvas — drag to add")`
   with `set({ view: "overview", selectedId: item.id })`.
2. Leave the present-in-active-tab branch (`set({ selectedId, activeLeafId })`) and the
   non-canvas branch unchanged.

**Out of scope**

- The agent context-menu **"Open in canvas"** / `openSessionInCanvas` (#153) — unchanged;
  it remains the cross-tab "bring the agent into a canvas" path.
- No change to drag-to-add behavior, to Overview's selection/scroll logic, or to which
  shortcuts exist.
- No change to the present-in-canvas jump or to the Overview (non-canvas) click path.

**Subtasks**

1. [ ] Update the not-present branch of `selectItem` to `set({ view: "overview",
   selectedId: item.id })` (drop the deselect + toast).
2. [ ] Update the inline comment to describe the new behavior (Canvas: jump to the active
   tab's panel if present, else switch to Overview and select).
3. [ ] `npm run build`, `npm run lint`, `npm run format:check`, `npm test` pass (check for
   any store unit test asserting the old toast/deselect; update it to assert the view
   switch).
4. [ ] Manually verify: in Canvas view, clicking a sidebar item **present** in the active
   tab still jumps to its panel (no view switch); clicking one **not** present switches to
   Overview and scrolls that item's column in (agents and non-agent items alike); the
   Overview (non-canvas) click path is unchanged.

**Acceptance criteria**

- [ ] In Canvas view, clicking a sidebar item that is **not** in the active canvas tab
  switches to **Overview** and selects that item (its column scrolls into view) — no
  "not present in canvas" toast, no deselect.
- [ ] In Canvas view, clicking an item that **is** in the active tab still jumps to its
  panel without switching views.
- [ ] The behavior covers agents and non-agent items alike.
- [ ] Clicking in Overview is unchanged; `openSessionInCanvas` (context menu) is unchanged.
- [ ] `npm run build`, `npm run lint`, Prettier, and `npm test` pass.

**Notes**

- **Autonomous refine (2026-06-27).** Per the `ASSUMPTIONS.md` standing directive
  (2026-06-26); decisions logged in `ASSUMPTIONS.md` under TASK-207:
  - Generalized from "agent" to **all item kinds** (Overview has a column for each, #174).
  - "Present in canvas" = the **active** tab (selectItem's existing scope); cross-tab jumps
    stay with `openSessionInCanvas` (#153).
  - No toast on switch; reverses #79's no-auto-switch rule for the not-present case only.
- Key files: `src/store.ts` (`selectItem` ~2880; `openSessionInCanvas` ~3072 for contrast;
  `matchesCanvasItem` / `collectLeaves` helpers). Independent of TASK-205/#206.
