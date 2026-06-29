import { describe, expect, it } from "vitest";

import { resolveDropTarget } from "./osFileDrop";

// A minimal Element stub for the hit-test: `resolveDropTarget` only calls
// `closest(selector)` and `getAttribute(name)`, so we model a single matched chain.
// `attrs` is the element's own attributes; `ancestors` maps a CSS attribute selector
// to the nearest matching element (covering `closest`'s "self or ancestor" semantics).
function stubEl(
  attrs: Record<string, string>,
  ancestors: Record<string, ReturnType<typeof stubEl> | null> = {},
): Element {
  const self = {
    getAttribute: (name: string) => attrs[name] ?? null,
    closest: (selector: string): unknown => {
      // The element matches the selector itself if it has the bracketed attribute.
      const attr = selector.replace(/^\[|\]$/g, "");
      if (attr in attrs) return self;
      return ancestors[selector] ?? null;
    },
  };
  return self as unknown as Element;
}

describe("resolveDropTarget", () => {
  it("returns null for no element", () => {
    expect(resolveDropTarget(null)).toBeNull();
  });

  it("resolves the repo root container (empty dir)", () => {
    const root = stubEl({
      "data-filetree-repo": "/repo",
      "data-filetree-droptarget": "",
    });
    expect(resolveDropTarget(root)).toEqual({ repo: "/repo", dir: "" });
  });

  it("resolves a folder row to its own dir, finding the repo on an ancestor", () => {
    const root = stubEl({
      "data-filetree-repo": "/repo",
      "data-filetree-droptarget": "",
    });
    // A folder row carries the droptarget but not the repo; the repo comes from the
    // ancestor root container.
    const folder = stubEl(
      { "data-filetree-droptarget": "src/utils" },
      {
        "[data-filetree-repo]": root,
      },
    );
    expect(resolveDropTarget(folder)).toEqual({
      repo: "/repo",
      dir: "src/utils",
    });
  });

  it("returns null when there is no droptarget ancestor", () => {
    const loose = stubEl({}, { "[data-filetree-repo]": null });
    expect(resolveDropTarget(loose)).toBeNull();
  });

  it("returns null when a droptarget has no resolvable repo", () => {
    const orphan = stubEl(
      { "data-filetree-droptarget": "src" },
      { "[data-filetree-repo]": null },
    );
    expect(resolveDropTarget(orphan)).toBeNull();
  });
});
