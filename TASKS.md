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

> Tasks #1–#92 have shipped; newer open tasks (#93+) are in **## Tasks** below.
> Completed tasks are condensed here — number, title, and one line
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

**Multi-window canvases (#84).** Canvas tabs detach into their own native window.

- #84 Open a canvas in its own window (multi-monitor) — pop-out button on the tab + drag tear-off; a canvas-only `?canvas=<id>` window (`CanvasWindow` over the shared `CanvasSurface`) with its own terminal pool over the shared backend PTYs; pure `computeSessionOwners` keeps one PTY in one window (the other shows a `DetachedNote`); cross-window sync via `canvas://changed` / `canvas://windows`; ⌘1–9 + a detached-tab click raise the window (`focus_canvas_window`); re-dock on close; per-session (not restored on relaunch). Reverses the v1 single-window rule.

**Busy-indicator shimmer (#88).** The agent activity dot reads as a shimmer, not a spinner.

- #88 Replaced the #71 spinner arc with a Claude-style **shimmer** — a calm `--status-idle` dot that, while busy, turns `--status-running` with a soft sheen sweeping across it (animated `background-position` on a `::after`; the dot via `::before`, no extra DOM); fixed ~12px slot (no layout shift); reduced-motion → a solid glowing blue dot.

**New-session branch step (#89).** Informational warning + a never-clipping action row.

- #89 New-session branch step: dropped the acknowledgement checkbox **and** its gate (the destructive-checkout warning is now informational — the alert icon + the same text); the branch-step primary button always reads **Start** (the checkout still happens), and the `.actions` row wraps instead of overflowing the fixed 300px panel. The reusable `Checkbox` (#52) is kept (now unused).

**File-viewer file switcher (#90).** Pick another file from the viewer header.

- #90 File viewer: the header filename is now a **switcher** — clicking it opens a searchable `FilePicker` (#56) popover of the repo's files (shared `FileSwitcher` component) and picking one swaps the viewer **in place**, in both Overview file columns and Canvas file panels; persisted (store `setOverviewPanelFile` / `setLeafFile` via the pure `updateLeafContent`). Same-repo only; `FileViewer` itself unchanged.

**Folder bulk actions (#91).** Kill all agents / close all items, from the repo menu.

- #91 Sidebar repo menu: two destructive bulk actions above "Forget folder" — **Kill all agents** (kill + forget every running agent in the folder, incl. its worktree agents #74; shown only with ≥1 running) and **Close all items** (also removes every non-agent view — each terminal's shell killed — while keeping the folder in recents). Both confirm first when agents are running and emit a single summary toast (store `killAllAgents` / `closeAllItems`, mirroring `forgetRepo`).

**Restart-button stacking fix (#92).** The exit-overlay button is clickable again.

- #92 Fixed the unclickable **Restart** button on the exited-process overlay: the pooled xterm's internal positive-z-index layers were out-stacking the overlay for hit-testing. `.slot` now forms its own stacking context (`z-index: 0`) so those layers stay contained, and `.exitOverlay` sits explicitly above (`z-index: 1`) — so Restart (and the "Reconnecting…" overlay) receive pointer events again.

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

Tasks #1–#92 are complete — see **Implemented (completed tasks)** above for the index,
and git history for full per-task detail. The open tasks (#93+) follow. New work goes
here as a fresh `### N.` entry in [TASKS-TEMPLATE.md](TASKS-TEMPLATE.md) format, with
its `Depends on:` prerequisites.

> **Implementing tasks — never skip one.** The agent implementing this backlog
> (`/develop-tasks`, `/isolate-agent`, `/handoff`) MUST implement **every** open task
> whose dependencies are all complete — take the lowest-numbered such `### N.` first —
> and must **never skip a task because it looks big, risky, or hard to verify**. Size is
> not a reason to defer: a task that is genuinely too large for one pass must be **split
> into smaller dependent sub-tasks** first (as #93 was split into #93 + #94), and then
> one of those is implemented — skipping is never the answer. Every task is carried to a
> finished, building, lint-clean state.

---

### 93. [ ] Scheduled sessions (part 1 of 2): scheduling engine + launcher — schedules fire into live agents

**Status:** Not started · _(Not started | In progress | Blocked | Done)_
**Depends on:** none
**Created:** 2026-06-19

**Description**

**Part 1 of two** (#94 is part 2). Deliver **scheduled sessions end-to-end at the engine level**: the
user can schedule an agent to launch automatically at a chosen time (optionally pre-seeded with a
prompt so `claude` starts ready), it **persists**, and at the time it **fires into a normal live
agent**. This part owns the **backend engine + data model + the launcher (button/⌘⇧N + modal) + a
minimal pending list**; the **rich draggable item type and the editable auto-saving panel are #94**,
which builds on this part's records + commands.

> Split rationale: scheduling spans a Rust engine *and* a cross-surface React item type. Part 1 is
> the engine + create/fire loop (verifiable by `cargo test` + a 1-minute schedule); part 2 is pure
> frontend on top of this part's finished data/command surface. Part 1 exposes the full
> update-prompt/name/time command surface up front so part 2 needs **no** backend changes.

**Pieces (this part):**

- **"+ Schedule session" button** below the "New session" button in the sidebar (`Sidebar.tsx`),
  with a distinct-but-related keybind **⌘⇧N** (⌘N opens New session #26; ⌘⇧N schedules). Add it to
  `useKeyboardNav` — the existing ⌘N branch requires `!e.shiftKey`, so ⌘⇧N is free and "fitting".
- **Schedule modal** = the New-session flow (folder → branch, **reusing `NewSessionModal`**'s
  two-step #66 UI) **plus a final step**: pick a **launch time** (date + time), optionally enter a
  **prompt**, and optionally a **custom name** (re-added here — #66 dropped the inline name field, but
  #94's panel surfaces a name). The **prompt is optional** (it can be added/edited later in #94's
  panel).
- **Prompt → run command.** The prompt is passed **positionally** so `claude` boots with it ready:
  `claude --session-id <uuid> "<prompt>"` (combined with the existing optional `git checkout`).
  Backend: extend `pty.rs spawn_session` to accept an optional initial prompt appended after
  `--session-id <id>` (the args are currently a fixed slice; add the positional). **Verify against
  the real CLI** (as #30 did for `--session-id`/`--resume`) and record the finding.
- **Scheduling engine (backend).** Persist scheduled records — `{ id, cwd, branch (+ checkout?),
  worktree?, name?, prompt, fire_at, created_at }` — in the app-data dir (`store.rs`); arm a backend
  timer/scheduler (`lib.rs`/`pty.rs`); when `fire_at` is reached, spawn the agent (with checkout +
  prompt), **convert** the scheduled record into a live session, and emit an event so the frontend
  moves the item scheduled→live. On boot, reload schedules and re-arm; if `fire_at` **already passed**
  while the app was closed, **fire on boot (catch-up)**. Tauri commands: **create / list / cancel /
  update (prompt, name, time)** — expose the full update surface now so #94 is pure UI.
- **Frontend store/IPC.** Scheduled-sessions state + typed IPC + actions (schedule, cancel,
  updatePrompt/name/time, onFired→move into `sessions`); persistence wiring.
- **Minimal pending UI (so it's usable + verifiable).** A **basic pending-schedules list in the
  sidebar** under each repo — name/branch + fire time + a × to **cancel** — enough to create, see,
  cancel, and watch a schedule fire into a live agent. Non-draggable, no rich panel (that's #94).

**Decisions / out of scope (assumed — no requester Q&A):**
- Keybind **⌘⇧N**; prompt **optional**; **catch-up fire on boot** for schedules missed while closed;
  re-add an optional **custom name** in the schedule flow. Time zone = the local machine zone.
- **One-shot** schedules only — **recurring** schedules are out of scope.
- **Deferred to #94:** the draggable scheduled item type in Overview + Canvas (`payloadToContent`),
  and the scheduled-agent panel with the big **auto-saving** prompt editor / in-panel prompt editing.
  Part 1 only sets the prompt **at creation time** in the modal.

**Subtasks**

1. [ ] **Backend data + spawn:** persisted scheduled-session records (`store.rs`); Tauri commands to
   create / list / cancel / update (prompt, name, time) (`commands.rs`); extend `pty.rs spawn_session`
   to append an optional positional prompt — and **verify the `claude "<prompt>"` invocation** works
   (note it in CLAUDE.md like #30).
2. [ ] **Scheduling engine:** arm timers per schedule; on fire spawn (checkout + prompt) and convert
   to a live session; boot reload + **catch-up**; emit fired/updated events (`lib.rs`/`pty.rs`).
3. [ ] **Frontend store/IPC:** scheduled-sessions state + typed IPC + actions (schedule, cancel,
   updatePrompt/name/time, onFired→move into `sessions`); persistence wiring.
4. [ ] **Launcher:** "+ Schedule session" button under New session + **⌘⇧N** (`useKeyboardNav`);
   the schedule modal (reuse `NewSessionModal` folder→branch + a final time/prompt/name step).
5. [ ] **Minimal pending list:** basic sidebar rows per repo (name/branch + fire time + cancel),
   non-draggable.
6. [ ] **Docs + checks:** update CLAUDE.md (scheduled sessions, ⌘⇧N, the engine, the positional-prompt
   spawn); `npm run build`, `npm run lint`, `npm test`, `cargo test` pass.

**Acceptance criteria**

- [ ] A "+ Schedule session" button (and **⌘⇧N**) opens a modal that mirrors New session (folder →
  branch) and adds a final step to pick a **launch time** and optionally a **prompt** (+ name);
  scheduling with **no prompt** is allowed.
- [ ] At the scheduled time the agent launches automatically with the prompt pre-loaded
  (`claude --session-id <id> "<prompt>"`, plus checkout when a non-current branch was chosen), and
  the scheduled item becomes a normal live agent; a schedule **missed while the app was closed fires
  on next boot**.
- [ ] Pending schedules show in the **sidebar** (name/branch + fire time) and can be **canceled**;
  records **persist** across restart (timers re-armed on boot).
- [ ] `npm run build`, `npm run lint`, `npm test`, and `cargo test` pass; CLAUDE.md documents the
  feature and the **verified** positional-prompt invocation.

**Notes**

- **Part 1 of 2** — #94 adds the rich draggable item type + the auto-saving panel and **depends on
  this part's** data model + update commands (exposed here so #94 is pure UI, no Rust changes).
- Reuses `NewSessionModal` (#66), the spawn flow (`pty.rs`), and keyboard nav (#26). The positional
  `claude "<prompt>"` invocation must be CLI-verified before relying on it (mirror the #30 note in
  CLAUDE.md).
- Independent of the other open tasks (#88–#92).

---

### 94. [ ] Scheduled sessions (part 2 of 2): draggable item type (sidebar/Overview/Canvas) + auto-saving prompt panel

**Status:** Not started · _(Not started | In progress | Blocked | Done)_
**Depends on:** #93
**Created:** 2026-06-19

**Description**

**Part 2 of two** — builds on **#93** (the scheduling engine, the schedule modal, and the basic
pending list). Turn scheduled sessions into a **first-class, draggable item type** across every
surface and add the **editable scheduled-agent panel**. This part is **pure frontend** — it consumes
#93's persisted records + Tauri commands (including **update-prompt / name / time**); **no backend or
engine changes**.

**Pieces:**

- **Sidebar:** upgrade #93's basic pending row into the **standard draggable item** (like sessions /
  files / diffs, #45/#59) — a dnd-kit **draggable source** that drops into the active Canvas; a click
  **selects/jumps** to it in the current view (#79); the × **cancels** the schedule.
- **Overview:** a **scheduled card** in the repo cluster (#38), reusing the shared panel body.
- **Canvas:** a new `CanvasContent` kind **`"scheduled"`** + a **`payloadToContent`** case (new item
  types are draggable by default per that pattern, #47/#59), resolved at render to the shared panel.
- **Scheduled-agent panel** (shared body for the Overview card + Canvas panel): shows **branch,
  custom name, and fire time**, plus a **big prompt textarea** that **auto-saves** (debounced) to the
  record via #93's **update-prompt** command — the prompt is optional and editable any time before it
  fires; includes a **cancel** control. In-panel editing of **name / fire-time** too (uses #93's
  update-name/time commands) if straightforward.
- When the schedule **fires** (engine, #93), the item is consumed and becomes a normal live agent
  everywhere; this panel is the **pending (pre-fire)** representation.

**Out of scope:** any backend/engine change (all in #93); recurring schedules.

**Subtasks**

1. [ ] **Sidebar:** upgrade the pending row to a dnd-kit draggable item (drop into Canvas),
   click-to-select/jump (#79), × cancel.
2. [ ] **Overview:** a scheduled card using the shared panel body.
3. [ ] **Canvas:** `"scheduled"` content kind + `payloadToContent` + render the shared panel body.
4. [ ] **Scheduled-agent panel:** branch / name / fire-time details + a **big auto-saving prompt
   textarea** (debounced → #93 `update-prompt`) + cancel; optional in-panel name/time edit.
5. [ ] **Docs + checks:** update CLAUDE.md (the scheduled **item type** + the auto-saving panel +
   drag-into-canvas); `npm run build`, `npm run lint`, `npm test` pass.

**Acceptance criteria**

- [ ] Scheduled sessions appear in the **sidebar** (draggable + cancelable), in **Overview**, and can
  be **dragged into a Canvas**.
- [ ] The scheduled-agent panel shows **branch, custom name, and fire time**, and a **big prompt
  field that auto-saves** as you type (persisted via #93's command); a schedule created with **no
  prompt** can have one **added later** here.
- [ ] Canceling from any surface removes the schedule (and its timer, via #93).
- [ ] `npm run build`, `npm run lint`, and `npm test` pass; CLAUDE.md documents the item type + panel.

**Notes**

- **Part 2 of 2** — depends on **#93** for the records, store state, and update commands; this part is
  **pure frontend** (no Rust changes).
- Reuses item plumbing — sidebar drag (#45/#59), Overview cluster (#38), Canvas `payloadToContent`
  (#46/#47). Created via the schedule modal (#93), **not** the repo "Views" registry (#82), so #82 is
  unaffected.
