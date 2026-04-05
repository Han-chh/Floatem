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

export type NoteCard = {
  id: string;
  title: string;
  dotColor: string;
  collapsed: boolean;
  content: Descendant[];
  createdAt: number;
  updatedAt: number;
};

export type TodoItem = {
  id: string;
  text: string;
  done: boolean;
  reminderAt: number | null;
  createdAt: number;
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
};

export type LoadAllResult = {
  notes: NoteCard[];
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

export const DEFAULT_NOTE_CONTENT: Descendant[] = [
  {
    type: "paragraph",
    children: [{ text: "" }],
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  hotkey: "Cmd+Shift+Space",
  language: "en",
  panelPosition: null,
  activeTab: "notes",
  lastActiveTab: "notes",
  defaultOpenSection: "last",
  transitionStyle: "page",
  animationSpeed: "mediate",
  enableParticles: true,
};

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
  };
}

export function resolvePreferredOpenTab(settings: Pick<AppSettings, "defaultOpenSection" | "lastActiveTab">): TabId {
  return settings.defaultOpenSection === "last" ? settings.lastActiveTab : settings.defaultOpenSection;
}

function createId(prefix: string) {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${uuid ?? `${Date.now()}-${Math.round(Math.random() * 1e6)}`}`;
}

export function createNoteCard(overrides: Partial<NoteCard> = {}): NoteCard {
  const now = Date.now();

  return {
    id: createId("note"),
    title: "",
    dotColor: NOTE_DOT_COLORS[0],
    collapsed: false,
    content: DEFAULT_NOTE_CONTENT,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createTodoItem(text: string, overrides: Partial<TodoItem> = {}): TodoItem {
  return {
    id: createId("todo"),
    text,
    done: false,
    reminderAt: null,
    createdAt: Date.now(),
    ...overrides,
  };
}
