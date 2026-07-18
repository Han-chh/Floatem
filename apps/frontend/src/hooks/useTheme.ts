import { useEffect } from "react";
import { useSettingsStore } from "../store/settingsStore";
import { getStickItBridge } from "../lib/nativeBridge";

export function useTheme() {
  const theme = useSettingsStore((state) => state.theme);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    const syncVisibility = () => {
      root.dataset.stickitWindowVisible = String(document.visibilityState !== "hidden");
    };

    root.dataset.stickitTheme = theme;
    delete root.dataset.stickitAfterglowAppearance;
    root.style.colorScheme = "light";
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    void getStickItBridge().setWindowTheme?.(theme);

    return () => document.removeEventListener("visibilitychange", syncVisibility);
  }, [theme]);

  return { resolvedTheme: theme };
}
