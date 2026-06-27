### 232. [x] Scheduled task time: show only the time when the date is today

**Status:** Done
**Depends on:** none
**Created:** 2026-06-28

**Description**

A scheduled session/task in the left panel shows its **full date and time** (e.g.
"Jun 21, 3:45 PM"). When the scheduled date is **today**, show **only the time** (e.g.
"3:45 PM") — omitting the date — to keep the UI cleaner. A schedule on any other day keeps
the full date + time.

**Grounding:**

- The formatter is the shared **`formatFireTime(fireAt)`** in `src/time.ts`:
  ```ts
  return new Date(fireAt * 1000).toLocaleString([], {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  }); // → "Jun 21, 3:45 PM" (always with the date)
  ```
- Used by the **sidebar `ScheduleRow`** (`src/components/Sidebar/Sidebar.tsx:245` — the
  "left panel" the card means; the row also has a full-date tooltip at `:227`) **and** the
  **Overview `ScheduleCard`** (`src/components/Overview/Overview.tsx:492`). The
  `ScheduledPanel` editor uses `toLocalInput` (a `datetime-local` value), not this
  formatter — unaffected.

**Decided approach (autonomous — see Notes/ASSUMPTIONS.md):**

- **Modify the shared `formatFireTime`** so that when the fire time falls on the **same
  local calendar day** as now, it formats **time-only** (`{ hour:"numeric",
  minute:"2-digit" }` → "3:45 PM"); otherwise the existing month/day + time. Add an
  **optional `now` parameter** (`formatFireTime(fireAt, now = new Date())`) so the "today"
  check is **unit-testable** with a fixed clock; callers pass only `fireAt` (unchanged).
- Apply it in the **shared helper** (not just the sidebar) so the Overview schedule card
  gets the same cleaner display — consistent across both surfaces. The card says "left
  panel", but the same rationale ("keep the UI cleaner") applies to the Overview card, and
  the helper is shared; this avoids divergent formats.
- Keep the **full date-time tooltip** on the sidebar row (`Sidebar.tsx:227`) unchanged, so
  the exact date is still discoverable on hover even when the inline label is time-only.

**Out of scope:**

- The `datetime-local` editor (`toLocalInput`) and the schedule data — unchanged.
- "Tomorrow"/relative wording (e.g. "Tomorrow 3:45 PM") — the card asks only for
  today → time-only; other days keep the absolute date.
- The new-session modal's schedule-step preview, if any — only `formatFireTime` output is
  changed.

**Cross-platform (hard requirement):** pure frontend; `toLocaleString` formatting is
identical on macOS and Windows (same locale APIs); no OS-specific code.

**Subtasks**

1. [ ] In `src/time.ts`, add an optional `now` param to `formatFireTime` and branch:
   same local Y/M/D as `now` → time-only format; else the current month/day + time format.
2. [ ] Add/extend a `src/time.test.ts` case: a fire time later **today** → time-only
   (no month/day); a fire time on **another day** → includes the date (pass a fixed `now`).
3. [ ] Confirm the sidebar `ScheduleRow` and Overview `ScheduleCard` render correctly;
   the sidebar full-date tooltip is unchanged.
4. [ ] `npm run build`, `npm run lint`, `npm test`, `npm run format:check` pass.

**Acceptance criteria**

- [ ] A scheduled task whose fire time is **today** shows **only the time** (e.g.
      "3:45 PM") in the left panel (and Overview card).
- [ ] A scheduled task on **another day** shows the **date + time** (e.g. "Jun 21,
      3:45 PM") as before.
- [ ] The sidebar row's hover tooltip still shows the full local date-time.
- [ ] `now` is injectable for testing; the "today" check is by **local calendar day**.
- [ ] `npm run build`, `npm run lint`, `npm test`, `npm run format:check` pass.

**Notes**

- **Autonomous decisions (user not answering; logged in `ASSUMPTIONS.md`):**
  - *Change the shared `formatFireTime`* (benefits the sidebar **and** the Overview card
    consistently) rather than a sidebar-only variant — the helper is shared and the
    "cleaner" rationale applies to both.
  - *"Today" = same local calendar day*; inject `now` for testability; keep the sidebar
    full-date tooltip.
- **Depends on: none** — small, self-contained tweak to the shipped schedule time helper
  (#93/#94).
- References: `src/time.ts` (`formatFireTime`), `Sidebar.tsx:227`/`:245` (ScheduleRow
  label + tooltip), `Overview.tsx:492` (ScheduleCard), `src/time.test.ts` (tests).
