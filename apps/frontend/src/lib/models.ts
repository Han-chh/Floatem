import type { Descendant } from "slate";

export type TabId = "notes" | "todos";
export type AppLanguage = "en" | "zh-CN";
export type DefaultOpenSection = "last" | TabId;
export type TransitionStyle = "page" | "slide" | "lift";
export type AnimationSpeed = "rapid" | "mediate" | "slow";

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
  reminderAt: number | null;
  createdAt: number;
  dateKey: string;
};

export type AppSettings = {
  hotkey: string;
  language: AppLanguage;
  panelPosition: PanelPosition | null;
  activeTab: TabId;
  lastActiveTab: TabId;
  defaultOpenSection: DefaultOpenSection;
  transitionStyle: TransitionStyle;
  animationSpeed: AnimationSpeed;
  enableParticles: boolean;
  enableReminderSound: boolean;
};

export type RawLoadAllResult = {
  notes: StoredNotesData;
  todos: TodoItem[];
  settings: AppSettings;
};

export type LoadAllResult = {
  notes: NotesDocument;
  todos: TodoItem[];
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

export const DEFAULT_NOTE_CONTENT: Descendant[] = [
  {
    type: "paragraph",
    children: [{ text: "" }],
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  hotkey: "Shift+Space",
  language: "en",
  panelPosition: null,
  activeTab: "notes",
  lastActiveTab: "notes",
  defaultOpenSection: "last",
  transitionStyle: "page",
  animationSpeed: "mediate",
  enableParticles: true,
  enableReminderSound: true,
};

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

  return {
    hotkey: typeof settings.hotkey === "string" && settings.hotkey.trim() ? settings.hotkey.trim() : DEFAULT_SETTINGS.hotkey,
    language: normalizeLanguage(settings.language),
    panelPosition: normalizePanelPosition(settings.panelPosition),
    activeTab,
    lastActiveTab: normalizeTabId(settings.lastActiveTab ?? activeTab),
    defaultOpenSection: normalizeDefaultOpenSection(settings.defaultOpenSection),
    transitionStyle: normalizeTransitionStyle(settings.transitionStyle),
    animationSpeed: normalizeAnimationSpeed(settings.animationSpeed),
    enableParticles: typeof settings.enableParticles === "boolean" ? settings.enableParticles : DEFAULT_SETTINGS.enableParticles,
    enableReminderSound:
      typeof settings.enableReminderSound === "boolean"
        ? settings.enableReminderSound
        : DEFAULT_SETTINGS.enableReminderSound,
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

export function createNoteCard(overrides: Partial<NoteCard> = {}): NoteCard {
  const now = Date.now();
  const createdAt = typeof overrides.createdAt === "number" ? overrides.createdAt : now;

  return {
    id: isNonEmptyString(overrides.id) ? overrides.id.trim() : createId("note"),
    title: typeof overrides.title === "string" ? overrides.title : "",
    dotColor: normalizeColor(overrides.dotColor, DEFAULT_UNGROUPED_NOTE_COLOR),
    groupId: isNonEmptyString(overrides.groupId) ? overrides.groupId.trim() : null,
    collapsed: typeof overrides.collapsed === "boolean" ? overrides.collapsed : false,
    content: Array.isArray(overrides.content) ? overrides.content : DEFAULT_NOTE_CONTENT,
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
    content: Array.isArray(candidate.content) ? candidate.content : DEFAULT_NOTE_CONTENT,
    createdAt,
    updatedAt: typeof candidate.updatedAt === "number" ? candidate.updatedAt : createdAt,
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
