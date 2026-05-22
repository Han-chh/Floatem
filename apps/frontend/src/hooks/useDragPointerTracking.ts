import { useEffect, useState } from "react";

type DragPointerCoordinates = {
  x: number;
  y: number;
};

export function useDragPointerTracking(active: boolean) {
  const [coordinates, setCoordinates] = useState<DragPointerCoordinates | null>(null);

  useEffect(() => {
    if (!active) {
      setCoordinates(null);
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const nextCoordinates = {
        x: event.clientX,
        y: event.clientY,
      };

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

      setCoordinates(nextCoordinates);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("touchmove", handleTouchMove);
      setCoordinates(null);
    };
  }, [active]);

  return coordinates;
}
