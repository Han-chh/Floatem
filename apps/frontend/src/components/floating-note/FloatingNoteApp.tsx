import type { DragPreviewPayload, FloatingCardScreenPlacement } from "@stickit/native-bridge";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Descendant } from "slate";
import {
  closeFloatingCard,
  getFloatingCardScreenPlacement,
  loadAllData,
  reportFrontendReady,
  resizeFloatingCard,
  saveTodos,
  setEditableInputActive,
  setFloatingCardDesktopPinned,
  setTextCompositionActive,
  startFloatingCardDrag,
} from "../../hooks/usePlatform";
import { useAutoSave } from "../../hooks/useAutoSave";
import { useTheme } from "../../hooks/useTheme";
import { FLOATING_CARD_STATE_EVENT } from "../../lib/dragPreview";
import { useI18n } from "../../lib/i18n";
import type { FloatingCardGuideState } from "../../lib/nativeBridge";
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
    __STICKIT_FLOATING_CARD_STATE__?: DragPreviewPayload | null;
    __STICKIT_FLOATING_CARD_GUIDE__?: FloatingCardGuideState | null;
  }
}

const FLOATING_TODO_COMPLETE_DOCK_DELAY_MS = 650;
const FLOATING_DIALOG_VIEWPORT_SIZE = {
  width: 480,
  height: 680,
};
const FLOATING_DIALOG_GAP_PX = 12;
const MAX_FLOATING_CARD_CONTENT_SCALE = 1.65;
const FLOATING_DIALOG_BACKDROP_SELECTOR = ".stickit-modal-backdrop";
const EDITABLE_TARGET_SELECTOR = 'input,textarea,select,[contenteditable="true"],[role="textbox"]';
const FLOATING_CARD_GUIDE_EVENT = "stickit:floating-card-guide";
type FloatingDialogSide = "left" | "right";

