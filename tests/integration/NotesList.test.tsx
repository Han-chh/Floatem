import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createNoteCard, DEFAULT_NOTE_CONTENT } from "../../src/lib/models";
import { NotesList } from "../../src/components/notes/NotesList";
import { useNotesStore } from "../../src/store/notesStore";

describe("NotesList", () => {
  it("adds and deletes a note card", async () => {
    const user = userEvent.setup();
    render(<NotesList />);

    await user.click(screen.getByRole("button", { name: "Add note" }));
    expect(screen.getByPlaceholderText("Untitled note")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Paste" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear format" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Image" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete note" }));
    expect(screen.queryByPlaceholderText("Untitled note")).not.toBeInTheDocument();
  });

  it("creates groups, assigns notes, and filters the list", async () => {
    const user = userEvent.setup();
    render(<NotesList />);

    await user.click(screen.getByRole("button", { name: "Add note" }));

    const note = screen.getByTestId("note-card");
    expect(within(note).getByText("No group")).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Group name" }), "Work");
    await user.click(screen.getByRole("button", { name: "Create group" }));

    expect(screen.getByRole("checkbox", { name: "Toggle Work filter" })).toBeChecked();

    await user.click(within(note).getByRole("button", { name: "Change note group" }));
    await user.click(screen.getByRole("button", { name: "Work" }));
    expect(within(note).getByText("Work")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Toggle Work filter" }));
    expect(screen.getByText("No notes match the selected groups.")).toBeInTheDocument();
  });

  it("does not refresh edited time when the editor only gains focus", async () => {
    const now = new Date("2026-04-02T12:00:00.000Z").valueOf();
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now);
    useNotesStore.getState().initialize([
      createNoteCard({
        id: "note-focus",
        title: "Keep timestamp",
        content: DEFAULT_NOTE_CONTENT,
        createdAt: now - 7_200_000,
        updatedAt: now - 3_600_000,
      }),
    ]);

    const user = userEvent.setup();
    render(<NotesList />);
    expect(screen.getByText("1h ago")).toBeInTheDocument();

    const [, editor] = screen.getAllByRole("textbox");
    await user.click(editor);

    expect(screen.getByText("1h ago")).toBeInTheDocument();
    nowSpy.mockRestore();
  });

  it("shows formatting shortcuts in the toolbar tooltips", async () => {
    useNotesStore.getState().initialize([
      createNoteCard({
        id: "note-format-toolbar",
        title: "Formatting",
        content: DEFAULT_NOTE_CONTENT,
      }),
    ]);

    const user = userEvent.setup();
    render(<NotesList />);

    const boldButton = screen.getByRole("button", { name: "Bold" });
    const italicButton = screen.getByRole("button", { name: "Italic" });
    const underlineButton = screen.getByRole("button", { name: "Underline" });

    expect(boldButton).toHaveAttribute("aria-pressed", "false");
    expect(italicButton).toHaveAttribute("aria-pressed", "false");
    expect(underlineButton).toHaveAttribute("aria-pressed", "false");

    await user.click(boldButton);
    expect(boldButton).toHaveAttribute("aria-pressed", "true");
    await user.click(boldButton);
    expect(boldButton).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Cmd+B")).toBeInTheDocument();
    expect(screen.getByText("Cmd+I")).toBeInTheDocument();
    expect(screen.getByText("Cmd+U")).toBeInTheDocument();
    expect(screen.getByText("Cmd+C")).toBeInTheDocument();
    expect(screen.getByText("Cmd+V")).toBeInTheDocument();
  });

  it("renders the text color palette in a floating layer", async () => {
    useNotesStore.getState().initialize([
      createNoteCard({
        id: "note-color-toolbar",
        title: "Color",
        content: DEFAULT_NOTE_CONTENT,
      }),
    ]);

    const user = userEvent.setup();
    render(<NotesList />);

    await user.click(screen.getByRole("button", { name: "Color" }));
    expect(screen.getByTestId("note-text-color-palette")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More Colors" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "More Colors" }));
    expect(screen.getByRole("button", { name: "Show Colors" })).toBeInTheDocument();
  });
});
