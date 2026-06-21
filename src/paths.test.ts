import { describe, expect, it } from "vitest";

import { effectiveRepo, repoName } from "./paths";

describe("repoName", () => {
  it("returns the last path segment", () => {
    expect(repoName("/Users/me/code/claudecue")).toBe("claudecue");
  });

  it("ignores a trailing slash", () => {
    expect(repoName("/Users/me/code/claudecue/")).toBe("claudecue");
  });

  it("falls back to the input for a root-ish path", () => {
    expect(repoName("/")).toBe("/");
  });
});

describe("effectiveRepo (#96)", () => {
  it("uses the repo path for a normal agent", () => {
    expect(effectiveRepo({ repoPath: "/Users/me/code/repo" })).toBe(
      "/Users/me/code/repo",
    );
  });

  it("uses the parent repo for a worktree agent", () => {
    expect(
      effectiveRepo({
        repoPath: "/data/worktrees/repo-id/feature",
        worktreeParent: "/Users/me/code/repo",
      }),
    ).toBe("/Users/me/code/repo");
  });

  it("ignores a null worktreeParent", () => {
    expect(
      effectiveRepo({ repoPath: "/Users/me/code/repo", worktreeParent: null }),
    ).toBe("/Users/me/code/repo");
  });
});
