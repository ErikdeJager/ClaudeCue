// Pure file-type detection for the universal viewer (#44). Kept dependency-free
// (no Prism import) so it's cheap to unit-test and import.

export type ViewerMode = "markdown" | "code" | "text";

/**
 * File extension → Prism language id (curated set). Only these languages are
 * bundled (see `prism.ts`); anything else falls back to plain text, keeping the
 * bundle small. Markdown is handled as a render mode, not via this map.
 */
const LANG_BY_EXT: Record<string, string> = {
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  tsx: "tsx",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "jsx",
  rs: "rust",
  py: "python",
  json: "json",
  jsonc: "json",
  css: "css",
  scss: "css",
  html: "markup",
  htm: "markup",
  xml: "markup",
  svg: "markup",
  vue: "markup",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  toml: "toml",
  yaml: "yaml",
  yml: "yaml",
};

/** Lowercase extension of a path, or "" for none (dotfiles count as none). */
export function fileExt(file: string): string {
  const base = file.split("/").pop() ?? file;
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

/** How the viewer should render a file: rendered markdown, highlighted code, or raw text. */
export function detectMode(file: string): ViewerMode {
  const ext = fileExt(file);
  if (ext === "md" || ext === "markdown") return "markdown";
  return ext in LANG_BY_EXT ? "code" : "text";
}

/** The Prism language for a code file, or undefined when it isn't curated code. */
export function prismLang(file: string): string | undefined {
  return LANG_BY_EXT[fileExt(file)];
}
