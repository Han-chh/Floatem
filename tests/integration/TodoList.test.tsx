import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TodoList } from "../../src/components/todos/TodoList";

describe("TodoList", () => {
  it("adds, completes, and deletes a todo with Cmd+Enter submission", async () => {
    const user = userEvent.setup();
    render(<TodoList />);

    const input = screen.getByLabelText("Quick add");

    await user.type(input, "Ship docs");
    await user.keyboard("{Enter}");
    expect(screen.queryByRole("button", { name: "Mark todo as done" })).not.toBeInTheDocument();

    await user.keyboard("{Meta>}{Enter}{/Meta}");
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
