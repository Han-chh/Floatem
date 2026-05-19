import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PanelShell } from "../../src/components/layout/PanelShell";

describe("PanelShell", () => {
  it("opens global QuickNote help from the header", async () => {
    const user = userEvent.setup();

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

    await user.click(screen.getByRole("button", { name: "QuickNote help" }));

    expect(screen.getByRole("dialog", { name: "QuickNote guide" })).toBeInTheDocument();
    expect(screen.getByText("Use Notes for rich cards, colors, groups, and quick editing.")).toBeInTheDocument();
    expect(screen.getByText("Use the global shortcut to summon or hide the panel.")).toBeInTheDocument();
  });
});
