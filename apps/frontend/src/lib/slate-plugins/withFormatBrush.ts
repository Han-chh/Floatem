import type { Editor } from "slate";

export function withFormatBrush<T extends Editor>(editor: T): T {
  return editor;
}
