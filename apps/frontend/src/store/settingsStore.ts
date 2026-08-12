import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { HotkeyRegistrationState } from "@floatem/native-bridge";
import {
  DEFAULT_SETTINGS,
  type AnimationSpeed,
  type AppLanguage,
  type AppSettings,
  type DefaultOpenSection,
  type PanelPosition,
  type TabId,
  type TimeFormat,
  type ThemeId,
  type TransitionStyle,
  createDefaultSettings,
  normalizeAppSettings,
  normalizeTimeFormat,
  normalizeTimeZone,
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
  setTimeZone: (timeZone: string) => void;
  setTimeFormat: (timeFormat: TimeFormat) => void;
  setTheme: (theme: ThemeId) => void;
  setPanelPosition: (position: PanelPosition | null) => void;
  setTransitionStyle: (transitionStyle: TransitionStyle) => void;
  setAnimationSpeed: (animationSpeed: AnimationSpeed) => void;
  setLaunchAtLogin: (launchAtLogin: boolean) => void;
  setSuppressLaunchAtLoginPrompt: (suppress: boolean) => void;
  setSuppressLanguageMismatchPrompt: (suppress: boolean) => void;
  setHasSeenHelpEntryHint: (hasSeen: boolean) => void;
  setEnableParticles: (enableParticles: boolean) => void;
  setEnableReminderSound: (enableReminderSound: boolean) => void;
  reset: () => void;
};

const initialState = () => ({
  ...createDefaultSettings(),
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
      set((state) => ({
        ...createDefaultSettings(),
        hasSeenHelpEntryHint: state.hasSeenHelpEntryHint,
        hotkeyRegistrationState: null,
        isLoaded: true,
      }));
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
    setTimeZone: (timeZone) => {
      set({ timeZone: normalizeTimeZone(timeZone) });
    },
    setTimeFormat: (timeFormat) => {
      set({ timeFormat: normalizeTimeFormat(timeFormat) });
    },
    setTheme: (theme) => {
      set({ theme });
    },
    setPanelPosition: (panelPosition) => {
      set((state) => {
        const current = state.panelPosition;
        const isUnchanged =
          current === panelPosition ||
          (current !== null &&
            panelPosition !== null &&
            current.x === panelPosition.x &&
            current.y === panelPosition.y);

        return isUnchanged ? state : { panelPosition };
      });
    },
    setTransitionStyle: (transitionStyle) => {
      set({ transitionStyle });
    },
    setAnimationSpeed: (animationSpeed) => {
      set({ animationSpeed });
    },
    setLaunchAtLogin: (launchAtLogin) => {
      set({ launchAtLogin });
    },
    setSuppressLaunchAtLoginPrompt: (suppressLaunchAtLoginPrompt) => {
      set({ suppressLaunchAtLoginPrompt });
    },
    setSuppressLanguageMismatchPrompt: (suppressLanguageMismatchPrompt) => {
      set({ suppressLanguageMismatchPrompt });
    },
    setHasSeenHelpEntryHint: (hasSeenHelpEntryHint) => {
      set({ hasSeenHelpEntryHint });
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

export function getPersistedSettingsSnapshot(): AppSettings {
  const state = useSettingsStore.getState();

  return {
    hotkey: state.hotkey,
    language: state.language,
    timeZone: state.timeZone,
    timeFormat: state.timeFormat,
    theme: state.theme,
    panelPosition: state.panelPosition,
    activeTab: state.activeTab,
    lastActiveTab: state.lastActiveTab,
    defaultOpenSection: state.defaultOpenSection,
    transitionStyle: state.transitionStyle,
    animationSpeed: state.animationSpeed,
    launchAtLogin: state.launchAtLogin,
    suppressLaunchAtLoginPrompt: state.suppressLaunchAtLoginPrompt,
    suppressLanguageMismatchPrompt: state.suppressLanguageMismatchPrompt,
    hasSeenHelpEntryHint: state.hasSeenHelpEntryHint,
    enableParticles: state.enableParticles,
    enableReminderSound: state.enableReminderSound,
  };
}
