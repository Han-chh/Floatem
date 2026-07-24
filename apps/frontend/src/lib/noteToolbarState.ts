export const NOTE_TOOLBAR_STATE_EVENT = "floatem:note-toolbar-state";
export const NOTE_TOOLBAR_STATE_PREFIX = "floatem:note-toolbar-collapsed:";

export function getNoteToolbarStateKey(noteId: string) {
  return `${NOTE_TOOLBAR_STATE_PREFIX}${noteId}`;
}

export function readNoteToolbarCollapsed(noteId?: string) {
  if (!noteId || typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(getNoteToolbarStateKey(noteId)) === "true";
  } catch {
    return false;
  }
}

export function writeNoteToolbarCollapsed(noteId: string | undefined, collapsed: boolean) {
  if (!noteId || typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getNoteToolbarStateKey(noteId), String(collapsed));
    window.dispatchEvent(
      new CustomEvent(NOTE_TOOLBAR_STATE_EVENT, {
        detail: { collapsed, noteId },
      }),
    );
  } catch {
    // The toolbar still works as local component state when storage is unavailable.
  }
}
