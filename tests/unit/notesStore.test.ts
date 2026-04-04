import { describe, expect, it, vi } from "vitest";
import { createNoteCard, DEFAULT_NOTE_CONTENT } from "../../src/lib/models";
import { useNotesStore } from "../../src/store/notesStore";

describe("notesStore", () => {
  it("adds and removes cards", () => {
    const created = useNotesStore.getState().addCard();
    expect(useNotesStore.getState().cards).toHaveLength(1);

    useNotesStore.getState().removeCard(created.id);
    expect(useNotesStore.getState().cards).toHaveLength(0);
  });

  it("updates note content and order", () => {
    const first = createNoteCard({ id: "note-a", title: "A" });
    const second = createNoteCard({ id: "note-b", title: "B" });

    useNotesStore.getState().initialize([first, second]);
    useNotesStore.getState().updateCardTitle("note-a", "Updated");
    useNotesStore.getState().moveCard("note-b", "note-a");

    expect(useNotesStore.getState().cards[0]?.id).toBe("note-b");
    expect(useNotesStore.getState().cards[1]?.title).toBe("Updated");
  });

  it("only refreshes edited time for real text changes", () => {
    const note = createNoteCard({
      id: "note-a",
      title: "Draft",
      content: DEFAULT_NOTE_CONTENT,
      createdAt: 1_000,
      updatedAt: 2_000,
    });

    useNotesStore.getState().initialize([note]);
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(9_000);

    useNotesStore.getState().toggleCollapsed("note-a");
    useNotesStore.getState().updateDotColor("note-a", "#2F6BFF");
    useNotesStore.getState().updateCardTitle("note-a", "Draft");
    useNotesStore.getState().updateCardContent("note-a", DEFAULT_NOTE_CONTENT);

    expect(useNotesStore.getState().cards[0]?.updatedAt).toBe(2_000);

    useNotesStore.getState().updateCardTitle("note-a", "Draft v2");
    expect(useNotesStore.getState().cards[0]?.updatedAt).toBe(9_000);

    useNotesStore.getState().initialize([
      createNoteCard({
        id: "note-b",
        title: "Body",
        content: DEFAULT_NOTE_CONTENT,
        createdAt: 1_000,
        updatedAt: 2_000,
      }),
    ]);

    useNotesStore.getState().updateCardContent("note-b", [
      {
        type: "paragraph",
        children: [{ text: "Changed body" }],
      },
    ]);

    expect(useNotesStore.getState().cards[0]?.updatedAt).toBe(9_000);
    nowSpy.mockRestore();
  });
});
