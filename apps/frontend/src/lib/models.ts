import type { Descendant } from "slate";

export type TabId = "notes" | "todos";
export type AppLanguage = "en" | "zh-CN";
export type DefaultOpenSection = "last" | TabId;
export type TransitionStyle = "page" | "slide" | "lift";
export type AnimationSpeed = "rapid" | "mediate" | "slow";
export type TimeFormat = "24h" | "12h";
export type ThemeId = "classic" | "forest" | "orchid" | "plum" | "chrysanthemum" | "night";
export type LightThemeId = Exclude<ThemeId, "night">;
export type ThemeMode = "manual" | "system";

export type PanelPosition = {
  x: number;
  y: number;
};

export type NoteGroup = {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  updatedAt: number;
};

export type TodoGroup = {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  updatedAt: number;
};

export type NoteCard = {
  id: string;
  title: string;
  dotColor: string;
  groupId: string | null;
  collapsed: boolean;
  content: Descendant[];
  createdAt: number;
  updatedAt: number;
};

export type NotesDocument = {
  cards: NoteCard[];
  groups: NoteGroup[];
};

export type StoredNotesData = NoteCard[] | NotesDocument;

export type TodoItem = {
  id: string;
  text: string;
  done: boolean;
  groupId: string | null;
  reminderAt: number | null;
  createdAt: number;
  dateKey: string;
};

export type TodosDocument = {
  items: TodoItem[];
  groups: TodoGroup[];
};

export type StoredTodosData = TodoItem[] | TodosDocument;

export type AppSettings = {
  hotkey: string;
  language: AppLanguage;
  timeZone: string;
  timeFormat: TimeFormat;
  theme: ThemeId;
  themeMode: ThemeMode;
  systemLightTheme: LightThemeId;
  panelPosition: PanelPosition | null;
  activeTab: TabId;
  lastActiveTab: TabId;
  defaultOpenSection: DefaultOpenSection;
  transitionStyle: TransitionStyle;
  animationSpeed: AnimationSpeed;
  launchAtLogin: boolean;
  enableParticles: boolean;
  enableReminderSound: boolean;
};

export type RawLoadAllResult = {
  notes: StoredNotesData;
  todos: StoredTodosData;
  settings: AppSettings;
};

export type LoadAllResult = {
  notes: NotesDocument;
  todos: TodosDocument;
  settings: AppSettings;
};

export const NOTE_DOT_COLORS = [
  "#FF7A59",
  "#2F6BFF",
  "#1FA87A",
  "#F4B942",
  "#7B5CFA",
  "#3F9CA8",
] as const;

export const DEFAULT_NOTE_GROUP_COLOR = NOTE_DOT_COLORS[0];
export const DEFAULT_UNGROUPED_NOTE_COLOR = "#C8C0B5";
export const DEFAULT_TODO_GROUP_COLOR = NOTE_DOT_COLORS[1];
export const DEFAULT_UNGROUPED_TODO_COLOR = "#C8C0B5";
export const FALLBACK_TIME_ZONE = "UTC";

const FALLBACK_TIME_ZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Europe/Paris",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
] as const;

export const DEFAULT_NOTE_CONTENT: Descendant[] = [
  {
    type: "paragraph",
    children: [{ text: "" }],
  },
];

export function cloneNoteContent(content?: Descendant[]) {
  const source = Array.isArray(content) && content.length > 0 ? content : DEFAULT_NOTE_CONTENT;

  return JSON.parse(JSON.stringify(source)) as Descendant[];
}

export function isValidTimeZone(value: unknown): value is string {
  if (!isNonEmptyString(value)) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value.trim() }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function getSystemTimeZone() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return isValidTimeZone(timeZone) ? timeZone : FALLBACK_TIME_ZONE;
}

export function normalizeTimeZone(value: unknown, fallback = getSystemTimeZone()) {
  return isValidTimeZone(value) ? value.trim() : fallback;
}

export function getSelectableTimeZones(systemTimeZone = getSystemTimeZone()) {
  const intlWithSupportedValues = Intl as typeof Intl & {
    supportedValuesOf?: (key: "timeZone") => string[];
  };
  const supportedTimeZones = intlWithSupportedValues.supportedValuesOf?.("timeZone") ?? [];
  const uniqueTimeZones = new Set([...FALLBACK_TIME_ZONES, ...supportedTimeZones, systemTimeZone].filter(isValidTimeZone));

  return Array.from(uniqueTimeZones).sort((first, second) => first.localeCompare(second));
}

