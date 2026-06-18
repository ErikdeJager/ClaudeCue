import { Download, X } from "lucide-react";

import { useStore } from "../../store";
import styles from "./UpdatePopup.module.css";

/**
 * In-app update affordance (distinct from the bottom-center Toaster):
 * - a bottom-right popup when a newer published release is available, and
 * - a full-window blocking overlay while the update installs (before relaunch).
 *
 * Dismiss (×) hides the popup for this session only; it reappears next launch.
 */
function UpdatePopup() {
  const update = useStore((s) => s.update);
  const dismissUpdate = useStore((s) => s.dismissUpdate);
  const installUpdate = useStore((s) => s.installUpdate);

  if (update.installing) {
    return (
      <div
        className={styles.overlay}
        role="alertdialog"
        aria-label="Installing update"
      >
        <div className={styles.spinner} aria-hidden="true" />
        <p className={styles.overlayText}>Installing update…</p>
      </div>
    );
  }

  if (!update.available || update.dismissed) return null;

  return (
    <div className={styles.popup} role="dialog" aria-label="Update available">
      <div className={styles.text}>
        <span className={styles.title}>Update available</span>
        {update.version && (
          <span className={styles.version}>v{update.version}</span>
        )}
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.update}
          onClick={() => void installUpdate()}
        >
          <Download size={14} strokeWidth={1.5} />
          Update
        </button>
        <button
          type="button"
          className={styles.dismiss}
          onClick={dismissUpdate}
          title="Dismiss until next launch"
          aria-label="Dismiss"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

export default UpdatePopup;
