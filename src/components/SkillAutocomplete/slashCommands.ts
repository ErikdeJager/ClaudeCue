// Pure logic for the scheduled-prompt slash-command autocomplete (#114): detect
// the active `/token` at the caret, filter the skill list, and compute the
// post-insert string + caret. Kept DOM-free so it's unit-testable (vitest, Node).

import type { SkillInfo } from "../../types";

/** An active `/`-trigger: the index of the `/` and the text typed after it. */
export interface TriggerMatch {
  /** Index of the `/` that opened the menu. */
  start: number;
  /** The filter query — text between the `/` and the caret (whitespace-free). */
  query: string;
}

/**
 * Detect a `/`-trigger ending at `caret` in `value`. The `/` must be in **command
 * position** — at the very start of the field or immediately preceded by
 * whitespace — so a `/` inside a path or URL (`src/foo`, `https://…`) does not
 * trigger. Returns `null` when there's no active trigger.
 */
export function detectTrigger(
  value: string,
  caret: number,
): TriggerMatch | null {
  // Walk back from the caret to the start of the current whitespace-delimited
  // token. The walk stops at whitespace, so the token is whitespace-free and its
  // preceding char is whitespace or start-of-string (= command position).
  let i = caret;
  while (i > 0 && !/\s/.test(value[i - 1]!)) i--;
  if (value[i] !== "/") return null;
  const query = value.slice(i + 1, caret);
  // A nested `/` means this is a path, not a command token (e.g. `/a/b`).
  if (query.includes("/")) return null;
  return { start: i, query };
}

/**
 * Filter `skills` by `query` (case-insensitive substring on the name; the
 * description may also match). An empty query returns the whole list.
 */
export function filterSkills(skills: SkillInfo[], query: string): SkillInfo[] {
  const q = query.trim().toLowerCase();
  if (!q) return skills;
  return skills.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q),
  );
}

/**
 * Replace the partial `/typed` token (from `start` to `caret`) with
 * `/<skillName> ` and return the new value plus the caret position after the
 * inserted text (just past the trailing space).
 */
export function applyInsertion(
  value: string,
  caret: number,
  start: number,
  skillName: string,
): { value: string; caret: number } {
  const insert = `/${skillName} `;
  const next = value.slice(0, start) + insert + value.slice(caret);
  return { value: next, caret: start + insert.length };
}
