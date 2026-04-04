import { useEffect, useState } from "react";
import {
  clearLatestDragPointerCoordinates,
  setLatestDragPointerCoordinates,
} from "../lib/dnd/centerOverlayToCursor";

type DragPointerCoordinates = {
  x: number;
  y: number;
};

export function useDragPointerTracking(active: boolean) {
  const [coordinates, setCoordinates] = useState<DragPointerCoordinates | null>(null);

  useEffect(() => {
    if (!active) {
      clearLatestDragPointerCoordinates();
      setCoordinates(null);
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const nextCoordinates = {
        x: event.clientX,
        y: event.clientY,
      };

      setLatestDragPointerCoordinates(nextCoordinates);
      setCoordinates(nextCoordinates);
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0] ?? event.changedTouches[0];
      if (!touch) {
        return;
      }

      const nextCoordinates = {
        x: touch.clientX,
        y: touch.clientY,
      };

      setLatestDragPointerCoordinates(nextCoordinates);
      setCoordinates(nextCoordinates);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("touchmove", handleTouchMove);
      clearLatestDragPointerCoordinates();
      setCoordinates(null);
    };
  }, [active]);

  return coordinates;
}
