import type { Editor } from "slate";

export function withImages<T extends Editor>(editor: T): T {
  return editor;
}
