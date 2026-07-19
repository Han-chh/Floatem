import { AnimatePresence, motion } from "framer-motion";
import { Component, startTransition, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { DragPreviewApp } from "./components/drag-preview/DragPreviewApp";
import { TooltipLayer } from "./components/feedback/TooltipLayer";
import { FloatingNoteApp } from "./components/floating-note/FloatingNoteApp";
import { PanelShell } from "./components/layout/PanelShell";
import { NotesList } from "./components/notes/NotesList";
import { FigmaNotesHomePreview } from "./components/preview/FigmaNotesHomePreview";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { TodoList } from "./components/todos/TodoList";
import { AlertTriangleIcon } from "./components/icons/AppIcons";
import { useAutoSave } from "./hooks/useAutoSave";
import { useHotkey } from "./hooks/useHotkey";
import { useTheme } from "./hooks/useTheme";
import {
  getHotkeyRegistrationState,
  loadAllData,
  reportFrontendError,
  reportFrontendReady,
  setEditableInputActive,
  setTextCompositionActive,
} from "./hooks/usePlatform";
import { useI18n } from "./lib/i18n";
import {
  subscribeToPanelPosition,
  subscribeToPanelWillOpen,
  subscribeToFloatingCardsState,
  subscribeToFloatingDockZoneEnter,
  subscribeToFloatingDockZoneLeave,
  subscribeToHotkeyRegistrationState,
  subscribeToNotesUpdated,
  subscribeToTextColorPanelClose,
  subscribeToTextColorPanelOpen,
  subscribeToTodosUpdated,
} from "./lib/nativeBridge";
import { isFloatingDockZoneTarget, isSameDockZoneTarget } from "./lib/dnd/floatingDockZone";
import type { DockZoneEventDetail } from "./lib/nativeBridge";
import type { TabId } from "./lib/models";
import { getPlatformFeatures } from "./lib/platformFeatures";
import { getTabMotionConfig } from "./lib/transitionMotion";
import { useNotesStore } from "./store/notesStore";
import { useSettingsStore } from "./store/settingsStore";
import { useTodosStore } from "./store/todosStore";

function getFrontendMode() {
  if (typeof window === "undefined") {
    return "main" as const;
  }

  const searchParams = new URLSearchParams(window.location.search);

  if (searchParams.get("mode") === "drag-preview") {
    return "drag-preview" as const;
  }

  if (searchParams.get("mode") === "floating-note") {
    return "floating-note" as const;
  }

  if (searchParams.get("preview") === "figma-notes-home") {
    return "figma-notes-home" as const;
  }

  return "main" as const;
}

type TabTurnDirection = -1 | 1;

type FrontendErrorBoundaryProps = {
  children: ReactNode;
};

type FrontendErrorBoundaryState = {
  hasError: boolean;
};

class FrontendErrorBoundary extends Component<FrontendErrorBoundaryProps, FrontendErrorBoundaryState> {
  state: FrontendErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): FrontendErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorMessage = error?.stack || error?.message || String(error);
    const componentStack = errorInfo.componentStack?.trim() || "[empty component stack]";
    void reportFrontendError(
      `React error boundary caught: ${errorMessage}\ncomponentStack=${componentStack}`,
      "react-error-boundary",
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="paper-card flex h-full items-center justify-center rounded-[26px] text-[13px] font-medium text-[var(--muted)]">
          StickIt encountered an internal rendering error.
        </div>
      );
    }

    return this.props.children;
  }
}

function getTabDirection(activeTab: TabId): TabTurnDirection {
  return activeTab === "todos" ? 1 : -1;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement
  );
}

