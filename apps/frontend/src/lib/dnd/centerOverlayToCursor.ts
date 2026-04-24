import type { Modifier } from "@dnd-kit/core";

type DragPointerCoordinates = {
  x: number;
  y: number;
};

let latestDragPointerCoordinates: DragPointerCoordinates | null = null;

function getEventCoordinates(event: Event | null) {
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

export function setLatestDragPointerCoordinates(coordinates: DragPointerCoordinates | null) {
  latestDragPointerCoordinates = coordinates;
}

export function syncLatestDragPointerCoordinates(event: Event | null) {
  const coordinates = getEventCoordinates(event);

  if (coordinates) {
    latestDragPointerCoordinates = coordinates;
  }

  return coordinates;
}

export function clearLatestDragPointerCoordinates() {
  latestDragPointerCoordinates = null;
}

export const centerOverlayToCursor: Modifier = ({
  activatorEvent,
  activeNodeRect,
  containerNodeRect,
  overlayNodeRect,
  transform,
}) => {
  if (!activeNodeRect || !overlayNodeRect) {
    return transform;
  }

  const liveCoordinates = latestDragPointerCoordinates;
  if (liveCoordinates) {
    const containerOffsetX = containerNodeRect?.left ?? 0;
    const containerOffsetY = containerNodeRect?.top ?? 0;

    return {
      ...transform,
      x: liveCoordinates.x - activeNodeRect.left - overlayNodeRect.width / 2 - containerOffsetX,
      y: liveCoordinates.y - activeNodeRect.top - overlayNodeRect.height / 2 - containerOffsetY,
    };
  }

  const coordinates = getEventCoordinates(activatorEvent);

  if (!coordinates) {
    return transform;
  }

  const offsetX = coordinates.x - activeNodeRect.left;
  const offsetY = coordinates.y - activeNodeRect.top;
  const containerOffsetX = containerNodeRect?.left ?? 0;
  const containerOffsetY = containerNodeRect?.top ?? 0;

  return {
    ...transform,
    x: transform.x + offsetX - overlayNodeRect.width / 2 - containerOffsetX,
    y: transform.y + offsetY - overlayNodeRect.height / 2 - containerOffsetY,
  };
};
