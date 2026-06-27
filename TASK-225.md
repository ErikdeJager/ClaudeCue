### 225. [x] Show a subtle current-branch badge next to each sidebar folder, kept in sync from any source

**Status:** Done
**Depends on:** none
**Created:** 2026-06-28

**Description**

In the left sidebar, show a **subtle, slightly grayed-out branch badge next to each
top-level folder (repo) name**, displaying that folder's **current git branch**. Keep it
**in sync when the branch changes from any source** — an app agent, the user typing `git
checkout` in a terminal, or an external tool — which means it needs periodic
checking/polling on top of the existing event-driven refresh.

**Grounding:**

- The store already has the data: **`branches: Record<string, string>`** (repo path →
  current branch, `src/store.ts:681`/`:1431`), populated by **`refreshBranches`**
  (`store.ts:2162-2169` → `ipc.currentBranches(repoOrder(recents, sessions))`; backend
  `current_branches` shells `git` per path).
- `refreshBranches` is currently triggered: on the **#212 busy→idle edge** (debounced
  ~600ms, `store.ts:123-133` + the `setBusy` hook ~`:1851`), after **app-initiated**
  checkout/pull (`store.ts:3061`,`:3088`), and on repo-set changes. So **in-app terminal
  checkouts already refresh**; the gap is **external** checkouts and **idle repos with no
  busy session** (nothing fires the edge).
- The **repo header** (`RepoGroup`, `src/components/Sidebar/Sidebar.tsx`) renders
  `repoName(repo)` (`Sidebar.tsx:1228`) and a session-count badge (`:1230`) but **not**
  the branch. The branch (`branches[repo]`) is currently used only as the **session-row**
  label (`baseLabel`, `Sidebar.tsx:1176`).
- **Worktree sub-headers already display their branch** (`wtBranch`, `Sidebar.tsx:1682`),
  so this task targets the **top-level repo folder** headers.
- There is **no backend change** needed — `current_branches` already returns each repo's
  branch (and resolves worktree HEADs).

**Decided approach (autonomous — see Notes/ASSUMPTIONS.md):**

1. **Badge UI** — in the repo header, add a subtle branch badge after the repo name
   (e.g. `<span className={styles.repoBranch}>{branches[repo]}</span>`), shown only when
   `branches[repo]` is a non-empty string (a non-git / unknown folder shows nothing).
   Style it **muted/grayed and small** (e.g. `--text-muted`/`--text-faint`, the compact
   `--fs-meta-xs` used elsewhere #111), and **truncate** with ellipsis if long so it
   doesn't crowd the name/count/`+`. Expanded sidebar only.
2. **Sync from any source** — keep the existing #212 event-driven refresh **and** add:
   - a **refresh on window focus / visibility** — a `focus` + `visibilitychange`
     listener that calls `refreshBranches()` when the window/tab becomes
     focused/visible (catches "user changed the branch elsewhere and came back"); and
   - a **modest interval poll** — `setInterval(() => void refreshBranches(), ~15s)` that
     runs while the window is **visible** and is **paused when `document.hidden`**
     (catches external changes during continuous use). `refreshBranches` already batches
     **all** repos into one `currentBranches` IPC call, so this is one call per tick.
   Wire both in a `useEffect` (Sidebar or App), **main-window only**, with cleanup on
   unmount. The interval is **tunable**; ~15s balances freshness vs. git overhead.

**Out of scope:**

- The **collapsed icon rail** — it's icon-only with no room for a text badge; leave it.
- **Worktree** sub-headers — they already show their branch (`wtBranch`); no change
  (optionally confirm visual consistency, but not required).
- Any backend change — `current_branches` already provides branches for all repo paths.
- Changing the session-row label behavior (`baseLabel`) or the #212 edge refresh.

**Cross-platform (hard requirement):** pure frontend; no OS-specific code. `git` branch
reads go through the existing cross-platform `current_branches` (already used on both
OSes). The badge is plain CSS; renders identically on macOS and Windows. The
focus/visibility/interval APIs are standard DOM and work in both WKWebView and WebView2.

**Subtasks**

1. [ ] Add the branch badge to the repo header in `src/components/Sidebar/Sidebar.tsx`
   (next to `repoName(repo)`, before/after the count), guarded on `branches[repo]` being
   non-empty.
2. [ ] Add a `.repoBranch` style in `Sidebar.module.css`: muted color, small font,
   `text-overflow: ellipsis` / `max-width` so it truncates and stays subtle.
3. [ ] Add a `useEffect` (main-window only) that (a) calls `refreshBranches()` on `focus`
   + `visibilitychange` (when visible), and (b) runs a ~15s interval poll paused while
   `document.hidden`; clean up listeners + interval on unmount.
4. [ ] Verify the badge updates after an in-terminal `git checkout` (existing #212 edge),
   after refocusing the window following an external checkout, and within ~15s during
   continuous use.
5. [ ] `npm run build`, `npm run lint`, `npm run format:check` pass.

**Acceptance criteria**

- [ ] Each top-level sidebar folder shows a **subtle grayed-out badge with its current
      branch** next to the folder name (nothing shown for a non-git/unknown folder).
- [ ] The badge **updates when the branch changes from any source**: an in-app agent or
      terminal `git checkout` (via the #212 edge), an external checkout (on window
      refocus and within the poll interval), without an app restart.
- [ ] The badge stays subtle and truncates gracefully; it doesn't break the header
      layout (name + count + `+` still usable) and is absent in the collapsed rail.
- [ ] The poll is paused while the window is hidden and batches all repos in one IPC call
      per tick.
- [ ] `npm run build`, `npm run lint`, `npm run format:check` pass.

**Notes**

- **Autonomous decisions (user not answering; logged in `ASSUMPTIONS.md`):**
  - *Reuse the shipped `branches` map + `refreshBranches`* (no backend change); the badge
    just renders `branches[repo]`.
  - *Sync = keep #212's event refresh + add focus/visibility refresh + a ~15s
    visible-only interval poll.* The card explicitly asks for polling; #212 alone misses
    external/idle-repo changes. The interval is paused when hidden and batches all repos,
    keeping git overhead modest; the value is tunable. (This deliberately augments #212's
    "no poll timer" choice because the new requirement is broader.)
  - *Scope = top-level repo folder headers* (worktree headers already show their branch);
    expanded sidebar only.
- **Depends on: none** — builds on shipped `branches`/`refreshBranches` (#212) and the
  repo header.
- References: `store.ts:681`/`:1431` (`branches`), `:2162-2169` (`refreshBranches`),
  `:123-133` + `:1851` (#212 edge), `:3061`/`:3088` (app-action refresh),
  `Sidebar.tsx:1176` (session-row branch label), `:1201-1230` (repo header to extend),
  `:1682` (worktree header branch, already shown), `Sidebar.module.css` (add `.repoBranch`).
