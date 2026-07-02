# Tasks

This is the **permanent archive** of completed tasks, maintained by the `kanban-dev-pima`
pipeline's **`/archive-tasks`** lane (it appends a `## Task <N>` entry as each `ARCHIVE` card is
finished). A task number counts as a satisfied dependency once it appears here (or in the
board's `## ARCHIVE` column). Numbers are **global and never reused** — the next number is one
greater than the highest used anywhere (board, `PLAN-*.md`, this file).

The **Implemented (completed tasks)** index below is a condensed, one-line-per-task record of
everything shipped so far — **#1–#310**. Earlier tasks were carried over from the prior pipeline;
tasks #152–#310 (originally written out as full `### N. [x]` entries) were **condensed into the
same index style** to keep this file small — their full detail (Description / Subtasks /
Acceptance / Implementation report) lives in git history and each task's PR. New archived tasks
are appended (as `## Task <N>` or `### N. [x]` entries) after the index.

---

## Project context

**ReCue** — a **macOS and Windows** desktop app (**Rust + Tauri 2 + React/TypeScript**) for
running and managing many live coding-agent CLI sessions at once (Claude by default; Codex and
OpenCode are pluggable, #101/#141): an **Overview** "agent wall" of real terminals, a **Canvas**
split-panel workspace (with file, **git-diff**, and terminal viewers), and a repo-grouped
**sidebar**. Each session is a **real PTY running the agent CLI** — ReCue provides the window
chrome, navigation, persistence and git-reading; the terminals come from the CLI itself. See
`CLAUDE.md` for the authoritative, current architecture; this file is the shipped-task history.

**Stack:** Tauri 2 · React + TypeScript + Vite · **Zustand** · plain CSS with
CSS-variable design tokens (CSS Modules) · **xterm.js** terminals · **`portable-pty`**
(Rust) · JSON persistence in the app-data dir · **Lucide** icons · **JetBrains Mono**
(bundled, offline).

**Scope (v1 baseline + later reversals — see `CLAUDE.md` for the current authority):** no
status system beyond the busy/idle/awaiting indicator (#42/#55/#71/#88/#95/#112) · no
app-rendered approval UI (users answer in the terminal) · no Skills manager · no light mode ·
no auth. Several original v1 "out of scope" rules were **later reversed** by shipped tasks: a
**Settings** screen (#100/#102/#103), **multi-window** Canvas tabs (#84), **Fork** an agent's
conversation (#126), **Windows** support (#139/#140/#143), **in-app auto-update** + release
pipeline (#190), and **macOS code signing / Hardened Runtime + entitlements** for permissions
(#292). **Git is read-mostly** — ReCue reads git (branch + working-tree diff vs `HEAD`, branch
compare #81, per-file status #252) and never commits/pushes; its writes are `git checkout` (#27),
`git worktree add`/`remove` (#74), **branch creation** (#124), `git fetch` (#180), `git pull
--ff-only` (#181), and `git clone` (#295/#308). **Files are read-mostly too** — the viewer
lists/reads repo text files (#40/#44) plus path-validated writes: `write_text_file` (#141, the
Kanban board + editable raw view), `move_into_repo` (#253, OS file drop), and `create_dir` /
`delete_path` / `rename_path` (#267/#291). Agent CLIs are assumed on `PATH` (clear in-app error
if missing).

> The original design spec and interactive prototype (`HANDOFF.md`,
> `Conductor.dc.html`) are preserved in git history (commit `b02efd8`
> "System referances") if exact prototype details are ever needed.

---

## Implemented (completed tasks)

> Tasks #1–#153 have shipped — the backlog is fully implemented (no open tasks).
> Completed tasks are condensed here — number, title, and one line
> on what each delivered — and their full entries removed from the list below; per-task
> detail (subtasks, notes, acceptance, implementation reports) lives in git history.
> This is the running record of what ReCue has shipped.

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

**Scheduled sessions — engine + launcher (#93, part 1 of 2).**

- #93 Scheduled sessions (part 1): an agent can be **scheduled to launch later**. A "+ Schedule session" sidebar button / **⌘⇧N** opens the new-session modal in **schedule mode** (folder → branch → launch time + optional prompt + name → `create_schedule`); records persist (`store.rs` `schedules`), and a `lib.rs` poll loop fires due ones — checkout + spawn `claude` **pre-seeded with the prompt** (positional `claude --session-id <id> "<prompt>"`, CLI-verified) → a live session, emitting `schedule://fired`; **boot catch-up** for schedules missed while closed; one-shot; pending schedules listed in the sidebar with cancel. The full create/list/cancel/update command surface is exposed for #94.

- #94 Scheduled sessions (part 2): a schedule is now a first-class **draggable item type** — a `CanvasContent` `kind: "scheduled"` (+ a `payloadToContent` case) rendering the shared **`ScheduledPanel`** (an auto-saving launch-time / name / **prompt** editor, debounced → `update_schedule`, + cancel) in the **sidebar** (a draggable row; click selects/jumps #79; × cancels), an **Overview card**, and a **Canvas panel**. Pure frontend on #93's command surface; time helpers in `src/time.ts`.

**Agent items: single-line label + larger activity dot (#95).**

- #95 Slimmed agent items to a single thin line and enlarged the activity dot. The shared `BusyIndicator` (#88) is now a ~10px dot in a ~14px slot (still a fixed slot — no idle↔busy layout shift) everywhere it appears: Overview agent cards + sidebar rows. Agent labels render **only the primary** — the custom name if set, else the branch, with no subtitle line — on all three surfaces (sidebar `SessionRow`, Overview `SessionCard`, Canvas agent panels). The colored repo dot was removed from **every** Overview card (the `.metaDot` on agent / diff / file / scheduled cards) and from Canvas **agent** panels; repo color still reads from each card's colored top band. Canvas non-agent panels keep their dot + meta. Purely visual.

**Worktree agents grouped & badged in Overview/Canvas (#96).**

- #96 A worktree agent (#74) now reads as part of its **parent repo** instead of a foreign-colored stray. A pure `effectiveRepo(session)` (`worktreeParent ?? repoPath`, in `src/paths.ts`) drives Overview grouping / sort / filter, so a worktree agent's card sits **inside the parent's cluster** sharing the parent's color (top band + selection frame) while still labelled with **its own branch** (#95). "This is a worktree" is now a small **"worktree" text badge** (mirroring the sidebar's #74 chip) on the Overview `SessionCard` and the Canvas agent-panel header — never a color difference. Sidebar + `repoColor` unchanged (the fix is *which* repo we color by). Purely visual.

**Auto-named agents from claude's own `ai-title` (#97).**

- #97 An agent with **no custom name** now shows **claude's own session title** rather than the bare branch. A new persisted `auto_name` field (Rust `PersistedSession` + `SessionView`) is filled by a backend **title reader** (`src-tauri/src/title.rs`) that globs the session's `~/.claude/projects/*/<uuid>.jsonl` log by UUID and takes the latest `ai-title` (fallback: the trimmed first `last-prompt`, else the branch). A dedicated **title-worker** thread re-reads it on each busy→idle edge **off the monitor's hot path** (the monitor only pokes it via a channel), emitting `SessionEvent::Name` → `session://name`; `lib.rs` persists + forwards it and the frontend updates `autoName`. `sessionLabel` now resolves **`custom || auto || branch`**, so the title fills the single-line label (#95) everywhere (sidebar / Overview / Canvas) — a user rename (#57) still wins, and it covers interactive, worktree (#74), and scheduled (#93) agents. Best-effort: a missing / unreadable / format-changed log degrades to the branch, and the busy indicator is never stalled.

**Fix: detached canvas window renders its panels (#98).**

- #98 Popping a canvas into its own window (#84) showed an **empty** "open in its own window" placeholder instead of the canvas's panels: `CanvasSurface` reused the main-window guard `detachedCanvasIds.includes(activeCanvasId)`, which is also true in the detached window (it forces `activeCanvasId` to its own detached id). Gated it on `IS_MAIN_WINDOW`, so only the **main** window shows the note while the detached window renders its layout — live agent terminals (it owns its sessions) plus file / diff / terminal panels. One-line frontend fix in `CanvasSurface.tsx`; a PTY is still never drawn in two windows.

**Tighter New ↔ Schedule button gap (#99).**

- #99 Tightened the vertical gap between the sidebar's **New session** and **Schedule session** (#93) buttons from 12px to 4px so they read as one compact cluster — reduced only `.newButton`'s bottom margin (`Sidebar.module.css`); the Schedule button (top margin 0) and the rest of the sidebar spacing are unchanged. Pure CSS.

**Settings screen — infra + Terminal / Sessions / Data sections (#100, part 1).**

- #100 Added an application **Settings** screen (reverses the v1 "no settings screen" rule, as #84 reversed multi-window). A new **thin footer row** pins to the bottom of the sidebar (hairline-topped, laid out for more quick actions) with a **⚙ gear** opening a centered **Settings modal** — scrim + focus-trap + Escape, a left section nav + content pane, a modal-local **draft** applied only on **Save** (Cancel / Escape / scrim discard; + "Reset to defaults"). Settings persist through the Rust store as an opaque `settings` blob (`get_settings` / `set_settings`), merged over **TS-side defaults** so an older `sessions.json` upgrades cleanly. Wired sections: **Terminal** (font size / line height / cursor blink → applied to the **live** pooled xterms + new ones via `terminalPool.applyTerminalSettings`), **Sessions** (auto-name toggle gating #97's `ai-title` label across sidebar / Overview / Canvas), and **Data & About** (open data folder, clear recents, app + `claude` versions — backend `open_data_folder` / `clear_recents` / `app_version` / `claude_version`). **Appearance** (accent + reduce-motion) → #102, **Behavior** (default view + confirm-destructive) → #103.

**Pluggable coding-agent CLI — abstraction + persistence (#101, part 1).**

- #101 Made the coding-agent CLI **pluggable** (part 1 of 2): a new `AgentSpec` abstraction (`src-tauri/src/agents.rs`) — a built-in catalog describing each agent's binary + how it spawns / resumes / seeds a session + capability flags (resume / auto-name / install-hint) — with the **`claude`** spec preserving today's exact flags (`--session-id <uuid>`, `--resume <uuid>`, positional prompt). Each session/schedule now **records its own `agent`** (`PersistedSession` / `ScheduledSession`, serde-default `"claude"`; TS `SessionRecord` / `SessionView` / `ScheduledSession` mirrors + record→view mapping). The spawn/resume **path is generalized off the `"claude"` literal**: `pty.rs` (`spawn_session` / `spawn_session_with_prompt` / `resume_session`) resolves the spec's `binary_name` + arg builders, and `commands.rs` (`spawn_session` / `spawn_worktree_agent` / `create_schedule` / `fire_due_schedules`) + the `lib.rs` boot-resume loop thread the agent (default Claude, stored on the record, resumed with the **stored** agent). **Claude is still the only agent and behaves identically** (verified). Codex spec + Settings "Agent" select + resume-capability gating + missing-binary / auto-name / UI-copy generalization remain for a future part 2.

**Settings — Appearance section (#102).**

- #102 Wired the **Appearance** section of the Settings modal (#100): an **accent color** swatch picker over the Catppuccin palette (`REPO_PALETTE`) — the chosen hex overrides the `--accent` token on `:root` (Peach is the default, stored as `""` so the token stands) — and a **Reduce motion** toggle that forces the motion killswitch on via a `body.reduce-motion` class (mirroring the `prefers-reduced-motion` block in `global.css`). Both apply on Save + boot through the store's `applySettingsEffects` (DOM-guarded for the test env); the `accentColor` / `reduceMotion` fields + persistence already existed (#100). Behavior section → #103.

**Settings — Behavior section (#103).**

- #103 Wired the **Behavior** section of the Settings modal (#100), completing its five sections: a **Default view on launch** segmented choice (Overview / Canvas) — applied once at boot in the store's `init` (main window only, so a mid-session view change is never overridden) — and a **Confirm destructive actions** toggle (default on) gating the Sidebar repo menu's three confirm steps (Forget folder / Kill all agents / Close all items — the `menuMode` state machine): off → the action runs immediately, on → the confirm sub-view shows (#91). Frontend-only; the `defaultView` / `confirmDestructive` fields + persistence already existed (#100).

**Detached canvas window — panel content scrolls (#104).**

- #104 Fixed overflowing panel content being **clipped with no scrollbar** in a detached canvas window (#84): the window wrapper `.body` (`CanvasWindow.module.css`) was a plain block, so the shared `CanvasSurface` `.area` (`flex: 1; min-height: 0; overflow: hidden`) had no bounded height — it grew to content height and each panel's internal scroller never engaged. Made `.body` a **flex column** (mirroring the main window's `.canvas` wrapper) so the height chain cascades and long FileViewer / diff / code content scrolls. CSS-only; the main-window Canvas was already correct.

**Detached canvas window — DOM renderer fixes garbled agent terminals (#105).**

- #105 Agent (`claude`) terminals rendered **garbled** — doubled/ghosted glyphs, misaligned box-drawing — in a detached canvas window (#84), a known **WebGL glyph-atlas / `devicePixelRatio`** artifact in a freshly-opened secondary native window. Fix: skip the `WebglAddon` in detached windows (`terminalPool.ts`, guarded by `!IS_MAIN_WINDOW`) so they use xterm's **DOM renderer** (visually equivalent, no artifact); the main window keeps WebGL, so its rendering is **provably unchanged** (the guard is true there). **Runtime-unverified** — xterm rendering isn't unit-testable and a window can't be popped out in the dev environment, so flagged for manual verification (per the #84 precedent); a residual stale-scrollback-replay contribution, if any, is a follow-up.

**Forget folder — complete teardown of items + schedules (#106).**

- #106 Made the repo menu's **Forget folder** (#31) a *complete* teardown: it killed the folder's agents but left its non-agent items (file/diff viewers, shell terminals #72 with PTYs still running) and pending schedules behind. Factored #91's item-teardown out of `closeAllItems` into a shared `closeRepoItems` helper (kills each terminal PTY as intentional, drops `overviewPanels[repoPath]`, prunes `terminalExits`, persists the cleared list) and called it from `forgetRepo` too; `forgetRepo` also **cancels the folder's pending scheduled sessions** (#93/#94, by `cwd`) and reports everything removed (agents + views + scheduled) in one summary toast. `closeAllItems` is unchanged (still keeps the folder in recents — the only difference between the two).

**Accent color updates hover / dim / on-accent tokens (#107).**

- #107 Fixed the Settings accent picker (#102) only overriding `--accent`, so button **hover stayed Peach** (and dim / on-accent surfaces too) because the **derived** tokens kept their defaults. Added a pure `accentCompanions(hex)` helper (a ~18%-lightened hover, the accent at `0.14` alpha for dim, a luminance-based fg) and made `applySettingsEffects` set `--accent-hover` / `--accent-dim` / `--accent-fg` alongside `--accent` for a custom accent — and `removeProperty` all four for the default (`""`) so the Catppuccin tokens stand. Hover / dim / selected-row / on-accent text now all track the chosen color; the derivation is unit-tested.

**Resizable sidebar (#108).**

- #108 Made the left sidebar **drag-resizable**: a thin right-edge handle (pointer-capture drag, `col-resize`, accent-dim on hover; double-click resets) sets its width, clamped to **[180, 560]** (default 260) and **persisted** across restarts — a dedicated Rust `sidebar_width` value with its own `get` / `set` commands (separate from the #100 Settings blob so the modal draft can't clobber a drag); the width restores + re-clamps on boot, with a debounced persist during the drag. Main-window only; the main content reflows via the existing flex layout.

**Clickable links in terminals (#109).**

- #109 Made `http`/`https` URLs printed in terminals **⌘-clickable** to open in the user's **default browser** — both agent `claude` PTYs **and** plain shell terminal panels (#72), since the single persistent terminal pool (`terminalPool.ts`) owns them all, so the change is one addition in `createHost()`. Loads a `WebLinksAddon` (`@xterm/addon-web-links`) whose custom `activate` handler opens **only on a ⌘-click** (`event.metaKey`) — a plain click is left to the terminal/TUI (drag-to-select, `claude`'s own mouse handling) — routing through a new **dependency-free** Rust `open_url(url)` command (registered in `lib.rs`, typed IPC `openUrl`) that **rejects any non-`http`/`https` scheme** and shells out to macOS `open <url>` **without a shell** (no injection), mirroring the `open_data_folder` precedent (no opener/shell plugin, no new capability). Only `http`/`https` is linkified (bare `host:port`, `file://`, `mailto:`, other schemes are out of scope); the scheme check (`is_http_url`) is unit-tested. Hover/⌘-click runtime behavior is best-effort (xterm rendering isn't unit-testable).

**Fix: a closed file viewer no longer resurrects on boot (#110).**

- #110 Made the #59 legacy `open_files` → `overview_panels` fold-in **one-shot and non-resurrecting**: boot no longer re-folds `open_files` (every real install migrated long ago) and instead **clears** the stale map (main-window only), so a closed/forgotten file viewer (e.g. a stuck `CLAUDE.md`) is gone on the next launch and never returns. Added the missing typed `setOpenFiles` IPC wrapper (the Rust `set_open_files` command already existed) to empty each repo's entry once. Closing a panel and Forget-folder now stick across restarts; `overview_panels` persistence is untouched.

**Compact sidebar — uniform 10px tree rows (#111).**

- #111 Dropped **every** sidebar tree-row label to a uniform **10px** via a new `--fs-meta-xs` token (`tokens.css`): the agent label `.rowPrimary` + rename editor, the repo header name `.repoName` + agent `.count`, and the file/diff/terminal/scheduled **item** row labels — so the left panel reads at one compact, consistent size. **Font-size only** (padding/heights/gaps and the busy-indicator slot #95 unchanged); non-row chrome (New/Schedule buttons, footer gear, context menus, section headers) untouched. Targeted class changes, not a blanket `--fs-meta-sm` swap. Pure CSS.

**Activity indicator — a third "finished / needs input" state (#112).**

- #112 Gave the `BusyIndicator` (#42/#55/#71/#88/#95) a **third state**: gray `--status-idle` (fresh / never-active) → blue shimmer (working) → solid **yellow** `--status-awaiting` dot with a soft glow and **no animation** ("finished — needs input") once an agent has been active and gone idle, leaving only when it goes busy again. Backed by a **persisted** `has_been_active` flag (`PersistedSession` + a persist-once `mark_session_active`, set on the first `busy==true` edge in `lib.rs`; threaded Rust → IPC → TS `hasBeenActive` and seeded into the store on load + set live in `setBusy`) so a previously-active agent shows yellow immediately on boot. Rendered in the sidebar rows + Overview cards in the same fixed 14px slot (no layout shift); reduce-motion → solid dots. Narrows the v1 "no awaiting-glow" rule the way #42 narrowed "no status system" (a third color on the dot, not an approval pill).

**Collapsible sidebar folders — a repo-color disclosure triangle (#113).**

- #113 Made sidebar **folders collapsible**, replacing the 8px repo-color circle (`.repoDot`, #35) with a **repo-colored disclosure triangle** (▶ collapsed / ▼ expanded, a `clip-path` shape so the inline `background: repoColor` still colors it, rotated via an `.expanded` modifier; sized to the `BusyIndicator` footprint #95). The header now carries **two independent controls** — its own toggle button collapses the folder (hiding **all** child rows: sessions, nested worktree agents #74, and file/diff/terminal/scheduled items, header + count kept) with `aria-expanded`, while the repo name **still filters Overview** (#34/#68, unchanged). Reverses the non-collapsible part of #34. State **persists** via a dedicated Rust `collapsed_repos` value (`get_collapsed_repos` / `set_collapsed_repos`, IPC + store `collapsedRepos` / `toggleRepoCollapsed`), separate from the Settings blob (mirroring #108). No change to Overview/Canvas or pooled terminals. **Reverted by #115** (the user did not want collapsible folders): the collapse behavior + its entire `collapsed_repos` persistence stack (TS + Rust) were removed and the disclosure triangle replaced by a **static, non-interactive repo-colored cube** (Lucide `Box`) in the same slot — folders are non-collapsible again (as in #34), all child rows always render.

**Scheduled-prompt skill autocomplete; sidebar cube revert (#114–#115).**

- #114 **Slash-command skill autocomplete** in the scheduled-session prompt field — a shared **`SkillAutocomplete`** component (used by both the `NewSessionModal` schedule step and the `ScheduledPanel`): typing `/` in command position opens a dropdown of the slash-invokable **skills** `claude` would offer, read best-effort by a new read-only Rust **`skills.rs`** (`list_skills(cwd)`) from project (`.claude/skills/*/SKILL.md` + `.claude/commands/**/*.md`) and user (`~/.claude/…`) dirs, deduped (project shadows user) and sorted; ↑/↓/Enter/Tab/click insert `/<skill-name> ` with a container-key guard so Enter/Escape drive the menu, not the surrounding modal. Plugin/marketplace skills out of scope.
- #115 **Reverted the collapsible sidebar folders (#113)** at the user's request — removed the collapse behavior and its entire `collapsed_repos` persistence stack (TS + Rust) and replaced the disclosure triangle with a **static, non-interactive repo-colored cube** (Lucide `Box`) in the same slot; folders are non-collapsible again (as in #34), all child rows always render.

**Activity-dot fix, Canvas Templates & Settings sizing (#116–#119).**

- #116 **Activity dot stays gray on a fresh session** until the agent does real work — the busy heuristic (`pty.rs`) no longer counts `claude`'s pre-input startup paint as busy, so a new interactive session stays gray (no startup blue/yellow flicker) until the first submitted prompt; a **seeded exception** keeps scheduled/prompt-seeded sessions (#93) going blue→yellow, and boot-resume is unchanged.
- #117 **Canvas Templates (part 1 of 2)** — reusable saved Canvas layouts whose leaves hold inert action **blocks** (`new-agent` w/ optional prompt, `new-terminal`, `open-file`, `open-diff`): the `CanvasTemplate` model, a **registry-driven** block set (`templateBlocks.ts`, mirroring #82), a full-screen **`TemplateEditor`** (reuses the BSP surface + a block palette), a **`TemplateManager`** (edit/rename/duplicate/delete), and a separate `canvas_templates` Rust persistence blob + store CRUD. Tab-strip ▾ **Templates** menu entry point.
- #118 **Canvas Templates (part 2 of 2)** — instantiation: **"New tab from template…"** → a **`TemplateUseModal`** picks one folder, opens a new tab, and `resolveTemplateBlock` runs each block **independently, best-effort** against that folder (agent via prompt-seeded spawn, terminal, file gated by `file_exists`, diff by `is_git_repo`). A failed panel stays pending with an **inline error + Retry** (and `open-file` a **Pick file** affordance), retaining its block so Retry re-runs it in place. No spawn-count guard.
- #119 **Settings modal — consistent larger fixed size** (720×600, height clamped to 90vh): replaced the content-driven `max-height` with a fixed `height` so every section renders at the same size; a tall section scrolls inside the content pane while the nav + action row stay put. CSS-only.

**Iteration passes 5–6 (#120–#121).**

- #120 **Iteration & self-improvement (code-quality) pass** — ran all gates on a clean tree, reviewed the #116–#125 cumulative diff in 3 independent fresh-context subagents, and applied only genuine correctness fixes (TemplateManager Escape-while-renaming discards; the #124 base-branch `<select>` added to the focus-trap; an orphaned `new-terminal` PTY is killed if its template panel closes mid-spawn); no behavior changes, no speculative perf edits; docs synced. Runs after all feature work.
- #121 **Iteration & UI/UX pass** — applied a **static-safe** a11y/consistency slice (DiffInspector toggle `aria-pressed`; Terminal status overlays `role="status"`/`role="alert"`); the screenshot-driven **visual feedback loop was deferred** (no GUI headless — flagged for interactive verification, per the #84/#105 precedent). The truly-last task in the chain.

**Custom slider, keyboard reach & branch creation (#122–#125).**

- #122 **Custom `Slider` component** — a reusable, on-token slider (a real `<input type="range">` styled via `appearance:none` + cross-browser pseudo-elements, value-driven accent fill, larger thumb, hover/active/focus states; full keyboard + ARIA parity) replacing the two native Settings range inputs (Font size, Line height). Landed before #121 so the UI pass polishes the custom slider.
- #123 **Arrow-key-reachable "Choose folder" picker** — the folder step of the New-session / Schedule-session modal now treats the picker as a virtual option after the recents: ArrowDown past the last recent highlights it (ArrowUp returns), Enter opens it, reachable even when the recents filter matches nothing. Both modes (same component).
- #124 **Create a new branch from the New-session modal** — a **"+ add branch"** option (arrow-key reachable) below the existing branches reveals a name input + base-branch dropdown (default current/HEAD); confirm `git checkout -b <name> [<base>]` + start, or **⌘⏎** `git worktree add -b` for an isolated worktree. Name validated backend-side (valid ref, must not exist). **New git write — branch creation** — expands the v1 "never creates branches" rule (CLAUDE.md updated).
- #125 **Create a new branch from the Scheduled-session modal** — the same "+ add branch" UI in schedule mode records a **new-branch intent** (name + base + create-new flag, serde-default) on the `ScheduledSession` and the poll loop **creates + checks it out at fire time** (best-effort, reusing #124's git write) before the pre-seeded launch.

**Fork & per-repo new-session shortcut (#126–#127).**

- #126 **Fork an agent's conversation into a new parallel session** — a `GitFork` button on every agent header (Overview cards + Canvas panels) branches the source via `claude --session-id <new> --resume <source> --fork-session` (CLI-verified; `AgentSpec::fork_args` / `pty.rs fork_session` / the `fork_session` command), leaving the source untouched. The fork is a normal tracked session with an app-owned UUID + serde-default `forked_from` (a "fork" badge), spawned non-seeded so it stays gray until first input (#116); on click it's selected and surfaced where the user is.
- #127 **Per-repo "New session" skips the folder step** — the sidebar right-click "New session" and the inline per-repo "+" now run `startRepoSession`: a git folder opens the modal straight at the branch step (branches preloaded, current selected, no folder flash), a non-git folder spawns immediately with **no modal**. The global "New session" / ⌘N keeps the folder step.

**Sidebar marker, Canvas-templates menu fix & row context menus (#128–#132).**

- #128 **Sidebar repo marker → folder icon** — swapped the #115 repo-colored cube (Lucide `Box`) for a closed **folder** (Lucide `Folder`), keeping the per-repo outline tint and the same static, non-interactive ~14px slot (`.repoCube` renamed `.repoFolder`); purely visual.
- #129 **Fix: the Canvas Templates ▾ dropdown couldn't open** — the tab strip's `overflow-x: auto` forces the computed `overflow-y` away from `visible`, so the menu dropping *below* the 34px strip was clipped to invisibility. The menu now renders **`position: fixed`** anchored to the button's `getBoundingClientRect()` (escaping the clip, mirroring the sidebar context menu), preserving toggle / outside-click / Escape / selection close and the strip's horizontal tab scroll.
- #130 **Repo context menu — Reveal in Finder / Copy path** — two non-destructive utilities on the repo-header menu: **Reveal in Finder** via a new Rust `reveal_path` (macOS `open <path>`, no shell — mirrors `open_data_folder` / `open_url`) + a `revealPath` IPC wrapper, and **Copy path** reusing the store's `copyToClipboard` (toasts "Copied path").
- #131 **Agent row context menu — Fork conversation / Copy session ID** — surfaced the shipped fork action (#126 `forkSession`) and a **Copy session ID** (`copyToClipboard(claudeSessionId)`) in the `SessionRow` right-click menu, so it reads **Rename · Fork conversation · Copy session ID · Remove**; no new backend.
- #132 **Non-agent row context menus** — `FileRow` / `DiffRow` / `TerminalRow` / `ScheduleRow` gained a deliberately minimal right-click menu via a shared `RowContextMenu`: a single **Remove** item (or **Cancel** for a schedule) reusing each row's existing `onClose` / `onCancel` (a terminal's Remove still kills its shell), ungated and red-danger styled. Pure frontend.

**Worktree header context menu (#133).**

- #133 Right-clicking a worktree's branch/badge header opens a two-item menu — **Reveal in Finder** / **Copy absolute path** (reusing #130's `reveal_path` + the clipboard helper); generalized the shared `RowContextMenu` (#132) from a single label to an `items[]` array.

**Fork robustness (#134, #138).** Forking a source with no conversation now fails gracefully and is shown unavailable up front.

- #134 Guard Fork against an empty / un-materialized conversation — a backend `title::has_conversation` check (reads the on-disk `~/.claude/projects/*/<uuid>.jsonl` log for ≥1 real turn, **fail-open**) returns a typed `SessionError::NothingToFork` instead of spawning a doomed code-1 panel; covers a never-prompted session and a just-created-never-used fork.
- #138 Show the Fork action as **unavailable** (dimmed + explanatory tooltip) when the source has no history — a persisted `forkable` flag emitted on the #97 title-worker busy→idle cadence (+ a boot/resume seed) gates the three Fork sites via `aria-disabled`; the #134 guard stays the safety net.

**Canvas panel move, header drag & title truncation (#135, #144, #146).**

- #135 Drag to reorder / reposition an existing Canvas panel — a pure `moveLeaf` (remove + re-split **reusing the source leaf's id + content**, so the pooled terminal reparents, computed atomically on drop) via a header grip, wired in both the main view and a detached window (#84).
- #144 The **whole Canvas panel header bar** is the drag handle (mirroring Overview #70) — the grip became a non-interactive hint; Fork / Copy-resume / Close and the `FileSwitcher` `stopPropagation` to stay clickable.
- #146 A long Canvas panel title **truncates** with an ellipsis (+ hover tooltip) so the header buttons stay visible — a `flex: 1` / `min-width: 0` fix to the #144 header (dropping the `flex-shrink: 0` that defeated the ellipsis).

**Canvas templates & tab-close behavior (#136, #137, #142).**

- #136 Optional **custom agent name** on Canvas-template `new-agent` blocks — a `content.name` (opaque-blob, no Rust change) passed to the prompt-seeded spawn; empty preserves the #97 auto-name.
- #137 Closing a Canvas tab **with contents** prompts **Kill / Keep / Cancel** (K / Enter / Esc) via a focus-trapped `CanvasCloseModal` that tears down the tab's leaves (kill agents + shell PTYs, remove file/diff/terminal/scheduled items, cancel schedules) — plus a Settings → Behavior default (`canvasCloseBehavior`: Ask / Always kill / Never kill). An empty tab still closes silently.
- #142 Opening a template into a **sole empty canvas** replaces it in place instead of leaving an empty tab behind (2+ canvases, or a canvas with panels, still append — unchanged).

**Markdown Kanban board (#141, #145, #143, #147, #149, #151).** An Obsidian-format `.md`-backed board, loaded like the file viewer and fully editable in-app.

- #141 Kanban **engine** — a pure Obsidian-format `parseBoard`/`serializeBoard` round-trip (frontmatter + `**Complete**` + `%% kanban:settings %%` preserved) plus the backend `write_text_file` (the app's **first arbitrary file write**, path-validated like reads) + its `writeTextFile` IPC.
- #145 Kanban **content type** — a `kanban` panel (reusing the `file` panel's refs + `overview_panels`), opened from the repo **Views** menu via the `.md`-scoped `FilePicker`, a draggable sidebar row, and a **read-only** `KanbanPanel` (columns/cards, markdown body via #44, horizontal scroll, hot-reload).
- #143 Kanban **editor** — full card & column editing with nested dnd-kit drag-and-drop (move a card between lanes = change status), debounced write-back (the #94 pattern), and a "New Kanban board" creation affordance (default To Do / Doing / Done).
- #147 Kanban panel **Board / Raw** toggle (mirroring the #73 FileViewer toggle) + auto-fallback to Raw for a structure-less `.md`.
- #149 **Editable**, auto-saving Kanban raw view — both views routed through #148's `useAutoSaveFile` (one buffer), the toggle round-tripping losslessly via #141's parse∘serialize.
- #151 Merged the two Kanban **Views** entries into one "Kanban board" item with an **in-picker create-or-open** flow (`FilePicker` gained `onCreate` / `createSuffix`; dropped the confusing `Plus` "New Kanban board" entry).

**Editable raw text & extended highlighting (#148, #150).**

- #148 Editable, auto-saving **raw text editor** — a shared `useAutoSaveFile(repoPath, file, active)` hook (read + hot-reload poll + debounced `writeTextFile` + dirty/focus reconcile + IME-safe + save status) backing an editable monospace `<textarea>` for markdown **Raw** + plain-text files in the FileViewer; rendered markdown, the Prism code view, and large files stay read-only.
- #150 File-viewer **syntax highlighting** — added **Java** + **INI / .env / .properties** (per-language Prism imports + `--syn-*` token rules; `.env` via a filename rule), and verified the existing languages still highlight.


> **#152–#310 condensed below.** These continue the index in the same one-line-per-task
> style; their full `### N. [x]` entries (Description / Subtasks / Acceptance / Implementation
> report) were removed to compact this file — per-task detail lives in git history and in each
> task's PR. _(Tasks #139–#140 were reserved on another branch; the Kanban content-type task was
> renumbered #142 → #145 to avoid colliding with the separately merged template task #142.)_

**Left-panel canonicity, Canvas/Kanban editing & the file-tree view (#152–#181).**

- #152 Left panel as single source of truth — template-opened non-agent items (`new-terminal`/`open-file`/`open-diff`) now register in `overviewPanels` so they show in the sidebar + Overview, and removing any left-panel item (via `removeOverviewPanel`/`dropSession`/`cancelSchedule` + new `pruneCanvasLeaves`) cascades to every Canvas tab and detached window.
- #153 Agent row "Open in canvas" context-menu item — new `openSessionInCanvas(sessionId)` reuses the agent's existing Canvas tab (or a detached window via `focusCanvasWindow`) if already open, else creates a new "Canvas N" tab, switches to Canvas view and focuses it (never duplicating the single PTY).
- #154 Kanban board block in the Canvas template editor — added an `open-kanban` block (`SquareKanban` icon, `config:"file"`, `liveKind:"kanban"`) to `templateBlocks.ts`, with `fileExists`-gated read-only resolution mirroring `open-file` and a `pickTemplateBlockFile` fix that preserves the block kind on Pick-file recovery.
- #155 Canvas panel drag: lift on drag-start, restore on cancel — a transient non-persisted `liftedLeaf` + `beginCanvasLift`/`commitCanvasLift`/`cancelCanvasLift` drive a derived `displayedLayout` so the panel is removed from view and others reflow during the drag; a `DragOverlay` ghost follows the cursor and the persisted `canvases` blob is written only on committed drop (retiring the atomic `moveCanvasLeaf`).
- #156 Kanban horizontal scroll in Overview mode — one-file CSS fix in `Overview.module.css` adding `min-width: 0` + a `.body > *` child-fill rule to the shared PanelColumn `.body` (mirroring Canvas's `.panelBody`) so the board's `overflow-x: auto` engages instead of being clipped.
- #157 "Big mode" maximize any item into a full-window modal — new transient `maximizedItem` state + `maximizeItem`/`closeMaximized`, a shared `ItemContent` renderer (single source of truth carrying the #84 ownership guard + a `MaximizedNote` placeholder), a `BigModeModal`, and a maximize icon on every Canvas/Overview header; the one-live-render-site rule keeps the pooled terminal/auto-save hook mounted in exactly one place.
- #158 FileViewer cutoff in Overview at narrow widths — CSS-only fix in `FileViewer.module.css` adding `min-width: 0` to `.viewer`, `overflow-wrap: anywhere` to `.markdown`, and a responsive toolbar (truncating `.status` + `flex-shrink: 0` on the Rendered/Raw `.segmented`) so text wraps and the toggle never clips.
- #159 Remove Kanban column move-left/right buttons — deleted the two `‹`/`›` chevron buttons and their `isFirst`/`isLast`/`onMove` props from `KanbanPanel.tsx`, steering column-to-column movement toward per-card drag (kept `moveColumn` in `kanbanOps.ts` for a future drag-reorder).
- #160 Kanban: commit card edits on confirm, not per keystroke — added local `editDraft`/`renameDraft` state in `KanbanPanel` so typing never calls `mutate`; edits write once through the #148 buffer on confirm (Done checkmark, Enter, or card blur via `relatedTarget` containment), with commit-on-switch and poll-pause guards; discrete actions (toggle/drag/add/delete) still save immediately.
- #161 Kanban board UI/UX polish pass — hover/focus-revealed card + column actions, border-state hierarchy, a `<DragOverlay>` `CardPreview` + dashed insertion placeholder for a clearer drop cue, empty-column hints, and the responsive toolbar fix deferred from #158; style-only, `.md` round-trip untouched.
- #162 Settings: auto-save vs manual save (⌘S) — new `autoSave` setting (default on); `useAutoSaveFile` gains manual mode (`dirty`/`manual`/`save`, no write on keystroke/blur but flush-on-unmount), a non-React `saverRegistry` singleton whose `saveFocused()` powers the ⌘S handler in `useKeyboardNav`, and FileViewer/Kanban toolbars swap the "Saving…" hint for a Save button — one chokepoint covers every file write.
- #163 File viewer "Browse…" — a native open-dialog (`pickFile` via `dialog:default`) opens any file on disk, represented as `{repoPath: parentDir, file: basename}` (new `splitPath` helper) so the existing `files.rs` dir-confined read/write validation passes with no backend change; wired via `setLeafFileAbsolute` (Canvas) / `moveOverviewPanelToFile` (Overview).
- #164 Clickable worktree badge → worktree-scoped Views menu — extracted a shared `ViewsMenu` component (the #82 addable-view set) reused by the repo menu and a new `WorktreeViewsBadge` popover on Canvas/Overview agent headers, with worktree-keyed panel grouping (`clusterRepoOf`/`renderPanelRows`) so opened views land under the worktree (sidebar) / parent cluster (Overview). _(The clickable badge was later replaced by #213.)_
- #165 "Open view" button on normal (non-worktree) agents — extracted a shared `ViewsPopover` (open/dismiss + drag-safety) and added an `OpenViewButton` (`PanelsTopLeft`) to normal-agent headers gated on `!worktreeParent`, opening the same `ViewsMenu` scoped to the agent's `repoPath`.
- #166 Worktree context menu: new session, open views, close worktree — expanded the `WorktreeHeader` right-click menu (threading in `parent` + `agentCount`) to New session (`spawnWorktreeSession` create-or-reuse), Views (shared `ViewsMenu`), Reveal/Copy path, and a confirm-gated Close worktree (`killAllAgents` + `closeAllItems`, ref-counted `git worktree remove`).
- #167 File tree viewer as a first-class view type — new repo-scoped `"filetree"` content kind rendered as sidebar row / Overview column / Canvas panel + an `open-filetree` template block, built client-side (folders-first) via a pure tested tree builder; folders expand/collapse, files open in the viewer, right-click offers Open/Kanban/Reveal/Copy. _(Later moved to the lazy per-level `list_dir` backend in #167's successor work; see #252/#264.)_
- #168 Collapsible left panel → icon rail — persisted `sidebar_collapsed` bool (plumbed end-to-end like #108's width, separate from the Settings blob), toggled by a footer chevron + ⌘B; the rail shows New/Schedule icons, a compact `ViewSwitch`, per-repo folder icons (left-click filters, right-click repo menu) with per-session `BusyIndicator` dots, and per-worktree branch glyphs, all context menus intact.
- #169 Refresh auto-generated session names promptly — backend-only cadence fix in `pty.rs`: each title-worker poke now schedules a bounded burst of re-reads (`TITLE_REREAD_OFFSETS_MS`, ~30s window) plus a spawn-time poke, so `claude`'s asynchronously-written `ai-title` surfaces within seconds without a click; `title_worker` rewritten to a `recv_timeout` schedule-aware loop.
- #170 Stop macOS auto-capitalizing/auto-correcting text inputs — new `src/inputProps.ts` exporting `noAutoCapitalize = {autoCapitalize:"none", autoCorrect:"off"}` spread into all text `<input>`/`<textarea>` fields across the app (spell-check left untouched) so identifiers/paths/`/`-prompts keep what was typed.
- #171 Copy path / Reveal in Finder on sidebar file & Kanban rows — enriched the `RowContextMenu` on file-viewer and Kanban rows with Reveal in Finder / Copy absolute path / Copy relative path (shared `filePathMenuItems` helper); added a separate `reveal_file_in_finder` backend command running `open -R` (select, not launch) distinct from folder-only `reveal_path`.
- #172 Empty-area (background) context menu for the sidebar — right-clicking empty sidebar space (or the rail) opens a non-repo menu: New folder… (native picker → new `add_recent` command / `addFolder` action, adds an existing folder to `recents` without spawning an agent), New session, Schedule session, Collapse/Expand, and Clear Overview filter.
- #173 Clickable task-list checkboxes in rendered markdown — for FileViewer rendered markdown + Kanban card bodies: a shared `markdownCheckboxes.tsx` with a `rehypeTaskListPositions` plugin (stamps each checkbox's nearest `li` source offsets), `toggleTaskMarker` (pure `- [ ]`⇄`- [x]` flip), and `makeCheckboxComponents`, persisting through each site's `useAutoSaveFile` buffer; added the `unist-util-visit-parents` dep.
- #174 Shift+arrow Overview navigation selects every panel kind — extracted the wall's grouping/ordering into pure shared `overviewClusters`/`overviewClusterKeys` (+ generic `adjacentId`) consumed by both `Overview.tsx` and `useKeyboardNav`, so Shift+←/→ reaches files/diffs/terminals/kanban/filetree/scheduled cards (not just agents), respecting the repo filter and wrapping; Shift+↑/↓ still passes to terminal scrollback.
- #175 File-tree click: jump to already-open file, open in current view — new `openFileFromTree(repoPath, file, kind)` makes clicks view-aware: Overview adds-or-selects the existing column; Canvas focuses an existing leaf across tabs (or raises a detached window) else appends to the active tab; always registers in `overviewPanels`. `addOverviewPanel` now returns the panel id so callers can select/focus.
- #176 Configurable Overview panel minimum width — new `overviewPanelMinWidth` setting (default 400px) driven through the Settings draft→Save→`applySettingsEffects` pipeline, which sets a `--overview-card-min` CSS var read by `.card { flex: 1 0 var(--overview-card-min, 400px) }`; a Slider (320–600/step 20) added to Settings → Appearance.
- #177 "Open view in this folder" on every panel + instant "New session" — put `OpenViewButton` on non-agent Overview/Canvas headers (using each panel's `repoPath`), and added a "New session here" item to the shared `ViewsMenu` that instantly `spawnSession(repoPath)` on the current branch with no modal (distinct from #127's modal-based flow).
- #178 Terminal panel vertical margin so the bottom row isn't cut off — one-line CSS bumping `.terminal` vertical padding 6px→12px; because it's the single pooled xterm node, this fixes Overview, Canvas, and shell terminals at once (FitAddon sees the smaller content box and claims one fewer row when the last would clip).
- #179 Show hidden dot-prefixed folders in the file tree and pickers — removed the blanket `name.starts_with('.')` directory skip in `files.rs`, keeping only the `SKIP_DIRS` heavy/vendored filter, so `.claude`/`.github` are listed across all surfaces. _(Later narrowed by the `.git`-into-`SKIP_DIRS` change so `.git` internals don't flood listings.)_
- #180 Show remote branches in the new-agent branch picker (auto-fetch + pull-on-select) — `list_branches` now also reads `refs/remotes` (excluding `*/HEAD`, deduped vs local into a new `remote` field) and a best-effort `fetch_remotes` (`git fetch --prune`, `GIT_TERMINAL_PROMPT=0` — the app's first git network read) runs on modal open; selecting a remote row reuses the #124 create-branch write (`git checkout -b <short> <remote-ref>` / worktree on ⌘⏎). New-session mode only.
- #181 "Pull" action in the repo + worktree context menus (ff-only) — new `pull_ff(cwd)` running `git -C <cwd> pull --ff-only` with `GIT_TERMINAL_PROMPT=0`, exposed via the `pull_branch` command + `ipc.pull` + a `pullFolder` action that toasts the result; a "Pull" item added to both the repo and worktree menus, gated on a known current branch, no confirm (ff-only can't lose work).

**Diff untracked/links, updater + patch-notes skeleton, worktree scheduling & Canvas tab reorg (#182–#205).**

- #182 Markdown links open in external browser — a `markdownLinkComponents` map (pure `isExternalHref`) makes every rendered-markdown `<a>` `preventDefault()` and route http(s) links to the Rust `open_url` (#109) — neutralizing non-web links so the webview can never be navigated away; covers FileViewer, Kanban card bodies, and `CardPreview`.
- #183 Diff view shows untracked files — backend-only `git.rs`: `working_diff` gains an untracked pass (`git ls-files --others --exclude-standard -z` + per-file `git diff --no-index` via a new `run_git_raw_allow_diff` accepting exit 0/1), appending synthesized `A` entries, `.gitignore`-respecting and bounded by `MAX_UNTRACKED_FILES` (2000).
- #184 File-tree menu: copy absolute + relative path — `FileTree.tsx` relabels "Copy path" to "Copy absolute path" and adds "Copy relative path", mirroring the #171 sidebar file-row convention; context-menu bottom clamp raised for the taller menu.
- #185 Activity dot yellow-blink fix — backend-only `pty.rs`: a pure `is_noninput_report` helper detects automatic terminal CSI reports (focus in/out 1004, X10/SGR mouse), so `write_stdin` no longer stamps `last_input` for them — stopping focus/click reports from tripping the #55 keystroke-echo guard and mis-flashing the busy dot to the #112 yellow state.
- #186 Distribute Canvas panels evenly — pure ops in `canvasTree.ts` (`leafCount`/`equalize`/`equalizeSplit`/`collectSplits`) rebalance a BSP layout to equal-area via leaf-count weighting; exposed as a `CanvasTabs` "Distribute evenly" button (whole canvas) + a border double-click (that subtree), applied remount-free via a `groupHandles` registry so pooled terminals keep scrollback.
- #187 Save current canvas as template — a pure inverse mapper `canvasToTemplate.ts` (registry reverse-lookup `blockForLiveKind`) turns a live canvas into template action-blocks (file/kanban carry the relative path, agent carries its custom name, repoPath dropped, scheduled/pending leaves collapsed); a new ▾ Templates menu item + `openTemplateEditorFromCanvas` seeds the `TemplateEditor` pre-populated.
- #188 Double-click header to rename agent — `CanvasSurface` (`LeafPanel`) and `Overview` (`SessionCard`) agent titles get an `onDoubleClick` inline-rename reusing the sidebar rename state machine + `renameSession` (#57); the 4px PointerSensor distance lets a stationary double-click coexist with the header drag handle; agents-only via a `canRename` gate.
- #189 Keyboard panel-creation modal (⌘K) — a two-step `CreatePanelModal` (type → target folder) opened by ⌘K, plus in-modal digits 1–6 and global ⌘⌥1–6 (matched on `e.code` to survive Option glyphs), driven by a shared unit-tested `panelTypes.ts` registry; all six creation paths reuse existing actions so panels land in sidebar/Overview.
- #190 Auto-update skeleton (keys deferred) — full-stack foundation reviving the #62-removed updater: gated `release.yml` (version-bump + signing-secret guards), tauri-plugin-updater/process wired, `src/updater.ts`, a store `update` slice, a sidebar-footer `UpdateIndicator` → `UpdateModal` → full-window freeze/progress overlay → relaunch, and a `last_version` Rust scalar driving a boot "Updated to v…" toast; `createUpdaterArtifacts` initially off. _(Activated once a real minisign keypair + GitHub secrets were provided.)_
- #191 Settings → Updates section — a new `"updates"` Settings pane: Check-for-updates button, current-vs-available version, a labelled "What's new" slot (`data-update-version` for #192), and Update-now-&-restart reusing #190's install flow; the sidebar indicator deep-links here via `setSettingsOpen(open, section?)` + a new `settingsSection` field.
- #192 Patch notes — per-version `src/patchnotes/<version>.json` loaded by pure `patchnotes.ts` (`import.meta.glob`, `patchnotesToMarkdown`) and rendered by `components/PatchNotes`; a not-yet-installed update's notes ride in the release (`latest.json` notes → `check()` `update.body` → store `update.notes` → the #191 slot); `release.yml` gains a notes-up-to-date guard + a body-generation script.
- #193 Dev-only mock update — a dev-gated mock engine in `updater.ts` (`setMockUpdate`/`isMockUpdate`) makes `checkForUpdate` return fake data and the install run a timer without relaunching; store `mockUpdate`/`clearUpdate` + a `window.__recue` global (`src/devMock.ts`, behind `import.meta.env.DEV`) and a DEV-only "Simulate update" button drive the whole UI; tree-shaken out of prod.
- #194 Kanban optional card checkbox — `kanban.ts` gains tri-state `Card.checked: boolean | null` and a `PLAIN_CARD_RE` so a plain `- bullet` (no `[ ]`) renders as a card and round-trips byte-stably as `- title` instead of being silently dropped; render omits the `<Checkbox>` when null and `toggleCard` guards null.
- #195 Clean up Kanban card UI — layout/CSS-only redesign moving `.cardActions` out of `.cardTop` to an absolutely-positioned top-right cluster revealed on `:hover`/`:focus-within` (with a card-colored gradient fade), freeing the title to span full width; all handlers and the #194 null-checkbox path intact.
- #196 Worktree header: icon-only marker + inline new-session — `WorktreeHeader` drops the literal "worktree" text badge (keeping the `GitBranch` icon as an accessible marker) and adds an inline `+` button → `spawnWorktreeSession(parent, branch)` (#166), mirroring the repo header's inline new-session `+`.
- #197 Click a worktree to filter Overview — broadens the Overview filter predicate (new `sessionInFilter` in `paths.ts`: `effectiveRepo === filter || repoPath === filter`) and restructures `overviewClusters` around a uniform `folderInFilter`, so a worktree folder (whose `effectiveRepo` is its parent, #96) can be a filter target; the `WorktreeHeader` name becomes a filter button.
- #198 Schedule a session into a worktree — full-stack: a serde-default `worktree: bool` on `ScheduledSession` threaded through `create_schedule`/IPC/store; `fire_due_schedules` gains `prepare_worktree_for_schedule` (creates the app-managed worktree at fire time and spawns the seeded agent there with `worktree_parent`); cancel cleanup reuses #199's guard. _(The modal's worktree checkbox was later replaced by #204's ⌘⏎ button.)_
- #199 Worktree auto-delete guard counts all item types — rewrites `cleanupWorktreeIfEmpty` around a pure unit-tested `worktreeHasItems(state, dest)` (agents + `overviewPanels` viewers + schedules, not just agents), runs it on `removeSession`/`removeOverviewPanel`/`cancelSchedule`, and adds an in-memory `worktreeParents` map so the parent needed by `git worktree remove` survives after the last agent is closed.
- #200 Worktree removal off the main thread — makes `remove_worktree` the codebase's first `async` Tauri command, running `git::worktree_remove` via `tauri::async_runtime::spawn_blocking` so a large-worktree FS delete no longer freezes the webview; the two bulk close paths in `store.ts` switch from `await` to fire-and-forget `void`.
- #201 Collapse duplicate "New session" menu items — `ViewsMenu` gains an `includeNewSession?` prop (default true); the repo context menu and worktree header menu (which already carry a top-level "New session") pass `false` to drop the redundant "New session here", while the standalone `ViewsPopover`/`OpenViewButton` keep it.
- #202 File-tree search (filename + content) — new Rust `search_file_contents(repo, query, limit)` in `files.rs` (deterministic sorted walk, 2 MB/file + 3-matches/file caps, `truncated` flag, char-safe `make_snippet`) plus an in-panel `FileTree` search UI running filename + content searches in parallel, `<mark>`-highlighted `path:line` snippets, and per-result **Reveal in tree** (lazy-expands ancestors) / **Open**.
- #203 Restyle sidebar-footer update indicator — pure CSS/markup restyle of the #190 `UpdateIndicator`: inset margins, hairline border + transparent fill (accent reserved to a 13px icon), single-line label with title truncation, de-emphasized `--bg-hover`, and a matching slim error variant; behavior unchanged.
- #204 Schedule modal ⌘⏎ worktree button — frontend refactor replacing #198's schedule-step worktree checkbox with the same "Worktree ⌘⏎" button + ⌘/Ctrl+Enter keybind the new-session branch step uses; `submitSchedule(asWorktree)` computes `useWorktree = asWorktree && folderIsGit`, feeding the unchanged backend path.
- #205 Canvas tab bar reorg — factors the Templates-menu mechanics into a reusable `useDropdownMenu()` hook, turns `+` into a "New tab" dropdown (New tab / New tab from template…), trims the ▾ Templates menu to template management, and moves the #186 distribute button to the far right. _(The `+` dropdown was reverted to a plain new-tab button by #222.)_

**Canvas tab UX, sidebar feedback/reorder, Windows parity & viewer highlighting (#206–#229).**

- #206 ⌘T new Canvas tab — bound ⌘T/Ctrl+T in `useKeyboardNav.ts` to switch to Canvas and `addCanvas()`, and surfaced the `⌘T` hint on the "New tab" affordance and trigger tooltip.
- #207 Sidebar click jumps to Overview — in `store.ts` `selectItem`, the "item not in active canvas tab" branch now switches to Overview and selects the item instead of a toast + deselect, generalized to all item kinds; reverses #79's no-auto-switch rule for the not-present case only.
- #208 Rewrite v0.0.1 patch notes — replaced `src/patchnotes/0.0.1.json`'s changelog entries with "welcome" + "highlights" intro categories framing ReCue as a first release (product pitch, not a task-by-task log); content-only.
- #209 Fix Settings → Updates spacing — added `gap: var(--space-8)` to `.fieldLabel` in `Settings.module.css` so "Current version 0.0.1" (and "Update available") no longer render label+value stuck together; CSS-only root-cause fix.
- #210 Sidebar feedback button — added a Lucide `Bug` footer button (between Settings gear and collapse chevron) opening a Google Form via `openUrl`→the http/https-only Rust `open_url` (#109); no new backend command.
- #211 Drag-reorder sidebar folders — the whole repo header is a dnd-kit `useSortable` grip (`repohead:` id) inside the app-level `DndContext`; order persists via a dedicated Rust `repo_order` value (`get/set_repo_order`, like `sidebar_width`), displayed as `mergeRepoOrder(folderOrder, repoOrder(...))`, with `App.tsx` `onDragEnd` calling `reorderRepos(arrayMove(...))`.
- #212 Sync worktree/branch label after in-terminal checkout — `store.ts` schedules a debounced (~600ms) `refreshBranches()` on each session's busy→idle edge (mirroring the #97 title-worker cadence), covering worktree labels and repo headers; frontend-only, no `git.rs` change.
- #213 Worktree agent header unify — worktree agents on Overview cards / Canvas panels now use the normal `OpenViewButton` and a static non-clickable "worktree" badge (styled like the "fork" badge); deleted the clickable `WorktreeViewsBadge` (#164).
- #214 Narrower collapsed rail — reduced `SIDEBAR_RAIL_WIDTH` from 56 to 44 (plus a `ViewSwitch.module.css` centering tweak) so the icon rail is only slightly wider than its ~36px buttons.
- #215 Update indicator margin + hover — in `Update.module.css` tightened `.indicator` margin (`--space-8`→`--space-4`) and added an accent-tinted hover light-up; introduced a new `--status-error-dim` token for the error-variant hover.
- #216 One-time update-indicator attention animation — a `@keyframes update-announce` (3× box-shadow/border pulse, no reflow) applied via a transient `.indicatorAnnounce` class, guarded by a module-level flag set on `animationend` so it plays once per session; disabled under reduced-motion. _(Superseded by the continuous glow in #287.)_
- #217 Cross-platform `open_url` (Windows feedback button) — rewrote `open_url` in `commands.rs` with a dependency-free platform-`cfg` `Command` (`open` on macOS, `cmd /C start "" <url>` on Windows, else `xdg-open`), keeping the http/https-only guard; fixes the #210 button + #109 ⌘-click opening a folder on Windows.
- #218 Nest scheduled worktree sessions — persisted a `worktree_path` on `ScheduledSession` (computed at create time, preferred at fire time) so pending worktree schedules nest under a `WorktreeHeader` sub-group (pure `scheduleNestsUnderWorktree`/`worktreeGroupPaths` helpers in `paths.ts`) and show the "worktree" badge on their Overview card.
- #219 Move collapse button to footer far-right — added `.footerCollapseToggle { margin-left: auto }` (neutralized in the collapsed rail), pushing the collapse toggle right of the flush-left Settings + Feedback buttons; CSS-layout only.
- #220 Ctrl+V paste on Windows — added the Tauri clipboard-manager plugin + a bounded `save_clipboard_image` (temp PNG) command; a Windows-gated `attachCustomKeyEventHandler` intercepts Ctrl+V/Ctrl+Shift+V, reads the clipboard (text, else image path), pastes via `term.paste()`, and suppresses the stray `^V`; macOS native ⌘V and Ctrl+C/SIGINT unchanged.
- #221 Fix "jiggly" Windows terminal font — in `terminalPool.ts` `createHost` explicitly `document.fonts.load()`s JetBrains Mono weights 400/500/700, then rebuilds the WebGL glyph atlas (`clearTextureAtlas()`, re-measure via transient `fontFamily` swap, `refresh` + `safeFit`); OS-neutral (WebGL retained on Windows), with a documented DOM-renderer fallback.
- #222 Revert Canvas "+" to plain new-tab — partial revert of #205: the "+" is again a plain one-click `addCanvas()` button and "New tab from template…" moved back into the "Templates ▾" menu; #206's ⌘T hint/keybind preserved.
- #223 Distribute-evenly button in Template Editor — added a `Grid2x2` toolbar button (disabled when `leafCount < 2`) reusing #186's pure `equalize` op; its handler bumps an `equalizeNonce` that keys/remounts the BSP surface so react-resizable-panels re-reads the equalized layout.
- #224 Template file block: full/absolute paths — added `filePathMode?: "relative"|"absolute"` to the open-file block and a pure `fileBlockTarget(block, cwd)` helper mapping relative→`{repoPath:cwd,file}` and absolute→`splitPath` parent-dir-as-root (#163), with a relative⇄absolute toggle + Browse in the Template Editor; no backend change.
- #225 Sidebar folder branch badge — added a subtle muted `.repoBranch` badge (from the existing `branches` map) next to each repo header, kept in sync via the #212 busy→idle edge plus new `focus`/`visibilitychange` listeners and a visible-only ~15s `BRANCH_POLL_MS` interval (paused when hidden). _(Moved to its own line under the header by #236.)_
- #226 Agent-header folder·branch indicator — replaced the standalone "worktree" badge (#213) on Overview `SessionCard` and Canvas `LeafPanel` with a `folder · branch` meta line for every agent (folder = `effectiveRepo`/`repoName`, branch = `branches[repoPath]`); fork badge kept.
- #227 More FileViewer languages — added Prism component imports (in dependency order, incl. `markup-templating` before `php`) and `LANG_BY_EXT` entries for C#, Go, Lua, SQL, Ruby, PHP, Gradle/Groovy, and Kotlin in `prism.ts`/`fileType.ts`; static (not lazy) imports for a no-async-flash UX.
- #228 Clickable collapsed-rail agents — extracted a shared `AgentContextMenu` used by both the expanded `SessionRow` and the rail; rail dots became `<button>`s with left-click select/jump (+ selected state) and right-click menu, plus a transient `pendingRenameSessionId` flag so Rename-from-rail expands the sidebar and auto-begins the inline rename.
- #229 Syntax-highlight the diff viewer — `DiffInspector.tsx` detects language once per file via `prismLang(file.path)` and renders lines through a shared `CodeContent` using `highlightToHtml` (reusing #227's set) in both unified and split rows, with matching `--syn-*` token CSS; per-line tokenization bounded by `MAX_DIFF_ROWS`.

**Diff viewer redesign, Kanban UI overhaul, file-tree git status/OS-drop, Mermaid & release v1.0.1 (#230–#256).**

- #230 Add a "Commits" source to the diff viewer — a third diff source (alongside Working/Compare #81) with read-only `list_commits(cwd, limit)` (bounded 100) and `commit_diff(cwd, sha)` (via `git show`, reusing `parse_unified_diff`); DiffInspector gains a Commits toggle + commit picker, and `commit_sha`/`diff_source:"commits"` persist per panel.
- #231 Redesign the diff viewer UI with selectable display modes — frontend-only redesign into two modes (default **Focused** single-file with a ‹prev/picker-pill/next› strip, and **Accordion** single-open cards), driven by a `diffDisplayMode` setting (Settings → Behavior) + an in-panel toggle; preserves Working/Compare/Commits sources, Unified/Split, and #229 highlighting.
- #232 Scheduled task time: show only time when date is today — `formatFireTime(fireAt, now)` in `src/time.ts` shows time-only when the fire time is the same local day, else month/day + time; injectable `now` param for testability. Applied in the shared helper so sidebar and Overview both benefit.
- #233 Redesign the in-app Kanban board UI — UI/CSS-only KanbanPanel overhaul (format unchanged): checkbox pinned top-left with full-width title, dimmed monospace detail/meta lines, an inline multi-line add-card composer (Enter submits, Shift+Enter adds detail lines), and redesigned per-column headers with a deterministic per-column accent from `REPO_PALETTE`.
- #234 Kanban card hover-lift animation — CSS-only `.card` hover lift (`translateY(-2px)` + soft shadow + `cursor: grab`) as a drag affordance, scoped `:not(.cardPlaceholder):not(.cardOverlay)` so it never fights dnd-kit's transform, with a reduced-motion override.
- #235 SkillAutocomplete: open dropdown above the textarea — pure-CSS anchor flip of the `.menu` rule from the textarea's bottom edge to its top edge (`bottom: calc(100% + …)`) so the `/`-command dropdown (#114) grows upward into empty space, fixing overlap in both the schedule step and ScheduledPanel.
- #236 Show the current branch on its own line under each sidebar folder header — moved #225's inline repo branch badge to a dedicated `.repoBranchLine` below the folder header (GitBranch icon + muted branch text), reusing the #225 branch data/sync unchanged; the line click still filters Overview.
- #237 Persist the diff viewer's display modes — added a `diffLineMode` setting beside `diffDisplayMode`; DiffInspector seeds both from settings and its in-panel focus/accordion + unified/split toggles now persist via `saveSettings`, so the last choice becomes the default for new viewers (open panels keep their mode). Source toggle deliberately not persisted.
- #238 Overhaul Kanban card interaction + unify create/edit into a single-field composer — made the whole card surface drag-only (title no longer click-to-edit; edit/delete via view-mode pencil/trash), replaced the edit title-input+body-textarea+overlay with one composer-style textarea + flow action row, and extracted a shared `splitCardText` so create/edit parsing can't diverge.
- #239 Settings section to configure Kanban column colors by name — new `kanbanColumnColors: {name,color}[]` setting (seeded with To Do/Doing/Done) + exported pure `kanbanColumnColor(name, configured)` (case-insensitive match, else hashed-name `REPO_PALETTE` fallback); a new "Kanban" Settings section edits rows with Catppuccin swatches + a free `<input type="color">`.
- #240 Make the Kanban "Add card"/"Cancel" buttons roomier — CSS fix for a real bug: `padding` used the undefined `--space-10` token (collapsing the shorthand to 0); replaced with `var(--space-6) var(--space-12)` (inherited by #238's edit Save/Cancel).
- #241 Attention-grabbing glowing tooltip beside the sidebar feedback button — a fixed-positioned (via `getBoundingClientRect`) glowing pill "Report bugs and request features" shown on launch for 10s beside the #210 Bug button, dismissed on hover/focus; reuses the #216 `update-announce` pulse with a reduced-motion static-glow fallback.
- #242 Fix the undefined `--space-10` token app-wide — swept every remaining `var(--space-10)` → `var(--space-12)` (Canvas, DiffInspector, FileViewer, KanbanPanel, TemplateEditor) to restore lost padding (same root cause as #240); the curated scale (which omits 10) left unchanged.
- #243 Give the repo's own branch line its own right-click context menu — extracted `RepoBranchLine` with an `onContextMenu` menu (New session, Views, Reveal, Copy path, **Copy branch name**, Pull, **Fetch**, Change color, Kill all agents/Close all items — no Forget/remove), plus a new `fetchFolder` action reusing the `fetch_remotes` command; left-click still filters Overview.
- #244 Remove the Delete button from Kanban card edit mode — dropped the edit-mode `cardEditDelete` (Trash2) button, leaving Save + Cancel only; deletion stays on the view-mode hover trash icon (same `onDelete`).
- #245 Kanban add/save buttons: Enter indicator + thinner vertical padding — added a `.btnKbd` `<kbd>⏎</kbd>` chip beside the two submit buttons (composer "Add card" + editor "Save"), gave them inline-flex layout, and thinned vertical padding `--space-6`→`--space-4` (horizontal unchanged so Cancel stays height-matched).
- #246 Make a Kanban card's description body part of the drag surface — removed the body wrapper's `noDrag` so a press-drag on the description moves the card, and added `user-select:none` to `.cardBody`+`.cardTitle` to stop native text selection; body links/checkboxes still clickable via the 4px PointerSensor activation distance.
- #247 Overview filter: clicking the repo's own branch line shows only that branch — replaced the bare `overviewRepoFilter: string` with `OverviewFilter = {path, mode:"all"|"own"}`; "own" (branch-line click) shows only the repo's non-worktree agents/panels/schedules (worktrees hidden) while "all" (folder click) keeps them; threaded through `paths.ts`, store clusters, Sidebar highlights, Overview label, and `useKeyboardNav`.
- #248 Don't strike through a completed Kanban card's text — one-line CSS removal of `text-decoration: line-through` from `.cardDone .cardTitle`, keeping the muted-gray dim so a checked card stays gently de-emphasized with just the checkmark.
- #249 Canvas tab-strip icon buttons: shrink the new-tab/Templates/Distribute cluster to match × — shrank `.tabAdd` from 24×24 to 20×20 (matching `.tabClose`) and added a `.tabMenuTrigger` modifier keeping 20px height but `width:auto` for the Templates ▾ button's two icons; purely visual.
- #250 Hide a repo folder's branch line when the folder has no own items — gated `RepoBranchLine` on a new reactive `hasOwnItems` flag (own sessions OR overviewPanels OR own-folder schedules; worktree sub-groups deliberately don't count), so a recent/empty git folder no longer shows a stray branch line while its header still renders.
- #251 Repo branch line: show active-filter selection like a worktree branch does — CSS-only: added `border-radius: --radius-chip` to `.repoBranchLine` and `background: --accent-dim` to `.repoBranchActive` (mirroring `.worktreeActive`), so the "own"-mode active branch line gets the same accent-dim selection box + accent text as a worktree branch.
- #252 Color file-tree rows by git status — new lightweight backend `file_statuses(repo)` (`git status --porcelain=v1 -z`, mapping `??`→A / D→D / else M, renames → del(old)+add(new)) feeding a store `fileStatuses` map refreshed on the #212 busy→idle edge; FileTree tints new=green/edited=yellow (name+icon), folders roll up highest-severity (red>yellow>green), deletions show red struck-through ghost rows. Pure helpers in `FileTree/fileStatus.ts`.
- #253 Drag OS files into the file tree to move them into the repo — second deliberate `files.rs` write `move_into_repo(repo, dest_subdir, source)` (destination-confined, refuses collisions, data-safe same-volume rename else cross-volume copy-then-remove); `src/osFileDrop.ts` subscribes each webview's window-global `onDragDropEvent`, converts physical→CSS px via `devicePixelRatio`, hit-tests `data-filetree-droptarget`, highlights the target, and `moveFilesIntoRepo` moves + bumps a per-repo `fileTreeRefresh`.
- #254 Render Mermaid diagrams in rendered markdown (file viewer) — added lazy-loaded, bundled/offline `mermaid` (own chunk) with pure helpers in `FileViewer/mermaid.ts` (`loadMermaid` one-time init: dark theme, `securityLevel:"strict"`, system font) and a `MermaidBlock`; wired via an **opt-in** `code` override (`MermaidCode`) only at the FileViewer call site so Kanban/PatchNotes/Settings are unaffected; invalid diagrams fall back to the raw block + a muted note.
- #255 Keyboard navigation between files in the diff viewer — made the DiffInspector panel focusable (`tabIndex={0}` + `:focus-visible`) with a panel-scoped `onKeyDown`: ←/→ step files in Focused mode, ↑/↓ step the open card in Accordion mode (scrolled into view), reusing the wrapping `stepFile`; a pure `diffNavDelta` decides the delta, ignored on <2 files, modifiers, or when an input/picker has focus.
- #256 Release v1.0.1 — version bump 1.0.0→1.0.1 in `tauri.conf.json`/`package.json`/`package-lock.json`, plus the first real in-app changelog `src/patchnotes/1.0.1.json` (features #252–#254, improvement #255) derived from `git log v1.0.0..HEAD`; pushed to `main` to trigger the release pipeline (produces a draft a maintainer must publish).

**Kanban/diff refinements, terminal performance, NL scheduling, file-tree ops & release v1.0.2 (#257–#282).**

- #257 Larger, vertically resizable Kanban card input fields — bumped both `KanbanPanel.tsx` textareas (add-card composer + inline editor) from `rows={3}` to `rows={5}` and added `min-height: 88px` / `max-height: 320px` over the existing `resize: vertical`.
- #258 Diff viewer sort by occurrence (default) or alphabetical, persisted — added `Settings.diffSortOrder` and a pure `DiffInspector/diffSort.ts` (`reconcileOccurrence`/`sortFiles`) + a segmented Recent/A–Z header toggle; occurrence order is a per-panel `path→seq` map (only the mode preference persists).
- #259 Eager worktree+branch creation when scheduling into a worktree — `create_schedule` now `git worktree_add[_new_branch]` up front (guarded by `!dest.is_dir()`), made `prepare_worktree_for_schedule` idempotent, and added ref-counted cleanup on cancel via `cleanupWorktreeIfEmpty` + the `worktreeUsesPath` guard; unblocks #279/#280.
- #260 Fix terminal input lag — don't hold the global session lock across blocking PTY writes — `Session.writer`/`master` became `Arc<Mutex<…>>` so `write_stdin`/`resize_pty`/`scrollback` clone the per-session Arc and drop the global map guard before the blocking `write_all`+`flush`/`resize`/`snapshot`, so one flooded terminal no longer stalls others.
- #261 Fix global UI lag — shrink output IPC payload and throttle terminal writes — changed `OutputPayload` from `Vec<u8>` to base64 `b64: String` (new `decodeOutput.ts`) and coalesced terminal writes to one `term.write` per `requestAnimationFrame` in `terminalPool.ts`, plus dropped a per-chunk linear scan in `store.ts onOutput`.
- #262 Terminal last line falls below visible area — guarantee bottom clearance — bumped `.terminal` bottom padding (~20px) and added a conservative row-fit guard in `terminalPool.ts` comparing `rows × actualCellHeight` to the content box, doing `term.resize(cols, rows-1)` before `resizePty` when the last row would overflow (sub-row FitAddon rounding fix).
- #263 Make New/Schedule Session modal open instantly (load branches async) — made `startRepoSession` synchronous (opens with `newSessionInitialBranches: null`, no pre-open `await ipc.listBranches`) so the modal renders immediately and the existing detection effect fills the list, with a `branchesLoading` cue gating branch-step actions.
- #264 File tree refreshes when files change on disk — added `bumpFileTreeRefresh(repo?)` driving the in-place, expansion-preserving re-list; triggered on the busy→idle edge, a 5s visibility-gated poll (debounced), and window-focus (polling chosen over an fs-watcher, no new native dep).
- #265 Fix scheduled-worktree card header (three lines / full-width badge) — wrapped `ScheduleCard`'s `.name` + conditional `.worktreeBadge` together in the existing `styles.agentTitle` row (mirroring `SessionCard`) so the header is two clean lines instead of three; no CSS change.
- #266 "Checkout branch…" in the repo context menu — added a `"checkout"` `menuMode` picker sub-panel (local/remote branches + create-new inline) plus store `checkoutFolderBranch`/`createFolderBranch` (checkout without spawning an agent, then refresh branches/file-statuses), reusing existing `checkout_branch`/`create_branch` commands (no backend change).
- #267 Context menu on file-tree folders & files (new folder, delete) — added path-validated `create_dir`/`delete_path` backend commands (files.rs, the 3rd/4th deliberate writes; refuse repo root/symlinks/`..`/collisions, `windows_safe_seg` guard) wired through `ipc.ts`/`store.ts` (`createFolder`/`deleteTreePath`) and the FileTree inline menu with confirm-gated deletes.
- #268 Natural-language launch-time input for scheduled sessions — replaced both `datetime-local` widgets with a free-text field parsed by a custom `parseWhen(input, now)` in `src/time.ts` (durations `1h`/`90 min`, clock `6pm`/`9:30am` rolled to tomorrow if past, `today`/`tomorrow`, explicit dates — no new date lib) with a live "Starts …" preview; empty/unparseable disables submit.
- #269 "Start now" button on scheduled sessions — extracted `fire_one_schedule(...)` from the poll loop and added a `fire_schedule_now(id)` command + `startScheduleNow` action reusing the `schedule://fired` → `onFired` path, with a Play button in the ScheduledPanel, Overview ScheduleCard, and sidebar row (fires a worktree schedule into its eager #259 worktree).
- #270 Gray out gitignored files/folders in the file tree — added `--ignored=matching` to the single `git status` read and a `FileStatus::Ignored` (`"I"`) variant (`parse_porcelain_z`); FileTree dims ignored rows with `--text-muted`, kept out of the folder severity roll-up (a folder grays only when its own path is ignored) and below tracked A/M/D tints.
- #271 Copy button on rendered markdown code blocks (FileViewer) — added a `pre` override (`CodeBlockWithCopy`) to FileViewer's `markdownComponents` rendering a hover-revealed Copy button that copies the block's raw text via `copyToClipboard`; FileViewer-scoped only (inline code and mermaid excluded).
- #272 Usage meter turns red at 90% (not 95%) — one-line threshold change `const critical = pct >= 90` in `UsageBar.tsx` (plus matching doc comments).
- #273 Make Canvas-tabs "+" icon same visual size as neighbors — bumped the Lucide `Plus` from `size={14} strokeWidth={1.5}` to `size={16} strokeWidth={2}` so its visual weight matches `LayoutTemplate`/`Grid2x2` (box stays 20px).
- #274 Fix Template Editor block-config layout — CSS fix in `TemplateEditor.module.css`: `.pathModeBtn` dropped `flex: 1` for `flex: 0 0 auto` + `min-width: 72px` (compact Relative/Absolute pair), and the `new-agent` prompt textarea flexes to fill height (`min-height: 140px`, `flex: 1` with `min-height: 0` on wrappers).
- #275 Export / import Canvas templates (JSON) — added store `exportTemplate` (native save dialog → pretty JSON via `write_text_file` reusing the #163 parent-dir-as-root consent trick) and `importTemplate` (`pickFile` → validated `parseTemplateJson` in new `templateIo.ts` → `saveTemplate` with a fresh id), with per-row Export / footer Import buttons in the Template Manager; no new backend command or capability.
- #276 Kanban — Enter creates a card and reopens a fresh composer — `BoardColumn` `submitComposer` success path now clears text + keeps the composer open + re-focuses via `composerRef` instead of `cancelComposer()`; an empty Enter or Escape still closes.
- #277 Kanban — transient "undo" button after deleting a card — capture `lastDeleted = {col,idx,card}` (panel-local) before delete and render an inline `UndoRow` at that index that restores via a new pure `insertCardAt(board,col,idx,card)` op (kanbanOps.ts); single-level, transient (cleared on file switch, never persisted).
- #278 Diff viewer — per-file "seen" marker (Seen / Not-seen / Changed-since-seen) — added client-side `diffSeen.ts` (`fileDigest`/`seenState` over the full parsed hunks) persisted in a dedicated Rust `diff_seen` scalar (out of the settings blob), with an icons-only toggle button + `s`/`S` keybind in both Focused and Accordion modes (a changed file flips its marker).
- #279 Scheduled worktree should not appear as a duplicate top-level folder when it starts — `store.ts onFired` now prepends `session.worktree_parent ?? session.repo_path` to recents (parent repo for a worktree), matching the backend's `sched.cwd` recent so no phantom empty top-level `RepoGroup` renders.
- #280 Fix Canvas "no longer pending" for scheduled agents (on fire + detached windows) — added pure `canvasSchedule.ts` `rewriteScheduledLeaves` so `onFired` swaps a `{kind:"scheduled"}` leaf to the live agent content (preserving leaf id for pool reparent + broadcasting `canvas://changed`), and made schedules window-global via a new Rust `broadcast_schedules` → `schedule://changed`/`schedule://fired` that detached windows subscribe to.
- #281 Release v1.0.2 — bumped version to `1.0.2` in `tauri.conf.json` + `package.json` and authored `src/patchnotes/1.0.2.json` (regenerated from `git log v1.0.1..HEAD`, grouped feature/improvement/fix); push to `main` triggers the draft-release pipeline.
- #282 Windows parity audit + remediation (pre-v1.0.2 release gate) — fix-mode sweep of all 13 landmine categories; fixed one confirmed defect — `store.ts copyToClipboard` now routes the write through `ipc.clipboardWriteText` (tauri-plugin-clipboard-manager) on Windows (WebView2 rejects `navigator.clipboard.writeText` from a context menu), keeping the macOS Web-API path byte-for-byte; the other 12 categories confirmed already-seamed, logged in `TRAJECTORY_TO_WINDOWS.md`.

**Kanban/big-mode chords, recurring sessions, Clone Repo & auto-continue-after-limit (#283–#310).**

- #283 Kanban "move all cards right" button — a per-column header button (Lucide `ChevronRight`, glyph set in #288) that moves every card into the adjacent right column in one click, via new pure op `moveAllCardsRight(board, fromCol)` (rightmost/empty columns show no button; cards keep `checked` state).
- #284 ⌘E / Ctrl+E toggle big mode — a global chord toggles the #157 `BigModeModal` for the selected item, via store `toggleMaximizeSelected()` + pure `contentForSelected(state)` and a capture-phase handler in `useKeyboardNav.ts` (works in both views/windows, safe inside a PTY; discoverability via `kbdHint` tooltips).
- #285 Place new panel next to its worktree/branch agent — a newly created non-agent panel lands immediately to the right of an agent running in its exact folder, via pure `placeAfterAnchor`/`anchorAgentForPanel`/`repositionPanelAfterAgent` in `store.ts` (persists through the existing `reorderOverview`→`set_overview_order` path; no-op when no agent shares the folder).
- #286 "Update now" above patch notes — pure JSX reorder in `Settings.tsx`'s Updates pane so the install button/progress bar renders directly under the version label and above the (arbitrarily tall) "What's new" notes, keeping the install action reachable.
- #287 Continuous glowing update indicator — replaced the #216 one-shot 3× blink on the sidebar `UpdateIndicator` with a continuous breathing accent glow (new `@keyframes update-glow` + `.indicatorGlow`; reduced-motion degrades to static), removing the `updateAnnounced` one-shot guard.
- #288 ">" chevron for Kanban move-all button — pure icon swap from `ArrowRightToLine` (→|) to Lucide `ChevronRight` (>), same size/handler/visibility.
- #289 Empty schedule prompt field — removed the misleading `placeholder="Initial prompt for claude…"` from the schedule-step `SkillAutocomplete` (value was already always empty; `ariaLabel` kept for accessibility).
- #290 esbuild dev-server advisory fix — bumped vite `^7.0.4`→`^7.3.6` and esbuild to 0.28.1 (regenerated lockfile) to clear GHSA-g7r4-m6w7-qqqr, bringing `npm audit` to 0 vulnerabilities; Rust `cargo audit` already clean.
- #291 FileTree folder context menu additions — folder rows gained Rename… (inline, new `"rename"` `MenuMode`), Reveal in Finder/Explorer, Copy absolute path, Copy relative path, backed by a new generic Rust `rename_path(repo,from,to)` command (path-validated via `validate_new_segment`/`windows_safe_seg`) + `renamePath` IPC + `renameTreePath` action.
- #292 macOS permissions fix (mic/voice + protected folders) — added `src-tauri/Entitlements.plist` (audio-input + `cs.disable-library-validation`, no App Sandbox) wired via `bundle.macOS.entitlements` under Hardened Runtime, four `NS*FolderUsageDescription` strings in `Info.plist`, a `scripts/sign-macos-local.sh` ad-hoc re-sign helper, a guarded Developer-ID sign+notarize in `release.yml` (dormant until `APPLE_*` secrets), and `docs/macos-permissions.md`; deliberately reverses the "no code signing" scope rule (fixes the TCC re-prompt-then-fail root cause).
- #293 Global Kill all agents / Close all items — app-wide teardown on the sidebar empty-area (#172) background menu via store `killAllAgentsGlobal`/`closeAllItemsGlobal` (iterate the parent-folder set through `killAgentsInRepo`/`closeRepoItems`, one summary toast), plus a backward-compatible inline `confirmLabel` two-step confirm on `RowContextMenu` honoring `confirmDestructive`.
- #294 Three-dots session-options menu + Recurring sessions — added a ⋯ overflow menu next to "Schedule session" and shipped a full **recurring session** subsystem: a persisted `RecurringSession` record (backend `create/list/cancel/update/fire_due/fire_one_recurring`, sharing the 5s poll tick) that owns a rotating child agent (each fire kills the old child + spawns a fresh seeded uuid in the same panel via content `kind:"recurring"`), with `RecurringPanel`/`RecurringCard`/`RecurringRow` surfaces, a NewSessionModal recurring mode, worktree support, and pure `intervalToSeconds`/`formatNextRun` helpers.
- #295 Clone Repo — added "Clone Repo…" (URL + parent-dir picker) backed by Rust `git.rs` `clone_repo`/`ensure_main` + pure `repo_dir_name(url)` (network guards `GIT_TERMINAL_PROMPT=0`/`GIT_SSH_COMMAND=ssh -oBatchMode=yes`, refuse non-empty dest), registers the folder and auto-starts a `claude` session; a new deliberate git write.
- #296 Auto-continue after limit reset — opt-in Claude-only behavior (setting `autoContinueAfterLimit`, default off) that arms when usage `usedPercent >= ~100`, waits for reset confirmed by BOTH time AND percent<90, then nudges each running Claude agent with Enter→`continue`→Enter; frontend/store-only via pure reducer `evaluateAutoContinue` in new `autoContinue.ts` (surfaced in the ⋯ menu + Settings → Sessions; armed poll cadence 45s).
- #297 Per-agent auto-continue opt-out — a persisted `auto_continue_disabled` bool on `PersistedSession` + `set_session_auto_continue` command, surfaced as a compact `AutoContinueToggle` on each Claude agent's Overview card / Canvas panel (shown only when the global setting is on); the #296 fire step filters disabled sessions out of `liveClaudeIds`.
- #298 Clone lands on real default branch — renamed `git.rs` `ensure_main`→`ensure_checked_out_branch` to leave git's cloned default branch (main/master/…) as-is and only fabricate `main` for a truly empty/unborn clone, and reworded the misleading `CloneRepoModal` "starts on main" copy.
- #299 Non-blocking background clone with phantom folder — made `clone_repo` an `async` command running the git shell-out in `spawn_blocking`; the modal closes immediately and a transient non-draggable `PhantomRepo` (dimmed "Cloning…" + indeterminate progress bar, rendered outside the dnd-kit `SortableContext`) appears via a store `cloningRepos` slice, resolving per-keyed-id to add recents/spawn/toast on success or error-toast on failure.
- #300 Recurring-session bug fixes — fixed "now" not firing immediately (backend `create_recurring` now fires the first child at create time when `first_fire_at <= now` by reusing `fire_one_recurring`) and the duplicate/ghost panels (idempotent optimistic adds deduping by id in `createRecurring`/`createSchedule`, plus a hardened `onFired` that stashes-and-adopts a child whose record hasn't landed).
- #301 Schedule-session button layout — CSS/JSX polish so the "Schedule session" label ellipsizes on one line (`.scheduleLabel` `flex:1;min-width:0`), the clock icon/hint never distort (`flex-shrink:0`), and the "…" button narrows (`width 30px→24px`) at any sidebar width.
- #302 Move auto-continue checkmark after label — in the shared `RowContextMenu` renderer, emit the label before the `.menuCheck` slot and swap its `margin-right`→`margin-left`, so the checkable "Auto continue after limit reset" row shows its checkmark trailing with no leading gap.
- #303 Trim sidebar background menu — removed New session, Recurring session…, and Auto continue from the empty-background `bgMenuItems` and moved Clone Repo… directly under New folder… (part one of the two-card reorg).
- #304 Remove Clone Repo from ⋯ menu — dropped the Clone Repo… entry from `dotsMenuItems` so Clone Repo has exactly one home (the background menu, per #303), leaving the ⋯ menu with Recurring session… + Auto continue.
- #305 Show per-agent auto-continue checkbox only at limit — gated the #297 `AutoContinueToggle` behind a new shared pure helper `isLimitReached(usage)` in `autoContinue.ts` (mirrors the reducer's arming predicate via `ARM_THRESHOLD_PCT` 99.5, fail-safe hide when usage unavailable) so the checkbox appears only once the 5-hour limit is reached.
- #306 Remove redundant in-panel Cancel — deleted the duplicate "Cancel schedule"/"Cancel" button (and dead `.cancel` CSS) from `ScheduledPanel` and `RecurringPanel`, since every pending record is still cancellable from its sidebar row and Overview card (Start now / Edit / fields retained).
- #307 Glowing indeterminate clone progress bar — CSS-only polish making the #299 phantom bar visibly alive: a bright accent comet-glint `.phantomBar` gradient sweeping across a breathing `@keyframes clone-glow` box-shadow on `.phantomTrack` plus a rail-icon drop-shadow glow (bar stays indeterminate; reduced-motion freezes to static, `color-mix` fallbacks throughout).
- #308 Blobless partial clone — added `--filter=blob:none` to the `git.rs` `clone_repo` shell-out for dramatically faster large-repo clones (full history + all refs, lazy blob fetch), deliberately not `--depth`/`--single-branch`; new test `clone_preserves_full_history_not_shallow` guards against a shallow regression.
- #309 "Enable auto restart on limit reset" prompt button — a new `AutoContinuePrompt` in the sidebar footer above the usage bar (shown only when the Claude limit is reached via shared `isLimitReached`, the setting is off, and a new suppression toggle `promptEnableAutoContinueAtLimit` default true) whose click flips on `autoContinueAfterLimit` (store `enableAutoContinueAfterLimit`) and self-hides.
- #310 Empty schedule "Launch time" field — changed the `NewSessionModal` on-open reset seed from `DEFAULT_WHEN = "in 5 min"` to `""` for the schedule step (recurring "First run" still seeds `"now"`), revealing the existing placeholder/hint; existing gating already handles the empty field.
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

Open work no longer lives in this file — it flows through the `kanban-dev-pima` board
(`KANBAN.md`: `PLAN → IMPLEMENT → MERGE → ARCHIVE`) and per-task `PLAN-<N>.md` files. This
file is the **completed-task archive only**: the condensed **Implemented (completed tasks)**
index above covers **#1–#310** (one line per task; full per-task detail — Description, Subtasks,
Acceptance criteria, Implementation report — lives in git history and each task's PR). New
archived tasks are appended below.

> **Never skip a card.** The pipeline implements **every** unblocked card — one whose
> `deps:` are all in `## ARCHIVE` or already archived here — lowest task number first, and never
> skips one for being big, risky, or hard to verify. A card too large for one pass is
> **split into smaller dependent cards** (as #93 → #93 + #94), not deferred.

---

### 311. [x] Custom tab name in the "New tab from template" modal

**Status:** Done
**Depends on:** none

**Description**

The **"New tab from template…"** flow (#118) now lets the user optionally type a **custom name
for the new Canvas tab** on the modal's folder step. The freshly instantiated tab takes that
name; leaving the field blank (or whitespace-only) keeps today's behavior byte-for-byte — the
tab is named after the template. The name applies to the **Canvas tab** itself, not to any
agent/panel inside it (the #136 per-block `new-agent` name is untouched).

**What shipped** (commit [`d316f3e`](https://github.com/ErikdeJager/ReCue/commit/d316f3e), PR
[#63](https://github.com/ErikdeJager/ReCue/pull/63), merged `3788fd8`, 2026-07-02):

- **`src/components/Canvas/templateInstantiate.ts`:** `instantiateTemplate(template, cwd, genId,
  tabName?)` gained an optional trailing `tabName`; the returned `CanvasTab.name` is
  `tabName?.trim() || template.name`, so an omitted/blank/whitespace value preserves the
  template-name fallback exactly.
- **`src/store.ts`:** the `useTemplate` action + its `AppState` interface widened to
  `useTemplate(templateId, cwd, tabName?)`, threading `tabName` into `instantiateTemplate`; the
  sole-empty-vs-append logic (#142), active-tab set, `ipc.setCanvases` persist, toast, and async
  block resolution are unchanged (the toast still references `template.name`).
- **`src/components/TemplateUseModal/TemplateUseModal.tsx`:** a local `tabName` state + an optional
  "Tab name" `<input>` on the folder step (after the folder picker, before the actions row),
  labeled `Tab name (optional)`, placeholder = the chosen template's name (`chosen?.name`, fallback
  `"Custom name…"`), `aria-label="Tab name"`, spreading `noAutoCapitalize`; `open()` now calls
  `runTemplate(templateId, cwd, tabName)`. No explicit reset — the modal unmounts on close.
- **`src/components/TemplateUseModal/TemplateUseModal.module.css`:** a `.nameInput` class styled
  like NewSessionModal's `.search` (full-width, token padding/border/radius, `--bg-base` fill,
  `--text-primary` text, muted placeholder, `--accent` focus border) — design tokens only.
- **Tests:** `templateInstantiate.test.ts` covers trimmed-name-wins and blank/omitted → template
  name; `store.test.ts` covers `useTemplate` naming the tab from a provided name and falling back
  when blank.

**Key files/areas touched:** `src/components/Canvas/templateInstantiate.ts` (+ `.test.ts`),
`src/store.ts` (+ `store.test.ts`), `src/components/TemplateUseModal/TemplateUseModal.tsx` +
`.module.css` (6 files, +95/−7).

**Dependencies:** none.

**Notes**

- **Decisions** (per `ASSUMPTIONS.md` §Task 311): the field lives on **step 2 (folder step)**, not
  the template-list step; **label** `Tab name (optional)` (worded "Tab" to make clear it names the
  Canvas tab, not an agent); **placeholder = the chosen template's name** so the user sees the
  default the tab will take; **blank ⇒ template name** (`tabName.trim() || template.name`, entered
  value trimmed); the name is threaded as an **additive optional trailing parameter**
  (`useTemplate` → `instantiateTemplate`), so every existing call site and test stays green; the
  **toast copy is unchanged** (references the template, not the new tab name); no explicit state
  reset (the modal is conditionally mounted, so `tabName` resets on each open).
- **Cross-platform:** pure frontend — a React state string + one optional pure-function parameter —
  with no OS-specific primitives, IPC, or persistence-shape change, so it renders and behaves
  identically on macOS and Windows. Checks green: `npm run build` / `lint` / `test`.

---

### 313. [x] Revert the glowing clone progress bar to a plain indeterminate loading bar

**Status:** Done
**Depends on:** none

**Description**

The transient "Cloning…" loading bar in the sidebar (shown while a repo clones, #295/#299) had
picked up a glow/shimmer treatment in #307 — a breathing accent halo, a comet-gradient stripe,
and a drop-shadow-lit collapsed-rail icon — which looked bad. This is a faithful **CSS-only
revert of #307** (commit `eaa7575`), restoring the pre-#307 (#299) **plain** indeterminate bar:
a solid accent stripe sliding across a flat token track, no glow. The bar stays indeterminate (a
`git clone` gives no reliable percent) — `role="progressbar"` with no `aria-valuenow`, the
`clone-progress` sweep, and the resolve-to-real-repo behavior are all unchanged.

**What shipped** (commit [`bf5de45`](https://github.com/ErikdeJager/ReCue/commit/bf5de45), PR
[#64](https://github.com/ErikdeJager/ReCue/pull/64), merged `7518840`, 2026-07-02):

- **`src/components/Sidebar/Sidebar.module.css`:**
  - `.phantomTrack` — removed the two `box-shadow` lines (`--accent-dim` fallback + the
    `color-mix(--accent 35%)` breathing glow) and the `animation: clone-glow 1.9s …`, and restored
    `height: 4px` → `3px`, leaving a plain `--bg-hover` track.
  - `.phantomBar` — replaced the comet `linear-gradient` (dim → `--accent-hover` → dim) with a
    single solid `background: var(--accent)`, restored `width: 45%` → `40%`, and re-timed
    `clone-progress 1.15s ease-in-out` → `1.2s var(--ease-out)`.
  - `.railPhantom` (collapsed rail) — removed the two `filter: drop-shadow(...)` glow lines,
    keeping its `clone-pulse` opacity breathe + `opacity: 0.75`.
  - The three affected doc comments were rewritten to drop all glow/comet/`color-mix` language.
- **`src/styles/global.css`:** deleted the entire `@keyframes clone-glow` block (now unreferenced —
  it was used only by `.phantomTrack`) and reverted the `@keyframes clone-progress` doc comment to
  the plain #299 wording; the `clone-progress` and `clone-pulse` keyframe bodies (both predate #307)
  are untouched.

**Key files/areas touched:** `src/components/Sidebar/Sidebar.module.css`, `src/styles/global.css`
(2 files, +22/−69). No TS/Rust/markup change.

**Dependencies:** none.

**Notes**

- **Decisions** (per `ASSUMPTIONS.md` §Task 313): the card's "revert task that made this glow" maps
  **unambiguously to #307**, so this is a straight CSS-only revert of `eaa7575` (not a remodel after
  another bar). The bar **stays indeterminate** (no percent). The revert is **faithful and complete**
  — it includes the collapsed-rail `.railPhantom` drop-shadow (the only "beyond the literal bar" item,
  deliberately included since #307 glowed both surfaces) and restores all bundled #307 tweaks (track
  `4px→3px`, bar `45%→40%`, timing `1.15s ease-in-out → 1.2s var(--ease-out)`). The "Cloning…" row
  layout, dim, label, folder marker, and resolve-to-real-repo/session-start behavior are all preserved
  (no `Sidebar.tsx` markup change, no `store.ts` change).
- **Cross-platform:** removing `box-shadow`/`color-mix`/`drop-shadow` only *reduces* WKWebView↔WebView2
  divergence risk — the plain token-background + transform-only bar renders identically on macOS and
  Windows, and the global `body.reduce-motion` killswitch still freezes it to a static solid stripe.
  Checks green: `npm run build` / `lint` / `format:check` / `test`; `grep -rn "clone-glow" src` returns
  nothing.
