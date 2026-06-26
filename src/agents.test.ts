import { describe, expect, it } from "vitest";

import { agentCaps, agentSupportsResume, SELECTABLE_AGENTS } from "./agents";

describe("agent capability mirror (#142)", () => {
  it("claude resumes and auto-names", () => {
    expect(agentSupportsResume("claude")).toBe(true);
    expect(agentCaps("claude").supportsAutoName).toBe(true);
  });

  it("codex does not resume or auto-name", () => {
    expect(agentSupportsResume("codex")).toBe(false);
    expect(agentCaps("codex").supportsAutoName).toBe(false);
  });

  it("an unknown / null / empty agent falls back to Claude (matches agent_spec)", () => {
    expect(agentCaps("nope").id).toBe("claude");
    expect(agentCaps(null).id).toBe("claude");
    expect(agentCaps(undefined).id).toBe("claude");
    expect(agentCaps("").id).toBe("claude");
  });

  it("offers claude + codex as the selectable agents, in order", () => {
    expect(SELECTABLE_AGENTS.map((a) => a.id)).toEqual(["claude", "codex"]);
  });
});
