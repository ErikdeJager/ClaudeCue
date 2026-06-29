// OS file-drop into the FileTree (#253). Tauri's webview drag-drop event is
// window-global (not bound to a DOM element), so we hit-test the cursor position
// against the rendered tree to find which folder/root a drop would enter, highlight
// it while dragging, and move the dropped OS paths into that directory on drop.
//
// `resolveDropTarget` is the pure hit-test (DOM-only, no store) and is unit-tested;
// `useOsFileDrop` is the per-window listener wired from both the main shell and a
// detached canvas window (each is its own webview/document, #84).

import { getCurrentWebview } from "@tauri-apps/api/webview";
import { useEffect } from "react";

import { useStore } from "./store";

/**
 * Resolve a DOM element (from `document.elementFromPoint`) to the FileTree directory a
 * drop would enter: walk up to the nearest `[data-filetree-droptarget]` (its value is
 * the repo-relative dir, `""` = root) and the enclosing `[data-filetree-repo]` (the
 * repo path). Returns null when the point isn't inside any FileTree. Pure — the only
 * DOM it touches is `closest`/`getAttribute` on the passed element, so it's testable
 * with a lightweight element stub.
 */
export function resolveDropTarget(
  el: Element | null,
): { repo: string; dir: string } | null {
  if (!el) return null;
  const dropEl = el.closest("[data-filetree-droptarget]");
  if (!dropEl) return null;
  const repoEl = el.closest("[data-filetree-repo]");
  const repo = repoEl?.getAttribute("data-filetree-repo");
  if (!repo) return null;
  return { repo, dir: dropEl.getAttribute("data-filetree-droptarget") ?? "" };
}

/**
 * Subscribe this window's webview to OS file drag-drop events (#253). On `enter`/`over`
 * it hit-tests the cursor (physical → CSS pixels via `devicePixelRatio`, correct under
 * Retina and Windows fractional scaling) and sets the drop-target highlight; on `drop`
 * it moves the dropped paths into the resolved directory; on `leave` it clears the
 * highlight. A drop outside any FileTree is ignored. No-op outside Tauri.
 */
export function useOsFileDrop(): void {
  const setFileDropTarget = useStore((s) => s.setFileDropTarget);
  const moveFilesIntoRepo = useStore((s) => s.moveFilesIntoRepo);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;

    const targetAt = (x: number, y: number) => {
      const dpr = window.devicePixelRatio || 1;
      return resolveDropTarget(document.elementFromPoint(x / dpr, y / dpr));
    };

    void getCurrentWebview()
      .onDragDropEvent((event) => {
        const p = event.payload;
        if (p.type === "leave") {
          setFileDropTarget(null);
          return;
        }
        if (p.type === "enter" || p.type === "over") {
          setFileDropTarget(targetAt(p.position.x, p.position.y));
          return;
        }
        if (p.type === "drop") {
          const target = targetAt(p.position.x, p.position.y);
          setFileDropTarget(null);
          if (target && p.paths.length > 0) {
            void moveFilesIntoRepo(target.repo, target.dir, p.paths);
          }
        }
      })
      .then((fn) => {
        if (disposed) fn();
        else unlisten = fn;
      })
      .catch(() => {
        // Outside Tauri / no webview — OS file drop is unavailable; ignore.
      });

    return () => {
      disposed = true;
      setFileDropTarget(null);
      unlisten?.();
    };
  }, [setFileDropTarget, moveFilesIntoRepo]);
}
