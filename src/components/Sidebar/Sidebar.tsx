import styles from "./Sidebar.module.css";

/**
 * Left sidebar region. The New session button, repo groups, and session rows are
 * built in task #9; this is the styled shell slot the layout reserves for them.
 */
function Sidebar() {
  return (
    <aside className={styles.sidebar} aria-label="Sessions">
      <div className={styles.placeholder}>Sessions</div>
    </aside>
  );
}

export default Sidebar;
