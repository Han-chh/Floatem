import { describe, expect, it } from "vitest";
import { resolveDragReorderTarget } from "../../src/lib/dnd/resolveDragReorderTarget";

describe("resolveDragReorderTarget", () => {
  it("uses the dnd-kit drop target when it points to another item", () => {
    expect(
      resolveDragReorderTarget({
        activeId: "note-a",
        eventOverId: "note-b",
        previewOverId: "note-c",
      }),
    ).toBe("note-b");
  });

  it("falls back to the preview target when dnd-kit has no drop target", () => {
    expect(
      resolveDragReorderTarget({
        activeId: "note-a",
        eventOverId: null,
        previewOverId: "note-b",
      }),
    ).toBe("note-b");
  });

  it("falls back to the preview target when dnd-kit resolves back to the active item", () => {
    expect(
      resolveDragReorderTarget({
        activeId: "note-a",
        eventOverId: "note-a",
        previewOverId: "note-b",
      }),
    ).toBe("note-b");
  });

  it("returns null when neither target points to another item", () => {
    expect(
      resolveDragReorderTarget({
        activeId: "note-a",
        eventOverId: "note-a",
        previewOverId: null,
      }),
    ).toBeNull();
  });
});
