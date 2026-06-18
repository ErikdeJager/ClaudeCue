import { useStore } from "../../store";
import styles from "./Focus.module.css";

/**
 * Focus placeholder. The single large terminal, toolbar, and inspector land in
 * tasks #12 / #13; for now it names the selected session.
 */
function Focus() {
  const selectedId = useStore((s) => s.selectedId);
  const sessions = useStore((s) => s.sessions);
  const session = sessions.find((x) => x.id === selectedId);

  return (
    <div className={styles.focus}>
      {session ? (
        <p className={styles.label}>
          Focused: <strong>{session.name ?? session.repoPath}</strong>
        </p>
      ) : (
        <p className={styles.hint}>Select a session to focus it.</p>
      )}
    </div>
  );
}

export default Focus;
