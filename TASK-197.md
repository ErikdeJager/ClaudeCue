# Task 197

### 197. [x] Click a worktree in the sidebar to filter Overview to just that worktree

**Status:** Done
**Depends on:** #196
**Created:** 2026-06-26

**Description**

Clicking a **repo** name in the sidebar filters the Overview wall to that repo
(`overviewRepoFilter`, #34). A **worktree** sub-group header (`WorktreeHeader`,
`src/components/Sidebar/Sidebar.tsx`) isn't clickable that way, so there's no way to narrow
Overview to a single worktree. Make a worktree header click filter Overview to **only the
items running/shown inside that worktree**, mirroring the repo filter.

**The core wrinkle.** The Overview filter matches on **`effectiveRepo(s) === filter`**
(`paths.ts`; used in `store.ts overviewClusters` ~261 and `Overview.tsx` ~597), but a
worktree agent's **`effectiveRepo` is its parent repo** (#96) — so a worktree folder can't
be a filter target as-is. Broaden the filter predicate to also match the **actual folder**:
a session is in-filter when `effectiveRepo(s) === filter || s.repoPath === filter`. With
`filter` = a worktree dest, only that worktree's sessions (whose `repoPath` is the worktree
folder) match; with `filter` = a repo, behavior is unchanged (a worktree's `repoPath` never
equals the parent repo). Non-agent panels/schedules keyed to the worktree folder should
likewise show under that filter (they're keyed by `repoPath`).

**Goal & why.** Let the user focus Overview on one worktree the same way they focus on a
repo — useful when several worktrees of one repo each run their own agents.

**Behavior.**
- The worktree header's **name** becomes a click target → `setOverviewRepoFilter(dest)`
  (the worktree's folder `path`), toggling off if it's already the active filter (mirroring
  the repo name, `store.ts` `setOverviewRepoFilter` ~1312 already toggles). Like a repo
  click, it does **not** force a view switch (#79) — it just sets the filter.
- The filter predicate (everywhere it's `effectiveRepo(s) === filter`) becomes
  `effectiveRepo(s) === filter || s.repoPath === filter`, so a worktree-folder filter shows
  only that worktree's items; the "clear filter" affordance (`Overview.tsx` ~701) clears it.
- The active-filter highlight should mark the **worktree** row (not just repo rows) when its
  dest is the filter.

**Scope.** The clickable worktree name + the broadened filter predicate (store +
Overview). Reuses the existing `overviewRepoFilter` mechanism.

**Out of scope.**
- Changing how worktree items **cluster** under the parent repo (#96) — filtering narrows
  *which* items show; grouping is unchanged (the filtered worktree's items still render under
  the parent cluster header, now showing only that worktree).
- The worktree header's icon/`+` button (#196) and the other worktree cards.
- Any new filter UI beyond making the worktree name clickable like a repo name.

**Concrete files/symbols.**
- `src/components/Sidebar/Sidebar.tsx` — `WorktreeHeader` (~846): make the `worktreeName`
  span a click target → `setOverviewRepoFilter(path)`; active highlight when
  `overviewRepoFilter === path`.
- `src/store.ts` — `overviewClusters` filter (~261) + `setOverviewRepoFilter` (already
  toggles): broaden the predicate to `effectiveRepo(s) === filter || s.repoPath === filter`.
- `src/components/Overview/Overview.tsx` — the matching filter predicate (~597, ~650) +
  cluster rendering: same broadening; ensure a worktree-folder filter renders its items.
- `src/paths.ts` — possibly a small helper `sessionInFilter(session, filter)` shared by both
  call sites so the predicate has one definition.

**Subtasks**

1. [x] Added the shared `sessionInFilter(session, filter)` to `paths.ts` (`effectiveRepo ===
   filter || repoPath === filter`); used by `store.ts overviewClusters` (agents) and
   `Overview.tsx`'s `shown`. The store's panel/schedule filtering uses a local
   `folderInFilter(folder)` = `folder === filter || clusterRepoOf(folder) === filter`
   (clusterRepoOf maps a worktree folder → parent), applied to panels (`panelsByCluster`) and
   schedules (repoSet + cluster loop).
2. [x] Made the worktree header **name** a `<button>` → `setOverviewRepoFilter(path)` (toggles
   via the existing store action) + `setView("overview")`; `.worktreeActive` (accent-dim box +
   accent name) marks the row when `overviewRepoFilter === path`; `aria-pressed`.
3. [x] Worktree panels (keyed by the worktree folder) appear under the worktree filter (via
   `folderInFilter(key)`); a worktree filter excludes the parent's direct items + schedules;
   the existing "Show all" control clears it (unchanged). Unit-tested.
4. [x] **Verify** — `npm run build`, `npm run lint`, `npm test` (282, +5) green; **no Rust
   changes**. The live click flow is **runtime-unverified** in this loop (no GUI) — see Notes;
   the filter logic is unit-tested (worktree-filter `overviewClusterKeys` + `sessionInFilter`).

**Acceptance criteria**

- [x] Clicking a worktree header filters Overview to **only that worktree's items**
      (`overviewClusters` returns just the worktree's agent + panel keys); clicking it again
      clears the filter (`setOverviewRepoFilter` toggles); repo filtering is unchanged (the
      existing repo-filter test still returns all of the repo's items incl. its worktrees).
- [x] The active worktree filter is visually indicated on its sidebar row (`.worktreeActive`).
- [x] `npm run build`, `npm run lint`, `npm test` pass; no Rust changes.

**Notes**

- **Autonomous refine (2026-06-26):** decisions logged in `ASSUMPTIONS.md`.
  - **Filter predicate broadened to `effectiveRepo === filter || repoPath === filter`** — a
    worktree's `effectiveRepo` is the parent (#96), so the folder must match directly.
  - **No view switch / no grouping change** — only narrows which items show (mirrors the repo
    filter #34/#79).
- **Depends on: #196** — both edit `WorktreeHeader`; sequenced after the #196 header redesign
  (icon + `+` button) to avoid conflicting edits. Functionally independent otherwise.
- **References:** `Sidebar.tsx WorktreeHeader` (~846), `store.ts overviewClusters` (~261) /
  `setOverviewRepoFilter` (~1312), `Overview.tsx` filter (~597/650/701), `paths.ts
  effectiveRepo`. CLAUDE.md "Overview customization" + "#34 repo filter".

**Implementation notes (2026-06-26 — done)**

- Files: `paths.ts` (+`sessionInFilter` +test), `store.ts` (`overviewClusters` restructured),
  `Overview.tsx` (`shown` broadened), `Sidebar.tsx` + `.module.css` (clickable worktree name +
  active style), `store.test.ts` (+worktree-filter test). **No Rust.**
- **`overviewClusters` restructure (the crux):** built `wtParent`/`clusterRepoOf` **first**,
  then a single `folderInFilter(folder)` predicate (`!filter || folder === filter ||
  clusterRepoOf(folder) === filter`) applied uniformly to agents (`sessionInFilter`, which is
  the same thing for an agent's `repoPath`), panels (`panelsByCluster` keyed by folder), and
  schedules (repoSet + the cluster-loop `scheduleIds`). A worktree filter thus shows the
  worktree's agents (`repoPath === filter`) + panels (`key === filter`) clustered under the
  **parent** repo header, and excludes the parent's own direct items/schedules. A repo filter
  is byte-identical to before (verified: the existing repo-filter test is unchanged).
- **Overview.tsx only needed `shown` broadened:** its rendered `items` come from
  `keys.map(byKey.get)` where `keys` is the (now-filtered) `overviewClusters` output, so the
  filtered keys drive rendering — but `byKey`'s agents come from Overview's own `shown`, which
  had to include the worktree's agents or they'd be dropped. Panels/schedules in `byKey` can
  stay unfiltered (extra entries are never referenced by the filtered `keys`).
- **DEVIATION (documented):** the plan said the worktree click should **not** force a view
  switch (citing #79). But the **repo** name click — the thing the plan says to mirror and the
  original user request ("mirroring how folder filtering works") — **does** `setView("overview")`
  (Sidebar.tsx ~1466). #79 governs *item-row* clicks, not the filter-header gesture. So I
  mirrored the repo header exactly (`setOverviewRepoFilter(path)` + `setView("overview")`):
  clicking a worktree takes you to the filtered Overview, the expected behaviour. No acceptance
  criterion mentions view-switching; it's a one-line change if a different choice is preferred.
- **Runtime-unverified (autonomous loop, no GUI session):** the live click → narrowed wall +
  the active-row highlight. The filter math is unit-tested (worktree-filter `overviewClusterKeys`
  returns exactly the worktree's items; `sessionInFilter` truth table). Recommend a quick
  `npm run tauri dev` pass with a repo that has a worktree running its own agent.
