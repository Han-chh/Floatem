import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DragPreviewPayload, FloatingCardReference } from "@stickit/native-bridge";
import { FloatingNoteApp } from "../../src/components/floating-note/FloatingNoteApp";
import {
  createEmptyNotesDocument,
  createEmptyTodosDocument,
  createNoteCard,
  createNoteGroup,
  createTodoGroup,
  createTodoItem,
  DEFAULT_NOTE_CONTENT,
  DEFAULT_SETTINGS,
  type NoteCard,
  type NoteGroup,
  type TodoItem,
  type TodoGroup,
} from "../../src/lib/models";
import { useNotesStore } from "../../src/store/notesStore";
import { useTodosStore } from "../../src/store/todosStore";
import { getNoteToolbarStateKey } from "../../src/lib/noteToolbarState";
import { FLOATING_CARD_STATE_EVENT } from "../../src/lib/dragPreview";

function createFloatingNotePayload(note: NoteCard, groups: NoteGroup[] = []): DragPreviewPayload {
  return {
    kind: "note",
    language: "en",
    size: {
      height: 300,
      width: 420,
    },
    pointerOffset: {
      x: 210,
      y: 150,
    },
    note: {
      id: note.id,
      title: note.title,
      dotColor: note.dotColor,
      groupId: note.groupId,
      collapsed: note.collapsed,
      content: note.content,
      previewText: "",
      updatedAt: note.updatedAt,
    },
    groups,
  };
}

function createFloatingTodoPayload(todo: TodoItem, groups: TodoGroup[] = []): DragPreviewPayload {
  return {
    kind: "todo",
    language: "en",
    timeZone: DEFAULT_SETTINGS.timeZone,
    timeFormat: DEFAULT_SETTINGS.timeFormat,
    size: {
      height: 72,
      width: 360,
    },
    pointerOffset: {
      x: 180,
      y: 36,
    },
    order: 1,
    todo: {
      id: todo.id,
      text: todo.text,
      done: todo.done,
      groupId: todo.groupId,
      reminderAt: todo.reminderAt,
      createdAt: todo.createdAt,
      dateKey: todo.dateKey,
    },
    groups,
  };
}

function createFloatingScreenPlacement(left: number, width: number, availableWidth = 1400) {
  return {
    cardFrame: {
      left,
      top: 120,
      width,
      height: 300,
    },
    availableFrame: {
      left: 0,
      top: 0,
      width: availableWidth,
      height: 900,
    },
  };
}

function installFloatingBridge(note: NoteCard, groups: NoteGroup[] = []) {
  const originalBridge = window.stickItHost;
  const clipboard = { value: "" };
  const startFloatingCardDrag = vi.fn(async () => {});
  const closeFloatingCard = vi.fn(async () => {});
  const resizeFloatingCard = vi.fn(async () => {});
  const getFloatingCardScreenPlacement = vi.fn(async () => createFloatingScreenPlacement(100, 420));
  const setEditableInputActive = vi.fn();
  const setTextCompositionActive = vi.fn();
  const saveSettings = vi.fn(async () => {});
  const reportFrontendReady = vi.fn();
  const setFloatingCardDesktopPinned = vi.fn(async (_card: FloatingCardReference, pinned: boolean) => ({
    pinned,
    launchAtLoginEnabled: false,
    requiresLaunchAtLogin: pinned,
  }));
  const requestDesktopWidget = vi.fn(async () => ({ requested: true, requiresSystemPlacement: true }));
  const removeDesktopWidgetAssociation = vi.fn(async () => {});
  const writeClipboardText = vi.fn(async (text: string) => {
    clipboard.value = text;
  });

  window.__STICKIT_FLOATING_CARD_STATE__ = createFloatingNotePayload(note, groups);
  window.stickItHost = {
    platform: "macos",
    getCapabilities: vi.fn(async () => ({
      platform: "macos" as const,
      runtime: "test-floating",
      capabilities: {
        "window.show": true,
        "window.hide": true,
        "window.toggle": true,
        "window.alwaysOnTop": true,
        "window.dragPreview": false,
        "window.floatingCards": true,
        "notifications.send": false,
        "notifications.schedule": false,
        "notifications.openSettings": false,
        "shortcuts.global": false,
        "settings.persist": true,
        "clipboard.read": true,
        "clipboard.write": true,
        "devtools.open": false,
        "app.quit": false,
      },
    })),
    loadAllData: vi.fn(async () => ({
      notes: {
        cards: [note],
        groups,
      },
      todos: createEmptyTodosDocument(),
      settings: DEFAULT_SETTINGS,
    })),
    saveNotes: vi.fn(async () => {}),
    saveTodos: vi.fn(async () => {}),
    saveSettings,
    showWindow: vi.fn(async () => {}),
    hideWindow: vi.fn(async () => {}),
    toggleWindow: vi.fn(async () => {}),
    setAlwaysOnTop: vi.fn(async () => {}),
    showDragPreview: vi.fn(async () => {}),
    hideDragPreview: vi.fn(async () => {}),
    showFloatingCard: vi.fn(async () => {}),
    closeFloatingCard,
    resizeFloatingCard,
    getFloatingCardScreenPlacement,
    startFloatingCardDrag,
    setFloatingCardDesktopPinned,
    requestDesktopWidget,
    removeDesktopWidgetAssociation,
    openNotificationSettings: vi.fn(async () => {}),
    sendNotification: vi.fn(async () => {}),
    showNotification: vi.fn(async () => {}),
    scheduleNotification: vi.fn(async () => {}),
    openTextColorPanel: vi.fn(async () => {}),
    testReminderNotification: vi.fn(async () => {}),
    getHotkeyRegistrationState: vi.fn(async () => ({
      shortcut: DEFAULT_SETTINGS.hotkey,
      registration: "unsupported" as const,
    })),
    readClipboardText: vi.fn(async () => clipboard.value),
    registerHotkey: vi.fn(async () => {}),
    registerGlobalShortcut: vi.fn(async () => {}),
    unregisterHotkey: vi.fn(async () => {}),
    setEditableInputActive,
    setTextCompositionActive,
    writeClipboardText,
    hidePanelWindow: vi.fn(async () => {}),
    quitApplication: vi.fn(async () => {}),
    openDevTools: vi.fn(async () => {}),
    reportFrontendReady,
    reportFrontendError: vi.fn(),
  };

  return {
    clipboard,
    restore() {
      window.stickItHost = originalBridge;
      window.__STICKIT_FLOATING_CARD_STATE__ = undefined;
      window.__STICKIT_FLOATING_CARD_GUIDE__ = undefined;
    },
    startFloatingCardDrag,
    closeFloatingCard,
    resizeFloatingCard,
    saveSettings,
    getFloatingCardScreenPlacement,
    setEditableInputActive,
    setTextCompositionActive,
    setFloatingCardDesktopPinned,
    requestDesktopWidget,
    removeDesktopWidgetAssociation,
    reportFrontendReady,
    writeClipboardText,
  };
}

