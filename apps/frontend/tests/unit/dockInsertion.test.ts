import { describe, expect, it } from "vitest";
import { resolveDockInsertionIndex } from "../../src/lib/dnd/dockInsertion";

describe("dock insertion position", () => {
  const items = [
    { id: "first", top: 100, bottom: 180 },
    { id: "second", top: 192, bottom: 272 },
  ];

  it("places a returning card before the first visible card", () => {
    expect(resolveDockInsertionIndex(110, items)).toBe(0);
  });

  it("places a returning card between two visible cards", () => {
    expect(resolveDockInsertionIndex(185, items)).toBe(1);
  });

  it("places a returning card after the final visible card", () => {
    expect(resolveDockInsertionIndex(280, items)).toBe(2);
  });
});
