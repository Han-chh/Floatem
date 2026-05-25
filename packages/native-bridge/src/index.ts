export type HostPlatform = "web" | "macos" | "windows";

export type HostCapability =
  | "window.show"
  | "window.hide"
  | "window.toggle"
  | "window.alwaysOnTop"
  | "window.dragPreview"
  | "window.floatingCards"
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

export type DragPreviewSize = {
  width: number;
  height: number;
};

export type FloatingCardResize = DragPreviewSize & {
  anchor?: "top" | "bottom";
  horizontalAnchor?: "left" | "right";
};

export type DragPreviewPointerOffset = {
  x: number;
  y: number;
};

export type FloatingCardScreenRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type FloatingCardScreenPlacement = {
  cardFrame: FloatingCardScreenRect;
  availableFrame: FloatingCardScreenRect;
};

export type DragPreviewGroupSnapshot = {
  id: string;
  name: string;
  color: string;
};

export type NoteDragPreviewCard = {
  id: string;
  title: string;
  dotColor: string;
  groupId: string | null;
  collapsed: boolean;
  content: unknown[];
  previewText: string;
  updatedAt: number;
};

export type TodoDragPreviewItem = {
  id: string;
  text: string;
  done: boolean;
  groupId: string | null;
  reminderAt: number | null;
  createdAt: number;
  dateKey: string;
};

export type DragPreviewPayload =
  | {
      kind: "note";
      language: string;
      size: DragPreviewSize;
      pointerOffset: DragPreviewPointerOffset;
      note: NoteDragPreviewCard;
      groups: DragPreviewGroupSnapshot[];
    }
  | {
      kind: "todo";
      language: string;
      timeZone: string;
      timeFormat: "24h" | "12h";
      size: DragPreviewSize;
      pointerOffset: DragPreviewPointerOffset;
      order?: number;
      todo: TodoDragPreviewItem;
      groups: DragPreviewGroupSnapshot[];
    };

export type HotkeyRegistrationState = {
  shortcut: string;
  registration: "registered" | "conflict" | "unsupported";
  message?: string;
};

export type FloatingCardsState = {
  noteIds: string[];
  todoIds: string[];
};

export type FloatingCardReference = {
  kind: DragPreviewPayload["kind"];
  id: string;
};

export type ScreenColorPickResult = {
  sRGBHex: string;
};

export type HostEventMap = {
  "panel-position": { x: number; y: number };
  "panel-will-open": undefined;
  "hotkey-registration-state": HotkeyRegistrationState;
  "text-color-panel-open": undefined;
  "text-color-panel-change": { color: string; requestId: string };
  "text-color-panel-close": { requestId: string };
  "notes-updated": unknown;
  "todos-updated": unknown;
  "floating-cards-state": FloatingCardsState;
  "shortcut-invoked": { shortcut: string };
  "floating-dock-zone-enter": { kind: string; id: string };
  "floating-dock-zone-leave": { kind: string; id: string };
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
  showDragPreview: (payload: DragPreviewPayload) => Promise<void>;
  hideDragPreview: () => Promise<void>;
  showFloatingCard: (payload: DragPreviewPayload) => Promise<void>;
  closeFloatingCard: (card: FloatingCardReference) => Promise<void>;
  resizeFloatingCard: (size: FloatingCardResize) => Promise<void>;
  getFloatingCardScreenPlacement: () => Promise<FloatingCardScreenPlacement | null>;
  startFloatingCardDrag: (card: FloatingCardReference) => Promise<void>;
  openNotificationSettings: () => Promise<void>;
  sendNotification: (request: NotificationRequest) => Promise<void>;
  showNotification: (request: NotificationRequest) => Promise<void>;
  scheduleNotification: (request: NotificationRequest) => Promise<void>;
  openTextColorPanel: (options: { color?: string; requestId: string }) => Promise<void>;
  pickScreenColor?: () => Promise<ScreenColorPickResult | null>;
  testReminderNotification: (options?: { soundEnabled?: boolean; language?: string }) => Promise<void>;
  getHotkeyRegistrationState: () => Promise<HotkeyRegistrationState>;
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
  hotkeyRegistrationState: "quicknote:hotkey-registration-state",
  textColorPanelOpen: "quicknote:text-color-panel-open",
  textColorPanelChange: "quicknote:text-color-panel-change",
  textColorPanelClose: "quicknote:text-color-panel-close",
  notesUpdated: "quicknote:notes-updated",
  todosUpdated: "quicknote:todos-updated",
  floatingCardsState: "quicknote:floating-cards-state",
  shortcutInvoked: "quicknote:shortcut-invoked",
  floatingDockZoneEnter: "quicknote:floating-dock-zone-enter",
  floatingDockZoneLeave: "quicknote:floating-dock-zone-leave",
} as const;
