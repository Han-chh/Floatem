import type {
  DragPreviewPayload,
  FloatingCardReference,
  FloatingCardResize,
  FloatingCardScreenPlacement,
} from "@quicknote/native-bridge";
import type { AppSettings, LoadAllResult, NotesDocument, TodosDocument } from "../lib/models";
import { normalizeNotesDocument, normalizeTodosDocument } from "../lib/models";
import { getQuickNoteBridge, isNativeQuickNoteHost, type QuickNoteNativeBridge } from "../lib/nativeBridge";
import { canUseFloatingNotes, canUseFloatingTodos } from "../lib/platformFeatures";

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
  if (!canUseFloatingPayload(payload)) {
    return;
  }

  const bridge = getQuickNoteBridge() as Partial<QuickNoteNativeBridge>;
  await bridge.showDragPreview?.(payload);
}

export async function hideDragPreview() {
  const bridge = getQuickNoteBridge() as Partial<QuickNoteNativeBridge>;
  await bridge.hideDragPreview?.();
}

export async function showFloatingCard(payload: DragPreviewPayload) {
  if (!canUseFloatingPayload(payload)) {
    return;
  }

  const bridge = getQuickNoteBridge() as Partial<QuickNoteNativeBridge>;
  await bridge.showFloatingCard?.(payload);
}

export async function closeFloatingCard(card: FloatingCardReference) {
  const bridge = getQuickNoteBridge() as Partial<QuickNoteNativeBridge>;
  await bridge.closeFloatingCard?.(card);
}

export async function resizeFloatingCard(size: FloatingCardResize) {
  const bridge = getQuickNoteBridge() as Partial<QuickNoteNativeBridge>;
  await bridge.resizeFloatingCard?.(size);
}

export async function getFloatingCardScreenPlacement(): Promise<FloatingCardScreenPlacement | null> {
  const bridge = getQuickNoteBridge() as Partial<QuickNoteNativeBridge>;
  return (await bridge.getFloatingCardScreenPlacement?.()) ?? null;
}

export async function startFloatingCardDrag(card: FloatingCardReference) {
  const bridge = getQuickNoteBridge() as Partial<QuickNoteNativeBridge>;
  await bridge.startFloatingCardDrag?.(card);
}

function canUseFloatingPayload(payload: DragPreviewPayload) {
  return payload.kind === "note" ? canUseFloatingNotes() : canUseFloatingTodos();
}
