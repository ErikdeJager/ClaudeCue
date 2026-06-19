import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { readTextFile } from "../../ipc";
import styles from "./MarkdownViewer.module.css";

// Hot-reload poll while visible (#40, consistent with #29's diff polling). ~1s
// feels live without hammering the disk.
const POLL_MS = 1000;

interface MarkdownViewerProps {
  repoPath: string;
  /** Repo-relative markdown file path. */
  file: string;
  /** Only fetch/poll while shown. */
  active: boolean;
}

/**
 * Renders a repo markdown file (#40), reused by the Focus tab and the Overview
 * markdown panel (#41). GFM via `remark-gfm`; **no `rehype-raw`** so untrusted
 * file content can't inject HTML. Hot-reloads: polls while visible and only
 * re-renders when the content actually changed (preserves scroll otherwise).
 */
function MarkdownViewer({ repoPath, file, active }: MarkdownViewerProps) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const inFlight = useRef(false);

  const load = useCallback(
    async (silent = false) => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const next = await readTextFile(repoPath, file);
        setError(false);
        // The content doubles as the change signature: returning the same string
        // makes React bail out (no re-render), so scroll is preserved on an
        // unchanged poll.
        setContent((cur) => (cur === next ? cur : next));
      } catch {
        // A transient poll failure keeps the last good content; an explicit load
        // surfaces the error.
        if (!silent) {
          setContent(null);
          setError(true);
        }
      } finally {
        inFlight.current = false;
      }
    },
    [repoPath, file],
  );

  // Fetch when shown / on file change.
  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  // Poll for hot-reload while visible; pause when the window is hidden, catch up
  // on regain (#29 pattern).
  useEffect(() => {
    if (!active) return;
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
      if (document.hidden) stop();
      else {
        void load(true);
        start();
      }
    };
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active, load]);

  if (error) {
    return <div className={styles.message}>Couldn’t read {file}.</div>;
  }
  if (content === null) {
    return <div className={styles.message}>Loading…</div>;
  }
  return (
    <div className={styles.markdown}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

export default MarkdownViewer;
