# Task 193

### 193. [ ] Dev-only mock update — drive the update UI without a real release

**Status:** Not started
**Depends on:** #190, #191, #192
**Created:** 2026-06-26

**Description**

Until a real signing key + published release exist, the in-app update UI (the #190 sidebar
indicator + confirm/freeze/progress flow, the #191 Settings "Updates" pane, the #192 "what's
new" notes) **cannot be exercised** — `checkForUpdate()` always returns "no update". Add a
**dev-only mock** so a developer can, in a dev run, **insert a command to fake an available
update** and watch the whole UI react: the indicator appears, the Updates pane shows the
version + patch notes, "Update now" runs a **simulated** download (progress bar + freeze
overlay), and the post-update toast fires.

**Goal & why.** A zero-backend, dev-gated way to put the update machinery into each of its
states so the UI built in #190/#191/#192 is testable end-to-end before any real release.

**Mechanism.**
- **Dev-gated only** (`import.meta.env.DEV`) — the mock is registered/imported only in dev so
  it never ships in a production build.
- **"Insert a command" = a console global.** Expose (in dev) a small namespaced helper on
  `window`, e.g. `window.__claudecue = { mockUpdate, mockProgress, mockError, clearUpdate }`:
  - `mockUpdate({ version = "9.9.9", notes? })` → sets #190's `update` slice to
    `{ status: "available", version, notes }` (notes defaults to a sample markdown changelog,
    exercising the #192 render), so the indicator + Updates pane light up.
  - `mockProgress(pct)` → set `status: "downloading"`, `progress: pct` (drive the #190 freeze
    overlay + progress bar manually).
  - `mockError(msg)` → `status: "error"`, `error: msg`.
  - `clearUpdate()` → back to `status: "idle"`.
- **Simulated install.** When a mock update is active, `installUpdate()` (#190) must **not**
  call the real updater plugin or relaunch — instead it **animates `progress` 0→100** over a
  short interval, then resolves by firing the **post-update toast** ("Updated to v<version>")
  and clearing to idle (no real relaunch in mock). Implement via a **mock flag** in
  `updater.ts` (the module that holds the real `Update` object): `setMockUpdate(info)` makes
  `checkForUpdate`/`downloadAndRelaunch` use fake data + a timer-driven progress loop instead
  of the plugin. The store's dev-only `mockUpdate` action calls it.
- **Optional dev-only button.** In the #191 Updates pane, render a small **"Simulate update"**
  control **only when `import.meta.env.DEV`**, calling the same `mockUpdate()` — so the flow
  is reachable without opening devtools. (Console global is the primary; the button is a
  convenience.)

**Scope.** A dev-only store action + a dev-registered `window` helper + a mock branch in
`updater.ts`'s check/install so progress + toast simulate without a backend. Reuses #190's
`update` slice/indicator/flow, #191's pane, and #192's notes render — **drives** them, adds
no production behavior.

**Out of scope.**
- Anything that ships in production (the mock is dev-only; verify it's tree-shaken/guarded
  out of `npm run tauri build`).
- Real update download / signing / pipeline (that's #190 + the later signing-key task).
- A general dev/debug console beyond these update helpers.

**Concrete files/symbols.**
- `src/updater.ts` (from #190) — add a mock mode: `setMockUpdate(info | null)`;
  `checkForUpdate` returns the mock when set; `downloadAndRelaunch(onProgress)` runs a
  timer-driven 0→100 loop and skips the real `relaunch()` when mocked.
- `src/store.ts` — a dev-only `mockUpdate(opts)` action setting the `update` slice (incl.
  `notes` from #192) + calling `updater.setMockUpdate`; reuse `installUpdate` (it consults
  the mock flag) and `pushToast`.
- **New** `src/devMock.ts` (or in `main.tsx`) — `if (import.meta.env.DEV)` registers
  `window.__claudecue` helpers that call the store actions. Imported only under the dev guard.
- `src/components/Settings/Settings.tsx` (#191 Updates pane) — optional dev-only "Simulate
  update" button (`import.meta.env.DEV`).
- A type for the `window` global augmentation (a `.d.ts` or inline `declare global`).

**Subtasks**

1. [ ] `updater.ts`: `setMockUpdate(info|null)` + mock branches in `checkForUpdate`
   (return mock) and `downloadAndRelaunch` (timer progress 0→100, no real relaunch).
2. [ ] Store: dev-only `mockUpdate({version,notes})` / `mockProgress` / `mockError` /
   `clearUpdate` actions driving the `update` slice + `setMockUpdate`; ensure `installUpdate`
   uses the mock path when active and fires the post-update toast.
3. [ ] `src/devMock.ts` registering `window.__claudecue` under `import.meta.env.DEV`; wire its
   import behind the dev guard (e.g. in `main.tsx`). Add the `Window` type augmentation.
4. [ ] Optional dev-only "Simulate update" button in the #191 Updates pane.
5. [ ] **Verify** — `npm run build`, `npm run lint`, `npm test` green; Rust untouched.
   In `npm run tauri dev`: `window.__claudecue.mockUpdate()` → the sidebar indicator appears,
   Settings → Updates shows the fake version + sample notes (#192 render), "Update now"
   animates the progress bar under the freeze overlay, then the "Updated to v9.9.9" toast
   fires. Confirm the helper/button are **absent in a production build**.

**Acceptance criteria**

- [ ] In a dev run, a console command (`window.__claudecue.mockUpdate(...)`) puts the update
      UI into the "available" state — indicator + #191 pane + #192 notes all render the fake
      update.
- [ ] Triggering install in mock mode **simulates** a download (progress bar + freeze overlay
      advance 0→100) **without** calling the real plugin or relaunching, then fires the
      post-update toast.
- [ ] `mockProgress` / `mockError` / `clearUpdate` drive the downloading / error / idle states.
- [ ] The mock is **dev-only** — not present/registered in a production build.
- [ ] `npm run build`, `npm run lint`, `npm test` pass; no Rust changes.

**Notes**

- **Autonomous refine (2026-06-26):** user not responding; decisions logged in
  `ASSUMPTIONS.md`.
  - **"Insert a command" = a dev-gated `window.__claudecue` console helper** (primary), plus
    an optional dev-only "Simulate update" button in the #191 pane for convenience.
  - **Dev-only via `import.meta.env.DEV`** — imported/registered under the guard so it's absent
    in production builds.
  - **Simulated install** (timer progress + toast, no real relaunch) lives behind a **mock
    flag in `updater.ts`**, so the same `installUpdate` flow works for both real and mock.
  - The mock sets **`update.notes`** (the #192 field) so it also exercises the patch-notes
    render — hence depending on #192, not just #190.
- **Depends on: #190, #191, #192** — the mock exists to test the update UI, which is fully
  realized only across all three (slice + flow, Updates pane, notes render); it drives every
  field they read. Lowest-number-first ordering already implements #190→#191→#192→#193.
- **References:** TASK-190.md (`update` slice, `updater.ts`, `installUpdate`, indicator),
  TASK-191.md (Updates pane), TASK-192.md (`update.notes` + patch-notes render); no existing
  `import.meta.env.DEV` hooks in the codebase (this introduces the first dev-only path).
