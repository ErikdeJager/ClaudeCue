import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  onNewSession?: () => void;
}

/**
 * Centered no-sessions empty state. Reused by the Overview wall (task #11).
 */
function EmptyState({ onNewSession }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <p className={styles.title}>No active sessions</p>
      <p className={styles.subtitle}>
        Start a claude session and it appears here.
      </p>
      {onNewSession && (
        <button type="button" className={styles.button} onClick={onNewSession}>
          New session
        </button>
      )}
    </div>
  );
}

export default EmptyState;
