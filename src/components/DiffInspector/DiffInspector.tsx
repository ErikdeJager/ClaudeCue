import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { workingDiff } from "../../ipc";
import type { FileDiff, HunkLine, WorkingDiff } from "../../types";
import styles from "./DiffInspector.module.css";

interface DiffInspectorProps {
  repoPath: string;
  /** Whether the inspector is open — diff is only (re)fetched while visible. */
  active: boolean;
}

type DiffMode = "unified" | "split";

function UnifiedRow({ line }: { line: HunkLine }) {
  if (line.type === "hunk") {
    return <div className={styles.hunkHeader}>{line.text}</div>;
  }
  const rowClass =
    line.type === "add"
      ? styles.addRow
      : line.type === "del"
        ? styles.delRow
        : "";
  const marker = line.type === "add" ? "+" : line.type === "del" ? "−" : " ";
  return (
    <div className={`${styles.line} ${rowClass}`}>
      <span className={styles.gutter}>{line.old_no ?? ""}</span>
      <span className={styles.gutter}>{line.new_no ?? ""}</span>
      <span className={styles.marker}>{marker}</span>
      <span className={styles.content}>{line.text}</span>
    </div>
  );
}

function SplitRow({ line }: { line: HunkLine }) {
  if (line.type === "hunk") {
    return <div className={styles.hunkHeader}>{line.text}</div>;
  }
  const showLeft = line.type === "context" || line.type === "del";
  const showRight = line.type === "context" || line.type === "add";
  return (
    <div className={styles.splitLine}>
      <div
        className={`${styles.splitCell} ${line.type === "del" ? styles.delRow : ""}`}
      >
        {showLeft && (
          <>
            <span className={styles.gutter}>{line.old_no ?? ""}</span>
            <span className={styles.content}>{line.text}</span>
          </>
        )}
      </div>
      <div
        className={`${styles.splitCell} ${line.type === "add" ? styles.addRow : ""}`}
      >
        {showRight && (
          <>
            <span className={styles.gutter}>{line.new_no ?? ""}</span>
            <span className={styles.content}>{line.text}</span>
          </>
        )}
      </div>
    </div>
  );
}

function DiffFile({ file, mode }: { file: FileDiff; mode: DiffMode }) {
  if (file.binary) {
    return <div className={styles.binary}>Binary file — no preview.</div>;
  }
  if (mode === "split") {
    return (
      <div className={styles.code}>
        {file.hunks.map((line, i) => (
          <SplitRow key={i} line={line} />
        ))}
      </div>
    );
  }
  return (
    <div className={styles.code}>
      {file.hunks.map((line, i) => (
        <UnifiedRow key={i} line={line} />
      ))}
    </div>
  );
}

function glyphClass(status: FileDiff["status"]): string {
  if (status === "A") return styles.glyphAdd ?? "";
  if (status === "D") return styles.glyphDel ?? "";
  return styles.glyphMod ?? "";
}

/**
 * The Diff tab content: the focused session's working-tree diff vs HEAD (from
 * the `working_diff` command). Summary + changed-files list + unified/split body.
 */
function DiffInspector({ repoPath, active }: DiffInspectorProps) {
  const [diff, setDiff] = useState<WorkingDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [mode, setMode] = useState<DiffMode>("unified");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDiff(await workingDiff(repoPath));
    } catch {
      setDiff(null);
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  // Lazy: fetch when the inspector becomes visible and on repo change. (There is
  // no filesystem watcher in v1 — use Refresh after editing the working tree.)
  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  const files = diff?.files ?? [];
  const activeFile =
    files.find((file) => file.path === selectedFile) ?? files[0] ?? null;

  return (
    <div className={styles.panel}>
      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <span className={styles.branch}>{diff?.summary.branch || "—"}</span>
          <div className={styles.summaryActions}>
            <div className={styles.modeToggle}>
              <button
                type="button"
                className={mode === "unified" ? styles.modeActive : styles.mode}
                onClick={() => setMode("unified")}
              >
                Unified
              </button>
              <button
                type="button"
                className={mode === "split" ? styles.modeActive : styles.mode}
                onClick={() => setMode("split")}
              >
                Split
              </button>
            </div>
            <button
              type="button"
              className={styles.refresh}
              onClick={() => void load()}
              title="Refresh diff"
              aria-label="Refresh diff"
            >
              <RefreshCw
                size={14}
                strokeWidth={1.5}
                className={loading ? styles.spinning : ""}
              />
            </button>
          </div>
        </div>
        <div className={styles.counts}>
          {diff
            ? `${diff.summary.files_changed} file${diff.summary.files_changed === 1 ? "" : "s"} changed `
            : "— "}
          {diff && (
            <>
              <span className={styles.add}>+{diff.summary.adds}</span>{" "}
              <span className={styles.del}>−{diff.summary.dels}</span>
            </>
          )}
        </div>
      </div>

      {files.length === 0 ? (
        <div className={styles.empty}>
          {loading ? "Loading…" : "No changes yet on this branch."}
        </div>
      ) : (
        <>
          <div className={styles.files}>
            {files.map((file) => (
              <button
                key={file.path}
                type="button"
                className={`${styles.fileRow} ${file === activeFile ? styles.fileActive : ""}`}
                onClick={() => setSelectedFile(file.path)}
                title={file.path}
              >
                <span className={`${styles.glyph} ${glyphClass(file.status)}`}>
                  {file.status}
                </span>
                <span className={styles.filePath}>{file.path}</span>
                <span className={styles.fileCounts}>
                  <span className={styles.add}>+{file.add}</span>
                  <span className={styles.del}>−{file.del}</span>
                </span>
              </button>
            ))}
          </div>

          <div className={styles.body}>
            {activeFile && <DiffFile file={activeFile} mode={mode} />}
          </div>
        </>
      )}
    </div>
  );
}

export default DiffInspector;
