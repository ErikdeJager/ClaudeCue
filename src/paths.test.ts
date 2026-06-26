import { describe, expect, it } from "vitest";

import { effectiveRepo, repoName, sessionInFilter, splitPath } from "./paths";

describe("splitPath (#163)", () => {
  it("splits a nested absolute path into parent dir + basename", () => {
    expect(splitPath("/Users/me/notes/todo.md")).toEqual({
      dir: "/Users/me/notes",
      base: "todo.md",
    });
  });

  it("keeps the root for a file directly at the filesystem root", () => {
    expect(splitPath("/readme.md")).toEqual({ dir: "/", base: "readme.md" });
  });

  it("returns an empty dir for a bare filename (no slash)", () => {
    expect(splitPath("todo.md")).toEqual({ dir: "", base: "todo.md" });
  });
});

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

describe("sessionInFilter (#197)", () => {
  const repoAgent = { repoPath: "/work/repo" };
  const wtAgent = {
    repoPath: "/data/worktrees/repo-id/feat",
    worktreeParent: "/work/repo",
  };

  it("shows everything when there is no filter", () => {
    expect(sessionInFilter(repoAgent, null)).toBe(true);
    expect(sessionInFilter(wtAgent, null)).toBe(true);
  });

  it("a repo filter matches the repo's direct agents AND its worktree agents", () => {
    expect(sessionInFilter(repoAgent, "/work/repo")).toBe(true);
    expect(sessionInFilter(wtAgent, "/work/repo")).toBe(true); // effectiveRepo = parent
  });

  it("a worktree-folder filter matches only that worktree's agents", () => {
    expect(sessionInFilter(wtAgent, "/data/worktrees/repo-id/feat")).toBe(true); // repoPath === filter
    expect(sessionInFilter(repoAgent, "/data/worktrees/repo-id/feat")).toBe(
      false,
    );
  });

  it("excludes sessions of an unrelated folder", () => {
    expect(sessionInFilter(repoAgent, "/work/other")).toBe(false);
    expect(sessionInFilter(wtAgent, "/work/other")).toBe(false);
  });
});
