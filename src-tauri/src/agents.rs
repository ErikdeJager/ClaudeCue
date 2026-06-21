//! Pluggable coding-agent specs (#101).
//!
//! Every agent PTY used to hardcode the `claude` CLI. This module makes the coding
//! agent **pluggable**: a built-in catalog of `AgentSpec`s is the single source of
//! truth for everything that differs per agent (its binary, how it spawns/resumes a
//! session, and a few capability flags), so the spawn / resume / boot call sites
//! resolve a spec instead of writing `"claude"` literals — and adding an agent later
//! is one catalog entry rather than scattered edits.
//!
//! **Part (a) (this change): the abstraction + the `claude` spec only**, which
//! preserves today's exact behavior (`--session-id <uuid>`, `--resume <uuid>`, a
//! positional prompt). The **`codex`** spec — and the Settings selector that lets new
//! sessions pick it, plus the resume-capability gating in the UI — land in the
//! follow-up, where the real `codex` CLI is verified (same discipline as the
//! claude-flag note in CLAUDE.md Conventions). Until then every session is Claude.

/// The agent id stored on records written before #101 (and the only agent until the
/// Codex follow-up): Claude Code. Used as the serde / read-time default everywhere.
pub const DEFAULT_AGENT_ID: &str = "claude";

/// What differs per coding agent. ClaudeCue's own session/PTY id (a UUID) is
/// unchanged; the spec decides whether/how that id reaches the CLI (e.g. claude's
/// `--session-id`).
// Part (a) wires only `binary_name` + the arg builders into the spawn/resume path;
// the remaining capability/label fields (`id`, `display_name`, `supports_resume`,
// `supports_auto_name`, `install_hint`) are consumed by the Codex follow-up (the
// Settings selector, resume gating, missing-binary screen, auto-name gating).
#[allow(dead_code)]
#[derive(Debug, Clone, Copy)]
pub struct AgentSpec {
    /// Stable id stored on each session (`"claude"`, `"codex"`, …).
    pub id: &'static str,
    /// Human label for the UI (selector, missing-binary screen, prompts).
    pub display_name: &'static str,
    /// Binary looked up on PATH to run the agent.
    pub binary_name: &'static str,
    /// Whether the CLI can resume a prior session by id. Gates boot-restore /
    /// Restart / the copy-resume command (wired in the follow-up).
    pub supports_resume: bool,
    /// Whether the CLI writes an `ai-title` log ClaudeCue can read for auto-naming
    /// (#97) — claude does; others fall back to the branch / first prompt.
    pub supports_auto_name: bool,
    /// Shown on the missing-binary screen when this CLI isn't on PATH.
    pub install_hint: &'static str,
}

impl AgentSpec {
    /// CLI args to start a **new** session under `session_id`, optionally seeding an
    /// initial `prompt` (blank prompts are dropped). Today only Claude exists; the
    /// Codex follow-up branches here on `self.id`.
    pub fn spawn_args(&self, session_id: &str, prompt: Option<&str>) -> Vec<String> {
        // Claude: `claude --session-id <uuid> ["<prompt>"]` (verified, #30/#93).
        let mut args = vec!["--session-id".to_string(), session_id.to_string()];
        if let Some(p) = prompt.map(str::trim).filter(|p| !p.is_empty()) {
            args.push(p.to_string());
        }
        args
    }

    /// CLI args to **resume** `session_id` — only meaningful when `supports_resume`.
    /// Claude: `claude --resume <uuid>` (verified, #30).
    pub fn resume_args(&self, session_id: &str) -> Vec<String> {
        vec!["--resume".to_string(), session_id.to_string()]
    }
}

/// The Claude Code spec — today's exact behavior.
const CLAUDE: AgentSpec = AgentSpec {
    id: "claude",
    display_name: "Claude Code",
    binary_name: "claude",
    supports_resume: true,
    supports_auto_name: true,
    install_hint: "Install Claude Code and make sure `claude` is on your PATH.",
};

/// Resolve an agent id to its spec. **Part (a): Claude is the only agent**, so every
/// id — an older record's defaulted `"claude"`, or any value at all — resolves to
/// Claude (so nothing fails). The Codex follow-up turns this into a `match id`.
pub fn agent_spec(_id: &str) -> AgentSpec {
    CLAUDE
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn claude_spawn_and_resume_args_match_todays_flags() {
        let spec = agent_spec("claude");
        assert_eq!(spec.binary_name, "claude");
        assert_eq!(spec.spawn_args("abc", None), vec!["--session-id", "abc"]);
        assert_eq!(
            spec.spawn_args("abc", Some("  hi  ")),
            vec!["--session-id", "abc", "hi"]
        );
        // A blank prompt is dropped (a plain new session).
        assert_eq!(
            spec.spawn_args("abc", Some("   ")),
            vec!["--session-id", "abc"]
        );
        assert_eq!(spec.resume_args("abc"), vec!["--resume", "abc"]);
    }

    #[test]
    fn unknown_id_falls_back_to_claude() {
        assert_eq!(agent_spec("nope").id, "claude");
    }
}
