import { describe, expect, it } from "vitest";
import { isFloatingDockZoneTarget, isSameDockZoneTarget } from "../../src/lib/dnd/floatingDockZone";

describe("floating dock zone guards", () => {
  it("only treats note dock-zone events as active when the note is floating", () => {
    expect(
      isFloatingDockZoneTarget(
        { kind: "note", id: "note-floating" },
        { noteIds: ["note-floating"], todoIds: [] },
      ),
    ).toBe(true);

    expect(
      isFloatingDockZoneTarget(
        { kind: "note", id: "note-docked" },
        { noteIds: ["other-note"], todoIds: [] },
      ),
    ).toBe(false);
  });

  it("only treats todo dock-zone events as active when the todo is floating", () => {
    expect(
      isFloatingDockZoneTarget(
        { kind: "todo", id: "todo-floating" },
        { noteIds: [], todoIds: ["todo-floating"] },
      ),
    ).toBe(true);

    expect(
      isFloatingDockZoneTarget(
        { kind: "todo", id: "todo-docked" },
        { noteIds: [], todoIds: ["other-todo"] },
      ),
    ).toBe(false);
  });

  it("does not allow unknown dock-zone event kinds", () => {
    expect(
      isFloatingDockZoneTarget(
        { kind: "task", id: "todo-floating" },
        { noteIds: ["task"], todoIds: ["todo-floating"] },
      ),
    ).toBe(false);
  });

  it("matches leave events to the active dock-zone target", () => {
    expect(isSameDockZoneTarget({ kind: "note", id: "a" }, { kind: "note", id: "a" })).toBe(true);
    expect(isSameDockZoneTarget({ kind: "note", id: "a" }, { kind: "todo", id: "a" })).toBe(false);
    expect(isSameDockZoneTarget(null, { kind: "note", id: "a" })).toBe(false);
  });
});
