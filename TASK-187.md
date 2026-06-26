# Task 187

### 187. [ ] "Save current canvas as template" — seed the Template Editor from a live canvas

**Status:** Not started
**Depends on:** none
**Created:** 2026-06-26

**Description**

Canvas templates (#117/#118) are reusable saved layouts whose leaves hold inert **action
blocks** (`new-agent` / `new-terminal` / `open-file` / `open-diff` / `open-kanban` /
`open-filetree`) instead of live content. Today a template is built **from scratch** in the
full-screen **`TemplateEditor`** (`src/components/TemplateEditor/TemplateEditor.tsx`),
dragging blocks from a palette. The user wants the reverse on-ramp: after assembling a
canvas they like (the active tab, with real agents/files/diffs/kanban/terminals), **turn
that live canvas into a template** in one action — opening the Template Editor
**pre-populated** with equivalent blocks, where file/kanban blocks already carry the
correct relative path, so they only need to name + tweak + Save.

**Goal & why.** Add a **"Save current canvas as template…"** action that:

1. Takes the **active canvas's** live BSP layout (`canvases.find(activeCanvasId).layout`).
2. Maps each live leaf's `CanvasContent` → the equivalent template **block** content
   (the inverse of #118's instantiation), preserving the split structure + `sizes`.
3. Opens the `TemplateEditor` seeded with that block tree (and a sensible default name),
   where the user finishes and Saves to the existing `canvas_templates` blob.

This removes the tedium of rebuilding a layout block-by-block and makes "I want this exact
setup again, in another repo" a two-click flow (save → later "New tab from template…").

**The mapping (live content → block) — the heart of this task.** The block registry
(`src/components/Canvas/templateBlocks.ts`, `BLOCK_REGISTRY`) already carries a **`liveKind`**
field on every block (the live kind it instantiates into). So the inverse is a **reverse
lookup**: for a live leaf of kind `K`, find the block whose `liveKind === K`.

| Live `CanvasContent.kind` | → Block kind     | Config carried over                               |
|---------------------------|------------------|---------------------------------------------------|
| `agent`                   | `new-agent`      | custom session **name** if set (see below); **no prompt** |
| `terminal`                | `new-terminal`   | none                                              |
| `file`                    | `open-file`      | `file` (the repo-relative path); **drop** `repoPath` |
| `diff`                    | `open-diff`      | none (working-tree diff; see out-of-scope)        |
| `kanban`                  | `open-kanban`    | `file` (the board's repo-relative path); drop `repoPath` |
| `filetree`                | `open-filetree`  | none                                              |
| `scheduled`, `pending`    | — (no block)     | **dropped** (collapse the split, like `removeLeaf`) |

- **`repoPath` is intentionally dropped** — a template is folder-agnostic; the repo is
  chosen when the template is *used* (`TemplateUseModal`, #118). Only the relative `file`
  travels.
- **Agent name, not prompt.** A live agent has a running conversation, not a single
  "initial prompt," so `prompt` is **not** recoverable → leave it empty (the user can add
  one in the editor before saving). The agent's **custom name** (`session.name`, if the
  user renamed it — #57) is worth carrying as the block's `name` (#136). The auto-title
  (#97) is **not** carried (it's not a deliberate label). Resolving the name needs the
  `sessions` list, so the store action injects a `resolveAgentName(sessionId)` callback
  into the otherwise-pure mapper.

**Where it lives.** Add a fourth item to the **▾ Templates menu** in
`src/components/Canvas/CanvasTabs.tsx` (which already has "New tab from template…", "New
template…", "Manage templates…"): **"Save current canvas as template…"**, placed after
"New template…". **Disabled** (greyed, like the existing `disabled={!hasTemplates}` item)
when the active canvas has no panels (`layout` is null) — nothing to save.

**Seeding the editor.** `TemplateEditor` currently seeds its draft `layout`/`name` from
`existing?.layout` when `templateEditorId` is set, else empty. Add an optional **seed**:

- New store state `templateEditorSeed: CanvasNode | null` (and `templateEditorSeedName:
  string | null`), set by a new action `openTemplateEditorFromCanvas()` and **cleared by
  `closeTemplateEditor()`**.
- `openTemplateEditorFromCanvas()`: read the active layout; compute the block tree via the
  new mapper; if the result is `null` (e.g. a canvas of only scheduled/pending panels),
  **toast** "This canvas has nothing to save as a template" and return; else set
  `templateEditorOpen: true, templateEditorId: null, templateEditorSeed: <tree>,
  templateEditorSeedName: <active canvas name>`.
- `TemplateEditor`'s `useState` initializers: `layout` → `existing?.layout` clone, else
  `seed` clone, else `null`; `name` → `existing?.name ?? seedName ?? ""`. (Seed is cloned
  with the same `JSON.parse(JSON.stringify(...))` deep-copy already used for `existing`.)

**Scope.** Active canvas only; produces an **unsaved** draft in the editor (the user must
Save — consistent with "New template…"). Works whether or not the active canvas is detached
(#84) since the layout lives in the store either way. Main-window-only (the tab strip /
Templates menu only exists there, like all other template actions).

**Out of scope.**
- Recovering an agent's original prompt (not knowable from a live session).
- Preserving a branch-compare diff (#81): `open-diff` is working-tree only, so a
  compare-diff panel becomes a plain working-diff block. (Acceptable; note it.)
- Auto-saving the template (the editor's Save flow is unchanged).
- Any change to instantiation (#118) or the block registry's kinds.

**Concrete files/symbols.**
- **New** `src/components/Canvas/canvasToTemplate.ts` — pure `canvasToTemplate(layout,
  resolveAgentName?)` (mirrors `templateInstantiate.ts`'s shape/placement).
- **New** `src/components/Canvas/canvasToTemplate.test.ts` — unit tests.
- `src/components/Canvas/templateBlocks.ts` — reuse `BLOCK_REGISTRY` `liveKind`; optionally
  add a helper `blockForLiveKind(kind): BlockDescriptor | undefined` (reverse lookup) so the
  mapping has a single source of truth.
- `src/store.ts` — add `templateEditorSeed` / `templateEditorSeedName` state (near
  `templateEditorId`, ~line 585/1227), `openTemplateEditorFromCanvas()` action (near
  `openTemplateEditor`, ~line 2070), and clear the seed in `closeTemplateEditor`.
- `src/components/TemplateEditor/TemplateEditor.tsx` — read the seed in the `useState`
  initializers (lines ~234–239).
- `src/components/Canvas/CanvasTabs.tsx` — add the menu item (~line 280) + a `canSave`
  derive from the active canvas's layout.

**Subtasks**

1. [ ] **Reverse-lookup helper** in `templateBlocks.ts`: `blockForLiveKind(liveKind:
   string): BlockDescriptor | undefined` (find `BLOCK_REGISTRY` entry by `liveKind`).
2. [ ] **Pure mapper** `canvasToTemplate.ts`:
   - [ ] `canvasToTemplate(layout: CanvasNode | null, resolveAgentName?: (sessionId?:
         string) => string | undefined): CanvasNode | null`.
   - [ ] Leaf → look up `blockForLiveKind(content.kind)`. If none → return `null` (drop).
         Else build block content `{ kind: desc.kind }` plus: `file: content.file` when
         `desc.config === "file"`; `name: resolveAgentName?.(content.sessionId)` (only if
         truthy) when `desc.liveKind === "agent"`. **Reuse the leaf's existing `id`**
         (unique already; keeps the function pure/deterministic — no `crypto.randomUUID`;
         the editor deep-clones on open and instantiation reassigns ids anyway).
   - [ ] Split → map `a` and `b`; both null → null; one null → return the other
         (collapse); else `{ ...node, a, b }` keeping `dir` + `sizes`.
3. [ ] **Unit tests** `canvasToTemplate.test.ts`: each live kind → correct block kind;
   `file`/`kanban` carry the relative path and drop `repoPath`; `agent` carries the
   resolver's name (and omits `name` when the resolver returns undefined); `scheduled`/
   `pending` dropped + parent collapses; an all-dropped tree → `null`; a mixed nested tree
   preserves `dir`/`sizes` and panel order.
4. [ ] **Store**: add `templateEditorSeed`/`templateEditorSeedName` (default null), the
   `openTemplateEditorFromCanvas()` action (resolve active layout → `canvasToTemplate(...,
   (id) => sessions.find(s => s.id === id)?.name || undefined)` → toast-and-return on
   null, else open editor with the seed), and clear both seed fields in
   `closeTemplateEditor`.
5. [ ] **TemplateEditor**: extend the `name`/`layout` `useState` initializers to fall back
   to `templateEditorSeedName` / a deep-clone of `templateEditorSeed` when there's no
   `existing` template.
6. [ ] **CanvasTabs**: add the **"Save current canvas as template…"** menu item (after
   "New template…"), `onClick` → `openTemplateEditorFromCanvas()` + close the menu;
   `disabled` when the active canvas's `layout` is null.
7. [ ] **Verify** — `npm run build`, `npm run lint`, `npm test` green; Rust untouched.
   Manually (or note as runtime-unverified): build a canvas with an agent (renamed), a file
   viewer, and a kanban board → "Save current canvas as template…" → the editor opens with
   three matching blocks, the agent block pre-named, the file/kanban blocks pre-filled with
   the right relative paths, same layout proportions → name it → Save → it appears in
   "Manage templates…" and "New tab from template…" reproduces the layout.

**Acceptance criteria**

- [ ] A **"Save current canvas as template…"** item exists in the Canvas ▾ Templates menu,
      disabled when the active canvas is empty.
- [ ] Triggering it opens the **Template Editor pre-populated** with one block per live
      panel, structure + `sizes` preserved, with `open-file`/`open-kanban` blocks carrying
      the **correct relative path** and `new-agent` blocks carrying the agent's **custom
      name** (when set).
- [ ] `scheduled`/`pending` panels are omitted (their split collapses); a canvas with
      nothing templatable shows a toast and does not open the editor.
- [ ] The opened draft is **unsaved** until the user Saves (no write to `canvas_templates`
      before Save); Saving then makes it usable via "New tab from template…".
- [ ] `canvasToTemplate` is a pure, unit-tested function; `npm run build`, `npm run lint`,
      `npm test` pass; no Rust changes.

**Notes**

- **Autonomous refine (2026-06-26):** the user is no longer responding; decisions below were
  made to the best judgment and are also logged in `ASSUMPTIONS.md`.
  - Trigger = a new item in the existing **▾ Templates menu** (most consistent with "New
    template…"); not a separate toolbar button.
  - Mapping reuses the registry's `liveKind` (single source of truth); reuses existing
    leaf/split ids (keeps the mapper pure); preserves split `dir` + `sizes`.
  - Agent blocks carry the **custom** session name only (not auto-title, not prompt —
    prompt is unrecoverable from a live session).
  - `diff` → `open-diff` is working-tree only; a branch-compare (#81) is not preserved.
  - Default template name = the active canvas's tab name (editable before Save).
  - All-dropped / empty canvas → toast + no-op rather than opening an empty editor.
  - Seeding via new `templateEditorSeed`/`templateEditorSeedName` store fields, cleared on
    `closeTemplateEditor` (mirrors how the editor is mounted-only-while-open).
- **Depends on: none** — the template system (#117/#118), block registry, `TemplateEditor`,
  `templateInstantiate.ts`, and the `canvas_templates` blob are all **already shipped**. The
  other Refine cards ("double click drag bar renames", "Keybinds for panel creation") are
  unrelated. Independent of #186 (canvas equalize) too.
- **References:** `templateBlocks.ts` (`BLOCK_REGISTRY`, `liveKind`, `newBlockContent`);
  `templateInstantiate.ts` (the forward mapping this inverts); `TemplateEditor.tsx` (draft
  seeding at lines ~234–239, block config UI); `CanvasTabs.tsx` (Templates menu ~lines
  262–303); `store.ts` (`openTemplateEditor`/`closeTemplateEditor` ~2070, `templateEditorId`
  ~585); `CanvasContent` fields in `src/types/index.ts:226`. CLAUDE.md "Canvas templates
  (#117/#118)".
