import { useNotesStore } from "../store/notesStore";
import { useSettingsStore } from "../store/settingsStore";
import { useTodosStore } from "../store/todosStore";

export function resetAllStores() {
  useNotesStore.getState().reset();
  useTodosStore.getState().reset();
  useSettingsStore.getState().reset();
}
