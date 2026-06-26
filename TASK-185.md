### 185. [ ] Activity dot blinks yellow when focusing / leaving a busy agent

**Status:** Not started
**Depends on:** none
**Created:** 2026-06-26

**Description**

When an agent is actively working its `BusyIndicator` dot should stay **blue** (the
"working" shimmer, #42/#88). Today it **blinks yellow** — the #112 "finished — needs
input" settled state — for a moment, then returns to blue, in two situations:

1. **Clicking / focusing** an agent panel or card while it is working.
2. **Switching away** from a currently-selected, working agent (user-reported
   refinement, 2026-06-26).

This wrongly signals "needs your input" while the agent is still busy, and is
distracting.

**Root cause (grounded in the code).** The blink is a *real, transient backend state
change*, not a render glitch. `sessionBusy` (the map that drives the dot) is written in
exactly one place — `setBusy` (`src/store.ts:1313`) — which is called in exactly one
place — the `onState` handler (`src/store.ts:1453`) reacting to the backend
`session://state` event. So the dot going yellow means the backend monitor genuinely
emitted `busy:false` for one cycle, and `BusyIndicator` (`src/components/BusyIndicator/
BusyIndicator.tsx:34`, `settled = !busy && hasBeenActive`) faithfully renders it yellow.

The backend busy heuristic lives in `monitor_loop` (`src-tauri/src/pty.rs`, ~line 704):

```
busy = has_work
    && out != 0
    && (now - out) < BUSY_WINDOW_MS              // 700ms — recent output
    && (inp == 0 || (out - inp) >= INPUT_ECHO_MS); // 300ms — output AFTER the last input
```

The last clause is the **#55 keystroke-echo guard**: output arriving within
`INPUT_ECHO_MS` (300ms) *after* the last input is assumed to be the terminal echoing the
user's typing, not Claude working. `last_input` is stamped by `write_stdin`
(`src-tauri/src/pty.rs:362`) for **every** byte written to the PTY.

But xterm forwards more than keystrokes through `onData`
(`src/components/Terminal/terminalPool.ts:208` → `writeStdin` → `write_stdin`): it also
sends terminal-protocol **reports** that Claude's TUI requests via DECSET —
**mouse-event reports** (a click landing inside the terminal area; the pool comment at
`terminalPool.ts:164` explicitly acknowledges "claude's own mouse handling") and
**focus in / out reports** (`\x1b[I` / `\x1b[O`, emitted when the xterm gains / loses DOM
focus, DECSET 1004).

So when the user **focuses / clicks into** an agent (focus-in + a mouse press/release
report) or **switches away** from one (focus-out report), those report bytes are written
to the PTY and `last_input` is stamped *as if the user had typed*. The agent's in-flight
output then falls inside the 300ms echo window, is misclassified as keystroke echo →
`busy = false` for ~one 200ms monitor tick → the dot renders yellow → the next output
(>300ms after the stamp) flips it back to blue. The "switching away also triggers it"
symptom specifically requires the **focus-out** report on the agent being left (that
agent's output keeps flowing regardless of focus; only an input stamp can drop it to
idle), confirming focus reporting as a cause alongside mouse reports.

**Fix (targeted — confirmed with the user over an idle-debounce alternative).** Treat
these *automatic* terminal-protocol reports as **not user input** for the busy
heuristic. In `write_stdin`, still forward the bytes to the PTY unchanged (Claude needs
mouse + focus events), but **skip stamping `last_input`** when the written data consists
**solely** of such reports. Real keystrokes (printable text, Enter, control codes,
arrow / function keys, paste) continue to stamp `last_input`, so the #55 echo
suppression for *actual typing* is fully preserved.

**Scope.** Backend-only (`src-tauri/src/pty.rs`). No frontend change. **Out of scope:**
do **not** disable mouse / focus reporting or change what xterm forwards (that would
break Claude's mouse handling); do **not** touch `BusyIndicator`, the store, the
`INPUT_ECHO_MS` / `BUSY_WINDOW_MS` constants, or add idle-debounce / hysteresis (the user
chose the targeted fix over a debounce, so the timing of the *genuine* yellow transition
must stay unchanged).

**Subtasks**

1. [ ] Add a pure helper in `src-tauri/src/pty.rs`, e.g. `fn is_noninput_report(data: &str) -> bool`, that returns `true` iff `data` is non-empty and consists **entirely** of one or more recognized automatic terminal reports:
   - [ ] Focus reports: exactly `ESC [ I` (`\x1b[I`, focus in) and `ESC [ O` (`\x1b[O`, focus out).
   - [ ] SGR mouse (DECSET 1006, the modern default): `ESC [ <` followed by digits/`;` and terminated by `M` (press) or `m` (release) — e.g. `\x1b[<0;12;5M`.
   - [ ] X10 / normal mouse (DECSET 1000/1002/1003): `ESC [ M` followed by exactly 3 bytes (button, x, y).
   - [ ] Match one-or-more such sequences back-to-back; if **any** byte falls outside a recognized report, return `false` (treat as input — never risk suppressing a real keystroke).
   - [ ] Be conservative about false positives: CSI arrows `\x1b[A/B/C/D`, SS3 keys `\x1bO…` (note these have **no** `[`, so they're distinct from focus-out `\x1b[O` = CSI-O), function / Home / End `\x1b[…~`, a lone Escape `\x1b`, Enter `\r` / `\n`, and any printable text must all return `false`.
2. [ ] In `write_stdin` (`src-tauri/src/pty.rs` ~356–363): write `data` to the PTY unconditionally as today, but only stamp `last_input` when `!is_noninput_report(data)`. Add a short comment tying this to #55 + this task.
3. [ ] Unit tests for `is_noninput_report` — positive: focus in, focus out, SGR press, SGR release, X10 mouse, two reports concatenated (e.g. focus-in + mouse). Negative: `"ls\n"`, `"\r"`, arrow `"\x1b[A"`, SS3 `"\x1bOA"`, lone `"\x1b"`, empty string, and a report immediately followed by a real char (e.g. `"\x1b[Ix"`).
4. [ ] (Recommended) An integration-style test mirroring the existing busy tests (around `src-tauri/src/pty.rs:1007` / `:1061`): a session that reads busy (recent output, `has_work`), then a focus/mouse report via `write_stdin`, must **not** flip to idle on the next monitor evaluation — whereas a real keystroke under the same timing still triggers the echo suppression (the existing behavior).
5. [ ] Verify at runtime which exact sequences Claude emits on (a) clicking into an agent terminal and (b) switching away from it — e.g. temporary logging in `write_stdin`, or via `npm run tauri dev` — and confirm they're all covered by `is_noninput_report`. Remove any temporary logging before finishing.
6. [ ] Run all gates: `npm run build`, `npm run lint`, `npm test`, `cargo test --manifest-path src-tauri/Cargo.toml`, `npm run lint:rust`, `npm run format:rust`, `npm run format:check`.

**Acceptance criteria**

- [ ] Clicking into / focusing a **working (blue)** agent does **not** blink its dot yellow.
- [ ] **Switching away** from a working (blue) agent does **not** blink that agent's dot yellow.
- [ ] Typing into an agent still does **not** read as busy from the echo of the keystrokes (#55 preserved).
- [ ] A genuine end-of-turn busy→idle still shows the yellow "finished — needs input" dot (#112 preserved), with unchanged timing.
- [ ] `is_noninput_report` unit tests pass and the existing `pty.rs` busy tests still pass.
- [ ] All gates green: `npm run build`, `npm run lint`, `npm test`, `cargo test`, `npm run lint:rust`, `npm run format:rust`, `npm run format:check`.

**Notes**

- **User Q&A (2026-06-26):** chose the **Targeted** fix (ignore non-keystroke reports in the busy heuristic) over an idle-debounce or doing both. ⇒ No hysteresis / debounce; the genuine yellow transition's timing stays as-is.
- **User refinement (2026-06-26):** "it also happens when switching AWAY from an already selected agent" — this pins **focus-out** reporting as a cause; the fix covers focus in/out **and** mouse reports together.
- The blink is purely backend-state-driven: `sessionBusy` is written only by `setBusy` (`store.ts:1313`) ← `onState` (`store.ts:1453`) ← `session://state`; `BusyIndicator` (`BusyIndicator.tsx:34`) just renders `!busy && hasBeenActive` as yellow. **No frontend change is needed or wanted.**
- Mouse reporting is **confirmed** in use (`terminalPool.ts:164` comment). Focus reporting (DECSET 1004) is **inferred** from the "switch away" symptom; subtask 5 confirms the exact sequences at runtime. The matcher covers focus + SGR + X10 mouse to stay correct even if Claude enables a different subset.
- **Do not** disable focus / mouse reporting or alter what xterm forwards to the PTY — Claude relies on it. The fix only changes whether those reports count as "user input" for the busy/idle heuristic.
- Keep `is_noninput_report` **conservative**: when in doubt, classify as input (stamp). Wrongly suppressing a real keystroke's echo-guard would resurrect #55's "typing reads as busy" bug, which is worse than an occasional missed report.
- Relevant prior art / context: #42 (busy indicator), #55 (echo-aware "typing ≠ busy" detection), #88 (shimmer), #112 (yellow third state), #116 (`has_work` / seeded). Key files: `src-tauri/src/pty.rs` (`write_stdin`, `monitor_loop`, `last_input`, `INPUT_ECHO_MS`), `src/components/Terminal/terminalPool.ts:208`, `src/components/BusyIndicator/BusyIndicator.tsx`, `src/store.ts:1313`/`:1453`.
