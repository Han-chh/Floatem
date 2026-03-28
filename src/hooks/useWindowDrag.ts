import { getCurrentWindow } from "@tauri-apps/api/window";
import type { PointerEvent } from "react";

const INTERACTIVE_SELECTOR =
  "button, input, textarea, select, option, a, [role='button'], [contenteditable='true'], [data-no-window-drag='true']";

function isTauriWindow() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function startWindowDrag(event: PointerEvent<HTMLElement>) {
  if (event.button !== 0 || !isTauriWindow()) {
    return;
  }

  const target = event.target instanceof HTMLElement ? event.target : null;
  if (target?.closest(INTERACTIVE_SELECTOR)) {
    return;
  }

  event.preventDefault();
  void getCurrentWindow().startDragging().catch((error) => {
    console.warn("QuickNote window drag failed", error);
  });
}
