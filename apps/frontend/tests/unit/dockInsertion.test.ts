import { describe, expect, it } from "vitest";
import { isCardFullyOutsideViewport, resolveDockInsertionIndex } from "../../src/lib/dnd/dockInsertion";

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

  it("only treats a card as outside once its full body has left the window", () => {
    const viewport = { width: 400, height: 300 };

    expect(isCardFullyOutsideViewport({ left: 360, right: 440, top: 20, bottom: 100 }, viewport)).toBe(false);
    expect(isCardFullyOutsideViewport({ left: 400, right: 480, top: 20, bottom: 100 }, viewport)).toBe(true);
    expect(isCardFullyOutsideViewport({ left: -80, right: 0, top: 20, bottom: 100 }, viewport)).toBe(true);
    expect(isCardFullyOutsideViewport({ left: 20, right: 100, top: 300, bottom: 380 }, viewport)).toBe(true);
    expect(isCardFullyOutsideViewport({ left: 20, right: 100, top: -80, bottom: 0 }, viewport)).toBe(true);
  });
});
