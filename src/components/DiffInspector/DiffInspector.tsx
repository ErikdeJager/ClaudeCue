import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

import { compareBranches, listBranches, workingDiff } from "../../ipc";
import { useStore } from "../../store";
import type { BranchList, FileDiff, HunkLine, WorkingDiff } from "../../types";
import styles from "./DiffInspector.module.css";

// Poll the working-tree diff while the inspector is open so agent edits appear
// on their own (#29). ~1.5s feels live without hammering `git`.
const POLL_MS = 1500;

interface DiffInspectorProps {
  repoPath: string;
  /** Whether the inspector is open — diff is only (re)fetched while visible. */
  active: boolean;
}

type DiffMode = "unified" | "split";
/** Diff source (#81): working tree vs HEAD, or a two-branch compare. */
type DiffSource = "working" | "compare";

// Cap rows rendered per file so a huge diff can't jank the panel (no
// virtualization in v1 — see the pass-2 punch list).
const MAX_DIFF_ROWS = 600;

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
  const Row = mode === "split" ? SplitRow : UnifiedRow;
  const truncated = file.hunks.length > MAX_DIFF_ROWS;
  const rows = truncated ? file.hunks.slice(0, MAX_DIFF_ROWS) : file.hunks;
  return (
    <div className={styles.code}>
      {rows.map((line, i) => (
        <Row key={i} line={line} />
      ))}
      {truncated && (
        <div className={styles.truncated}>
          Showing the first {MAX_DIFF_ROWS} of {file.hunks.length} lines — open
          the file for the full diff.
        </div>
      )}
    </div>
  );
}

function glyphClass(status: FileDiff["status"]): string {
  if (status === "A") return styles.glyphAdd ?? "";
  if (status === "D") return styles.glyphDel ?? "";
  return styles.glyphMod ?? "";
}

/**
 * The diff viewer (#13/#39/#47): a changed-files list + unified/split body. By
 * default it shows the repo's **working tree vs HEAD** (`working_diff`, polled
 * #29); a **Compare** source toggle (#81) instead shows a two-dot
 * `git diff base target` between two local branches, rendered in the same body.
 * The compare source + branches persist on the repo's diff panel.
 */
function DiffInspector({ repoPath, active }: DiffInspectorProps) {
  const [diff, setDiff] = useState<WorkingDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [mode, setMode] = useState<DiffMode>("unified");

  // Branch-compare state (#81), seeded from the repo's persisted diff panel so a
  // configured compare view survives view switches / restart.
  const diffPanel = () =>
    (useStore.getState().overviewPanels[repoPath] ?? []).find(
      (p) => p.kind === "diff",
    );
  const [source, setSource] = useState<DiffSource>(() =>
    diffPanel()?.diff_source === "compare" ? "compare" : "working",
  );
  const [base, setBase] = useState<string | null>(
    () => diffPanel()?.compare_base ?? null,
  );
  const [target, setTarget] = useState<string | null>(
    () => diffPanel()?.compare_target ?? null,
  );
  const [branchList, setBranchList] = useState<BranchList | null>(null);
  const setDiffCompare = useStore((s) => s.setDiffCompare);

  // Signature of the last applied diff (skip re-render when a poll finds no
  // change) and an in-flight guard (never overlap fetches).
  const sigRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  // Load the branch list (compare pickers) and default base/target once (#81):
  // base = current branch, target = main/master if present.
  useEffect(() => {
    let cancelled = false;
    void listBranches(repoPath)
      .then((bl) => {
        if (cancelled) return;
        setBranchList(bl);
        setBase((b) => b ?? (bl.current || bl.all[0] || null));
        setTarget(
          (t) =>
            t ?? bl.all.find((x) => x === "main" || x === "master") ?? null,
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [repoPath]);

  // Persist the compare source + branches on the repo's diff panel (#81).
  useEffect(() => {
    setDiffCompare(repoPath, {
      diff_source: source,
      compare_base: base ?? undefined,
      compare_target: target ?? undefined,
    });
  }, [repoPath, source, base, target, setDiffCompare]);

  const load = useCallback(
    async (silent = false) => {
      // Compare mode needs both branches; until then, show the pick state.
      if (source === "compare" && (!base || !target)) {
        sigRef.current = null;
        setDiff(null);
        setError(false);
        return;
      }
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      if (!silent) setLoading(true);
      try {
        const next =
          source === "compare"
            ? await compareBranches(repoPath, base as string, target as string)
            : await workingDiff(repoPath);
        const sig = JSON.stringify(next);
        // Only update state when the diff actually changed — an unchanged poll
        // is invisible (no re-render, so selection + scroll are preserved).
        if (sig !== sigRef.current) {
          sigRef.current = sig;
          setDiff(next);
        }
        setError(false);
      } catch {
        // A transient background-poll failure keeps the last good diff; an
        // explicit/initial load surfaces the empty/error state.
        if (!silent) {
          sigRef.current = null;
          setDiff(null);
          setError(true);
        }
      } finally {
        if (!silent) setLoading(false);
        inFlightRef.current = false;
      }
    },
    [repoPath, source, base, target],
  );

  // Fetch (with spinner) when visible / on repo or source/branch change.
  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  // Poll only in working-tree mode (#29) — branch compares change only on new
  // commits, so they reload on selection change + manual Refresh instead.
  useEffect(() => {
    if (!active || source !== "working") return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      if (timer === undefined && !document.hidden) {
        timer = setInterval(() => void load(true), POLL_MS);
      }
    };
    const stop = () => {
      if (timer !== undefined) {
        clearInterval(timer);
        timer = undefined;
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        void load(true); // catch up immediately, then resume polling
        start();
      }
    };
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active, source, load]);

  const files = diff?.files ?? [];
  const activeFile =
    files.find((file) => file.path === selectedFile) ?? files[0] ?? null;

  const emptyMessage = loading
    ? "Loading…"
    : error
      ? "Couldn’t produce this diff."
      : source === "compare"
        ? !base || !target
          ? "Pick a base and target branch to compare."
          : "No differences between these branches."
        : "No changes yet on this branch.";

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

        {/* Source toggle (#81): working tree vs HEAD ↔ two-branch compare. */}
        <div className={styles.sourceRow}>
          <div className={styles.modeToggle}>
            <button
              type="button"
              className={source === "working" ? styles.modeActive : styles.mode}
              onClick={() => setSource("working")}
            >
              Working tree
            </button>
            <button
              type="button"
              className={source === "compare" ? styles.modeActive : styles.mode}
              onClick={() => setSource("compare")}
            >
              Compare
            </button>
          </div>
          {source === "compare" && branchList && (
            <div className={styles.comparePickers}>
              <select
                className={styles.branchSelect}
                value={base ?? ""}
                onChange={(e) => setBase(e.currentTarget.value)}
                aria-label="Base branch"
              >
                {branchList.all.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <span className={styles.compareArrow}>→</span>
              <select
                className={styles.branchSelect}
                value={target ?? ""}
                onChange={(e) => setTarget(e.currentTarget.value)}
                aria-label="Target branch"
              >
                {branchList.all.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}
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
        <div className={styles.empty}>{emptyMessage}</div>
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
