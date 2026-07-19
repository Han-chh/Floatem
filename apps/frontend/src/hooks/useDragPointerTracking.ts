import { useCallback, useEffect, useRef, useState } from "react";
import { readEventCoordinates } from "../lib/dnd/centerOverlayToCursor";

type DragPointerCoordinates = {
  x: number;
  y: number;
};

export function useDragPointerTracking(active: boolean) {
  const [coordinates, setCoordinates] = useState<DragPointerCoordinates | null>(null);
  const coordinatesRef = useRef<DragPointerCoordinates | null>(null);

  const updateCoordinates = useCallback((nextCoordinates: DragPointerCoordinates | null) => {
    coordinatesRef.current = nextCoordinates;
    setCoordinates(nextCoordinates);
  }, []);

  const syncCoordinates = useCallback((event: Event | null) => {
    const nextCoordinates = readEventCoordinates(event);
    if (nextCoordinates) {
      updateCoordinates(nextCoordinates);
    }
    return nextCoordinates;
  }, [updateCoordinates]);

  const getLatestCoordinates = useCallback(() => coordinatesRef.current, []);

  useEffect(() => {
    if (!active) {
      updateCoordinates(null);
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const nextCoordinates = {
        x: event.clientX,
        y: event.clientY,
      };

      updateCoordinates(nextCoordinates);
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

      updateCoordinates(nextCoordinates);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [active, updateCoordinates]);

  return {
    coordinates,
    getLatestCoordinates,
    syncCoordinates,
  };
}
