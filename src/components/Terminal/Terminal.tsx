import { useEffect, useRef } from "react";

import { useStore } from "../../store";
import { mountTerminal, unmountTerminal } from "./terminalPool";
import styles from "./Terminal.module.css";

interface TerminalProps {
  sessionId: string;
}

/**
 * Presentation-only terminal bound to a single session id. The xterm instance
 * itself is owned by the persistent terminal pool (see `terminalPool.ts`); this
 * component is just the *slot* the pool reparents the live terminal node into
 * while the session is shown here. Because the instance outlives this
 * component, switching Overview↔Focus reparents (never disposes/recreates) the
 * terminal — no scrollback replay, no garbled redraw. Embedded by the Overview
 * wall (#11) and Focus view (#12).
 */
function Terminal({ sessionId }: TerminalProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const exitedCode = useStore(
    (s) => s.sessions.find((x) => x.id === sessionId)?.exitedCode,
  );
  const restartSession = useStore((s) => s.restartSession);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    mountTerminal(sessionId, slot);
    return () => unmountTerminal(sessionId, slot);
  }, [sessionId]);

  return (
    <div className={styles.wrapper}>
      <div ref={slotRef} className={styles.slot} />
      {exitedCode !== undefined && (
        <div className={styles.exitOverlay}>
          <p className={styles.exitText}>
            Process exited{exitedCode != null ? ` (code ${exitedCode})` : ""}
          </p>
          <button
            type="button"
            className={styles.restart}
            onClick={() => void restartSession(sessionId)}
          >
            Restart
          </button>
        </div>
      )}
    </div>
  );
}

export default Terminal;
