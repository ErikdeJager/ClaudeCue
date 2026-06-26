// Render `src/patchnotes/<version>.json` → markdown for the GitHub release body /
// updater `latest.json` notes (#192). Mirrors `patchnotesToMarkdown` in
// `src/patchnotes.ts` (which can't be imported from a plain Node script). Prints the
// markdown to stdout; exits non-zero if the file is missing/unreadable.
//
//   node scripts/patchnotes-to-md.mjs <version>

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CATEGORY_LABELS = {
  feature: "Features",
  fix: "Fixes",
  improvement: "Improvements",
  other: "Other",
};

function categoryLabel(category) {
  const trimmed = String(category ?? "").trim();
  const known = CATEGORY_LABELS[trimmed.toLowerCase()];
  if (known) return known;
  return trimmed ? trimmed[0].toUpperCase() + trimmed.slice(1) : "Other";
}

const version = process.argv[2];
if (!version) {
  console.error("usage: node scripts/patchnotes-to-md.mjs <version>");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = join(root, "src", "patchnotes", `${version}.json`);

let notes;
try {
  notes = JSON.parse(readFileSync(file, "utf8"));
} catch (err) {
  console.error(`Could not read ${file}: ${err.message}`);
  process.exit(1);
}

const lines = [];
for (const change of notes.changes ?? []) {
  const items = (change.items ?? []).filter(
    (i) => typeof i === "string" && i.trim() !== "",
  );
  if (items.length === 0) continue;
  lines.push(`### ${categoryLabel(change.category)}`);
  for (const item of items) lines.push(`- ${item}`);
  lines.push("");
}

process.stdout.write(`${lines.join("\n").trim()}\n`);
