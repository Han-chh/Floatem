import type { Descendant } from "slate";

export type TabId = "notes" | "todos";
export type TransitionStyle = "page" | "slide";
export type AnimationSpeed = "faster" | "fast";

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
  panelPosition: PanelPosition | null;
  activeTab: TabId;
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
  panelPosition: null,
  activeTab: "notes",
  transitionStyle: "page",
  animationSpeed: "faster",
  enableParticles: true,
};

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
