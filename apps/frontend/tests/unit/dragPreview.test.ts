import { describe, expect, it } from "vitest";
import { buildNoteDragPreviewPayload, buildTodoDragPreviewPayload } from "../../src/lib/dragPreview";
import { createNoteCard, createNoteGroup, createTodoGroup, createTodoItem } from "../../src/lib/models";

describe("dragPreview payload builders", () => {
  it("anchors note previews to the card center and preserves rich content", () => {
    const note = createNoteCard({
      id: "note-1",
      title: "Draft",
      content: [
        {
          type: "paragraph",
          children: [{ text: "Hello", bold: true, color: "#2F6BFF" }],
        },
      ],
      updatedAt: 1_234,
    });
    const groups = [createNoteGroup({ id: "group-a", name: "Work", color: "#2F6BFF" })];
    const rect = new DOMRect(100, 80, 240, 120);

    const payload = buildNoteDragPreviewPayload({
      note,
      groups,
      language: "zh-CN",
      rect,
      coordinates: { x: 118, y: 94 },
    });

    expect(payload.kind).toBe("note");
    if (payload.kind !== "note") {
      throw new Error("Expected a note drag preview payload.");
    }

    expect(payload.pointerOffset).toEqual({ x: 120, y: 60 });
    expect(payload.note.content).toEqual(note.content);
    expect(payload.note.previewText).toBe("Hello");
  });

  it("anchors todo previews to the card center", () => {
    const todo = createTodoItem("Follow up", {
      id: "todo-1",
      createdAt: 5_678,
      dateKey: "2026-05-22",
    });
    const groups = [createTodoGroup({ id: "group-b", name: "Inbox", color: "#1FA87A" })];
    const rect = new DOMRect(30, 40, 300, 56);

    const payload = buildTodoDragPreviewPayload({
      todo,
      groups,
      language: "en",
      timeZone: "Asia/Shanghai",
      timeFormat: "24h",
      rect,
      coordinates: { x: 60, y: 52 },
    });

    expect(payload.kind).toBe("todo");
    expect(payload.pointerOffset).toEqual({ x: 150, y: 28 });
  });
});
