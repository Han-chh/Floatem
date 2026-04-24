type ResolveDragReorderTargetOptions = {
  activeId: string;
  eventOverId: string | null;
  previewOverId: string | null;
};

export function resolveDragReorderTarget({
  activeId,
  eventOverId,
  previewOverId,
}: ResolveDragReorderTargetOptions) {
  if (eventOverId && eventOverId !== activeId) {
    return eventOverId;
  }

  if (previewOverId && previewOverId !== activeId) {
    return previewOverId;
  }

  return null;
}
