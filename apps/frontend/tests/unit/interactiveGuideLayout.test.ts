import { describe, expect, it } from "vitest";
import { getGuidePanelPosition } from "../../src/components/layout/InteractiveGuide";
import { getFloatingGuidePromptPosition } from "../../src/components/floating-note/FloatingNoteApp";

function overlaps(
  first: { height: number; left: number; top: number; width: number },
  second: { bottom: number; left: number; right: number; top: number },
) {
  return (
    first.left < second.right &&
    first.left + first.width > second.left &&
    first.top < second.bottom &&
    first.top + first.height > second.top
  );
}

describe("interactive guide layout", () => {
  it("places the guide panel in a viewport corner that does not cover the highlighted target", () => {
    const panel = { height: 240, width: 268 };
    const viewport = { height: 720, width: 1_000 };
    const targets = [
      { bottom: 140, height: 44, left: 40, right: 220, top: 96, width: 180 },
      { bottom: 680, height: 44, left: 40, right: 220, top: 636, width: 180 },
      { bottom: 140, height: 44, left: 780, right: 960, top: 96, width: 180 },
      { bottom: 680, height: 44, left: 780, right: 960, top: 636, width: 180 },
    ];

    for (const target of targets) {
      const position = getGuidePanelPosition(target, panel, viewport, "bottom-right");
      expect(overlaps({ ...panel, ...position }, target)).toBe(false);
    }
  });

  it("keeps the compact floating-card prompt clear of the desktop pin icon", () => {
    const prompt = { height: 76, width: 184 };
    const viewport = { height: 220, width: 320 };
    const pinTargets = [
      { bottom: 46, height: 26, left: 270, right: 296, top: 20, width: 26 },
      { bottom: 200, height: 26, left: 270, right: 296, top: 174, width: 26 },
      { bottom: 46, height: 26, left: 24, right: 50, top: 20, width: 26 },
      { bottom: 200, height: 26, left: 24, right: 50, top: 174, width: 26 },
    ];

    for (const pinTarget of pinTargets) {
      const position = getFloatingGuidePromptPosition(pinTarget, prompt, viewport);
      expect(position.left).toBeGreaterThanOrEqual(0);
      expect(position.top).toBeGreaterThanOrEqual(0);
      expect(position.left + prompt.width).toBeLessThanOrEqual(viewport.width);
      expect(position.top + prompt.height).toBeLessThanOrEqual(viewport.height);
      expect(overlaps({ ...prompt, ...position }, pinTarget)).toBe(false);
    }
  });
});
