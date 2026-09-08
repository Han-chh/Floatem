import type {
  DragPreviewPayload,
  FloatingCardReference,
  FloatingCardResize,
  FloatingCardScreenPlacement,
} from "@floatem/native-bridge";
import type { AppSettings, LoadAllResult, NotesDocument, TodosDocument } from "../lib/models";
import { normalizeNotesDocument, normalizeTodosDocument } from "../lib/models";
import {
  getFloatemBridge,
  isNativeFloatemHost,
  type FloatingCardGuideState,
  type FloatemNativeBridge,
} from "../lib/nativeBridge";
import { canUseFloatingNotes, canUseFloatingTodos } from "../lib/platformFeatures";

export function usePlatform() {
  const isNativeHost = isNativeFloatemHost();

  return {
    isNativeHost,
    platformLabel: isNativeHost ? "Native desktop host" : "Browser preview",
  };
}

export async function loadAllData(): Promise<LoadAllResult> {
  const result = await getFloatemBridge().loadAllData();

  return {
    ...result,
    notes: normalizeNotesDocument(result.notes),
    todos: normalizeTodosDocument(result.todos),
  };
}

export async function saveNotes(notes: NotesDocument) {
  await getFloatemBridge().saveNotes(notes);
}

export async function saveTodos(todos: TodosDocument) {
  await getFloatemBridge().saveTodos(todos);
}

export async function saveSettings(settings: Partial<AppSettings>) {
  await getFloatemBridge().saveSettings(settings);
}

export async function getLaunchAtLoginStatus() {
  return await getFloatemBridge().getLaunchAtLoginStatus?.() ?? null;
}

export async function getBackgroundActivityStatus() {
  return await getFloatemBridge().getBackgroundActivityStatus?.() ?? {
    activationEpoch: 0,
    enabled: true,
    status: "enabled" as const,
  };
}

export async function openBackgroundActivitySettings() {
  await getFloatemBridge().openBackgroundActivitySettings?.();
}

export async function registerHotkey(shortcut: string) {
  await getFloatemBridge().registerHotkey(shortcut);
}

export async function getHotkeyRegistrationState() {
  return await getFloatemBridge().getHotkeyRegistrationState();
}

export async function setEditableInputActive(active: boolean) {
  await getFloatemBridge().setEditableInputActive(active);
}

export async function setTextCompositionActive(active: boolean) {
  await getFloatemBridge().setTextCompositionActive(active);
}

export async function hidePanelWindow() {
  await getFloatemBridge().hideWindow();
}

export async function reportFrontendReady() {
  await getFloatemBridge().reportFrontendReady();
}

export async function reportFrontendError(message: string, source?: string) {
  await getFloatemBridge().reportFrontendError(message, source);
}

export async function showDragPreview(payload: DragPreviewPayload) {
  if (!canUseFloatingPayload(payload)) {
    return;
  }

  const bridge = getFloatemBridge() as Partial<FloatemNativeBridge>;
  await bridge.showDragPreview?.(payload);
}

export async function hideDragPreview() {
  const bridge = getFloatemBridge() as Partial<FloatemNativeBridge>;
  await bridge.hideDragPreview?.();
}

export async function showFloatingCard(payload: DragPreviewPayload) {
  if (!canUseFloatingPayload(payload)) {
    return;
  }

  const bridge = getFloatemBridge() as Partial<FloatemNativeBridge>;
  await bridge.showFloatingCard?.(payload);
}

export async function closeFloatingCard(card: FloatingCardReference) {
  const bridge = getFloatemBridge() as Partial<FloatemNativeBridge>;
  await bridge.closeFloatingCard?.(card);
}

export async function resizeFloatingCard(size: FloatingCardResize) {
  const bridge = getFloatemBridge() as Partial<FloatemNativeBridge>;
  await bridge.resizeFloatingCard?.(size);
}

export async function getFloatingCardScreenPlacement(): Promise<FloatingCardScreenPlacement | null> {
  const bridge = getFloatemBridge() as Partial<FloatemNativeBridge>;
  return (await bridge.getFloatingCardScreenPlacement?.()) ?? null;
}

export async function startFloatingCardDrag(card: FloatingCardReference) {
  const bridge = getFloatemBridge() as Partial<FloatemNativeBridge>;
  await bridge.startFloatingCardDrag?.(card);
}

export async function setFloatingCardDesktopPinned(card: FloatingCardReference, pinned: boolean) {
  const bridge = getFloatemBridge() as Partial<FloatemNativeBridge>;
  return (await bridge.setFloatingCardDesktopPinned?.(card, pinned)) ?? {
    pinned,
    launchAtLoginEnabled: false,
    requiresLaunchAtLogin: pinned,
  };
}

export async function setFloatingCardGuide(card: FloatingCardReference, guide: FloatingCardGuideState | null) {
  const bridge = getFloatemBridge() as Partial<FloatemNativeBridge>;
  await bridge.setFloatingCardGuide?.(card, guide);
}

export async function clearFloatingCardGuides() {
  const bridge = getFloatemBridge() as Partial<FloatemNativeBridge>;
  await bridge.clearFloatingCardGuides?.();
}

export async function requestDesktopWidget(card: FloatingCardReference) {
  const bridge = getFloatemBridge() as Partial<FloatemNativeBridge>;
  if (bridge.requestDesktopWidget) {
    return await bridge.requestDesktopWidget(card);
  }
  await bridge.setFloatingCardDesktopPinned?.(card, true);
  return { requested: true, requiresSystemPlacement: false };
}

export async function removeDesktopWidgetAssociation(card: FloatingCardReference) {
  const bridge = getFloatemBridge() as Partial<FloatemNativeBridge>;
  if (bridge.removeDesktopWidgetAssociation) {
    await bridge.removeDesktopWidgetAssociation(card);
    return;
  }
  await bridge.setFloatingCardDesktopPinned?.(card, false);
}

function canUseFloatingPayload(payload: DragPreviewPayload) {
  return payload.kind === "note" ? canUseFloatingNotes() : canUseFloatingTodos();
}