function FloatingCardGuideOverlay({
  guide,
  showLaunchAtLoginDialog,
}: {
  guide: FloatingCardGuideState | null;
  showLaunchAtLoginDialog: boolean;
}) {
  const { t } = useI18n();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const isPinTarget = Boolean(
    guide && (guide.phase === "pin" || guide.phase === "unpin") && !showLaunchAtLoginDialog,
  );
  const isDragTarget = guide?.phase === "drag" && !showLaunchAtLoginDialog;
  const isResizeTarget = guide?.phase === "resize" && !showLaunchAtLoginDialog;
  const displayTitle = showLaunchAtLoginDialog ? t.common.guideLaunchAtLoginTitle : guide?.title;
  const displayInstruction = showLaunchAtLoginDialog
    ? t.common.guideLaunchAtLoginInstruction
    : guide?.instruction;
  const isVisible = Boolean(guide) || showLaunchAtLoginDialog;

  useEffect(() => {
    if (!isVisible) {
      setTargetRect(null);
      return;
    }

    const selector = showLaunchAtLoginDialog
      ? "[data-floating-launch-at-login-dialog]"
      : guide?.phase === "drag"
        ? '[data-testid="floating-card-shell"]'
        : guide?.phase === "resize"
          ? '[data-action="floating-card-resize"]'
        : guide?.phase === "close"
        ? '[data-action="dock"]'
        : '[data-action="desktop-pin"] [data-desktop-pin-indicator]';
    const update = () => {
      const target = document.querySelector<HTMLElement>(selector);
      setTargetRect(target?.getBoundingClientRect() ?? null);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [guide, isVisible, showLaunchAtLoginDialog]);

  if (!isVisible || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <motion.div
      key={showLaunchAtLoginDialog ? "launch-at-login" : guide?.phase}
      data-floating-guide-overlay
      className="pointer-events-none fixed inset-0 z-[190]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
          <motion.div
            className="absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_75%_18%,rgba(255,122,89,0.06),rgba(30,25,21,0.12))]"
            animate={{ opacity: [0.68, 0.9, 0.68] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
          {targetRect ? (
            <motion.div
              data-floating-guide-highlight
              data-floating-guide-pin-ring={isPinTarget ? "true" : undefined}
              data-floating-guide-drag-ring={isDragTarget ? "true" : undefined}
              data-floating-guide-resize-ring={isResizeTarget ? "true" : undefined}
              data-floating-guide-dialog-ring={showLaunchAtLoginDialog ? "true" : undefined}
              className={`fixed border-2 border-[#ff4f3d] shadow-[0_0_0_5px_rgba(255,79,61,0.22),0_8px_24px_rgba(61,49,34,0.2)] ${
                isPinTarget
                  ? "rounded-full"
                  : isDragTarget
                    ? "rounded-[26px]"
                    : isResizeTarget
                      ? "rounded-[10px]"
                      : "rounded-[30px]"
              }`}
              style={{
                height: targetRect.height + (isPinTarget ? 14 : 10),
                left: targetRect.left - (isPinTarget ? 7 : 5),
                top: targetRect.top - (isPinTarget ? 7 : 5),
                width: targetRect.width + (isPinTarget ? 14 : 10),
              }}
              animate={{
                opacity: [0.72, 1, 0.72],
                boxShadow: [
                  "0 0 0 3px rgba(255,79,61,0.18), 0 8px 24px rgba(61,49,34,0.16)",
                  "0 0 0 7px rgba(255,79,61,0.3), 0 8px 24px rgba(61,49,34,0.22)",
                  "0 0 0 3px rgba(255,79,61,0.18), 0 8px 24px rgba(61,49,34,0.16)",
                ],
              }}
              transition={{ duration: 1.05, repeat: Infinity }}
            />
          ) : null}
          <motion.aside
            role="dialog"
            aria-label={showLaunchAtLoginDialog ? `Guide: ${displayTitle}` : displayTitle ?? ""}
            className="absolute bottom-2.5 left-2.5 max-w-[calc(100%-20px)] rounded-[13px] border border-[rgba(255,122,89,0.34)] bg-[rgba(255,252,248,0.96)] px-3 py-2 shadow-[0_12px_28px_rgba(61,49,34,0.2)] backdrop-blur-xl"
            initial={{ opacity: 0, x: -8, y: 5, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 6, scale: 0.97 }}
            transition={{ duration: 0.22 }}
          >
            <div className="flex items-center gap-2">
              <motion.span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full bg-[#ff7a59]"
                animate={{ boxShadow: ["0 0 0 0 rgba(255,122,89,.4)", "0 0 0 7px rgba(255,122,89,0)"] }}
                transition={{ duration: 1.15, repeat: Infinity }}
              />
              <div className="min-w-0">
                <p className="text-[10.5px] font-bold text-[#8f553d]">{displayTitle}</p>
                <p className={`text-[9.5px] font-semibold leading-4 text-[var(--muted)] ${
                  showLaunchAtLoginDialog ? "" : "truncate"
                }`}>
                  {displayInstruction}
                </p>
              </div>
            </div>
          </motion.aside>
    </motion.div>,
    document.body,
  );
}

function readInitialState() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.__STICKIT_FLOATING_CARD_STATE__ ?? null;
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

function getFloatingCardContentScale(
  size: { width: number; height: number },
  minimumSize: { width: number; height: number },
  widthOnly = false,
) {
  const widthScale = size.width / Math.max(1, minimumSize.width);
  const heightScale = size.height / Math.max(1, minimumSize.height);

  const availableScale = widthOnly ? widthScale : Math.min(widthScale, heightScale);
  return Math.min(MAX_FLOATING_CARD_CONTENT_SCALE, Math.max(1, availableScale));
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
  useTheme();
  const initialPayload = readInitialState();
  const [payload, setPayload] = useState<DragPreviewPayload | null>(initialPayload);
  const [cardSize, setCardSize] = useState(() => initialPayload?.size ?? { width: 1, height: 1 });
  const [frameSize, setFrameSize] = useState(() => initialPayload?.size ?? { width: 1, height: 1 });
  const [isDesktopPinned, setIsDesktopPinned] = useState(() => Boolean(initialPayload?.desktopPinned));
  const [showDesktopBackgroundGuide, setShowDesktopBackgroundGuide] = useState(false);
  const [hasOpenDialog, setHasOpenDialog] = useState(false);
  const [dialogSide, setDialogSide] = useState<FloatingDialogSide>("right");
  const [isHydrated, setIsHydrated] = useState(false);
  const [floatingGuide, setFloatingGuide] = useState<FloatingCardGuideState | null>(
    () => window.__STICKIT_FLOATING_CARD_GUIDE__ ?? null,
  );
  const contentRef = useRef<HTMLElement | null>(null);
  const syncedFrameSizeRef = useRef(frameSize);
  const expandedCardSizeRef = useRef<{ width: number; height: number }>((() => {
    const minimum = initialPayload?.minimumSize ?? initialPayload?.size ?? { width: 1, height: 1 };
    const size = initialPayload?.size ?? minimum;
    return {
      width: Math.max(size.width, minimum.width),
      height: Math.max(size.height, minimum.height),
    };
  })());
  const previousNoteCollapsedRef = useRef(
    initialPayload?.kind === "note" ? initialPayload.note.collapsed : false,
  );
  const isDialogOpenRef = useRef(false);
  const lastDialogSideRef = useRef<FloatingDialogSide>("right");
  const completeDockTimerRef = useRef<number | null>(null);
  const desktopPinRequestRef = useRef(0);
  const confirmedDesktopPinRef = useRef<boolean | null>(null);
  const dialogStateRequestRef = useRef(0);
  const hasEditableFocusRef = useRef(false);
  const isTextComposingRef = useRef(false);
  const minimumCardSizeRef = useRef(initialPayload?.minimumSize ?? initialPayload?.size ?? { width: 1, height: 1 });
  const resizeSessionRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);
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

    html.dataset.stickitFloatingCardWindow = "true";
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.margin = "0";
    body.style.padding = "0";
    if (root) {
      root.style.overflow = "hidden";
    }

    return () => {
      delete html.dataset.stickitFloatingCardWindow;
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
    const handleGuideState = (event: Event) => {
      const guide = (event as CustomEvent<FloatingCardGuideState | null>).detail ?? null;
      window.__STICKIT_FLOATING_CARD_GUIDE__ = guide;
      setFloatingGuide(guide);
    };
    window.addEventListener(FLOATING_CARD_GUIDE_EVENT, handleGuideState as EventListener);
    return () => window.removeEventListener(FLOATING_CARD_GUIDE_EVENT, handleGuideState as EventListener);
  }, []);

  useEffect(() => {
    if (!payload) {
      return;
    }

    syncedFrameSizeRef.current = payload.size;
    minimumCardSizeRef.current = payload.minimumSize ?? payload.size;
    if (payload.kind !== "note" || !payload.note.collapsed) {
      expandedCardSizeRef.current = {
        width: Math.max(payload.size.width, payload.minimumSize?.width ?? payload.size.width),
        height: Math.max(payload.size.height, payload.minimumSize?.height ?? payload.size.height),
      };
    }
    setCardSize((current) => ({
      width: Math.max(payload.size.width, current.width),
      height: Math.max(payload.size.height, current.height),
    }));
    setFrameSize(payload.size);
    setIsDesktopPinned(confirmedDesktopPinRef.current ?? Boolean(payload.desktopPinned));
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
        width: Math.max(cardSize.width, Math.ceil(rect.width || cardSize.width)),
        height: Math.max(cardSize.height, Math.ceil(rect.height || cardSize.height)),
      };
      const nextSize = hasOpenDialog
        ? {
            width: Math.max(
              contentSize.width,
              cardSize.width + FLOATING_DIALOG_GAP_PX + FLOATING_DIALOG_VIEWPORT_SIZE.width,
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
  }, [cardSize, dialogSide, hasOpenDialog, payload]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const syncDialogState = () => {
      const isOpen = Boolean(document.body.querySelector(FLOATING_DIALOG_BACKDROP_SELECTOR));
      if (isOpen && !isDialogOpenRef.current && payload) {
        const cardRect = contentRef.current?.getBoundingClientRect();
        const cardScreenLeft = Number(window.screenX) + (cardRect?.left ?? 0);
        const cardWidth = Math.ceil(cardRect?.width || cardSize.width);
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
  }, [cardSize.width, payload]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const html = document.documentElement;
    html.dataset.stickitFloatingDialogSide = dialogSide;
    html.style.setProperty("--stickit-floating-card-width", `${cardSize.width}px`);
    html.style.setProperty("--stickit-floating-dialog-width", `${FLOATING_DIALOG_VIEWPORT_SIZE.width}px`);
    html.style.setProperty("--stickit-floating-dialog-gap", `${FLOATING_DIALOG_GAP_PX}px`);

    return () => {
      delete html.dataset.stickitFloatingDialogSide;
      html.style.removeProperty("--stickit-floating-card-width");
      html.style.removeProperty("--stickit-floating-dialog-width");
      html.style.removeProperty("--stickit-floating-dialog-gap");
    };
  }, [cardSize.width, dialogSide]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleState = (event: Event) => {
      const detail = (event as CustomEvent<DragPreviewPayload | null>).detail;
      setPayload(detail ?? window.__STICKIT_FLOATING_CARD_STATE__ ?? null);
    };

    window.addEventListener(FLOATING_CARD_STATE_EVENT, handleState as EventListener);

    return () => {
      window.removeEventListener(FLOATING_CARD_STATE_EVENT, handleState as EventListener);
    };
  }, []);

  useEffect(() => {
    // The native host replays the current payload and guide only after this
    // acknowledgement. Keep this effect after both event-listener effects so
    // the first floating-window guide cannot disappear into the mount race.
    void reportFrontendReady();
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
        language: payload.language === "en" ? "en" : "zh-CN",
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
          language: payload.language === "en" ? "en" : "zh-CN",
          timeZone: payload.kind === "todo" ? payload.timeZone : settings.timeZone,
          timeFormat: payload.kind === "todo" ? payload.timeFormat : settings.timeFormat,
          enableParticles: false,
        });
        useNotesStore.getState().initialize(notes);
        useTodosStore.getState().initialize(todos);
        setIsHydrated(true);
      })
      .catch((error) => {
        console.error("StickIt failed to load floating card data.", error);
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

  const currentNoteCollapsed = payload?.kind === "note"
    ? noteCards.find((card) => card.id === payload.note.id)?.collapsed ?? payload.note.collapsed
    : false;

  useEffect(() => {
    if (!payload || payload.kind !== "note" || currentNoteCollapsed === previousNoteCollapsedRef.current) {
      previousNoteCollapsedRef.current = currentNoteCollapsed;
      return;
    }

    previousNoteCollapsedRef.current = currentNoteCollapsed;

    if (!currentNoteCollapsed) {
      const restoredSize = expandedCardSizeRef.current;
      syncedFrameSizeRef.current = restoredSize;
      setCardSize(restoredSize);
      setFrameSize(restoredSize);
      void resizeFloatingCard({
        ...restoredSize,
        anchor: "top",
        horizontalAnchor: "left",
      });
      return;
    }

    expandedCardSizeRef.current = cardSize;
    const animationFrame = window.requestAnimationFrame(() => {
      const collapsedCard = contentRef.current?.querySelector<HTMLElement>('[data-testid="note-card"]');
      if (!collapsedCard) {
        return;
      }

      const collapsedSize = {
        width: cardSize.width,
        height: Math.max(1, Math.ceil(collapsedCard.getBoundingClientRect().height)),
      };
      syncedFrameSizeRef.current = collapsedSize;
      setCardSize(collapsedSize);
      setFrameSize(collapsedSize);
      void resizeFloatingCard({
        ...collapsedSize,
        anchor: "top",
        horizontalAnchor: "left",
        allowBelowMinimum: true,
      });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [currentNoteCollapsed, payload]);

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
  const isCollapsedFloatingNote = payload.kind === "note" && Boolean(note?.collapsed);
  const minimumCardSize = payload.minimumSize ?? payload.size;
  const contentScale = getFloatingCardContentScale(cardSize, minimumCardSize, isCollapsedFloatingNote);
  const contentSize = {
    width: cardSize.width / contentScale,
    height: cardSize.height / contentScale,
  };
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

  const handleDesktopPinToggle = async () => {
    const nextPinned = !isDesktopPinned;
    const requestID = desktopPinRequestRef.current + 1;
    desktopPinRequestRef.current = requestID;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsDesktopPinned(nextPinned);
    try {
      const result = await setFloatingCardDesktopPinned(cardReference, nextPinned);
      if (desktopPinRequestRef.current !== requestID) {
        return;
      }

      const confirmedPinned = Boolean(result.pinned);
      confirmedDesktopPinRef.current = confirmedPinned;
      setIsDesktopPinned(confirmedPinned);
      if (window.__STICKIT_FLOATING_CARD_STATE__) {
        window.__STICKIT_FLOATING_CARD_STATE__ = {
          ...window.__STICKIT_FLOATING_CARD_STATE__,
          desktopPinned: confirmedPinned,
        };
      }
      if (result.requiresLaunchAtLogin) {
        setShowDesktopBackgroundGuide(true);
      }
    } catch {
      if (desktopPinRequestRef.current === requestID) {
        const restoredPinned = !nextPinned;
        confirmedDesktopPinRef.current = restoredPinned;
        setIsDesktopPinned(restoredPinned);
      }
    }
  };

  const updateUserSize = (clientX: number, clientY: number) => {
    const session = resizeSessionRef.current;
    if (!session) return;
    const deltaX = clientX - session.startX;
    const deltaY = clientY - session.startY;
    const minimum = minimumCardSizeRef.current;
    const nextSize = {
      width: Math.max(minimum.width, Math.round(session.startWidth + deltaX)),
      height: Math.max(minimum.height, Math.round(session.startHeight + deltaY)),
    };
    if (currentNoteCollapsed) {
      expandedCardSizeRef.current = {
        ...expandedCardSizeRef.current,
        width: nextSize.width,
      };
    }
    setCardSize(nextSize);
    setFrameSize(nextSize);
    syncedFrameSizeRef.current = nextSize;
    void resizeFloatingCard({ ...nextSize, anchor: "top", horizontalAnchor: "left" });
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
          width: cardSize.width,
          minHeight: cardSize.height,
          marginLeft: cardOffsetLeft,
        }}
      >
        <div
          data-testid="floating-card-scaled-content"
          data-floating-card-content-scale={contentScale.toFixed(3)}
          className="floating-card-scaled-content"
          style={{
            width: contentSize.width,
            minHeight: isCollapsedFloatingNote ? undefined : contentSize.height,
            zoom: contentScale,
          }}
        >
          {payload.kind === "note" && note && isInteractive ? (
            <FloatingNoteCard
              note={note}
              width={contentSize.width}
              minHeight={isCollapsedFloatingNote ? undefined : contentSize.height}
              onBeginDrag={() => void startFloatingCardDrag(cardReference)}
              onDock={handleDock}
              desktopPinned={isDesktopPinned}
              onToggleDesktopPinned={handleDesktopPinToggle}
            />
          ) : payload.kind === "todo" && todo && isInteractive ? (
            <FloatingTodoItem
              todo={todo}
              width={contentSize.width}
              minHeight={contentSize.height}
              order={payload.order}
              onBeginDrag={() => void startFloatingCardDrag(cardReference)}
              onDock={handleDock}
              onToggle={handleToggleTodo}
              desktopPinned={isDesktopPinned}
              onToggleDesktopPinned={handleDesktopPinToggle}
            />
          ) : payload.kind === "note" ? (
            <div
              role="button"
              tabIndex={0}
              aria-label={t.notes.reorder}
              className="relative cursor-grab active:cursor-grabbing"
              style={{ width: contentSize.width, height: contentSize.height }}
              onPointerDown={() => {
                void startFloatingCardDrag(cardReference);
              }}
            >
              <NoteCardPreview note={createPreviewNoteCard(payload)} width={contentSize.width} />
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              aria-label={t.todos.reorder}
              className="relative cursor-grab active:cursor-grabbing"
              style={{ width: contentSize.width, height: contentSize.height }}
              onPointerDown={() => {
                void startFloatingCardDrag(cardReference);
              }}
            >
              <TodoItemPreview todo={payload.todo} width={contentSize.width} order={payload.order} />
            </div>
          )}
        </div>
        {!hasOpenDialog ? (
          <div
            role="separator"
            aria-label={t.common.resizeFloatingCard}
            data-action="floating-card-resize"
            className="absolute bottom-0 right-0 z-40 h-8 w-8 cursor-nwse-resize"
            style={{
              scale: Math.min(contentScale, 1.35),
              transformOrigin: "bottom right",
            }}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              resizeSessionRef.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                startWidth: cardSize.width,
                startHeight: cardSize.height,
              };
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (resizeSessionRef.current?.pointerId !== event.pointerId) return;
              event.stopPropagation();
              updateUserSize(event.clientX, event.clientY);
            }}
            onPointerUp={(event) => {
              if (resizeSessionRef.current?.pointerId !== event.pointerId) return;
              updateUserSize(event.clientX, event.clientY);
              resizeSessionRef.current = null;
              event.currentTarget.releasePointerCapture?.(event.pointerId);
            }}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-1.5 right-1.5 h-3 w-3 rounded-br-[3px] border-b-2 border-r-2 border-[rgba(91,72,54,0.42)]"
            />
          </div>
        ) : null}
        {showDesktopBackgroundGuide && typeof document !== "undefined"
          ? createPortal(
              <div
                className="stickit-modal-backdrop fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(30,25,21,0.28)] p-5"
                role="presentation"
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label={t.common.widgetGuideAddTitle}
                  data-floating-launch-at-login-dialog
                  className="paper-panel w-full max-w-[390px] rounded-[24px] p-5 shadow-[0_26px_48px_rgba(30,25,21,0.24)]"
                >
                  <h2 className="font-display text-[21px] font-semibold text-[var(--brown-strong)]">
                    {t.common.widgetGuideAddTitle}
                  </h2>
                  <p className="mt-3 text-[12.5px] leading-6 text-[var(--muted)]">
                    {t.common.widgetGuideAddBody}
                  </p>
                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      className="paper-button rounded-[14px] px-4 py-2.5 text-[12px] font-semibold"
                      onClick={() => setShowDesktopBackgroundGuide(false)}
                    >
                      {t.launchAtLoginPrompt.notNow}
                    </button>
                    <button
                      type="button"
                      className="paper-button paper-button-primary ml-2 rounded-[14px] px-4 py-2.5 text-[12px] font-semibold"
                      onClick={() => {
                        useSettingsStore.getState().setLaunchAtLogin(true);
                        setShowDesktopBackgroundGuide(false);
                      }}
                    >
                      {t.launchAtLoginPrompt.enable}
                    </button>
                  </div>
                </div>
              </div>,
              document.body,
            )
          : null}
        <FloatingCardGuideOverlay
          guide={floatingGuide}
          showLaunchAtLoginDialog={showDesktopBackgroundGuide}
        />
      </article>
    </main>
  );
}
