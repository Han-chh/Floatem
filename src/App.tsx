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
import type { AnimationSpeed, TabId, TransitionStyle } from "./lib/models";
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

type TabTurnDirection = -1 | 1;

function getTabDirection(activeTab: TabId): TabTurnDirection {
  return activeTab === "todos" ? 1 : -1;
}

function getTabMotionConfig(transitionStyle: TransitionStyle, animationSpeed: AnimationSpeed) {
  const duration = transitionStyle === "page" ? (animationSpeed === "faster" ? 0.5 : 0.6) : getTransitionDuration(animationSpeed);

  if (transitionStyle === "page") {
    return {
      variants: {
        initial: (direction: TabTurnDirection) => ({
          opacity: 0.46,
          x: direction === 1 ? 78 : -78,
          rotateY: direction === 1 ? 108 : -108,
          scale: 0.9,
          filter: "brightness(0.82) saturate(0.88)",
          zIndex: 0,
          transformOrigin: direction === 1 ? "right center" : "left center",
        }),
        animate: {
          opacity: 1,
          x: 0,
          rotateY: 0,
          scale: 1,
          filter: "brightness(1) saturate(1)",
          zIndex: 1,
          transformOrigin: "center center",
        },
        exit: (direction: TabTurnDirection) => ({
          opacity: 0.22,
          x: direction === 1 ? -92 : 92,
          rotateY: direction === 1 ? -116 : 116,
          scale: 0.92,
          filter: "brightness(0.74) saturate(0.84)",
          zIndex: 2,
          transformOrigin: direction === 1 ? "left center" : "right center",
        }),
      },
      transition: { duration, ease: [0.2, 0.9, 0.24, 1] as const },
      style: {
        transformStyle: "preserve-3d" as const,
        backfaceVisibility: "hidden" as const,
      },
    };
  }

  return {
    variants: {
      initial: (direction: TabTurnDirection) => ({ opacity: 0, x: direction === 1 ? 14 : -14, scale: 0.99 }),
      animate: { opacity: 1, x: 0, scale: 1 },
      exit: (direction: TabTurnDirection) => ({ opacity: 0, x: direction === 1 ? -12 : 12, scale: 0.995 }),
    },
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

  const tabDirection = getTabDirection(activeTab);
  const tabMotion = getTabMotionConfig(transitionStyle, animationSpeed);

  return (
    <PanelShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      showSettings={showSettings}
      onToggleSettings={() => setShowSettings((current) => !current)}
      settingsPanel={<SettingsPanel onClose={() => setShowSettings(false)} />}
    >
      {isBooting ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="paper-card flex h-full items-center justify-center rounded-[26px] text-[13px] font-medium text-[var(--muted)]"
        >
          Loading QuickNote...
        </motion.div>
      ) : (
        <div
          className="relative h-full overflow-hidden rounded-[26px]"
          style={transitionStyle === "page" ? { perspective: 1100, transformStyle: "preserve-3d" } : undefined}
        >
          <AnimatePresence initial={false} mode={transitionStyle === "page" ? "sync" : "wait"} custom={tabDirection}>
            <motion.div
              key={activeTab}
              custom={tabDirection}
              variants={tabMotion.variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={tabMotion.transition}
              style={tabMotion.style}
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