export function createDefaultSettings(): AppSettings {
  return {
    hotkey: "Shift+Space",
    language: "en",
    timeZone: getSystemTimeZone(),
    timeFormat: "24h",
    theme: "classic",
    themeMode: "manual",
    systemLightTheme: "classic",
    panelPosition: null,
    activeTab: "notes",
    lastActiveTab: "notes",
    defaultOpenSection: "last",
    transitionStyle: "page",
    animationSpeed: "mediate",
    launchAtLogin: true,
    enableParticles: true,
    enableReminderSound: true,
  };
}

export const DEFAULT_SETTINGS: AppSettings = createDefaultSettings();

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeColor(value: unknown, fallback: string) {
  return isNonEmptyString(value) ? value.trim() : fallback;
}

export function normalizeLanguage(value: unknown): AppLanguage {
  return value === "zh-CN" ? "zh-CN" : "en";
}

export function normalizeTabId(value: unknown): TabId {
  return value === "todos" ? "todos" : "notes";
}

export function normalizeDefaultOpenSection(value: unknown): DefaultOpenSection {
  if (value === "notes" || value === "todos") {
    return value;
  }

  return "last";
}

export function normalizeTransitionStyle(value: unknown): TransitionStyle {
  if (value === "slide" || value === "lift") {
    return value;
  }

  return "page";
}

export function normalizeAnimationSpeed(value: unknown): AnimationSpeed {
  if (value === "rapid" || value === "mediate" || value === "slow") {
    return value;
  }

  if (value === "faster") {
    return "rapid";
  }

  if (value === "fast") {
    return "mediate";
  }

  return DEFAULT_SETTINGS.animationSpeed;
}

export function normalizeTimeFormat(value: unknown): TimeFormat {
  return value === "12h" ? "12h" : "24h";
}

export function normalizeTheme(value: unknown): ThemeId {
  return value === "forest" || value === "orchid" || value === "plum" || value === "chrysanthemum" || value === "night"
    ? value
    : "classic";
}

export function normalizeLightTheme(value: unknown): LightThemeId {
  const theme = normalizeTheme(value);
  return theme === "night" ? "classic" : theme;
}

export function normalizeThemeMode(value: unknown): ThemeMode {
  return value === "system" ? "system" : "manual";
}

export function normalizePanelPosition(value: unknown): PanelPosition | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<PanelPosition>;
  const x = typeof candidate.x === "number" ? candidate.x : null;
  const y = typeof candidate.y === "number" ? candidate.y : null;

  if (x === null || y === null) {
    return null;
  }

  return { x, y };
}

export function normalizeAppSettings(settings: Partial<AppSettings> = {}): AppSettings {
  const activeTab = normalizeTabId(settings.activeTab);
  const defaultSettings = createDefaultSettings();

  return {
    hotkey: typeof settings.hotkey === "string" && settings.hotkey.trim() ? settings.hotkey.trim() : defaultSettings.hotkey,
    language: normalizeLanguage(settings.language),
    timeZone: normalizeTimeZone(settings.timeZone, defaultSettings.timeZone),
    timeFormat: normalizeTimeFormat(settings.timeFormat),
    theme: normalizeTheme(settings.theme),
    themeMode: normalizeThemeMode(settings.themeMode),
    systemLightTheme: normalizeLightTheme(settings.systemLightTheme ?? settings.theme),
    panelPosition: normalizePanelPosition(settings.panelPosition),
    activeTab,
    lastActiveTab: normalizeTabId(settings.lastActiveTab ?? activeTab),
    defaultOpenSection: normalizeDefaultOpenSection(settings.defaultOpenSection),
    transitionStyle: normalizeTransitionStyle(settings.transitionStyle),
    animationSpeed: normalizeAnimationSpeed(settings.animationSpeed),
    launchAtLogin: typeof settings.launchAtLogin === "boolean" ? settings.launchAtLogin : defaultSettings.launchAtLogin,
    enableParticles: typeof settings.enableParticles === "boolean" ? settings.enableParticles : defaultSettings.enableParticles,
    enableReminderSound:
      typeof settings.enableReminderSound === "boolean"
        ? settings.enableReminderSound
        : defaultSettings.enableReminderSound,
  };
}

export function resolvePreferredOpenTab(settings: Pick<AppSettings, "defaultOpenSection" | "lastActiveTab">): TabId {
  return settings.defaultOpenSection === "last" ? settings.lastActiveTab : settings.defaultOpenSection;
}

