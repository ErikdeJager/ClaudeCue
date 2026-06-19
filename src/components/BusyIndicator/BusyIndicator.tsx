import styles from "./BusyIndicator.module.css";

interface BusyIndicatorProps {
  /** A Blue dot with a sheen sweeping across it while true; a calm dimmed dot
   * when false (#88). */
  busy: boolean;
  /** Accessible label + hover tooltip; defaults to the busy/idle state. */
  label?: string;
}

/**
 * The agent activity indicator (#88, supersedes #71's spinner arc): a calm
 * `--status-idle` dot that gains a soft Claude-style **shimmer** — a sheen
 * sweeping across a `--status-running` dot — while the session is working. Always
 * rendered so the idle state is visible; idle and busy share one dot in a fixed
 * slot so the footprint never shifts. Motion respects the global
 * `prefers-reduced-motion` killswitch (`src/styles/global.css`), which stops the
 * sweep and leaves a solid glowing blue dot, still distinct from idle. All visuals
 * live in `BusyIndicator.module.css` (this is markup only).
 */
function BusyIndicator({ busy, label }: BusyIndicatorProps) {
  const text = label ?? (busy ? "Working…" : "Idle");
  return (
    <span
      className={`${styles.ball} ${busy ? styles.busy : ""}`}
      role="status"
      aria-label={text}
      title={text}
    />
  );
}

export default BusyIndicator;
