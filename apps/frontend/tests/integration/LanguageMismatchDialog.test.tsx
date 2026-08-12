import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageMismatchDialog } from "../../src/components/layout/LanguageMismatchDialog";
import { PANEL_WILL_OPEN_EVENT } from "../../src/lib/nativeBridge";
import { useSettingsStore } from "../../src/store/settingsStore";

describe("LanguageMismatchDialog", () => {
  const originalBridge = window.floatemHost;
  const getSystemLanguage = vi.fn<() => Promise<"en" | "zh-CN">>();

  beforeEach(() => {
    getSystemLanguage.mockReset();
    window.floatemHost = {
      getSystemLanguage,
      loadAllData: async () => ({ notes: [], todos: [], settings: {} }),
    } as unknown as NonNullable<typeof window.floatemHost>;
    useSettingsStore.getState().reset();
  });

  afterEach(() => {
    window.floatemHost = originalBridge;
  });

  it("keeps Chinese as the default and offers English again on the next summon", async () => {
    getSystemLanguage.mockResolvedValue("en");
    useSettingsStore.getState().hydrateSettings({
      language: "zh-CN",
      suppressLanguageMismatchPrompt: false,
    });
    render(<LanguageMismatchDialog />);

    expect(await screen.findByRole("dialog", { name: "切换到英文界面？" })).toHaveClass("paper-panel");
    fireEvent.click(screen.getByRole("button", { name: "保持当前语言" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(useSettingsStore.getState().language).toBe("zh-CN");

    act(() => {
      window.dispatchEvent(new Event(PANEL_WILL_OPEN_EVENT));
    });

    expect(await screen.findByRole("dialog", { name: "切换到英文界面？" })).toBeInTheDocument();
    expect(getSystemLanguage).toHaveBeenCalledTimes(2);
  });

  it("switches to English and persists suppression when both are selected", async () => {
    getSystemLanguage.mockResolvedValue("en");
    useSettingsStore.getState().hydrateSettings({ language: "zh-CN" });
    render(<LanguageMismatchDialog />);

    await screen.findByRole("dialog", { name: "切换到英文界面？" });
    fireEvent.click(screen.getByRole("checkbox", { name: "以后不再显示此对话框" }));
    fireEvent.click(screen.getByRole("button", { name: "切换到 English" }));

    expect(useSettingsStore.getState().language).toBe("en");
    expect(useSettingsStore.getState().suppressLanguageMismatchPrompt).toBe(true);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("offers Chinese when the app is English and the system is Chinese", async () => {
    getSystemLanguage.mockResolvedValue("zh-CN");
    useSettingsStore.getState().hydrateSettings({
      language: "en",
      suppressLanguageMismatchPrompt: false,
    });
    render(<LanguageMismatchDialog />);

    expect(await screen.findByRole("dialog", { name: "Switch to Chinese?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Switch to Chinese" }));

    expect(useSettingsStore.getState().language).toBe("zh-CN");
  });

  it("does not prompt when the app and system languages match", async () => {
    getSystemLanguage.mockResolvedValue("zh-CN");
    useSettingsStore.getState().hydrateSettings({ language: "zh-CN" });
    render(<LanguageMismatchDialog />);

    await waitFor(() => expect(getSystemLanguage).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