function StickItApp() {
  const { t } = useI18n();
  const activeTab = useSettingsStore((state) => state.activeTab);
  const hotkey = useSettingsStore((state) => state.hotkey);
  const hotkeyRegistrationState = useSettingsStore((state) => state.hotkeyRegistrationState);
  const transitionStyle = useSettingsStore((state) => state.transitionStyle);
  const animationSpeed = useSettingsStore((state) => state.animationSpeed);
  const setActiveTab = useSettingsStore((state) => state.setActiveTab);
  const noteCards = useNotesStore((state) => state.cards);
  const todoItems = useTodosStore((state) => state.todos);
  const [isBooting, setIsBooting] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [activeDockZoneTarget, setActiveDockZoneTarget] = useState<DockZoneEventDetail | null>(null);
  const isNativeTextColorPanelOpenRef = useRef(false);
  const isDockZoneActive = activeDockZoneTarget !== null;

  useAutoSave();
  useHotkey(hotkey);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.dataset.stickitFrontendState = "mounted";

    return () => {
      delete document.documentElement.dataset.stickitFrontendState;
    };
  }, []);

  useEffect(() => {
    return subscribeToPanelPosition((panelPosition) => {
      useSettingsStore.getState().setPanelPosition(panelPosition);
    });
  }, []);

  useEffect(() => {
    return subscribeToPanelWillOpen(() => {
      startTransition(() => {
        setShowSettings(false);
        useSettingsStore.getState().applyPreferredOpenSection();
      });
    });
  }, []);

  useEffect(() => {
    const settingsStore = useSettingsStore.getState();
    const unsubscribe = subscribeToHotkeyRegistrationState((state) => {
      settingsStore.setHotkeyRegistrationState(state);
    });

    void getHotkeyRegistrationState()
      .then((state) => {
        settingsStore.setHotkeyRegistrationState(state);
      })
      .catch((error) => {
        console.error("StickIt failed to read the current hotkey registration state.", error);
      });

    return unsubscribe;
  }, []);

  useEffect(() => {
    return subscribeToNotesUpdated((notes) => {
      startTransition(() => {
        const floatingCardIds = useNotesStore.getState().floatingCardIds;
        useNotesStore.getState().initialize(notes);
        useNotesStore.getState().setFloatingCardIds(floatingCardIds);
      });
    });
  }, []);

  useEffect(() => {
    return subscribeToTodosUpdated((todos) => {
      startTransition(() => {
        const floatingTodoIds = useTodosStore.getState().floatingTodoIds;
        useTodosStore.getState().initialize(todos);
        useTodosStore.getState().setFloatingTodoIds(floatingTodoIds);
      });
    });
  }, []);

  useEffect(() => {
    const features = getPlatformFeatures();
    const canUseFloatingCards = features.floatingNotes || features.floatingTodos;

    if (typeof window === "undefined" || !canUseFloatingCards) {
      return;
    }

    let frame: number | null = null;
    const unsubscribe = subscribeToFloatingCardsState((state) => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }

      frame = window.requestAnimationFrame(() => {
        frame = null;

        try {
          useNotesStore.getState().setFloatingCardIds(state.noteIds);
          useTodosStore.getState().setFloatingTodoIds(state.todoIds);
        } catch (error) {
          const message = error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error);
          void reportFrontendError(
            `Failed to apply floating cards state: ${message} payload=${JSON.stringify(state)}`,
            "floating-cards-state-listener",
          );
        }
      });
    });

    return () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }

      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const features = getPlatformFeatures();
    if (!features.floatingNotes && !features.floatingTodos) {
      return;
    }

    return subscribeToFloatingDockZoneEnter((detail) => {
      const noteIds = useNotesStore.getState().cards.map((card) => card.id);
      const todoIds = useTodosStore.getState().todos.map((todo) => todo.id);

      if (!isFloatingDockZoneTarget(detail, { noteIds, todoIds })) {
        return;
      }

      // Instant visual feedback — startTransition would defer the green
      // dock-zone highlight, defeating the purpose of real-time feedback.
      setShowSettings(false);
      const targetTab = detail.kind === "note" ? "notes" : "todos";
      if (useSettingsStore.getState().activeTab !== targetTab) {
        setActiveTab(targetTab);
      }
      if (detail.kind === "todo") {
        const todo = useTodosStore.getState().todos.find((item) => item.id === detail.id);
        if (todo && useTodosStore.getState().selectedDateKey !== todo.dateKey) {
          useTodosStore.getState().selectDate(todo.dateKey);
        }
      }
      setActiveDockZoneTarget(detail);
    });
  }, [setActiveTab]);

  useEffect(() => {
    const features = getPlatformFeatures();
    if (!features.floatingNotes && !features.floatingTodos) {
      return;
    }

    return subscribeToFloatingDockZoneLeave((detail) => {
      setActiveDockZoneTarget((current) => (isSameDockZoneTarget(current, detail) ? null : current));
    });
  }, []);

  useEffect(() => {
    if (!activeDockZoneTarget) {
      return;
    }

    if (isFloatingDockZoneTarget(activeDockZoneTarget, {
      noteIds: noteCards.map((card) => card.id),
      todoIds: todoItems.map((todo) => todo.id),
    })) {
      return;
    }

    setActiveDockZoneTarget(null);
  }, [activeDockZoneTarget, noteCards, todoItems]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const handleCompositionStart = (event: CompositionEvent) => {
      if (!isEditableTarget(event.target)) {
        return;
      }

      void setEditableInputActive(true);
      void setTextCompositionActive(true);
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!isEditableTarget(event.target)) {
        return;
      }

      void setEditableInputActive(true);
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (!isEditableTarget(event.target)) {
        return;
      }

      if (isNativeTextColorPanelOpenRef.current) {
        return;
      }

      void setEditableInputActive(false);
      void setTextCompositionActive(false);
    };

    const handleCompositionEnd = (event: CompositionEvent) => {
      if (!isEditableTarget(event.target)) {
        return;
      }

      void setTextCompositionActive(false);
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
    const syncEditableBridgeState = () => {
      if (typeof document === "undefined") {
        return;
      }

      const activeElement = document.activeElement;
      const hasEditableFocus = isEditableTarget(activeElement);

      void setEditableInputActive(hasEditableFocus);

      if (!hasEditableFocus) {
        void setTextCompositionActive(false);
      }
    };

    const unsubscribeOpen = subscribeToTextColorPanelOpen(() => {
      isNativeTextColorPanelOpenRef.current = true;
      void setEditableInputActive(true);
    });

    const unsubscribeClose = subscribeToTextColorPanelClose(() => {
      isNativeTextColorPanelOpenRef.current = false;
      syncEditableBridgeState();
    });

    return () => {
      unsubscribeOpen();
      unsubscribeClose();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void loadAllData()
      .then(({ notes, todos, settings }) => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          useNotesStore.getState().initialize(notes);
          useTodosStore.getState().initialize(todos);
          const settingsStore = useSettingsStore.getState();
          settingsStore.hydrateSettings(settings);
          settingsStore.applyPreferredOpenSection();
          setIsBooting(false);
        });
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error("StickIt failed to load initial data.", error);
        if (typeof document !== "undefined") {
          document.documentElement.dataset.stickitFrontendState = "error";
        }
        void reportFrontendError(`Initial data load failed: ${message}`, "loadAllData");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isBooting) {
      if (typeof document !== "undefined") {
        document.documentElement.dataset.stickitFrontendState = "booting";
      }
      return;
    }

    if (typeof document !== "undefined") {
      document.documentElement.dataset.stickitFrontendState = "ready";
    }

    void reportFrontendReady();
  }, [isBooting]);

  const tabDirection = getTabDirection(activeTab);
  const tabMotion = getTabMotionConfig(transitionStyle, animationSpeed);
  const showHotkeyConflictBanner = hotkeyRegistrationState?.registration === "conflict";

  return (
    <FrontendErrorBoundary>
      <PanelShell
      activeTab={activeTab}
      animationSpeed={animationSpeed}
      banner={
        showHotkeyConflictBanner ? (
          <div className="rounded-[20px] border border-[rgba(201,93,68,0.32)] bg-[rgba(201,93,68,0.12)] px-3.5 py-3 text-[12px] text-[rgb(150,68,52)]">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 inline-flex shrink-0">
                <AlertTriangleIcon size={15} />
              </span>
              <div className="min-w-0">
                <p className="font-semibold">{t.settings.hotkeyConflictBannerTitle}</p>
                <p className="mt-1 leading-5">
                  {t.settings.hotkeyConflictBannerBody(hotkeyRegistrationState.shortcut)}
                </p>
              </div>
            </div>
          </div>
        ) : null
      }
      onTabChange={setActiveTab}
      showSettings={showSettings}
      onToggleSettings={() => setShowSettings((current) => !current)}
      settingsPanel={<SettingsPanel onClose={() => setShowSettings(false)} />}
      transitionStyle={transitionStyle}
    >
      {isBooting ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="paper-card flex h-full items-center justify-center rounded-[26px] text-[13px] font-medium text-[var(--muted)]"
        >
          {t.app.loading}
        </motion.div>
      ) : (
        <div
          className="relative h-full overflow-hidden rounded-[26px]"
          style={tabMotion.sceneStyle}
        >
          <AnimatePresence initial={false} mode={tabMotion.presenceMode} custom={tabDirection}>
            <motion.div
              key={activeTab}
              custom={tabDirection}
              variants={tabMotion.variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={tabMotion.transition}
              style={tabMotion.contentStyle}
              className="absolute inset-px h-auto will-change-transform"
            >
              <div
                className={`relative h-full overflow-hidden rounded-[24px] ${
                  isDockZoneActive
                    ? "border-2 border-[rgba(31,168,122,0.82)] bg-[rgba(31,168,122,0.05)] shadow-[0_0_0_4px_rgba(31,168,122,0.14)]"
                    : ""
                }`}
              >
                {activeTab === "notes" ? (
                  <NotesList dockZoneTarget={activeDockZoneTarget} />
                ) : (
                  <TodoList dockZoneTarget={activeDockZoneTarget} />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}
      </PanelShell>
      <TooltipLayer />
    </FrontendErrorBoundary>
  );
}

function App() {
  useTheme();
  const mode = getFrontendMode();

  if (mode === "figma-notes-home") {
    return (
      <>
        <FigmaNotesHomePreview />
        <TooltipLayer />
      </>
    );
  }

  if (mode === "drag-preview") {
    return <DragPreviewApp />;
  }

  if (mode === "floating-note") {
    return (
      <>
        <FloatingNoteApp />
        <TooltipLayer />
      </>
    );
  }

  return <StickItApp />;
}

export default App;
