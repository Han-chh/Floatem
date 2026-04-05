import { beforeEach, describe, expect, it } from "vitest";
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
      lastActiveTab: "todos",
      panelPosition: { x: 120, y: 320 },
      transitionStyle: "slide",
      animationSpeed: "slow",
      enableParticles: false,
      enableReminderSound: false,
    });

    const state = useSettingsStore.getState();
    expect(state.activeTab).toBe("todos");
    expect(state.defaultOpenSection).toBe("notes");
    expect(state.hotkey).toBe("CommandOrControl+Shift+N");
    expect(state.language).toBe("zh-CN");
    expect(state.lastActiveTab).toBe("todos");
    expect(state.panelPosition).toEqual({ x: 120, y: 320 });
    expect(state.transitionStyle).toBe("slide");
    expect(state.animationSpeed).toBe("slow");
    expect(state.enableParticles).toBe(false);
    expect(state.enableReminderSound).toBe(false);
  });

  it("updates individual settings fields", () => {
    useSettingsStore.getState().setActiveTab("todos");
    useSettingsStore.getState().setDefaultOpenSection("notes");
    useSettingsStore.getState().setHotkey("Cmd+Shift+Space");
    useSettingsStore.getState().setLanguage("zh-CN");
    useSettingsStore.getState().setPanelPosition({ x: 12, y: 16 });
    useSettingsStore.getState().setTransitionStyle("page");
    useSettingsStore.getState().setAnimationSpeed("rapid");
    useSettingsStore.getState().setEnableParticles(true);
    useSettingsStore.getState().setEnableReminderSound(false);

    const state = useSettingsStore.getState();
    expect(state.activeTab).toBe("todos");
    expect(state.defaultOpenSection).toBe("notes");
    expect(state.hotkey).toBe("Cmd+Shift+Space");
    expect(state.language).toBe("zh-CN");
    expect(state.lastActiveTab).toBe("todos");
    expect(state.panelPosition).toEqual({ x: 12, y: 16 });
    expect(state.transitionStyle).toBe("page");
    expect(state.animationSpeed).toBe("rapid");
    expect(state.enableParticles).toBe(true);
    expect(state.enableReminderSound).toBe(false);
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
      lastActiveTab: "todos",
      panelPosition: { x: 88, y: 144 },
      transitionStyle: "slide",
      animationSpeed: "slow",
      enableParticles: false,
      enableReminderSound: false,
    });

    useSettingsStore.getState().restoreDefaults();

    const state = useSettingsStore.getState();
    expect(state.isLoaded).toBe(true);
    expect(state.hotkey).toBe("Cmd+Shift+Space");
    expect(state.language).toBe("en");
    expect(state.defaultOpenSection).toBe("last");
    expect(state.transitionStyle).toBe("page");
    expect(state.animationSpeed).toBe("mediate");
    expect(state.enableParticles).toBe(true);
    expect(state.enableReminderSound).toBe(true);
    expect(state.panelPosition).toBeNull();
    expect(state.activeTab).toBe("notes");
    expect(state.lastActiveTab).toBe("notes");
  });
});
