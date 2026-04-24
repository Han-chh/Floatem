import type { Editor } from "slate";

export function withColorMark<T extends Editor>(editor: T): T {
  return editor;
}
