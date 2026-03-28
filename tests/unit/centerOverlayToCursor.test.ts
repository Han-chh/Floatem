import { describe, expect, it } from "vitest";
import { centerOverlayToCursor } from "../../src/lib/dnd/centerOverlayToCursor";

type ModifierArgs = Parameters<typeof centerOverlayToCursor>[0];

function createModifierArgs(
  overrides: Partial<ModifierArgs>,
): ModifierArgs {
  return {
    activatorEvent: null,
    active: null,
    activeNodeRect: null,
    draggingNodeRect: null,
    containerNodeRect: null,
    over: null,
    overlayNodeRect: null,
    scrollableAncestors: [],
    scrollableAncestorRects: [],
    transform: {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
    },
    windowRect: null,
    ...overrides,
  };
}

describe("centerOverlayToCursor", () => {
  it("centers the drag overlay using pointer-like event coordinates", () => {
    const transformed = centerOverlayToCursor(createModifierArgs({
      activatorEvent: { clientX: 50, clientY: 70 } as unknown as Event,
      activeNodeRect: {
        top: 20,
        left: 10,
      } as DOMRect,
      overlayNodeRect: {
        width: 100,
        height: 60,
      } as DOMRect,
      transform: {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
      },
    }));

    expect(transformed).toMatchObject({
      x: -10,
      y: 20,
    });
  });

  it("supports touch-like events without relying on global TouchEvent constructors", () => {
    const transformed = centerOverlayToCursor(createModifierArgs({
      activatorEvent: {
        touches: [{ clientX: 88, clientY: 44 }],
      } as unknown as Event,
      activeNodeRect: {
        top: 14,
        left: 28,
      } as DOMRect,
      overlayNodeRect: {
        width: 80,
        height: 40,
      } as DOMRect,
      transform: {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
      },
    }));

    expect(transformed).toMatchObject({
      x: 20,
      y: 10,
    });
  });

  it("returns the original transform when no usable coordinates are available", () => {
    const transform = {
      x: 12,
      y: 18,
      scaleX: 1,
      scaleY: 1,
    };

    const transformed = centerOverlayToCursor(createModifierArgs({
      activatorEvent: {} as Event,
      activeNodeRect: {
        top: 14,
        left: 28,
      } as DOMRect,
      overlayNodeRect: {
        width: 80,
        height: 40,
      } as DOMRect,
      transform,
    }));

    expect(transformed).toBe(transform);
  });
});
