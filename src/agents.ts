// Frontend mirror of the Rust `AgentSpec` catalog (#141/#142). The backend
// (`src-tauri/src/agents.rs`) is the single source of truth for how each agent
// spawns/resumes; this mirrors only the handful of **static capability flags +
// labels** the UI gates on, so we don't IPC per render. Keep in sync with the Rust
// catalog — the missing-binary screen (#142) still reads the live binary/version
// from the backend `agent_info` command.

export interface AgentCaps {
  /** Stable id recorded on a session (`"claude"`, `"codex"`). */
  id: string;
  /** Human label for the selector / tooltips. */
  displayName: string;
  /** CLI can resume/fork a session by id — gates Fork + copy-resume (#126/#28). */
  supportsResume: boolean;
  /** CLI writes a claude-style `ai-title` log we can auto-name from (#97). */
  supportsAutoName: boolean;
}

const CLAUDE_CAPS: AgentCaps = {
  id: "claude",
  displayName: "Claude Code",
  supportsResume: true,
  supportsAutoName: true,
};

const CODEX_CAPS: AgentCaps = {
  id: "codex",
  displayName: "Codex",
  supportsResume: false,
  supportsAutoName: false,
};

const CATALOG: Record<string, AgentCaps> = {
  claude: CLAUDE_CAPS,
  codex: CODEX_CAPS,
};

/** Capability flags for an agent id; an unknown / missing id falls back to Claude
 * (matching the Rust `agent_spec`). */
export function agentCaps(agent: string | null | undefined): AgentCaps {
  return (agent && CATALOG[agent]) || CLAUDE_CAPS;
}

/** Whether a session's agent supports Fork / copy-resume (#126/#28/#142). */
export function agentSupportsResume(agent: string | null | undefined): boolean {
  return agentCaps(agent).supportsResume;
}

/** The selectable coding agents for the Settings selector (#142), in display order. */
export const SELECTABLE_AGENTS: AgentCaps[] = [CLAUDE_CAPS, CODEX_CAPS];
