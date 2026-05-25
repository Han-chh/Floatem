import type {
  DragPreviewPayload,
  FloatingCardReference,
  FloatingCardResize,
  FloatingCardScreenPlacement,
} from "@quicknote/native-bridge";
import type { AppSettings, LoadAllResult, NotesDocument, TodosDocument } from "../lib/models";
import { normalizeNotesDocument, normalizeTodosDocument } from "../lib/models";
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
    todos: normalizeTodosDocument(result.todos),
  };
}

export async function saveNotes(notes: NotesDocument) {
  await getQuickNoteBridge().saveNotes(notes);
}

export async function saveTodos(todos: TodosDocument) {
  await getQuickNoteBridge().saveTodos(todos);
}

export async function saveSettings(settings: Partial<AppSettings>) {
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

export async function showDragPreview(payload: DragPreviewPayload) {
  await getQuickNoteBridge().showDragPreview(payload);
}

export async function hideDragPreview() {
  await getQuickNoteBridge().hideDragPreview();
}

export async function showFloatingCard(payload: DragPreviewPayload) {
  await getQuickNoteBridge().showFloatingCard(payload);
}

export async function closeFloatingCard(card: FloatingCardReference) {
  await getQuickNoteBridge().closeFloatingCard(card);
}

export async function resizeFloatingCard(size: FloatingCardResize) {
  await getQuickNoteBridge().resizeFloatingCard(size);
}

export async function getFloatingCardScreenPlacement(): Promise<FloatingCardScreenPlacement | null> {
  return await getQuickNoteBridge().getFloatingCardScreenPlacement();
}

export async function startFloatingCardDrag(card: FloatingCardReference) {
  await getQuickNoteBridge().startFloatingCardDrag(card);
}
