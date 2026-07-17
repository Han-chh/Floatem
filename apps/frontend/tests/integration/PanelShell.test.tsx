import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PanelShell } from "../../src/components/layout/PanelShell";

describe("PanelShell", () => {
  it("opens global StickIt help from the header", async () => {
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

    await user.click(screen.getByRole("button", { name: "StickIt help" }));

    const dialog = screen.getByRole("dialog", { name: "StickIt guide" });

    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Notes/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Notes" }));

    expect(screen.getByRole("dialog", { name: "Write and organize note cards" })).toBeInTheDocument();
    expect(screen.getByText("Cards")).toBeInTheDocument();
  });
});
