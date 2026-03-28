import type { Descendant } from "slate";

export type TabId = "notes" | "todos";

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
};

export type LoadAllResult = {
  notes: NoteCard[];
  todos: TodoItem[];
  settings: AppSettings;
};

export const NOTE_DOT_COLORS = [
  "#9C7E5E",
  "#C07850",
  "#7BAF88",
  "#E2B66B",
  "#8E7DBE",
  "#5C8D89",
] as const;

export const DEFAULT_NOTE_CONTENT: Descendant[] = [
  {
    type: "paragraph",
    children: [{ text: "" }],
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  hotkey: "Alt+Space",
  panelPosition: null,
  activeTab: "notes",
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
