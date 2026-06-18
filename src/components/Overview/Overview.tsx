import { ExternalLink, Maximize2, X } from "lucide-react";

import { repoName } from "../../paths";
import { useStore } from "../../store";
import type { SessionView } from "../../types";
import EmptyState from "../EmptyState/EmptyState";
import Terminal from "../Terminal/Terminal";
import styles from "./Overview.module.css";

interface SessionCardProps {
  session: SessionView;
  branch: string;
  selected: boolean;
  onSelect: () => void;
  onExpand: () => void;
  onOpenInZed: () => void;
  onRemove: () => void;
}

function SessionCard({
  session,
  branch,
  selected,
  onSelect,
  onExpand,
  onOpenInZed,
  onRemove,
}: SessionCardProps) {
  return (
    <div className={`${styles.card} ${selected ? styles.cardSelected : ""}`}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={styles.name}>
            {session.name ?? repoName(session.repoPath)}
          </span>
          <span className={styles.meta}>
            {repoName(session.repoPath)}
            {branch && ` · ${branch}`}
          </span>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.action}
            onClick={onExpand}
            title="Expand to Focus"
            aria-label="Expand to Focus"
          >
            <Maximize2 size={15} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className={styles.action}
            onClick={onOpenInZed}
            title="Open in Zed"
            aria-label="Open in Zed"
          >
            <ExternalLink size={15} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className={styles.action}
            onClick={onRemove}
            title="Remove (kill + forget)"
            aria-label="Remove session"
          >
            <X size={15} strokeWidth={1.5} />
          </button>
        </div>
      </header>
      {/* Clicking the card body selects it (highlight in place); Expand still
          goes to Focus. The terminal inside keeps its own click-to-focus. */}
      <div className={styles.body} onClick={onSelect}>
        <Terminal sessionId={session.id} />
      </div>
    </div>
  );
}

/**
 * The Overview "agent wall": every active session as an equal-width terminal
 * column. Columns fill the area and scroll horizontally once they hit their
 * min-width. Cards are uniform — no status pills/glow in v1.
 */
function Overview() {
  const sessions = useStore((s) => s.sessions);
  const branches = useStore((s) => s.branches);
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);
  const setView = useStore((s) => s.setView);
  const openInZed = useStore((s) => s.openInZed);
  const removeSession = useStore((s) => s.removeSession);
  const openNewSession = useStore((s) => s.openNewSession);
  const filter = useStore((s) => s.overviewRepoFilter);
  const setOverviewRepoFilter = useStore((s) => s.setOverviewRepoFilter);

  if (sessions.length === 0) {
    return <EmptyState onNewSession={() => openNewSession()} />;
  }

  // Expand is the intentional Focus affordance: select, then switch the view
  // explicitly (selection alone no longer forces Focus — see store `select`).
  const expand = (id: string) => {
    select(id);
    setView("focus");
  };

  // The sidebar repo filter (#34) narrows the wall to one repo's agents.
  const shown = filter
    ? sessions.filter((s) => s.repoPath === filter)
    : sessions;

  return (
    <div className={styles.overview}>
      {filter && (
        <div className={styles.filterBar}>
          <span className={styles.filterLabel}>
            Showing <strong>{repoName(filter)}</strong>
          </span>
          <button
            type="button"
            className={styles.showAll}
            onClick={() => setOverviewRepoFilter(null)}
          >
            Show all
          </button>
        </div>
      )}
      {shown.length === 0 ? (
        <div className={styles.filterEmpty}>No agents in this repo.</div>
      ) : (
        <div className={styles.wall}>
          {shown.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              branch={branches[session.repoPath] ?? ""}
              selected={session.id === selectedId}
              onSelect={() => select(session.id)}
              onExpand={() => expand(session.id)}
              onOpenInZed={() => void openInZed(session.repoPath)}
              onRemove={() => void removeSession(session.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Overview;
