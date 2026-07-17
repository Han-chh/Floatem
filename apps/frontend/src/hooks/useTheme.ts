import { useEffect, useMemo, useState } from "react";
import type { ThemeId } from "../lib/models";
import { useSettingsStore } from "../store/settingsStore";

const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

function readSystemDarkMode() {
  return typeof window !== "undefined" && window.matchMedia(SYSTEM_DARK_QUERY).matches;
}

export function useTheme() {
  const theme = useSettingsStore((state) => state.theme);
  const themeMode = useSettingsStore((state) => state.themeMode);
  const systemLightTheme = useSettingsStore((state) => state.systemLightTheme);
  const [systemDark, setSystemDark] = useState(readSystemDarkMode);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(SYSTEM_DARK_QUERY);
    const handleChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    setSystemDark(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const resolvedTheme = useMemo<ThemeId>(
    () => (themeMode === "system" ? (systemDark ? "night" : systemLightTheme) : theme),
    [systemDark, systemLightTheme, theme, themeMode],
  );

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.dataset.stickitTheme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme === "night" ? "dark" : "light";
  }, [resolvedTheme]);

  return { resolvedTheme, systemDark };
}
