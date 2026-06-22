import { describe, expect, it } from "vitest";

import { moveFolderHighlight } from "./folderNav";

describe("moveFolderHighlight (#123)", () => {
  it("ArrowDown moves through the recents", () => {
    expect(moveFolderHighlight({ index: 0, picker: false }, 3, "down")).toEqual(
      {
        index: 1,
        picker: false,
      },
    );
  });

  it("ArrowDown on the last recent lands on the picker", () => {
    expect(moveFolderHighlight({ index: 2, picker: false }, 3, "down")).toEqual(
      {
        index: -1,
        picker: true,
      },
    );
  });

  it("ArrowDown stays on the picker (nothing below it)", () => {
    expect(moveFolderHighlight({ index: -1, picker: true }, 3, "down")).toEqual(
      { index: -1, picker: true },
    );
  });

  it("ArrowUp from the picker returns to the last recent", () => {
    expect(moveFolderHighlight({ index: -1, picker: true }, 3, "up")).toEqual({
      index: 2,
      picker: false,
    });
  });

  it("ArrowUp through the recents is clamped at 0", () => {
    expect(moveFolderHighlight({ index: 1, picker: false }, 3, "up")).toEqual({
      index: 0,
      picker: false,
    });
    expect(moveFolderHighlight({ index: 0, picker: false }, 3, "up")).toEqual({
      index: 0,
      picker: false,
    });
  });

  it("from no highlight, ArrowDown selects the first recent", () => {
    expect(
      moveFolderHighlight({ index: -1, picker: false }, 3, "down"),
    ).toEqual({ index: 0, picker: false });
  });

  it("filtered-to-empty: ArrowDown reaches the picker, ArrowUp stays there", () => {
    expect(
      moveFolderHighlight({ index: -1, picker: false }, 0, "down"),
    ).toEqual({ index: -1, picker: true });
    expect(moveFolderHighlight({ index: -1, picker: true }, 0, "up")).toEqual({
      index: -1,
      picker: true,
    });
  });
});
