# Patch notes conventions

## Purpose

Each release ships a short set of **patch notes** — a human-readable summary of what
changed in the app. They should describe the **changes made to the application since the
previous patch**: the delta from the last set of notes to this one, _not_ a cumulative
history and _not_ an internal changelog. A user reading the Settings → **Updates** pane
should see exactly what's new in the notes they're looking at.

Write for the **end user**, not the developer:

- Say what changed from the user's point of view and why it matters, not which files or
  functions moved. (Compare the existing files — user-facing outcomes, no task/PR numbers,
  no code identifiers.)
- One set of notes covers only its own release. Each file lists only what that release
  added/fixed/changed relative to the notes before it.
- Keep each item to a sentence or two of plain language; inline markdown is allowed (item
  text passes through verbatim to the renderer).

## Where these are used

`src/patchnotes.ts` loads every `<version>.json` in this folder and renders the matching one
in the Updates pane. Authoring a file here is what powers the in-app notes shown for that
release.

## File format

One JSON file per set of notes, named `<version>.json` (e.g. `1.0.5.json`). Malformed files
are skipped, never fatal — but a file only shows up if it has a non-empty `version` and at
least one change group with at least one non-empty item.

```json
{
  "version": "1.0.5",
  "date": "2026-07-01",
  "changes": [
    {
      "category": "feature",
      "items": [
        "A user-facing sentence describing one change.",
        "Another change in the same category."
      ]
    },
    {
      "category": "fix",
      "items": ["A user-facing sentence describing one fix."]
    }
  ]
}
```

### Fields

- **`version`** (string, required) — identifies which release these notes belong to,
  matching the file name. Notes with no valid version are ignored.
- **`date`** (string, optional) — release date, `YYYY-MM-DD`. Omitted → empty.
- **`changes`** (array, required) — groups of related items. At least one group with at
  least one non-empty item is required, or the whole file is skipped.
  - **`category`** (string) — groups items under a heading. Known values map to friendly
    labels: `feature` → **Features**, `fix` → **Fixes**, `improvement` → **Improvements**,
    `other` → **Other**. Any other value (e.g. `welcome`) is Title-Cased as-is. A missing or
    blank category falls back to `other`.
  - **`items`** (array of strings) — the individual notes. Empty/blank strings are dropped;
    a group with no surviving items is dropped.

## Adding a new set of notes

1. Create `<version>.json` in this folder describing **only** what changed since the
   previous notes, grouped by category, in user-facing language.
2. That's it — `src/patchnotes.ts` picks the file up automatically (eager glob).
