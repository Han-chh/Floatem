use tauri::{AppHandle, Manager, PhysicalPosition, Runtime, WebviewWindow};

use crate::commands::storage::{load_settings_data, save_panel_position, MAIN_WINDOW_LABEL};

fn main_window<R: Runtime>(app: &AppHandle<R>) -> Result<WebviewWindow<R>, String> {
    app
        .get_webview_window(MAIN_WINDOW_LABEL)
        .ok_or_else(|| "main window is unavailable".to_string())
}

fn restore_panel_position<R: Runtime>(
    app: &AppHandle<R>,
    window: &WebviewWindow<R>,
) -> Result<(), String> {
    let settings = load_settings_data(app)?;
    if let Some(position) = settings.panel_position {
        window
            .set_position(PhysicalPosition::new(position.x, position.y))
            .map_err(|error| error.to_string())?;
    }

    Ok(())
}

pub fn show_main_window<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let window = main_window(app)?;

    restore_panel_position(app, &window)?;

    let _ = window.unminimize();
    if !window.is_visible().map_err(|error| error.to_string())? {
        window.show().map_err(|error| error.to_string())?;
    }
    window.set_focus().map_err(|error| error.to_string())?;

    Ok(())
}

pub fn toggle_main_window<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let window = main_window(app)?;

    if window.is_visible().map_err(|error| error.to_string())? {
        let position = window.outer_position().map_err(|error| error.to_string())?;
        save_panel_position(app, position.x, position.y)?;
        window.hide().map_err(|error| error.to_string())?;
        return Ok(());
    }

    show_main_window(app)
}
