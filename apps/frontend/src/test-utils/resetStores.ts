import { useNotesStore } from "../store/notesStore";
import { useSettingsStore } from "../store/settingsStore";
import { useTodosStore } from "../store/todosStore";
import { NOTE_TOOLBAR_STATE_PREFIX } from "../lib/noteToolbarState";

export function resetAllStores() {
  useNotesStore.getState().reset();
  useTodosStore.getState().reset();
  useSettingsStore.getState().reset();
  // Most interaction tests query the established English accessibility labels.
  // Default-language behavior is covered explicitly in the settings tests.
  useSettingsStore.setState({ language: "en" });

  if (typeof window !== "undefined") {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(NOTE_TOOLBAR_STATE_PREFIX))
      .forEach((key) => window.localStorage.removeItem(key));
  }
}
