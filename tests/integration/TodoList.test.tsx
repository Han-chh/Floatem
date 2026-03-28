import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TodoList } from "../../src/components/todos/TodoList";

describe("TodoList", () => {
  it("adds, completes, and deletes a todo", async () => {
    const user = userEvent.setup();
    render(<TodoList />);

    await user.type(screen.getByLabelText("Quick add"), "Ship docs{enter}");
    expect(screen.getByText("Ship docs")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mark todo as done" }));
    expect(
      screen
        .getAllByRole("button", { name: "Mark todo as done" })
        .some((button) => button.getAttribute("aria-pressed") === "true"),
    ).toBe(true);

    const deleteButtons = screen.getAllByRole("button", { name: "Delete todo" });
    await user.click(deleteButtons[deleteButtons.length - 1]!);
    expect(screen.queryByText("Ship docs")).not.toBeInTheDocument();
  });
});
