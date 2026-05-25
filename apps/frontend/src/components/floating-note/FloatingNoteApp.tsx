import type { DragPreviewPayload, FloatingCardScreenPlacement } from "@quicknote/native-bridge";
import { useEffect, useRef, useState } from "react";
import type { Descendant } from "slate";
import {
  closeFloatingCard,
  getFloatingCardScreenPlacement,
  loadAllData,
  resizeFloatingCard,
  saveTodos,
  setEditableInputActive,
  setTextCompositionActive,
  startFloatingCardDrag,
} from "../../hooks/usePlatform";
import { useAutoSave } from "../../hooks/useAutoSave";
import { FLOATING_CARD_STATE_EVENT } from "../../lib/dragPreview";
import { useI18n } from "../../lib/i18n";
import {
  createEmptyNotesDocument,
  createEmptyTodosDocument,
  createNoteCard,
  createNoteGroup,
  createTodoGroup,
} from "../../lib/models";
import { useSettingsStore } from "../../store/settingsStore";
import { useNotesStore } from "../../store/notesStore";
import { useTodosStore } from "../../store/todosStore";
import { FloatingNoteCard, NoteCardPreview } from "../notes/NoteCard";
import { FloatingTodoItem, TodoItemPreview } from "../todos/TodoItem";

declare global {
  interface Window {
    __QUICKNOTE_FLOATING_CARD_STATE__?: DragPreviewPayload | null;
  }
}

const FLOATING_TODO_COMPLETE_DOCK_DELAY_MS = 650;
const FLOATING_DIALOG_VIEWPORT_SIZE = {
  width: 480,
  height: 680,
};
const FLOATING_DIALOG_GAP_PX = 12;
const FLOATING_DIALOG_BACKDROP_SELECTOR = ".quicknote-modal-backdrop";
const EDITABLE_TARGET_SELECTOR = 'input,textarea,select,[contenteditable="true"],[role="textbox"]';
type FloatingDialogSide = "left" | "right";

function readInitialState() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.__QUICKNOTE_FLOATING_CARD_STATE__ ?? null;
}

function isEditableTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest(EDITABLE_TARGET_SELECTOR));
}

