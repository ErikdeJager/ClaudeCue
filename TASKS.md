# Tasks

This file tracks tasks. Each task is **numbered** (ordered) and has a top-level
**completion marker** — `[ ]` for open, `[x]` for done. Copy the template from
[TASKS-TEMPLATE.md](TASKS-TEMPLATE.md) for every new task and increment the number.

List cross-task ordering in each task's **Depends on** field (e.g. `#2, #3`); tasks
whose dependencies are all complete can run in parallel. The automation skills
(`/handoff`, `/isolate-agent`, `/develop-tasks`) read these fields.

---

## Project context

**ClaudeCue** — a **macOS** desktop app (**Rust + Tauri 2 + React/TypeScript**) for
running and managing many live `claude` CLI sessions at once: an **Overview** "agent
wall" of real terminals, a **Canvas** split-panel workspace (with file, **git-diff**,
and terminal viewers), and a repo-grouped **sidebar**. Each session is a **real PTY running
`claude`** — ClaudeCue provides the window chrome, navigation, persistence and
git-reading; the terminals come from the Claude Code CLI itself.

**Stack:** Tauri 2 · React + TypeScript + Vite · **Zustand** · plain CSS with
CSS-variable design tokens (CSS Modules) · **xterm.js** terminals · **`portable-pty`**
(Rust) · JSON persistence in the app-data dir · **Lucide** icons · **JetBrains Mono**
(bundled, offline).

