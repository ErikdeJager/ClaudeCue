import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";

import styles from "./FilePicker.module.css";

interface FilePickerProps {
  /** Repo-relative file paths to choose from; `null` = still loading. */
  files: string[] | null;
  /** Called with the chosen repo-relative path. */
  onPick: (file: string) => void;
}

function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? path : path.slice(i + 1);
}

function dirname(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

/**
 * Reusable searchable file picker (#56): an autofocused search box over a
 * filtered, scrollable list of files. Each row shows the **basename** prominently
 * with the containing **directory dimmed**. Filtering is a case-insensitive
 * substring match over the full repo-relative path. Keyboard: type to filter,
 * Up/Down to move the highlight, Enter to choose. On-system tokens; mono paths.
 */
function FilePicker({ files, onPick }: FilePickerProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    if (!files) return [];
    const q = query.trim().toLowerCase();
    return q ? files.filter((f) => f.toLowerCase().includes(q)) : files;
  }, [files, query]);

  // Reset the highlight to the top whenever the filter changes.
  useEffect(() => setActive(0), [query]);

  // Keep the highlighted row scrolled into view as it moves.
  useEffect(() => {
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (filtered.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const f = filtered[active];
      if (f) onPick(f);
    }
  };

  return (
    <div className={styles.picker} onKeyDown={onKeyDown}>
      <div className={styles.searchRow}>
        <Search
          size={14}
          strokeWidth={1.5}
          className={styles.searchIcon}
          aria-hidden
        />
        <input
          ref={inputRef}
          type="text"
          className={styles.search}
          placeholder="Search files…"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          aria-label="Search files"
        />
      </div>
      {files === null ? (
        <p className={styles.hint}>Loading…</p>
      ) : files.length === 0 ? (
        <p className={styles.hint}>No files in this repo.</p>
      ) : filtered.length === 0 ? (
        <p className={styles.hint}>No matches.</p>
      ) : (
        <div
          className={styles.list}
          ref={listRef}
          role="listbox"
          aria-label="Files"
        >
          {filtered.map((f, i) => {
            const dir = dirname(f);
            return (
              <button
                key={f}
                type="button"
                role="option"
                aria-selected={i === active}
                className={`${styles.row} ${i === active ? styles.rowActive : ""}`}
                title={f}
                onMouseEnter={() => setActive(i)}
                onClick={() => onPick(f)}
              >
                <span className={styles.name}>{basename(f)}</span>
                {dir && <span className={styles.dir}>{dir}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FilePicker;