function getCardReference(payload: DragPreviewPayload) {
  return payload.kind === "note"
    ? { kind: "note" as const, id: payload.note.id }
    : { kind: "todo" as const, id: payload.todo.id };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function chooseFloatingDialogSideFromPlacement(
  screenPlacement: FloatingCardScreenPlacement | null,
): FloatingDialogSide | null {
  if (!screenPlacement) {
    return null;
  }

  const { availableFrame, cardFrame } = screenPlacement;
  if (
    !isFiniteNumber(availableFrame.left) ||
    !isFiniteNumber(availableFrame.width) ||
    !isFiniteNumber(cardFrame.left) ||
    !isFiniteNumber(cardFrame.width)
  ) {
    return null;
  }

  const requiredSpace = FLOATING_DIALOG_VIEWPORT_SIZE.width + FLOATING_DIALOG_GAP_PX;
  const rightSpace = availableFrame.left + availableFrame.width - (cardFrame.left + cardFrame.width);
  return rightSpace >= requiredSpace ? "right" : "left";
}

function chooseFloatingDialogSide(cardScreenLeft: number, cardWidth: number): FloatingDialogSide {
  if (typeof window === "undefined") {
    return "right";
  }

  const screen = window.screen as Screen & { availLeft?: number };
  const screenLeft = Number(screen.availLeft ?? 0);
  const screenWidth = Number(window.screen.availWidth);
  if (!Number.isFinite(screenWidth) || screenWidth <= 0 || !Number.isFinite(cardScreenLeft)) {
    return "right";
  }

  const requiredSpace = FLOATING_DIALOG_VIEWPORT_SIZE.width + FLOATING_DIALOG_GAP_PX;
  const rightSpace = screenLeft + screenWidth - (cardScreenLeft + cardWidth);
  if (rightSpace >= requiredSpace) {
    return "right";
  }

  return "left";
}

function getDialogHorizontalAnchor(side: FloatingDialogSide) {
  return side === "left" ? "right" : "left";
}

function createPreviewNoteCard(payload: Extract<DragPreviewPayload, { kind: "note" }>) {
  return createNoteCard({
    ...payload.note,
    content: Array.isArray(payload.note.content) ? (payload.note.content as Descendant[]) : undefined,
    createdAt: payload.note.updatedAt,
  });
}

export function FloatingNoteApp() {
  const [payload, setPayload] = useState<DragPreviewPayload | null>(() => readInitialState());
  const [frameSize, setFrameSize] = useState(() => readInitialState()?.size ?? { width: 1, height: 1 });
  const [hasOpenDialog, setHasOpenDialog] = useState(false);
  const [dialogSide, setDialogSide] = useState<FloatingDialogSide>("right");
  const [isHydrated, setIsHydrated] = useState(false);
  const contentRef = useRef<HTMLElement | null>(null);
  const syncedFrameSizeRef = useRef(frameSize);
  const isDialogOpenRef = useRef(false);
  const lastDialogSideRef = useRef<FloatingDialogSide>("right");
  const completeDockTimerRef = useRef<number | null>(null);
  const dialogStateRequestRef = useRef(0);
  const hasEditableFocusRef = useRef(false);
  const isTextComposingRef = useRef(false);
  const { t } = useI18n();
  const noteCards = useNotesStore((state) => state.cards);
  const todoItems = useTodosStore((state) => state.todos);

  useAutoSave();

  useEffect(() => {
    return () => {
      if (completeDockTimerRef.current !== null) {
        window.clearTimeout(completeDockTimerRef.current);
      }

      hasEditableFocusRef.current = false;
      isTextComposingRef.current = false;
      void setEditableInputActive(false);
      void setTextCompositionActive(false);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const handleFocusIn = (event: FocusEvent) => {
      if (isEditableTarget(event.target)) {
        hasEditableFocusRef.current = true;
        void setEditableInputActive(true);
      }
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (isEditableTarget(event.target)) {
        if (isEditableTarget(event.relatedTarget)) {
          return;
        }

        hasEditableFocusRef.current = false;
        if (isTextComposingRef.current) {
          return;
        }

        void setEditableInputActive(false);
        void setTextCompositionActive(false);
      }
    };

    const handleCompositionStart = (event: CompositionEvent) => {
      if (isEditableTarget(event.target)) {
        hasEditableFocusRef.current = true;
        isTextComposingRef.current = true;
        void setEditableInputActive(true);
        void setTextCompositionActive(true);
      }
    };

    const handleCompositionEnd = (event: CompositionEvent) => {
      if (isEditableTarget(event.target)) {
        isTextComposingRef.current = false;
        void setTextCompositionActive(false);
        if (!hasEditableFocusRef.current) {
          void setEditableInputActive(false);
        }
      }
    };

    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("focusout", handleFocusOut, true);
    document.addEventListener("compositionstart", handleCompositionStart, true);
    document.addEventListener("compositionend", handleCompositionEnd, true);

    return () => {
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("focusout", handleFocusOut, true);
      document.removeEventListener("compositionstart", handleCompositionStart, true);
      document.removeEventListener("compositionend", handleCompositionEnd, true);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Ensure html/body/#root are fully transparent with no margins or overflow
    // that could create visible window edges around the card.
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");

    html.dataset.quicknoteFloatingCardWindow = "true";
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.margin = "0";
    body.style.padding = "0";
    if (root) {
      root.style.overflow = "hidden";
    }

    return () => {
      delete html.dataset.quicknoteFloatingCardWindow;
      html.style.overflow = "";
      body.style.overflow = "";
      body.style.margin = "";
      body.style.padding = "";
      if (root) {
        root.style.overflow = "";
      }
    };
  }, []);

  useEffect(() => {
    if (!payload) {
      return;
    }

    syncedFrameSizeRef.current = payload.size;
    setFrameSize(payload.size);
  }, [payload]);

  useEffect(() => {
    if (!payload || typeof window === "undefined") {
      return;
    }

    const node = contentRef.current;
    if (!node) {
      return;
    }

    let animationFrame: number | null = null;
    const syncMeasuredSize = () => {
      animationFrame = null;
      const rect = node.getBoundingClientRect();
      const contentSize = {
        width: Math.max(1, Math.ceil(rect.width || payload.size.width)),
        height: Math.max(payload.size.height, Math.ceil(rect.height || payload.size.height)),
      };
      const nextSize = hasOpenDialog
        ? {
            width: Math.max(
              contentSize.width,
              payload.size.width + FLOATING_DIALOG_GAP_PX + FLOATING_DIALOG_VIEWPORT_SIZE.width,
            ),
            height: Math.max(contentSize.height, FLOATING_DIALOG_VIEWPORT_SIZE.height),
          }
        : contentSize;
      const lastSize = syncedFrameSizeRef.current;
      const isUnchanged =
        Math.abs(nextSize.width - lastSize.width) < 1 && Math.abs(nextSize.height - lastSize.height) < 1;

      if (isUnchanged) {
        return;
      }

      syncedFrameSizeRef.current = nextSize;
      setFrameSize(nextSize);
      void resizeFloatingCard({
        ...nextSize,
        anchor: "top",
        horizontalAnchor: getDialogHorizontalAnchor(lastDialogSideRef.current),
      });
    };

    const scheduleSync = () => {
      if (animationFrame !== null) {
        return;
      }

      animationFrame = window.requestAnimationFrame(syncMeasuredSize);
    };

    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            scheduleSync();
          });

    observer?.observe(node);
    scheduleSync();

    return () => {
      observer?.disconnect();
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [dialogSide, hasOpenDialog, payload]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const syncDialogState = () => {
      const isOpen = Boolean(document.body.querySelector(FLOATING_DIALOG_BACKDROP_SELECTOR));
      if (isOpen && !isDialogOpenRef.current && payload) {
        const cardRect = contentRef.current?.getBoundingClientRect();
        const cardScreenLeft = Number(window.screenX) + (cardRect?.left ?? 0);
        const cardWidth = Math.ceil(cardRect?.width || payload.size.width);
        const requestId = dialogStateRequestRef.current + 1;
        dialogStateRequestRef.current = requestId;
        lastDialogSideRef.current = "right";
        setDialogSide("right");

        void getFloatingCardScreenPlacement()
          .catch(() => null)
          .then((placement) => {
            if (dialogStateRequestRef.current !== requestId || !isDialogOpenRef.current) {
              return;
            }

            const nextSide =
              chooseFloatingDialogSideFromPlacement(placement) ??
              chooseFloatingDialogSide(cardScreenLeft, cardWidth);
            lastDialogSideRef.current = nextSide;
            setDialogSide(nextSide);
            setHasOpenDialog(true);
          });
      } else if (!isOpen) {
        dialogStateRequestRef.current += 1;
        setHasOpenDialog(false);
      }
      isDialogOpenRef.current = isOpen;
    };

    syncDialogState();

    const observer = new MutationObserver(syncDialogState);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [payload]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const html = document.documentElement;
    html.dataset.quicknoteFloatingDialogSide = dialogSide;
    html.style.setProperty("--quicknote-floating-card-width", `${payload?.size.width ?? 0}px`);
    html.style.setProperty("--quicknote-floating-dialog-width", `${FLOATING_DIALOG_VIEWPORT_SIZE.width}px`);
    html.style.setProperty("--quicknote-floating-dialog-gap", `${FLOATING_DIALOG_GAP_PX}px`);

    return () => {
      delete html.dataset.quicknoteFloatingDialogSide;
      html.style.removeProperty("--quicknote-floating-card-width");
      html.style.removeProperty("--quicknote-floating-dialog-width");
      html.style.removeProperty("--quicknote-floating-dialog-gap");
    };
  }, [dialogSide, payload?.size.width]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleState = (event: Event) => {
      const detail = (event as CustomEvent<DragPreviewPayload | null>).detail;
      setPayload(detail ?? window.__QUICKNOTE_FLOATING_CARD_STATE__ ?? null);
    };

    window.addEventListener(FLOATING_CARD_STATE_EVENT, handleState as EventListener);

    return () => {
      window.removeEventListener(FLOATING_CARD_STATE_EVENT, handleState as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!payload) {
      useNotesStore.getState().initialize(createEmptyNotesDocument());
      useTodosStore.getState().initialize(createEmptyTodosDocument());
      setIsHydrated(false);
      return;
    }

    let isCancelled = false;

    setIsHydrated(false);

    const hydrateFromPayload = () => {
      useSettingsStore.getState().hydrateSettings({
        language: payload.language === "zh-CN" ? "zh-CN" : "en",
        timeZone: payload.kind === "todo" ? payload.timeZone : undefined,
        timeFormat: payload.kind === "todo" ? payload.timeFormat : undefined,
        enableParticles: false,
      });

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
    };

    void loadAllData()
      .then(({ notes, todos, settings }) => {
        if (isCancelled) {
          return;
        }

        useSettingsStore.getState().hydrateSettings({
          ...settings,
          language: payload.language === "zh-CN" ? "zh-CN" : "en",
          timeZone: payload.kind === "todo" ? payload.timeZone : settings.timeZone,
          timeFormat: payload.kind === "todo" ? payload.timeFormat : settings.timeFormat,
          enableParticles: false,
        });
        useNotesStore.getState().initialize(notes);
        useTodosStore.getState().initialize(todos);
        setIsHydrated(true);
      })
      .catch((error) => {
        console.error("QuickNote failed to load floating card data.", error);
        if (isCancelled) {
          return;
        }

        hydrateFromPayload();
        setIsHydrated(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [payload]);

  if (!payload) {
    return <div className="h-screen w-screen bg-transparent" />;
  }

  const cardReference = getCardReference(payload);
  const note =
    payload.kind === "note"
      ? noteCards.find((card) => card.id === payload.note.id) ?? createPreviewNoteCard(payload)
      : null;
  const todo =
    payload.kind === "todo"
      ? todoItems.find((item) => item.id === payload.todo.id) ?? payload.todo
      : null;
  const isInteractive = isHydrated && (payload.kind === "note" ? Boolean(note) : Boolean(todo));
  const cardOffsetLeft =
    hasOpenDialog && dialogSide === "left"
      ? FLOATING_DIALOG_VIEWPORT_SIZE.width + FLOATING_DIALOG_GAP_PX
      : 0;

  const handleDock = () => {
    if (completeDockTimerRef.current !== null) {
      window.clearTimeout(completeDockTimerRef.current);
      completeDockTimerRef.current = null;
    }

    void closeFloatingCard(cardReference);
  };

  const handleToggleTodo = (id: string, _target: DOMRect, nextDone: boolean) => {
    useTodosStore.getState().toggleTodo(id);

    if (!nextDone) {
      return;
    }

    if (completeDockTimerRef.current !== null) {
      window.clearTimeout(completeDockTimerRef.current);
    }

    completeDockTimerRef.current = window.setTimeout(() => {
      completeDockTimerRef.current = null;
      const { todos, groups } = useTodosStore.getState();

      void saveTodos({ items: todos, groups }).finally(() => {
        void closeFloatingCard(cardReference);
      });
    }, FLOATING_TODO_COMPLETE_DOCK_DELAY_MS);
  };

  return (
    <main
      className="bg-transparent overflow-hidden"
      style={{
        width: frameSize.width,
        height: frameSize.height,
      }}
    >
      <article
        ref={contentRef}
        data-testid="floating-card-shell"
        data-floating-card-dialog-side={hasOpenDialog ? dialogSide : "none"}
        className="relative"
        style={{
          width: payload.size.width,
          minHeight: payload.size.height,
          marginLeft: cardOffsetLeft,
        }}
      >
        {payload.kind === "note" && note && isInteractive ? (
          <FloatingNoteCard
            note={note}
            width={payload.size.width}
            onBeginDrag={() => void startFloatingCardDrag(cardReference)}
            onDock={handleDock}
          />
        ) : payload.kind === "todo" && todo && isInteractive ? (
          <FloatingTodoItem
            todo={todo}
            width={payload.size.width}
            order={payload.order}
            onBeginDrag={() => void startFloatingCardDrag(cardReference)}
            onDock={handleDock}
            onToggle={handleToggleTodo}
          />
        ) : payload.kind === "note" ? (
          <div
            role="button"
            tabIndex={0}
            aria-label={t.notes.reorder}
            className="relative cursor-grab active:cursor-grabbing"
            style={{ width: payload.size.width, height: payload.size.height }}
            onPointerDown={() => {
              void startFloatingCardDrag(cardReference);
            }}
          >
            <NoteCardPreview note={createPreviewNoteCard(payload)} width={payload.size.width} />
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            aria-label={t.todos.reorder}
            className="relative cursor-grab active:cursor-grabbing"
            style={{ width: payload.size.width, height: payload.size.height }}
            onPointerDown={() => {
              void startFloatingCardDrag(cardReference);
            }}
          >
            <TodoItemPreview todo={payload.todo} width={payload.size.width} order={payload.order} />
          </div>
        )}
      </article>
    </main>
  );
}
