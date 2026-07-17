import type {
  DragPreviewPayload,
  FloatingCardReference,
  FloatingCardsState,
  HostBridge,
  HostCapabilities,
  HotkeyRegistrationState,
  NotificationRequest,
  ShortcutConfig,
} from "@stickit/native-bridge";
import { hostEventNames } from "@stickit/native-bridge";
import type {
  AppLanguage,
  AppSettings,
  NoteCard,
  NotesDocument,
  PanelPosition,
  RawLoadAllResult,
  StoredTodosData,
  TodosDocument,
} from "./models";
import { DEFAULT_SETTINGS, normalizeAppSettings, normalizeNotesDocument, normalizeTodosDocument } from "./models";

const NOTES_STORAGE_KEY = "stickit.notes";
const TODOS_STORAGE_KEY = "stickit.todos";
const SETTINGS_STORAGE_KEY = "stickit.settings";
const LEGACY_STORAGE_PREFIX = "quicknote.";

export const PANEL_POSITION_EVENT = hostEventNames.panelPosition;
export const PANEL_WILL_OPEN_EVENT = hostEventNames.panelWillOpen;
export const HOTKEY_REGISTRATION_STATE_EVENT = hostEventNames.hotkeyRegistrationState;
export const TEXT_COLOR_PANEL_OPEN_EVENT = hostEventNames.textColorPanelOpen;
export const TEXT_COLOR_PANEL_CHANGE_EVENT = hostEventNames.textColorPanelChange;
export const TEXT_COLOR_PANEL_CLOSE_EVENT = hostEventNames.textColorPanelClose;
export const NOTES_UPDATED_EVENT = hostEventNames.notesUpdated;
export const TODOS_UPDATED_EVENT = hostEventNames.todosUpdated;
export const FLOATING_CARDS_STATE_EVENT = hostEventNames.floatingCardsState;
export const FLOATING_DOCK_ZONE_ENTER_EVENT = hostEventNames.floatingDockZoneEnter;
export const FLOATING_DOCK_ZONE_LEAVE_EVENT = hostEventNames.floatingDockZoneLeave;

export type TextColorPanelChangeDetail = {
  color: string;
  requestId: string;
};

export type TextColorPanelCloseDetail = {
  requestId: string;
};

export type StickItNativeBridge = HostBridge<RawLoadAllResult, NotesDocument, TodosDocument, Partial<AppSettings>> & {
  testReminderNotification: (options?: {
    soundEnabled?: boolean;
    language?: AppLanguage;
  }) => Promise<void>;
  getHotkeyRegistrationState: () => Promise<HotkeyRegistrationState>;
  registerHotkey: (shortcut: string | ShortcutConfig) => Promise<void>;
  hidePanelWindow: () => Promise<void>;
};

declare global {
  interface Window {
    stickItHost?: StickItNativeBridge;
    stickItNative?: StickItNativeBridge;
  }
}

function readStoredValue<T>(key: string, fallback: T) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const legacyKey = `${LEGACY_STORAGE_PREFIX}${key.slice(key.indexOf(".") + 1)}`;
    const rawValue = window.localStorage.getItem(key) ?? window.localStorage.getItem(legacyKey);
    if (!rawValue) {
      return fallback;
    }

    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

function writeStoredValue(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore browser storage failures in preview mode.
  }
}

