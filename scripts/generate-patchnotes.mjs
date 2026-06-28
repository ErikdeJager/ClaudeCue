// Generate `src/patchnotes/<version>.json` for the CURRENT app version by asking
// Claude to summarize everything that changed since the previous release tag into a
// user-facing changelog (features / fixes / improvements / other). Run by the release
// pipeline BEFORE the build so the notes are baked into the new image (the FileViewer/
// Updates pane globs `src/patchnotes/*.json` at build time) and committed back so the
// accumulated history is available to future builds. Mirrors the JSON shape consumed by
// `src/patchnotes.ts` + `scripts/patchnotes-to-md.mjs`.
//
//   ANTHROPIC_API_KEY=... node scripts/generate-patchnotes.mjs
//
// Behavior:
//   - The version is read from src-tauri/tauri.conf.json (so it always matches the
//     release gate); the date is today (UTC).
//   - If src/patchnotes/<version>.json already exists it is LEFT UNTOUCHED — a
//     hand-authored file always wins, and re-runs are idempotent.
//   - Only the `changes` are model-generated; `version`/`date` are set here.
//   - Exits non-zero on any failure (no notes file is half-written) so the pipeline
//     fails loudly rather than shipping a release with empty notes.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const version = JSON.parse(
  readFileSync(join(root, "src-tauri", "tauri.conf.json"), "utf8"),
).version;
const outFile = join(root, "src", "patchnotes", `${version}.json`);

if (existsSync(outFile)) {
  console.log(
    `Patch notes for v${version} already exist (${outFile}) — leaving as-is.`,
  );
  process.exit(0);
}

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

// The previous release = the latest v* tag. None yet → summarize the whole history.
let lastTag = "";
try {
  lastTag =
    git(["tag", "-l", "v*", "--sort=-version:refname"])
      .split("\n")
      .filter(Boolean)[0] ?? "";
} catch {
  lastTag = "";
}
const range = lastTag ? `${lastTag}..HEAD` : "HEAD";

const logArgs = ["log", "--no-merges", "-n", "300", "--pretty=format:- %s"];
if (lastTag) logArgs.push(range);
const commits = git(logArgs);

let diffstat = "";
try {
  const statArgs = ["diff", "--stat"];
  if (lastTag) statArgs.push(range);
  diffstat = git(statArgs);
} catch {
  diffstat = "";
}

if (!commits.trim()) {
  console.error(
    `No commits found since ${lastTag || "the beginning"} — nothing to summarize.`,
  );
  process.exit(1);
}

// Bound the context so a huge release can't blow the request size.
const MAX_CONTEXT = 24000;
const context =
  `Changes since ${lastTag || "the start of the project"} (release v${version}):\n\n` +
  `Commit messages:\n${commits}\n\nFiles changed:\n${diffstat}`;
const boundedContext =
  context.length > MAX_CONTEXT ? `${context.slice(0, MAX_CONTEXT)}\n…(truncated)` : context;

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("ANTHROPIC_API_KEY is not set — cannot generate patch notes.");
  process.exit(1);
}

// Schema-constrained output: only the grouped change list. version/date are set here.
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    changes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: {
            type: "string",
            enum: ["feature", "fix", "improvement", "other"],
          },
          items: { type: "array", items: { type: "string" } },
        },
        required: ["category", "items"],
      },
    },
  },
  required: ["changes"],
};

const SYSTEM = `You write concise, user-facing release notes for ReCue — a macOS and Windows desktop app for running and managing many live Claude CLI coding sessions side by side (an Overview "agent wall", a Canvas split-panel workspace, a repo-grouped sidebar).

You are given the commit messages and changed files since the previous release. Summarize them into a changelog grouped by category:
- "feature" — brand-new user-facing capabilities
- "fix" — bug fixes
- "improvement" — enhancements to existing features
- "other" — anything else user-visible that doesn't fit above

Rules:
- Write for end users, not developers. Describe what changed and why it matters — never mention commit hashes, file paths, internal symbols, or task numbers.
- One sentence per item; clear and specific.
- Omit categories with no items (do not emit empty groups).
- Skip purely internal changes (CI, refactors, tests, dependency bumps, docs) unless they are user-visible.
- If several commits are part of one feature, merge them into a single item.
- Order categories feature, fix, improvement, other; most impactful items first.
- Output ONLY the JSON object matching the schema — no prose, no markdown fences.`;

const client = new Anthropic({ apiKey });

const response = await client.messages.create({
  model: "claude-opus-4-8",
  max_tokens: 4000,
  system: SYSTEM,
  output_config: { format: { type: "json_schema", schema: SCHEMA } },
  messages: [
    {
      role: "user",
      content: `Produce the release notes JSON for v${version} from these changes:\n\n${boundedContext}`,
    },
  ],
});

if (response.stop_reason === "refusal") {
  console.error("Model refused to generate patch notes.");
  process.exit(1);
}

const text = response.content
  .filter((b) => b.type === "text")
  .map((b) => b.text)
  .join("")
  .trim();

function parseChanges(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    // Tolerate stray prose/fences: extract the outermost JSON object.
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
    throw new Error("model output was not valid JSON");
  }
}

let parsed;
try {
  parsed = parseChanges(text);
} catch (err) {
  console.error(`Could not parse model output: ${err.message}\n---\n${text}`);
  process.exit(1);
}

const changes = Array.isArray(parsed.changes)
  ? parsed.changes.filter(
      (c) =>
        c &&
        typeof c.category === "string" &&
        Array.isArray(c.items) &&
        c.items.some((i) => typeof i === "string" && i.trim() !== ""),
    )
  : [];

if (changes.length === 0) {
  console.error("Model produced no usable change groups.");
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const notes = { version, date: today, changes };

writeFileSync(outFile, `${JSON.stringify(notes, null, 2)}\n`);
console.log(`Wrote ${outFile}:`);
console.log(JSON.stringify(notes, null, 2));
