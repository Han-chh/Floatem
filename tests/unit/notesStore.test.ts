import { describe, expect, it } from "vitest";
import { createNoteCard } from "../../src/lib/models";
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
});
