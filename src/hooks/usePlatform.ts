import { invoke } from "@tauri-apps/api/core";
import type { AppSettings, LoadAllResult, NoteCard, TodoItem } from "../lib/models";
import { DEFAULT_SETTINGS } from "../lib/models";

type LoadAllTuple = [NoteCard[], TodoItem[], AppSettings];

export function usePlatform() {
  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  return {
    isTauri,
    platformLabel: isTauri ? "macOS tray panel" : "Browser preview",
  };
}

export async function loadAllData(): Promise<LoadAllResult> {
  try {
    const [notes, todos, settings] = await invoke<LoadAllTuple>("load_all");
    return {
      notes,
      todos,
      settings,
    };
  } catch {
    return {
      notes: [],
      todos: [],
      settings: DEFAULT_SETTINGS,
    };
  }
}

export async function saveNotes(cards: NoteCard[]) {
  await invoke("save_notes", { cards });
}

export async function saveTodos(todos: TodoItem[]) {
  await invoke("save_todos", { todos });
}

export async function saveSettings(settings: AppSettings) {
  await invoke("save_settings", { settings });
}

export async function registerHotkey(shortcut: string) {
  await invoke("register_hotkey", { shortcut });
}

export async function hidePanelWindow() {
  await invoke("hide_panel_window");
}