const browserBridge: StickItNativeBridge = {
  platform: "web",
  async getCapabilities(): Promise<HostCapabilities> {
    return {
      platform: "web",
      runtime: "browser",
      capabilities: {
        "window.show": false,
        "window.hide": false,
        "window.toggle": false,
        "window.alwaysOnTop": false,
        "window.dragPreview": false,
        "window.floatingCards": false,
        "notifications.send": false,
        "notifications.schedule": false,
        "notifications.openSettings": false,
        "shortcuts.global": false,
        "settings.persist": true,
        "clipboard.read": Boolean(navigator.clipboard?.readText),
        "clipboard.write": Boolean(navigator.clipboard?.writeText),
        "devtools.open": false,
        "app.quit": false,
      },
      limitations: ["Browser preview cannot control native windows, global shortcuts, or system notification scheduling."],
    };
  },
  async loadAllData() {
    const settings = readStoredValue<Partial<AppSettings>>(SETTINGS_STORAGE_KEY, {});

    return {
      notes: normalizeNotesDocument(readStoredValue<NoteCard[] | NotesDocument>(NOTES_STORAGE_KEY, [])),
      todos: normalizeTodosDocument(readStoredValue<StoredTodosData>(TODOS_STORAGE_KEY, [])),
      settings: normalizeAppSettings({
        ...DEFAULT_SETTINGS,
        ...settings,
      }),
    };
  },
  async saveNotes(notes) {
    writeStoredValue(NOTES_STORAGE_KEY, notes);
  },
  async saveTodos(todos) {
    writeStoredValue(TODOS_STORAGE_KEY, todos);
  },
  async saveSettings(settings) {
    writeStoredValue(SETTINGS_STORAGE_KEY, settings);
  },
  async openNotificationSettings() {
    // Browser preview cannot open native notification settings.
  },
  async sendNotification(request: NotificationRequest) {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") {
      return;
    }

    new Notification(request.title, { body: request.body, silent: request.soundEnabled === false });
  },
  async showNotification(request: NotificationRequest) {
    await this.sendNotification(request);
  },
  async scheduleNotification() {
    // Browser preview does not own a reliable background scheduler.
  },
  async openTextColorPanel() {
    // Browser preview uses the HTML color input fallback.
  },
  async pickScreenColor() {
    return null;
  },
  async testReminderNotification() {
    // Browser preview cannot send native notifications.
  },
  async getHotkeyRegistrationState() {
    return {
      shortcut: DEFAULT_SETTINGS.hotkey,
      registration: "unsupported",
      message: "Browser preview does not support global shortcuts.",
    } satisfies HotkeyRegistrationState;
  },
  async readClipboardText() {
    if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
      return "";
    }

    try {
      return await navigator.clipboard.readText();
    } catch {
      return "";
    }
  },
  async registerHotkey() {
    // Browser preview does not support global shortcuts.
  },
  async registerGlobalShortcut(shortcut) {
    await this.registerHotkey(shortcut);
  },
  async unregisterHotkey() {
    // Browser preview does not support global shortcuts.
  },
  async setEditableInputActive() {
    // Browser preview does not need native activation-policy coordination.
  },
  async setTextCompositionActive() {
    // Browser preview does not need native IME window-level coordination.
  },
  async writeClipboardText(text) {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Ignore preview clipboard failures.
    }
  },
  async showWindow() {
    // Browser preview keeps the current tab visible.
  },
  async hideWindow() {
    // Browser preview keeps the current tab visible.
  },
  async toggleWindow() {
    // Browser preview keeps the current tab visible.
  },
  async setAlwaysOnTop() {
    // Browser preview cannot set native window levels.
  },
  async showDragPreview(_payload: DragPreviewPayload) {
    // Browser preview keeps drag overlays inside the current tab.
  },
  async hideDragPreview() {
    // Browser preview keeps drag overlays inside the current tab.
  },
  async showFloatingCard(_payload: DragPreviewPayload) {
    // Browser preview does not open separate floating card windows.
  },
  async closeFloatingCard(_card: FloatingCardReference) {
    // Browser preview does not open separate floating card windows.
  },
  async resizeFloatingCard() {
    // Browser preview does not open separate floating card windows.
  },
  async getFloatingCardScreenPlacement() {
    return null;
  },
  async startFloatingCardDrag(_card: FloatingCardReference) {
    // Browser preview does not open separate floating card windows.
  },
  async hidePanelWindow() {
    await this.hideWindow();
  },
  async quitApplication() {
    // Browser preview cannot terminate a native macOS app.
  },
  async openDevTools() {
    // Browser devtools are controlled by the browser.
  },
  reportFrontendReady() {
    // Browser preview does not need to coordinate with a native host.
  },
  reportFrontendError() {
    // Browser preview can rely on the regular browser console.
  },
};

export function isNativeStickItHost() {
  return (
    typeof window !== "undefined" &&
    (typeof window.stickItHost?.loadAllData === "function" ||
      typeof window.stickItNative?.loadAllData === "function")
  );
}

export function getStickItBridge() {
  if (typeof window !== "undefined") {
    return window.stickItHost ?? window.stickItNative ?? browserBridge;
  }

  return browserBridge;
}

export function subscribeToPanelPosition(listener: (position: PanelPosition) => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<PanelPosition>).detail;
    if (!detail) {
      return;
    }

    listener(detail);
  };

  window.addEventListener(PANEL_POSITION_EVENT, handler as EventListener);

  return () => {
    window.removeEventListener(PANEL_POSITION_EVENT, handler as EventListener);
  };
}

export function subscribeToPanelWillOpen(listener: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = () => {
    listener();
  };

  window.addEventListener(PANEL_WILL_OPEN_EVENT, handler);

  return () => {
    window.removeEventListener(PANEL_WILL_OPEN_EVENT, handler);
  };
}

