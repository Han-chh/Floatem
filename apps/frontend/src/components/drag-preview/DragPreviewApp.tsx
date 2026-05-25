import type { DragPreviewPayload } from "@quicknote/native-bridge";
import { useEffect, useState } from "react";
import type { Descendant } from "slate";
import { NoteCardPreview } from "../notes/NoteCard";
import { TodoItemPreview } from "../todos/TodoItem";
import { DRAG_PREVIEW_STATE_EVENT } from "../../lib/dragPreview";
import {
  createEmptyNotesDocument,
  createEmptyTodosDocument,
  createNoteCard,
  createNoteGroup,
  createTodoGroup,
  type AppSettings,
} from "../../lib/models";
import { useNotesStore } from "../../store/notesStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useTodosStore } from "../../store/todosStore";

declare global {
  interface Window {
    __QUICKNOTE_DRAG_PREVIEW_STATE__?: DragPreviewPayload | null;
  }
}

function readInitialState() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.__QUICKNOTE_DRAG_PREVIEW_STATE__ ?? null;
}

function buildPreviewSettings(payload: DragPreviewPayload): Partial<AppSettings> {
  return {
    language: payload.language === "zh-CN" ? "zh-CN" : "en",
    timeZone: payload.kind === "todo" ? payload.timeZone : undefined,
    timeFormat: payload.kind === "todo" ? payload.timeFormat : undefined,
    enableParticles: false,
  };
}

function createPreviewNoteCard(payload: Extract<DragPreviewPayload, { kind: "note" }>) {
  return createNoteCard({
    ...payload.note,
    content: Array.isArray(payload.note.content) ? (payload.note.content as Descendant[]) : undefined,
    createdAt: payload.note.updatedAt,
  });
}

export function DragPreviewApp() {
  const [payload, setPayload] = useState<DragPreviewPayload | null>(() => readInitialState());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleState = (event: Event) => {
      const detail = (event as CustomEvent<DragPreviewPayload | null>).detail;
      setPayload(detail ?? window.__QUICKNOTE_DRAG_PREVIEW_STATE__ ?? null);
    };

    window.addEventListener(DRAG_PREVIEW_STATE_EVENT, handleState as EventListener);

    return () => {
      window.removeEventListener(DRAG_PREVIEW_STATE_EVENT, handleState as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!payload) {
      useNotesStore.getState().initialize(createEmptyNotesDocument());
      useTodosStore.getState().initialize(createEmptyTodosDocument());
      return;
    }

    useSettingsStore.getState().hydrateSettings(buildPreviewSettings(payload));

    if (payload.kind === "note") {
      useNotesStore.getState().initialize({
        cards: [createPreviewNoteCard(payload)],
        groups: payload.groups.map((group) =>
          createNoteGroup({
            ...group,
            createdAt: payload.note.updatedAt,
            updatedAt: payload.note.updatedAt,
          }),
        ),
      });
      useTodosStore.getState().initialize(createEmptyTodosDocument());
      return;
    }

    useTodosStore.getState().initialize({
      items: [payload.todo],
      groups: payload.groups.map((group) =>
        createTodoGroup({
          ...group,
          createdAt: payload.todo.createdAt,
          updatedAt: payload.todo.createdAt,
        }),
      ),
    });
    useNotesStore.getState().initialize(createEmptyNotesDocument());
  }, [payload]);

  if (!payload) {
    return <div className="h-screen w-screen bg-transparent" />;
  }

  return (
    <main className="flex min-h-screen w-full items-start justify-start bg-transparent p-4">
      {payload.kind === "note" ? (
        <NoteCardPreview note={createPreviewNoteCard(payload)} width={payload.size.width} />
      ) : (
        <TodoItemPreview todo={payload.todo} width={payload.size.width} order={payload.order} />
      )}
    </main>
  );
}