**v1 decisions / out of scope:** no status system beyond the busy/idle indicator
(#42/#55/#71 — still no approval pills/awaiting-glow/floating) · no app-rendered
approval UI (users answer in the terminal) · no Archive (single **Remove = kill +
forget**) · no Skills manager · no Fork · no settings screen · no light mode · no
multi-window · no auth · no code signing/notarization · **git is read-mostly** —
ClaudeCue reads git (current branch + working-tree diff vs `HEAD`, branch compare #81)
and never commits or creates branches; its writes are `git checkout <existing branch>`
from the new-session flow (#27) and `git worktree add`/`remove` for isolated worktree
agents (#74). `claude` is assumed on `PATH` (clear in-app error if missing).

> The original design spec and interactive prototype (`HANDOFF.md`,
> `Conductor.dc.html`) are preserved in git history (commit `b02efd8`
> "System referances") if exact prototype details are ever needed.

---

## Implemented (completed tasks)

> The backlog has almost entirely shipped — only the still-open **#84** remains (in
> **## Tasks** below). Completed tasks are condensed here — number, title, and one line
> on what each delivered — and their full entries removed from the list below; per-task
> detail (subtasks, notes, acceptance, implementation reports) lives in git history.
> This is the running record of what ClaudeCue has shipped.

**v1 foundation (#1–#14).** The core: a Tauri 2 shell hosting real `claude` PTYs across
an Overview wall, a Focus view with a git-diff inspector, and a repo-grouped sidebar.

- #1 Project scaffolding — macOS Tauri 2 + React/TS/Vite skeleton + lint/format/test tooling.
- #2 Design tokens, fonts & global styles — CSS-variable tokens + bundled JetBrains Mono.
- #3 Custom window chrome (titlebar) — later replaced by the native title bar (#19).
- #4 Rust session/PTY core — `SessionManager` over `portable-pty`, scrollback + event channel.
- #5 Rust persistence + resume — `sessions.json`; spawn via `claude --session-id`, resume `--resume`.
- #6 Rust git reading — current branch + working-tree diff vs `HEAD`, parsed to a structured shape.
- #7 Frontend app shell + Zustand store + typed IPC + cross-cutting actions.
- #8 xterm.js terminal component — live PTY I/O, fit/resize, exit overlay.
- #9 Sidebar — repo groups + session rows from persisted recents.
- #10 New session modal — folder picker + recents + optional name.
- #11 Overview wall — equal-width live terminal columns.
- #12 Focus view + toolbar — large terminal + collapsible inspector tab strip.
- #13 Git Diff inspector — summary + file list + unified/split hunks.
- #14 Packaging + docs — branded icon, unsigned `.app`/`.dmg`, README/CLAUDE.

**Release/update (#15) — later removed.**

- #15 Release CI + in-app auto-update (Tauri updater). _Reversed by #62 (repo went private)._

**Polish passes 1–2 (#16–#17).**

- #16 App-wide smoothness / performance / UX polish pass 1.
- #17 Polish pass 2 — re-profile and refine.

**UX-feedback batch (#18–#32).** Native chrome, keyboard nav, the new-session/branch flow.

- #18 Fix garbled terminal rendering on view switch/resize/new agents — persistent terminal pool.
- #19 Native macOS title bar (replaces the #3 custom chrome).
- #20 Stable, alphabetical sidebar repo list (no reorder on new agent).
- #21 Sidebar agent labels = branch name, with an optional custom name sub-line.
- #22 Clicking a sidebar agent navigates in Overview (doesn't force Focus).
- #23 Selected-agent border/highlight in Overview.
- #24 Keyboard nav — Shift+arrows between agents and views.
- #25 Overview/Focus toggle moved into the sidebar (always visible).
- #26 Slimmer New session button + ⌘N shortcut.
- #27 New session popover with branch auto-detect + `git checkout` (the one git write).
- #28 Session chip copies a `claude --resume` command, not the bare id.
- #29 Auto-refresh the git diff inspector (no manual refresh).
- #30 Restore sessions live on startup — "reconnecting", not an error wall.
- #31 Right-click a repo → Forget (kill its agents, drop from recents).
- #32 One toast on close; all toasts bottom-right.

**Theming, repo identity & customizable workspace (#33–#47).**

- #33 Catppuccin Mocha recolor (less black; status tokens now in use).
- #34 Non-collapsible sidebar repo titles + click-to-filter Overview.
- #35 Per-repo color identity (assign / persist / change).
- #36 Overview grouped by repo with colored badges + repo filter.
- #37 Repo color + badge in Focus.
- #38 Customizable Overview — mixed panels (agent / diff / markdown columns).
- #39 Diff-viewer column in Overview (from the repo menu).
- #40 Markdown viewer in the Focus inspector (pick a file, render, hot-reload).
- #41 Markdown-viewer column in Overview.
- #42 Busy indicator — show when a `claude` session is working.
- #43 Overview drag-to-reorder agents/panels within a repo cluster (dnd-kit).
- #44 Universal read-only file viewer (markdown rendered/raw + light code highlighting).
- #45 Sidebar tree — opened files under their repo (draggable + clickable).
- #46 Canvas mode — recursive split-panel (BSP) layout engine.
- #47 Canvas content + drag-and-drop from the sidebar (agents, files, diffs).

**Iteration passes 3–4 (#48–#49).**

- #48 UI visual polish & design-system consistency (full color + spacing tokenization, focus a11y).
- #49 UX, interaction flows & accessibility (modal focus-trap, tablist keyboard nav, a11y labels).

**Refinements (#50–#54).**

- #50 Overview selected-agent border — repo color, thinner & subtler.
- #51 Resizable Focus inspector (drag to expand/minimize) + responsive content.
- #52 Custom checkbox component (replaces native checkboxes app-wide).
- #53 Redefine the start-a-new-agent model — a panel that expands from the button, recents-first.
- #54 Repo context menu — "New session" first + red/danger styling for destructive actions.

**Final feature batch + cleanup (#55–#62).**

- #55 Busy indicator — single pulsing ball (dim when idle) + echo-aware detection (typing ≠ busy).
- #56 Searchable file-picker for the repo "Open file viewer" menu.
- #57 Rename an agent from the sidebar (right-click) — propagates everywhere.
- #58 Canvas tabs — multiple named canvases (add/close/rename/reorder), each its own layout.
- #59 Folders as the source of truth — unified sidebar items (file + diff) all draggable into Canvas.
- #60 Final docs pass — sync CLAUDE.md/README.md to the code + condense this list (this task).
- #61 New-session keyboard-speed pass — command-palette launcher (type-ahead recents, ⌘1–9, quick-repeat).
- #62 Remove the in-app auto-update mechanism + the baked-in updater secret (repo now private).

**Post-v1 fixes (#63).**

- #63 Clean agent exit (code 0) disappears (kill + forget, no overlay); non-zero/crash & failed boot-resume keep the "Process exited" overlay + Restart — and Restart now resets the pooled terminal so the relaunched agent repaints cleanly instead of appending onto the dead screen.

**New-session & worktree flow (#65–#67, #74).** The two-step launcher and folder-per-branch isolation.

- #65 New session panel fully covers its button (no corner peek).
- #66 Two-step folder→branch keyboard new-session flow — branch filter + main/master/dev priority sort, in-button ⏎/esc hints, Name field removed, action reads "Start" / "Checkout & start".
- #67 Unified session-label rule — branch is the primary title; a custom name (from rename #57) overrides it and the branch becomes the subtitle.
- #74 Isolated worktree agents — ⌘⏎ starts an agent in an app-managed `git worktree` on an existing branch, nested under its parent repo; ref-counted removal keeps a dirty worktree. New git writes (`worktree add`/`remove`).

**Views = Overview + Canvas; keyboard navigation (#75–#79).** Focus retired; the two surviving views gain keyboard parity.

- #75 Removed Focus mode entirely — the app is now just Overview + Canvas (no "Expand to Focus", no Focus keybind/inspector/state).
- #76 Canvas keyboard navigation — Shift+arrows move spatially between panels (active-leaf focus), ⌘1–9 jump to canvas N.
- #77 ⌘\ toggles the main view (Overview ↔ Canvas).
- #78 Tighter terminal line height (xterm `lineHeight` 1.5 → 1.2).
- #79 Unified, view-aware sidebar item click — select/jump to any item without ever switching views.

**New view types, diff modes & the repo "Views" menu (#72, #80–#82).** More addable panels and richer diffs.

- #72 Plain terminal item — a real `$SHELL` PTY that behaves like the file/diff viewers (repo menu → Overview column + sidebar row + draggable into Canvas; persisted, fresh shell on boot).
- #80 Diff viewer soft-wraps long lines (`pre-wrap` + `overflow-wrap`) — no horizontal scroll, in unified and split.
- #81 Diff viewer branch-compare mode — a Working-tree ↔ Compare toggle running two-dot `git diff base target` (branches validated; mode + branches persisted on the panel).
- #82 Repo context-menu "Views" section — a single registry drives every addable view type (file / diff / terminal), so a new kind is a one-line addition.

**Viewer, sidebar & indicator polish (#64, #68–#71, #73).** Smaller targeted refinements.

- #64 File viewer right-side margin so content isn't clipped at the right edge.
- #68 Repo filter selector visually encloses its "+" (new-session) button as one control.
- #69 File picker — removed the global focus-ring border on the search input (scoped override).
- #70 Overview — the whole column title bar is the drag handle (not just the corner grip); header buttons still click.
- #71 Activity indicator — moved before the title on every surface and reinvented as a rotating spinner arc (busy) / calm static dot (idle).
- #73 Markdown viewer — a clear two-way Rendered/Raw toggle (replaces the ambiguous single icon).

**Canvas & agent-header refinements (#83, #85–#87).** Final touch-ups after Focus removal.

- #83 Low-key confirmation toasts for closing views and for canvas add/close/rename (info tone; no per-item spam on bulk forget).
- #85 Canvas tab — slightly bigger × close button (easier hit target).
- #86 Re-homed the "copy resume command" button (#28) onto every agent header in Overview & Canvas, after Focus removal (#75) took its old home.
- #87 Removed the "Open in Zed" button and all its logic — UI, store action, IPC wrapper, Tauri command, and the `pty.rs` spawn (shared binary-lookup helpers kept for `claude`).

---

## Design reference (dark theme only)

> **Historical (v1 spec).** The live design tokens are in `src/styles/tokens.css`,
> remapped to **Catppuccin Mocha** (#33) — the near-black palette below is the original
> v1 reference, superseded by those tokens. Kept for provenance.

Define as CSS variables; do not introduce off-system colors.

- **Surfaces:** `--bg-base #0B0B0C` · `--bg-sidebar #111113` · `--bg-panel #141416` ·
  `--bg-elevated #1A1A1D` · `--bg-hover #1E1E22` · `--terminal-bg #0E0E10`
- **Borders:** `--border-hairline rgba(255,255,255,.07)` ·
  `--border-strong rgba(255,255,255,.12)`
- **Text:** `--text-primary #EDEDEF` · `--text-secondary #9A9AA0` · `--text-muted #5E5E66`
- **Accent** (brand only — New session button + selected row; **never** a status):
  `--accent #D97757` · `--accent-hover #E08A6D` · `--accent-dim rgba(217,119,87,.14)`
- **Diff:** add `#4BB58A` on `rgba(75,181,138,.12)` · del `#E5534B` on
  `rgba(229,83,75,.12)` · gutter `#5E5E66`
- *Reserved for later (unused in v1, no status UI):* running `#5B8DEF`,
  awaiting `#E0A33E`, done `#4BB58A`, error `#E5534B`, idle `#6B6B73`.

**Type:** UI/chrome → system stack (`-apple-system, "SF Pro Text", ui-sans-serif,
system-ui`); terminal + diff → `JetBrains Mono`, fallback `ui-monospace, "SF Mono",
monospace`. Scale: eyebrow 11px/600/uppercase · UI default 13px · meta 11–12px ·
terminal 12.5px/1.2 · diff 12px/1.45.
**Spacing** 4px base (4·6·8·12·16·20·24·32). **Radii** window/panels 10px,
buttons/inputs 7px, chips 5px, dots 999px. **Depth** hairline borders + bg layering;
one soft shadow for popovers/modals only (`0 8px 28px rgba(0,0,0,.45)`). **Motion**
120–180ms ease-out; respect `prefers-reduced-motion`. **Icons** Lucide line, 16px,
1.5 stroke.

---

## Tasks

Tasks #1–#83 and #85–#87 are complete — see **Implemented (completed tasks)** above for
the index, and git history for full per-task detail. The one open task (**#84**) follows.
New work goes here as a fresh `### N.` entry in [TASKS-TEMPLATE.md](TASKS-TEMPLATE.md)
format (next number: **#88**), with its `Depends on:` prerequisites.

---

### 84. [ ] Open a canvas in its own window (multi-monitor) — pop-out button + drag tear-off

**Status:** Not started · _(Not started | In progress | Blocked | Done)_
**Depends on:** none
**Created:** 2026-06-19

**Description**

Let the user **open a Canvas tab (#58) in its own native window**, so they can put a different
canvas on each monitor. Triggered two ways (per the requester): a **pop-out button/menu** on the
tab (reliable) **and** a **drag-the-tab-out tear-off** gesture (browser-style). The
canvas-jump keybind (⌘1–9, #76) should **focus the detached window** if that canvas has been
popped out. Detached windows are **per-session** (not remembered across restarts).

**This reverses the v1 "no multi-window" decision** (CLAUDE.md) — update the docs.

**Research conclusions (Tauri 2):**
- Multi-window is natively supported — `WebviewWindow` (JS) / `WebviewWindowBuilder` (Rust),
  `set_focus()` to raise a window (use it for the ⌘-jump-to-detached-canvas), and positioning
  for multi-monitor placement. Requires the `core:webview:allow-create-webview-window`
  capability. (Sources: Tauri WebviewWindow API; "Creating Windows in Tauri".)
- **Tab tear-off (drag a tab out to spawn a window) is NOT native** to Tauri — HTML drag-drop
  doesn't cross window bounds; it's a known feature request. So implement the **button first**
  (reliable), then the tear-off as a **custom** gesture (track the pointer past the window edge
  via Tauri window/cursor position; on release outside, create the window there and remove the
  tab from the main strip). Flag tear-off as the fragile/higher-effort part. (Sources:
  tauri#3906, wry#648.)
- **Terminals can't move across windows** — xterm instances are per-document (the #18 pool
  lives in one window's DOM). A detached canvas must render its agents in the **new window's own
  terminal pool**, connected to the **same backend PTYs** (`SessionManager` is shared) via Tauri
  events. A single `claude` PTY should render in **one window at a time** (the #18 width/TUI
  constraint): popping out = dispose those terminals in the main window and create + replay
  scrollback in the new window (and the reverse on re-dock); `resize_pty` is driven by whichever
  window currently shows the terminal.

**Pieces:**
- **Secondary window** = a **canvas-only** view (the BSP layout + tab name, minimal chrome — no
  sidebar/Overview), reusing the Canvas renderer; loaded via a param/route (e.g.
  `?canvas=<id>`) with a unique window label (`canvas-<id>`).
- **Cross-window state sync:** the canvas layout + session list must stay consistent across
  windows — route mutations through the backend and broadcast change events (Tauri events) so
  every window updates (or each window re-reads on the relevant event). (Largest architectural
  lift.)
- **Window↔canvas registry (backend):** track which canvas lives in which window so ⌘-jump can
  `set_focus()` the right window, and the main tab strip can mark a canvas as "detached."
- **⌘-jump (#76) integration:** ⌘N where canvas N is detached → `set_focus()` its window instead
  of switching the main view.
- **Main tab strip:** a detached canvas's tab shows it's in a window (grayed / "in window"
  marker); **closing the detached window re-docks** the canvas back into the main strip.
- **No persistence:** detached windows close on quit; relaunch starts single-window (all
  canvases in the main window).

Out of scope: persisting detached windows across restarts (per-session, chosen); popping out
Overview or individual panels (canvases only); showing the same PTY in two windows at once.

**Subtasks**

1. [ ] Capability + window creation: add `core:webview:allow-create-webview-window`; create a
   `WebviewWindow` rendering a **canvas-only** route for a given canvas id (unique label);
   focus it if it already exists.
2. [ ] Pop-out **button** (+ context-menu item) on the Canvas tab (`CanvasTabs`, #58) → open /
   focus that canvas's window.
3. [ ] Per-window terminals: the detached window has its own terminal pool subscribing to the
   shared PTYs' events; the main window stops rendering those agents (one PTY → one window;
   dispose+replay on move/re-dock); `resize_pty` from the showing window.
4. [ ] Cross-window state sync (mutations via backend + broadcast events) + a window↔canvas
   registry; mark detached canvases in the main tab strip; re-dock on window close.
5. [ ] ⌘-jump (#76): focus the detached window when its canvas is targeted.
6. [ ] Drag **tear-off**: dragging a tab out of the window spawns its window at the drop
   location (custom; build after the button works). Flag as fragile per the research.
7. [ ] Docs: update CLAUDE.md (no longer single-window-only).

**Acceptance criteria**

- [ ] A canvas tab can be opened in its own window via a pop-out button (and via dragging the
  tab out); it renders that canvas (BSP layout + live agents) in the new window.
- [ ] Two canvases can be shown on two monitors simultaneously, each interactive; an agent's
  terminal works in the detached window (typing/output) and is not double-rendered in the main
  window.
- [ ] ⌘N for a detached canvas focuses its window (raises it) rather than switching the main
  view; the main tab strip marks the canvas as detached.
- [ ] Closing a detached window re-docks its canvas into the main window; state stays consistent
  across windows (closing a panel in one reflects everywhere).
- [ ] Detached windows are not restored on relaunch (per-session); the app still builds/lints
  and CLAUDE.md no longer says single-window-only.

**Notes**

- Decisions (from the requester, after research): both a pop-out button and drag tear-off;
  per-session (no persistence); ⌘-jump focuses a detached canvas's window.
- Builds on the now-shipped **#76** (the ⌘1–9 canvas-jump this extends to `set_focus` a detached window).
  Coordinate with #77 (⌘\ view toggle — inert in a canvas-only secondary window) and #79
  (sidebar click → canvas focus should focus the detached window when its canvas is popped out).
- Big architectural change (multi-window + per-window terminal pools + cross-window state) and a
  reversal of the v1 single-window rule — likely the largest task in the backlog; consider
  phasing (button + core multi-window first; tear-off second).
- Key code: `src-tauri/tauri.conf.json` + `capabilities/` (window-create permission),
  `src-tauri/src/lib.rs` (window management, event targeting), `src/components/Canvas/*`
  (canvas-only window view, `CanvasTabs` pop-out + tear-off), `src/components/Terminal/terminalPool.ts`
  (per-window pool), `src/ipc.ts` / `src/outputBus.ts` (per-window event routing), `src/store.ts`
  (cross-window sync, window↔canvas registry), `src/useKeyboardNav.ts` (⌘-jump → focus window),
  `CLAUDE.md` (multi-window).

---

### 88. [ ] Replace the busy-indicator spinner with a Claude-style shimmer (dot-only)

**Status:** Not started · _(Not started | In progress | Blocked | Done)_
**Depends on:** none
**Created:** 2026-06-19

**Description**

The agent activity indicator (`BusyIndicator`, currently #71) animates its busy state as a
**rotating arc** — i.e. it reads as a generic loading spinner. Replace that with a **shimmer**: a
soft sheen/glint that **sweeps across the dot** while an agent is working, evoking Claude's own
"thinking" shimmer rather than a spinner. **Both states are redesigned to cohere** as one visual
language (idle = a calm dot; busy = that dot gaining a traveling sheen), staying within the
**existing tight ~12px slot** with **no layout shift** between states.

`BusyIndicator` is a single shared component rendered in **two places** — sidebar session rows
(`Sidebar.tsx`, `styles.rowBusy`) and **Overview** card headers (`Overview.tsx`, the `leading`
slot). Canvas panels don't show a busy state, so they're out of scope. The component's public API
(`{ busy, label }`, `role="status"`) stays the same — this is a CSS/visual redesign of one
component.

**Decisions (from the requester, after research):**
- Animation: **shimmer** (Claude-style), applied to the **indicator dot only** (not the agent name).
- Footprint: **keep the tight ~12px slot** — no header reflow in the sidebar or Overview.
- **Redesign both** idle and busy so they read as a single coherent design.
- Colors: keep the status tokens — **busy = `--status-running`** (blue), **idle = `--status-idle`**.

**Researched alternatives considered (for reference):** typing dots (SpinKit "Bounce Delay"/Flow),
equalizer bars (SpinKit "Wave"/Stretchdelay), breathing pulse + sonar ping (SpinKit "Scale Out").
Shimmer was chosen as the most on-brand for a Claude app.

**Out of scope:** shimmering the agent name text; widening the indicator slot; adding a settings
toggle between indicator styles (no settings screen in v1); the Canvas panel headers.

**Subtasks**

1. [ ] Rewrite `src/components/BusyIndicator/BusyIndicator.module.css`: remove the `busy-spin`
   rotation keyframes and arc; implement the **busy = shimmer** (a sheen sweeping across a
   `--status-running` dot via an animated gradient / pseudo-element, transform/opacity/
   background-position only — 60fps, no repaint), and **redesign the idle** `--status-idle` dot so
   the two states cohere. Keep a fixed ~12px `box-sizing: border-box` footprint so the slot never
   shifts between states.
2. [ ] Keep `BusyIndicator.tsx` API/markup essentially unchanged (`busy`/`label`, `role="status"`,
   `aria-label`/`title`); add a pseudo-element only if the shimmer needs one — prefer no new DOM.
3. [ ] **Reduced motion:** under the global `prefers-reduced-motion` killswitch (`global.css`),
   disable the sweep and show a **static busy state that's still clearly distinct from idle**
   (e.g. a solid/brighter blue dot).
4. [ ] Verify both call sites render correctly — sidebar rows and Overview card headers — with **no
   layout shift** toggling busy↔idle, and the dot still sits cleanly before the name.
5. [ ] Update docs to match: the `BusyIndicator` doc-comments (they describe the #71 spinner arc)
   and the busy-indicator description in **CLAUDE.md** (#42/#55/#71 — "small spinner arc"/"rotating
   spinner arc") → describe the shimmer.
6. [ ] `npm run build`, `npm run lint`, `npm test` all pass.

**Acceptance criteria**

- [ ] The busy state is a **shimmer sweeping across the dot** — **no rotation/spin** animation
  remains anywhere in the component.
- [ ] Idle and busy are a **coherent redesigned pair** (idle = calm dot; busy = shimmer), using
  **`--status-running`** (busy) and **`--status-idle`** (idle).
- [ ] The indicator stays within the **~12px slot** with **no layout shift** between states, in
  both the **sidebar** and **Overview** headers.
- [ ] Under **reduced motion**, the sweep is disabled and the busy state remains **visually
  distinct** from idle.
- [ ] `role="status"` + accessible label preserved; the app **builds, lints, and tests pass**;
  CLAUDE.md no longer describes the indicator as a spinner.

**Notes**

- Proposed best + sources (research): **shimmer** chosen as most on-brand — _"ChatGPT uses a
  pulsing effect, Claude uses a shimmer animation"_
  ([Claude UI research](https://hassantayyab.com/blogs/claude-better-ui-research-first),
  [Agentic Design patterns](https://agentic-design.ai/patterns/ui-ux-patterns)). CSS technique
  references: **SpinKit** (Tobias Ahlin, https://tobiasahlin.com/spinkit/,
  https://github.com/tobiasahlin/SpinKit) and **css-loaders.com** (Temani Afif,
  https://css-loaders.com/, 600+ single-element loaders).
- Lineage: this supersedes #71 (spinner arc), which superseded #55 (pulsing ball) / #42 (original
  busy indicator).
- Implementer latitude: exact sheen geometry/timing is yours to tune. If a literal sweep is too
  subtle at 12px, a soft **traveling glint/glow** is an acceptable realization — the bar is "not a
  spinner, reads as a shimmer, idle↔busy cohere, no layout shift."

---

### 89. [ ] New-session branch step: drop the acknowledgement checkbox + fix the clipped action buttons

**Status:** Not started · _(Not started | In progress | Blocked | Done)_
**Depends on:** none
**Created:** 2026-06-19

**Description**

Two fixes to the new-session panel's **branch step** (`NewSessionModal`, #66), seen when checking
out a **non-current branch while an agent is running in the folder** (the destructive-checkout
case, #27):

1. **Drop the acknowledgement checkbox.** Today the warning embeds a `Checkbox` (#52) that **gates**
   the primary button (`canCreate = … && (!isDestructive || acknowledged)`), so the user must tick
   it to proceed. Remove the checkbox **and the gate** — the **warning becomes informational only**
   (the warning-triangle icon + the same message text), still shown in the destructive case, and the
   primary button is always enabled (subject only to the usual `cwd` / `busy` checks).

2. **Fix the clipped action buttons.** The panel is a fixed **300px** (`.popover`); the branch-step
   action row has **three** buttons — `Cancel` / `Worktree` / primary — in a **non-wrapping** flex
   row, and the long **"Checkout & start"** label overflows the panel so the last button is clipped
   outside it. Fix by **(a)** renaming the branch-step primary button to just **"Start"** — always,
   even when a checkout will happen (the checkout still occurs; the warning covers the running-agents
   case) — and **(b)** hardening the `.actions` layout so it can **never** overflow regardless of
   label/locale (e.g. allow it to wrap to a second line and/or compact the buttons), keeping the
   right alignment.

**Scope:** the `NewSessionModal` component + its CSS only. The reusable **`Checkbox` component (#52)
is kept** — it just becomes unused (this modal is currently its only caller).

**Decisions (requester):**
- Primary button: **always "Start"** in the branch step.
- Layout: **rename + harden** the action row so it never clips.
- Checkbox: **remove the usage + the gate**, keep the warning text, **keep** the Checkbox component.

**Concrete changes (grounding):**
- `NewSessionModal.tsx`: remove the `acknowledged` state and all `setAcknowledged(...)` calls;
  `canCreate` → `!!cwd && !busy` (drop the `(!isDestructive || acknowledged)` gate); replace the
  `<Checkbox …>` inside the `.warning` block with a plain text span (icon + the existing message),
  and remove the `Checkbox` import; branch-step primary label → `"Start"` (was
  `willCheckout ? "Checkout & start" : "Start"`), keeping the `⏎` hint. `willCheckout` is still used
  to pass the branch to `spawnSession`, and `isDestructive` still decides whether the warning shows.
- `NewSessionModal.module.css`: make `.actions` robust (e.g. `flex-wrap: wrap` and/or compact
  padding) so three buttons never overflow 300px; remove the now-unused `.warnCheckbox` rule and
  update the `.warning` comment ("the checkbox gates Start" → informational).

**Out of scope:** widening the 300px panel as the primary fix (allowed only if the implementer
finds wrapping insufficient); changing the folder-step buttons; deleting the `Checkbox` component;
the worktree (⌘⏎) behaviour itself.

**Subtasks**

1. [ ] Remove the acknowledgement checkbox + gate: delete `acknowledged` state + `setAcknowledged`
   calls; `canCreate = !!cwd && !busy`; render the warning as icon + text (no `Checkbox`); drop the
   `Checkbox` import.
2. [ ] Branch-step primary button → always **"Start"** (keep the `⏎` hint); `willCheckout` still
   drives the actual checkout passed to `spawnSession`.
3. [ ] Harden `.actions` so `Cancel` / `Worktree` / `Start` never clip in the 300px panel (wrap
   and/or compact, right-aligned); remove the unused `.warnCheckbox` CSS and fix the `.warning`
   comment.
4. [ ] Keep the reusable `Checkbox` component (#52) in place (now unused).
5. [ ] `npm run build`, `npm run lint`, `npm test` pass; manually verify the destructive scenario
   (non-current branch + a running agent in the folder): warning shows with **no checkbox**, "Start"
   enabled, and **all buttons fully visible** (no clipping).

**Acceptance criteria**

- [ ] In the branch step, selecting a non-current branch with a running agent in the folder shows the
  warning as **informational text (no checkbox)**, and the primary button is **enabled without any
  acknowledgement**.
- [ ] The branch-step primary button always reads **"Start"** (with the `⏎` hint); choosing a
  non-current branch still checks it out before starting.
- [ ] All action buttons (`Cancel` / `Worktree` / `Start`) are **fully visible within the 300px
  panel** — nothing clipped — including when the row wraps.
- [ ] The reusable `Checkbox` component still exists; `npm run build`, `npm run lint`, and `npm test`
  all pass.

**Notes**

- Reported via screenshot: branch step for folder "standings", branch "temporary" (non-current) with
  1 running agent → a warning with a checkbox, and "Checkout & start" clipped outside the panel.
- Root cause of clipping: `.popover` `width: 300px` + a non-wrapping `.actions` row of three buttons;
  the long "Checkout & start" label overflows (renaming to "Start" helps but isn't guaranteed
  sufficient on its own — hence hardening the layout).
- Touches `NewSessionModal` only (#66/#27/#52/#74); independent of the open tasks (#84, #88).
- Trade-off accepted by the requester: "always Start" drops the explicit "a checkout will happen"
  cue in the **non-destructive** checkout case (non-current branch, no running agents → no warning).

---

### 90. [ ] File viewer: built-in searchable file selector in the header (click the filename → switch file)

**Status:** Not started · _(Not started | In progress | Blocked | Done)_
**Depends on:** none
**Created:** 2026-06-19

**Description**

Give the universal read-only **file viewer (#44)** a **built-in file selector**: clicking the
**filename in the viewer header** opens a **searchable picker** of the repo's files, and choosing
one **swaps the viewer to that file** in place. Today a file viewer is bound to whatever file it was
opened with — to look at a different file you must close it and open another from the repo menu
(#82) / file picker (#56). This lets the user search + select a different file directly in the
viewer.

**Important grounding:** the header in the screenshot (the color dot + filename + `repo · branch` +
×) is **not** rendered by `FileViewer` — it's drawn by the **parent**: the Overview `ExtraPanel`
(`PanelColumn` title, `Overview.tsx`) and the Canvas panel header (`Canvas.tsx`). So the selector
trigger lives in **those headers**, reusing the existing **`FilePicker` (#56)**; `FileViewer` itself
needs no change — it already reloads when its `file` prop changes (`load` deps `[repoPath, file]`,
and the raw toggle resets on `[file]`).

**Decisions (requester):**
- **Trigger:** the header **filename becomes a button** (with a small ▾ caret hint); clicking opens
  the searchable picker popover.
- **Surfaces:** **both** Overview file columns **and** Canvas file panels.
- **Repo scope:** **same repo only** — the picker lists `listFiles(repoPath)` (like the repo menu's
  "File viewer" add); the viewer stays bound to its repo.
- **Duplicate file:** **just switch it** — switching to a file already open as another panel is
  allowed (the in-place change is literal); the add-from-menu dedup in `addOverviewPanel` is left
  intact.

**Concrete changes (grounding):**
- **Store** — add `setOverviewPanelFile(repoPath, panelId, file)`, mirroring `setDiffCompare`
  (`store.ts`): `panels.map((p) => p.id === panelId ? { ...p, file } : p)`, set state, persist via
  `ipc.setOverviewPanels`. Do **not** dedup on change (allow an already-open file).
- **Canvas** — add a pure leaf-content update in `Canvas/canvasTree.ts` (e.g.
  `updateLeafContent(tree, leafId, partial)`) + a store action to set the **active** canvas leaf's
  `content.file`, persisting through the existing `setActiveCanvasLayout` (canvases blob).
- **Header trigger** — render the file-viewer header filename as a button (▾ caret) that opens a
  popover hosting `FilePicker` (#56); load `listFiles(repoPath)` on open; dismiss on pick /
  outside-click / Escape. Prefer extracting a **small shared component** so Overview and Canvas
  don't duplicate the popover logic.
- **Wire-up** — Overview `ExtraPanel` (file panels only, `kind: "markdown"`) → `setOverviewPanelFile`;
  Canvas file panels (`content.kind === "file"`) → the leaf-file action. Agent/diff/terminal headers
  are untouched.

**Out of scope:** switching the viewer to a **different repo's** file (same-repo only); adding the
selector to diff/terminal/agent panels; changing `FileViewer`'s content rendering or polling.

**Subtasks**

1. [ ] Store: `setOverviewPanelFile(repoPath, panelId, file)` (mirror `setDiffCompare`) — set the
   panel's `file` + persist; allow switching to an already-open file.
2. [ ] Canvas: pure `updateLeafContent` in `canvasTree.ts` + a store action to set the active
   canvas leaf's `content.file`, persisted via `setActiveCanvasLayout`.
3. [ ] Header trigger: filename → button (▾ caret) opening a `FilePicker` (#56) popover over
   `listFiles(repoPath)`; dismiss on pick / outside-click / Escape; prefer a small shared component
   reused by both surfaces.
4. [ ] Wire Overview `ExtraPanel` (file panels) and Canvas file panels to their respective update
   actions; leave agent/diff/terminal headers unchanged.
5. [ ] Confirm the swap works end-to-end (content reloads, markdown raw toggle resets) with **no**
   `FileViewer` change needed, and the swapped file **persists** across reload/restart.
6. [ ] `npm run build`, `npm run lint`, `npm test` pass.

**Acceptance criteria**

- [ ] Clicking the filename in a file viewer's header (Overview column **and** Canvas panel) opens a
  **searchable picker** of the repo's files (reusing `FilePicker` #56).
- [ ] Selecting a file **swaps that viewer** to it — content reloads, the markdown Rendered/Raw
  toggle resets — and the change **persists** across an app reload/restart.
- [ ] The picker lists files from the **viewer's own repo only**; choosing a file already open
  elsewhere just switches this viewer (no error, no forced dedup).
- [ ] Agent / diff / terminal headers are unchanged; the popover dismisses on pick, outside-click,
  and Escape.
- [ ] `npm run build`, `npm run lint`, and `npm test` all pass.

**Notes**

- Reported via screenshot: a file viewer header ("● .env.example  standings · main  ×") — the user
  wants to search + select a different file from within the viewer.
- Reuses `FilePicker` (#56) and the `listFiles` IPC (same as the repo menu's "File viewer" add,
  #82). State-update precedent: `setDiffCompare` (`store.ts`) updates a panel in place + persists.
  Builds on #44 (FileViewer), #59 (overviewPanels as the single item source), #46/#47 (Canvas).
- Independent of the open tasks (#84, #88, #89).
