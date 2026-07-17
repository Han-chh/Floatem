import { useEffect, useRef } from "react";
import { shallow } from "zustand/shallow";
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
      { equalityFn: shallow },
    );

    const unsubscribeTodos = useTodosStore.subscribe(
      (state) => ({ groups: state.groups, todos: state.todos, isLoaded: state.isLoaded }),
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
          void saveTodos({
            groups: nextState.groups,
            items: nextState.todos,
          });
        }, SAVE_DELAY);
      },
      { equalityFn: shallow },
    );

    const unsubscribeSettings = useSettingsStore.subscribe(
      (state) => ({
        activeTab: state.activeTab,
        defaultOpenSection: state.defaultOpenSection,
        hotkey: state.hotkey,
        language: state.language,
        timeZone: state.timeZone,
        timeFormat: state.timeFormat,
        theme: state.theme,
        themeMode: state.themeMode,
        systemLightTheme: state.systemLightTheme,
        lastActiveTab: state.lastActiveTab,
        transitionStyle: state.transitionStyle,
        animationSpeed: state.animationSpeed,
        launchAtLogin: state.launchAtLogin,
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
            theme: nextState.theme,
            themeMode: nextState.themeMode,
            systemLightTheme: nextState.systemLightTheme,
            lastActiveTab: nextState.lastActiveTab,
            transitionStyle: nextState.transitionStyle,
            animationSpeed: nextState.animationSpeed,
            launchAtLogin: nextState.launchAtLogin,
            enableParticles: nextState.enableParticles,
            enableReminderSound: nextState.enableReminderSound,
          });
        }, SAVE_DELAY);
      },
      { equalityFn: shallow },
    );

    return () => {
      const notesState = useNotesStore.getState();
      const todosState = useTodosStore.getState();
      const settingsState = useSettingsStore.getState();

      if (notesTimer.current) {
        window.clearTimeout(notesTimer.current);
        if (notesState.isLoaded) {
          void saveNotes({
            cards: notesState.cards,
            groups: notesState.groups,
          });
        }
      }
      if (todosTimer.current) {
        window.clearTimeout(todosTimer.current);
        if (todosState.isLoaded) {
          void saveTodos({
            groups: todosState.groups,
            items: todosState.todos,
          });
        }
      }
      if (settingsTimer.current) {
        window.clearTimeout(settingsTimer.current);
        if (settingsState.isLoaded) {
          void saveSettings({
            activeTab: settingsState.activeTab,
            defaultOpenSection: settingsState.defaultOpenSection,
            hotkey: settingsState.hotkey,
            language: settingsState.language,
            timeZone: settingsState.timeZone,
            timeFormat: settingsState.timeFormat,
            theme: settingsState.theme,
            themeMode: settingsState.themeMode,
            systemLightTheme: settingsState.systemLightTheme,
            lastActiveTab: settingsState.lastActiveTab,
            transitionStyle: settingsState.transitionStyle,
            animationSpeed: settingsState.animationSpeed,
            launchAtLogin: settingsState.launchAtLogin,
            enableParticles: settingsState.enableParticles,
            enableReminderSound: settingsState.enableReminderSound,
          });
        }
      }
      unsubscribeNotes();
      unsubscribeTodos();
      unsubscribeSettings();
    };
  }, []);
}
