import { Editor as SlateEditor, Element as SlateElement, Range, Text, Transforms, type Descendant, type Editor as SlateEditorType } from "slate";
import { isPrimaryShortcut } from "../../lib/isPrimaryShortcut";

export type TextFormat = "bold" | "italic" | "underline";
export type TextHistoryAction = "undo" | "redo";

export const TEXT_FORMAT_SHORTCUTS: Record<TextFormat, string> = {
  bold: "Cmd+B",
  italic: "Cmd+I",
  underline: "Cmd+U",
};

export const TEXT_HISTORY_SHORTCUTS: Record<TextHistoryAction, string> = {
  undo: "Cmd+Z",
  redo: "Cmd+Shift+Z",
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

function escapeHtml(value: string) {
  return value.replace(/[&<>\"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '\"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

type FormattedText = Text & {
  bold?: boolean;
  color?: string;
  italic?: boolean;
  underline?: boolean;
};

function serializeTextLeaf(leaf: FormattedText) {
  let html = escapeHtml(leaf.text).replace(/\n/g, "<br>");

  if (typeof leaf.color === "string" && /^#[0-9a-f]{6}$/i.test(leaf.color)) {
    html = `<span style="color: ${leaf.color}">${html}</span>`;
  }
  if (leaf.underline) {
    html = `<u>${html}</u>`;
  }
  if (leaf.italic) {
    html = `<em>${html}</em>`;
  }
  if (leaf.bold) {
    html = `<strong>${html}</strong>`;
  }

  return html;
}

function serializeRichTextNode(node: Descendant): string {
  if (Text.isText(node)) {
    return serializeTextLeaf(node as FormattedText);
  }

  if (SlateElement.isElement(node)) {
    const children = node.children.map((child) => serializeRichTextNode(child)).join("");
    return `<p>${children || "<br>"}</p>`;
  }

  return "";
}

export function serializeRichTextToHtml(content: Descendant[]) {
  return content.map((node) => serializeRichTextNode(node)).join("");
}

type RichTextMarks = Pick<FormattedText, "bold" | "color" | "italic" | "underline">;

function normalizeClipboardColor(value: string | null) {
  const hex = value?.trim().match(/^#([0-9a-f]{6})$/i);

  if (hex) {
    return `#${hex[1]!.toUpperCase()}`;
  }

  const rgb = value?.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);

  if (!rgb) {
    return undefined;
  }

  const channels = rgb.slice(1).map(Number);
  return channels.every((channel) => Number.isInteger(channel) && channel >= 0 && channel <= 255)
    ? `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("").toUpperCase()}`
    : undefined;
}

function marksForHtmlElement(element: HTMLElement, inherited: RichTextMarks): RichTextMarks {
  const tagName = element.tagName.toLowerCase();
  const fontWeight = element.style.fontWeight;
  const textDecoration = `${element.style.textDecoration} ${element.style.textDecorationLine}`;
  const color = normalizeClipboardColor(element.style.color || element.getAttribute("color"));
  const marks: RichTextMarks = {};

  if (inherited.bold || tagName === "b" || tagName === "strong" || fontWeight === "bold" || Number(fontWeight) >= 600) {
    marks.bold = true;
  }
  if (color ?? inherited.color) {
    marks.color = color ?? inherited.color;
  }
  if (inherited.italic || tagName === "i" || tagName === "em" || element.style.fontStyle === "italic") {
    marks.italic = true;
  }
  if (inherited.underline || tagName === "u" || textDecoration.includes("underline")) {
    marks.underline = true;
  }

  return marks;
}

function sameMarks(left: RichTextMarks, right: RichTextMarks) {
  return (
    Boolean(left.bold) === Boolean(right.bold) &&
    left.color === right.color &&
    Boolean(left.italic) === Boolean(right.italic) &&
    Boolean(left.underline) === Boolean(right.underline)
  );
}

export function deserializeRichTextFromHtml(html: string): Descendant[] {
  if (!html || typeof DOMParser === "undefined") {
    return [];
  }

  const document = new DOMParser().parseFromString(html, "text/html");
  const paragraphs: Descendant[] = [];
  let children: FormattedText[] = [];
  const appendText = (text: string, marks: RichTextMarks) => {
    if (!text) {
      return;
    }

    const previous = children.at(-1);

    if (previous && sameMarks(previous, marks)) {
      previous.text += text;
      return;
    }

    children.push({ text, ...marks });
  };
  const finishParagraph = () => {
    if (children.length > 0) {
      paragraphs.push({ type: "paragraph", children });
      children = [];
    }
  };
  const walk = (node: Node, marks: RichTextMarks) => {
    if (node.nodeType === Node.TEXT_NODE) {
      appendText(node.textContent ?? "", marks);
      return;
    }

    if (!(node instanceof HTMLElement)) {
      node.childNodes.forEach((child) => walk(child, marks));
      return;
    }

    const tagName = node.tagName.toLowerCase();

    if (tagName === "br") {
      appendText("\n", marks);
      return;
    }

    const isBlock = ["address", "article", "blockquote", "div", "h1", "h2", "h3", "h4", "h5", "h6", "li", "p", "pre"].includes(tagName);

    if (isBlock) {
      finishParagraph();
    }

    const elementMarks = marksForHtmlElement(node, marks);
    node.childNodes.forEach((child) => walk(child, elementMarks));

    if (isBlock) {
      finishParagraph();
    }
  };

  document.body.childNodes.forEach((node) => walk(node, {}));
  finishParagraph();
  return paragraphs;
}

export function plainTextToRichText(text: string): Descendant[] {
  return text.split(/\r?\n/).map((line) => ({ type: "paragraph", children: [{ text: line }] }));
}

export function insertRichText(editor: SlateEditorType, content: Descendant[]) {
  if (content.length === 0) {
    return;
  }

  SlateEditor.insertFragment(editor, content);
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

export function getTextHistoryHotkey(event: {
  altKey: boolean;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  shiftKey: boolean;
}) {
  if (isPrimaryShortcut(event, "z")) {
    return "undo";
  }

  if ((event.metaKey || event.ctrlKey) && !event.altKey && event.shiftKey && event.key.toLowerCase() === "z") {
    return "redo";
  }

  return null;
}
