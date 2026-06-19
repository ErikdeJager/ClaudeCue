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
wall" of real terminals, a **Focus** view for one session with a **git-diff
inspector**, and a repo-grouped **sidebar**. Each session is a **real PTY running
`claude`** — ClaudeCue provides the window chrome, navigation, persistence and
git-reading; the terminals come from the Claude Code CLI itself.

**Stack:** Tauri 2 · React + TypeScript + Vite · **Zustand** · plain CSS with
CSS-variable design tokens (CSS Modules) · **xterm.js** terminals · **`portable-pty`**
(Rust) · JSON persistence in the app-data dir · **Lucide** icons · **JetBrains Mono**
(bundled, offline).

**v1 decisions / out of scope:** no status system (no pills/dots/awaiting-glow/
floating) · no app-rendered approval UI (users answer in the terminal) · no Archive
(single **Remove = kill + forget**) · no Skills manager · no Fork · no settings
screen · no light mode · no multi-window · no auth · no code signing/notarization ·
**git is read-only with one exception** — ClaudeCue reads git (current branch +
working-tree diff vs `HEAD`) and never commits or creates branches; the lone write is
`git checkout <existing branch>` from the new-session flow (#27). `claude` is assumed
on `PATH` (clear in-app error if missing).

> The original design spec and interactive prototype (`HANDOFF.md`,
> `Conductor.dc.html`) are preserved in git history (commit `b02efd8`
> "System referances") if exact prototype details are ever needed.

---

## Implemented (completed tasks)

> The full backlog has shipped. Completed tasks are condensed here — number, title, and
> one line on what each delivered — and their full entries removed from the list below;
> per-task detail (subtasks, notes, acceptance, implementation reports) lives in git
> history. This is the running record of what ClaudeCue has shipped.

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
terminal 12.5px/1.5 · diff 12px/1.45.
**Spacing** 4px base (4·6·8·12·16·20·24·32). **Radii** window/panels 10px,
buttons/inputs 7px, chips 5px, dots 999px. **Depth** hairline borders + bg layering;
one soft shadow for popovers/modals only (`0 8px 28px rgba(0,0,0,.45)`). **Motion**
120–180ms ease-out; respect `prefers-reduced-motion`. **Icons** Lucide line, 16px,
1.5 stroke.

---

## Tasks

Tasks #1–#62 are complete — see **Implemented (completed tasks)** above for the index,
and git history for full per-task detail. New work goes here as a fresh `### N.` entry
in [TASKS-TEMPLATE.md](TASKS-TEMPLATE.md) format (next number: **#64**), with its
`Depends on:` prerequisites.

---

### 63. [ ] Clean agent exit (code 0) disappears; fix Restart for crashes & boot

**Status:** Not started · _(Not started | In progress | Blocked | Done)_
**Depends on:** none
**Created:** 2026-06-19

**Description**

Today a `claude` session that exits is never removed: the `Terminal` overlay
(`Terminal.tsx`) shows "Process exited (code N)" + **Restart** for *any* exit code, the
session stays in the store, and its pooled xterm is kept (`terminalPool.ts`
`reconcileTerminals`). So a **clean, intentional exit** (the user ends the agent —
`claude` exits **code 0**) leaves a dead "Process exited (code 0)" card sitting in
Focus, the Overview wall, and the sidebar tree — with a Restart button that doesn't even
work.

Desired behavior:

- **Clean exit (code 0) while the app is running → the agent just disappears.** Treat
  code-0 as intentional: remove the session everywhere (Focus, Overview, sidebar) **and
  forget its persisted record** (kill + forget, like *Remove*) so it never returns on
  next boot. Show a single brief toast ("Agent exited"); no overlay, no Restart.
- **Non-zero / crash exit while running → keep the overlay + Restart.** An unexpected
  death (crash, or a failed `claude --resume` of a stale id → exit 1) still shows the
  "Process exited (code N)" overlay with a Restart button — and that **button must
  actually work**.
- **App shutdown (app quit/killed, agent did not naturally exit) → unchanged (#30).**
  Those records are *not* removed (shutdown kills children via `kill_all` but keeps the
  store records), so on next boot they restore live and **auto-resume** via
  `claude --resume` ("Reconnecting…"); the Restart offer appears only if that resume
  fails. This is the only path that "offers to restart," exactly as intended.
- **Fix the broken Restart button.** Wherever the overlay legitimately appears (crash
  exit, or a failed boot resume), Restart must relaunch the agent and the terminal must
  come back cleanly. Likely cause: `restartSession` → `resume_session` spawns a new PTY
  under the same id, but the terminal pool **reuses the old exited xterm host** —
  scrollback was already replayed once, so the new PTY's output just appends onto the
  dead terminal. Restart should reset/recreate the pooled terminal for that id so
  `claude`'s TUI repaints from a clean state.

The discriminator is **exit code 0 = clean/intentional → disappears; anything else →
recoverable overlay** (so a crash also offers Restart, the desired recovery affordance,
even though it isn't an app shutdown).

Out of scope: changing the boot/resume mechanism (#30 stays auto-resume), any new status
UI, and changing `Remove`.

**Subtasks**

1. [ ] In the `onExited` handler (`store.ts`), special-case **code 0 while not
   `booting`**: forget the session (drop the persisted record via the backend, like
   `removeSession`/`kill_session`) and remove it from the store so it vanishes from
   Focus/Overview/sidebar; its pooled xterm is then disposed via the existing
   `reconcileTerminals` path (`App.tsx:60`).
2. [ ] Replace the generic "Session exited (code 0)" toast with a single brief "Agent
   exited" toast for the clean-exit case; keep the existing exit toast for non-zero
   exits.
3. [ ] Leave non-zero exits showing the overlay (`Terminal.tsx` already keys on
   `exitedCode !== undefined`; only code 0 now removes the session before the overlay
   can show).
4. [ ] Fix **Restart**: make `restartSession` reset/recreate the pooled terminal host
   for the id (so the new `claude --resume` PTY renders into a clean xterm), then verify
   the relaunched agent is live and interactive. Confirm the actual root cause and fix
   it.
5. [ ] Verify app shutdown → next-boot auto-resume (#30) is unaffected and remains the
   only path that surfaces a Restart offer (when resume fails).

**Acceptance criteria**

- [ ] Ending an agent so `claude` exits code 0 removes it from Focus, Overview, and the
  sidebar with no "Process exited" overlay; a brief "Agent exited" toast shows once.
- [ ] A code-0-exited agent does **not** reappear after restarting the app (its record
  is forgotten).
- [ ] A non-zero / crash exit still shows the "Process exited (code N)" overlay with a
  Restart button.
- [ ] Clicking **Restart** on a crashed agent (or a failed boot resume) relaunches it
  and the terminal comes back live and interactive (no dead/garbled scrollback).
- [ ] After an app shutdown with a still-running agent, the agent restores on next boot
  and auto-resumes (#30); the Restart offer appears only if the resume fails.

**Notes**

- Decisions (from the requester): crash/non-zero exits keep the overlay + Restart; boot
  restore stays auto-resume (#30); clean exit fully forgets the record; show a brief
  toast (not silent) when a clean-exited agent vanishes.
- Key code: `src/components/Terminal/Terminal.tsx` (overlay + Restart), `src/store.ts`
  (`onExited`, `markExited`, `restartSession`, `removeSession`, `booting` /
  `intentionalKills`), `src/components/Terminal/terminalPool.ts` (`reconcileTerminals`
  keeps exited hosts; restart likely needs to dispose/recreate the host),
  `src-tauri/src/pty.rs` (`resume_session`, `kill_all`), `src-tauri/src/commands.rs`
  (`resume_session`, `kill_session`).
- App-shutdown vs clean-exit discriminator at the store level: `kill_all` (shutdown)
  keeps persisted records → boot restores them; the new code-0 path removes the record →
  no restore. Reuse the existing `booting` guard so a code-0 during the boot resume
  window doesn't wrongly auto-remove.
