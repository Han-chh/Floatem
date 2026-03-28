import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { NotesList } from "../../src/components/notes/NotesList";

describe("NotesList", () => {
  it("adds and deletes a note card", async () => {
    const user = userEvent.setup();
    render(<NotesList />);

    await user.click(screen.getByRole("button", { name: "Add note" }));
    expect(screen.getByPlaceholderText("Untitled note")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete note" }));
    expect(screen.queryByPlaceholderText("Untitled note")).not.toBeInTheDocument();
  });
});
