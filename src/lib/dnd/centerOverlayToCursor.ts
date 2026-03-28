import type { Modifier } from "@dnd-kit/core";

function getEventCoordinates(event: Event | null) {
  if (!event) {
    return null;
  }

  if (event instanceof TouchEvent && event.touches.length > 0) {
    const touch = event.touches[0];
    return { x: touch.clientX, y: touch.clientY };
  }

  if (event instanceof TouchEvent && event.changedTouches.length > 0) {
    const touch = event.changedTouches[0];
    return { x: touch.clientX, y: touch.clientY };
  }

  if (event instanceof MouseEvent || event instanceof PointerEvent) {
    return { x: event.clientX, y: event.clientY };
  }

  return null;
}

export const centerOverlayToCursor: Modifier = ({
  activatorEvent,
  activeNodeRect,
  overlayNodeRect,
  transform,
}) => {
  const coordinates = getEventCoordinates(activatorEvent);

  if (!coordinates || !activeNodeRect || !overlayNodeRect) {
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
