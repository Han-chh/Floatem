#[tauri::command]
pub fn schedule_reminder(todo_id: String, remind_at: i64, text: String) -> Result<(), String> {
    let _ = (todo_id, remind_at, text);
    Ok(())
}

#[tauri::command]
pub fn cancel_reminder(todo_id: String) -> Result<(), String> {
    let _ = todo_id;
    Ok(())
}
