import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LaunchAtLoginDialog } from "../../src/components/layout/LaunchAtLoginDialog";
import { useSettingsStore } from "../../src/store/settingsStore";

describe("LaunchAtLoginDialog", () => {
  const originalBridge = window.floatemHost;

  beforeEach(() => {
    window.floatemHost = {
      loadAllData: async () => ({ notes: [], todos: [], settings: {} }),
    } as unknown as NonNullable<typeof window.floatemHost>;
    useSettingsStore.getState().reset();
    useSettingsStore.getState().hydrateSettings({
      language: "en",
      launchAtLogin: false,
      suppressLaunchAtLoginPrompt: false,
    });
  });

  afterEach(() => {
    window.floatemHost = originalBridge;
  });

  it("uses the Floatem dialog surface and repeats after Not Now when unsuppressed", async () => {
    const firstRender = render(<LaunchAtLoginDialog />);
    expect(screen.getByRole("dialog", { name: "Open Floatem at login?" })).toHaveClass("paper-panel");

    fireEvent.click(screen.getByRole("button", { name: "Not Now" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(useSettingsStore.getState().suppressLaunchAtLoginPrompt).toBe(false);

    firstRender.unmount();
    render(<LaunchAtLoginDialog />);
    expect(screen.getByRole("dialog", { name: "Open Floatem at login?" })).toBeInTheDocument();
  });

  it("persists suppression and enables launch at login from the primary action", async () => {
    render(<LaunchAtLoginDialog />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Don't show this dialog again" }));
    fireEvent.click(screen.getByRole("button", { name: "Enable" }));

    expect(useSettingsStore.getState().launchAtLogin).toBe(true);
    expect(useSettingsStore.getState().suppressLaunchAtLoginPrompt).toBe(true);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
