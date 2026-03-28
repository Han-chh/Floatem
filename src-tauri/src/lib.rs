mod commands;

use commands::{
    hotkey::{handle_shortcut_event, register_hotkey, sync_hotkey_registration},
    notification::{cancel_reminder, schedule_reminder},
    storage::{load_all, load_settings_data, save_notes, save_settings, save_todos},
};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let global_shortcut_plugin = tauri_plugin_global_shortcut::Builder::new()
        .with_handler(|app, _shortcut, event| {
            handle_shortcut_event(app, event);
        })
        .build();

    tauri::Builder::default()
        .enable_macos_default_menu(false)
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(global_shortcut_plugin)
        .setup(|app| {
            let settings = load_settings_data(&app.handle())
                .map_err(|error| -> Box<dyn std::error::Error> { error.into() })?;

            sync_hotkey_registration(&app.handle(), settings.hotkey.as_str())
                .map_err(|error| -> Box<dyn std::error::Error> { error.into() })?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() != commands::storage::MAIN_WINDOW_LABEL {
                return;
            }

            if let tauri::WindowEvent::Moved(position) = event {
                let _ = commands::storage::save_panel_position(&window.app_handle(), position.x, position.y);
            }
        })
        .invoke_handler(tauri::generate_handler![
            load_all,
            save_notes,
            save_todos,
            save_settings,
            register_hotkey,
            schedule_reminder,
            cancel_reminder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
