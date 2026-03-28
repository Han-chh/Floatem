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
        <div className="flex h-full items-center justify-center rounded-[14px] border border-[var(--border)] bg-[var(--cream)]/75 text-[13px] text-[var(--muted)]">
          Loading QuickNote...
        </div>
      ) : activeTab === "notes" ? (
        <NotesList />
      ) : (
        <TodoList />
      )}
    </PanelShell>
  );
}

export default App;
