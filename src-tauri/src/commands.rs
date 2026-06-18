//! Tauri command surface for sessions — thin wrappers over `SessionManager`,
//! plus the event payloads emitted to the frontend.

use std::path::PathBuf;

use serde::Serialize;
use tauri::State;

use crate::pty::{self, SessionError, SessionInfo, SessionManager};

/// Payload for the `session://output` event.
#[derive(Clone, Serialize)]
pub struct OutputPayload {
    pub id: String,
    pub bytes: Vec<u8>,
}

/// Payload for the `session://exited` event.
#[derive(Clone, Serialize)]
pub struct ExitPayload {
    pub id: String,
    pub code: Option<i32>,
}

#[tauri::command]
pub fn spawn_session(
    manager: State<'_, SessionManager>,
    cwd: String,
    name: Option<String>,
) -> Result<SessionInfo, SessionError> {
    manager.spawn_session(PathBuf::from(cwd), name)
}

#[tauri::command]
pub fn write_stdin(
    manager: State<'_, SessionManager>,
    id: String,
    data: String,
) -> Result<(), SessionError> {
    manager.write_stdin(&id, &data)
}

#[tauri::command]
pub fn resize_pty(
    manager: State<'_, SessionManager>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), SessionError> {
    manager.resize_pty(&id, cols, rows)
}

#[tauri::command]
pub fn kill_session(manager: State<'_, SessionManager>, id: String) -> Result<(), SessionError> {
    manager.kill_session(&id)
}

#[tauri::command]
pub fn session_scrollback(
    manager: State<'_, SessionManager>,
    id: String,
) -> Result<Vec<u8>, SessionError> {
    manager.scrollback(&id)
}

#[tauri::command]
pub fn open_in_editor(cwd: String) -> Result<(), SessionError> {
    pty::open_in_editor(&cwd)
}
