import { describe, expect, it } from "vitest";

import type { SkillInfo } from "../../types";
import { applyInsertion, detectTrigger, filterSkills } from "./slashCommands";

const skill = (name: string, description = ""): SkillInfo => ({
  name,
  description,
  source: "project",
});

describe("detectTrigger", () => {
  it("triggers on a `/` at the very start of the field", () => {
    expect(detectTrigger("/de", 3)).toEqual({ start: 0, query: "de" });
  });

  it("triggers on a `/` after whitespace (new word)", () => {
    expect(detectTrigger("run /dep", 8)).toEqual({ start: 4, query: "dep" });
  });

  it("triggers on a bare `/` with an empty query", () => {
    expect(detectTrigger("/", 1)).toEqual({ start: 0, query: "" });
  });

  it("does not trigger inside a path", () => {
    expect(detectTrigger("src/foo", 7)).toBeNull();
  });

  it("does not trigger inside a URL", () => {
    expect(detectTrigger("https://x.y", 11)).toBeNull();
  });

  it("does not trigger when a `/` is nested in the token (a path)", () => {
    expect(detectTrigger("/a/b", 4)).toBeNull();
  });

  it("returns null when there is no token at the caret", () => {
    expect(detectTrigger("", 0)).toBeNull();
    expect(detectTrigger("hello", 5)).toBeNull();
  });

  it("uses the caret, not the end of the string, to bound the query", () => {
    // Caret after "de" in "/deep": query is just what precedes the caret.
    expect(detectTrigger("/deep", 3)).toEqual({ start: 0, query: "de" });
  });
});

describe("filterSkills", () => {
  const skills = [
    skill("deep-research", "Fan-out web research"),
    skill("deploy"),
    skill("review", "Review a pull request"),
  ];

  it("returns the whole list for an empty query", () => {
    expect(filterSkills(skills, "")).toHaveLength(3);
  });

  it("matches by name substring, case-insensitively", () => {
    expect(filterSkills(skills, "DE").map((s) => s.name)).toEqual([
      "deep-research",
      "deploy",
    ]);
    expect(filterSkills(skills, "ploy").map((s) => s.name)).toEqual(["deploy"]);
  });

  it("matches by description too", () => {
    expect(filterSkills(skills, "pull").map((s) => s.name)).toEqual(["review"]);
  });

  it("returns nothing when nothing matches", () => {
    expect(filterSkills(skills, "zzz")).toEqual([]);
  });
});

describe("applyInsertion", () => {
  it("replaces the partial token with `/<name> ` and reports the new caret", () => {
    const { value, caret } = applyInsertion("/dee", 4, 0, "deep-research");
    expect(value).toBe("/deep-research ");
    expect(caret).toBe("/deep-research ".length);
  });

  it("preserves text before and after the token", () => {
    // Caret 7 = just after "/dep" in "go /dep now"; the trailing " now" is kept.
    const { value, caret } = applyInsertion("go /dep now", 7, 3, "deploy");
    expect(value).toBe("go /deploy  now");
    // Caret sits just past the inserted "/deploy ".
    expect(caret).toBe(3 + "/deploy ".length);
  });

  it("works from a bare `/`", () => {
    const { value, caret } = applyInsertion("/", 1, 0, "review");
    expect(value).toBe("/review ");
    expect(caret).toBe("/review ".length);
  });
});
