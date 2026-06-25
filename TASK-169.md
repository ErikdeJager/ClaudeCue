# TASK-169

### 1. [ ] Refresh auto-generated session names promptly — no click required

**Status:** Not started · _(Not started | In progress | Done)_
**Depends on:** none
**Created:** 2026-06-25

**Description**

**The bug.** When a new agent starts and `claude` auto-generates its session title
(#97), the new name does **not** appear in the left **Sidebar** (or anywhere) until the
user **clicks** the session. The user wants the name to refresh **automatically** —
ideally as soon as it's generated.

**Root cause (grounded in the code).** The auto-name pipeline (#97) works like this:

- A backend **title worker** thread (`src-tauri/src/pty.rs`, `title_worker`, ~line 719)
  reads `claude`'s own `ai-title` out of its per-session JSONL log
  (`src-tauri/src/title.rs`, `read_session_title`) and emits a
  `SessionEvent::Name { id, name }` **only when the title differs** from the last one it
  emitted (it keeps a `last: HashMap<id,title>` for dedup, ~line 742–746).
- It only re-reads when **poked**. The **busy/idle monitor** (`pty.rs`, `monitor_loop`,
  ~line 690–708) pokes it through a `title_tx` channel **on a busy→idle edge only**:
  `if !*busy && was == Some(true) { let _ = title_tx.send(id.clone()); }` (~line 706).
- `lib.rs` (~line 76–83) persists the emitted name (`set_auto_name`) and forwards it as
  the `session://name` Tauri event; `ipc.ts` (~line 338) routes it to the store's
  `onName` handler (`store.ts` ~line 1255), which calls `setAutoName` (`store.ts`
  ~line 1141), replacing the `sessions` array. The **frontend is correct**: the Sidebar
  subscribes to `s.sessions` (`Sidebar.tsx:892`), `setAutoName` swaps the array + the
  session object, and `SessionRow` is **not** memoized — so a real name change
  re-renders the sidebar **without** a click.

The defect is therefore a **backend cadence problem, not a render problem**: `claude`
writes its `ai-title` **asynchronously** (it's LLM-generated and lands a moment **after**
the turn finishes), so at the instant of the busy→idle edge the title worker reads, the
title is frequently **not yet written** (or is still the old one) → it emits nothing.
There is **no further re-read** until the *next* busy→idle edge. Clicking a session
(`select`/`selectItem` in `store.ts` make **no backend call**) only helps **indirectly**:
selecting/jumping to the session triggers a terminal focus/resize **repaint** → output
activity → a fresh busy→idle edge → the worker re-reads → the now-present `ai-title`
finally emits. Hence "only refreshes once I click on it."

**The fix.** Make the title worker re-read the title on a **short schedule** rather than
once per edge, so a late-written `ai-title` is picked up within seconds with no user
interaction. Per the user's decision (see Notes), do this in two places:

1. **After each busy→idle edge:** instead of a single read, run a **burst** of re-reads
   over a **~30-second window** (the user said ~30s "or even longer" — leave the window a
   tunable constant). The existing per-session dedup (`last`) guarantees the burst emits
   **at most once per actual title change**, so re-reading the same title is a cheap
   no-op.
2. **At session spawn (new-agent creation):** poke the title worker the moment a session
   is registered, starting the same re-read burst — so a fresh agent's first title (and a
   **resumed/forked** session's already-existing title on boot) surfaces promptly instead
   of waiting for the first incidental edge.

This stays entirely in the backend (`pty.rs`), reuses the existing `title_tx`/`title_rx`
channel and the existing dedup, and adds **no new dependency** (no filesystem watcher, no
fixed-cadence global poll). Every view updates automatically because they all read the
same store `sessions` array — the Sidebar, Overview cards, and Canvas panels alike.

**Scope (in scope):**

- Convert `title_worker` from a blocking `recv()` loop into a **schedule-aware** loop
  (`recv_timeout`) that maintains per-session **pending re-read deadlines** and, on each
  poke, enqueues a burst of deadlines spanning ~30s.
- Have the **monitor's busy→idle poke** continue to drive the burst (a new edge refreshes
  / restarts the window).
- Add a **spawn-time poke**: retain a `title_tx` clone in `SessionManager` and send the
  new session id to the title worker right after `spawn_with_id` registers a session (so
  spawn / resume / fork all kick off a burst).
- Keep `forkable` (#138) emission working on the same pokes (it's computed every poke in
  `title_worker`, ~line 726).

**Out of scope (explicit):**

- **No** frontend changes — the render path is already correct (`setAutoName` → Sidebar
  re-render). Do **not** add a click-driven or polling pull in the UI.
- **No** filesystem watcher (`notify` crate) and **no** always-on fixed-cadence global
  title poll — the user chose the lightweight delayed-re-read approach.
- **No** change to `title.rs`'s read logic, to the `ai-title`/`last-prompt` fallback, or
  to the `session://name` event shape / `lib.rs` persistence / `ipc.ts` routing.
- **No** change to the busy/idle heuristic itself (#42/#55/#116) — only an addition to
  *when the title is re-read*.
- **No** change to the #100 auto-name **on/off** Settings gate (off still falls back to
  the branch label).

**Subtasks**

1. [ ] **Retain a title-poke channel on `SessionManager`** (`src-tauri/src/pty.rs`,
   `SessionManager` struct ~line 188 + `new()` ~line 200). Today `title_tx` is created in
   `new()` and **moved** into `monitor_loop`. Keep a **clone** on the manager so spawn can
   poke too:
   - Add a field `title_tx: Mutex<Sender<String>>` next to `events: Mutex<Sender<...>>`
     (the `Mutex` is for the same `!Sync` reason as `events`).
   - In `new()`, `clone()` `title_tx` before moving the original into `monitor_loop`, and
     store the clone: `title_tx: Mutex::new(title_tx.clone())`.
2. [ ] **Add a spawn-time poke** at the common chokepoint `spawn_with_id` (`pty.rs`, the
   private fn used by `spawn_session_with_prompt` / `resume_session` / `fork_session`).
   Right **after** the new `Session` is inserted into the `sessions` map and its id is
   known, send the id to the title worker: `let _ = self.title_tx.lock().<unwrap-or-poison>
   .send(id.clone());` (best-effort; a dead worker must never fail a spawn). This makes a
   brand-new agent start a re-read burst immediately (harmless no-op until it has a log),
   and surfaces a **resumed/forked** session's existing title on boot without waiting for
   the first turn. _(If `spawn_with_id` doesn't have the final id in scope at the right
   point, poke from the callers after they receive the `SessionInfo` — but prefer the
   single chokepoint.)_
3. [ ] **Make `title_worker` schedule-aware** (`pty.rs`, ~line 719). Replace the
   `while let Ok(id) = title_rx.recv()` blocking loop with a `recv_timeout`-driven loop
   that owns a **pending-deadlines** structure, e.g. `Vec<(Instant, String)>` or a
   `BinaryHeap` keyed by soonest `Instant` (`std::time::Instant::now()` is fine in the
   Rust backend):
   - Define a tunable burst schedule near the other `pty.rs` constants, e.g.
     `const TITLE_REREAD_OFFSETS_MS: &[u64] = &[0, 1_500, 4_000, 8_000, 15_000, 30_000];`
     (spans ~30s; document that extending the last value lengthens the window).
   - **On a poke** (`title_rx.recv_timeout(..)` returns `Ok(id)`): enqueue one pending
     deadline per offset (`Instant::now() + Duration::from_millis(off)`) for that `id`,
     **replacing** any still-pending burst for the same id so a fresh busy→idle edge
     restarts the window. Then immediately process anything already due (the `0ms` entry).
   - **On timeout** (no poke before the soonest deadline): process every pending deadline
     whose `Instant` is `<= now` — for each due `id`, run the **existing** read+emit logic
     (the `forkable` check ~line 726 + `read_session_title` ~line 739 + the `last`/dedup +
     `SessionEvent::Name` send ~line 742–748), then drop those deadlines.
   - **Wait interval:** `recv_timeout(soonest_deadline - now)` when any deadline is
     pending; fall back to a plain blocking `recv()` (or a long timeout) when the pending
     set is empty, so an idle worker doesn't spin.
   - On `recv_timeout`/`recv` returning `Err(Disconnected)` (sender dropped at app
     shutdown), **return** — matching the existing `return` on a dropped receiver.
   - Keep the existing `last: HashMap` and `last_forkable: HashMap` dedup so repeated reads
     of an unchanged title/flag emit nothing.
4. [ ] **Consider extracting a tiny pure helper** for deadline bookkeeping (e.g.
   `fn next_due(pending: &[(Instant, String)], now: Instant) -> Option<Duration>` and/or a
   schedule-builder that maps offsets→`Instant`s) so the timing logic is unit-testable
   without sleeping. Optional but encouraged given the existing `#[cfg(test)] mod tests`
   in `pty.rs` (~line 772).
5. [ ] **Verify the cadence end-to-end.** Build and run the app; start a fresh interactive
   agent and submit a first prompt. Confirm that when the turn ends and `claude` writes its
   `ai-title`, the name appears in the **left sidebar automatically within a few seconds**
   (no click), and likewise updates the **Overview** card header and any **Canvas** panel
   title for that session. Confirm a **resumed** session shows its prior title shortly
   after boot. Confirm the busy/idle dot behavior and `forkable`/Fork affordance are
   unchanged.
6. [ ] **Run the full check suite** (see Acceptance criteria) and fix any fallout.

**Acceptance criteria**

- [ ] After an agent finishes a turn and `claude` writes/updates its `ai-title`, the new
  name appears in the **left sidebar automatically — without clicking the session** —
  within the burst window (a few seconds), not only on the next manual click.
- [ ] The same auto-refresh is reflected in **Overview** card headers and **Canvas** panel
  titles for that session (they share the store `sessions` array; no per-view fix needed).
- [ ] A **freshly spawned** agent triggers a re-read burst at creation, and a **resumed /
  forked** session surfaces its existing title shortly after boot rather than waiting for
  its first new busy→idle edge.
- [ ] The re-read burst is **bounded** (a finite set of deadlines ~30s after each poke);
  an idle session with no pending deadlines does **not** spin or scan on a timer, and the
  worker still ends cleanly on app shutdown (sender dropped → `recv` errors → `return`).
- [ ] No duplicate / churning `session://name` emissions: a re-read that finds an
  unchanged title emits nothing (existing `last`-map dedup preserved); `forkable` (#138)
  still flips correctly on the same pokes.
- [ ] The #100 auto-name **off** setting still falls back to the branch label; the
  `session://name` event shape, `lib.rs` persistence, and `ipc.ts`/`store.ts` routing are
  unchanged; **no frontend files changed**.
- [ ] All green: `npm run build`, `npm run lint`, `npm test`, `npm run format:check`,
  `cargo test --manifest-path src-tauri/Cargo.toml`, and `npm run lint:rust` /
  `npm run format:rust`.

**Notes**

- **User decisions (refine Q&A, 2026-06-25):**
  - Approach: **delayed re-reads** (lightweight, no new dependency) — chosen over a
    filesystem watcher or a fixed-cadence global poll.
  - The user added: also kick off re-reads **at agent creation (new-agent spawn)**, and
    make the window last **~30 seconds "or maybe even longer"** — exact offsets/length
    left to the implementer (hence the tunable `TITLE_REREAD_OFFSETS_MS` constant).
- **Why "only on click" today:** `select`/`selectItem` (`store.ts` ~line 1082, ~line 494)
  make **no** backend call. A click refreshes the name only as a side effect — selecting a
  session repaints/resizes its terminal → output → a busy→idle edge → the worker re-reads
  and the (by-then-written) `ai-title` emits. The real fix is to re-read on a timer after
  the edge, not to rely on incidental activity.
- **Frontend is already correct** — verified: `Sidebar` subscribes to `s.sessions`
  (`Sidebar.tsx:892`), `setAutoName` (`store.ts:1141`) replaces the array and the changed
  session object, and `SessionRow` (`Sidebar.tsx:209`) is not wrapped in `React.memo`, so
  a genuine name change re-renders the row on its own. Do **not** add UI polling.
- **Reference symbols:**
  - `src-tauri/src/pty.rs` — `SessionManager` (struct ~188, `new()` ~200, `title_tx`
    creation ~206), `monitor_loop` busy→idle poke (~690–708), `title_worker` (~719–750,
    dedup `last`/`last_forkable`, `forkable` ~726, `read_session_title` call ~739,
    `SessionEvent::Name` send ~746), `spawn_with_id` (the spawn chokepoint), and the
    `#[cfg(test)] mod tests` (~772).
  - `src-tauri/src/title.rs` — `read_session_title` (the `ai-title` reader; **unchanged**).
  - `src-tauri/src/lib.rs` — `SessionEvent::Name` → `set_auto_name` + `session://name`
    emit (~76–83; **unchanged**).
  - `src/ipc.ts` (~338) / `src/store.ts` (`onName` ~1255, `setAutoName` ~1141) /
    `src/components/Sidebar/Sidebar.tsx` (~282–287, `SessionRow`) — the frontend path
    (**unchanged**).
  - `src/paths.ts` — `sessionLabel` resolves `custom || auto || branch`.
- **Performance note:** the burst does up to ~6 log-file scans per turn per session
  (vs. 1 today), all off the monitor's hot path and bounded to the window. This is an
  accepted tradeoff. An optional early-stop (end a burst once a read within it has emitted
  **and** a later read returns the same title) may be added, but the `ai-title` can keep
  evolving within a turn, so the simple full-burst-with-dedup is the safe default.
- **Why `Depends on: none`:** this fixes shipped #97 code; every symbol it touches already
  exists. The other open cards (#167 file tree viewer, #168 collapsible sidebar) are
  unrelated and produce nothing this consumes.
