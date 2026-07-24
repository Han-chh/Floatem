import { useEffect } from "react";
import { useSettingsStore } from "../store/settingsStore";
import { getFloatemBridge } from "../lib/nativeBridge";

export function useTheme() {
  const theme = useSettingsStore((state) => state.theme);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    const syncVisibility = () => {
      root.dataset.floatemWindowVisible = String(document.visibilityState !== "hidden");
    };

    root.dataset.floatemTheme = theme;
    delete root.dataset.floatemAfterglowAppearance;
    root.style.colorScheme = "light";
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    void getFloatemBridge().setWindowTheme?.(theme);

    return () => document.removeEventListener("visibilitychange", syncVisibility);
  }, [theme]);

  return { resolvedTheme: theme };
}
