import type { PointerEvent } from "react";
import { getQuickNoteBridge, isNativeQuickNoteHost } from "../lib/nativeBridge";

const INTERACTIVE_SELECTOR =
  "button, input, textarea, select, option, a, [role='button'], [contenteditable='true'], [data-no-window-drag='true']";

export function startWindowDrag(event: PointerEvent<HTMLElement>) {
  if (event.button !== 0 || !isNativeQuickNoteHost()) {
    return;
  }

  const target = event.target instanceof HTMLElement ? event.target : null;
  if (target?.closest(INTERACTIVE_SELECTOR)) {
    return;
  }

  event.preventDefault();
  void getQuickNoteBridge().startWindowDrag().catch((error) => {
    console.warn("QuickNote window drag failed", error);
  });
}
