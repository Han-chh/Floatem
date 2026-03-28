import { useEffect } from "react";
import { registerHotkey } from "./usePlatform";

export function useHotkey(shortcut: string) {
  useEffect(() => {
    if (!shortcut.trim()) {
      return;
    }

    void registerHotkey(shortcut);
  }, [shortcut]);
}
