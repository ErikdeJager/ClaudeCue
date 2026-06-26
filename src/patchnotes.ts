// Patch notes (#192): per-version notes authored in-repo as
// `src/patchnotes/<version>.json`, loaded + normalized here and rendered in the
// Settings → Updates pane (#191). Pure + dependency-light so it's unit-testable;
// `patchnotesToMarkdown` is mirrored by `scripts/patchnotes-to-md.mjs` (which can't
// import TS) to generate the GitHub release body / updater `latest.json` notes.

import type { PatchNotes, PatchNotesChange } from "./types";

// Eager glob of every authored version file. Vite parses each JSON to the module's
// `default` export; the keys (paths) are unused.
const RAW = import.meta.glob<{ default: unknown }>("./patchnotes/*.json", {
  eager: true,
});

/** Human label for a category; an unknown category Title-Cases its raw value. */
const CATEGORY_LABELS: Record<string, string> = {
  feature: "Features",
  fix: "Fixes",
  improvement: "Improvements",
  other: "Other",
};

export function categoryLabel(category: string): string {
  const trimmed = category.trim();
  const known = CATEGORY_LABELS[trimmed.toLowerCase()];
  if (known) return known;
  return trimmed
    ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
    : CATEGORY_LABELS.other!;
}

/**
 * Validate + normalize a raw JSON value into {@link PatchNotes}, or `null` if it's
 * malformed (best-effort: a bad file is skipped, never crashes the app). Requires a
 * non-empty `version` and at least one change group with at least one item.
 */
export function normalizePatchNotes(raw: unknown): PatchNotes | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.version !== "string" || !r.version.trim()) return null;
  const date = typeof r.date === "string" ? r.date : "";
  const changesRaw = Array.isArray(r.changes) ? r.changes : [];
  const changes: PatchNotesChange[] = [];
  for (const c of changesRaw) {
    if (typeof c !== "object" || c === null) continue;
    const cc = c as Record<string, unknown>;
    const category =
      typeof cc.category === "string" && cc.category.trim()
        ? cc.category
        : "other";
    const items = Array.isArray(cc.items)
      ? cc.items.filter(
          (i): i is string => typeof i === "string" && i.trim() !== "",
        )
      : [];
    if (items.length > 0) changes.push({ category, items });
  }
  if (changes.length === 0) return null;
  return { version: r.version.trim(), date, changes };
}

/** Numeric semver-ish compare (ignores pre-release/build suffixes): >0 if `a`>`b`. */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    v.split(/[.+-]/).map((n) => Number.parseInt(n, 10) || 0);
  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** All authored patch notes, newest version first. */
export const allPatchnotes: PatchNotes[] = Object.values(RAW)
  .map((m) => normalizePatchNotes(m.default))
  .filter((n): n is PatchNotes => n !== null)
  .sort((a, b) => compareVersions(b.version, a.version));

/** The newest authored version's notes, or `null` if none are authored. */
export function latestPatchnotes(): PatchNotes | null {
  return allPatchnotes[0] ?? null;
}

/** The authored notes for an exact `version`, or `null`. */
export function patchnotesFor(version: string): PatchNotes | null {
  const v = version.trim();
  return allPatchnotes.find((n) => n.version === v) ?? null;
}

/**
 * Render {@link PatchNotes} to markdown — used in-app as a fallback and mirrored by
 * `scripts/patchnotes-to-md.mjs` for the release body. `### Category` headings + `-`
 * bullets; item text passes through verbatim (it may contain inline markdown).
 */
export function patchnotesToMarkdown(notes: PatchNotes): string {
  const lines: string[] = [];
  for (const change of notes.changes) {
    lines.push(`### ${categoryLabel(change.category)}`);
    for (const item of change.items) lines.push(`- ${item}`);
    lines.push("");
  }
  return lines.join("\n").trim();
}
