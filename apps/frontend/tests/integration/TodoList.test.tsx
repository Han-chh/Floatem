import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../../src/lib/models";
import { TodoList } from "../../src/components/todos/TodoList";

describe("TodoList", () => {
  it("adds, completes, and deletes a todo with Enter submission while keeping Cmd+Enter for new lines", async () => {
    const user = userEvent.setup();
    render(<TodoList />);

    const input = screen.getByLabelText("Quick add");

    await user.type(input, "Ship docs");
    expect(screen.getByText("Cmd+Enter for newline")).toBeInTheDocument();

    await user.keyboard("{Meta>}{Enter}{/Meta}");
    expect(screen.queryByRole("button", { name: "Complete task" })).not.toBeInTheDocument();
    expect(input).toHaveValue("Ship docs\n");

    await user.keyboard("v2");
    await user.keyboard("{Enter}");
    expect(
      screen.getByText((_, element) => element?.tagName === "P" && element.textContent === "Ship docs\nv2"),
    ).toBeInTheDocument();
    expect(screen.getByText("1 undone")).toBeInTheDocument();
    expect(screen.getByTestId("todo-order")).toHaveTextContent("1");

    await user.click(screen.getByRole("button", { name: "Complete task" }));
    expect(
      screen
        .getAllByRole("button", { name: "Restore task" })
        .some((button) => button.getAttribute("aria-pressed") === "true"),
    ).toBe(true);
    await waitFor(() => {
      expect(screen.queryByTestId("todo-order")).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Set reminder" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Change reminder" })).not.toBeInTheDocument();

    const deleteButtons = screen.getAllByRole("button", { name: "Delete todo" });
    await user.click(deleteButtons[deleteButtons.length - 1]!);
    expect(screen.queryByText("Ship docs")).not.toBeInTheDocument();
  });

  it("uses the native clipboard bridge for Cmd+C and Cmd+V in the macOS host", async () => {
    const user = userEvent.setup();
    const originalBridge = window.quickNoteHost;
    const clipboard = { value: "" };
    const writeClipboardText = vi.fn(async (text: string) => {
      clipboard.value = text;
    });
    const readClipboardText = vi.fn(async () => clipboard.value);

    window.quickNoteHost = {
      platform: "macos",
      getCapabilities: vi.fn(async () => ({
        platform: "macos" as const,
        runtime: "test",
        capabilities: {
          "window.show": true,
          "window.hide": true,
          "window.toggle": true,
          "window.alwaysOnTop": true,
          "notifications.send": true,
          "notifications.schedule": true,
          "notifications.openSettings": true,
          "shortcuts.global": true,
          "settings.persist": true,
          "clipboard.read": true,
          "clipboard.write": true,
          "devtools.open": true,
          "app.quit": true,
        },
      })),
      loadAllData: vi.fn(async () => ({ notes: [], todos: [], settings: DEFAULT_SETTINGS })),
      saveNotes: vi.fn(async () => {}),
      saveTodos: vi.fn(async () => {}),
      saveSettings: vi.fn(async () => {}),
      showWindow: vi.fn(async () => {}),
      hideWindow: vi.fn(async () => {}),
      toggleWindow: vi.fn(async () => {}),
      setAlwaysOnTop: vi.fn(async () => {}),
      openNotificationSettings: vi.fn(async () => {}),
      sendNotification: vi.fn(async () => {}),
      showNotification: vi.fn(async () => {}),
      scheduleNotification: vi.fn(async () => {}),
      openTextColorPanel: vi.fn(async () => {}),
      testReminderNotification: vi.fn(async () => {}),
      getHotkeyRegistrationState: vi.fn(async () => ({
        shortcut: DEFAULT_SETTINGS.hotkey,
        registration: "registered" as const,
      })),
      readClipboardText,
      registerHotkey: vi.fn(async () => {}),
      registerGlobalShortcut: vi.fn(async () => {}),
      unregisterHotkey: vi.fn(async () => {}),
      setEditableInputActive: vi.fn(),
      setTextCompositionActive: vi.fn(),
      writeClipboardText,
      hidePanelWindow: vi.fn(async () => {}),
      quitApplication: vi.fn(async () => {}),
      openDevTools: vi.fn(async () => {}),
      reportFrontendReady: vi.fn(),
      reportFrontendError: vi.fn(),
    };

    render(<TodoList />);

    try {
      const input = screen.getByLabelText("Quick add");
      await user.click(input);
      await user.type(input, "Ship docs");
      await user.keyboard("{Meta>}{a}{/Meta}");
      await user.keyboard("{Meta>}{c}{/Meta}");

      await waitFor(() => {
        expect(writeClipboardText).toHaveBeenLastCalledWith("Ship docs");
      });

      clipboard.value = "Native paste";

      await user.keyboard("{Meta>}{a}{/Meta}");
      await user.keyboard("{Meta>}{v}{/Meta}");

      await waitFor(() => {
        expect(input).toHaveValue("Native paste");
      });
    } finally {
      window.quickNoteHost = originalBridge;
    }
  });

  it("opens an edit dialog from a todo card click and updates the title", async () => {
    const user = userEvent.setup();
    render(<TodoList />);

    await user.type(screen.getByLabelText("Quick add"), "Draft release notes");
    await user.keyboard("{Enter}");

    await user.click(screen.getByText("Draft release notes"));
    expect(screen.getByRole("dialog", { name: "Edit todo" })).toBeInTheDocument();

    const titleInput = screen.getByLabelText("Todo title");
    await user.clear(titleInput);
    await user.type(titleInput, "Ship release notes");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Edit todo" })).not.toBeInTheDocument();
    });
    expect(screen.getByText("Ship release notes")).toBeInTheDocument();
    expect(screen.queryByText("Draft release notes")).not.toBeInTheDocument();
  });
});
