import { useState } from "react";
import {
  FileDiff,
  FileText,
  FolderTree,
  Plus,
  SquareKanban,
  Terminal as TerminalIcon,
} from "lucide-react";

import { useStore } from "../../store";
import FilePicker from "../FilePicker/FilePicker";
import styles from "./ViewsMenu.module.css";

/**
 * The addable non-agent **view set** (#82), extracted (#164) into one shared
 * component so the Sidebar repo context menu and the worktree-badge popover render
 * the **same** actions against any folder — no duplicated action set. Each action
 * registers an `overviewPanels[repoPath]` entry (a left-panel row + Overview column,
 * #59/#152) without forcing a main-view switch (#79). **File viewer** / **Kanban
 * board** open a searchable `FilePicker` (#56) inline — Kanban scoped to `.md` with
 * the create-or-open flow (#142/#151). `onClose` dismisses the host popover/menu.
 */
function ViewsMenu({
  repoPath,
  onClose,
}: {
  repoPath: string;
  onClose: () => void;
}) {
  const addOverviewPanel = useStore((s) => s.addOverviewPanel);
  const createKanbanBoard = useStore((s) => s.createKanbanBoard);
  const spawnSession = useStore((s) => s.spawnSession);
  const [mode, setMode] = useState<"menu" | "files">("menu");
  const [fileKind, setFileKind] = useState<"markdown" | "kanban">("markdown");

  if (mode === "files") {
    // Kanban is scoped to `.md` (#142); the same picker creates a new board (#151).
    return (
      <FilePicker
        repoPath={repoPath}
        ext={fileKind === "kanban" ? ".md" : undefined}
        onPick={(f) => {
          void addOverviewPanel(repoPath, fileKind, f);
          onClose();
        }}
        onCreate={
          fileKind === "kanban"
            ? (name) => {
                void createKanbanBoard(repoPath, name);
                onClose();
              }
            : undefined
        }
        createSuffix={fileKind === "kanban" ? ".md" : undefined}
      />
    );
  }

  const items = [
    {
      key: "file",
      label: "File viewer",
      icon: FileText,
      run: () => {
        setFileKind("markdown");
        setMode("files");
      },
    },
    {
      key: "kanban",
      label: "Kanban board",
      icon: SquareKanban,
      run: () => {
        setFileKind("kanban");
        setMode("files");
      },
    },
    {
      key: "diff",
      label: "Diff viewer",
      icon: FileDiff,
      run: () => {
        void addOverviewPanel(repoPath, "diff");
        onClose();
      },
    },
    {
      key: "filetree",
      label: "File tree",
      icon: FolderTree,
      run: () => {
        void addOverviewPanel(repoPath, "filetree");
        onClose();
      },
    },
    {
      key: "terminal",
      label: "Terminal",
      icon: TerminalIcon,
      run: () => {
        void addOverviewPanel(repoPath, "terminal");
        onClose();
      },
    },
  ];

  return (
    <>
      {/* Instant agent spawn on this folder's current branch — no modal (#177).
          A separate action from the "add a view" items, so it sits apart above
          a separator. Appears everywhere the button does, including agents. */}
      <button
        type="button"
        role="menuitem"
        className={styles.item}
        onClick={() => {
          void spawnSession(repoPath);
          onClose();
        }}
      >
        <Plus size={14} strokeWidth={1.5} className={styles.icon} />
        New session here
      </button>
      <div className={styles.sep} role="separator" />
      {items.map((v) => {
        const Icon = v.icon;
        return (
          <button
            key={v.key}
            type="button"
            role="menuitem"
            className={styles.item}
            onClick={v.run}
          >
            <Icon size={14} strokeWidth={1.5} className={styles.icon} />
            {v.label}
          </button>
        );
      })}
    </>
  );
}

export default ViewsMenu;
