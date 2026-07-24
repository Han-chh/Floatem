import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createNoteCard, createNoteGroup, DEFAULT_NOTE_CONTENT, DEFAULT_SETTINGS } from "../../src/lib/models";
import { NoteCardPreview } from "../../src/components/notes/NoteCard";
import { NotesList } from "../../src/components/notes/NotesList";
import { useNotesStore } from "../../src/store/notesStore";

describe("NotesList", () => {
  function installNativeBridge() {
    const originalBridge = window.floatemHost;
    const clipboard = { value: "" };
    const writeClipboardText = vi.fn(async (text: string) => {
      clipboard.value = text;
    });
    const readClipboardText = vi.fn(async () => clipboard.value);
    const pickScreenColor = vi.fn(async (): Promise<{ sRGBHex: string } | null> => null);

    window.floatemHost = {
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
      pickScreenColor,
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
      openTextColorPanel: window.floatemHost.openTextColorPanel,
      pickScreenColor,
      readClipboardText,
      restore() {
        window.floatemHost = originalBridge;
      },
      writeClipboardText,
    };
  }

  it("adds and deletes a note card", async () => {
    const user = userEvent.setup();
    render(<NotesList />);

    await user.click(screen.getByRole("button", { name: "Add note" }));
    expect(screen.getByTestId("note-card")).toHaveClass("content-card-classic");
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

  it("persists the formatting toolbar state and uses arrows that describe the next action", async () => {
    const user = userEvent.setup();
    const view = render(<NotesList />);

    await user.click(screen.getByRole("button", { name: "Add note" }));
    const note = screen.getByTestId("note-card");
    const collapseButton = within(note).getByRole("button", { name: "Collapse formatting toolbar" });

    expect(collapseButton).toHaveAttribute("aria-expanded", "true");
    expect(collapseButton.querySelector("path")).toHaveAttribute("d", "m6 9 6 6 6-6");
    await user.click(collapseButton);

    expect(within(note).queryByRole("button", { name: "Bold" })).not.toBeInTheDocument();
    const expandButton = within(note).getByRole("button", { name: "Expand formatting toolbar" });
    expect(expandButton).toHaveAttribute("aria-expanded", "false");
    expect(expandButton.querySelector("path")).toHaveAttribute("d", "m6 15 6-6 6 6");

    view.unmount();
    render(<NotesList />);
    const restoredNote = screen.getByTestId("note-card");
    const restoredExpandButton = within(restoredNote).getByRole("button", { name: "Expand formatting toolbar" });
    expect(restoredExpandButton).toHaveAttribute("aria-expanded", "false");

    await user.click(restoredExpandButton);
    expect(within(restoredNote).getByRole("button", { name: "Bold" })).toBeInTheDocument();
    expect(within(restoredNote).getByRole("button", { name: "Collapse formatting toolbar" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("manages groups from the card dialog", async () => {
    const user = userEvent.setup();
    render(<NotesList />);

    await user.click(screen.getByRole("button", { name: "Add note" }));

    const note = screen.getByTestId("note-card");
    const groupButton = within(note).getByRole("button", { name: "Change note group" });
    const metadataRow = groupButton.closest(".note-card-chip-group");
    const actionRow = within(note).getByRole("button", { name: "Collapse note" }).closest(".note-card-actions");

    expect(within(note).getAllByRole("button", { name: "Change note group" })).toHaveLength(1);
    expect(metadataRow?.querySelector(".note-secondary-chip")).toBeInTheDocument();
    expect(actionRow).not.toContainElement(groupButton);
    expect(within(note).getByText("No group")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Group name" })).not.toBeInTheDocument();

    await user.click(groupButton);
    expect(screen.getByRole("dialog", { name: "Manage groups" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Group name" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add group" }));
    const createDialog = screen.getByRole("dialog", { name: "Create group" });
    await user.type(within(createDialog).getByRole("textbox", { name: "Group name" }), "Work");
    await user.click(within(createDialog).getByRole("button", { name: "Create group" }));
    await user.click(screen.getByRole("button", { name: "Work" }));
    expect(within(note).getByText("Work")).toBeInTheDocument();
    expect(note).toHaveAttribute("data-note-grouped", "true");
    expect(note).toHaveAttribute("data-card-grouped", "true");
    expect(note.style.getPropertyValue("--card-group-accent")).not.toBe("");
    const noteTexture = note.querySelector<HTMLElement>(".note-group-card-texture");
    expect(noteTexture).toBeInTheDocument();
    expect(noteTexture?.style.backgroundImage).not.toContain("linear-gradient");
    expect(note.querySelector(".note-group-card-rail")).toBeInTheDocument();

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
    expect(note).toHaveAttribute("data-note-grouped", "false");
    expect(note).toHaveAttribute("data-card-grouped", "false");
    expect(note.querySelector(".note-group-card-texture")).not.toBeInTheDocument();
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

  it("renders the empty note preview with the shared readonly editor field", () => {
    const note = createNoteCard({
      id: "note-empty-preview",
      title: "",
      content: DEFAULT_NOTE_CONTENT,
      updatedAt: new Date("2026-05-22T12:00:00.000Z").valueOf(),
    });

    const { container } = render(<NoteCardPreview note={note} width={340} />);
    const editor = container.querySelector(".note-editor-input");

    expect(editor).toBeInTheDocument();
    expect(editor).toHaveClass("surface-field", "min-h-[76px]", "px-3", "py-3", "text-[12.25px]", "leading-[1.6]");
    expect(container.querySelector(".note-editor-input + span")).not.toBeInTheDocument();
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
    expect(boldButton).toHaveAttribute("data-tooltip", "Bold Cmd+B");
    expect(italicButton).toHaveAttribute("data-tooltip", "Italic Cmd+I");
    expect(underlineButton).toHaveAttribute("data-tooltip", "Underline Cmd+U");
    expect(screen.getByRole("button", { name: "Copy" })).toHaveAttribute("data-tooltip", "Copy Cmd+C");
    expect(screen.getByRole("button", { name: "Undo" })).toHaveAttribute("data-tooltip", "Undo Cmd+Z");
    expect(screen.getByRole("button", { name: "Redo" })).toHaveAttribute("data-tooltip", "Redo Cmd+Shift+Z");
    expect(screen.getByRole("button", { name: "Paste" })).toHaveAttribute("data-tooltip", "Paste Cmd+V");
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
    expect(screen.getByText("Loose card")).toBeInTheDocument();
    expect(screen.getByText("Ideas card")).toBeInTheDocument();
    expect(screen.getByText("Work card")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(screen.queryByText("Loose card")).not.toBeInTheDocument();
      expect(screen.queryByText("Ideas card")).not.toBeInTheDocument();
      expect(screen.queryByText("Work card")).not.toBeInTheDocument();
    });
    expect(screen.getByText("No notes match the selected groups.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Filter groups" }));
    const workDialog = screen.getByRole("dialog", { name: "Filter groups" });
    await user.click(within(workDialog).getByRole("checkbox", { name: /^Work/ }));

    expect(within(workDialog).getByRole("checkbox", { name: /^All/ })).not.toBeChecked();
    expect(within(workDialog).getByRole("checkbox", { name: /^No group/ })).not.toBeChecked();
    expect(within(workDialog).getByRole("checkbox", { name: /^Work/ })).toBeChecked();
    expect(within(workDialog).getByRole("checkbox", { name: /^Ideas/ })).not.toBeChecked();
    expect(screen.queryByText("Work card")).not.toBeInTheDocument();
    await user.click(within(workDialog).getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(screen.getByText("Work card")).toBeInTheDocument();
    });
    expect(screen.queryByText("Ideas card")).not.toBeInTheDocument();
    expect(screen.queryByText("Loose card")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Filter groups" }));
    const allDialog = screen.getByRole("dialog", { name: "Filter groups" });
    await user.click(within(allDialog).getByRole("checkbox", { name: /^All/ }));

    expect(within(allDialog).getByRole("checkbox", { name: /^All/ })).toBeChecked();
    expect(within(allDialog).getByRole("checkbox", { name: /^No group/ })).toBeChecked();
    expect(within(allDialog).getByRole("checkbox", { name: /^Work/ })).toBeChecked();
    expect(within(allDialog).getByRole("checkbox", { name: /^Ideas/ })).toBeChecked();
    await user.click(within(allDialog).getByRole("button", { name: "Save" }));
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

    await user.click(screen.getByRole("button", { name: "Show Colors" }));
    expect(screen.getByTestId("note-text-color-palette-advanced")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Saturation and brightness" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Hue" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Hex color" })).toHaveValue("#1E1915");
    expect(screen.getByRole("button", { name: "Return" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pick screen color" })).toBeDisabled();
  });

  it("previews colors picked from the screen eyedropper", async () => {
    const originalEyeDropper = window.EyeDropper;
    const open = vi.fn(async () => ({ sRGBHex: "#445566" }));
    window.EyeDropper = vi.fn(function EyeDropperMock() {
      return { open };
    }) as unknown as typeof window.EyeDropper;

    const user = userEvent.setup();
    useNotesStore.getState().initialize([
      createNoteCard({
        id: "note-eyedropper-color",
        title: "Eyedropper",
        content: DEFAULT_NOTE_CONTENT,
      }),
    ]);

    render(<NotesList />);

    try {
      await user.click(screen.getByRole("button", { name: "Color" }));
      await user.click(screen.getByRole("button", { name: "More Colors" }));
      await user.click(screen.getByRole("button", { name: "Show Colors" }));

      const pickScreenColorButton = screen.getByRole("button", { name: "Pick screen color" });
      expect(pickScreenColorButton).toBeEnabled();

      await user.click(pickScreenColorButton);

      await waitFor(() => {
        expect(screen.getByRole("textbox", { name: "Hex color" })).toHaveValue("#445566");
      });
      expect(open).toHaveBeenCalledTimes(1);
    } finally {
      window.EyeDropper = originalEyeDropper;
    }
  });

  it("uses the in-app advanced color picker instead of the native color panel", async () => {
    const bridge = installNativeBridge();
    const user = userEvent.setup();
    useNotesStore.getState().initialize([
      createNoteCard({
        id: "note-native-color-panel",
        title: "Native color panel",
        content: DEFAULT_NOTE_CONTENT,
      }),
    ]);

    render(<NotesList />);

    try {
      await user.click(screen.getByRole("button", { name: "Color" }));
      await user.click(screen.getByRole("button", { name: "More Colors" }));
      await user.click(screen.getByRole("button", { name: "Show Colors" }));

      expect(screen.getByTestId("note-text-color-palette-advanced")).toBeInTheDocument();
      expect(bridge.openTextColorPanel).not.toHaveBeenCalled();
    } finally {
      bridge.restore();
    }
  });

  it("applies advanced colors to note groups without the native color panel", async () => {
    const bridge = installNativeBridge();
    const user = userEvent.setup();
    render(<NotesList />);

    try {
      await user.click(screen.getByRole("button", { name: "Add note" }));

      const note = screen.getByTestId("note-card");
      await user.click(within(note).getByRole("button", { name: "Change note group" }));
      await user.click(screen.getByRole("button", { name: "Add group" }));

      const createDialog = screen.getByRole("dialog", { name: "Create group" });
      await user.click(within(createDialog).getByRole("button", { name: "Change group color" }));
      await user.click(screen.getByRole("button", { name: "More Colors" }));
      await user.click(screen.getByRole("button", { name: "Show Colors" }));

      const hexInput = screen.getByRole("textbox", { name: "Hex color" });
      await user.clear(hexInput);
      await user.type(hexInput, "336699");
      await user.click(screen.getByRole("button", { name: "Save" }));

      await user.type(within(createDialog).getByRole("textbox", { name: "Group name" }), "Research");
      await user.click(within(createDialog).getByRole("button", { name: "Create group" }));

      expect(useNotesStore.getState().groups[0]?.color).toBe("#336699");
      expect(bridge.openTextColorPanel).not.toHaveBeenCalled();
    } finally {
      bridge.restore();
    }
  });

  it("previews note group colors picked through the native screen picker", async () => {
    const bridge = installNativeBridge();
    bridge.pickScreenColor.mockResolvedValue({ sRGBHex: "#778899" });
    const user = userEvent.setup();
    render(<NotesList />);

    try {
      await user.click(screen.getByRole("button", { name: "Add note" }));

      const note = screen.getByTestId("note-card");
      await user.click(within(note).getByRole("button", { name: "Change note group" }));
      await user.click(screen.getByRole("button", { name: "Add group" }));

      const createDialog = screen.getByRole("dialog", { name: "Create group" });
      await user.click(within(createDialog).getByRole("button", { name: "Change group color" }));
      await user.click(screen.getByRole("button", { name: "More Colors" }));
      await user.click(screen.getByRole("button", { name: "Show Colors" }));

      const pickScreenColorButton = screen.getByRole("button", { name: "Pick screen color" });
      expect(pickScreenColorButton).toBeEnabled();

      await user.click(pickScreenColorButton);

      await waitFor(() => {
        expect(screen.getByRole("textbox", { name: "Hex color" })).toHaveValue("#778899");
      });
      expect(bridge.pickScreenColor).toHaveBeenCalledTimes(1);
      expect(bridge.openTextColorPanel).not.toHaveBeenCalled();
    } finally {
      bridge.restore();
    }
  });

  it("shows a green insertion line and reorders a floating note at that position", async () => {
    const bridge = installNativeBridge();
    const returning = createNoteCard({ id: "note-returning", title: "Returning" });
    const first = createNoteCard({ id: "note-first", title: "First" });
    const second = createNoteCard({ id: "note-second", title: "Second" });
    useNotesStore.getState().initialize([returning, first, second]);
    useNotesStore.getState().setFloatingCardIds([returning.id]);
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        if (this.dataset.testid === "note-card-scroll-region") {
          return new DOMRect(0, 0, 500, 500);
        }
        if (this.dataset.noteCardId === first.id) {
          return new DOMRect(20, 100, 420, 80);
        }
        if (this.dataset.noteCardId === second.id) {
          return new DOMRect(20, 200, 420, 80);
        }
        return new DOMRect(0, 0, 1, 1);
      });

    render(
      <NotesList
        dockZoneTarget={{
          kind: "note",
          id: returning.id,
          source: "floating",
          clientX: 100,
          clientY: 190,
        }}
      />,
    );

    try {
      await waitFor(() => {
        expect(screen.getByTestId("note-dock-insertion-line")).toHaveAttribute("data-edge", "after");
      });
      expect(useNotesStore.getState().cards.map((card) => card.id)).toEqual([
        first.id,
        returning.id,
        second.id,
      ]);
    } finally {
      rectSpy.mockRestore();
      bridge.restore();
    }
  });
});
