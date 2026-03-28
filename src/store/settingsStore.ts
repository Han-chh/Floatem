import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import {
  DEFAULT_SETTINGS,
  type AnimationSpeed,
  type AppSettings,
  type PanelPosition,
  type TabId,
  type TransitionStyle,
} from "../lib/models";

type SettingsState = AppSettings & {
  isLoaded: boolean;
  hydrateSettings: (settings: Partial<AppSettings>) => void;
  setActiveTab: (tab: TabId) => void;
  setHotkey: (hotkey: string) => void;
  setPanelPosition: (position: PanelPosition | null) => void;
  setTransitionStyle: (transitionStyle: TransitionStyle) => void;
  setAnimationSpeed: (animationSpeed: AnimationSpeed) => void;
  setEnableParticles: (enableParticles: boolean) => void;
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
    setTransitionStyle: (transitionStyle) => {
      set({ transitionStyle });
    },
    setAnimationSpeed: (animationSpeed) => {
      set({ animationSpeed });
    },
    setEnableParticles: (enableParticles) => {
      set({ enableParticles });
    },
    reset: () => {
      set(initialState());
    },
  })),
);
