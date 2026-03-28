use tauri::{AppHandle, Runtime};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutEvent, ShortcutState};

use crate::commands::{storage::DEFAULT_HOTKEY, window::toggle_main_window};

const FN_SPACE_HOTKEY: &str = "Fn+Space";

pub fn handle_shortcut_event<R: Runtime>(app: &AppHandle<R>, event: ShortcutEvent) {
    if event.state == ShortcutState::Pressed {
        let _ = toggle_main_window(app);
    }
}

fn is_fn_space_shortcut(shortcut: &str) -> bool {
    shortcut
        .chars()
        .filter(|character| !character.is_whitespace())
        .collect::<String>()
        .eq_ignore_ascii_case("fn+space")
}

fn normalize_shortcut(shortcut: &str) -> String {
    let trimmed = shortcut.trim();

    if trimmed.is_empty() {
        return DEFAULT_HOTKEY.to_string();
    }

    if is_fn_space_shortcut(trimmed) {
        return FN_SPACE_HOTKEY.to_string();
    }

    trimmed.to_string()
}

#[cfg(target_os = "macos")]
mod macos_fn_monitor {
    use std::{
        ptr::NonNull,
        sync::{mpsc, Mutex, OnceLock},
    };

    use block2::RcBlock;
    use objc2::{rc::Retained, runtime::AnyObject};
    use objc2_app_kit::{NSEvent, NSEventMask, NSEventModifierFlags};
    use tauri::{AppHandle, Runtime};

    use crate::commands::window::toggle_main_window;

    const SPACE_KEY_CODE: u16 = 49;

    static FN_SPACE_MONITOR: OnceLock<Mutex<Option<usize>>> = OnceLock::new();

    fn monitor_slot() -> &'static Mutex<Option<usize>> {
        FN_SPACE_MONITOR.get_or_init(|| Mutex::new(None))
    }

    fn run_on_main_thread_sync<R, T, F>(app: &AppHandle<R>, task: F) -> Result<T, String>
    where
        R: Runtime,
        T: Send + 'static,
        F: FnOnce() -> Result<T, String> + Send + 'static,
    {
        let (sender, receiver) = mpsc::channel();
        app.run_on_main_thread(move || {
            let _ = sender.send(task());
        })
        .map_err(|error| error.to_string())?;

        receiver
            .recv()
            .map_err(|error| error.to_string())?
    }

    fn remove_current_monitor() -> Result<(), String> {
        let mut monitor = monitor_slot()
            .lock()
            .map_err(|_| "failed to lock Fn+Space monitor state".to_string())?;

        let Some(raw_monitor) = monitor.take() else {
            return Ok(());
        };

        let raw_monitor = raw_monitor as *mut AnyObject;
        unsafe {
            NSEvent::removeMonitor(&*raw_monitor);
            let retained = Retained::from_raw(raw_monitor)
                .ok_or_else(|| "failed to release Fn+Space monitor".to_string())?;
            drop(retained);
        }

        Ok(())
    }

    pub fn clear<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
        run_on_main_thread_sync(app, remove_current_monitor)
    }

    pub fn install<R: Runtime + 'static>(app: &AppHandle<R>) -> Result<(), String> {
        let handler_app = app.clone();

        run_on_main_thread_sync(app, move || {
            remove_current_monitor()?;

            let block = RcBlock::new(move |event_ptr: NonNull<NSEvent>| {
                let event = unsafe { event_ptr.as_ref() };
                let device_flags =
                    event.modifierFlags() & NSEventModifierFlags::DeviceIndependentFlagsMask;

                if event.isARepeat()
                    || event.keyCode() != SPACE_KEY_CODE
                    || device_flags != NSEventModifierFlags::Function
                {
                    return;
                }

                let app = handler_app.clone();
                let window_app = app.clone();
                let _ = app.run_on_main_thread(move || {
                    let _ = toggle_main_window(&window_app);
                });
            });

            let monitor = NSEvent::addGlobalMonitorForEventsMatchingMask_handler(
                NSEventMask::KeyDown,
                &block,
            )
            .ok_or_else(|| "failed to install Fn+Space monitor".to_string())?;

            let raw_monitor = Retained::into_raw(monitor) as usize;
            *monitor_slot()
                .lock()
                .map_err(|_| "failed to store Fn+Space monitor".to_string())? = Some(raw_monitor);

            Ok(())
        })
    }
}

#[cfg(not(target_os = "macos"))]
mod macos_fn_monitor {
    use tauri::{AppHandle, Runtime};

    pub fn clear<R: Runtime>(_app: &AppHandle<R>) -> Result<(), String> {
        Ok(())
    }

    pub fn install<R: Runtime>(_app: &AppHandle<R>) -> Result<(), String> {
        Err("Fn+Space is only supported on macOS".to_string())
    }
}

pub fn sync_hotkey_registration<R: Runtime + 'static>(
    app: &AppHandle<R>,
    shortcut: &str,
) -> Result<(), String> {
    let normalized = normalize_shortcut(shortcut);

    macos_fn_monitor::clear(app)?;
    app.global_shortcut()
        .unregister_all()
        .map_err(|error| error.to_string())?;

    if is_fn_space_shortcut(&normalized) {
        return macos_fn_monitor::install(app);
    }

    app.global_shortcut()
        .register(normalized.as_str())
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn register_hotkey<R: Runtime + 'static>(
    app: AppHandle<R>,
    shortcut: String,
) -> Result<(), String> {
    sync_hotkey_registration(&app, &shortcut)
}
