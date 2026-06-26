import { describe, expect, it } from "vitest";

import { type Board, parseBoard, serializeBoard } from "./kanban";

const FM = "---\n\nkanban-plugin: board\n\n---";
const SETTINGS = '%% kanban:settings\n```\n{"kanban-plugin":"board"}\n```\n%%';

describe("kanban parseBoard / serializeBoard (#141)", () => {
  it("parses an empty string as an empty board (no columns)", () => {
    expect(parseBoard("")).toEqual({
      frontmatter: null,
      columns: [],
      settingsBlock: null,
    });
  });

  it("parses frontmatter + columns + cards", () => {
    const md = `${FM}\n\n## To Do\n\n- [ ] First\n- [ ] Second\n\n## Done\n\n**Complete**\n\n- [x] Shipped\n`;
    const board = parseBoard(md);
    expect(board.frontmatter).toBe(FM);
    expect(board.columns.map((c) => c.name)).toEqual(["To Do", "Done"]);
    expect(board.columns[0]?.complete).toBe(false);
    expect(board.columns[0]?.cards).toEqual([
      { title: "First", body: "", checked: false },
      { title: "Second", body: "", checked: false },
    ]);
    expect(board.columns[1]?.complete).toBe(true);
    expect(board.columns[1]?.cards).toEqual([
      { title: "Shipped", body: "", checked: true },
    ]);
  });

  it("parses a column with no cards", () => {
    const board = parseBoard("## Empty\n\n## Has\n\n- [ ] x\n");
    expect(board.columns[0]).toEqual({
      name: "Empty",
      complete: false,
      cards: [],
    });
    expect(board.columns[1]?.cards).toHaveLength(1);
  });

  it("preserves a multi-line card body (incl. blank lines) verbatim", () => {
    const md =
      "## Notes\n\n- [ ] Has body\n\tline one\n\t#tag and a [[link]]\n\t\n\tlast paragraph\n";
    const board = parseBoard(md);
    expect(board.columns[0]?.cards[0]).toEqual({
      title: "Has body",
      body: "line one\n#tag and a [[link]]\n\nlast paragraph",
      checked: false,
    });
  });

  it("distinguishes checked from unchecked", () => {
    const board = parseBoard(
      "## C\n\n- [ ] open\n- [x] done\n- [X] also done\n",
    );
    expect(board.columns[0]?.cards.map((c) => c.checked)).toEqual([
      false,
      true,
      true,
    ]);
  });

  it("preserves the trailing settings block verbatim", () => {
    const md = `${FM}\n\n## To Do\n\n- [ ] a\n\n${SETTINGS}\n`;
    const board = parseBoard(md);
    expect(board.settingsBlock).toBe(SETTINGS);
    // The settings marker is NOT mistaken for a card/column.
    expect(board.columns).toHaveLength(1);
    expect(board.columns[0]?.cards).toEqual([
      { title: "a", body: "", checked: false },
    ]);
  });

  it("ignores content before the first heading (lenient)", () => {
    const board = parseBoard("some intro text\n\n## Real\n\n- [ ] c\n");
    expect(board.columns).toHaveLength(1);
    expect(board.columns[0]?.name).toBe("Real");
  });

  it("normalizes CRLF line endings", () => {
    const board = parseBoard("## C\r\n\r\n- [ ] a\r\n\tbody\r\n");
    expect(board.columns[0]?.cards[0]).toEqual({
      title: "a",
      body: "body",
      checked: false,
    });
  });

  it("round-trips a realistic board: parse∘serialize is idempotent", () => {
    const md = serializeBoard({
      frontmatter: FM,
      columns: [
        {
          name: "To Do",
          complete: false,
          cards: [
            { title: "First", body: "", checked: false },
            {
              title: "With body",
              body: "details #tag @{2026-06-24}\n\nmore",
              checked: false,
            },
          ],
        },
        { name: "Doing", complete: false, cards: [] },
        {
          name: "Done",
          complete: true,
          cards: [{ title: "Shipped", body: "", checked: true }],
        },
      ],
      settingsBlock: SETTINGS,
    });
    // serialize(parse(x)) === x for canonical output (text is a fixed point).
    expect(serializeBoard(parseBoard(md))).toBe(md);
  });

  it("parse(serialize(board)) deep-equals the original model", () => {
    const board: Board = {
      frontmatter: FM,
      columns: [
        {
          name: "Backlog",
          complete: false,
          cards: [
            { title: "Plain", body: "", checked: false },
            { title: "", body: "", checked: false }, // empty-title card
            { title: "Multi", body: "a\nb\n\nc", checked: true },
          ],
        },
        { name: "Empty col", complete: false, cards: [] },
        {
          name: "Complete lane",
          complete: true,
          cards: [{ title: "x", body: "", checked: true }],
        },
      ],
      settingsBlock: SETTINGS,
    };
    expect(parseBoard(serializeBoard(board))).toEqual(board);
  });

  it("parses a plain `- bullet` as a no-checkbox card (#194)", () => {
    const board = parseBoard(
      "## C\n\n- plain bullet\n- [ ] open\n- [x] done\n",
    );
    expect(board.columns[0]?.cards).toEqual([
      { title: "plain bullet", body: "", checked: null },
      { title: "open", body: "", checked: false },
      { title: "done", body: "", checked: true },
    ]);
  });

  it("keeps a plain bullet's indented body (#194)", () => {
    const board = parseBoard("## C\n\n- plain\n\tbody line\n\t#tag\n");
    expect(board.columns[0]?.cards[0]).toEqual({
      title: "plain",
      body: "body line\n#tag",
      checked: null,
    });
  });

  it("round-trips plain bullets byte-for-byte, mixed with checkbox cards (#194)", () => {
    // `- title` ⇄ {checked:null}; alongside `- [ ]`/`- [x]`, with bodies and a bare
    // `- ` empty-title bullet — the serialized text must be a fixed point.
    const md =
      "## C\n\n- plain\n- [ ] open\n- [x] done\n- with body\n\tdetails #tag\n- \n";
    expect(serializeBoard(parseBoard(md))).toBe(md);
    // And the model is exactly what we expect.
    expect(parseBoard(md).columns[0]?.cards).toEqual([
      { title: "plain", body: "", checked: null },
      { title: "open", body: "", checked: false },
      { title: "done", body: "", checked: true },
      { title: "with body", body: "details #tag", checked: null },
      { title: "", body: "", checked: null }, // bare `- ` → empty plain card
    ]);
  });

  it("model with null-checked cards round-trips deep-equal (#194)", () => {
    const board: Board = {
      frontmatter: FM,
      columns: [
        {
          name: "Mixed",
          complete: false,
          cards: [
            { title: "plain", body: "", checked: null },
            { title: "open", body: "x\ny", checked: false },
            { title: "done", body: "", checked: true },
          ],
        },
      ],
      settingsBlock: null,
    };
    expect(parseBoard(serializeBoard(board))).toEqual(board);
  });

  it("serializes a board with no frontmatter or settings block", () => {
    const md = serializeBoard({
      frontmatter: null,
      columns: [
        {
          name: "Only",
          complete: false,
          cards: [{ title: "c", body: "", checked: false }],
        },
      ],
      settingsBlock: null,
    });
    expect(md).toBe("## Only\n\n- [ ] c\n");
    expect(serializeBoard(parseBoard(md))).toBe(md);
  });
});
