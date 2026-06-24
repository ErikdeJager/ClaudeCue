//! Markdown Kanban engine (#141): the board model + a pure, lenient,
//! round-trip-stable parse/serialize for the **Obsidian-Kanban** markdown format
//! (the de-facto markdown-board standard). No UI here — rendering is #142 and
//! editing is #143; this is the format + the data the editor writes back via the
//! `write_text_file` backend.
//!
//! Format (non-strict):
//!   - YAML frontmatter `kanban-plugin: board` marks the file as a board.
//!   - Each `## Heading` is a column (status lane), in document order.
//!   - Each `- [ ] Title` / `- [x] Title` checklist item under a column is a card
//!     (checked = done); tab-indented continuation lines are its markdown body.
//!   - A column may carry the Obsidian `**Complete**` marker (the "done" lane).
//!   - A trailing `%% kanban:settings … %%` block (board options) is preserved.
//!
//! A card is deliberately minimal — `{ title, body, checked }`. `body` is raw
//! markdown (tags / dates / links / any formatting the user writes); the engine
//! does NOT model those as structured fields, it preserves them verbatim.

/** A single card — a checklist item plus its raw markdown body. */
export interface Card {
  title: string;
  /** Raw markdown under the card (verbatim, dedented one level). May be empty. */
  body: string;
  /** `- [x]` (done) vs `- [ ]`. */
  checked: boolean;
}

/** A column (status lane) — a `## Heading` and its cards. */
export interface Column {
  name: string;
  /** The Obsidian `**Complete**` "done lane" marker — preserved on round-trip. */
  complete: boolean;
  cards: Card[];
}

/** A parsed board. `frontmatter` / `settingsBlock` are preserved verbatim. */
export interface Board {
  /** The raw YAML frontmatter block incl. its `---` fences, or null if absent. */
  frontmatter: string | null;
  columns: Column[];
  /** The trailing `%% kanban:settings … %%` block (verbatim), or null. */
  settingsBlock: string | null;
}

/** Marker substring identifying the trailing settings block. */
const SETTINGS_MARKER = "%% kanban:settings";

/** `- [ ] title` / `- [x] title` (one optional space after the bracket). */
const CARD_RE = /^- \[([ xX])\] ?(.*)$/;
/** `## Column name`. */
const HEADING_RE = /^##\s+(.+?)\s*$/;

/**
 * Parse Obsidian-Kanban markdown into a {@link Board}. Lenient: content before the
 * first `## heading` is ignored, a `.md` with no headings yields zero columns, and
 * arbitrary markdown in a card body (tags / dates / links) is preserved untouched.
 * Inverts {@link serializeBoard} (round-trip stable).
 */
export function parseBoard(md: string): Board {
  // Normalize line endings so frontmatter / bodies round-trip as LF (repo files).
  const text = md.replace(/\r\n/g, "\n");

  // 1) Frontmatter: a leading `---\n…\n---` block, captured verbatim (no trailing nl).
  let frontmatter: string | null = null;
  let rest = text;
  const fm = rest.match(/^---[ \t]*\n[\s\S]*?\n---[ \t]*(?:\n|$)/);
  if (fm) {
    frontmatter = fm[0].replace(/\n+$/, "");
    rest = rest.slice(fm[0].length);
  }

  // 2) Trailing settings block: everything from the marker to the end, verbatim.
  let settingsBlock: string | null = null;
  const sIdx = rest.indexOf(SETTINGS_MARKER);
  if (sIdx !== -1) {
    settingsBlock = rest.slice(sIdx).replace(/\s+$/, "");
    rest = rest.slice(0, sIdx);
  }

  // 3) Columns + cards.
  const columns: Column[] = [];
  let col: Column | null = null;
  let card: { title: string; bodyLines: string[]; checked: boolean } | null =
    null;

  const flushCard = () => {
    if (col && card) {
      col.cards.push({
        title: card.title,
        body: card.bodyLines.join("\n"),
        checked: card.checked,
      });
    }
    card = null;
  };

  for (const line of rest.split("\n")) {
    const heading = line.match(HEADING_RE);
    if (heading) {
      flushCard();
      col = { name: heading[1] ?? "", complete: false, cards: [] };
      columns.push(col);
      continue;
    }
    if (!col) continue; // ignore anything before the first column heading

    // A tab-indented (or 4-space) continuation line is the current card's body.
    // Checked BEFORE the blank/`**Complete**` tests so a tab-only line (a blank
    // body line) and an indented `**Complete**` stay part of the body.
    if (card && (line.startsWith("\t") || line.startsWith("    "))) {
      card.bodyLines.push(
        line.startsWith("\t") ? line.slice(1) : line.slice(4),
      );
      continue;
    }
    if (line === "**Complete**") {
      flushCard();
      col.complete = true;
      continue;
    }
    const c = line.match(CARD_RE);
    if (c) {
      flushCard(); // commit the previous card; this one is committed on its flush
      card = {
        title: c[2] ?? "",
        bodyLines: [],
        checked: (c[1] ?? " ").toLowerCase() === "x",
      };
      continue;
    }
    // Blank line or unrecognized content ends the current card's body grouping.
    flushCard();
  }
  flushCard();

  return { frontmatter, columns, settingsBlock };
}

/**
 * Serialize a {@link Board} back to Obsidian-Kanban markdown. Deterministic and
 * the inverse of {@link parseBoard}: frontmatter, the `**Complete**` marker, card
 * bodies (re-indented with a tab), and the settings block are reproduced so a
 * parse → serialize round-trip is stable.
 */
export function serializeBoard(board: Board): string {
  const sections: string[] = [];
  if (board.frontmatter) sections.push(board.frontmatter);

  for (const col of board.columns) {
    const lines: string[] = [`## ${col.name}`, ""];
    if (col.complete) lines.push("**Complete**", "");
    for (const card of col.cards) {
      lines.push(`- [${card.checked ? "x" : " "}] ${card.title}`);
      if (card.body) {
        for (const bl of card.body.split("\n")) lines.push(`\t${bl}`);
      }
    }
    sections.push(lines.join("\n"));
  }

  if (board.settingsBlock) sections.push(board.settingsBlock);
  return sections.join("\n\n") + "\n";
}
