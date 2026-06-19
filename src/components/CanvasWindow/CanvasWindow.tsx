import { useEffect } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { useStore } from "../../store";
import { useKeyboardNav } from "../../useKeyboardNav";
import { DETACHED_CANVAS_ID, ownedHere } from "../../windowContext";
import { computeSessionOwners, sessionIdsInLayout } from "../Canvas/canvasTree";
import CanvasSurface from "../Canvas/CanvasSurface";
import { reconcileTerminals } from "../Terminal/terminalPool";
import Toaster from "../Toaster/Toaster";
import styles from "./CanvasWindow.module.css";

/**
 * The detached canvas window (#84): a canvas-only view — the BSP layout surface
 * (shared `CanvasSurface`) under a minimal header showing the tab name, with no
 * sidebar / Overview / tab strip. It runs the same store as the main window
 * (its own instance in this document): `init()` subscribes to the global session
 * events and loads the synced canvases, so its terminal pool renders the same
 * backend PTYs. It owns (renders) the agents in *its* canvas; the main window
 * shows them as "running in a separate window" via the shared ownership map. If
 * its canvas is closed elsewhere, the store self-closes this window.
 */
function CanvasWindow() {
  const init = useStore((s) => s.init);
  const canvases = useStore((s) => s.canvases);
  const detachedCanvasIds = useStore((s) => s.detachedCanvasIds);
  const canvas = canvases.find((c) => c.id === DETACHED_CANVAS_ID);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  useEffect(() => {
    void init();
  }, [init]);

  // Spatial panel nav (#76) works here; new-session / view-toggle / canvas-jump
  // are inert in a canvas-only window (guarded in the hook by window identity).
  useKeyboardNav();

  // Own only the PTYs in this window's canvas (#84) — dispose any others the pool
  // might hold. On re-dock (window closing) the main window recreates them.
  useEffect(() => {
    const owners = computeSessionOwners(canvases, detachedCanvasIds);
    const owned = sessionIdsInLayout(canvas?.layout ?? null).filter((id) =>
      ownedHere(owners, id),
    );
    reconcileTerminals(owned);
  }, [canvases, detachedCanvasIds, canvas]);

  return (
    <div className="app">
      <div className={styles.window}>
        <header className={styles.header}>
          <span className={styles.title}>{canvas?.name ?? "Canvas"}</span>
        </header>
        <div className={styles.body}>
          <DndContext sensors={sensors}>
            <CanvasSurface dragActive={false} />
          </DndContext>
        </div>
      </div>
      <Toaster />
    </div>
  );
}

export default CanvasWindow;
