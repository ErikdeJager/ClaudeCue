import { describe, expect, it } from "vitest";

import { isWindows, kbdHint, revealLabel } from "./platform";

describe("platform display helpers (#143)", () => {
  it("detects Windows only", () => {
    expect(isWindows("windows")).toBe(true);
    expect(isWindows("macos")).toBe(false);
    // "" (before the boot read resolves) is treated as non-Windows → macOS labels.
    expect(isWindows("")).toBe(false);
  });

  it("revealLabel switches Finder ↔ Explorer", () => {
    expect(revealLabel("windows")).toBe("Reveal in Explorer");
    expect(revealLabel("macos")).toBe("Reveal in Finder");
    expect(revealLabel("")).toBe("Reveal in Finder");
  });

  it("kbdHint picks the platform's string (macOS default before load)", () => {
    expect(kbdHint("windows", "⌘N", "Ctrl+N")).toBe("Ctrl+N");
    expect(kbdHint("macos", "⌘N", "Ctrl+N")).toBe("⌘N");
    expect(kbdHint("", "⌘N", "Ctrl+N")).toBe("⌘N");
  });
});
