import { render, screen } from "@testing-library/react";
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
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Image" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete note" }));
    expect(screen.queryByPlaceholderText("Untitled note")).not.toBeInTheDocument();
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
});
