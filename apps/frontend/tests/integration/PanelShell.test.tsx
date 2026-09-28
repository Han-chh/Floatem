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
    expect(screen.getByTestId("theme-swatch-afterglow")).toHaveStyle({
      background: "linear-gradient(135deg,#f0bd58 0%,#e8756c 38%,#9c74b5 69%,#73aab9 100%)",
    });
    expect(screen.getByTestId("theme-swatch-afterglow")).toBeEmptyDOMElement();
    expect(screen.getByText("Choose one fixed light theme for Floatem.")).toBeInTheDocument();
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
    const originalBridge = window.floatemHost;
    const getLaunchAtLoginStatus = vi.fn(async () => ({ enabled: false }));
    window.floatemHost = { getLaunchAtLoginStatus } as unknown as NonNullable<typeof window.floatemHost>;
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
      window.floatemHost = originalBridge;
    }
  });

  it("does not offer an uninstall action from About Floatem", async () => {
    HTMLElement.prototype.scrollTo = vi.fn();
    useSettingsStore.setState({ language: "en" });
    const user = userEvent.setup();

    render(<SettingsPanel onClose={vi.fn()} />);

    expect(screen.getByText("App overview and local-only data details.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /About Floatem/ }));

    expect(screen.queryByRole("button", { name: /Uninstall Floatem/i })).not.toBeInTheDocument();
  });

  it("shows localized privacy details with the fixed English copyright block and contact email", async () => {
    const user = userEvent.setup();
    HTMLElement.prototype.scrollTo = vi.fn();
    useSettingsStore.setState({ language: "zh-CN" });
    render(<SettingsPanel onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /关于 Floatem/ }));

    expect(screen.getByText("Don't lose thoughts. Float'em.")).toBeInTheDocument();
    expect(screen.getByText(/Version \d+\.\d+\.\d+ \(Build \d+\)/)).toBeInTheDocument();
    const copyrightFooter = screen.getByTestId("about-copyright-footer");
    expect(within(copyrightFooter).getByText("Designed and developed by Hank Chen")).toBeInTheDocument();
    expect(within(copyrightFooter).getByText("© 2026 Hank Chen. All rights reserved.")).toBeInTheDocument();
    expect(screen.getByTestId("about-brand-block")).not.toContainElement(copyrightFooter);
    expect(screen.getByRole("link", { name: /floatemapp@outlook\.com/ })).toHaveAttribute(
      "href",
      "mailto:floatemapp@outlook.com",
    );
    expect(screen.getByRole("link", { name: /han-chh\.github\.io\/Floatem-App/ })).toHaveAttribute(
      "href",
      "https://han-chh.github.io/Floatem-App/",
    );
    expect(screen.getByText("不会收集或上传")).toBeInTheDocument();
    expect(screen.queryByText(/package\.json/)).not.toBeInTheDocument();
  });

  it("opens global Floatem help from the header", async () => {
    const user = userEvent.setup();
    useSettingsStore.setState({ language: "en", theme: "afterglow" });
    document.documentElement.dataset.floatemTheme = "afterglow";

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

    expect(screen.getByText("Don't lose thoughts. Float'em.")).toHaveClass(
      "floatem-slogan",
      "text-[#744a38]",
      "opacity-80",
    );
    const helpButton = screen.getByRole("button", { name: "Floatem help" });
    expect(screen.getByTestId("header-actions")).toHaveClass("gap-1.5", "items-center");
    expect(screen.getByTestId("help-action-slot")).toHaveClass(
      "h-11",
      "w-11",
      "mt-1.5",
      "items-center",
      "justify-center",
    );
    expect(helpButton).toHaveClass(
      "paper-icon-button",
      "h-[30px]",
      "w-[30px]",
      "min-h-0",
      "min-w-0",
      "rounded-[11px]",
    );
    expect(screen.getByRole("button", { name: "Settings" })).toHaveClass(
      "paper-icon-button",
      "mt-1.5",
      "h-[30px]",
      "w-[30px]",
      "min-h-0",
      "min-w-0",
      "rounded-[11px]",
    );
    expect(helpButton).toHaveClass("outline-none", "focus-visible:outline-none");
    await user.click(helpButton);

    const dialog = screen.getByRole("dialog", { name: "Floatem guide" });
    const scrollRegion = screen.getByTestId("help-scroll-region");

    expect(dialog).toBeInTheDocument();
    expect(dialog.parentElement).toHaveClass("floatem-modal-backdrop", "fixed", "z-[95]");
    expect(scrollRegion).toContainElement(screen.getByText("Floatem guide"));
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

  it("highlights the help entry once on a fresh installation", async () => {
    const user = userEvent.setup();
    window.localStorage.removeItem("floatem.settings");
    useSettingsStore.getState().reset();
    useSettingsStore.getState().hydrateSettings({
      language: "en",
      hasSeenHelpEntryHint: false,
    });

    const view = render(
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

    expect(screen.getByTestId("first-launch-help-highlight")).toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "Your guide is right here" }),
    ).toHaveClass("top-[94px]");

    await user.click(screen.getByRole("button", { name: "Open guide" }));

    expect(useSettingsStore.getState().hasSeenHelpEntryHint).toBe(true);
    expect(JSON.parse(window.localStorage.getItem("floatem.settings") ?? "{}")).toEqual(
      expect.objectContaining({
        hasSeenHelpEntryHint: true,
        hotkey: "Shift+Space",
        theme: "classic",
      }),
    );
    await waitFor(() => {
      expect(screen.queryByTestId("first-launch-help-highlight")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("dialog", { name: "Your guide is right here" }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByRole("dialog", { name: "Floatem guide" })).toBeInTheDocument();

    view.unmount();
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

    expect(screen.queryByTestId("first-launch-help-highlight")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Your guide is right here" }),
    ).not.toBeInTheDocument();
    window.localStorage.removeItem("floatem.settings");
  });

  it("dismisses the first-install help hint without opening help", async () => {
    const user = userEvent.setup();
    useSettingsStore.getState().reset();
    useSettingsStore.getState().hydrateSettings({
      language: "zh-CN",
      hasSeenHelpEntryHint: false,
    });

    render(
      <PanelShell
        activeTab="notes"
        animationSpeed="mediate"
        onTabChange={vi.fn()}
        onToggleSettings={vi.fn()}
        settingsPanel={<div>设置面板</div>}
        showSettings={false}
        transitionStyle="lift"
      >
        <div>面板内容</div>
      </PanelShell>,
    );

    await user.click(screen.getByRole("button", { name: "稍后" }));

    expect(useSettingsStore.getState().hasSeenHelpEntryHint).toBe(true);
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "用户指引就在这里" })).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("dialog", { name: "Floatem 指引" })).not.toBeInTheDocument();
  });

  it("moves through the interactive guide only through its guided actions", async () => {
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
        <NotesList />
      </PanelShell>,
    );

    await user.click(screen.getByRole("button", { name: "Floatem help" }));
    expect(screen.getByText(/Explore 7 complete feature workflows in the real app/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Start interactive guide" }));
    const guide = screen.getByRole("dialog", { name: "Floatem interactive guide" });
    expect(within(guide).getByText("Feature 1 of 7 · Step 1 of 1")).toBeInTheDocument();
    expect(guide).toHaveClass("fixed", "w-[min(268px,calc(100vw-28px))]");
    expect(screen.getByRole("button", { name: "Add note" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Collapse navigation" }));
    await waitFor(() => {
      expect(within(guide).getByText(/Feature 2 of 7 · Step 1 of \d+/)).toBeInTheDocument();
      expect(within(guide).getByText("Edit and organize notes")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Expand navigation" })).toHaveAttribute("aria-expanded", "false");
      expect(within(guide).getByText("Create the first note")).toBeInTheDocument();
    });

    expect(within(guide).queryByRole("button", { name: "Previous step" })).not.toBeInTheDocument();
    expect(within(guide).queryByRole("button", { name: "Next step" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add note" }));
    await waitFor(() => expect(within(guide).getByText("Add a title")).toBeInTheDocument());

    await user.click(within(guide).getByRole("button", { name: "Exit guide" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Floatem interactive guide" })).not.toBeInTheDocument();
      expect(document.querySelector("[data-guide-highlight]")).not.toBeInTheDocument();
    });
    expect(
      screen.queryByRole("dialog", {
        name: "Congratulations on completing the interactive guide",
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("note-card")).not.toBeInTheDocument();
    expect(useNotesStore.getState().groups).toHaveLength(0);
    expect(useTodosStore.getState().groups).toHaveLength(0);
  });

  it("guides rich-text editing and toolbar folding on the real note card", async () => {
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

    await user.click(screen.getByRole("button", { name: "Floatem help" }));
    await user.click(screen.getByRole("button", { name: "Start interactive guide" }));
    await user.click(screen.getByRole("button", { name: "Collapse navigation" }));
    await waitFor(() => expect(screen.getByText("Create the first note")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Add note" }));
    await waitFor(() => expect(screen.getByText("Add a title")).toBeInTheDocument());

    const guideNoteId = useNotesStore.getState().cards[0]?.id;
    const guideNote = document.querySelector(`[data-note-card-id="${guideNoteId}"]`);
    expect(guideNote).not.toBeNull();
    await user.type(within(guideNote as HTMLElement).getByRole("textbox", { name: "Note title" }), "Floatem guide note");
    await waitFor(() => expect(screen.getByText("Write rich text")).toBeInTheDocument());

    const editor = guideNote?.querySelector<HTMLElement>('[data-action="note-rich-editor"]');
    expect(editor).not.toBeNull();
    await user.click(editor as HTMLElement);
    await user.keyboard("A formatted guide note");
    await waitFor(() => expect(screen.getByText("This is the rich-text toolbar")).toBeInTheDocument());
    expect(guideNote?.querySelector('[data-action="note-rich-toolbar"]')).toBeInTheDocument();
    expect(document.querySelector("[data-guide-highlight]")).toBeInTheDocument();
    await waitFor(
      () => expect(screen.getByText("Collapse the editor toolbar")).toBeInTheDocument(),
      { timeout: 5_800 },
    );
    await user.click(within(guideNote as HTMLElement).getByRole("button", { name: "Collapse formatting toolbar" }));
    await waitFor(() => expect(screen.getByText("Expand the editor toolbar")).toBeInTheDocument());
    await user.click(within(guideNote as HTMLElement).getByRole("button", { name: "Expand formatting toolbar" }));
    await waitFor(() => expect(screen.getByText("Create another note")).toBeInTheDocument());
  }, 10_000);
});
