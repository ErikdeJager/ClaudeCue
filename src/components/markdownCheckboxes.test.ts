import type { Element, Root } from "hast";
import { describe, expect, it } from "vitest";

import {
  isExternalHref,
  rehypeTaskListPositions,
  toggleTaskMarker,
} from "./markdownCheckboxes";

describe("toggleTaskMarker (#173)", () => {
  // Self-contained slices (the whole string is the list item) → offsets [0, len].
  const flip = (s: string) => toggleTaskMarker(s, 0, s.length);

  it("flips [ ] → [x]", () => {
    expect(flip("- [ ] task")).toBe("- [x] task");
  });

  it("flips [x] → [ ]", () => {
    expect(flip("- [x] done")).toBe("- [ ] done");
  });

  it("flips an uppercase [X] → [ ]", () => {
    expect(flip("- [X] done")).toBe("- [ ] done");
  });

  it("handles other bullet markers (* / +)", () => {
    expect(flip("* [ ] a")).toBe("* [x] a");
    expect(flip("+ [x] b")).toBe("+ [ ] b");
  });

  it("handles ordered-list markers (1. / 1))", () => {
    expect(flip("1. [ ] first")).toBe("1. [x] first");
    expect(flip("2) [x] second")).toBe("2) [ ] second");
  });

  it("handles an indented / nested item (leading whitespace)", () => {
    expect(flip("  - [ ] child")).toBe("  - [x] child");
    expect(flip("\t- [x] deep")).toBe("\t- [ ] deep");
  });

  it("flips the marker, not a trailing [link](url) or inline code", () => {
    expect(flip("- [ ] see [link](url) `[x]`")).toBe(
      "- [x] see [link](url) `[x]`",
    );
  });

  it("uses absolute offsets within a larger source", () => {
    const source = "## Col\n\n- [ ] task\n";
    const start = source.indexOf("- [ ] task");
    const end = start + "- [ ] task".length;
    expect(toggleTaskMarker(source, start, end)).toBe("## Col\n\n- [x] task\n");
  });

  it("returns null for a non-task slice", () => {
    expect(flip("- plain item")).toBeNull();
    expect(flip("just some text")).toBeNull();
    // A `[ ]`-looking string that isn't a list item (no bullet/number marker).
    expect(flip("[ ] orphan")).toBeNull();
  });
});

describe("isExternalHref (#182)", () => {
  it("is true for http(s) URLs (any case)", () => {
    expect(isExternalHref("https://example.com")).toBe(true);
    expect(isExternalHref("http://example.com/path?q=1")).toBe(true);
    expect(isExternalHref("HTTPS://Example.com")).toBe(true);
  });

  it("is false for non-http(s) hrefs (neutralized, no nav)", () => {
    expect(isExternalHref("./rel.md")).toBe(false);
    expect(isExternalHref("../up.md")).toBe(false);
    expect(isExternalHref("mailto:a@b.com")).toBe(false);
    expect(isExternalHref("tel:123")).toBe(false);
    expect(isExternalHref("#anchor")).toBe(false);
    expect(isExternalHref("ftp://example.com")).toBe(false);
  });

  it("is false for empty / undefined href", () => {
    expect(isExternalHref("")).toBe(false);
    expect(isExternalHref(undefined)).toBe(false);
  });
});

describe("rehypeTaskListPositions (#173)", () => {
  /** A minimal hast tree: ul > li(position) > (input.checkbox + text). */
  function tree(): Root {
    return {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "ul",
          properties: {},
          children: [
            {
              type: "element",
              tagName: "li",
              properties: {},
              position: {
                start: { line: 1, column: 1, offset: 8 },
                end: { line: 1, column: 11, offset: 18 },
              },
              children: [
                {
                  type: "element",
                  tagName: "input",
                  properties: { type: "checkbox", checked: false },
                  children: [],
                },
                { type: "text", value: " task" },
              ],
            },
          ],
        },
      ],
    };
  }

  const inputOf = (root: Root): Element =>
    ((root.children[0] as Element).children[0] as Element)
      .children[0] as Element;

  it("stamps the nearest li's source offsets onto the checkbox input", () => {
    const root = tree();
    rehypeTaskListPositions()(root);
    expect(inputOf(root).properties).toMatchObject({
      dataSrcStart: 8,
      dataSrcEnd: 18,
    });
  });

  it("leaves non-checkbox inputs untouched", () => {
    const root = tree();
    inputOf(root).properties!.type = "text";
    rehypeTaskListPositions()(root);
    expect(inputOf(root).properties?.dataSrcStart).toBeUndefined();
  });
});
