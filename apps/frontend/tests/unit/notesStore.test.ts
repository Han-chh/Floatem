import { describe, expect, it, vi } from "vitest";
import {
  createNoteCard,
  createNoteGroup,
  DEFAULT_NOTE_CONTENT,
  DEFAULT_UNGROUPED_NOTE_COLOR,
  resolveNoteAccentColor,
} from "../../src/lib/models";
import { useNotesStore } from "../../src/store/notesStore";

describe("notesStore", () => {
  it("uses the fixed neutral accent for ungrouped notes", () => {
    const legacyColoredNote = createNoteCard({ dotColor: "#2F6BFF", groupId: null });

    expect(resolveNoteAccentColor(legacyColoredNote, [])).toBe(DEFAULT_UNGROUPED_NOTE_COLOR);
  });

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

  it("inserts a returning floating note at an exact list position", () => {
    useNotesStore.getState().initialize([
      createNoteCard({ id: "note-a", title: "A" }),
      createNoteCard({ id: "note-b", title: "B" }),
      createNoteCard({ id: "note-c", title: "C" }),
    ]);

    useNotesStore.getState().moveCardToIndex("note-c", 1);

    expect(useNotesStore.getState().cards.map((card) => card.id)).toEqual(["note-a", "note-c", "note-b"]);
  });

  it("uses visible notes as insertion anchors when a group filter hides cards", () => {
    useNotesStore.getState().initialize([
      createNoteCard({ id: "note-visible-a", title: "Visible A" }),
      createNoteCard({ id: "note-hidden", title: "Hidden" }),
      createNoteCard({ id: "note-returning", title: "Returning" }),
      createNoteCard({ id: "note-visible-b", title: "Visible B" }),
    ]);

    useNotesStore
      .getState()
      .moveCardToIndex("note-returning", 1, ["note-visible-a", "note-visible-b"]);

    expect(useNotesStore.getState().cards.map((card) => card.id)).toEqual([
      "note-visible-a",
      "note-returning",
      "note-hidden",
      "note-visible-b",
    ]);
  });

  it("creates, assigns, updates, and deletes groups", () => {
    const card = createNoteCard({ id: "note-a", title: "A" });
    const group = createNoteGroup({
      id: "group-work",
      name: "Work",
      color: "#2F6BFF",
    });

    useNotesStore.getState().initialize({
      cards: [card],
      groups: [group],
    });

    const travel = useNotesStore.getState().createGroup({
      color: "#1FA87A",
      name: "Travel",
    });

    expect(travel).not.toBeNull();
    if (!travel) {
      throw new Error("Expected group creation to succeed.");
    }

    expect(useNotesStore.getState().groups).toHaveLength(2);
    expect(travel.id).toBe("Travel");

    expect(
      useNotesStore.getState().createGroup({
        color: "#7B5CFA",
        name: "travel",
      }),
    ).toBeNull();

    useNotesStore.getState().assignGroupToCard("note-a", travel.id);
    expect(useNotesStore.getState().cards[0]?.groupId).toBe(travel.id);
    expect(useNotesStore.getState().cards[0]?.dotColor).toBe("#1FA87A");

    expect(
      useNotesStore.getState().updateGroup(travel.id, {
        color: "#F4B942",
        name: "Trips",
      }),
    ).toBe(true);
    expect(useNotesStore.getState().groups.find((item) => item.id === "Trips")?.name).toBe("Trips");
    expect(useNotesStore.getState().cards[0]?.groupId).toBe("Trips");
    expect(useNotesStore.getState().cards[0]?.dotColor).toBe("#F4B942");

    expect(
      useNotesStore.getState().updateGroup("Trips", {
        color: "#2F6BFF",
        name: "Work",
      }),
    ).toBe(false);

    useNotesStore.getState().deleteGroup("Trips");
    expect(useNotesStore.getState().groups).toHaveLength(1);
    expect(useNotesStore.getState().cards[0]?.groupId).toBeNull();
    expect(useNotesStore.getState().cards[0]?.dotColor).toBe(DEFAULT_UNGROUPED_NOTE_COLOR);
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
    useNotesStore.getState().assignGroupToCard("note-a", null);
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
