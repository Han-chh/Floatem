import { describe, expect, it } from "vitest";
import { useSettingsStore } from "../../src/store/settingsStore";

describe("settingsStore", () => {
  it("hydrates persisted settings", () => {
    useSettingsStore.getState().hydrateSettings({
      activeTab: "todos",
      hotkey: "CommandOrControl+Shift+N",
      panelPosition: { x: 120, y: 320 },
    });

    const state = useSettingsStore.getState();
    expect(state.activeTab).toBe("todos");
    expect(state.hotkey).toBe("CommandOrControl+Shift+N");
    expect(state.panelPosition).toEqual({ x: 120, y: 320 });
  });

  it("updates individual settings fields", () => {
    useSettingsStore.getState().setActiveTab("todos");
    useSettingsStore.getState().setHotkey("Alt+Space");
    useSettingsStore.getState().setPanelPosition({ x: 12, y: 16 });

    const state = useSettingsStore.getState();
    expect(state.activeTab).toBe("todos");
    expect(state.hotkey).toBe("Alt+Space");
    expect(state.panelPosition).toEqual({ x: 12, y: 16 });
  });
});