function installFloatingTodoBridge(todo: TodoItem, groups: TodoGroup[] = []) {
  const originalBridge = window.stickItHost;
  const startFloatingCardDrag = vi.fn(async () => {});
  const closeFloatingCard = vi.fn(async () => {});
  const resizeFloatingCard = vi.fn(async () => {});
  const getFloatingCardScreenPlacement = vi.fn(async () => createFloatingScreenPlacement(100, 360));
  const saveTodos = vi.fn(async () => {});
  const setEditableInputActive = vi.fn();
  const setTextCompositionActive = vi.fn();
  const reportFrontendReady = vi.fn();
  const setFloatingCardDesktopPinned = vi.fn(async (_card: FloatingCardReference, pinned: boolean) => ({
    pinned,
    launchAtLoginEnabled: false,
    requiresLaunchAtLogin: pinned,
  }));
  const requestDesktopWidget = vi.fn(async () => ({ requested: true, requiresSystemPlacement: true }));
  const removeDesktopWidgetAssociation = vi.fn(async () => {});

  window.__STICKIT_FLOATING_CARD_STATE__ = createFloatingTodoPayload(todo, groups);
  window.stickItHost = {
    platform: "macos",
    getCapabilities: vi.fn(async () => ({
      platform: "macos" as const,
      runtime: "test-floating",
      capabilities: {
        "window.show": true,
        "window.hide": true,
        "window.toggle": true,
        "window.alwaysOnTop": true,
        "window.dragPreview": false,
        "window.floatingCards": true,
        "notifications.send": false,
        "notifications.schedule": false,
        "notifications.openSettings": false,
        "shortcuts.global": false,
        "settings.persist": true,
        "clipboard.read": true,
        "clipboard.write": true,
        "devtools.open": false,
        "app.quit": false,
      },
    })),
    loadAllData: vi.fn(async () => ({
      notes: createEmptyNotesDocument(),
      todos: {
        items: [todo],
        groups,
      },
      settings: DEFAULT_SETTINGS,
    })),
    saveNotes: vi.fn(async () => {}),
    saveTodos,
    saveSettings: vi.fn(async () => {}),
    showWindow: vi.fn(async () => {}),
    hideWindow: vi.fn(async () => {}),
    toggleWindow: vi.fn(async () => {}),
    setAlwaysOnTop: vi.fn(async () => {}),
    showDragPreview: vi.fn(async () => {}),
    hideDragPreview: vi.fn(async () => {}),
    showFloatingCard: vi.fn(async () => {}),
    closeFloatingCard,
    resizeFloatingCard,
    getFloatingCardScreenPlacement,
    startFloatingCardDrag,
    setFloatingCardDesktopPinned,
    requestDesktopWidget,
    removeDesktopWidgetAssociation,
    openNotificationSettings: vi.fn(async () => {}),
    sendNotification: vi.fn(async () => {}),
    showNotification: vi.fn(async () => {}),
    scheduleNotification: vi.fn(async () => {}),
    openTextColorPanel: vi.fn(async () => {}),
    testReminderNotification: vi.fn(async () => {}),
    getHotkeyRegistrationState: vi.fn(async () => ({
      shortcut: DEFAULT_SETTINGS.hotkey,
      registration: "unsupported" as const,
    })),
    readClipboardText: vi.fn(async () => ""),
    registerHotkey: vi.fn(async () => {}),
    registerGlobalShortcut: vi.fn(async () => {}),
    unregisterHotkey: vi.fn(async () => {}),
    setEditableInputActive,
    setTextCompositionActive,
    writeClipboardText: vi.fn(async () => {}),
    hidePanelWindow: vi.fn(async () => {}),
    quitApplication: vi.fn(async () => {}),
    openDevTools: vi.fn(async () => {}),
    reportFrontendReady,
    reportFrontendError: vi.fn(),
  };

  return {
    restore() {
      window.stickItHost = originalBridge;
      window.__STICKIT_FLOATING_CARD_STATE__ = undefined;
      window.__STICKIT_FLOATING_CARD_GUIDE__ = undefined;
    },
    closeFloatingCard,
    resizeFloatingCard,
    getFloatingCardScreenPlacement,
    saveTodos,
    setEditableInputActive,
    setTextCompositionActive,
    startFloatingCardDrag,
    setFloatingCardDesktopPinned,
    requestDesktopWidget,
    removeDesktopWidgetAssociation,
    reportFrontendReady,
  };
}

