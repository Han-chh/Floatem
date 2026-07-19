import type {
  DragPreviewPayload,
  FloatingCardReference,
  FloatingCardResize,
  FloatingCardScreenPlacement,
} from "@stickit/native-bridge";
import type { AppSettings, LoadAllResult, NotesDocument, TodosDocument } from "../lib/models";
import { normalizeNotesDocument, normalizeTodosDocument } from "../lib/models";
import { getStickItBridge, isNativeStickItHost, type StickItNativeBridge } from "../lib/nativeBridge";
import { canUseFloatingNotes, canUseFloatingTodos } from "../lib/platformFeatures";

export function usePlatform() {
  const isNativeHost = isNativeStickItHost();

  return {
    isNativeHost,
    platformLabel: isNativeHost ? "Native desktop host" : "Browser preview",
  };
}

export async function loadAllData(): Promise<LoadAllResult> {
  const result = await getStickItBridge().loadAllData();

  return {
    ...result,
    notes: normalizeNotesDocument(result.notes),
    todos: normalizeTodosDocument(result.todos),
  };
}

export async function saveNotes(notes: NotesDocument) {
  await getStickItBridge().saveNotes(notes);
}

export async function saveTodos(todos: TodosDocument) {
  await getStickItBridge().saveTodos(todos);
}

export async function saveSettings(settings: Partial<AppSettings>) {
  await getStickItBridge().saveSettings(settings);
}

export async function registerHotkey(shortcut: string) {
  await getStickItBridge().registerHotkey(shortcut);
}

export async function getHotkeyRegistrationState() {
  return await getStickItBridge().getHotkeyRegistrationState();
}

export async function setEditableInputActive(active: boolean) {
  await getStickItBridge().setEditableInputActive(active);
}

export async function setTextCompositionActive(active: boolean) {
  await getStickItBridge().setTextCompositionActive(active);
}

export async function hidePanelWindow() {
  await getStickItBridge().hideWindow();
}

export async function reportFrontendReady() {
  await getStickItBridge().reportFrontendReady();
}

export async function reportFrontendError(message: string, source?: string) {
  await getStickItBridge().reportFrontendError(message, source);
}

export async function showDragPreview(payload: DragPreviewPayload) {
  if (!canUseFloatingPayload(payload)) {
    return;
  }

  const bridge = getStickItBridge() as Partial<StickItNativeBridge>;
  await bridge.showDragPreview?.(payload);
}

export async function hideDragPreview() {
  const bridge = getStickItBridge() as Partial<StickItNativeBridge>;
  await bridge.hideDragPreview?.();
}

export async function showFloatingCard(payload: DragPreviewPayload) {
  if (!canUseFloatingPayload(payload)) {
    return;
  }

  const bridge = getStickItBridge() as Partial<StickItNativeBridge>;
  await bridge.showFloatingCard?.(payload);
}

export async function closeFloatingCard(card: FloatingCardReference) {
  const bridge = getStickItBridge() as Partial<StickItNativeBridge>;
  await bridge.closeFloatingCard?.(card);
}

export async function resizeFloatingCard(size: FloatingCardResize) {
  const bridge = getStickItBridge() as Partial<StickItNativeBridge>;
  await bridge.resizeFloatingCard?.(size);
}

export async function getFloatingCardScreenPlacement(): Promise<FloatingCardScreenPlacement | null> {
  const bridge = getStickItBridge() as Partial<StickItNativeBridge>;
  return (await bridge.getFloatingCardScreenPlacement?.()) ?? null;
}

export async function startFloatingCardDrag(card: FloatingCardReference) {
  const bridge = getStickItBridge() as Partial<StickItNativeBridge>;
  await bridge.startFloatingCardDrag?.(card);
}

export async function setFloatingCardDesktopPinned(card: FloatingCardReference, pinned: boolean) {
  const bridge = getStickItBridge() as Partial<StickItNativeBridge>;
  await bridge.setFloatingCardDesktopPinned?.(card, pinned);
}

export async function requestDesktopWidget(card: FloatingCardReference) {
  const bridge = getStickItBridge() as Partial<StickItNativeBridge>;
  if (bridge.requestDesktopWidget) {
    return await bridge.requestDesktopWidget(card);
  }
  await bridge.setFloatingCardDesktopPinned?.(card, true);
  return { requested: true, requiresSystemPlacement: true };
}

export async function removeDesktopWidgetAssociation(card: FloatingCardReference) {
  const bridge = getStickItBridge() as Partial<StickItNativeBridge>;
  if (bridge.removeDesktopWidgetAssociation) {
    await bridge.removeDesktopWidgetAssociation(card);
    return;
  }
  await bridge.setFloatingCardDesktopPinned?.(card, false);
}

function canUseFloatingPayload(payload: DragPreviewPayload) {
  return payload.kind === "note" ? canUseFloatingNotes() : canUseFloatingTodos();
}
