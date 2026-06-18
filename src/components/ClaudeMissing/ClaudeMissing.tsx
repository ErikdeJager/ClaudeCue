import { useStore } from "../../store";
import styles from "./ClaudeMissing.module.css";

/**
 * Prominent surface shown when the `claude` binary is missing from PATH. Set by
 * the store when a spawn fails with a `BinaryNotFound` error.
 */
function ClaudeMissing() {
  const setClaudeMissing = useStore((s) => s.setClaudeMissing);

  return (
    <div className={styles.banner} role="alert">
      <span className={styles.text}>
        <strong>claude not found.</strong> Install the Claude Code CLI and make
        sure <code className={styles.code}>claude</code> is on your PATH, then
        try again.
      </span>
      <button
        type="button"
        className={styles.dismiss}
        onClick={() => setClaudeMissing(false)}
      >
        Dismiss
      </button>
    </div>
  );
}

export default ClaudeMissing;
