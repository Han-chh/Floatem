import type { AppSettings, LoadAllResult, NotesDocument, TodoItem } from "../lib/models";
import { normalizeNotesDocument } from "../lib/models";
import { getQuickNoteBridge, isNativeQuickNoteHost } from "../lib/nativeBridge";

export function usePlatform() {
  const isNativeHost = isNativeQuickNoteHost();

  return {
    isNativeHost,
    platformLabel: isNativeHost ? "Native desktop host" : "Browser preview",
  };
}

export async function loadAllData(): Promise<LoadAllResult> {
  const result = await getQuickNoteBridge().loadAllData();

  return {
    ...result,
    notes: normalizeNotesDocument(result.notes),
  };
}

export async function saveNotes(notes: NotesDocument) {
  await getQuickNoteBridge().saveNotes(notes);
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

export async function getHotkeyRegistrationState() {
  return await getQuickNoteBridge().getHotkeyRegistrationState();
}

export async function setEditableInputActive(active: boolean) {
  await getQuickNoteBridge().setEditableInputActive(active);
}

export async function setTextCompositionActive(active: boolean) {
  await getQuickNoteBridge().setTextCompositionActive(active);
}

export async function hidePanelWindow() {
  await getQuickNoteBridge().hideWindow();
}

export async function reportFrontendReady() {
  await getQuickNoteBridge().reportFrontendReady();
}

export async function reportFrontendError(message: string, source?: string) {
  await getQuickNoteBridge().reportFrontendError(message, source);
}
