import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createNoteCard, createNoteGroup, DEFAULT_NOTE_CONTENT, DEFAULT_SETTINGS } from "../../src/lib/models";
import { NotesList } from "../../src/components/notes/NotesList";
import { useNotesStore } from "../../src/store/notesStore";

describe("NotesList", () => {
  function installNativeBridge() {
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

    return {
      clipboard,
      readClipboardText,
      restore() {
        window.quickNoteHost = originalBridge;
      },
      writeClipboardText,
    };
  }

  it("adds and deletes a note card", async () => {
    const user = userEvent.setup();
    render(<NotesList />);

    await user.click(screen.getByRole("button", { name: "Add note" }));
    expect(screen.getByPlaceholderText("Untitled note")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Paste" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear format" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Redo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Image" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete note" }));
    expect(screen.queryByPlaceholderText("Untitled note")).not.toBeInTheDocument();
  });

  it("manages groups from the card dialog", async () => {
    const user = userEvent.setup();
    render(<NotesList />);

    await user.click(screen.getByRole("button", { name: "Add note" }));

    const note = screen.getByTestId("note-card");
    expect(within(note).getByText("No group")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Group name" })).not.toBeInTheDocument();

    await user.click(within(note).getByRole("button", { name: "Change note group" }));
    expect(screen.getByRole("dialog", { name: "Manage groups" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Group name" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add group" }));
    const createDialog = screen.getByRole("dialog", { name: "Create group" });
    await user.type(within(createDialog).getByRole("textbox", { name: "Group name" }), "Work");
    await user.click(within(createDialog).getByRole("button", { name: "Create group" }));
    await user.click(screen.getByRole("button", { name: "Work" }));
    expect(within(note).getByText("Work")).toBeInTheDocument();

    await user.click(within(note).getByRole("button", { name: "Change note group" }));
    await user.click(screen.getByRole("button", { name: "Edit Work group" }));

    const editDialog = screen.getByRole("dialog", { name: "Edit group" });
    const groupNameInput = within(editDialog).getByRole("textbox", { name: "Group name" });
    await user.clear(groupNameInput);
    await user.type(groupNameInput, "Focus");
    await user.click(within(editDialog).getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Edit group" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Focus" })).toBeInTheDocument();

    const manageDialog = screen.getByRole("dialog", { name: "Manage groups" });
    await user.click(within(manageDialog).getByRole("button", { name: "Delete group" }));
    await user.click(screen.getByRole("button", { name: "Delete Focus group" }));
    expect(screen.getByText("No groups yet. This note stays ungrouped until you create one here.")).toBeInTheDocument();

    await user.click(within(screen.getByRole("dialog", { name: "Manage groups" })).getByRole("button", { name: "Close" }));
    expect(within(note).getByText("No group")).toBeInTheDocument();
  });

  it("does not refresh edited time when the editor only gains focus", async () => {
    const now = new Date("2026-04-02T12:00:00.000Z").valueOf();
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now);
    useNotesStore.getState().initialize([
      createNoteCard({
        id: "note-focus",
        title: "Keep timestamp",
        content: DEFAULT_NOTE_CONTENT,
        createdAt: now - 7_200_000,
        updatedAt: now - 3_600_000,
      }),
    ]);

    const user = userEvent.setup();
    render(<NotesList />);
    expect(screen.getByText("1h ago")).toBeInTheDocument();

    const [, editor] = screen.getAllByRole("textbox");
    await user.click(editor);

    expect(screen.getByText("1h ago")).toBeInTheDocument();
    nowSpy.mockRestore();
  });

  it("shows formatting shortcuts in the toolbar tooltips", async () => {
    useNotesStore.getState().initialize([
      createNoteCard({
        id: "note-format-toolbar",
        title: "Formatting",
        content: DEFAULT_NOTE_CONTENT,
      }),
    ]);

    const user = userEvent.setup();
    render(<NotesList />);

    const boldButton = screen.getByRole("button", { name: "Bold" });
    const italicButton = screen.getByRole("button", { name: "Italic" });
    const underlineButton = screen.getByRole("button", { name: "Underline" });

    expect(boldButton).toHaveAttribute("aria-pressed", "false");
    expect(italicButton).toHaveAttribute("aria-pressed", "false");
    expect(underlineButton).toHaveAttribute("aria-pressed", "false");

    await user.click(boldButton);
    expect(boldButton).toHaveAttribute("aria-pressed", "true");
    await user.click(boldButton);
    expect(boldButton).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Cmd+B")).toBeInTheDocument();
    expect(screen.getByText("Cmd+I")).toBeInTheDocument();
    expect(screen.getByText("Cmd+U")).toBeInTheDocument();
    expect(screen.getByText("Cmd+C")).toBeInTheDocument();
    expect(screen.getByText("Cmd+Z")).toBeInTheDocument();
    expect(screen.getByText("Cmd+Shift+Z")).toBeInTheDocument();
    expect(screen.getByText("Cmd+V")).toBeInTheDocument();
  });

  it("supports undo and redo from the toolbar", async () => {
    const bridge = installNativeBridge();
    const user = userEvent.setup();
    render(<NotesList />);

    try {
      await user.click(screen.getByRole("button", { name: "Add note" }));

      const note = screen.getByTestId("note-card");
      const editor = within(note).getAllByRole("textbox")[1]!;
      const pasteButton = within(note).getByRole("button", { name: "Paste" });
      const undoButton = within(note).getByRole("button", { name: "Undo" });
      const redoButton = within(note).getByRole("button", { name: "Redo" });

      expect(undoButton).toHaveAttribute("aria-disabled", "true");
      expect(redoButton).toHaveAttribute("aria-disabled", "true");

      bridge.clipboard.value = "Version one";
      await user.click(pasteButton);

      await waitFor(() => {
        expect(editor).toHaveTextContent("Version one");
        expect(undoButton).toHaveAttribute("aria-disabled", "false");
      });

      await user.click(undoButton);
      await waitFor(() => {
        expect(editor).not.toHaveTextContent("Version one");
        expect(redoButton).toHaveAttribute("aria-disabled", "false");
      });

      await user.click(redoButton);
      await waitFor(() => {
        expect(editor).toHaveTextContent("Version one");
      });
    } finally {
      bridge.restore();
    }
  });

  it("uses the native clipboard bridge for editor copy shortcuts and paste buttons", async () => {
    const bridge = installNativeBridge();
    const user = userEvent.setup();
    useNotesStore.getState().initialize([
      createNoteCard({
        id: "note-native-clipboard",
        title: "Bridge",
        content: [{ type: "paragraph", children: [{ text: "Bridge note" }] }],
      }),
    ]);

    render(<NotesList />);

    try {
      const firstNote = screen.getByTestId("note-card");
      await user.click(within(firstNote).getByRole("button", { name: "Copy" }));

      await waitFor(() => {
        expect(bridge.writeClipboardText).toHaveBeenLastCalledWith("Bridge note");
      });

      const firstEditor = within(firstNote).getAllByRole("textbox")[1]!;
      fireEvent.keyDown(firstEditor, { key: "c", metaKey: true });

      await waitFor(() => {
        expect(bridge.writeClipboardText).toHaveBeenLastCalledWith("Bridge note");
      });

      bridge.clipboard.value = "Native bridge paste";

      await user.click(screen.getByRole("button", { name: "Add note" }));
      const latestNote = screen.getAllByTestId("note-card")[0]!;
      await user.click(within(latestNote).getByRole("button", { name: "Paste" }));

      await waitFor(() => {
        const latestEditor = within(latestNote).getAllByRole("textbox")[1]!;
        expect(latestEditor).toHaveTextContent("Native bridge paste");
      });

    } finally {
      bridge.restore();
    }
  });

  it("filters visible cards by selected groups", async () => {
    useNotesStore.getState().initialize({
      cards: [
        createNoteCard({
          id: "note-work",
          title: "Work card",
          groupId: "Work",
          dotColor: "#2F6BFF",
          content: [{ type: "paragraph", children: [{ text: "Work details" }] }],
        }),
        createNoteCard({
          id: "note-ideas",
          title: "Ideas card",
          groupId: "Ideas",
          dotColor: "#1FA87A",
          content: [{ type: "paragraph", children: [{ text: "Ideas details" }] }],
        }),
        createNoteCard({
          id: "note-loose",
          title: "Loose card",
          groupId: null,
          content: [{ type: "paragraph", children: [{ text: "Loose details" }] }],
        }),
      ],
      groups: [
        createNoteGroup({ id: "Work", name: "Work", color: "#2F6BFF" }),
        createNoteGroup({ id: "Ideas", name: "Ideas", color: "#1FA87A" }),
      ],
    });

    const user = userEvent.setup();
    render(<NotesList />);

    expect(screen.getByText("Work card")).toBeInTheDocument();
    expect(screen.getByText("Ideas card")).toBeInTheDocument();
    expect(screen.getByText("Loose card")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Filter groups" }));
    const dialog = screen.getByRole("dialog", { name: "Filter groups" });

    expect(within(dialog).getByRole("checkbox", { name: /^All/ })).toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: /^No group/ })).toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: /^Work/ })).toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: /^Ideas/ })).toBeChecked();

    await user.click(within(dialog).getByRole("checkbox", { name: /^All/ }));

    expect(within(dialog).getByRole("checkbox", { name: /^All/ })).not.toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: /^No group/ })).not.toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: /^Work/ })).not.toBeChecked();
    await waitFor(() => {
      expect(screen.queryByText("Loose card")).not.toBeInTheDocument();
      expect(screen.queryByText("Ideas card")).not.toBeInTheDocument();
      expect(screen.queryByText("Work card")).not.toBeInTheDocument();
    });
    expect(screen.getByText("No notes match the selected groups.")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("checkbox", { name: /^Work/ }));

    expect(within(dialog).getByRole("checkbox", { name: /^All/ })).not.toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: /^No group/ })).not.toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: /^Work/ })).toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: /^Ideas/ })).not.toBeChecked();
    await waitFor(() => {
      expect(screen.getByText("Work card")).toBeInTheDocument();
    });
    expect(screen.queryByText("Ideas card")).not.toBeInTheDocument();
    expect(screen.queryByText("Loose card")).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole("checkbox", { name: /^All/ }));

    expect(within(dialog).getByRole("checkbox", { name: /^All/ })).toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: /^No group/ })).toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: /^Work/ })).toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: /^Ideas/ })).toBeChecked();
    await waitFor(() => {
      expect(screen.getByText("Work card")).toBeInTheDocument();
    });
    expect(screen.getByText("Ideas card")).toBeInTheDocument();
    expect(screen.getByText("Loose card")).toBeInTheDocument();
  });

  it("renders the text color palette in a floating layer", async () => {
    useNotesStore.getState().initialize([
      createNoteCard({
        id: "note-color-toolbar",
        title: "Color",
        content: DEFAULT_NOTE_CONTENT,
      }),
    ]);

    const user = userEvent.setup();
    render(<NotesList />);

    await user.click(screen.getByRole("button", { name: "Color" }));
    expect(screen.getByTestId("note-text-color-palette")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More Colors" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "More Colors" }));
    expect(screen.getByRole("button", { name: "Show Colors" })).toBeInTheDocument();
  });
});
