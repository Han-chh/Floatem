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

    const toggleButton = screen.getByRole("button", { name: "Mark todo as done" });
    await user.click(toggleButton);
    expect(toggleButton).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Delete todo" }));
    expect(screen.queryByText("Ship docs")).not.toBeInTheDocument();
  });
});
