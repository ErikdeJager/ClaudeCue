import { describe, expect, it } from "vitest";

import { terminalsToDispose } from "./poolReconcile";

describe("terminalsToDispose", () => {
  it("returns pooled ids whose session is gone", () => {
    expect(terminalsToDispose(["a", "b", "c"], ["a", "c"])).toEqual(["b"]);
  });

  it("keeps every still-active session (incl. exited-but-listed)", () => {
    expect(terminalsToDispose(["a", "b"], ["a", "b"])).toEqual([]);
  });

  it("disposes nothing when the pool is empty", () => {
    expect(terminalsToDispose([], ["a", "b"])).toEqual([]);
  });

  it("disposes all when no sessions remain", () => {
    expect(terminalsToDispose(["a", "b"], [])).toEqual(["a", "b"]);
  });

  it("ignores active ids that were never pooled", () => {
    expect(terminalsToDispose(["a"], ["a", "b", "c"])).toEqual([]);
  });
});
