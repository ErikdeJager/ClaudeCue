import styles from "./BusyIndicator.module.css";

interface BusyIndicatorProps {
  /** Accessible label + hover tooltip. */
  label?: string;
}

/**
 * A small, playful "working" indicator (#42): three dots bouncing in a staggered
 * wave while a `claude` session is busy. Rendered only when busy — idle shows
 * nothing. Motion respects the global `prefers-reduced-motion` killswitch
 * (`src/styles/global.css`), which settles the dots into a static colored
 * cluster. The busy color is the Yellow status token (#33).
 */
function BusyIndicator({ label = "Working…" }: BusyIndicatorProps) {
  return (
    <span
      className={styles.busy}
      role="status"
      aria-label={label}
      title={label}
    >
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
    </span>
  );
}

export default BusyIndicator;
