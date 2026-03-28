use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    fs,
    io::ErrorKind,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager, Runtime};

pub const DEFAULT_HOTKEY: &str = "Alt+Space";
pub const MAIN_WINDOW_LABEL: &str = "main";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteCard {
    pub id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default = "default_dot_color")]
    pub dot_color: String,
    #[serde(default)]
    pub collapsed: bool,
    #[serde(default = "default_note_content")]
    pub content: Value,
    #[serde(default = "current_timestamp")]
    pub created_at: i64,
    #[serde(default = "current_timestamp")]
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TodoItem {
    pub id: String,
    pub text: String,
    #[serde(default)]
    pub done: bool,
    #[serde(default)]
    pub reminder_at: Option<i64>,
    #[serde(default = "current_timestamp")]
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PanelPosition {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    #[serde(default = "default_hotkey")]
    pub hotkey: String,
    #[serde(default)]
    pub panel_position: Option<PanelPosition>,
    #[serde(default = "default_active_tab")]
    pub active_tab: String,
    #[serde(default = "default_transition_style")]
    pub transition_style: String,
    #[serde(default = "default_animation_speed")]
    pub animation_speed: String,
    #[serde(default = "default_enable_particles")]
    pub enable_particles: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            hotkey: default_hotkey(),
            panel_position: None,
            active_tab: default_active_tab(),
            transition_style: default_transition_style(),
            animation_speed: default_animation_speed(),
            enable_particles: default_enable_particles(),
        }
    }
}

fn default_hotkey() -> String {
    DEFAULT_HOTKEY.to_string()
}

fn default_active_tab() -> String {
    "notes".to_string()
}

fn default_transition_style() -> String {
    "page".to_string()
}

fn default_animation_speed() -> String {
    "faster".to_string()
}

fn default_enable_particles() -> bool {
    true
}

fn default_dot_color() -> String {
    "#FF7A59".to_string()
}

fn default_note_content() -> Value {
    json!([
        {
            "type": "paragraph",
            "children": [
                {
                    "text": ""
                }
            ]
        }
    ])
}

fn current_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}

fn app_data_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let path = app.path().app_data_dir().map_err(|error| error.to_string())?;
    fs::create_dir_all(&path).map_err(|error| error.to_string())?;
    Ok(path)
}

fn notes_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("notes.json"))
}

fn todos_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("todos.json"))
}

fn settings_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("settings.json"))
}

fn read_json_file<T>(path: &Path) -> Result<T, String>
where
    T: DeserializeOwned + Default,
{
    match fs::read_to_string(path) {
        Ok(contents) => serde_json::from_str::<T>(&contents).map_err(|error| error.to_string()),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(T::default()),
        Err(error) => Err(error.to_string()),
    }
}

fn write_json_file<T>(path: &Path, value: &T) -> Result<(), String>
where
    T: Serialize,
{
    let serialized = serde_json::to_string_pretty(value).map_err(|error| error.to_string())?;
    fs::write(path, serialized).map_err(|error| error.to_string())
}

pub fn load_settings_data<R: Runtime>(app: &AppHandle<R>) -> Result<Settings, String> {
    let path = settings_path(app)?;
    let settings = read_json_file::<Settings>(&path)?;

    if !path.exists() {
        write_json_file(&path, &settings)?;
    }

    Ok(settings)
}

pub fn save_panel_position<R: Runtime>(app: &AppHandle<R>, x: i32, y: i32) -> Result<(), String> {
    let mut settings = load_settings_data(app)?;
    settings.panel_position = Some(PanelPosition { x, y });
    save_settings_data(app, &settings)
}

pub fn save_settings_data<R: Runtime>(app: &AppHandle<R>, settings: &Settings) -> Result<(), String> {
    let path = settings_path(app)?;
    write_json_file(&path, settings)
}

#[tauri::command]
pub fn load_all<R: Runtime>(app: AppHandle<R>) -> Result<(Vec<NoteCard>, Vec<TodoItem>, Settings), String> {
    let notes = read_json_file::<Vec<NoteCard>>(&notes_path(&app)?)?;
    let todos = read_json_file::<Vec<TodoItem>>(&todos_path(&app)?)?;
    let settings = load_settings_data(&app)?;

    Ok((notes, todos, settings))
}

#[tauri::command]
pub fn save_notes<R: Runtime>(app: AppHandle<R>, cards: Vec<NoteCard>) -> Result<(), String> {
    let path = notes_path(&app)?;
    write_json_file(&path, &cards)
}

#[tauri::command]
pub fn save_todos<R: Runtime>(app: AppHandle<R>, todos: Vec<TodoItem>) -> Result<(), String> {
    let path = todos_path(&app)?;
    write_json_file(&path, &todos)
}

#[tauri::command]
pub fn save_settings<R: Runtime>(app: AppHandle<R>, settings: Settings) -> Result<(), String> {
    save_settings_data(&app, &settings)
}
