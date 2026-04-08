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
    const originalBridge = window.quickNoteNative;
    const clipboard = { value: "" };
    const writeClipboardText = vi.fn(async (text: string) => {
      clipboard.value = text;
    });
    const readClipboardText = vi.fn(async () => clipboard.value);

    window.quickNoteNative = {
      platform: "macos-appkit-wkwebview",
      loadAllData: vi.fn(async () => ({ notes: [], todos: [], settings: DEFAULT_SETTINGS })),
      saveNotes: vi.fn(async () => {}),
      saveTodos: vi.fn(async () => {}),
      saveSettings: vi.fn(async () => {}),
      openNotificationSettings: vi.fn(async () => {}),
      openTextColorPanel: vi.fn(async () => {}),
      testReminderNotification: vi.fn(async () => {}),
      readClipboardText,
      registerHotkey: vi.fn(async () => {}),
      setEditableInputActive: vi.fn(),
      setTextCompositionActive: vi.fn(),
      writeClipboardText,
      hidePanelWindow: vi.fn(async () => {}),
      quitApplication: vi.fn(async () => {}),
      startWindowDrag: vi.fn(async () => {}),
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
      window.quickNoteNative = originalBridge;
    }
  });
});
