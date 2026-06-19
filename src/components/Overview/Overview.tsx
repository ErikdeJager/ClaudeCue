import type { ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Maximize2,
  X,
} from "lucide-react";

import { repoName } from "../../paths";
import { repoColor, useStore } from "../../store";
import type { OverviewPanel, SessionView } from "../../types";
// The Focus inspector's diff component is already parameterized by { repoPath,
// active }, so the Overview diff panel (#39) reuses it directly — one source.
import DiffInspector from "../DiffInspector/DiffInspector";
import EmptyState from "../EmptyState/EmptyState";
import Terminal from "../Terminal/Terminal";
import styles from "./Overview.module.css";

/**
 * Shared column chrome (#38): every Overview column — an agent terminal, a diff
 * panel (#39), or a markdown panel (#41) — renders inside this frame (repo-color
 * top band, header with a title + actions, and a body), so adding/closing/
 * reordering panels all share one layout. Terminal columns keep stable keys at
 * the Overview level, so React reorders (never remounts) them and the persistent
 * pool (#18) is untouched.
 */
interface PanelColumnProps {
  color: string;
  groupStart: boolean;
  selected?: boolean;
  title: ReactNode;
  actions: ReactNode;
  onClickBody?: () => void;
  children: ReactNode;
}

function PanelColumn({
  color,
  groupStart,
  selected = false,
  title,
  actions,
  onClickBody,
  children,
}: PanelColumnProps) {
  return (
    <div
      className={`${styles.card} ${selected ? styles.cardSelected : ""} ${groupStart ? styles.cardGroupStart : ""}`}
      style={{ borderTopColor: color }}
    >
      <header className={styles.header}>
        <div className={styles.titleBlock}>{title}</div>
        <div className={styles.actions}>{actions}</div>
      </header>
      <div className={styles.body} onClick={onClickBody}>
        {children}
      </div>
    </div>
  );
}

interface SessionCardProps {
  session: SessionView;
  branch: string;
  color: string;
  groupStart: boolean;
  selected: boolean;
  onSelect: () => void;
  onExpand: () => void;
  onOpenInZed: () => void;
  onRemove: () => void;
}

function SessionCard({
  session,
  branch,
  color,
  groupStart,
  selected,
  onSelect,
  onExpand,
  onOpenInZed,
  onRemove,
}: SessionCardProps) {
  const title = (
    <>
      <span className={styles.name}>
        {session.name ?? repoName(session.repoPath)}
      </span>
      <span className={styles.meta}>
        <span className={styles.metaDot} style={{ background: color }} />
        <span className={styles.metaText}>
          {repoName(session.repoPath)}
          {branch && ` · ${branch}`}
        </span>
      </span>
    </>
  );
  const actions = (
    <>
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
    </>
  );
  return (
    // Clicking the card body selects it (highlight in place); Expand goes to
    // Focus. The terminal inside keeps its own click-to-focus.
    <PanelColumn
      color={color}
      groupStart={groupStart}
      selected={selected}
      title={title}
      actions={actions}
      onClickBody={onSelect}
    >
      <Terminal sessionId={session.id} />
    </PanelColumn>
  );
}

function panelLabel(panel: OverviewPanel): string {
  if (panel.kind === "diff") return "Diff";
  if (panel.file) return panel.file.split("/").pop() || "Markdown";
  return "Markdown";
}

interface ExtraPanelProps {
  panel: OverviewPanel;
  repoPath: string;
  branch: string;
  color: string;
  groupStart: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onClose: () => void;
}

function ExtraPanel({
  panel,
  repoPath,
  branch,
  color,
  groupStart,
  canMoveLeft,
  canMoveRight,
  onMoveLeft,
  onMoveRight,
  onClose,
}: ExtraPanelProps) {
  const title = (
    <>
      <span className={styles.name}>{panelLabel(panel)}</span>
      <span className={styles.meta}>
        <span className={styles.metaDot} style={{ background: color }} />
        <span className={styles.metaText}>
          {repoName(repoPath)}
          {branch && ` · ${branch}`}
        </span>
      </span>
    </>
  );
  const actions = (
    <>
      <button
        type="button"
        className={styles.action}
        onClick={onMoveLeft}
        disabled={!canMoveLeft}
        title="Move panel left"
        aria-label="Move panel left"
      >
        <ChevronLeft size={15} strokeWidth={1.5} />
      </button>
      <button
        type="button"
        className={styles.action}
        onClick={onMoveRight}
        disabled={!canMoveRight}
        title="Move panel right"
        aria-label="Move panel right"
      >
        <ChevronRight size={15} strokeWidth={1.5} />
      </button>
      <button
        type="button"
        className={styles.action}
        onClick={onClose}
        title="Close panel"
        aria-label="Close panel"
      >
        <X size={15} strokeWidth={1.5} />
      </button>
    </>
  );
  return (
    <PanelColumn
      color={color}
      groupStart={groupStart}
      title={title}
      actions={actions}
    >
      {panel.kind === "diff" ? (
        // Reuse the Focus inspector's diff component (#39), bound to this repo
        // and always active so it polls (#29) while the column is shown.
        <DiffInspector repoPath={repoPath} active />
      ) : (
        // Markdown body filled by #41.
        <div className={styles.placeholder}>Markdown panel — added in #41.</div>
      )}
    </PanelColumn>
  );
}

