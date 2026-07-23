import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PanelShell } from "../../src/components/layout/PanelShell";
import { NotesList } from "../../src/components/notes/NotesList";
import { SETTINGS_LANGUAGE_ORDER, SettingsPanel } from "../../src/components/settings/SettingsPanel";
import { useNotesStore } from "../../src/store/notesStore";
import { useSettingsStore } from "../../src/store/settingsStore";
import { useTodosStore } from "../../src/store/todosStore";

describe("PanelShell", () => {
  it("lists Simplified Chinese before English", () => {
    expect(SETTINGS_LANGUAGE_ORDER).toEqual(["zh-CN", "en"]);
  });

  it("offers Afterglow without the removed Night and system-switching controls", async () => {
    const user = userEvent.setup();
    HTMLElement.prototype.scrollTo = vi.fn();
    useSettingsStore.setState({ language: "en" });
    render(<SettingsPanel onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /ThemeBackground/ }));

    const afterglow = screen.getByRole("button", { name: "Afterglow" });
    expect(afterglow).toBeInTheDocument();
    expect(screen.getByText("Choose one fixed light theme for StickIt.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Night" })).not.toBeInTheDocument();
    expect(screen.queryByText("Follow system appearance")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button").filter((button) => button.hasAttribute("aria-pressed"))).toEqual([
      screen.getByRole("button", { name: "Classic" }),
      afterglow,
      screen.getByRole("button", { name: "Plum red · Plum blossom" }),
      screen.getByRole("button", { name: "White green · Orchid" }),
      screen.getByRole("button", { name: "Ink green · Bamboo" }),
      screen.getByRole("button", { name: "Chrysanthemum yellow · Chrysanthemum" }),
    ]);

    await user.click(afterglow);
    expect(afterglow).toHaveAttribute("aria-pressed", "true");
    expect(useSettingsStore.getState().theme).toBe("afterglow");
  });

  it("shows launch at login as disabled when macOS reports that the login item was turned off", async () => {
    const originalBridge = window.stickItHost;
    const getLaunchAtLoginStatus = vi.fn(async () => ({ enabled: false }));
    window.stickItHost = { getLaunchAtLoginStatus } as unknown as NonNullable<typeof window.stickItHost>;
    HTMLElement.prototype.scrollTo = vi.fn();
    useSettingsStore.setState({ language: "en", launchAtLogin: true });
    const user = userEvent.setup();

    render(<SettingsPanel onClose={vi.fn()} />);

    try {
      await user.click(screen.getByRole("button", { name: /General/ }));

      await waitFor(() => {
        expect(getLaunchAtLoginStatus).toHaveBeenCalled();
        expect(screen.getByRole("button", { pressed: false })).toBeInTheDocument();
      });
      expect(useSettingsStore.getState().launchAtLogin).toBe(false);
    } finally {
      window.stickItHost = originalBridge;
    }
  });

  it("opens global StickIt help from the header", async () => {
    const user = userEvent.setup();
    useSettingsStore.setState({ language: "en", theme: "afterglow" });
    document.documentElement.dataset.stickitTheme = "afterglow";

    render(
      <PanelShell
        activeTab="notes"
        animationSpeed="mediate"
        onTabChange={vi.fn()}
        onToggleSettings={vi.fn()}
        settingsPanel={<div>Settings panel</div>}
        showSettings={false}
        transitionStyle="lift"
      >
        <div>Panel body</div>
      </PanelShell>,
    );

    const helpButton = screen.getByRole("button", { name: "StickIt help" });
    expect(helpButton).toHaveClass("outline-none", "focus-visible:outline-none");
    await user.click(helpButton);

    const dialog = screen.getByRole("dialog", { name: "StickIt guide" });
    const scrollRegion = screen.getByTestId("help-scroll-region");

    expect(dialog).toBeInTheDocument();
    expect(dialog.parentElement).toHaveClass("stickit-modal-backdrop", "fixed", "z-[95]");
    expect(scrollRegion).toContainElement(screen.getByText("StickIt guide"));
    expect(scrollRegion).toContainElement(screen.getByText("Overview"));
    expect(scrollRegion).toContainElement(screen.getByRole("button", { name: /Notes/i }));
    expect(scrollRegion).toHaveClass("overflow-y-auto");
    expect(within(dialog).queryByText("Add")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Notes" }));

    const notesGuide = screen.getByRole("dialog", { name: "Write and organize note cards" });
    expect(notesGuide).toBeInTheDocument();
    expect(screen.getByText("Cards")).toBeInTheDocument();

    await user.click(within(notesGuide).getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("button", { name: "Todos" }));

    const todosGuide = screen.getByRole("dialog", { name: "Plan tasks around a day" });
    expect(
      within(todosGuide).getByText(
        "To create a todo, switch to Todos, press Enter to focus the quick-entry field, type the todo, then press Enter again to submit it.",
      ),
    ).toBeInTheDocument();
  });

  it("runs the interactive guide over the real panel with a lightweight floating dialog", async () => {
    const user = userEvent.setup();
    useSettingsStore.setState({ language: "en", timeFormat: "24h" });

    render(
      <PanelShell
        activeTab="notes"
        animationSpeed="mediate"
        onTabChange={vi.fn()}
        onToggleSettings={vi.fn()}
        settingsPanel={<div>Settings panel</div>}
        showSettings={false}
        transitionStyle="lift"
      >
        <div>Original panel body</div>
      </PanelShell>,
    );

    await user.click(screen.getByRole("button", { name: "StickIt help" }));
    expect(screen.getByText(/Explore 7 complete feature workflows in the real app/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Start interactive guide" }));
    const guide = screen.getByRole("dialog", { name: "StickIt interactive guide" });
    expect(within(guide).getByText("Step 1 of 7")).toBeInTheDocument();
    expect(guide).toHaveClass("fixed", "w-[min(268px,calc(100vw-28px))]");
    expect(screen.getByText("Original panel body")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Collapse navigation" }));
    await waitFor(() => {
      expect(within(guide).getByText("Step 2 of 7")).toBeInTheDocument();
      expect(within(guide).getByText("Manage a note end to end")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Expand navigation" })).toHaveAttribute("aria-expanded", "false");
      expect(within(guide).getByText("Add a note")).toBeInTheDocument();
    });

    expect(within(guide).getByRole("button", { name: "Previous chapter" })).toBeEnabled();
    expect(within(guide).getByRole("button", { name: "Next chapter" })).toBeEnabled();

    await user.click(within(guide).getByRole("button", { name: "Next chapter" }));
    await waitFor(() => {
      expect(within(guide).getByText("Step 3 of 7")).toBeInTheDocument();
      expect(within(guide).getByText("Create a floating card")).toBeInTheDocument();
    });
    for (const chapter of [4, 5, 6, 7]) {
      await user.click(within(guide).getByRole("button", { name: "Next chapter" }));
      await waitFor(() => {
        expect(within(guide).getByText(`Step ${chapter} of 7`)).toBeInTheDocument();
      });
    }
    expect(within(guide).getByRole("button", { name: "Next chapter" })).toBeDisabled();

    await user.click(within(guide).getByRole("button", { name: "Previous chapter" }));
    await waitFor(() => {
      expect(within(guide).getByText("Step 6 of 7")).toBeInTheDocument();
      expect(within(guide).getByText("Open todo groups")).toBeInTheDocument();
    });

    await user.click(within(guide).getByRole("button", { name: "Exit guide" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "StickIt interactive guide" })).not.toBeInTheDocument();
      expect(document.querySelector("[data-guide-highlight]")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Original panel body")).toBeInTheDocument();
    expect(useNotesStore.getState().groups).toHaveLength(0);
    expect(useTodosStore.getState().groups).toHaveLength(0);
  });

  it("advances through note grouping using the real note card and group dialog", async () => {
    const user = userEvent.setup();
    useSettingsStore.setState({ language: "en" });

    render(
      <PanelShell
        activeTab="notes"
        animationSpeed="mediate"
        onTabChange={vi.fn()}
        onToggleSettings={vi.fn()}
        settingsPanel={<div>Settings panel</div>}
        showSettings={false}
        transitionStyle="lift"
      >
        <NotesList />
      </PanelShell>,
    );

    await user.click(screen.getByRole("button", { name: "StickIt help" }));
    await user.click(screen.getByRole("button", { name: "Start interactive guide" }));
    await user.click(screen.getByRole("button", { name: "Collapse navigation" }));
    await waitFor(() => expect(screen.getByText("Add a note")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Add note" }));
    await waitFor(() => expect(screen.getByText("Edit the note title")).toBeInTheDocument());

    const guideNoteId = useNotesStore.getState().cards[0]?.id;
    const guideNote = document.querySelector(`[data-note-card-id="${guideNoteId}"]`);
    expect(guideNote).not.toBeNull();
    await user.type(within(guideNote as HTMLElement).getByRole("textbox", { name: "Note title" }), "StickIt guide note");
    await waitFor(() => expect(screen.getByText("Open note groups")).toBeInTheDocument());
    await user.click(within(guideNote as HTMLElement).getByRole("button", { name: "Change note group" }));
    await waitFor(() => expect(screen.getByText("Add a note group")).toBeInTheDocument());
    const groupManagerDialog = screen.getByRole("dialog", { name: "Manage groups" });
    const guide = screen.getByRole("dialog", { name: "StickIt interactive guide" });
    expect(groupManagerDialog).toBeInTheDocument();
    expect(guide).toHaveClass("z-[200]");
    expect(document.querySelector("[data-guide-highlight]")).toHaveClass("z-[196]");
    await user.click(screen.getByRole("button", { name: "Add group" }));

    const createDialog = screen.getByRole("dialog", { name: "Create group" });
    await waitFor(() => expect(screen.getByText("Name the note group")).toBeInTheDocument());
    await user.type(within(createDialog).getByRole("textbox", { name: "Group name" }), "Focus");
    await waitFor(() => expect(screen.getByText("Open the color picker")).toBeInTheDocument());
    await user.click(within(createDialog).getByRole("button", { name: "Change group color" }));
    await waitFor(() => expect(screen.getByText("Discover more colors")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "More Colors" }));
    await waitFor(() => expect(screen.getByText("Open the advanced palette")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Show Colors" }));
    await waitFor(() => expect(screen.getByText("Create a custom color")).toBeInTheDocument());
    const customColorField = screen.getByRole("slider", { name: "Saturation and brightness" });
    customColorField.focus();
    await user.keyboard("{ArrowRight}");
    await waitFor(() => expect(screen.getByText("Save the custom color")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByText("Create the note group")).toBeInTheDocument());
    await user.click(within(createDialog).getByRole("button", { name: "Create group" }));

    await waitFor(() => expect(screen.getByText("Apply the new group")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Focus" }));

    await waitFor(() => {
      expect(screen.getByText("Open groups again")).toBeInTheDocument();
      expect(guideNote).toHaveAttribute("data-note-grouped", "true");
      expect(useNotesStore.getState().groups[0]?.name).toBe("Focus");
      expect(useNotesStore.getState().groups[0]?.color).toMatch(/^#[0-9A-F]{6}$/);
    });
  });
});
