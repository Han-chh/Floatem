use tauri::{AppHandle, Runtime};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutEvent, ShortcutState};

use crate::commands::{
    storage::DEFAULT_HOTKEY,
    window::toggle_main_window,
};

pub fn handle_shortcut_event<R: Runtime>(app: &AppHandle<R>, event: ShortcutEvent) {
    if event.state == ShortcutState::Pressed {
        let _ = toggle_main_window(app);
    }
}

#[tauri::command]
pub fn register_hotkey<R: Runtime>(app: AppHandle<R>, shortcut: String) -> Result<(), String> {
    let normalized = if shortcut.trim().is_empty() {
        DEFAULT_HOTKEY.to_string()
    } else {
        shortcut
    };

    app.global_shortcut()
        .unregister_all()
        .map_err(|error| error.to_string())?;
    app.global_shortcut()
        .register(normalized.as_str())
        .map_err(|error| error.to_string())
}
