import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { HotkeyRegistrationState } from "@quicknote/native-bridge";
import {
  DEFAULT_SETTINGS,
  type AnimationSpeed,
  type AppLanguage,
  type AppSettings,
  type DefaultOpenSection,
  type PanelPosition,
  type TabId,
  type TransitionStyle,
  normalizeAppSettings,
  resolvePreferredOpenTab,
} from "../lib/models";

type SettingsState = AppSettings & {
  hotkeyRegistrationState: HotkeyRegistrationState | null;
  isLoaded: boolean;
  applyPreferredOpenSection: () => void;
  hydrateSettings: (settings: Partial<AppSettings>) => void;
  restoreDefaults: () => void;
  setHotkeyRegistrationState: (state: HotkeyRegistrationState | null) => void;
  setActiveTab: (tab: TabId) => void;
  setDefaultOpenSection: (defaultOpenSection: DefaultOpenSection) => void;
  setHotkey: (hotkey: string) => void;
  setLanguage: (language: AppLanguage) => void;
  setPanelPosition: (position: PanelPosition | null) => void;
  setTransitionStyle: (transitionStyle: TransitionStyle) => void;
  setAnimationSpeed: (animationSpeed: AnimationSpeed) => void;
  setEnableParticles: (enableParticles: boolean) => void;
  setEnableReminderSound: (enableReminderSound: boolean) => void;
  reset: () => void;
};

const initialState = () => ({
  ...DEFAULT_SETTINGS,
  hotkeyRegistrationState: null,
  isLoaded: false,
});

export const useSettingsStore = create<SettingsState>()(
  subscribeWithSelector((set) => ({
    ...initialState(),
    applyPreferredOpenSection: () => {
      set((state) => ({
        activeTab: resolvePreferredOpenTab(state),
      }));
    },
    hydrateSettings: (settings) => {
      const normalizedSettings = normalizeAppSettings(settings);

      set({
        ...normalizedSettings,
        isLoaded: true,
      });
    },
    restoreDefaults: () => {
      set({
        ...DEFAULT_SETTINGS,
        hotkeyRegistrationState: null,
        isLoaded: true,
      });
    },
    setHotkeyRegistrationState: (hotkeyRegistrationState) => {
      set({ hotkeyRegistrationState });
    },
    setActiveTab: (activeTab) => {
      set({
        activeTab,
        lastActiveTab: activeTab,
      });
    },
    setDefaultOpenSection: (defaultOpenSection) => {
      set({ defaultOpenSection });
    },
    setHotkey: (hotkey) => {
      set({
        hotkey: hotkey.trim() || DEFAULT_SETTINGS.hotkey,
      });
    },
    setLanguage: (language) => {
      set({ language });
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
    setEnableReminderSound: (enableReminderSound) => {
      set({ enableReminderSound });
    },
    reset: () => {
      set(initialState());
    },
  })),
);