describe("FloatingNoteApp", () => {
  it("acknowledges readiness after installing listeners and accepts the native guide replay", async () => {
    const note = createNoteCard({ id: "floating-guide-handshake", title: "Guided note" });
    const bridge = installFloatingBridge(note);
    bridge.reportFrontendReady.mockImplementation(() => {
      window.dispatchEvent(new CustomEvent("stickit:floating-card-guide", {
        detail: {
          phase: "pin",
          title: "Pin to desktop",
          instruction: "Click the highlighted pin",
        },
      }));
    });

    render(<FloatingNoteApp />);

    try {
      expect(await screen.findByRole("dialog", { name: "Pin to desktop" })).toBeInTheDocument();
      expect(bridge.reportFrontendReady).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(document.querySelector("[data-floating-guide-pin-ring]")).toBeInTheDocument();
      });
    } finally {
      bridge.restore();
    }
  });

  it("renders animated guide actions inside the floating card window", async () => {
    const note = createNoteCard({ id: "floating-guide-note", title: "Guided note" });
    const bridge = installFloatingBridge(note);
    const user = userEvent.setup();

    render(<FloatingNoteApp />);

    try {
      await screen.findByTestId("note-card");
      act(() => {
        window.dispatchEvent(new CustomEvent("stickit:floating-card-guide", {
          detail: {
            phase: "pin",
            title: "Pin to desktop",
            instruction: "Click the highlighted pin",
          },
        }));
      });

      expect(await screen.findByRole("dialog", { name: "Pin to desktop" })).toBeInTheDocument();
      expect(document.querySelector("[data-floating-guide-overlay]")).toBeInTheDocument();
      expect(document.querySelector("[data-floating-guide-highlight]")).toBeInTheDocument();
      expect(document.querySelector("[data-floating-guide-pin-ring]")).toHaveClass("rounded-full");
      expect(screen.getByRole("button", { name: "Keep on desktop" })).toHaveAttribute("data-action", "desktop-pin");

      await user.click(screen.getByRole("button", { name: "Keep on desktop" }));
      expect(await screen.findByRole("dialog", { name: "Keep StickIt running" })).toBeInTheDocument();
      expect(
        screen.getByRole("dialog", { name: "Guide: Handle the startup dialog first" }),
      ).toHaveTextContent("Choose an option in the startup dialog before continuing with the pin guide.");
      expect(document.querySelector("[data-floating-guide-pin-ring]")).not.toBeInTheDocument();
      expect(document.querySelector("[data-floating-guide-dialog-ring]")).toHaveClass("rounded-[30px]");

      act(() => {
        window.dispatchEvent(new CustomEvent("stickit:floating-card-guide", { detail: null }));
      });
      expect(
        screen.getByRole("dialog", { name: "Guide: Handle the startup dialog first" }),
      ).toBeInTheDocument();
      expect(document.querySelector("[data-floating-guide-dialog-ring]")).toBeInTheDocument();

      act(() => {
        window.dispatchEvent(new CustomEvent("stickit:floating-card-guide", {
          detail: {
            phase: "pin",
            title: "Pin to desktop",
            instruction: "Click the highlighted pin",
          },
        }));
      });

      expect(screen.getByRole("button", { name: "Not Now" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Enable" })).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Enable" }));
      await waitFor(() => {
        expect(bridge.saveSettings).toHaveBeenCalledWith(
          expect.objectContaining({ launchAtLogin: true }),
        );
      });
      await waitFor(() => {
        expect(document.querySelector("[data-floating-guide-pin-ring]")).toHaveClass("rounded-full");
      });

      act(() => {
        window.dispatchEvent(new CustomEvent("stickit:floating-card-guide", {
          detail: {
            phase: "close",
            title: "Return the floating card",
            instruction: "Click the highlighted close button",
          },
        }));
      });

      expect(await screen.findByRole("dialog", { name: "Return the floating card" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Close" })).toHaveAttribute("data-action", "dock");

      act(() => {
        window.dispatchEvent(new CustomEvent("stickit:floating-card-guide", {
          detail: {
            phase: "drag",
            title: "Drag back to the app",
            instruction: "Drag a blank area into the main window",
          },
        }));
      });

      expect(await screen.findByRole("dialog", { name: "Drag back to the app" })).toBeInTheDocument();
      expect(document.querySelector("[data-floating-guide-drag-ring]")).toHaveClass("rounded-[26px]");

      act(() => {
        window.dispatchEvent(new CustomEvent("stickit:floating-card-guide", { detail: null }));
      });
      await waitFor(() => {
        expect(document.querySelector("[data-floating-guide-overlay]")).not.toBeInTheDocument();
        expect(document.querySelector("[data-floating-guide-highlight]")).not.toBeInTheDocument();
      });
    } finally {
      bridge.restore();
    }
  });

  it("keeps group rings on floating note and todo cards", async () => {
    const noteGroup = createNoteGroup({ id: "floating-note-group", name: "Work", color: "#2F6BFF" });
    const note = createNoteCard({ id: "floating-grouped-note", title: "Grouped note", groupId: noteGroup.id });
    const noteBridge = installFloatingBridge(note, [noteGroup]);

    const noteView = render(<FloatingNoteApp />);
    try {
      const noteCard = await screen.findByTestId("note-card");
      expect(noteCard).toHaveAttribute("data-card-grouped", "true");
      expect(noteCard.style.getPropertyValue("--card-group-accent")).toBe(noteGroup.color);
      await waitFor(() => {
        expect(document.documentElement).toHaveAttribute("data-stickit-theme", DEFAULT_SETTINGS.theme);
      });
    } finally {
      noteView.unmount();
      noteBridge.restore();
    }

    const todoGroup = createTodoGroup({ id: "floating-todo-group", name: "Focus", color: "#1FA87A" });
    const todo = createTodoItem("Grouped todo", { id: "floating-grouped-todo", groupId: todoGroup.id });
    const todoBridge = installFloatingTodoBridge(todo, [todoGroup]);

    render(<FloatingNoteApp />);
    try {
      const todoCard = await screen.findByTestId("todo-item");
      expect(todoCard).toHaveAttribute("data-card-grouped", "true");
      expect(todoCard.style.getPropertyValue("--card-group-accent")).toBe(todoGroup.color);
    } finally {
      todoBridge.restore();
    }
  });

  it("restores the same per-note toolbar state in a floating card", async () => {
    const note = createNoteCard({ id: "floating-note-toolbar-state", title: "Remember toolbar" });
    const bridge = installFloatingBridge(note);
    window.localStorage.setItem(getNoteToolbarStateKey(note.id), "true");

    render(<FloatingNoteApp />);

    try {
      const card = await screen.findByTestId("note-card");
      const expandButton = within(card).getByRole("button", { name: "Expand formatting toolbar" });
      expect(expandButton).toHaveAttribute("aria-expanded", "false");
      expect(expandButton.querySelector("path")).toHaveAttribute("d", "m6 15 6-6 6 6");
      expect(within(card).queryByRole("button", { name: "Bold" })).not.toBeInTheDocument();
    } finally {
      bridge.restore();
    }
  });

  it("supports note text editing controls without starting a floating-window drag", async () => {
    const note = createNoteCard({
      id: "floating-note-editing",
      title: "Floating note",
      content: DEFAULT_NOTE_CONTENT,
    });
    const bridge = installFloatingBridge(note);
    const user = userEvent.setup();

    render(<FloatingNoteApp />);

    try {
      const card = await screen.findByTestId("note-card");
      const editor = within(card).getAllByRole("textbox")[1]!;
      const boldButton = within(card).getByRole("button", { name: "Bold" });
      const italicButton = within(card).getByRole("button", { name: "Italic" });
      const underlineButton = within(card).getByRole("button", { name: "Underline" });
      const colorButton = within(card).getByRole("button", { name: "Color" });
      const copyButton = within(card).getByRole("button", { name: "Copy" });
      const pasteButton = within(card).getByRole("button", { name: "Paste" });
      const clearButton = within(card).getByRole("button", { name: "Clear format" });
      const undoButton = within(card).getByRole("button", { name: "Undo" });
      const redoButton = within(card).getByRole("button", { name: "Redo" });

      bridge.clipboard.value = "Floating body";
      await user.click(boldButton);
      await user.click(italicButton);
      await user.click(underlineButton);
      await user.click(pasteButton);

      await waitFor(() => {
        expect(editor).toHaveTextContent("Floating body");
        expect(editor.querySelector("strong")).not.toBeNull();
        expect(editor.querySelector("em")).not.toBeNull();
        expect(editor.querySelector("u")).not.toBeNull();
      });
      expect(bridge.startFloatingCardDrag).not.toHaveBeenCalled();

      await user.click(copyButton);
      await waitFor(() => {
        expect(bridge.writeClipboardText).toHaveBeenLastCalledWith("Floating body");
      });

      await user.click(undoButton);
      await waitFor(() => {
        expect(editor).not.toHaveTextContent("Floating body");
      });

      await user.click(redoButton);
      await waitFor(() => {
        expect(editor).toHaveTextContent("Floating body");
      });

      await user.click(editor);
      await user.click(colorButton);
      await user.click(screen.getByRole("button", { name: "Use #FF7A59 for note" }));
      bridge.clipboard.value = " color";
      await user.click(pasteButton);

      await waitFor(() => {
        const firstNode = useNotesStore.getState().cards[0]?.content[0] as
          | { children?: Array<Record<string, unknown>> }
          | undefined;
        expect(firstNode?.children).toContainEqual(
          expect.objectContaining({ color: "#FF7A59", text: " color" }),
        );
      });

      await user.click(editor);
      fireEvent.keyDown(editor, { key: "a", metaKey: true });
      await user.click(clearButton);
      await waitFor(() => {
        expect(boldButton).toHaveAttribute("aria-pressed", "false");
        expect(italicButton).toHaveAttribute("aria-pressed", "false");
        expect(underlineButton).toHaveAttribute("aria-pressed", "false");
      });

      bridge.startFloatingCardDrag.mockClear();
      const editRegion = card.querySelector('[data-floating-note-edit-region="true"]');
      expect(editRegion).not.toBeNull();
      fireEvent.pointerDown(editRegion!, { button: 0 });
      fireEvent.pointerDown(editor, { button: 0 });
      expect(bridge.startFloatingCardDrag).not.toHaveBeenCalled();

      fireEvent.pointerDown(card, { button: 0 });
      // Flush microtask queue — the onBeginDrag callback is deferred
      // via Promise.resolve().then() to avoid WebView process crashes.
      await Promise.resolve();
      expect(bridge.startFloatingCardDrag).toHaveBeenCalledTimes(1);
    } finally {
      bridge.restore();
    }
  });

  it("docks a floating note from the close action without deleting it", async () => {
    const note = createNoteCard({
      id: "floating-note-dock",
      title: "Floating note",
      content: DEFAULT_NOTE_CONTENT,
    });
    const bridge = installFloatingBridge(note);
    const user = userEvent.setup();

    render(<FloatingNoteApp />);

    try {
      const card = await screen.findByTestId("note-card");
      await user.click(within(card).getByRole("button", { name: "Close" }));

      await waitFor(() => {
        expect(bridge.closeFloatingCard).toHaveBeenCalledWith({ kind: "note", id: note.id });
      });
      expect(useNotesStore.getState().cards.some((card) => card.id === note.id)).toBe(true);
    } finally {
      bridge.restore();
    }
  });

  it("uses the floating group label as the only group action and keeps pinning in the action row", async () => {
    const note = createNoteCard({ id: "floating-note-pin", title: "Pinned note" });
    const bridge = installFloatingBridge(note);
    const user = userEvent.setup();

    render(<FloatingNoteApp />);

    try {
      const card = await screen.findByTestId("note-card");
      const pinButton = within(card).getByRole("button", { name: "Keep on desktop" });
      const groupButton = within(card).getByRole("button", { name: "Change note group" });
      const metadataRow = groupButton.closest(".note-card-chip-group--floating");
      const actionRow = pinButton.closest(".note-card-actions--floating");

      expect(metadataRow).not.toBeNull();
      expect(actionRow).not.toBeNull();
      expect(actionRow).not.toContainElement(groupButton);
      expect(metadataRow?.querySelector(".note-secondary-chip")).toBeInTheDocument();
      expect(within(card).getAllByRole("button", { name: "Change note group" })).toHaveLength(1);

      await user.click(pinButton);
      expect(bridge.setFloatingCardDesktopPinned).toHaveBeenCalledWith({ kind: "note", id: note.id }, true);
      expect(screen.getByRole("dialog", { name: "Keep StickIt running" })).toBeInTheDocument();
      expect(within(card).getByRole("button", { name: "Remove from desktop" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(
        within(card).getByRole("button", { name: "Remove from desktop" })
          .querySelector("[data-desktop-pin-indicator]"),
      ).toHaveAttribute("data-active", "true");

      act(() => {
        window.dispatchEvent(new CustomEvent(FLOATING_CARD_STATE_EVENT, {
          detail: { ...createFloatingNotePayload(note), desktopPinned: false },
        }));
      });
      await waitFor(() => {
        expect(within(card).getByRole("button", { name: "Remove from desktop" })).toHaveAttribute(
          "aria-pressed",
          "true",
        );
      });

      await user.click(screen.getByRole("button", { name: "Not Now" }));
      const refreshedCard = await screen.findByTestId("note-card");
      await user.click(within(refreshedCard).getByRole("button", { name: "Remove from desktop" }));
      expect(bridge.setFloatingCardDesktopPinned).toHaveBeenCalledWith({ kind: "note", id: note.id }, false);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    } finally {
      bridge.restore();
    }
  });

  it("uses the native result as the authoritative desktop pin state", async () => {
    const note = createNoteCard({ id: "floating-note-pin-rejected", title: "Rejected pin" });
    const bridge = installFloatingBridge(note);
    bridge.setFloatingCardDesktopPinned.mockResolvedValue({
      pinned: false,
      launchAtLoginEnabled: false,
      requiresLaunchAtLogin: false,
    });
    const user = userEvent.setup();

    render(<FloatingNoteApp />);

    try {
      const card = await screen.findByTestId("note-card");
      await user.click(within(card).getByRole("button", { name: "Keep on desktop" }));

      await waitFor(() => {
        expect(within(card).getByRole("button", { name: "Keep on desktop" })).toHaveAttribute(
          "aria-pressed",
          "false",
        );
      });
      expect(
        within(card).getByRole("button", { name: "Keep on desktop" })
          .querySelector("[data-desktop-pin-indicator]"),
      ).toHaveAttribute("data-active", "false");
    } finally {
      bridge.restore();
    }
  });

  it("does not warn when login launch is already enabled for a desktop card", async () => {
    const note = createNoteCard({ id: "floating-note-login-enabled", title: "Persistent note" });
    const bridge = installFloatingBridge(note);
    bridge.setFloatingCardDesktopPinned.mockResolvedValue({
      pinned: true,
      launchAtLoginEnabled: true,
      requiresLaunchAtLogin: false,
    });
    const user = userEvent.setup();

    render(<FloatingNoteApp />);

    try {
      const card = await screen.findByTestId("note-card");
      await user.click(within(card).getByRole("button", { name: "Keep on desktop" }));
      expect(bridge.setFloatingCardDesktopPinned).toHaveBeenCalledWith(
        { kind: "note", id: note.id },
        true,
      );
      expect(screen.queryByRole("dialog", { name: "Keep StickIt running" })).not.toBeInTheDocument();
    } finally {
      bridge.restore();
    }
  });

  it("resizes a floating note without rendering a visible corner handle or allowing it below its initial size", async () => {
    const note = createNoteCard({ id: "floating-note-resize", title: "Resizable note" });
    const bridge = installFloatingBridge(note);

    render(<FloatingNoteApp />);

    try {
      await screen.findByTestId("note-card");
      const shell = screen.getByTestId("floating-card-shell");
      const scaledContent = screen.getByTestId("floating-card-scaled-content");
      const handle = screen.getByRole("separator", { name: "Resize floating card" });
      expect(handle).toBeEmptyDOMElement();
      expect(handle).not.toHaveAttribute("data-tooltip");
      expect(handle).toHaveClass("h-8", "w-8");
      bridge.resizeFloatingCard.mockClear();

      fireEvent.pointerDown(handle, { pointerId: 1, clientX: 420, clientY: 300 });
      fireEvent.pointerMove(handle, { pointerId: 1, clientX: 500, clientY: 360 });

      expect(shell).toHaveStyle({ width: "500px", minHeight: "360px" });
      expect(scaledContent).toHaveAttribute("data-floating-card-content-scale", "1.190");
      expect(bridge.resizeFloatingCard).toHaveBeenLastCalledWith({
        width: 500,
        height: 360,
        anchor: "top",
        horizontalAnchor: "left",
      });

      const resizeCallCount = bridge.resizeFloatingCard.mock.calls.length;
      fireEvent.pointerMove(handle, { pointerId: 1, clientX: 420, clientY: 420 });
      expect(shell).toHaveStyle({ width: "420px", minHeight: "420px" });
      expect(bridge.resizeFloatingCard).toHaveBeenCalledTimes(resizeCallCount + 1);
      expect(bridge.resizeFloatingCard).toHaveBeenLastCalledWith({
        width: 420,
        height: 420,
        anchor: "top",
        horizontalAnchor: "left",
      });

      fireEvent.pointerMove(handle, { pointerId: 1, clientX: 540, clientY: 300 });
      expect(shell).toHaveStyle({ width: "540px", minHeight: "300px" });
      expect(bridge.resizeFloatingCard).toHaveBeenLastCalledWith({
        width: 540,
        height: 300,
        anchor: "top",
        horizontalAnchor: "left",
      });

      fireEvent.pointerMove(handle, { pointerId: 1, clientX: 100, clientY: 100 });
      expect(shell).toHaveStyle({ width: "420px", minHeight: "300px" });
      expect(scaledContent).toHaveAttribute("data-floating-card-content-scale", "1.000");
    } finally {
      bridge.restore();
    }
  });

  it("shrinks a collapsed floating note to its header and restores its expanded size", async () => {
    const note = createNoteCard({ id: "floating-note-collapse-size", title: "Collapsible note" });
    const bridge = installFloatingBridge(note);
    const user = userEvent.setup();

    render(<FloatingNoteApp />);

    try {
      const card = await screen.findByTestId("note-card");
      vi.spyOn(card, "getBoundingClientRect").mockReturnValue({
        bottom: 104,
        height: 104,
        left: 0,
        right: 420,
        top: 0,
        width: 420,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });
      bridge.resizeFloatingCard.mockClear();

      await user.click(within(card).getByRole("button", { name: "Collapse note" }));
      await waitFor(() => {
        expect(bridge.resizeFloatingCard).toHaveBeenCalledWith({
          width: 420,
          height: 104,
          anchor: "top",
          horizontalAnchor: "left",
          allowBelowMinimum: true,
        });
      });
      expect(screen.getByTestId("floating-card-shell")).toHaveStyle({ width: "420px", minHeight: "104px" });
      expect(within(card).getByRole("textbox", { name: "Note title" })).toBeInTheDocument();
      expect(within(card).getAllByRole("textbox")).toHaveLength(1);

      await user.click(within(card).getByRole("button", { name: "Collapse note" }));
      await waitFor(() => {
        expect(bridge.resizeFloatingCard).toHaveBeenLastCalledWith({
          width: 420,
          height: 300,
          anchor: "top",
          horizontalAnchor: "left",
        });
      });
      expect(screen.getByTestId("floating-card-shell")).toHaveStyle({ width: "420px", minHeight: "300px" });
    } finally {
      bridge.restore();
    }
  });

  it("expands the floating note viewport while note dialogs are open", async () => {
    const note = createNoteCard({
      id: "floating-note-dialog",
      title: "Floating note",
      content: DEFAULT_NOTE_CONTENT,
    });
    const bridge = installFloatingBridge(note);
    const user = userEvent.setup();

    render(<FloatingNoteApp />);

    try {
      const card = await screen.findByTestId("note-card");
      bridge.resizeFloatingCard.mockClear();

      await user.click(within(card).getByRole("button", { name: "Change note group" }));

      await waitFor(() => {
        expect(bridge.resizeFloatingCard).toHaveBeenCalledWith({
          width: 912,
          height: 680,
          anchor: "top",
          horizontalAnchor: "left",
        });
      });
      expect(screen.getByTestId("floating-card-shell")).toHaveAttribute("data-floating-card-dialog-side", "right");

      const dialog = screen.getByRole("dialog");
      await user.click(within(dialog).getByRole("button", { name: "Close" }));

      await waitFor(() => {
        expect(bridge.resizeFloatingCard).toHaveBeenCalledWith({
          width: 420,
          height: 300,
          anchor: "top",
          horizontalAnchor: "left",
        });
      });
    } finally {
      bridge.restore();
    }
  });

  it("places floating note dialogs on the left when the right side cannot fit them", async () => {
    const note = createNoteCard({
      id: "floating-note-left-dialog",
      title: "Floating note",
      content: DEFAULT_NOTE_CONTENT,
    });
    const bridge = installFloatingBridge(note);
    bridge.getFloatingCardScreenPlacement.mockResolvedValue(createFloatingScreenPlacement(700, 420, 900));
    const user = userEvent.setup();

    render(<FloatingNoteApp />);

    try {
      const card = await screen.findByTestId("note-card");
      bridge.resizeFloatingCard.mockClear();

      await user.click(within(card).getByRole("button", { name: "Change note group" }));

      await waitFor(() => {
        expect(bridge.resizeFloatingCard).toHaveBeenCalledWith({
          width: 912,
          height: 680,
          anchor: "top",
          horizontalAnchor: "right",
        });
      });
      expect(screen.getByTestId("floating-card-shell")).toHaveAttribute("data-floating-card-dialog-side", "left");
      expect(screen.getByTestId("floating-card-shell")).toHaveStyle({ marginLeft: "492px" });
    } finally {
      bridge.restore();
    }
  });

  it("reports floating editable and composition state to the native host", async () => {
    const note = createNoteCard({
      id: "floating-note-ime",
      title: "Floating note",
      content: DEFAULT_NOTE_CONTENT,
    });
    const bridge = installFloatingBridge(note);

    render(<FloatingNoteApp />);

    try {
      const card = await screen.findByTestId("note-card");
      const titleInput = within(card).getAllByRole("textbox")[0]!;

      fireEvent.focusIn(titleInput);
      fireEvent.compositionStart(titleInput);
      fireEvent.compositionEnd(titleInput);
      fireEvent.focusOut(titleInput);

      expect(bridge.setEditableInputActive).toHaveBeenCalledWith(true);
      expect(bridge.setTextCompositionActive).toHaveBeenCalledWith(true);
      expect(bridge.setTextCompositionActive).toHaveBeenCalledWith(false);
      expect(bridge.setEditableInputActive).toHaveBeenCalledWith(false);
    } finally {
      bridge.restore();
    }
  });

  it("keeps floating composition state active across temporary focus loss", async () => {
    const note = createNoteCard({
      id: "floating-note-ime-focus-loss",
      title: "Floating note",
      content: DEFAULT_NOTE_CONTENT,
    });
    const bridge = installFloatingBridge(note);

    render(<FloatingNoteApp />);

    try {
      const card = await screen.findByTestId("note-card");
      const titleInput = within(card).getAllByRole("textbox")[0]!;

      fireEvent.focusIn(titleInput);
      fireEvent.compositionStart(titleInput);

      bridge.setEditableInputActive.mockClear();
      bridge.setTextCompositionActive.mockClear();

      fireEvent.focusOut(titleInput);

      expect(bridge.setEditableInputActive).not.toHaveBeenCalled();
      expect(bridge.setTextCompositionActive).not.toHaveBeenCalled();

      fireEvent.compositionEnd(titleInput);

      expect(bridge.setTextCompositionActive).toHaveBeenCalledWith(false);
      expect(bridge.setEditableInputActive).toHaveBeenCalledWith(false);
    } finally {
      bridge.restore();
    }
  });

  it("reports editable state from floating note dialog inputs", async () => {
    const note = createNoteCard({
      id: "floating-note-dialog-ime",
      title: "Floating note",
      content: DEFAULT_NOTE_CONTENT,
    });
    const bridge = installFloatingBridge(note);
    const user = userEvent.setup();

    render(<FloatingNoteApp />);

    try {
      const card = await screen.findByTestId("note-card");
      await user.click(within(card).getByRole("button", { name: "Change note group" }));
      await user.click(within(await screen.findByRole("dialog", { name: "Manage groups" })).getByRole("button", { name: "Add group" }));

      const groupNameInput = await screen.findByRole("textbox", { name: "Group name" });
      fireEvent.focusIn(groupNameInput);
      fireEvent.compositionStart(groupNameInput);
      fireEvent.compositionEnd(groupNameInput);
      fireEvent.focusOut(groupNameInput);

      expect(bridge.setEditableInputActive).toHaveBeenCalledWith(true);
      expect(bridge.setTextCompositionActive).toHaveBeenCalledWith(true);
      expect(bridge.setTextCompositionActive).toHaveBeenCalledWith(false);
      expect(bridge.setEditableInputActive).toHaveBeenCalledWith(false);
    } finally {
      bridge.restore();
    }
  });

  it("shows the completed state before docking a floating todo", async () => {
    const todo = createTodoItem("Finish floating todo", {
      id: "floating-todo-complete",
      done: false,
    });
    const bridge = installFloatingTodoBridge(todo);
    const user = userEvent.setup();

    render(<FloatingNoteApp />);

    try {
      const card = await screen.findByTestId("todo-item");
      await user.click(within(card).getByRole("button", { name: "Complete task" }));

      await waitFor(() => {
        expect(useTodosStore.getState().todos.find((item) => item.id === todo.id)?.done).toBe(true);
        expect(card.querySelector(".todo-done-strike-line")).not.toBeNull();
      });
      expect(bridge.closeFloatingCard).not.toHaveBeenCalled();

      await waitFor(
        () => {
          expect(bridge.saveTodos).toHaveBeenCalledWith(
            expect.objectContaining({
              items: expect.arrayContaining([expect.objectContaining({ id: todo.id, done: true })]),
            }),
          );
          expect(bridge.closeFloatingCard).toHaveBeenCalledWith({ kind: "todo", id: todo.id });
        },
        { timeout: 1200 },
      );
    } finally {
      bridge.restore();
    }
  });

  it("allows vertical, horizontal, and diagonal todo resizing", async () => {
    const todo = createTodoItem("Resize todo", { id: "floating-todo-resize" });
    const bridge = installFloatingTodoBridge(todo);

    render(<FloatingNoteApp />);

    try {
      await screen.findByTestId("todo-item");
      const shell = screen.getByTestId("floating-card-shell");
      const handle = screen.getByRole("separator", { name: "Resize floating card" });
      bridge.resizeFloatingCard.mockClear();

      fireEvent.pointerDown(handle, { pointerId: 2, clientX: 360, clientY: 72 });
      fireEvent.pointerMove(handle, { pointerId: 2, clientX: 360, clientY: 160 });
      expect(shell).toHaveStyle({ width: "360px", minHeight: "160px" });
      expect(bridge.resizeFloatingCard).toHaveBeenLastCalledWith({
        width: 360,
        height: 160,
        anchor: "top",
        horizontalAnchor: "left",
      });

      fireEvent.pointerMove(handle, { pointerId: 2, clientX: 440, clientY: 72 });
      expect(shell).toHaveStyle({ width: "440px", minHeight: "72px" });
      expect(bridge.resizeFloatingCard).toHaveBeenLastCalledWith({
        width: 440,
        height: 72,
        anchor: "top",
        horizontalAnchor: "left",
      });

      fireEvent.pointerMove(handle, { pointerId: 2, clientX: 440, clientY: 132 });
      expect(shell).toHaveStyle({ width: "440px", minHeight: "132px" });
      expect(bridge.resizeFloatingCard).toHaveBeenLastCalledWith({
        width: 440,
        height: 132,
        anchor: "top",
        horizontalAnchor: "left",
      });
    } finally {
      bridge.restore();
    }
  });

  it("pins a desktop todo panel before its group action", async () => {
    const todo = createTodoItem("Pinned todo", { id: "floating-todo-pin" });
    const bridge = installFloatingTodoBridge(todo);
    const user = userEvent.setup();

    render(<FloatingNoteApp />);

    try {
      const card = await screen.findByTestId("todo-item");
      const actions = within(card).getAllByRole("button");
      const pinButton = within(card).getByRole("button", { name: "Keep on desktop" });
      const groupButton = within(card).getByRole("button", { name: "Change todo group" });
      expect(actions.indexOf(pinButton)).toBeLessThan(actions.indexOf(groupButton));

      await user.click(pinButton);
      expect(bridge.setFloatingCardDesktopPinned).toHaveBeenCalledWith({ kind: "todo", id: todo.id }, true);
      expect(screen.getByRole("dialog", { name: "Keep StickIt running" })).toBeInTheDocument();
      expect(pinButton).not.toHaveFocus();
    } finally {
      bridge.restore();
    }
  });

  it("keeps desktop pin and completion visuals isolated on a pinned floating todo", async () => {
    const todo = createTodoItem("Pinned todo completion", { id: "floating-todo-pinned-complete" });
    const bridge = installFloatingTodoBridge(todo);
    window.__STICKIT_FLOATING_CARD_STATE__ = {
      ...createFloatingTodoPayload(todo),
      desktopPinned: true,
    };
    const user = userEvent.setup();

    render(<FloatingNoteApp />);

    try {
      const card = await screen.findByTestId("todo-item");
      const completionButton = within(card).getByRole("button", { name: "Complete task" });
      const pinButton = within(card).getByRole("button", { name: "Remove from desktop" });

      expect(completionButton).toHaveAttribute("data-action", "todo-completion");
      expect(pinButton).toHaveAttribute("data-action", "desktop-pin");

      await user.click(completionButton);

      await waitFor(() => {
        expect(completionButton).toHaveAttribute("aria-pressed", "true");
      });
      expect(pinButton).toHaveAttribute("aria-pressed", "true");
      expect(completionButton).toHaveClass("outline-none", "focus-visible:outline-none");
    } finally {
      bridge.restore();
    }
  });

  it("expands the floating todo viewport while todo dialogs are open", async () => {
    const todo = createTodoItem("Floating dialog todo", {
      id: "floating-todo-dialog",
      done: false,
    });
    const bridge = installFloatingTodoBridge(todo);
    const user = userEvent.setup();

    render(<FloatingNoteApp />);

    try {
      const card = await screen.findByTestId("todo-item");
      expect(screen.getByTestId("floating-card-shell")).toHaveAttribute("data-floating-card-dialog-side", "none");
      bridge.resizeFloatingCard.mockClear();

      await user.click(within(card).getByRole("button", { name: "Change todo group" }));

      await waitFor(() => {
        expect(bridge.resizeFloatingCard).toHaveBeenCalledWith({
          width: 852,
          height: 680,
          anchor: "top",
          horizontalAnchor: "left",
        });
      });
      expect(screen.getByTestId("floating-card-shell")).toHaveAttribute("data-floating-card-dialog-side", "right");

      await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }));

      await waitFor(() => {
        expect(bridge.resizeFloatingCard).toHaveBeenCalledWith({
          width: 360,
          height: 72,
          anchor: "top",
          horizontalAnchor: "left",
        });
      });
    } finally {
      bridge.restore();
    }
  });

  it("opens a floating todo reminder without opening the edit dialog", async () => {
    const todo = createTodoItem("Floating reminder todo", {
      id: "floating-todo-reminder",
      done: false,
    });
    const bridge = installFloatingTodoBridge(todo);

    render(<FloatingNoteApp />);

    try {
      const card = await screen.findByTestId("todo-item");
      const reminderButton = within(card).getByRole("button", { name: "Set reminder" });
      const reminderIcon = reminderButton.querySelector("svg");
      expect(reminderIcon).not.toBeNull();

      fireEvent.pointerDown(reminderIcon!, { button: 0, pointerId: 1 });
      fireEvent.pointerUp(reminderIcon!, { button: 0, pointerId: 1 });
      fireEvent.click(reminderIcon!);

      expect(await screen.findByRole("dialog", { name: "Set todo reminder" })).toBeInTheDocument();
      expect(screen.queryByRole("dialog", { name: "Edit todo" })).not.toBeInTheDocument();
    } finally {
      bridge.restore();
    }
  });

  it("places floating dialogs on the left when the right side cannot fit them", async () => {
    const todo = createTodoItem("Floating left-side dialog todo", {
      id: "floating-todo-left-dialog",
      done: false,
    });
    const bridge = installFloatingTodoBridge(todo);
    bridge.getFloatingCardScreenPlacement.mockResolvedValue(createFloatingScreenPlacement(700, 360, 800));
    const user = userEvent.setup();

    render(<FloatingNoteApp />);

    try {
      const card = await screen.findByTestId("todo-item");
      bridge.resizeFloatingCard.mockClear();

      await user.click(within(card).getByRole("button", { name: "Change todo group" }));

      await waitFor(() => {
        expect(bridge.resizeFloatingCard).toHaveBeenCalledWith({
          width: 852,
          height: 680,
          anchor: "top",
          horizontalAnchor: "right",
        });
      });
      expect(screen.getByTestId("floating-card-shell")).toHaveAttribute("data-floating-card-dialog-side", "left");
      expect(screen.getByTestId("floating-card-shell")).toHaveStyle({ marginLeft: "492px" });
    } finally {
      bridge.restore();
    }
  });

  it("opens a normal-sized edit dialog when clicking a floating todo card", async () => {
    const todo = createTodoItem("Floating editable todo", {
      id: "floating-todo-edit",
      done: false,
    });
    const bridge = installFloatingTodoBridge(todo);
    const user = userEvent.setup();

    render(<FloatingNoteApp />);

    try {
      const card = await screen.findByTestId("todo-item");
      bridge.resizeFloatingCard.mockClear();

      await user.click(card);

      const dialog = await screen.findByRole("dialog", { name: "Edit todo" });
      await waitFor(() => {
        expect(bridge.resizeFloatingCard).toHaveBeenCalledWith({
          width: 852,
          height: 680,
          anchor: "top",
          horizontalAnchor: "left",
        });
      });
      expect(screen.getByTestId("floating-card-shell")).toHaveAttribute("data-floating-card-dialog-side", "right");
      expect(bridge.startFloatingCardDrag).not.toHaveBeenCalled();

      const titleInput = within(dialog).getByRole("textbox", { name: "Todo title" });
      fireEvent.focusIn(titleInput);
      fireEvent.compositionStart(titleInput);
      fireEvent.compositionEnd(titleInput);
      fireEvent.focusOut(titleInput);

      expect(bridge.setEditableInputActive).toHaveBeenCalledWith(true);
      expect(bridge.setTextCompositionActive).toHaveBeenCalledWith(true);
      expect(bridge.setTextCompositionActive).toHaveBeenCalledWith(false);
      expect(bridge.setEditableInputActive).toHaveBeenCalledWith(false);

      await user.clear(titleInput);
      await user.type(titleInput, "Updated floating todo");
      await user.click(within(dialog).getByRole("button", { name: "Save" }));

      await waitFor(() => {
        expect(useTodosStore.getState().todos.find((item) => item.id === todo.id)?.text).toBe("Updated floating todo");
      });
    } finally {
      bridge.restore();
    }
  });
});
