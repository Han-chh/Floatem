import { useEffect } from "react";
import { registerHotkey } from "./usePlatform";

export function useHotkey(shortcut: string) {
  useEffect(() => {
    if (!shortcut.trim()) {
      return;
    }

    void registerHotkey(shortcut).catch((error) => {
      console.error("QuickNote failed to register the global shortcut.", error);
    });
  }, [shortcut]);
}
