//! ClaudeCue Tauri backend.
//!
//! Hosts the application window and the Tauri command/event surface the React
//! frontend talks to. The session/PTY core lives in `pty`; persistence/resume
//! and read-only git support are added by later tasks.

mod commands;
mod pty;

use std::sync::mpsc;
use std::thread;

use tauri::{Emitter, Manager};

use pty::{SessionEvent, SessionManager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // The session manager emits to a channel; forward it to the frontend
            // as Tauri events on a dedicated thread.
            let (tx, rx) = mpsc::channel::<SessionEvent>();
            app.manage(SessionManager::new(tx));

            let handle = app.handle().clone();
            thread::spawn(move || {
                for event in rx {
                    let _ = match event {
                        SessionEvent::Output { id, bytes } => {
                            handle.emit("session://output", commands::OutputPayload { id, bytes })
                        }
                        SessionEvent::Exited { id, code } => {
                            handle.emit("session://exited", commands::ExitPayload { id, code })
                        }
                    };
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::spawn_session,
            commands::write_stdin,
            commands::resize_pty,
            commands::kill_session,
            commands::session_scrollback,
            commands::open_in_editor,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
