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

export type NotificationPermissionResult = {
  allowed: boolean;
};

export type RichTextClipboardContent = {
  html: string;
  text: string;
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
  allowBelowMinimum?: boolean;
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
      desktopPinned?: boolean;
      minimumSize?: DragPreviewSize;
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
      desktopPinned?: boolean;
      minimumSize?: DragPreviewSize;
    };

export type HotkeyRegistrationState = {
  shortcut: string;
  registration: "registered" | "conflict" | "unsupported";
  message?: string;
};

export type FloatingCardsState = {
  noteIds: string[];
  pinnedNoteIds?: string[];
  pinnedTodoIds?: string[];
  todoIds: string[];
};

export type FloatingCardReference = {
  kind: DragPreviewPayload["kind"];
  id: string;
};

export type DesktopWidgetRequestResult = {
  requested: boolean;
  requiresSystemPlacement: boolean;
  message?: string;
};

export type DesktopWidgetState = {
  requested: boolean;
  systemManaged: boolean;
};

export type DesktopPinResult = {
  pinned: boolean;
  launchAtLoginEnabled: boolean;
  requiresLaunchAtLogin: boolean;
};

export type LaunchAtLoginStatus = {
  enabled: boolean;
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
  "floating-dock-zone-enter": {
    kind: string;
    id: string;
    source?: "preview" | "floating";
    clientX?: number;
    clientY?: number;
  };
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
  getLaunchAtLoginStatus?: () => Promise<LaunchAtLoginStatus>;
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
  setFloatingCardDesktopPinned?: (card: FloatingCardReference, pinned: boolean) => Promise<DesktopPinResult>;
  requestDesktopWidget?: (card: FloatingCardReference) => Promise<DesktopWidgetRequestResult>;
  removeDesktopWidgetAssociation?: (card: FloatingCardReference) => Promise<void>;
  getDesktopWidgetState?: (card: FloatingCardReference) => Promise<DesktopWidgetState>;
  openNotificationSettings: () => Promise<void>;
  checkNotificationPermission?: (options?: { language?: string }) => Promise<NotificationPermissionResult>;
  sendNotification: (request: NotificationRequest) => Promise<void>;
  showNotification: (request: NotificationRequest) => Promise<void>;
  scheduleNotification: (request: NotificationRequest) => Promise<void>;
  openTextColorPanel: (options: { color?: string; requestId: string }) => Promise<void>;
  pickScreenColor?: () => Promise<ScreenColorPickResult | null>;
  testReminderNotification: (options?: { soundEnabled?: boolean; language?: string }) => Promise<void>;
  getHotkeyRegistrationState: () => Promise<HotkeyRegistrationState>;
  readClipboardText: () => Promise<string>;
  readClipboardRichText?: () => Promise<RichTextClipboardContent>;
  writeClipboardText: (text: string) => Promise<void>;
  writeClipboardRichText?: (html: string, text: string) => Promise<void>;
  registerHotkey: (shortcut: string | ShortcutConfig) => Promise<void>;
  registerGlobalShortcut: (shortcut: string | ShortcutConfig) => Promise<void>;
  unregisterHotkey: () => Promise<void>;
  setEditableInputActive: (active: boolean) => void | Promise<void>;
  setTextCompositionActive: (active: boolean) => void | Promise<void>;
  setWindowTheme?: (theme: string) => void | Promise<void>;
  openDevTools: () => Promise<void>;
  uninstallApplication?: () => Promise<void>;
  quitApplication: () => Promise<void>;
  reportFrontendReady: () => void | Promise<void>;
  reportFrontendError: (message: string, source?: string) => void | Promise<void>;
};

export const hostEventNames = {
  panelPosition: "floatem:panel-position",
  panelWillOpen: "floatem:panel-will-open",
  hotkeyRegistrationState: "floatem:hotkey-registration-state",
  textColorPanelOpen: "floatem:text-color-panel-open",
  textColorPanelChange: "floatem:text-color-panel-change",
  textColorPanelClose: "floatem:text-color-panel-close",
  notesUpdated: "floatem:notes-updated",
  todosUpdated: "floatem:todos-updated",
  floatingCardsState: "floatem:floating-cards-state",
  shortcutInvoked: "floatem:shortcut-invoked",
  floatingDockZoneEnter: "floatem:floating-dock-zone-enter",
  floatingDockZoneLeave: "floatem:floating-dock-zone-leave",
} as const;
