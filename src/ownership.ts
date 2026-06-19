// Terminal ownership across windows (#84). A live PTY renders in exactly one
// window; `computeSessionOwners` decides which from the synced canvases + the set
// of detached canvas windows. This hook memoizes that map and re-derives it only
// when those inputs change, so Overview cards and Canvas panels can cheaply ask
// "do I render this session, or show an 'open in another window' note?".

import { useMemo } from "react";

import { computeSessionOwners } from "./components/Canvas/canvasTree";
import { useStore } from "./store";

/** The session → owning-window-label map for the current synced state (#84). */
export function useSessionOwners(): Record<string, string> {
  const canvases = useStore((s) => s.canvases);
  const detachedCanvasIds = useStore((s) => s.detachedCanvasIds);
  return useMemo(
    () => computeSessionOwners(canvases, detachedCanvasIds),
    [canvases, detachedCanvasIds],
  );
}
