import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  RefreshCw,
} from "lucide-react";

import { type DirEntry, listDir, revealPath } from "../../ipc";
import { useStore } from "../../store";
import styles from "./FileTree.module.css";

/** Right-click menu state: the cursor position + the file the menu targets. */
interface FileMenu {
  x: number;
  y: number;
  file: string;
}

/**
 * A collapsible repo file tree (#167) — a first-class, repo-scoped view rendered in
 * the sidebar, an Overview column, and a Canvas panel (and a Canvas-template block),
 * exactly like the diff panel. It loads **lazily**, one directory level at a time, via
 * the backend `list_dir`: the root loads on mount and each folder fetches its children
 * the first time it's expanded. So the tree supports **arbitrarily deep** structures
 * and **very large repos** without ever walking the whole tree (no count or depth cap)
 * — the same data source as the file picker's `search_files`. Folder expansion state
 * lives in local component state (not persisted; refresh reloads from the root).
 * Clicking a file opens it in the file viewer; right-clicking a file offers Open in
 * file viewer / Open as Kanban board (`.md` only) / Reveal in Finder / Copy absolute
 * path / Copy relative path (#184). Folders have no menu.
 */
function FileTree({ repoPath }: { repoPath: string }) {
  const openFileFromTree = useStore((s) => s.openFileFromTree);
  const copyToClipboard = useStore((s) => s.copyToClipboard);
  // Children keyed by directory path ("" = repo root); a missing key = not yet loaded.
  const [children, setChildren] = useState<Record<string, DirEntry[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<FileMenu | null>(null);
  const [nonce, setNonce] = useState(0);
  // Paths with an in-flight `list_dir` — guards against double-loading on re-render.
  const inFlight = useRef<Set<string>>(new Set());

  // Fetch one directory level (idempotent while a request is in flight).
  const load = useCallback(
    (path: string) => {
      if (inFlight.current.has(path)) return;
      inFlight.current.add(path);
      void listDir(repoPath, path)
        .then((list) => setChildren((prev) => ({ ...prev, [path]: list })))
        .catch(() => setChildren((prev) => ({ ...prev, [path]: [] })))
        .finally(() => inFlight.current.delete(path));
    },
    [repoPath],
  );

  // Reset and reload the root whenever the repo changes or the user refreshes.
  useEffect(() => {
    inFlight.current = new Set();
    setChildren({});
    setExpanded(new Set());
    load("");
  }, [repoPath, nonce, load]);

  // Dismiss the context menu on Escape.
  useEffect(() => {
    if (!menu) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
        if (children[path] === undefined) load(path); // lazy first-open fetch
      }
      return next;
    });
  };

  const openFile = (file: string) =>
    void openFileFromTree(repoPath, file, "markdown");

  const openMenu = (event: ReactMouseEvent, file: string) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu({
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 200)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - 200)),
      file,
    });
  };

  // Render one directory level; recurses into expanded folders. A not-yet-loaded
  // level shows a brief "Loading…" hint, an empty one nothing (root handled below).
  const renderLevel = (path: string, depth: number): ReactNode => {
    const entries = children[path];
    if (entries === undefined) {
      return (
        <p
          className={styles.hint}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
        >
          Loading…
        </p>
      );
    }
    return entries.map((node) => {
      const indent = { paddingLeft: `${8 + depth * 14}px` };
      if (node.is_dir) {
        const isOpen = expanded.has(node.path);
        const Chevron = isOpen ? ChevronDown : ChevronRight;
        const FolderIcon = isOpen ? FolderOpen : Folder;
        return (
          <div key={node.path}>
            <button
              type="button"
              className={styles.row}
              style={indent}
              onClick={() => toggle(node.path)}
              title={node.path}
            >
              <Chevron
                size={13}
                strokeWidth={1.5}
                className={styles.chevron}
                aria-hidden
              />
              <FolderIcon
                size={13}
                strokeWidth={1.5}
                className={styles.folderIcon}
                aria-hidden
              />
              <span className={styles.name}>{node.name}</span>
            </button>
            {isOpen ? renderLevel(node.path, depth + 1) : null}
          </div>
        );
      }
      return (
        <button
          key={node.path}
          type="button"
          className={styles.row}
          style={indent}
          onClick={() => openFile(node.path)}
          onContextMenu={(event) => openMenu(event, node.path)}
          title={node.path}
        >
          <FileText
            size={13}
            strokeWidth={1.5}
            className={styles.fileIcon}
            aria-hidden
          />
          <span className={styles.name}>{node.name}</span>
        </button>
      );
    });
  };

  const root = children[""];

  return (
    <div className={styles.tree}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.refresh}
          onClick={() => setNonce((n) => n + 1)}
          title="Refresh file list"
          aria-label="Refresh file list"
        >
          <RefreshCw size={12} strokeWidth={1.5} />
        </button>
      </div>
      <div className={styles.body}>
        {root === undefined ? (
          <p className={styles.hint}>Loading…</p>
        ) : root.length === 0 ? (
          <p className={styles.hint}>No files in this repo.</p>
        ) : (
          renderLevel("", 0)
        )}
      </div>

      {menu ? (
        <>
          <div
            className={styles.menuOverlay}
            onClick={() => setMenu(null)}
            onContextMenu={(event) => {
              event.preventDefault();
              setMenu(null);
            }}
          />
          <div
            className={styles.menu}
            style={{ left: menu.x, top: menu.y }}
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              className={styles.menuItem}
              onClick={() => {
                openFile(menu.file);
                setMenu(null);
              }}
            >
              Open in file viewer
            </button>
            {menu.file.toLowerCase().endsWith(".md") ? (
              <button
                type="button"
                role="menuitem"
                className={styles.menuItem}
                onClick={() => {
                  void openFileFromTree(repoPath, menu.file, "kanban");
                  setMenu(null);
                }}
              >
                Open as Kanban board
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              className={styles.menuItem}
              onClick={() => {
                void revealPath(`${repoPath}/${menu.file}`);
                setMenu(null);
              }}
            >
              Reveal in Finder
            </button>
            <button
              type="button"
              role="menuitem"
              className={styles.menuItem}
              onClick={() => {
                void copyToClipboard(`${repoPath}/${menu.file}`, "path");
                setMenu(null);
              }}
            >
              Copy absolute path
            </button>
            <button
              type="button"
              role="menuitem"
              className={styles.menuItem}
              onClick={() => {
                void copyToClipboard(menu.file, "path");
                setMenu(null);
              }}
            >
              Copy relative path
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default FileTree;
