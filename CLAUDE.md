# CLAUDE.md

Guidance for working in this repository. ClaudeCue is a **macOS** desktop app for
running and managing many live `claude` CLI sessions at once.

## What this app is

An **Overview** "agent wall" of real terminals, a **Focus** view for one session
with a **git-diff inspector**, and a repo-grouped **sidebar**. Each session is a
**real PTY running `claude`** — ClaudeCue provides the window chrome, navigation,
persistence, and git-reading; the terminals come from the Claude Code CLI itself.

`claude` is assumed to be installed and authenticated on `PATH` (the app surfaces a
clear error if it is missing).

## Stack

- **Tauri 2** desktop shell (macOS only)
- **Frontend:** React + TypeScript + Vite, **Zustand** for state, plain CSS with
  CSS-variable design tokens (CSS Modules), **xterm.js** terminals, **Lucide**
  icons, **JetBrains Mono** (bundled, offline)
- **Backend (Rust, `src-tauri/`):** **`portable-pty`** for terminals, JSON
  persistence in the app-data dir, read-only git
- Dark theme only

## Layout

```
.
├── index.html              # Vite entry
├── src/                    # Frontend (React + TS)
│   ├── main.tsx            # React bootstrap (loads fonts + tokens + global CSS)
│   ├── App.tsx             # Root component
│   ├── components/         # React components (CSS Module alongside each)
│   ├── styles/             # tokens.css (design tokens) + global.css (reset/base)
│   └── types/              # Shared TS types (backend-mirrored models)
├── src-tauri/              # Rust backend (Tauri)
│   ├── src/lib.rs          # App builder, state wiring, event forwarding
│   ├── src/main.rs         # Binary entry point
│   ├── src/pty.rs          # Session/PTY core (SessionManager, portable-pty)
│   ├── src/commands.rs     # Tauri command surface + event payloads
│   ├── src/store.rs        # JSON persistence (sessions + recents)
│   ├── src/git.rs          # Read-only git: branch + working-tree diff parse
│   ├── tauri.conf.json     # Window, bundle, build config
│   ├── capabilities/       # Tauri permission capabilities
│   └── Cargo.toml          # Crate `claudecue` / lib `claudecue_lib`
├── eslint.config.js        # ESLint flat config (TS + React)
└── .prettierrc.json        # Prettier config
```

## Commands

```bash
npm install            # install frontend deps (also resolves the Rust crate on first build)
npm run tauri dev      # run the desktop app (Vite + Rust) with hot reload
npm run tauri build    # build an (unsigned) macOS .app / .dmg

npm run build          # type-check + build the frontend only
npm run lint           # ESLint (frontend)
npm run format         # Prettier write (frontend)
npm run format:check   # Prettier check (frontend)
npm run lint:rust      # cargo clippy (backend)
npm run format:rust    # cargo fmt (backend)
```

## v1 scope decisions / out of scope

- **No git writes** — ClaudeCue only *reads* git (current branch + working-tree
  diff vs `HEAD`); it never creates branches or commits.
- No status system (no pills/dots/awaiting-glow/floating) and no app-rendered
  approval UI — users answer prompts directly in the terminal.
- No Archive (single **Remove = kill + forget**), no Skills manager, no Fork, no
  settings screen, no light mode, no multi-window, no auth.
- No code signing / notarization (expect a Gatekeeper warning on first open).

> Status colors exist as *reserved* design tokens but are intentionally unused in
> v1. The original design spec and prototype are preserved in git history
> (commit `b02efd8`).

## Conventions

- Keep the frontend/backend boundary clean: the backend exposes typed Tauri
  commands/events; the frontend wraps them in a typed IPC layer.
- Keep terminal byte streams out of React state — xterm.js consumes them directly
  to avoid re-render storms.
- **Sessions & resume:** each session is a `claude` PTY. New sessions are spawned
  as `claude --session-id <uuid>` (we own the id); on boot they resume via
  `claude --resume <uuid>`. Session metadata + recent dirs persist to
  `sessions.json` in the app-data dir (`store.rs`). `Remove` = kill + delete the
  record. If a future `claude` version changes these flags, update `pty.rs`
  (`spawn_session` / `resume_session`) and note it here.
- **Window chrome:** the native macOS title bar is hidden via
  `titleBarStyle: "Overlay"` with the traffic lights repositioned
  (`trafficLightPosition`) to sit inside the custom 38px `Titlebar` component.
  The bar is a `data-tauri-drag-region`; interactive controls placed in it must
  opt out so they remain clickable rather than dragging the window.
- **Styling:** CSS Modules (`*.module.css` next to each component) that consume
  the design tokens in `src/styles/tokens.css`. The reset, base styles,
  scrollbars, keyframes, and the `prefers-reduced-motion` killswitch live in
  `src/styles/global.css`. Tokens, global CSS, and the bundled **JetBrains Mono**
  font (`@fontsource`, offline — never a CDN) are imported once in
  `src/main.tsx`. Stay on-system: use tokens, never off-system colors. See the
  **Design reference** in `TASKS.md`.

## Tasks

Work is tracked in `TASKS.md` (numbered, dependency-ordered). Each task lists its
`Depends on:` prerequisites; tasks whose dependencies are all complete can proceed.
