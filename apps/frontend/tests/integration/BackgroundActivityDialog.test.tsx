import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundActivityDialog } from "../../src/components/layout/BackgroundActivityDialog";
import { PANEL_WILL_OPEN_EVENT } from "../../src/lib/nativeBridge";
import { useSettingsStore } from "../../src/store/settingsStore";

describe("BackgroundActivityDialog", () => {
  const originalBridge = window.floatemHost;
  const getBackgroundActivityStatus = vi.fn();
  const openBackgroundActivitySettings = vi.fn<() => Promise<void>>();

  beforeEach(() => {
    getBackgroundActivityStatus.mockReset();
    openBackgroundActivitySettings.mockReset();
    openBackgroundActivitySettings.mockResolvedValue();
    window.floatemHost = {
      getBackgroundActivityStatus,
      loadAllData: async () => ({ notes: [], todos: [], settings: {} }),
      openBackgroundActivitySettings,
      saveSettings: async () => undefined,
    } as unknown as NonNullable<typeof window.floatemHost>;
    useSettingsStore.getState().reset();
    useSettingsStore.getState().hydrateSettings({
      language: "en",
      suppressBackgroundActivityPrompt: false,
    });
  });

  afterEach(() => {
    window.floatemHost = originalBridge;
  });

  it("uses the Floatem dialog surface and opens the system background-item settings", async () => {
    getBackgroundActivityStatus.mockResolvedValue({ activationEpoch: 1, enabled: false, status: "requiresApproval" });
    render(<BackgroundActivityDialog />);

    expect(await screen.findByRole("alertdialog", { name: "Allow Floatem to run in the background" })).toHaveClass("paper-panel");
    fireEvent.click(screen.getByRole("button", { name: "Open System Settings" }));

    await waitFor(() => expect(openBackgroundActivitySettings).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("shows again after a later global-shortcut invocation when dismissed with Not now", async () => {
    getBackgroundActivityStatus.mockResolvedValue({ activationEpoch: 1, enabled: false, status: "requiresApproval" });
    render(<BackgroundActivityDialog />);

    expect(await screen.findByRole("alertdialog", { name: "Allow Floatem to run in the background" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(useSettingsStore.getState().suppressBackgroundActivityPrompt).toBe(false);

    act(() => {
      window.dispatchEvent(new Event(PANEL_WILL_OPEN_EVENT));
    });

    expect(await screen.findByRole("alertdialog", { name: "Allow Floatem to run in the background" })).toBeInTheDocument();
  });

  it("resets Don't show again after the background item is enabled and disabled again", async () => {
    let status = { activationEpoch: 1, enabled: false, status: "requiresApproval" };
    getBackgroundActivityStatus.mockImplementation(async () => status);
    render(<BackgroundActivityDialog />);

    expect(await screen.findByRole("alertdialog", { name: "Allow Floatem to run in the background" })).toBeInTheDocument();
    const dontShowAgain = screen.getByRole("checkbox", { name: "Don't show again" });
    fireEvent.click(dontShowAgain);
    expect(dontShowAgain).toBeChecked();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(useSettingsStore.getState().suppressBackgroundActivityPrompt).toBe(true);

    status = { activationEpoch: 2, enabled: true, status: "enabled" };
    act(() => {
      window.dispatchEvent(new Event(PANEL_WILL_OPEN_EVENT));
    });
    await waitFor(() => expect(useSettingsStore.getState().suppressBackgroundActivityPrompt).toBe(false));

    status = { activationEpoch: 2, enabled: false, status: "requiresApproval" };
    act(() => {
      window.dispatchEvent(new Event(PANEL_WILL_OPEN_EVENT));
    });

    expect(await screen.findByRole("alertdialog", { name: "Allow Floatem to run in the background" })).toBeInTheDocument();
  });
});
