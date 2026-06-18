// Pure helper for the persistent terminal pool, split out so it can be unit
// tested without importing the xterm/DOM-heavy `terminalPool.ts`.

/**
 * Of the currently-pooled terminal ids, which belong to sessions that no longer
 * exist (and so should be disposed). An exited-but-still-listed session stays
 * active here, keeping its terminal and exit overlay.
 */
export function terminalsToDispose(
  pooled: Iterable<string>,
  active: Iterable<string>,
): string[] {
  const keep = new Set(active);
  const stale: string[] = [];
  for (const id of pooled) if (!keep.has(id)) stale.push(id);
  return stale;
}
