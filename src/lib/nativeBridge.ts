import type { AppLanguage, AppSettings, NoteCard, NotesDocument, PanelPosition, RawLoadAllResult, TodoItem } from "./models";
import { DEFAULT_SETTINGS, normalizeAppSettings, normalizeNotesDocument } from "./models";

const NOTES_STORAGE_KEY = "quicknote.notes";
const TODOS_STORAGE_KEY = "quicknote.todos";
const SETTINGS_STORAGE_KEY = "quicknote.settings";

export const PANEL_POSITION_EVENT = "quicknote:panel-position";
export const PANEL_WILL_OPEN_EVENT = "quicknote:panel-will-open";
export const TEXT_COLOR_PANEL_OPEN_EVENT = "quicknote:text-color-panel-open";
export const TEXT_COLOR_PANEL_CHANGE_EVENT = "quicknote:text-color-panel-change";
export const TEXT_COLOR_PANEL_CLOSE_EVENT = "quicknote:text-color-panel-close";
export const TODOS_UPDATED_EVENT = "quicknote:todos-updated";

export type TextColorPanelChangeDetail = {
  color: string;
  requestId: string;
};

export type TextColorPanelCloseDetail = {
  requestId: string;
};

export type QuickNoteNativeBridge = {
  platform: "macos-appkit-wkwebview";
  loadAllData: () => Promise<RawLoadAllResult>;
  saveNotes: (notes: NotesDocument) => Promise<void>;
  saveTodos: (todos: TodoItem[]) => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  openNotificationSettings: () => Promise<void>;
  openTextColorPanel: (options: { color?: string; requestId: string }) => Promise<void>;
  testReminderNotification: (options?: {
    soundEnabled?: boolean;
    language?: AppLanguage;
  }) => Promise<void>;
  readClipboardText: () => Promise<string>;
  registerHotkey: (shortcut: string) => Promise<void>;
  setEditableInputActive: (active: boolean) => void | Promise<void>;
  setTextCompositionActive: (active: boolean) => void | Promise<void>;
  writeClipboardText: (text: string) => Promise<void>;
  hidePanelWindow: () => Promise<void>;
  startWindowDrag: () => Promise<void>;
  reportFrontendReady: () => void | Promise<void>;
  reportFrontendError: (message: string, source?: string) => void | Promise<void>;
};

declare global {
  interface Window {
    quickNoteNative?: QuickNoteNativeBridge;
  }
}

function readStoredValue<T>(key: string, fallback: T) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
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

const browserBridge: QuickNoteNativeBridge = {
  platform: "macos-appkit-wkwebview",
  async loadAllData() {
    const settings = readStoredValue<Partial<AppSettings>>(SETTINGS_STORAGE_KEY, {});

    return {
      notes: normalizeNotesDocument(readStoredValue<NoteCard[] | NotesDocument>(NOTES_STORAGE_KEY, [])),
      todos: readStoredValue<TodoItem[]>(TODOS_STORAGE_KEY, []),
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
    // Browser preview cannot open macOS System Settings.
  },
  async openTextColorPanel() {
    // Browser preview uses the HTML color input fallback.
  },
  async testReminderNotification() {
    // Browser preview cannot send native notifications.
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
  async hidePanelWindow() {
    // Browser preview keeps the current tab visible.
  },
  async startWindowDrag() {
    // Browser preview uses the normal browser window chrome.
  },
  reportFrontendReady() {
    // Browser preview does not need to coordinate with a native host.
  },
  reportFrontendError() {
    // Browser preview can rely on the regular browser console.
  },
};

export function isNativeQuickNoteHost() {
  return typeof window !== "undefined" && typeof window.quickNoteNative?.loadAllData === "function";
}

export function getQuickNoteBridge() {
  return isNativeQuickNoteHost() ? window.quickNoteNative! : browserBridge;
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

export function subscribeToTodosUpdated(listener: (todos: TodoItem[]) => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<TodoItem[]>).detail;
    if (!Array.isArray(detail)) {
      return;
    }

    listener(detail);
  };

  window.addEventListener(TODOS_UPDATED_EVENT, handler as EventListener);

  return () => {
    window.removeEventListener(TODOS_UPDATED_EVENT, handler as EventListener);
  };
}
