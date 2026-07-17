import { beforeEach, describe, expect, it } from "vitest";
import { getSystemTimeZone } from "../../src/lib/models";
import { useSettingsStore } from "../../src/store/settingsStore";

describe("settingsStore", () => {
  beforeEach(() => {
    useSettingsStore.getState().reset();
  });

  it("hydrates persisted settings", () => {
    useSettingsStore.getState().hydrateSettings({
      activeTab: "todos",
      defaultOpenSection: "notes",
      hotkey: "CommandOrControl+Shift+N",
      language: "zh-CN",
      timeZone: "Asia/Tokyo",
      timeFormat: "12h",
      theme: "plum",
      themeMode: "system",
      systemLightTheme: "forest",
      lastActiveTab: "todos",
      panelPosition: { x: 120, y: 320 },
      transitionStyle: "slide",
      animationSpeed: "slow",
      launchAtLogin: false,
      enableParticles: false,
      enableReminderSound: false,
    });

    const state = useSettingsStore.getState();
    expect(state.activeTab).toBe("todos");
    expect(state.defaultOpenSection).toBe("notes");
    expect(state.hotkey).toBe("CommandOrControl+Shift+N");
    expect(state.language).toBe("zh-CN");
    expect(state.timeZone).toBe("Asia/Tokyo");
    expect(state.timeFormat).toBe("12h");
    expect(state.theme).toBe("plum");
    expect(state.themeMode).toBe("system");
    expect(state.systemLightTheme).toBe("forest");
    expect(state.lastActiveTab).toBe("todos");
    expect(state.panelPosition).toEqual({ x: 120, y: 320 });
    expect(state.transitionStyle).toBe("slide");
    expect(state.animationSpeed).toBe("slow");
    expect(state.launchAtLogin).toBe(false);
    expect(state.enableParticles).toBe(false);
    expect(state.enableReminderSound).toBe(false);
  });

  it("updates individual settings fields", () => {
    useSettingsStore.getState().setActiveTab("todos");
    useSettingsStore.getState().setDefaultOpenSection("notes");
    useSettingsStore.getState().setHotkey("Shift+Space");
    useSettingsStore.getState().setLanguage("zh-CN");
    useSettingsStore.getState().setTimeZone("Europe/London");
    useSettingsStore.getState().setTimeFormat("12h");
    useSettingsStore.getState().setTheme("forest");
    useSettingsStore.getState().setThemeMode("system");
    useSettingsStore.getState().setSystemLightTheme("chrysanthemum");
    useSettingsStore.getState().setPanelPosition({ x: 12, y: 16 });
    useSettingsStore.getState().setTransitionStyle("page");
    useSettingsStore.getState().setAnimationSpeed("rapid");
    useSettingsStore.getState().setLaunchAtLogin(false);
    useSettingsStore.getState().setEnableParticles(true);
    useSettingsStore.getState().setEnableReminderSound(false);

    const state = useSettingsStore.getState();
    expect(state.activeTab).toBe("todos");
    expect(state.defaultOpenSection).toBe("notes");
    expect(state.hotkey).toBe("Shift+Space");
    expect(state.language).toBe("zh-CN");
    expect(state.timeZone).toBe("Europe/London");
    expect(state.timeFormat).toBe("12h");
    expect(state.theme).toBe("forest");
    expect(state.themeMode).toBe("system");
    expect(state.systemLightTheme).toBe("chrysanthemum");
    expect(state.lastActiveTab).toBe("todos");
    expect(state.panelPosition).toEqual({ x: 12, y: 16 });
    expect(state.transitionStyle).toBe("page");
    expect(state.animationSpeed).toBe("rapid");
    expect(state.launchAtLogin).toBe(false);
    expect(state.enableParticles).toBe(true);
    expect(state.enableReminderSound).toBe(false);
  });

  it("tracks the transient hotkey registration state separately from persisted settings", () => {
    useSettingsStore.getState().setHotkeyRegistrationState({
      shortcut: "Ctrl+Shift+Space",
      registration: "conflict",
      message: "Shortcut is already in use.",
    });

    let state = useSettingsStore.getState();
    expect(state.hotkeyRegistrationState).toEqual({
      shortcut: "Ctrl+Shift+Space",
      registration: "conflict",
      message: "Shortcut is already in use.",
    });

    useSettingsStore.getState().restoreDefaults();
    state = useSettingsStore.getState();
    expect(state.hotkeyRegistrationState).toBeNull();
  });

  it("applies the preferred open section without overwriting the last stored section", () => {
    useSettingsStore.getState().hydrateSettings({
      activeTab: "todos",
      defaultOpenSection: "notes",
      lastActiveTab: "todos",
    });

    useSettingsStore.getState().applyPreferredOpenSection();

    let state = useSettingsStore.getState();
    expect(state.activeTab).toBe("notes");
    expect(state.lastActiveTab).toBe("todos");

    useSettingsStore.getState().setDefaultOpenSection("last");
    useSettingsStore.getState().applyPreferredOpenSection();

    state = useSettingsStore.getState();
    expect(state.activeTab).toBe("todos");
    expect(state.lastActiveTab).toBe("todos");
  });

  it("normalizes legacy animation speed values during hydration", () => {
    useSettingsStore.getState().hydrateSettings({
      animationSpeed: "faster" as never,
    });

    expect(useSettingsStore.getState().animationSpeed).toBe("rapid");
  });

  it("falls back to english for unknown language values", () => {
    useSettingsStore.getState().hydrateSettings({
      language: "fr" as never,
    });

    expect(useSettingsStore.getState().language).toBe("en");
  });

  it("restores the configured default settings while staying loaded", () => {
    useSettingsStore.getState().hydrateSettings({
      activeTab: "todos",
      defaultOpenSection: "todos",
      hotkey: "Cmd+Option+K",
      language: "zh-CN",
      timeZone: "America/New_York",
      timeFormat: "12h",
      lastActiveTab: "todos",
      panelPosition: { x: 88, y: 144 },
      transitionStyle: "slide",
      animationSpeed: "slow",
      launchAtLogin: false,
      enableParticles: false,
      enableReminderSound: false,
    });

    useSettingsStore.getState().restoreDefaults();

    const state = useSettingsStore.getState();
    expect(state.isLoaded).toBe(true);
    expect(state.hotkey).toBe("Shift+Space");
    expect(state.language).toBe("en");
    expect(state.timeZone).toBe(getSystemTimeZone());
    expect(state.timeFormat).toBe("24h");
    expect(state.defaultOpenSection).toBe("last");
    expect(state.transitionStyle).toBe("page");
    expect(state.animationSpeed).toBe("mediate");
    expect(state.launchAtLogin).toBe(true);
    expect(state.enableParticles).toBe(true);
    expect(state.enableReminderSound).toBe(true);
    expect(state.panelPosition).toBeNull();
    expect(state.activeTab).toBe("notes");
    expect(state.lastActiveTab).toBe("notes");
  });

  it("falls back to the system timezone for unknown timezone values", () => {
    useSettingsStore.getState().hydrateSettings({
      timeZone: "Not/AZone",
    });

    expect(useSettingsStore.getState().timeZone).toBe(getSystemTimeZone());
  });

  it("falls back to 24h for unknown time format values", () => {
    useSettingsStore.getState().hydrateSettings({
      timeFormat: "military-ish" as never,
    });

    expect(useSettingsStore.getState().timeFormat).toBe("24h");
  });

  it("normalizes unknown themes and keeps a valid system light theme", () => {
    useSettingsStore.getState().hydrateSettings({
      theme: "midnight-blue" as never,
      themeMode: "automatic" as never,
      systemLightTheme: "night" as never,
    });

    const state = useSettingsStore.getState();
    expect(state.theme).toBe("classic");
    expect(state.themeMode).toBe("manual");
    expect(state.systemLightTheme).toBe("classic");
  });

  it("remembers the latest light theme when night is selected manually", () => {
    useSettingsStore.getState().setTheme("plum");
    useSettingsStore.getState().setTheme("night");

    const state = useSettingsStore.getState();
    expect(state.theme).toBe("night");
    expect(state.systemLightTheme).toBe("plum");
  });
});
