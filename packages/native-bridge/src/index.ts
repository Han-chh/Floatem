export type HostPlatform = "web" | "macos" | "windows";

export type HostCapability =
  | "window.show"
  | "window.hide"
  | "window.toggle"
  | "window.alwaysOnTop"
  | "notifications.send"
  | "notifications.schedule"
  | "notifications.openSettings"
  | "shortcuts.global"
  | "settings.persist"
  | "clipboard.read"
  | "clipboard.write"
  | "devtools.open"
  | "app.quit";

export type HostCapabilities = {
  platform: HostPlatform;
  runtime: string;
  capabilities: Record<HostCapability, boolean>;
  limitations?: string[];
};

export type NotificationRequest = {
  id?: string;
  title: string;
  body: string;
  soundEnabled?: boolean;
  scheduledAt?: number;
  data?: Record<string, unknown>;
};

export type ShortcutConfig = {
  shortcut: string;
};

export type HostEventMap = {
  "panel-position": { x: number; y: number };
  "panel-will-open": undefined;
  "text-color-panel-open": undefined;
  "text-color-panel-change": { color: string; requestId: string };
  "text-color-panel-close": { requestId: string };
  "todos-updated": unknown;
  "shortcut-invoked": { shortcut: string };
};

export type HostEventName = keyof HostEventMap;

export type HostEventListener<TName extends HostEventName> = (detail: HostEventMap[TName]) => void;

export type HostBridge<TLoadAllResult, TNotes, TTodos, TSettings> = {
  platform: HostPlatform;
  getCapabilities: () => Promise<HostCapabilities>;
  loadAllData: () => Promise<TLoadAllResult>;
  saveNotes: (notes: TNotes) => Promise<void>;
  saveTodos: (todos: TTodos) => Promise<void>;
  saveSettings: (settings: TSettings) => Promise<void>;
  showWindow: () => Promise<void>;
  hideWindow: () => Promise<void>;
  toggleWindow: () => Promise<void>;
  setAlwaysOnTop: (enabled: boolean) => Promise<void>;
  openNotificationSettings: () => Promise<void>;
  sendNotification: (request: NotificationRequest) => Promise<void>;
  showNotification: (request: NotificationRequest) => Promise<void>;
  scheduleNotification: (request: NotificationRequest) => Promise<void>;
  openTextColorPanel: (options: { color?: string; requestId: string }) => Promise<void>;
  testReminderNotification: (options?: { soundEnabled?: boolean; language?: string }) => Promise<void>;
  readClipboardText: () => Promise<string>;
  writeClipboardText: (text: string) => Promise<void>;
  registerHotkey: (shortcut: string | ShortcutConfig) => Promise<void>;
  registerGlobalShortcut: (shortcut: string | ShortcutConfig) => Promise<void>;
  unregisterHotkey: () => Promise<void>;
  setEditableInputActive: (active: boolean) => void | Promise<void>;
  setTextCompositionActive: (active: boolean) => void | Promise<void>;
  openDevTools: () => Promise<void>;
  quitApplication: () => Promise<void>;
  reportFrontendReady: () => void | Promise<void>;
  reportFrontendError: (message: string, source?: string) => void | Promise<void>;
};

export const hostEventNames = {
  panelPosition: "quicknote:panel-position",
  panelWillOpen: "quicknote:panel-will-open",
  textColorPanelOpen: "quicknote:text-color-panel-open",
  textColorPanelChange: "quicknote:text-color-panel-change",
  textColorPanelClose: "quicknote:text-color-panel-close",
  todosUpdated: "quicknote:todos-updated",
  shortcutInvoked: "quicknote:shortcut-invoked",
} as const;
