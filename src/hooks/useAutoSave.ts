import { useEffect, useRef } from "react";
import { useNotesStore } from "../store/notesStore";
import { useSettingsStore } from "../store/settingsStore";
import { useTodosStore } from "../store/todosStore";
import { saveNotes, saveSettings, saveTodos } from "./usePlatform";

const SAVE_DELAY = 500;

export function useAutoSave() {
  const notesTimer = useRef<number | null>(null);
  const todosTimer = useRef<number | null>(null);
  const settingsTimer = useRef<number | null>(null);
  const notesHydrated = useRef(false);
  const todosHydrated = useRef(false);
  const settingsHydrated = useRef(false);

  useEffect(() => {
    const unsubscribeNotes = useNotesStore.subscribe(
      (state) => ({ cards: state.cards, isLoaded: state.isLoaded }),
      (nextState) => {
        if (!nextState.isLoaded) {
          return;
        }

        if (!notesHydrated.current) {
          notesHydrated.current = true;
          return;
        }

        if (notesTimer.current) {
          window.clearTimeout(notesTimer.current);
        }

        notesTimer.current = window.setTimeout(() => {
          void saveNotes(nextState.cards);
        }, SAVE_DELAY);
      },
    );

    const unsubscribeTodos = useTodosStore.subscribe(
      (state) => ({ todos: state.todos, isLoaded: state.isLoaded }),
      (nextState) => {
        if (!nextState.isLoaded) {
          return;
        }

        if (!todosHydrated.current) {
          todosHydrated.current = true;
          return;
        }

        if (todosTimer.current) {
          window.clearTimeout(todosTimer.current);
        }

        todosTimer.current = window.setTimeout(() => {
          void saveTodos(nextState.todos);
        }, SAVE_DELAY);
      },
    );

    const unsubscribeSettings = useSettingsStore.subscribe(
      (state) => ({
        activeTab: state.activeTab,
        hotkey: state.hotkey,
        panelPosition: state.panelPosition,
        isLoaded: state.isLoaded,
      }),
      (nextState) => {
        if (!nextState.isLoaded) {
          return;
        }

        if (!settingsHydrated.current) {
          settingsHydrated.current = true;
          return;
        }

        if (settingsTimer.current) {
          window.clearTimeout(settingsTimer.current);
        }

        settingsTimer.current = window.setTimeout(() => {
          void saveSettings({
            activeTab: nextState.activeTab,
            hotkey: nextState.hotkey,
            panelPosition: nextState.panelPosition,
          });
        }, SAVE_DELAY);
      },
    );

    return () => {
      if (notesTimer.current) {
        window.clearTimeout(notesTimer.current);
      }
      if (todosTimer.current) {
        window.clearTimeout(todosTimer.current);
      }
      if (settingsTimer.current) {
        window.clearTimeout(settingsTimer.current);
      }
      unsubscribeNotes();
      unsubscribeTodos();
      unsubscribeSettings();
    };
  }, []);
}
