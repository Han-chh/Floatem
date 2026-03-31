import type { AppSettings, LoadAllResult, NoteCard, PanelPosition, TodoItem } from "./models";
import { DEFAULT_SETTINGS } from "./models";

const NOTES_STORAGE_KEY = "quicknote.notes";
const TODOS_STORAGE_KEY = "quicknote.todos";
const SETTINGS_STORAGE_KEY = "quicknote.settings";

export const PANEL_POSITION_EVENT = "quicknote:panel-position";

export type QuickNoteNativeBridge = {
  platform: "macos-appkit-wkwebview";
  loadAllData: () => Promise<LoadAllResult>;
  saveNotes: (cards: NoteCard[]) => Promise<void>;
  saveTodos: (todos: TodoItem[]) => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  registerHotkey: (shortcut: string) => Promise<void>;
  hidePanelWindow: () => Promise<void>;
  startWindowDrag: () => Promise<void>;
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
      notes: readStoredValue<NoteCard[]>(NOTES_STORAGE_KEY, []),
      todos: readStoredValue<TodoItem[]>(TODOS_STORAGE_KEY, []),
      settings: {
        ...DEFAULT_SETTINGS,
        ...settings,
      },
    };
  },
  async saveNotes(cards) {
    writeStoredValue(NOTES_STORAGE_KEY, cards);
  },
  async saveTodos(todos) {
    writeStoredValue(TODOS_STORAGE_KEY, todos);
  },
  async saveSettings(settings) {
    writeStoredValue(SETTINGS_STORAGE_KEY, settings);
  },
  async registerHotkey() {
    // Browser preview does not support global shortcuts.
  },
  async hidePanelWindow() {
    // Browser preview keeps the current tab visible.
  },
  async startWindowDrag() {
    // Browser preview uses the normal browser window chrome.
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
