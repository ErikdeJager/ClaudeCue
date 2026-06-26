import { describe, expect, it, vi } from "vitest";

import { emitSessionOutput, onSessionOutput } from "./outputBus";

const bytes = (s: string) => new TextEncoder().encode(s);

describe("outputBus pub/sub", () => {
  it("delivers an emitted chunk to a subscriber", () => {
    const seen: string[] = [];
    const off = onSessionOutput("s1", (b) =>
      seen.push(new TextDecoder().decode(b)),
    );
    emitSessionOutput("s1", bytes("hello"));
    off();
    expect(seen).toEqual(["hello"]);
  });

  it("fans a chunk out to every subscriber of the same id", () => {
    const a = vi.fn();
    const b = vi.fn();
    const offA = onSessionOutput("s2", a);
    const offB = onSessionOutput("s2", b);
    const chunk = bytes("x");
    emitSessionOutput("s2", chunk);
    offA();
    offB();
    expect(a).toHaveBeenCalledWith(chunk);
    expect(b).toHaveBeenCalledWith(chunk);
  });

  it("stops delivering after unsubscribe", () => {
    const listener = vi.fn();
    const off = onSessionOutput("s3", listener);
    emitSessionOutput("s3", bytes("1"));
    off();
    emitSessionOutput("s3", bytes("2"));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("isolates sessions — a chunk only reaches that id's listeners", () => {
    const one = vi.fn();
    const two = vi.fn();
    const off1 = onSessionOutput("a", one);
    const off2 = onSessionOutput("b", two);
    emitSessionOutput("a", bytes("only-a"));
    off1();
    off2();
    expect(one).toHaveBeenCalledTimes(1);
    expect(two).not.toHaveBeenCalled();
  });

  it("emitting to an id with no subscribers is a no-op", () => {
    expect(() => emitSessionOutput("nobody", bytes("z"))).not.toThrow();
  });
});
