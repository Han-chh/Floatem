import { AnimatePresence, motion } from "framer-motion";
import { startTransition, useEffect, useState } from "react";
import { PanelShell } from "./components/layout/PanelShell";
import { NotesList } from "./components/notes/NotesList";
import { FigmaNotesHomePreview } from "./components/preview/FigmaNotesHomePreview";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { TodoList } from "./components/todos/TodoList";
import { useAutoSave } from "./hooks/useAutoSave";
import { useHotkey } from "./hooks/useHotkey";
import { loadAllData, reportFrontendError, reportFrontendReady } from "./hooks/usePlatform";
import { subscribeToPanelPosition } from "./lib/nativeBridge";
import type { AnimationSpeed, TransitionStyle } from "./lib/models";
import { useNotesStore } from "./store/notesStore";
import { useSettingsStore } from "./store/settingsStore";
import { useTodosStore } from "./store/todosStore";

function isDesignPreviewMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return new URLSearchParams(window.location.search).get("preview") === "figma-notes-home";
}

function getTransitionDuration(animationSpeed: AnimationSpeed) {
  return animationSpeed === "faster" ? 0.16 : 0.22;
}

function getTabMotion(tabKey: "notes" | "todos", transitionStyle: TransitionStyle, animationSpeed: AnimationSpeed) {
  const duration = getTransitionDuration(animationSpeed);

  if (transitionStyle === "page") {
    return {
      initial: { opacity: 0, x: tabKey === "notes" ? -14 : 14, rotateY: tabKey === "notes" ? -18 : 18, scale: 0.985 },
      animate: { opacity: 1, x: 0, rotateY: 0, scale: 1 },
      exit: { opacity: 0, x: tabKey === "notes" ? 12 : -12, rotateY: tabKey === "notes" ? 14 : -14, scale: 0.992 },
      transition: { duration, ease: [0.16, 1, 0.3, 1] as const },
      style: {
        transformPerspective: 1600,
        transformOrigin: tabKey === "notes" ? "left center" : "right center",
      },
    };
  }

  return {
    initial: { opacity: 0, x: tabKey === "notes" ? -12 : 12, scale: 0.99 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: tabKey === "notes" ? 10 : -10, scale: 0.995 },
    transition: { duration, ease: [0.22, 1, 0.36, 1] as const },
  };
}

function QuickNoteApp() {
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
    let cancelled = false;

    void loadAllData()
      .then(({ notes, todos, settings }) => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          useNotesStore.getState().initialize(notes);
          useTodosStore.getState().initialize(todos);
          useSettingsStore.getState().hydrateSettings(settings);
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

  const notesMotion = getTabMotion("notes", transitionStyle, animationSpeed);
  const todosMotion = getTabMotion("todos", transitionStyle, animationSpeed);
  const settingsDuration = getTransitionDuration(animationSpeed);

  return (
    <AnimatePresence mode="wait">
      {showSettings ? (
        <motion.div
          key="settings-view"
          initial={{ opacity: 0, x: 18, scale: 0.988 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -18, scale: 0.992 }}
          transition={{ duration: settingsDuration, ease: [0.22, 1, 0.36, 1] }}
          className="h-full"
        >
          <SettingsPanel onClose={() => setShowSettings(false)} />
        </motion.div>
      ) : (
        <motion.div
          key="main-view"
          initial={{ opacity: 0, x: -12, scale: 0.988 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 12, scale: 0.994 }}
          transition={{ duration: settingsDuration, ease: [0.22, 1, 0.36, 1] }}
          className="h-full"
        >
          <PanelShell activeTab={activeTab} onTabChange={setActiveTab} onToggleSettings={() => setShowSettings(true)}>
            {isBooting ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="paper-card flex h-full items-center justify-center rounded-[26px] text-[13px] font-medium text-[var(--muted)]"
              >
                Loading QuickNote...
              </motion.div>
            ) : (
              <AnimatePresence mode="wait">
                {activeTab === "notes" ? (
                  <motion.div key="notes" {...notesMotion} className="h-full">
                    <NotesList />
                  </motion.div>
                ) : (
                  <motion.div key="todos" {...todosMotion} className="h-full">
                    <TodoList />
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </PanelShell>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function App() {
  if (isDesignPreviewMode()) {
    return <FigmaNotesHomePreview />;
  }

  return <QuickNoteApp />;
}

export default App;
