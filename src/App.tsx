import { AnimatePresence, motion } from "framer-motion";
import { startTransition, useEffect, useState } from "react";
import { PanelShell } from "./components/layout/PanelShell";
import { NotesList } from "./components/notes/NotesList";
import { FigmaNotesHomePreview } from "./components/preview/FigmaNotesHomePreview";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { TodoList } from "./components/todos/TodoList";
import { useAutoSave } from "./hooks/useAutoSave";
import { useHotkey } from "./hooks/useHotkey";
import {
  loadAllData,
  reportFrontendError,
  reportFrontendReady,
  setEditableInputActive,
  setTextCompositionActive,
} from "./hooks/usePlatform";
import { useI18n } from "./lib/i18n";
import { subscribeToPanelPosition, subscribeToPanelWillOpen, subscribeToTodosUpdated } from "./lib/nativeBridge";
import type { TabId } from "./lib/models";
import { getTabMotionConfig } from "./lib/transitionMotion";
import { useNotesStore } from "./store/notesStore";
import { useSettingsStore } from "./store/settingsStore";
import { useTodosStore } from "./store/todosStore";

function isDesignPreviewMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return new URLSearchParams(window.location.search).get("preview") === "figma-notes-home";
}

type TabTurnDirection = -1 | 1;

function getTabDirection(activeTab: TabId): TabTurnDirection {
  return activeTab === "todos" ? 1 : -1;
}

function QuickNoteApp() {
  const { t } = useI18n();
  const activeTab = useSettingsStore((state) => state.activeTab);
  const hotkey = useSettingsStore((state) => state.hotkey);
  const transitionStyle = useSettingsStore((state) => state.transitionStyle);
  const animationSpeed = useSettingsStore((state) => state.animationSpeed);
  const setActiveTab = useSettingsStore((state) => state.setActiveTab);
  const [isBooting, setIsBooting] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useAutoSave();
  useHotkey(hotkey);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.dataset.quicknoteFrontendState = "mounted";

    return () => {
      delete document.documentElement.dataset.quicknoteFrontendState;
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
    return subscribeToTodosUpdated((todos) => {
      startTransition(() => {
        useTodosStore.getState().initialize(todos);
      });
    });
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      return (
        target.isContentEditable ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      );
    };

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
        console.error("QuickNote failed to load initial data.", error);
        if (typeof document !== "undefined") {
          document.documentElement.dataset.quicknoteFrontendState = "error";
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
        document.documentElement.dataset.quicknoteFrontendState = "booting";
      }
      return;
    }

    if (typeof document !== "undefined") {
      document.documentElement.dataset.quicknoteFrontendState = "ready";
    }

    void reportFrontendReady();
  }, [isBooting]);

  const tabDirection = getTabDirection(activeTab);
  const tabMotion = getTabMotionConfig(transitionStyle, animationSpeed);

  return (
    <PanelShell
      activeTab={activeTab}
      animationSpeed={animationSpeed}
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
              <div className="relative h-full overflow-hidden rounded-[24px]">
                {activeTab === "notes" ? <NotesList /> : <TodoList />}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </PanelShell>
  );
}

function App() {
  if (isDesignPreviewMode()) {
    return <FigmaNotesHomePreview />;
  }

  return <QuickNoteApp />;
}

export default App;
