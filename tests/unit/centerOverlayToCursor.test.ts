import { afterEach, describe, expect, it } from "vitest";
import {
  centerOverlayToCursor,
  clearLatestDragPointerCoordinates,
  setLatestDragPointerCoordinates,
} from "../../src/lib/dnd/centerOverlayToCursor";

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
  afterEach(() => {
    clearLatestDragPointerCoordinates();
  });

  it("centers the drag overlay using pointer-like event coordinates", () => {
    const transformed = centerOverlayToCursor(createModifierArgs({
      activatorEvent: { clientX: 50, clientY: 70 } as unknown as Event,
      activeNodeRect: {
        top: 20,
        left: 10,
      } as DOMRect,
      overlayNodeRect: {
        top: 20,
        left: 10,
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
        top: 14,
        left: 28,
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

  it("subtracts the drag container offset when the overlay is positioned inside a nested shell", () => {
    const transformed = centerOverlayToCursor(createModifierArgs({
      activatorEvent: { clientX: 210, clientY: 240 } as unknown as Event,
      activeNodeRect: {
        top: 220,
        left: 180,
      } as DOMRect,
      containerNodeRect: {
        top: 210,
        left: 160,
      } as DOMRect,
      overlayNodeRect: {
        width: 80,
        height: 40,
      } as DOMRect,
      transform: {
        x: 30,
        y: 50,
        scaleX: 1,
        scaleY: 1,
      },
    }));

    expect(transformed).toMatchObject({
      x: -140,
      y: -160,
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
        top: 14,
        left: 28,
        width: 80,
        height: 40,
      } as DOMRect,
      transform,
    }));

    expect(transformed).toBe(transform);
  });

  it("prefers the latest tracked drag pointer coordinates when available", () => {
    setLatestDragPointerCoordinates({ x: 180, y: 160 });

    const transformed = centerOverlayToCursor(createModifierArgs({
      activatorEvent: { clientX: 50, clientY: 70 } as unknown as Event,
      activeNodeRect: {
        top: 40,
        left: 80,
      } as DOMRect,
      containerNodeRect: {
        top: 10,
        left: 20,
      } as DOMRect,
      overlayNodeRect: {
        width: 100,
        height: 60,
      } as DOMRect,
      transform: {
        x: 999,
        y: 999,
        scaleX: 1,
        scaleY: 1,
      },
    }));

    expect(transformed).toMatchObject({
      x: 30,
      y: 80,
    });
  });
});