function createId(prefix: string) {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${uuid ?? `${Date.now()}-${Math.round(Math.random() * 1e6)}`}`;
}

export function createEmptyNotesDocument(): NotesDocument {
  return {
    cards: [],
    groups: [],
  };
}

export function createEmptyTodosDocument(): TodosDocument {
  return {
    items: [],
    groups: [],
  };
}

export function createNoteGroup(overrides: Partial<NoteGroup> = {}): NoteGroup {
  const now = Date.now();
  const createdAt = typeof overrides.createdAt === "number" ? overrides.createdAt : now;

  return {
    id: isNonEmptyString(overrides.id) ? overrides.id.trim() : createId("group"),
    name: isNonEmptyString(overrides.name) ? overrides.name.trim() : "New group",
    color: normalizeColor(overrides.color, DEFAULT_NOTE_GROUP_COLOR),
    createdAt,
    updatedAt: typeof overrides.updatedAt === "number" ? overrides.updatedAt : createdAt,
  };
}

export function createTodoGroup(overrides: Partial<TodoGroup> = {}): TodoGroup {
  const now = Date.now();
  const createdAt = typeof overrides.createdAt === "number" ? overrides.createdAt : now;

  return {
    id: isNonEmptyString(overrides.id) ? overrides.id.trim() : createId("todo-group"),
    name: isNonEmptyString(overrides.name) ? overrides.name.trim() : "New group",
    color: normalizeColor(overrides.color, DEFAULT_TODO_GROUP_COLOR),
    createdAt,
    updatedAt: typeof overrides.updatedAt === "number" ? overrides.updatedAt : createdAt,
  };
}

export function createNoteCard(overrides: Partial<NoteCard> = {}): NoteCard {
  const now = Date.now();
  const createdAt = typeof overrides.createdAt === "number" ? overrides.createdAt : now;

  return {
    id: isNonEmptyString(overrides.id) ? overrides.id.trim() : createId("note"),
    title: typeof overrides.title === "string" ? overrides.title : "",
    dotColor: normalizeColor(overrides.dotColor, DEFAULT_UNGROUPED_NOTE_COLOR),
    groupId: isNonEmptyString(overrides.groupId) ? overrides.groupId.trim() : null,
    collapsed: typeof overrides.collapsed === "boolean" ? overrides.collapsed : false,
    content: cloneNoteContent(overrides.content),
    createdAt,
    updatedAt: typeof overrides.updatedAt === "number" ? overrides.updatedAt : createdAt,
  };
}

export function createTodoItem(text: string, overrides: Partial<TodoItem> = {}): TodoItem {
  const createdAt = typeof overrides.createdAt === "number" ? overrides.createdAt : Date.now();

  return {
    id: createId("todo"),
    text,
    done: false,
    groupId: null,
    reminderAt: null,
    createdAt,
    dateKey: formatLocalDateKey(new Date(createdAt)),
    ...overrides,
  };
}

export function formatLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map((part) => Number(part));

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

export function normalizeTodoItem(value: unknown, fallbackDateKey = formatLocalDateKey(new Date())): TodoItem {
  const candidate = value && typeof value === "object" ? (value as Partial<TodoItem>) : {};
  const createdAt = typeof candidate.createdAt === "number" ? candidate.createdAt : Date.now();
  const dateKey =
    typeof candidate.dateKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(candidate.dateKey)
      ? candidate.dateKey
      : fallbackDateKey;
  const idOverride = isNonEmptyString(candidate.id) ? { id: candidate.id.trim() } : {};

  return createTodoItem(typeof candidate.text === "string" ? candidate.text : "", {
    ...idOverride,
    text: typeof candidate.text === "string" ? candidate.text : "",
    done: Boolean(candidate.done),
    groupId: isNonEmptyString(candidate.groupId) ? candidate.groupId.trim() : null,
    reminderAt: typeof candidate.reminderAt === "number" ? candidate.reminderAt : null,
    createdAt,
    dateKey,
  });
}

export function normalizeNoteGroup(value: unknown, index: number): NoteGroup {
  const candidate = value && typeof value === "object" ? (value as Partial<NoteGroup>) : {};
  const fallbackColor = NOTE_DOT_COLORS[index % NOTE_DOT_COLORS.length] ?? DEFAULT_NOTE_GROUP_COLOR;
  const now = Date.now();
  const createdAt = typeof candidate.createdAt === "number" ? candidate.createdAt : now;

  return {
    id: isNonEmptyString(candidate.id) ? candidate.id.trim() : createId("group"),
    name: isNonEmptyString(candidate.name) ? candidate.name.trim() : `Group ${index + 1}`,
    color: normalizeColor(candidate.color, fallbackColor),
    createdAt,
    updatedAt: typeof candidate.updatedAt === "number" ? candidate.updatedAt : createdAt,
  };
}

export function normalizeTodoGroup(value: unknown, index: number): TodoGroup {
  const candidate = value && typeof value === "object" ? (value as Partial<TodoGroup>) : {};
  const fallbackColor = NOTE_DOT_COLORS[index % NOTE_DOT_COLORS.length] ?? DEFAULT_TODO_GROUP_COLOR;
  const now = Date.now();
  const createdAt = typeof candidate.createdAt === "number" ? candidate.createdAt : now;

  return {
    id: isNonEmptyString(candidate.id) ? candidate.id.trim() : createId("todo-group"),
    name: isNonEmptyString(candidate.name) ? candidate.name.trim() : `Group ${index + 1}`,
    color: normalizeColor(candidate.color, fallbackColor),
    createdAt,
    updatedAt: typeof candidate.updatedAt === "number" ? candidate.updatedAt : createdAt,
  };
}

export function normalizeNoteCard(value: unknown): NoteCard {
  const candidate = value && typeof value === "object" ? (value as Partial<NoteCard>) : {};
  const now = Date.now();
  const createdAt = typeof candidate.createdAt === "number" ? candidate.createdAt : now;

  return {
    id: isNonEmptyString(candidate.id) ? candidate.id.trim() : createId("note"),
    title: typeof candidate.title === "string" ? candidate.title : "",
    dotColor: normalizeColor(candidate.dotColor, DEFAULT_UNGROUPED_NOTE_COLOR),
    groupId: isNonEmptyString(candidate.groupId) ? candidate.groupId.trim() : null,
    collapsed: typeof candidate.collapsed === "boolean" ? candidate.collapsed : false,
    content: cloneNoteContent(candidate.content),
    createdAt,
    updatedAt: typeof candidate.updatedAt === "number" ? candidate.updatedAt : createdAt,
  };
}

export function normalizeTodosDocument(value: unknown): TodosDocument {
  const candidate =
    value && typeof value === "object" && !Array.isArray(value) ? (value as Partial<TodosDocument>) : null;
  const groups = Array.isArray(candidate?.groups) ? candidate.groups.map((group, index) => normalizeTodoGroup(group, index)) : [];
  const groupsById = new Map(groups.map((group) => [group.id, group] as const));
  const rawItems = Array.isArray(value) ? value : Array.isArray(candidate?.items) ? candidate.items : [];

  return {
    items: rawItems.map((item) => {
      const normalizedItem = normalizeTodoItem(item);
      const matchedGroup = normalizedItem.groupId ? groupsById.get(normalizedItem.groupId) ?? null : null;

      return {
        ...normalizedItem,
        groupId: matchedGroup ? matchedGroup.id : null,
      };
    }),
    groups,
  };
}

export function normalizeNotesDocument(value: unknown): NotesDocument {
  const candidate =
    value && typeof value === "object" && !Array.isArray(value) ? (value as Partial<NotesDocument>) : null;
  const groups = Array.isArray(candidate?.groups) ? candidate.groups.map((group, index) => normalizeNoteGroup(group, index)) : [];
  const groupsById = new Map(groups.map((group) => [group.id, group] as const));
  const rawCards = Array.isArray(value) ? value : Array.isArray(candidate?.cards) ? candidate.cards : [];

  return {
    cards: rawCards.map((card) => {
      const normalizedCard = normalizeNoteCard(card);
      const matchedGroup = normalizedCard.groupId ? groupsById.get(normalizedCard.groupId) ?? null : null;

      if (!matchedGroup) {
        return {
          ...normalizedCard,
          groupId: null,
          dotColor: normalizeColor(normalizedCard.dotColor, DEFAULT_UNGROUPED_NOTE_COLOR),
        };
      }

      return {
        ...normalizedCard,
        dotColor: matchedGroup.color,
      };
    }),
    groups,
  };
}

export function resolveNoteGroup(note: Pick<NoteCard, "groupId">, groups: NoteGroup[]) {
  return note.groupId ? groups.find((group) => group.id === note.groupId) ?? null : null;
}

export function resolveNoteAccentColor(note: Pick<NoteCard, "dotColor" | "groupId">, groups: NoteGroup[]) {
  return resolveNoteGroup(note, groups)?.color ?? note.dotColor ?? DEFAULT_UNGROUPED_NOTE_COLOR;
}

export function resolveTodoGroup(todo: Pick<TodoItem, "groupId">, groups: TodoGroup[]) {
  return todo.groupId ? groups.find((group) => group.id === todo.groupId) ?? null : null;
}

export function resolveTodoAccentColor(todo: Pick<TodoItem, "groupId">, groups: TodoGroup[]) {
  return resolveTodoGroup(todo, groups)?.color ?? DEFAULT_UNGROUPED_TODO_COLOR;
}