type ColumnItem =
  | { kind: "agent"; session: SessionView }
  | { kind: "panel"; panel: OverviewPanel; index: number; count: number };

/**
 * The Overview "agent wall" (#38): a customizable arrangement of equal-width
 * columns grouped by repo — each repo's live agent terminals (auto) followed by
 * its user-managed extra panels (diff/markdown). Columns scroll horizontally
 * past capacity; the sidebar repo filter (#34/#36) narrows it to one repo.
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
  const repoColors = useStore((s) => s.repoColors);
  const overviewPanels = useStore((s) => s.overviewPanels);
  const removeOverviewPanel = useStore((s) => s.removeOverviewPanel);
  const moveOverviewPanel = useStore((s) => s.moveOverviewPanel);

  // The welcome empty state only when there's truly nothing — no agents and no
  // extra panels (a repo can have a diff/markdown panel without an agent, #39/#41).
  const anyPanels = Object.values(overviewPanels).some(
    (list) => list.length > 0,
  );
  if (sessions.length === 0 && !anyPanels) {
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

  // Always group by repo: sidebar's alphabetical order (#20), agents contiguous
  // within a repo (stable by createdAt).
  const ordered = [...shown].sort((a, b) => {
    const byName = repoName(a.repoPath)
      .toLowerCase()
      .localeCompare(repoName(b.repoPath).toLowerCase());
    if (byName !== 0) return byName;
    const byPath = a.repoPath.localeCompare(b.repoPath);
    if (byPath !== 0) return byPath;
    return a.createdAt - b.createdAt;
  });

  // Repos to render: those with agents, plus those with extra panels (respecting
  // the filter) — so a diff/markdown panel shows even with no agent in the repo.
  const repoSet = new Set<string>();
  for (const s of ordered) repoSet.add(s.repoPath);
  for (const repo of Object.keys(overviewPanels)) {
    if (
      (overviewPanels[repo]?.length ?? 0) > 0 &&
      (!filter || repo === filter)
    ) {
      repoSet.add(repo);
    }
  }
  const repoList = [...repoSet].sort((a, b) => {
    const byName = repoName(a)
      .toLowerCase()
      .localeCompare(repoName(b).toLowerCase());
    return byName !== 0 ? byName : a.localeCompare(b);
  });

  // Flatten to columns: per repo, [agent panels…] then [extra panels…] (#38).
  const columns: { repoPath: string; item: ColumnItem }[] = [];
  for (const repo of repoList) {
    for (const s of ordered) {
      if (s.repoPath === repo) {
        columns.push({ repoPath: repo, item: { kind: "agent", session: s } });
      }
    }
    const extras = overviewPanels[repo] ?? [];
    extras.forEach((panel, index) =>
      columns.push({
        repoPath: repo,
        item: { kind: "panel", panel, index, count: extras.length },
      }),
    );
  }

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
      {columns.length === 0 ? (
        <div className={styles.filterEmpty}>
          {filter ? "Nothing to show for this repo." : "No agents yet."}
        </div>
      ) : (
        <div className={styles.wall}>
          {columns.map((col, i) => {
            const groupStart =
              i > 0 && columns[i - 1]?.repoPath !== col.repoPath;
            const color = repoColor(col.repoPath, repoColors);
            if (col.item.kind === "agent") {
              const session = col.item.session;
              return (
                <SessionCard
                  key={session.id}
                  session={session}
                  branch={branches[session.repoPath] ?? ""}
                  color={color}
                  groupStart={groupStart}
                  selected={session.id === selectedId}
                  onSelect={() => select(session.id)}
                  onExpand={() => expand(session.id)}
                  onOpenInZed={() => void openInZed(session.repoPath)}
                  onRemove={() => void removeSession(session.id)}
                />
              );
            }
            const { panel, index, count } = col.item;
            return (
              <ExtraPanel
                key={panel.id}
                panel={panel}
                repoPath={col.repoPath}
                branch={branches[col.repoPath] ?? ""}
                color={color}
                groupStart={groupStart}
                canMoveLeft={index > 0}
                canMoveRight={index < count - 1}
                onMoveLeft={() =>
                  void moveOverviewPanel(col.repoPath, panel.id, -1)
                }
                onMoveRight={() =>
                  void moveOverviewPanel(col.repoPath, panel.id, 1)
                }
                onClose={() => void removeOverviewPanel(col.repoPath, panel.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Overview;
