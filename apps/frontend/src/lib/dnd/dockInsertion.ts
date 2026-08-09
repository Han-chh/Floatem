export type DockInsertionRect = {
  id: string;
  top: number;
  bottom: number;
};

type ViewportRect = Pick<ClientRect, "top" | "right" | "bottom" | "left">;

/**
 * Returns true only after the dragged card no longer overlaps the app viewport.
 * A card that merely crosses an edge is still an in-panel drag, so it can keep
 * participating in list reordering until its full body has left the window.
 */
export function isCardFullyOutsideViewport(
  rect: ViewportRect | null,
  viewport?: Pick<ClientRect, "width" | "height">,
) {
  const bounds = viewport ??
    (typeof window === "undefined" ? null : { width: window.innerWidth, height: window.innerHeight });

  if (!rect || !bounds) {
    return false;
  }

  return (
    rect.right <= 0 ||
    rect.left >= bounds.width ||
    rect.bottom <= 0 ||
    rect.top >= bounds.height
  );
}

export function resolveDockInsertionIndex(clientY: number, items: readonly DockInsertionRect[]) {
  const index = items.findIndex((item) => clientY < item.top + (item.bottom - item.top) / 2);
  return index < 0 ? items.length : index;
}

export function readDockInsertionIndex({
  clientX,
  clientY,
  container,
  itemSelector,
  excludedID,
}: {
  clientX: number;
  clientY: number;
  container: HTMLElement | null;
  itemSelector: string;
  excludedID?: string | null;
}) {
  if (!container) {
    return null;
  }

  const containerRect = container.getBoundingClientRect();
  if (
    clientX < containerRect.left ||
    clientX > containerRect.right ||
    clientY < containerRect.top ||
    clientY > containerRect.bottom
  ) {
    return null;
  }

  const items = Array.from(container.querySelectorAll<HTMLElement>(itemSelector))
    .filter((item) => item.dataset.dockEntityId !== excludedID)
    .map((item) => {
      const rect = item.getBoundingClientRect();
      return { id: item.dataset.dockEntityId ?? "", top: rect.top, bottom: rect.bottom };
    })
    .filter((item) => item.id);

  return resolveDockInsertionIndex(clientY, items);
}
