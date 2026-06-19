import CanvasSurface from "./CanvasSurface";
import CanvasTabs from "./CanvasTabs";
import styles from "./Canvas.module.css";

/**
 * Canvas (#46/#47/#58): the main-window Canvas view — the tab strip (#58) over the
 * active tab's BSP layout surface (`CanvasSurface`). The surface is shared with the
 * detached canvas window (#84), which renders it without the tab strip. Items drag
 * in from the sidebar via the app-level DndContext (#47); `dragActive` toggles the
 * surface's edge split-zones.
 */
function Canvas({ dragActive }: { dragActive: boolean }) {
  return (
    <div className={styles.canvas}>
      <CanvasTabs />
      <CanvasSurface dragActive={dragActive} />
    </div>
  );
}

export default Canvas;
