# Conductor — UI Handoff

A macOS desktop app for running and managing many **Claude Code** CLI sessions at
once: see them all on one wall, focus one when you need to, and keep only the
sessions you're actively working on.

The prototype lives in `Conductor.dc.html` and is dark-mode only.

---

## ⚠️ Read this first — the terminals are real Claude Code CLI

The screenshots below render each agent as a styled block of text (a prompt line,
a "thinking" line, a tool call, a result, an approval prompt). **That is mock
content for the prototype only.**

In the real app, **every one of those panels is a live terminal running the
`claude` CLI** — the same process you'd run in your own shell. Conductor does not
reimplement Claude Code's output; it embeds a real terminal (PTY) per session and
streams the CLI's stdout/stdin through it. Specifically:

- The "terminal body" in each Overview column and in Focus = an actual terminal
  emulator attached to a `claude` process for that session's working directory.
- The blinking caret and the `Send a message…` input = stdin to that process.
- The amber **awaiting-input** approval block (`Yes / Yes, and don't ask again /
  No`) = Claude Code's own approval prompt, rendered by the CLI, captured so the
  app can also surface its *status* (see status language below). Selecting an
  option writes the choice back to the CLI's stdin.
- "Open in Zed" launches the external editor on the session's working directory.

So treat the text styling in these mocks as **placeholder**. The build target is:
window chrome + sidebar + status logic implemented by us, **terminals provided by
the Claude Code CLI itself.**

---

## What it should look like

### Overview — the Agent Wall

![Overview / Agent Wall](screenshots/01-conductor.png)

- All active sessions are shown as **terminal columns side by side**, equal width,
  filling the area; the area scrolls horizontally when there are more than fit.
- Each column is a card on `--bg-panel` with a sticky header: a **status pill**
  (dot + word), the session name, `repo · branch` meta, and right-aligned actions
  — **Expand** (→ Focus), **Open in Zed**, **Archive**.
- The **awaiting-input** session pops: a 2px amber top edge + a faint amber glow,
  and it floats to the left of the wall so the eye lands on it first. *Which
  session is waiting on me?* is the one question the wall answers instantly.
- Empty state (no active sessions): a centered, quiet prompt with a **New session**
  button.

### Focus — one session + Git Diff inspector

![Focus view with Git Diff inspector](screenshots/02-conductor.png)

- One large terminal fills the main area.
- The toolbar carries the `Overview / Focus` segmented control and, for the
  focused session, a **click-to-copy chip** showing `repo · branch · sessionID`
  (the `cc_…` Claude Code session code — clicking copies it), plus **Open in Zed**
  and an **inspector toggle**.
- The right **inspector** (~360px, collapsible, 200ms slide) holds a **`Diff`** tab.
  Lay it out so more tabs can be added later — don't hard-bind to one tab.
  - Top summary: branch + `N files changed, +A −D`.
  - Changed-files list with `M / A / D` glyphs and `+N −M` counts; selecting a file
    shows its hunks.
  - Diff body: line numbers in `--diff-gutter`, added/removed lines tinted with the
    diff colors, in the mono font. A `Unified | Split` toggle.

### Sidebar — repositories

- Top: workspace identity and the only filled button, **+ New session**
  (`--accent`).
- Below: the session list, **grouped by repository**. Each repo is a persistent
  row with a collapse chevron, the repo path (mono), a **+** (start a new session
  in that repo instantly) and an **archive** button (archive that repo's sessions).
- A repo with **no active agents stays listed but greyed out**, with its **+**
  highlighted in coral for quick activation.
- `archived` is a low-emphasis group, collapsed at the bottom.
- Each session row: status dot + name, a second line with the branch, and on hover
  two ghost actions (Archive, Remove). The selected row gets `--accent-dim`
  background + a 2px coral bar on the left edge.

---

## Status language (the functional core)

One status, shown the same way everywhere (sidebar dot, wall pill, focus chip).
Color encodes meaning, never decoration. Conductor derives these by watching each
CLI process — they are **not** styling choices:

| Status | Color | Meaning |
|---|---|---|
| running | `#5B8DEF` (blue) | agent actively working — dot gets a 1.6s pulse |
| **awaiting** | `#E0A33E` (amber) | **waiting for your input/approval — the loudest state** |
| done | `#4BB58A` (green) | task completed |
| error | `#E5534B` (red) | stopped / failed |
| idle | `#6B6B73` (grey) | open, nothing happening |

The brand coral `--accent` (`#D97757`) is reserved for brand, the primary **New
session** button, and the selected row — it is deliberately **not** a status color,
so the amber "awaiting" state never competes with it.

---

## Design tokens

Dark only. Define as CSS variables; do not introduce off-system colors.

**Surfaces:** `--bg-base #0B0B0C` · `--bg-sidebar #111113` · `--bg-panel #141416` ·
`--bg-elevated #1A1A1D` · `--bg-hover #1E1E22` · `--terminal-bg #0E0E10`
**Borders:** `--border-hairline rgba(255,255,255,.07)` ·
`--border-strong rgba(255,255,255,.12)`
**Text:** `--text-primary #EDEDEF` · `--text-secondary #9A9AA0` · `--text-muted #5E5E66`
**Accent:** `--accent #D97757` · `--accent-hover #E08A6D` ·
`--accent-dim rgba(217,119,87,.14)`
**Diff:** add `#4BB58A` on `rgba(75,181,138,.12)` · del `#E5534B` on
`rgba(229,83,75,.12)` · gutter `#5E5E66`

**Type:** UI/chrome uses the system stack
(`-apple-system, "SF Pro Text", ui-sans-serif, system-ui`); the terminal and diff —
the hero content — use a characterful monospace (JetBrains Mono / Commit Mono,
falling back to `ui-monospace, "SF Mono", monospace`). Dense scale: eyebrow labels
11px/600/uppercase, UI default 13px, meta 11–12px, terminal 12.5px/1.5,
diff 12px/1.45.

**Spacing** 4px base (4·6·8·12·16·20·24·32). **Radii** window/panels 10px,
buttons/inputs 7px, chips 5px, dots 999px. **Depth** hairline borders + bg layering
over shadows; one soft shadow for popovers/modals only
(`0 8px 28px rgba(0,0,0,.45)`). **Motion** 120–180ms ease-out; running dot 1.6s
pulse; awaiting a gentle attention pulse; respect `prefers-reduced-motion`. **Icons**
Lucide line, 16px, 1.5 stroke.

---

## Out of scope (v1)

No real git integration beyond reading the diff, no auth, no light mode, no
multi-window, no settings screen. The inspector holds only the Diff for now (built
to accept more tabs later). **The terminals, however, are not a mock in v1 — they
must be real Claude Code CLI sessions.**
