import type { DragPreviewPayload } from "@floatem/native-bridge";
import { useEffect, useState } from "react";
import type { Descendant } from "slate";
import { FloatingNoteCard } from "../notes/NoteCard";
import { FloatingTodoItem } from "../todos/TodoItem";
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
    __FLOATEM_DRAG_PREVIEW_STATE__?: DragPreviewPayload | null;
  }
}

function readInitialState() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.__FLOATEM_DRAG_PREVIEW_STATE__ ?? null;
}

function buildPreviewSettings(payload: DragPreviewPayload): Partial<AppSettings> {
  return {
    language: payload.language === "en" ? "en" : "zh-CN",
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
    // The preview iframe is 16px larger on every side so the host can paint a
    // shadow without clipping it. That gutter must remain fully transparent;
    // otherwise the app's default page background reads as a second, larger
    // card behind the preview.
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");

    html.dataset.floatemCardWindow = "true";
    html.dataset.floatemFloatingCardWindow = "true";
    html.style.background = "transparent";
    html.style.backgroundColor = "transparent";
    html.style.overflow = "hidden";
    body.style.background = "transparent";
    body.style.backgroundColor = "transparent";
    body.style.margin = "0";
    body.style.padding = "0";
    body.style.overflow = "hidden";
    if (root) {
      root.style.background = "transparent";
      root.style.backgroundColor = "transparent";
      root.style.overflow = "hidden";
    }

    return () => {
      delete html.dataset.floatemCardWindow;
      delete html.dataset.floatemFloatingCardWindow;
      html.style.background = "";
      html.style.backgroundColor = "";
      html.style.overflow = "";
      body.style.background = "";
      body.style.backgroundColor = "";
      body.style.margin = "";
      body.style.padding = "";
      body.style.overflow = "";
      if (root) {
        root.style.background = "";
        root.style.backgroundColor = "";
        root.style.overflow = "";
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleState = (event: Event) => {
      const detail = (event as CustomEvent<DragPreviewPayload | null>).detail;
      setPayload(detail ?? window.__FLOATEM_DRAG_PREVIEW_STATE__ ?? null);
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
        <FloatingNoteCard
          note={createPreviewNoteCard(payload)}
          width={payload.size.width}
          minHeight={payload.size.height}
          onBeginDrag={() => {}}
          onDock={() => {}}
        />
      ) : (
        <FloatingTodoItem
          todo={payload.todo}
          width={payload.size.width}
          minHeight={payload.size.height}
          order={payload.order}
          onBeginDrag={() => {}}
          onDock={() => {}}
          onToggle={() => {}}
        />
      )}
    </main>
  );
}
