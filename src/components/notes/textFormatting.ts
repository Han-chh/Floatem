import { Editor as SlateEditor, Range, Transforms, type Editor as SlateEditorType } from "slate";
import { isPrimaryShortcut } from "../../lib/isPrimaryShortcut";

export type TextFormat = "bold" | "italic" | "underline";

export const TEXT_FORMAT_SHORTCUTS: Record<TextFormat, string> = {
  bold: "Cmd+B",
  italic: "Cmd+I",
  underline: "Cmd+U",
};

export const TEXT_COLOR_PRESETS = [
  "#1E1915",
  "#FF7A59",
  "#D9485B",
  "#F4B942",
  "#1FA87A",
  "#2F6BFF",
  "#7B5CFA",
  "#8752C8",
  "#3F9CA8",
  "#A24A2D",
] as const;

export const TEXT_COLOR_MORE_PRESETS = [
  "#1E1915",
  "#404040",
  "#6F6F6F",
  "#9B9B9B",
  "#BFBFBF",
  "#D8D8D8",
  "#ECECEC",
  "#FFFFFF",
  "#7F3121",
  "#A23E2A",
  "#C83A2A",
  "#D9485B",
  "#E66D46",
  "#F08C2E",
  "#F4B942",
  "#D9C654",
  "#6A452B",
  "#8A5B3B",
  "#B55A1F",
  "#CC7A2B",
  "#E7A53F",
  "#F0C05D",
  "#D3B146",
  "#8BBF3D",
  "#4E6B2D",
  "#5D8735",
  "#6AAE3B",
  "#8FD14F",
  "#A9DA69",
  "#7ECF8F",
  "#3BAA67",
  "#1FA87A",
  "#17684C",
  "#1F7D68",
  "#23998A",
  "#33B8AA",
  "#52C7BC",
  "#71D4D9",
  "#3F9CA8",
  "#1C8FA3",
  "#2D6E8F",
  "#1F487C",
  "#2F6BFF",
  "#4D82FF",
  "#6A9BFF",
  "#7CB7FF",
  "#5B6DFF",
  "#3D4BC7",
  "#5740C8",
  "#7B5CFA",
  "#8752C8",
  "#A04FD6",
  "#B05CCB",
  "#C878D7",
  "#E68CC6",
  "#F06C9B",
  "#7A2E63",
  "#8F446D",
  "#A24A2D",
  "#C77852",
  "#D9A07C",
  "#BFC7D5",
  "#90A0B6",
  "#6B4C9A",
  "#4D6F7A",
] as const;

function ensureSelection(editor: SlateEditorType) {
  if (!editor.selection) {
    Transforms.select(editor, SlateEditor.end(editor, []));
  }
}

export function isTextFormatActive(editor: SlateEditorType, format: TextFormat) {
  const marks = SlateEditor.marks(editor);
  return Boolean(marks?.[format]);
}

export function toggleTextFormat(editor: SlateEditorType, format: TextFormat) {
  ensureSelection(editor);

  if (isTextFormatActive(editor, format)) {
    SlateEditor.removeMark(editor, format);
    return;
  }

  SlateEditor.addMark(editor, format, true);
}

export function getActiveTextColor(editor: SlateEditorType) {
  const color = SlateEditor.marks(editor)?.color;
  return typeof color === "string" && color ? color : null;
}

export function setTextColor(editor: SlateEditorType, color: string) {
  ensureSelection(editor);
  SlateEditor.addMark(editor, "color", color);
}

export function clearTextFormatting(editor: SlateEditorType) {
  ensureSelection(editor);
  SlateEditor.removeMark(editor, "bold");
  SlateEditor.removeMark(editor, "italic");
  SlateEditor.removeMark(editor, "underline");
  SlateEditor.removeMark(editor, "color");
}

export function selectAllText(editor: SlateEditorType) {
  Transforms.select(editor, SlateEditor.range(editor, []));
}

export function getSelectedPlainText(editor: SlateEditorType) {
  if (!editor.selection || Range.isCollapsed(editor.selection)) {
    return "";
  }

  return SlateEditor.string(editor, editor.selection);
}

export function getAllPlainText(editor: SlateEditorType) {
  return SlateEditor.string(editor, []);
}

export function insertPlainText(editor: SlateEditorType, text: string) {
  if (!text) {
    return;
  }

  ensureSelection(editor);

  if (typeof DataTransfer !== "undefined") {
    const data = new DataTransfer();
    data.setData("text/plain", text);
    editor.insertData(data);
    return;
  }

  SlateEditor.insertText(editor, text);
}

export function getTextFormatHotkey(event: {
  altKey: boolean;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  shiftKey: boolean;
}) {
  if (isPrimaryShortcut(event, "b")) {
    return "bold";
  }

  if (isPrimaryShortcut(event, "i")) {
    return "italic";
  }

  if (isPrimaryShortcut(event, "u")) {
    return "underline";
  }

  return null;
}
