import type { DragPreviewPayload } from "@quicknote/native-bridge";
import { Node } from "slate";
import { cloneNoteContent } from "./models";
import type {
  AppLanguage,
  NoteCard,
  NoteGroup,
  TimeFormat,
  TodoGroup,
  TodoItem,
} from "./models";

export const DRAG_PREVIEW_STATE_EVENT = "quicknote:drag-preview-state";
export const FLOATING_CARD_STATE_EVENT = "quicknote:floating-card-state";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function buildPointerOffset(rect: DOMRect, coordinates: { x: number; y: number }) {
  void coordinates;

  return {
    x: clamp(rect.width / 2, 0, rect.width),
    y: clamp(rect.height / 2, 0, rect.height),
  };
}

function buildSize(rect: DOMRect) {
  return {
    width: Math.max(1, Math.round(rect.width)),
    height: Math.max(1, Math.round(rect.height)),
  };
}

export function buildNoteDragPreviewPayload({
  note,
  groups,
  language,
  rect,
  coordinates,
}: {
  note: NoteCard;
  groups: NoteGroup[];
  language: AppLanguage;
  rect: DOMRect;
  coordinates: { x: number; y: number };
}): DragPreviewPayload {
  return {
    kind: "note",
    language,
    size: buildSize(rect),
    pointerOffset: buildPointerOffset(rect, coordinates),
    note: {
      id: note.id,
      title: note.title,
      dotColor: note.dotColor,
      groupId: note.groupId,
      collapsed: note.collapsed,
      content: cloneNoteContent(note.content),
      previewText: note.content.map((node) => Node.string(node)).join("\n").trim(),
      updatedAt: note.updatedAt,
    },
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      color: group.color,
    })),
  };
}

export function buildTodoDragPreviewPayload({
  todo,
  groups,
  language,
  timeZone,
  timeFormat,
  order,
  rect,
  coordinates,
}: {
  todo: TodoItem;
  groups: TodoGroup[];
  language: AppLanguage;
  timeZone: string;
  timeFormat: TimeFormat;
  order?: number;
  rect: DOMRect;
  coordinates: { x: number; y: number };
}): DragPreviewPayload {
  return {
    kind: "todo",
    language,
    timeZone,
    timeFormat,
    size: buildSize(rect),
    pointerOffset: buildPointerOffset(rect, coordinates),
    order,
    todo: {
      id: todo.id,
      text: todo.text,
      done: todo.done,
      groupId: todo.groupId,
      reminderAt: todo.reminderAt,
      createdAt: todo.createdAt,
      dateKey: todo.dateKey,
    },
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      color: group.color,
    })),
  };
}
