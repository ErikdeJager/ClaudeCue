import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

import {
  commitDiff,
  compareBranches,
  listBranches,
  listCommits,
  workingDiff,
} from "../../ipc";
import { useStore } from "../../store";
import type {
  BranchList,
  CommitInfo,
  FileDiff,
  HunkLine,
  WorkingDiff,
} from "../../types";
import { prismLang } from "../FileViewer/fileType";
import { highlightToHtml } from "../FileViewer/prism";
import styles from "./DiffInspector.module.css";

/** A diff line's code text, syntax-highlighted (#229) when `lang` is known, else
 * plain. `highlightToHtml` HTML-escapes its input (Prism + the escape fallback), so
 * the injected markup carries no raw file HTML — safe to `dangerouslySetInnerHTML`.
 * Per-line tokenization (lightweight; cross-line constructs aren't stitched). */
function CodeContent({
  text,
  lang,
}: {
  text: string;
  lang: string | undefined;
}) {
  if (lang) {
    return (
      <span
        className={styles.content}
        dangerouslySetInnerHTML={{ __html: highlightToHtml(text, lang) }}
      />
    );
  }
  return <span className={styles.content}>{text}</span>;
}

// Poll the working-tree diff while the inspector is open so agent edits appear
// on their own (#29). ~1.5s feels live without hammering `git`.
const POLL_MS = 1500;

interface DiffInspectorProps {
  repoPath: string;
  /** Whether the inspector is open — diff is only (re)fetched while visible. */
  active: boolean;
}

type DiffMode = "unified" | "split";
/** Diff source: working tree vs HEAD (#81), a two-branch compare (#81), or a single
 * commit's diff (#230). */
type DiffSource = "working" | "compare" | "commits";

// Latest-N commits listed in Commits mode (mirrors the backend cap); the cap is
// surfaced in the picker so a large history reads as bounded.
const MAX_COMMITS = 100;

// Cap rows rendered per file so a huge diff can't jank the panel (no
// virtualization in v1 — see the pass-2 punch list).
const MAX_DIFF_ROWS = 600;

function UnifiedRow({
  line,
  lang,
}: {
  line: HunkLine;
  lang: string | undefined;
}) {
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
      <CodeContent text={line.text} lang={lang} />
    </div>
  );
}

