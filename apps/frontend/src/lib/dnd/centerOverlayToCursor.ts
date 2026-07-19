import type { Modifier } from "@dnd-kit/core";

export function readEventCoordinates(event: Event | null) {
  if (!event) {
    return null;
  }

  const touchEvent = event as Event & {
    touches?: ArrayLike<{ clientX: number; clientY: number }>;
    changedTouches?: ArrayLike<{ clientX: number; clientY: number }>;
  };

  if (touchEvent.touches?.length) {
    const touch = touchEvent.touches[0];
    if (touch) {
      return { x: touch.clientX, y: touch.clientY };
    }
  }

  if (touchEvent.changedTouches?.length) {
    const touch = touchEvent.changedTouches[0];
    if (touch) {
      return { x: touch.clientX, y: touch.clientY };
    }
  }

  const pointerLikeEvent = event as Event & { clientX?: number; clientY?: number };

  if (typeof pointerLikeEvent.clientX === "number" && typeof pointerLikeEvent.clientY === "number") {
    return { x: pointerLikeEvent.clientX, y: pointerLikeEvent.clientY };
  }

  return null;
}

export const centerOverlayToCursor: Modifier = ({
  activatorEvent,
  activeNodeRect,
  overlayNodeRect,
  transform,
}) => {
  if (!activeNodeRect || !overlayNodeRect) {
    return transform;
  }

  const coordinates = readEventCoordinates(activatorEvent);

  if (!coordinates) {
    return transform;
  }

  const offsetX = coordinates.x - activeNodeRect.left;
  const offsetY = coordinates.y - activeNodeRect.top;

  return {
    ...transform,
    x: transform.x + offsetX - overlayNodeRect.width / 2,
    y: transform.y + offsetY - overlayNodeRect.height / 2,
  };
};
