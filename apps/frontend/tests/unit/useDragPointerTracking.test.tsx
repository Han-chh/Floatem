import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDragPointerTracking } from "../../src/hooks/useDragPointerTracking";

describe("useDragPointerTracking", () => {
  it("keeps the first drag activation coordinates before move listeners mount", () => {
    const { result, rerender } = renderHook(
      ({ active }) => useDragPointerTracking(active),
      { initialProps: { active: false } },
    );

    act(() => {
      result.current.syncCoordinates(new MouseEvent("pointerdown", { clientX: 48, clientY: 72 }));
    });

    expect(result.current.getLatestCoordinates()).toEqual({ x: 48, y: 72 });

    rerender({ active: true });
    expect(result.current.getLatestCoordinates()).toEqual({ x: 48, y: 72 });

    act(() => {
      window.dispatchEvent(new MouseEvent("pointermove", { clientX: 180, clientY: 240 }));
    });

    expect(result.current.coordinates).toEqual({ x: 180, y: 240 });
    expect(result.current.getLatestCoordinates()).toEqual({ x: 180, y: 240 });

    rerender({ active: false });
    expect(result.current.getLatestCoordinates()).toBeNull();
  });
});
