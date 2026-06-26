# TASK-178

### 1. [x] Terminal panel: add a little vertical margin so the bottom row isn't cut off

**Status:** Done
**Depends on:** none
**Created:** 2026-06-26

**Description**

The terminal panel is cut off at the bottom: `claude`'s last row — typically its
prompt / input line — renders flush against (and partially clipped by) the panel's
bottom edge, so it reads as half a row of missing text. The fix is to give the
terminal **a little vertical breathing room**, balanced top **and** bottom, so the
last row is always fully visible with a small margin.

**Where this lives.** Every terminal in the app — Overview cards (#11), Canvas
panels (#47), and shell-terminal items (#72) — is the **one pooled xterm node** that
the terminal pool (`src/components/Terminal/terminalPool.ts`) reparents between
slots. That node always wears the single CSS class `.terminal` in
`src/components/Terminal/Terminal.module.css`:

```css
.terminal {
  position: absolute;
  inset: 0;
  padding: var(--space-6) var(--space-8); /* 6px vertical, 8px horizontal */
}
```

There is exactly one place to change, and changing it fixes every context at once
(the user confirmed they want a single, consistent fix everywhere — see Notes).

**Why bumping this padding is the right, robust fix.** The FitAddon
(`fit.fit()` in `terminalPool.ts`) sizes the terminal from the **content box** of
the element xterm is opened into — i.e. `getComputedStyle(container).height`, which
already excludes this padding (the global reset sets `box-sizing: border-box`, so the
absolutely-positioned `inset: 0` `.terminal` element's content height is
`slotHeight − verticalPadding`). It then computes
`rows = floor(availableHeight / cellHeight)`. So **increasing the vertical padding
reduces the height FitAddon sees, which makes the terminal claim one fewer row
whenever the last row would otherwise be clipped**, and leaves a guaranteed visible
gap below the final row. This makes the cosmetic fix also correct at the layout
layer — no need to touch FitAddon or xterm row math (the user chose the CSS-only
approach over a deeper FitAddon-rounding investigation — see Notes).

The cell height today is `round(fontSize × lineHeight)` ≈ `round(12.5 × 1.2)` =
`15px` (defaults in `terminalPool.ts` `currentTerminalSettings`), so the current 6px
top/bottom is under half a row of slack — too tight to guarantee the bottom row
clears the edge. Bumping it to roughly two-thirds–one full row of vertical room on
each side (≈10–12px) gives comfortable, balanced breathing room.

**Scope**

- `src/components/Terminal/Terminal.module.css` only: increase the **vertical**
  padding on `.terminal` (both top and bottom, balanced) from `var(--space-6)`
  (6px) to a slightly larger value — start at `var(--space-12)` (12px) and tune
  visually while running the app until the last row is fully visible with a small,
  pleasant margin and no row clipped at the bottom. Keep the horizontal padding
  unchanged (`var(--space-8)`).
- Use an existing spacing **token** for the value (e.g. `--space-10` if one exists,
  otherwise `--space-12`); do not introduce a hard-coded pixel literal. (Check
  `src/styles/tokens.css` for the available `--space-*` tokens — at time of writing
  they include `--space-4`/`-6`/`-8`/`-12`/`-16`; if a 10px token is added prefer it,
  otherwise `--space-12` is the nearest balanced choice.)

**Out of scope**

- No change to `terminalPool.ts`, the FitAddon configuration, xterm options
  (`fontSize` / `lineHeight` / cell metrics), or `resize_pty` / PTY sizing logic.
- No deeper FitAddon / fractional-cell-height rounding investigation (explicitly
  deferred by the user; revisit only if the padding bump alone does not resolve the
  clipping during verification).
- No change to horizontal padding, the `.wrapper`/`.slot` boxes, the exit/reconnect
  overlay, or any other terminal chrome.
- No per-context (Overview vs Canvas vs shell) differentiation — one shared value.

**Subtasks**

1. [x] In `src/components/Terminal/Terminal.module.css`, change `.terminal`'s
   `padding` so the **vertical** value increases (keep horizontal at
   `var(--space-8)`): e.g. `padding: var(--space-12) var(--space-8);`. — Done:
   `padding: var(--space-12) var(--space-8);` (vertical 6px→12px, horizontal unchanged).
2. [~] Run the app (`npm run tauri dev`) and confirm in a real `claude` session that
   the bottom row / input line is fully visible with a small margin below it — in an
   **Overview card**, a **Canvas panel**, and a **shell terminal** (#72). Tune the
   vertical token up or down so the gap looks balanced top and bottom and no row is
   clipped. — Implemented at the plan's endorsed value (`var(--space-12)`); GUI visual
   tuning was **not runtime-verified** (headless implementation environment — no
   display). See Notes.
3. [~] Confirm the terminal still refits correctly on resize / view switch / Canvas
   re-tile (no garbled redraw, no off-by-one row mismatch with the PTY). — Not
   runtime-verified (headless). Structurally sound: CSS-only padding change; FitAddon
   measures the content box, so refit math is unchanged in mechanism (see Notes).
4. [x] `npm run build` (type-check) and `npm run lint` pass. — Build, lint, and the
   Vitest suite (248 tests) all pass.

**Acceptance criteria**

- [~] In a live `claude` terminal, the bottom row (prompt / input line) is rendered
      in full with a small visible margin beneath it — no clipped or half-hidden
      bottom row — in Overview cards, Canvas panels, and shell terminals. — Addressed
      via the shared `.terminal` padding bump (one node covers all three contexts);
      not runtime-verified in the headless implementation environment.
- [x] The added breathing room is balanced top **and** bottom (the terminal stays
      visually centered), achieved purely via the `.terminal` vertical padding. —
      `var(--space-12)` applied symmetrically (top + bottom); horizontal untouched.
- [x] Horizontal padding is unchanged; the value uses an existing `--space-*` token,
      not a raw pixel literal. — `var(--space-12)` (12px) for vertical, `var(--space-8)`
      retained for horizontal.
- [x] Only `src/components/Terminal/Terminal.module.css` is modified.
- [x] `npm run build` and `npm run lint` pass.

**Notes**

- **User decisions (refine Q&A, 2026-06-26):**
  - **Approach:** CSS margin only — increase the shared terminal slot's padding;
    explicitly do **not** investigate the FitAddon row-rounding layer as part of this
    task (revisit only if padding alone is insufficient during verification).
  - **Margin placement/amount:** balanced top + bottom, ~10–12px each, with the
    implementing agent tuning the exact value while running the app until the last
    row is fully visible.
- Raw request (Refine card): "Terminal cutoff — The terminal panel is cut off at the
  bottom row. Give the terminal a little bit of margin."
- The single shared `.terminal` class is the pooled xterm container; one edit covers
  Overview, Canvas, and shell-terminal contexts (the pool reparents the same node
  into each — see the file header comment in `terminalPool.ts`).
- Mechanism note for the implementer: because FitAddon measures the container's
  content box, larger vertical padding *reduces* the computed `rows`, so the fix is
  both visual and structural — the terminal won't ask the PTY for a row that doesn't
  fit. This is why a pure CSS change resolves the clipping.
- **Implementation (2026-06-26):** changed `.terminal`'s padding from
  `var(--space-6) var(--space-8)` to `var(--space-12) var(--space-8)` — vertical 6px→12px
  (the plan's endorsed value; no `--space-10` token exists, so `--space-12` is the
  nearest balanced choice), horizontal unchanged. `npm run build`, `npm run lint`, and
  `npm test` (248 tests) all pass. **Runtime caveat:** the GUI visual tuning steps
  (subtasks 2–3 — running `npm run tauri dev` and eyeballing the bottom-row clearance /
  resize refit across Overview, Canvas, and shell contexts) were **not** performed —
  this was implemented headlessly with no display. The value follows the plan's
  recommended starting point and FitAddon analysis; if the bottom row still clips or
  the gap looks unbalanced when run interactively, nudge the vertical token (e.g. up to
  `--space-16` or down to `--space-8`) — it's a one-line CSS tweak in this same file.