function SplitRow({
  line,
  lang,
}: {
  line: HunkLine;
  lang: string | undefined;
}) {
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
            <CodeContent text={line.text} lang={lang} />
          </>
        )}
      </div>
      <div
        className={`${styles.splitCell} ${line.type === "add" ? styles.addRow : ""}`}
      >
        {showRight && (
          <>
            <span className={styles.gutter}>{line.new_no ?? ""}</span>
            <CodeContent text={line.text} lang={lang} />
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
  // Detect the language once per file (#229) from its path; undefined → plain text.
  const lang = prismLang(file.path);
  const truncated = file.hunks.length > MAX_DIFF_ROWS;
  const rows = truncated ? file.hunks.slice(0, MAX_DIFF_ROWS) : file.hunks;
  return (
    <div className={styles.code}>
      {rows.map((line, i) => (
        <Row key={i} line={line} lang={lang} />
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
  const [source, setSource] = useState<DiffSource>(() => {
    const s = diffPanel()?.diff_source;
    return s === "compare" || s === "commits" ? s : "working";
  });
  const [base, setBase] = useState<string | null>(
    () => diffPanel()?.compare_base ?? null,
  );
  const [target, setTarget] = useState<string | null>(
    () => diffPanel()?.compare_target ?? null,
  );
  const [branchList, setBranchList] = useState<BranchList | null>(null);
  // Commits source (#230): the bounded commit list + the selected commit's sha,
  // seeded from the persisted diff panel so a configured commits view survives.
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [commitSha, setCommitSha] = useState<string | null>(
    () => diffPanel()?.commit_sha ?? null,
  );
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

  // Persist the source + branches/commit on the repo's diff panel (#81/#230).
  useEffect(() => {
    setDiffCompare(repoPath, {
      diff_source: source,
      compare_base: base ?? undefined,
      compare_target: target ?? undefined,
      commit_sha: commitSha ?? undefined,
    });
  }, [repoPath, source, base, target, commitSha, setDiffCompare]);

  // Load the commit list in Commits mode (#230) — bounded backend-side. Auto-select
  // the most recent commit when none is chosen yet, so the body isn't empty.
  useEffect(() => {
    if (!active || source !== "commits") return;
    let cancelled = false;
    void listCommits(repoPath, MAX_COMMITS)
      .then((list) => {
        if (cancelled) return;
        setCommits(list);
        setCommitSha((cur) =>
          cur && list.some((c) => c.sha === cur) ? cur : (list[0]?.sha ?? null),
        );
      })
      .catch(() => {
        if (!cancelled) setCommits([]);
      });
    return () => {
      cancelled = true;
    };
  }, [active, source, repoPath]);

  const load = useCallback(
    async (silent = false) => {
      // Compare mode needs both branches; commits mode needs a selected commit.
      // Until then, show the pick state.
      if (source === "compare" && (!base || !target)) {
        sigRef.current = null;
        setDiff(null);
        setError(false);
        return;
      }
      if (source === "commits" && !commitSha) {
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
            : source === "commits"
              ? await commitDiff(repoPath, commitSha as string)
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
    [repoPath, source, base, target, commitSha],
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

  const selectedCommit = commits.find((c) => c.sha === commitSha);
  // Header label: the selected commit (short sha · subject) in Commits mode, else the
  // diff summary's branch / "base → target".
  const summaryLabel =
    source === "commits" && selectedCommit
      ? `${selectedCommit.short_sha} · ${selectedCommit.subject}`
      : diff?.summary.branch || "—";

  const emptyMessage = loading
    ? "Loading…"
    : error
      ? "Couldn’t produce this diff."
      : source === "compare"
        ? !base || !target
          ? "Pick a base and target branch to compare."
          : "No differences between these branches."
        : source === "commits"
          ? commits.length === 0
            ? "No commits in this repository."
            : !commitSha
              ? "Pick a commit to view its changes."
              : "This commit has no file changes."
          : "No changes yet on this branch.";

  return (
    <div className={styles.panel}>
      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <span className={styles.branch} title={summaryLabel}>
            {summaryLabel}
          </span>
          <div className={styles.summaryActions}>
            <div className={styles.modeToggle}>
              <button
                type="button"
                className={mode === "unified" ? styles.modeActive : styles.mode}
                aria-pressed={mode === "unified"}
                onClick={() => setMode("unified")}
              >
                Unified
              </button>
              <button
                type="button"
                className={mode === "split" ? styles.modeActive : styles.mode}
                aria-pressed={mode === "split"}
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

        {/* Source toggle (#81/#230): working tree vs HEAD, a two-branch compare, or a
            single commit's diff. */}
        <div className={styles.sourceRow}>
          <div className={styles.modeToggle}>
            <button
              type="button"
              className={source === "working" ? styles.modeActive : styles.mode}
              aria-pressed={source === "working"}
              onClick={() => setSource("working")}
            >
              Working tree
            </button>
            <button
              type="button"
              className={source === "compare" ? styles.modeActive : styles.mode}
              aria-pressed={source === "compare"}
              onClick={() => setSource("compare")}
            >
              Compare
            </button>
            <button
              type="button"
              className={source === "commits" ? styles.modeActive : styles.mode}
              aria-pressed={source === "commits"}
              onClick={() => setSource("commits")}
            >
              Commits
            </button>
          </div>
          {/* Commit picker (#230): the bounded recent-commit list; selecting one shows
              its diff in the body. The cap is surfaced so a long history reads bounded. */}
          {source === "commits" && (
            <div className={styles.comparePickers}>
              <select
                className={styles.branchSelect}
                value={commitSha ?? ""}
                onChange={(e) => setCommitSha(e.currentTarget.value || null)}
                aria-label="Commit"
                disabled={commits.length === 0}
              >
                {commits.length === 0 && <option value="">No commits</option>}
                {commits.map((c) => (
                  <option key={c.sha} value={c.sha}>
                    {c.short_sha} · {c.subject} ({c.author} · {c.date})
                  </option>
                ))}
              </select>
              {commits.length >= MAX_COMMITS && (
                <span className={styles.capNote}>latest {MAX_COMMITS}</span>
              )}
            </div>
          )}
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
