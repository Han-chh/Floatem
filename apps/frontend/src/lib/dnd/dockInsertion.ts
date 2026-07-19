export type DockInsertionRect = {
  id: string;
  top: number;
  bottom: number;
};

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
