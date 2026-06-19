import styles from "./BusyIndicator.module.css";

interface BusyIndicatorProps {
  /** Pulses Blue while true; sits dimmed/grayed when false (#55). */
  busy: boolean;
  /** Accessible label + hover tooltip; defaults to the busy/idle state. */
  label?: string;
}

/**
 * A single small status ball (#55, supersedes #42's bouncing dots): a Catppuccin
 * Blue dot that **pulses while the session is working** and sits **dimmed**
 * (`--status-idle`) when idle. Always rendered so the grayed idle state is
 * visible. Motion respects the global `prefers-reduced-motion` killswitch
 * (`src/styles/global.css`), which settles the pulse into a static colored dot.
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
