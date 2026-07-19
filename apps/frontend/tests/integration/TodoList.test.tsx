import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTodoItem, DEFAULT_SETTINGS } from "../../src/lib/models";
import { TodoList } from "../../src/components/todos/TodoList";
import { formatLocalDateKey } from "../../src/lib/models";
import { useSettingsStore } from "../../src/store/settingsStore";
import { useTodosStore } from "../../src/store/todosStore";

describe("TodoList", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds, completes, and deletes a todo with Enter submission while keeping Shift+Enter for new lines", async () => {
    const user = userEvent.setup();
    render(<TodoList />);

    const input = screen.getByLabelText("Quick add");

    await user.type(input, "Ship docs");
    expect(screen.queryByText("Enter to add. Shift+Enter for new line")).not.toBeInTheDocument();
    expect(input).toHaveAttribute("placeholder", "Enter to add a todo\nClick a todo to edit it");
    expect(screen.getByRole("button", { name: "Add task" })).toHaveAttribute(
      "data-tooltip",
      "Enter to add · Shift+Enter for new line",
    );

    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(screen.queryByRole("button", { name: "Complete task" })).not.toBeInTheDocument();
    expect(input).toHaveValue("Ship docs\n");

    await user.keyboard("v2");
    await user.keyboard("{Enter}");
    expect(
      screen.getByText((_, element) => element?.tagName === "P" && element.textContent === "Ship docs\nv2"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("todo-item")).toHaveClass("content-card-classic");
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

  it("supports selecting todos for bulk complete, date change, and delete", async () => {
    const user = userEvent.setup();
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowKey = formatLocalDateKey(tomorrow);

    render(<TodoList />);

    await user.type(screen.getByLabelText("Quick add"), "Alpha");
    await user.keyboard("{Enter}");
    await user.type(screen.getByLabelText("Quick add"), "Beta");
    await user.keyboard("{Enter}");

    await user.click(screen.getByRole("button", { name: "Select todos" }));
    expect(screen.queryByRole("button", { name: "Delete todo" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Select Alpha" }));
    await user.click(screen.getByRole("button", { name: "Set date" }));
    expect(screen.getByRole("dialog", { name: "Change selected date" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: `tomorrow, ${tomorrowKey}: 0 done, 0 undone` }));
    await user.click(screen.getByRole("button", { name: "Change date" }));

    await waitFor(() => {
      expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Beta")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Select todos" }));
    await user.click(screen.getByRole("checkbox", { name: "Select Beta" }));
    await user.click(screen.getByRole("button", { name: "Complete selected" }));
    expect(screen.getByText("Complete 1 selected todo?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Complete" }));
    expect(screen.getByRole("button", { name: "Restore task" })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Complete selected" })).not.toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("Quick add"), "Gamma");
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "Select todos" }));
    await user.click(screen.getByRole("checkbox", { name: "Select Gamma" }));
    await user.click(screen.getByRole("button", { name: "Delete selected" }));
    expect(screen.getByText("Delete 1 selected todo? This cannot be undone.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(screen.queryByText("Gamma")).not.toBeInTheDocument();
    });
  });

  it("keeps completed todos out of checkbox selection and select-all", async () => {
    const user = userEvent.setup();
    render(<TodoList />);

    await user.type(screen.getByLabelText("Quick add"), "Alpha");
    await user.keyboard("{Enter}");
    await user.type(screen.getByLabelText("Quick add"), "Beta");
    await user.keyboard("{Enter}");
    await user.click(screen.getAllByRole("button", { name: "Complete task" })[1]!);

    await user.click(screen.getByRole("button", { name: "Select todos" }));

    expect(screen.getByRole("checkbox", { name: "Select Alpha" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Select Beta" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Select all todos" }));
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });

  it("creates, assigns, and filters todo groups from the todo toolbar", async () => {
    const user = userEvent.setup();
    render(<TodoList />);

    await user.type(screen.getByLabelText("Quick add"), "Alpha");
    await user.keyboard("{Enter}");
    await user.type(screen.getByLabelText("Quick add"), "Beta");
    await user.keyboard("{Enter}");

    const toolbarGroupButton = screen.getByRole("button", { name: "Add todo group" });
    expect(toolbarGroupButton).toHaveAttribute("data-tooltip", "Manage groups");
    await user.click(toolbarGroupButton);
    const manageDialog = screen.getByRole("dialog", { name: "Manage todo groups" });
    expect(manageDialog).toBeInTheDocument();
    expect(within(manageDialog).getByRole("button", { name: "No group" })).toBeDisabled();
    expect(within(manageDialog).queryByRole("button", { name: "Edit No group group" })).not.toBeInTheDocument();
    expect(within(manageDialog).queryByRole("button", { name: "Delete No group group" })).not.toBeInTheDocument();
    expect(within(manageDialog).getByText("No custom todo groups yet. Create one here, then assign it from a todo card.")).toBeInTheDocument();
    await user.click(within(manageDialog).getByRole("button", { name: "Add todo group" }));
    const createDialog = screen.getByRole("dialog", { name: "Create group" });
    await user.type(within(createDialog).getByRole("textbox", { name: "Group name" }), "Work");
    await user.click(within(createDialog).getByRole("button", { name: "Create group" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Create group" })).not.toBeInTheDocument();
    });
    await user.click(within(screen.getByRole("dialog", { name: "Manage todo groups" })).getByRole("button", { name: "Close" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Manage todo groups" })).not.toBeInTheDocument();
    });

    const alphaCard = screen.getAllByTestId("todo-item").find((item) => within(item).queryByText("Alpha"));
    expect(alphaCard).toBeTruthy();
    expect(alphaCard).toHaveAttribute("data-card-grouped", "false");
    await user.click(within(alphaCard!).getByRole("button", { name: "Change todo group" }));
    await user.click(within(screen.getByRole("dialog", { name: "Manage todo groups" })).getByRole("button", { name: "Work" }));
    expect(alphaCard).toHaveAttribute("data-card-grouped", "true");
    expect(alphaCard!.style.getPropertyValue("--card-group-accent")).not.toBe("");

    await user.click(screen.getByRole("button", { name: "Filter todo groups" }));
    const filterDialog = screen.getByRole("dialog", { name: "Filter todo groups" });
    await user.click(within(filterDialog).getByRole("checkbox", { name: /^All/ }));
    expect(screen.getAllByText("Alpha").length).toBeGreaterThan(0);
    expect(screen.getByText("Beta")).toBeInTheDocument();
    await user.click(within(filterDialog).getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
      expect(screen.queryByText("Beta")).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Filter todo groups" }));
    const workFilterDialog = screen.getByRole("dialog", { name: "Filter todo groups" });
    await user.click(within(workFilterDialog).getByRole("checkbox", { name: /^Work/ }));
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    await user.click(within(workFilterDialog).getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeInTheDocument();
    });
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
  });

  it("uses the native clipboard bridge for Cmd+C and Cmd+V in the macOS host", async () => {
    const user = userEvent.setup();
    const originalBridge = window.stickItHost;
    const clipboard = { value: "" };
    const writeClipboardText = vi.fn(async (text: string) => {
      clipboard.value = text;
    });
    const readClipboardText = vi.fn(async () => clipboard.value);

    window.stickItHost = {
      platform: "macos",
      getCapabilities: vi.fn(async () => ({
        platform: "macos" as const,
        runtime: "test",
        capabilities: {
          "window.show": true,
          "window.hide": true,
          "window.toggle": true,
          "window.alwaysOnTop": true,
          "window.dragPreview": true,
          "window.floatingCards": true,
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
      showDragPreview: vi.fn(async () => {}),
      hideDragPreview: vi.fn(async () => {}),
      showFloatingCard: vi.fn(async () => {}),
      closeFloatingCard: vi.fn(async () => {}),
      resizeFloatingCard: vi.fn(async () => {}),
      getFloatingCardScreenPlacement: vi.fn(async () => null),
      startFloatingCardDrag: vi.fn(async () => {}),
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
      window.stickItHost = originalBridge;
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

  it("focuses the quick add input when Enter is pressed outside text fields", async () => {
    const user = userEvent.setup();
    render(<TodoList />);

    const calendarButton = screen.getByRole("button", { name: "Open todo calendar" });
    const input = screen.getByLabelText("Quick add");

    calendarButton.focus();
    await user.keyboard("{Enter}");

    expect(input).toHaveFocus();
    expect(screen.queryByRole("dialog", { name: "Open todo calendar" })).not.toBeInTheDocument();

    await user.keyboard("Ship docs");
    await user.keyboard(" ");

    expect(input).toHaveValue("Ship docs ");
  });

  it("switches todo card views by calendar date and shows per-day counts", async () => {
    const user = userEvent.setup();
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const todayKey = formatLocalDateKey(today);
    const tomorrowKey = formatLocalDateKey(tomorrow);

    render(<TodoList />);

    await user.type(screen.getByLabelText("Quick add"), "Today task");
    await user.keyboard("{Enter}");

    await user.click(screen.getByRole("button", { name: "Open todo calendar" }));
    expect(screen.getByRole("dialog", { name: "Open todo calendar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `today, ${todayKey}: 0 done, 1 undone` })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: `tomorrow, ${tomorrowKey}: 0 done, 0 undone` }));
    expect(screen.queryByText("Today task")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Quick add"), "Tomorrow task");
    await user.keyboard("{Enter}");
    expect(screen.getByText("Tomorrow task")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open todo calendar" }));
    expect(screen.getByRole("button", { name: `tomorrow, ${tomorrowKey}: 0 done, 1 undone` })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: `today, ${todayKey}: 0 done, 1 undone` }));
    expect(screen.getByText("Today task")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText("Tomorrow task")).not.toBeInTheDocument();
    });
  });

  it("moves the current todo date when timezone changes across a date boundary", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 4, 13, 1, 0)));
    act(() => {
      useTodosStore.getState().reset();
    });
    act(() => {
      useSettingsStore.getState().setTimeZone("Asia/Shanghai");
    });

    render(<TodoList />);
    expect(screen.getByRole("button", { name: "Open todo calendar" })).toHaveTextContent("2026.05.13");

    act(() => {
      useSettingsStore.getState().setTimeZone("America/New_York");
    });

    expect(screen.getByRole("button", { name: "Open todo calendar" })).toHaveTextContent("2026.05.12");
  });

  it("uses the configured 12-hour clock in todo time displays", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 4, 13, 13, 5)));
    act(() => {
      useSettingsStore.getState().setTimeZone("UTC");
      useSettingsStore.getState().setTimeFormat("12h");
    });

    render(<TodoList />);

    expect(screen.getByRole("button", { name: "Open todo calendar" })).toHaveTextContent("1:05 PM");
  });

  it("shows a green insertion line and reorders a floating todo at that position", async () => {
    const dateKey = formatLocalDateKey(new Date());
    const returning = createTodoItem("Returning", { id: "todo-returning", dateKey });
    const first = createTodoItem("First", { id: "todo-first", dateKey });
    const second = createTodoItem("Second", { id: "todo-second", dateKey });
    useTodosStore.getState().initialize([returning, first, second]);
    useTodosStore.getState().selectDate(dateKey);
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        if (this.dataset.testid === "todo-card-scroll-region") {
          return new DOMRect(0, 0, 500, 500);
        }
        if (this.dataset.todoItemId === first.id) {
          return new DOMRect(20, 100, 420, 60);
        }
        if (this.dataset.todoItemId === second.id) {
          return new DOMRect(20, 180, 420, 60);
        }
        return new DOMRect(0, 0, 1, 1);
      });

    render(
      <TodoList
        dockZoneTarget={{
          kind: "todo",
          id: returning.id,
          source: "floating",
          clientX: 100,
          clientY: 170,
        }}
      />,
    );

    try {
      await waitFor(() => {
        expect(screen.getByTestId("todo-dock-insertion-line")).toHaveAttribute("data-edge", "after");
      });
      expect(useTodosStore.getState().todos.map((todo) => todo.id)).toEqual([
        first.id,
        returning.id,
        second.id,
      ]);
    } finally {
      rectSpy.mockRestore();
    }
  });
});
