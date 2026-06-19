import styles from "./BusyIndicator.module.css";

interface BusyIndicatorProps {
  /** Spins a Blue arc while true; a calm dimmed dot when false (#71). */
  busy: boolean;
  /** Accessible label + hover tooltip; defaults to the busy/idle state. */
  label?: string;
}

/**
 * The agent activity indicator (#71, supersedes #55's pulsing ball): a small
 * rotating spinner arc (`--status-running`) while the session is working,
 * settling into a calm static dot (`--status-idle`) when idle. Always rendered
 * so the idle state is visible; the footprint is fixed so the slot never shifts.
 * Motion respects the global `prefers-reduced-motion` killswitch
 * (`src/styles/global.css`), which stops the rotation and shows a static ring.
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
