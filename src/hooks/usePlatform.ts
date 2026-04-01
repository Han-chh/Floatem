import type { AppSettings, LoadAllResult, NoteCard, TodoItem } from "../lib/models";
import { getQuickNoteBridge, isNativeQuickNoteHost } from "../lib/nativeBridge";

export function usePlatform() {
  const isNativeHost = isNativeQuickNoteHost();

  return {
    isNativeHost,
    platformLabel: isNativeHost ? "macOS native panel" : "Browser preview",
  };
}

export async function loadAllData(): Promise<LoadAllResult> {
  return getQuickNoteBridge().loadAllData();
}

export async function saveNotes(cards: NoteCard[]) {
  await getQuickNoteBridge().saveNotes(cards);
}

export async function saveTodos(todos: TodoItem[]) {
  await getQuickNoteBridge().saveTodos(todos);
}

export async function saveSettings(settings: AppSettings) {
  await getQuickNoteBridge().saveSettings(settings);
}

export async function registerHotkey(shortcut: string) {
  await getQuickNoteBridge().registerHotkey(shortcut);
}

export async function hidePanelWindow() {
  await getQuickNoteBridge().hidePanelWindow();
}

export async function reportFrontendReady() {
  await getQuickNoteBridge().reportFrontendReady();
}

export async function reportFrontendError(message: string, source?: string) {
  await getQuickNoteBridge().reportFrontendError(message, source);
}