export function subscribeToHotkeyRegistrationState(listener: (state: HotkeyRegistrationState) => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<HotkeyRegistrationState>).detail;

    if (!detail || typeof detail.shortcut !== "string" || typeof detail.registration !== "string") {
      return;
    }

    listener(detail);
  };

  window.addEventListener(HOTKEY_REGISTRATION_STATE_EVENT, handler as EventListener);

  return () => {
    window.removeEventListener(HOTKEY_REGISTRATION_STATE_EVENT, handler as EventListener);
  };
}

export function dispatchTextColorPanelOpen() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(TEXT_COLOR_PANEL_OPEN_EVENT));
}

export function subscribeToTextColorPanelOpen(listener: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = () => {
    listener();
  };

  window.addEventListener(TEXT_COLOR_PANEL_OPEN_EVENT, handler);

  return () => {
    window.removeEventListener(TEXT_COLOR_PANEL_OPEN_EVENT, handler);
  };
}

export function subscribeToTextColorPanelChange(listener: (detail: TextColorPanelChangeDetail) => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<TextColorPanelChangeDetail>).detail;

    if (!detail?.requestId || typeof detail.color !== "string" || !detail.color) {
      return;
    }

    listener(detail);
  };

  window.addEventListener(TEXT_COLOR_PANEL_CHANGE_EVENT, handler as EventListener);

  return () => {
    window.removeEventListener(TEXT_COLOR_PANEL_CHANGE_EVENT, handler as EventListener);
  };
}

export function subscribeToTextColorPanelClose(listener: (detail: TextColorPanelCloseDetail) => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<TextColorPanelCloseDetail>).detail;

    if (!detail?.requestId) {
      return;
    }

    listener(detail);
  };

  window.addEventListener(TEXT_COLOR_PANEL_CLOSE_EVENT, handler as EventListener);

  return () => {
    window.removeEventListener(TEXT_COLOR_PANEL_CLOSE_EVENT, handler as EventListener);
  };
}

export function subscribeToNotesUpdated(listener: (notes: NoteCard[] | NotesDocument) => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<NoteCard[] | NotesDocument>).detail;
    if (!Array.isArray(detail) && (!detail || typeof detail !== "object")) {
      return;
    }

    listener(detail);
  };

  window.addEventListener(NOTES_UPDATED_EVENT, handler as EventListener);

  return () => {
    window.removeEventListener(NOTES_UPDATED_EVENT, handler as EventListener);
  };
}

export function subscribeToTodosUpdated(listener: (todos: StoredTodosData) => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<StoredTodosData>).detail;
    if (!Array.isArray(detail) && (!detail || typeof detail !== "object")) {
      return;
    }

    listener(detail);
  };

  window.addEventListener(TODOS_UPDATED_EVENT, handler as EventListener);

  return () => {
    window.removeEventListener(TODOS_UPDATED_EVENT, handler as EventListener);
  };
}

export function subscribeToFloatingCardsState(listener: (state: FloatingCardsState) => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<FloatingCardsState>).detail;
    if (!detail || !Array.isArray(detail.noteIds) || !Array.isArray(detail.todoIds)) {
      return;
    }

    listener({
      noteIds: detail.noteIds.filter((id): id is string => typeof id === "string" && id.length > 0),
      todoIds: detail.todoIds.filter((id): id is string => typeof id === "string" && id.length > 0),
    });
  };

  window.addEventListener(FLOATING_CARDS_STATE_EVENT, handler as EventListener);

  return () => {
    window.removeEventListener(FLOATING_CARDS_STATE_EVENT, handler as EventListener);
  };
}

export type DockZoneEventDetail = { kind: string; id: string };

export function subscribeToFloatingDockZoneEnter(listener: (detail: DockZoneEventDetail) => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<DockZoneEventDetail>).detail;
    if (!detail || typeof detail.kind !== "string" || typeof detail.id !== "string") {
      return;
    }

    listener({ kind: detail.kind, id: detail.id });
  };

  window.addEventListener(FLOATING_DOCK_ZONE_ENTER_EVENT, handler as EventListener);

  return () => {
    window.removeEventListener(FLOATING_DOCK_ZONE_ENTER_EVENT, handler as EventListener);
  };
}

export function subscribeToFloatingDockZoneLeave(listener: (detail: DockZoneEventDetail) => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<DockZoneEventDetail>).detail;
    if (!detail || typeof detail.kind !== "string" || typeof detail.id !== "string") {
      return;
    }

    listener({ kind: detail.kind, id: detail.id });
  };

  window.addEventListener(FLOATING_DOCK_ZONE_LEAVE_EVENT, handler as EventListener);

  return () => {
    window.removeEventListener(FLOATING_DOCK_ZONE_LEAVE_EVENT, handler as EventListener);
  };
}
