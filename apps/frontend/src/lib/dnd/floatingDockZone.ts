import type { DockZoneEventDetail } from "../nativeBridge";

type FloatingDockZoneState = {
  noteIds: readonly string[];
  todoIds: readonly string[];
};

export function isFloatingDockZoneTarget(
  detail: DockZoneEventDetail,
  { noteIds, todoIds }: FloatingDockZoneState,
) {
  if (detail.kind === "note") {
    return noteIds.includes(detail.id);
  }

  if (detail.kind === "todo") {
    return todoIds.includes(detail.id);
  }

  return false;
}

export function isSameDockZoneTarget(left: DockZoneEventDetail | null, right: DockZoneEventDetail) {
  return left?.kind === right.kind && left.id === right.id;
}
