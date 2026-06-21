/** The last path segment (folder name) of a path, for display. */
export function repoName(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

/**
 * The repo a session belongs to for grouping and coloring (#96). A worktree
 * agent (#74) runs in an isolated worktree folder but belongs to its **parent
 * repo**, so it groups and colors with the parent — not its own hashed path.
 */
export function effectiveRepo(session: {
  repoPath: string;
  worktreeParent?: string | null;
}): string {
  return session.worktreeParent ?? session.repoPath;
}

/**
 * Unified session label rule (#67). The **primary** title is the custom name
 * when set, otherwise the branch (or the folder name for a non-git folder); the
 * **subtitle** (the branch / folder name) appears **only when a custom name is
 * set**. Callers pass `branchOrFolder` already resolved — typically
 * `branches[repoPath] || repoName(repoPath)` (the sidebar passes its deduped
 * branch label).
 */
export function sessionLabel(
  name: string | null | undefined,
  branchOrFolder: string,
): { primary: string; subtitle: string | null } {
  const custom = name?.trim() || null;
  return {
    primary: custom || branchOrFolder,
    subtitle: custom ? branchOrFolder : null,
  };
}
