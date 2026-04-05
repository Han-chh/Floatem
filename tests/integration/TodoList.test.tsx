import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
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
});
