import { describe, expect, it } from "vitest";

import { diffNavDelta } from "./diffNav";

describe("diffNavDelta (#255)", () => {
  it("focused mode steps with Left/Right and leaves Up/Down for body scroll", () => {
    expect(diffNavDelta("ArrowLeft", "focused")).toBe(-1);
    expect(diffNavDelta("ArrowRight", "focused")).toBe(1);
    expect(diffNavDelta("ArrowUp", "focused")).toBeNull();
    expect(diffNavDelta("ArrowDown", "focused")).toBeNull();
  });

  it("accordion mode steps with Up/Down (vertical list)", () => {
    expect(diffNavDelta("ArrowUp", "accordion")).toBe(-1);
    expect(diffNavDelta("ArrowDown", "accordion")).toBe(1);
    expect(diffNavDelta("ArrowLeft", "accordion")).toBeNull();
    expect(diffNavDelta("ArrowRight", "accordion")).toBeNull();
  });

  it("ignores non-arrow keys in both modes", () => {
    for (const mode of ["focused", "accordion"] as const) {
      expect(diffNavDelta("Enter", mode)).toBeNull();
      expect(diffNavDelta("a", mode)).toBeNull();
      expect(diffNavDelta("PageDown", mode)).toBeNull();
      expect(diffNavDelta(" ", mode)).toBeNull();
    }
  });
});
