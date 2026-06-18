import { useStore } from "../../store";
import type { View } from "../../types";
import styles from "./ViewSwitch.module.css";

const OPTIONS: { value: View; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "focus", label: "Focus" },
];

/**
 * Segmented Overview / Focus control. Lives in the shell top bar for now; task
 * #12 relocates it into the Focus toolbar.
 */
function ViewSwitch() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);

  return (
    <div className={styles.group} role="tablist" aria-label="View">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={view === option.value}
          className={view === option.value ? styles.active : styles.option}
          onClick={() => setView(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default ViewSwitch;
