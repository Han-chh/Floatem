import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { DEFAULT_SETTINGS, type AppSettings, type PanelPosition, type TabId } from "../lib/models";

type SettingsState = AppSettings & {
  isLoaded: boolean;
  hydrateSettings: (settings: Partial<AppSettings>) => void;
  setActiveTab: (tab: TabId) => void;
  setHotkey: (hotkey: string) => void;
  setPanelPosition: (position: PanelPosition | null) => void;
  reset: () => void;
};

const initialState = () => ({
  ...DEFAULT_SETTINGS,
  isLoaded: false,
});

export const useSettingsStore = create<SettingsState>()(
  subscribeWithSelector((set) => ({
    ...initialState(),
    hydrateSettings: (settings) => {
      set({
        ...DEFAULT_SETTINGS,
        ...settings,
        isLoaded: true,
      });
    },
    setActiveTab: (activeTab) => {
      set({ activeTab });
    },
    setHotkey: (hotkey) => {
      set({
        hotkey: hotkey.trim() || DEFAULT_SETTINGS.hotkey,
      });
    },
    setPanelPosition: (panelPosition) => {
      set({ panelPosition });
    },
    reset: () => {
      set(initialState());
    },
  })),
);
