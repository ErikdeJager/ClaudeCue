### 213. [ ] Worktree agent header — use the normal "open view" button + a static "worktree" badge

**Status:** Not started
**Depends on:** none
**Created:** 2026-06-27

**Description**

On **Overview agent cards** and **Canvas agent panel headers**, a **worktree** agent
is treated differently from a normal agent: instead of the normal agent's "open view"
icon button (`OpenViewButton`), it shows a **clickable** "worktree" text button
(`WorktreeViewsBadge`) that opens the Views popover. This task **unifies** the two:
give a worktree agent the **same** `OpenViewButton` as a normal agent, and turn
"worktree" into a **non-clickable static badge** (an indicator only, styled like the
existing "fork" badge).

Grounding (read before implementing):

- `OpenViewButton` (`src/components/OpenViewButton/OpenViewButton.tsx`) and
  `WorktreeViewsBadge` (`src/components/WorktreeViewsBadge/WorktreeViewsBadge.tsx`)
  **both wrap the same `ViewsPopover`** scoped to `repoPath` — functionally identical
  menus (add view: diff / file / kanban / file tree / terminal + "New session here").
  The only difference is the trigger: `OpenViewButton` is an icon button
  (`PanelsTopLeft`); `WorktreeViewsBadge` is a text "worktree" button with a chevron.
- **Overview** (`src/components/Overview/Overview.tsx`): in the card header
  (~lines 237–241) a worktree agent renders
  `<WorktreeViewsBadge repoPath={session.repoPath} />`, and the action-area
  `OpenViewButton` is gated `!session.worktreeParent` (~lines 248–312). The "fork"
  indicator nearby is a **static** `<span className={styles.worktreeBadge}>fork</span>`
  (~line 241).
- **Canvas** (`src/components/Canvas/CanvasSurface.tsx`): the same pattern —
  `WorktreeViewsBadge` for worktree agents (~lines 278–283), `OpenViewButton` gated
  `!session.worktreeParent` (~lines 290–308), static `fork` badge (~line 283).
- The static-badge CSS class `worktreeBadge` already exists in
  `Overview.module.css` (~200–208) and `Canvas.module.css` (~352–360) (and
  `ScheduledPanel.module.css`), used for the "fork" / read-only "worktree" text
  indicators.
- The **sidebar** already uses the **same** `SessionRow` context menu (Rename / Fork /
  Copy session ID / Open in canvas / Remove) for worktree and normal agents — no
  change needed there. The card's phrase "the same context-menu button as a normal
  agent" therefore refers to the **views-popover trigger button on the
  Overview/Canvas headers** (the affordance that actually differs), not the sidebar
  right-click menu.

So the change is: for worktree agents on Overview + Canvas headers, render the normal
`OpenViewButton` (scoped to `session.repoPath`, which **is** the worktree folder — so
views still open in the worktree), and replace the clickable `WorktreeViewsBadge` with
a static `<span className={styles.worktreeBadge}>worktree</span>`.

**Scope / out of scope**

- In scope: Overview card headers and Canvas agent panel headers.
- Out of scope: the sidebar (already unified); the sidebar `WorktreeHeader` `+`/menu
  (#196/#201 — a different surface); the `ScheduledPanel` "worktree" badge (already
  static); adding any new view type.

**Subtasks**

1. [ ] `Overview.tsx`: remove the `!session.worktreeParent` gate so `OpenViewButton`
   renders for worktree agents too (scoped to `session.repoPath`); replace
   `<WorktreeViewsBadge …>` with a static
   `<span className={styles.worktreeBadge}>worktree</span>`.
2. [ ] `CanvasSurface.tsx`: make the same two changes.
3. [ ] Verify the worktree `OpenViewButton` opens the Views / "New session here"
   popover scoped to the worktree folder (`session.repoPath`).
4. [ ] If `WorktreeViewsBadge` is now unused anywhere (grep importers), delete the
   component + its CSS module; otherwise leave it.
5. [ ] Confirm the static "worktree" badge matches the "fork" badge styling and the
   two read cleanly together when an agent is both a worktree **and** a fork.
6. [ ] Docs: update `CLAUDE.md` (worktree agents now use the standard
   `OpenViewButton`; "worktree" on Overview/Canvas headers is a static badge).

**Acceptance criteria**

- [ ] A worktree agent's Overview card and Canvas panel header show the **same**
      "open view" icon button as a normal agent, and it opens the Views / new-session
      popover scoped to the worktree folder.
- [ ] "worktree" appears as a **non-clickable** badge (no pointer cursor, no hover
      affordance, no `onClick`), styled like the "fork" badge.
- [ ] Normal agents are unchanged; the sidebar is unchanged.
- [ ] `WorktreeViewsBadge` is removed if it became unused (no dangling import).
- [ ] `npm run lint`, `npm run build`, and `npm test` pass.

**Notes**

- Decided autonomously (refine loop, user not answering — see `ASSUMPTIONS.md`).
- "the same context-menu button as a normal agent" = the `OpenViewButton` (views
  popover trigger). Worktree agents already share the sidebar context menu; the
  differing affordance was the clickable `WorktreeViewsBadge`.
- The worktree `OpenViewButton`'s `repoPath` is `session.repoPath` (the worktree
  folder), preserving "open a view in this worktree."
- The static badge reuses the existing `worktreeBadge` class (same as "fork").
