import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { categoryLabel } from "../../patchnotes";
import type { PatchNotes as PatchNotesType } from "../../types";
import { markdownLinkComponents } from "../markdownCheckboxes";
import styles from "./PatchNotes.module.css";

// Inline item rendering (#192): unwrap the <p> react-markdown wraps a bullet's text
// in, so it sits inline in the <li>; keep the shared external-link handling (#182).
const itemComponents: Components = {
  ...markdownLinkComponents,
  p: ({ children }: { children?: ReactNode }) => <>{children}</>,
};

/**
 * Render a {@link PatchNotesType} object (#192): each change group as a category
 * heading + a bullet list, with item text through react-markdown (inline links).
 * Used in the Settings → Updates pane (#191) for the current version's baked-in
 * notes; an available update's release-carried notes render as raw markdown there.
 */
function PatchNotes({ notes }: { notes: PatchNotesType }) {
  return (
    <div className={styles.notes}>
      {notes.changes.map((change, i) => (
        <div key={`${change.category}-${i}`} className={styles.group}>
          <h4 className={styles.category}>{categoryLabel(change.category)}</h4>
          <ul className={styles.items}>
            {change.items.map((item, j) => (
              <li key={`${i}-${j}`} className={styles.item}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={itemComponents}
                >
                  {item}
                </ReactMarkdown>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default PatchNotes;
