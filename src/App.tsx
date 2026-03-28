import { AnimatePresence, motion } from "framer-motion";
import { startTransition, useEffect, useState } from "react";
import { PanelShell } from "./components/layout/PanelShell";
import { NotesList } from "./components/notes/NotesList";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { TodoList } from "./components/todos/TodoList";
import { useAutoSave } from "./hooks/useAutoSave";
import { useHotkey } from "./hooks/useHotkey";
import { loadAllData } from "./hooks/usePlatform";
import { useNotesStore } from "./store/notesStore";
import { useSettingsStore } from "./store/settingsStore";
import { useTodosStore } from "./store/todosStore";

function App() {
  const activeTab = useSettingsStore((state) => state.activeTab);
  const hotkey = useSettingsStore((state) => state.hotkey);
  const setActiveTab = useSettingsStore((state) => state.setActiveTab);
  const [isBooting, setIsBooting] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useAutoSave();
  useHotkey(hotkey);

  useEffect(() => {
    let cancelled = false;

    void loadAllData().then(({ notes, todos, settings }) => {
      if (cancelled) {
        return;
      }

      startTransition(() => {
        useNotesStore.getState().initialize(notes);
        useTodosStore.getState().initialize(todos);
        useSettingsStore.getState().hydrateSettings(settings);
        setIsBooting(false);
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

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
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          className="paper-card flex h-full items-center justify-center rounded-[26px] text-[13px] font-medium text-[var(--muted)]"
        >
          Loading QuickNote...
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === "notes" ? (
            <motion.div
              key="notes"
              initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className="h-full"
            >
              <NotesList />
            </motion.div>
          ) : (
            <motion.div
              key="todos"
              initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className="h-full"
            >
              <TodoList />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </PanelShell>
  );
}

export default App;
