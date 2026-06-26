import { useEffect, useState } from "react";

import { agentInfo } from "../../ipc";
import { useStore } from "../../store";
import type { AgentInfo } from "../../types";
import styles from "./ClaudeMissing.module.css";

/**
 * Prominent surface shown when the selected agent's binary is missing from PATH.
 * Set by the store when a spawn fails with a `BinaryNotFound` error. Generalized
 * (#142) from hardcoded "claude" to the **selected** agent's name + install hint
 * (from the backend `agent_info`), so choosing Codex without `codex` installed
 * explains how to install Codex. Claude's wording is unchanged when Claude is
 * selected (its spec supplies the same copy).
 */
function ClaudeMissing() {
  const setClaudeMissing = useStore((s) => s.setClaudeMissing);
  const agent = useStore((s) => s.settings.defaultAgent);
  const [info, setInfo] = useState<AgentInfo | null>(null);

  useEffect(() => {
    let active = true;
    void agentInfo(agent)
      .then((i) => {
        if (active) setInfo(i);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [agent]);

  // Fall back to Claude's wording until the agent_info read resolves.
  const binary = info?.binary_name ?? "claude";
  const hint =
    info?.install_hint ??
    "Install the Claude Code CLI and make sure `claude` is on your PATH.";

  return (
    <div className={styles.banner} role="alert">
      <span className={styles.text}>
        <strong>
          <code className={styles.code}>{binary}</code> not found.
        </strong>{" "}
        {hint} Then try again.
      </span>
      <button
        type="button"
        className={styles.dismiss}
        onClick={() => setClaudeMissing(false)}
      >
        Dismiss
      </button>
    </div>
  );
}

export default ClaudeMissing;
