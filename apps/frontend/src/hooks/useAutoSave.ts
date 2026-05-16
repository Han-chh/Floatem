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
      (state) => ({ cards: state.cards, groups: state.groups, isLoaded: state.isLoaded }),
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
          void saveNotes({
            cards: nextState.cards,
            groups: nextState.groups,
          });
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
        defaultOpenSection: state.defaultOpenSection,
        hotkey: state.hotkey,
        language: state.language,
        timeZone: state.timeZone,
        timeFormat: state.timeFormat,
        lastActiveTab: state.lastActiveTab,
        panelPosition: state.panelPosition,
        transitionStyle: state.transitionStyle,
        animationSpeed: state.animationSpeed,
        enableParticles: state.enableParticles,
        enableReminderSound: state.enableReminderSound,
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
            defaultOpenSection: nextState.defaultOpenSection,
            hotkey: nextState.hotkey,
            language: nextState.language,
            timeZone: nextState.timeZone,
            timeFormat: nextState.timeFormat,
            lastActiveTab: nextState.lastActiveTab,
            panelPosition: nextState.panelPosition,
            transitionStyle: nextState.transitionStyle,
            animationSpeed: nextState.animationSpeed,
            enableParticles: nextState.enableParticles,
            enableReminderSound: nextState.enableReminderSound,
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
