import { PanelsTopLeft } from "lucide-react";

import ViewsPopover from "../ViewsMenu/ViewsPopover";

/**
 * The **"open view"** header button (#165): the same affordance the clickable
 * worktree badge gives a worktree agent (#164), but as an icon button. Opens the
 * shared popover ({@link ViewsPopover} → `ViewsMenu`) scoped to a folder
 * (`repoPath`), offering the add-view actions (diff / file / kanban / file tree /
 * terminal) **plus** an instant "New session here" spawn (#177). Rendered on
 * **normal-agent** headers (#165) and, since #177, on **every non-agent folder
 * panel** header in Overview and Canvas. `className` matches the host's
 * action-button styling (Canvas `panelClose` / Overview `action`).
 */
function OpenViewButton({
  repoPath,
  className,
  iconSize = 14,
}: {
  repoPath: string;
  className?: string;
  iconSize?: number;
}) {
  return (
    <ViewsPopover
      repoPath={repoPath}
      renderTrigger={({ open, toggle }) => (
        <button
          type="button"
          className={className}
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          title="Open a view or start a session in this folder"
          aria-label="Open a view or start a session in this folder"
        >
          <PanelsTopLeft size={iconSize} strokeWidth={1.5} />
        </button>
      )}
    />
  );
}

export default OpenViewButton;
