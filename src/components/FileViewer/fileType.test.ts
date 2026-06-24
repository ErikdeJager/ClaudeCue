import { describe, expect, it } from "vitest";

import { detectMode, fileExt, prismLang } from "./fileType";

describe("file type detection (#44)", () => {
  it("treats markdown as render mode", () => {
    expect(detectMode("README.md")).toBe("markdown");
    expect(detectMode("docs/PLAN.markdown")).toBe("markdown");
  });

  it("treats curated code extensions as code with a Prism language", () => {
    expect(detectMode("src/main.rs")).toBe("code");
    expect(prismLang("src/main.rs")).toBe("rust");
    expect(prismLang("a/b/App.tsx")).toBe("tsx");
    expect(prismLang("x.py")).toBe("python");
    expect(prismLang("Cargo.toml")).toBe("toml");
  });

  it("highlights Java + config formats (#150)", () => {
    expect(detectMode("src/Main.java")).toBe("code");
    expect(prismLang("src/Main.java")).toBe("java");
    expect(prismLang("settings.ini")).toBe("ini");
    expect(prismLang("app.cfg")).toBe("ini");
    expect(prismLang("nginx.conf")).toBe("ini");
    expect(prismLang("gradle.properties")).toBe("properties");
  });

  it("highlights .env dotfiles by filename (no extension) (#150)", () => {
    expect(detectMode(".env")).toBe("code");
    expect(prismLang(".env")).toBe("properties");
    expect(prismLang("project/.env.local")).toBe("properties");
    expect(prismLang(".env.production")).toBe("properties");
    // A normal dotfile is still plain text, not a config grammar.
    expect(prismLang(".gitignore")).toBeUndefined();
  });

  it("treats unknown / plain files as raw text", () => {
    expect(detectMode("notes.txt")).toBe("text");
    expect(detectMode("LICENSE")).toBe("text");
    expect(detectMode("data.unknownext")).toBe("text");
    expect(prismLang("notes.txt")).toBeUndefined();
  });

  it("extracts the extension case-insensitively, ignoring dotfiles", () => {
    expect(fileExt("Main.RS")).toBe("rs");
    expect(fileExt("a/b/c.test.ts")).toBe("ts");
    expect(fileExt(".gitignore")).toBe("");
    expect(fileExt("Makefile")).toBe("");
  });
});
