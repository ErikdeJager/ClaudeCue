import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import {
  Bot,
  Database,
  FolderOpen,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

import * as ipc from "../../ipc";
import { DEFAULT_SETTINGS, useStore } from "../../store";
import type { Settings as SettingsType } from "../../types";
import Checkbox from "../Checkbox/Checkbox";
import styles from "./Settings.module.css";

type Section = "terminal" | "sessions" | "data";

const SECTIONS: { id: Section; label: string; icon: ReactNode }[] = [
  {
    id: "terminal",
    label: "Terminal",
    icon: <SlidersHorizontal size={15} strokeWidth={1.5} />,
  },
  {
    id: "sessions",
    label: "Sessions",
    icon: <Bot size={15} strokeWidth={1.5} />,
  },
  {
    id: "data",
    label: "Data & About",
    icon: <Database size={15} strokeWidth={1.5} />,
  },
];

/**
 * Settings modal (#100) — part 1: the footer-gear entry point, the modal shell,
 * and the **Terminal**, **Sessions**, and **Data & About** sections. (Appearance /
 * Behavior land in follow-ups.) Reuses the app modal pattern: a dimmed scrim, a
 * focus-trap, and Escape-to-close. Edits are staged in modal-local **draft** state
 * and applied + persisted only on **Save**; **Cancel** / Escape / scrim discard.
 *
 * Mounted only while open (the default export gates on the store flag), so the
 * draft re-initializes from the saved settings each time it opens.
 */
function SettingsModal() {
  const saved = useStore((s) => s.settings);
  const setOpen = useStore((s) => s.setSettingsOpen);
  const saveSettings = useStore((s) => s.saveSettings);
  const setRecents = useStore((s) => s.setRecents);
  const recentsCount = useStore((s) => s.recents.length);
  const pushToast = useStore((s) => s.pushToast);

  const [draft, setDraft] = useState<SettingsType>(saved);
  const [section, setSection] = useState<Section>("terminal");
  const [appVer, setAppVer] = useState("");
  const [claudeVer, setClaudeVer] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // Focus the dialog on open; restore focus to the opener (the gear) on close.
  useEffect(() => {
    openerRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => openerRef.current?.focus?.();
  }, []);

  // About: app + claude versions, best-effort.
  useEffect(() => {
    void ipc
      .appVersion()
      .then(setAppVer)
      .catch(() => {});
    void ipc
      .claudeVersion()
      .then(setClaudeVer)
      .catch(() => {});
  }, []);

  const close = () => setOpen(false);
  const save = () => {
    void saveSettings(draft);
    setOpen(false);
  };
  function update<K extends keyof SettingsType>(
    key: K,
    value: SettingsType[K],
  ) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  // Focus-trap + Escape (#49), mirroring NewSessionModal.
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const clearRecents = () => {
    void ipc.clearRecents().catch(() => {});
    setRecents([]);
    pushToast("Recent folders cleared");
  };

  return (
    <div className={styles.overlay} onClick={close}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <nav className={styles.sections} aria-label="Settings sections">
          <h2 className={styles.title}>Settings</h2>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`${styles.sectionTab} ${
                section === s.id ? styles.sectionActive : ""
              }`}
              onClick={() => setSection(s.id)}
              aria-current={section === s.id}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </nav>

        <div className={styles.pane}>
          <div className={styles.content}>
            {section === "terminal" && (
              <>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>
                    Font size
                    <span className={styles.fieldValue}>
                      {draft.terminalFontSize}px
                    </span>
                  </span>
                  <input
                    type="range"
                    className={styles.range}
                    min={10}
                    max={16}
                    step={0.5}
                    value={draft.terminalFontSize}
                    onChange={(e) =>
                      update("terminalFontSize", Number(e.target.value))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>
                    Line height
                    <span className={styles.fieldValue}>
                      {draft.terminalLineHeight.toFixed(1)}
                    </span>
                  </span>
                  <input
                    type="range"
                    className={styles.range}
                    min={1}
                    max={1.8}
                    step={0.1}
                    value={draft.terminalLineHeight}
                    onChange={(e) =>
                      update("terminalLineHeight", Number(e.target.value))
                    }
                  />
                </label>
                <Checkbox
                  checked={draft.terminalCursorBlink}
                  onChange={(v) => update("terminalCursorBlink", v)}
                  label="Cursor blink"
                  className={styles.checkRow}
                />
              </>
            )}

            {section === "sessions" && (
              <Checkbox
                checked={draft.autoName}
                onChange={(v) => update("autoName", v)}
                label="Auto-name agents from claude's session title"
                className={styles.checkRow}
              />
            )}

            {section === "data" && (
              <div className={styles.dataSection}>
                <button
                  type="button"
                  className={styles.dataButton}
                  onClick={() => void ipc.openDataFolder().catch(() => {})}
                >
                  <FolderOpen size={15} strokeWidth={1.5} />
                  Open data folder
                </button>
                <button
                  type="button"
                  className={styles.dataButton}
                  onClick={clearRecents}
                  disabled={recentsCount === 0}
                >
                  <Trash2 size={15} strokeWidth={1.5} />
                  Clear recents ({recentsCount})
                </button>
                <dl className={styles.about}>
                  <div className={styles.aboutRow}>
                    <dt>ClaudeCue</dt>
                    <dd>{appVer || "—"}</dd>
                  </div>
                  <div className={styles.aboutRow}>
                    <dt>claude</dt>
                    <dd>{claudeVer ?? "not found"}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>

          <footer className={styles.actions}>
            <button
              type="button"
              className={styles.resetButton}
              onClick={() => setDraft(DEFAULT_SETTINGS)}
            >
              Reset to defaults
            </button>
            <div className={styles.actionsRight}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={close}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.saveButton}
                onClick={save}
              >
                Save
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

/** Gate: render the modal only while open, so its draft state is fresh each time. */
function Settings() {
  const open = useStore((s) => s.settingsOpen);
  if (!open) return null;
  return <SettingsModal />;
}

export default Settings;
