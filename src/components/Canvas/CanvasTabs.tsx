import { useState } from "react";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, X } from "lucide-react";

import { useStore } from "../../store";
import type { CanvasTab } from "../../types";
import styles from "./Canvas.module.css";

/**
 * One canvas tab (#58): click to select, double-click to rename inline (Enter
 * commits, Escape cancels, blur commits), × to close. The tab is a dnd-kit
 * sortable item so the strip reorders by dragging — reusing the #43 pattern. A
 * small activation distance keeps the click (select) working.
 */
function Tab({ tab, active }: { tab: CanvasTab; active: boolean }) {
  const selectCanvas = useStore((s) => s.selectCanvas);
  const closeCanvas = useStore((s) => s.closeCanvas);
  const renameCanvas = useStore((s) => s.renameCanvas);

  const [editing, setEditing] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      className={`${styles.tab} ${active ? styles.tabActive : ""} ${isDragging ? styles.tabDragging : ""}`}
      style={style}
      role="tab"
      aria-selected={active}
    >
      {editing ? (
        <input
          className={styles.tabInput}
          autoFocus
          defaultValue={tab.name}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              renameCanvas(tab.id, event.currentTarget.value);
              setEditing(false);
            } else if (event.key === "Escape") {
              event.preventDefault();
              setEditing(false);
            }
          }}
          onBlur={(event) => {
            renameCanvas(tab.id, event.currentTarget.value);
            setEditing(false);
          }}
          aria-label="Rename canvas"
        />
      ) : (
        <button
          type="button"
          className={styles.tabLabel}
          onClick={() => selectCanvas(tab.id)}
          onDoubleClick={() => setEditing(true)}
          title={tab.name}
          {...attributes}
          {...listeners}
        >
          {tab.name}
        </button>
      )}
      <button
        type="button"
        className={styles.tabClose}
        onClick={() => closeCanvas(tab.id)}
        title="Close canvas"
        aria-label={`Close ${tab.name}`}
      >
        <X size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
}

/**
 * Canvas tab strip (#58): one tab per canvas (active highlighted), a "+" to add
 * an empty canvas, drag-to-reorder. Its own nested DndContext (like the Overview
 * sortable #43) so tab drags don't clash with the app-level drag-into-canvas
 * context; only the Canvas view mounts at a time, so targets never overlap.
 */
function CanvasTabs() {
  const canvases = useStore((s) => s.canvases);
  const activeCanvasId = useStore((s) => s.activeCanvasId);
  const addCanvas = useStore((s) => s.addCanvas);
  const reorderCanvases = useStore((s) => s.reorderCanvases);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = canvases.map((c) => c.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    reorderCanvases(arrayMove(ids, oldIndex, newIndex));
  };

  return (
    <div className={styles.tabStrip} role="tablist" aria-label="Canvases">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={canvases.map((c) => c.id)}
          strategy={horizontalListSortingStrategy}
        >
          {canvases.map((c) => (
            <Tab key={c.id} tab={c} active={c.id === activeCanvasId} />
          ))}
        </SortableContext>
      </DndContext>
      <button
        type="button"
        className={styles.tabAdd}
        onClick={addCanvas}
        title="New canvas"
        aria-label="New canvas"
      >
        <Plus size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
}

export default CanvasTabs;
