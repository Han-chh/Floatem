import { createEditor, Editor, Transforms, type Editor as SlateEditor } from "slate";
import { describe, expect, it } from "vitest";
import { DEFAULT_NOTE_CONTENT } from "../../src/lib/models";
import {
  clearTextFormatting,
  deserializeRichTextFromHtml,
  getActiveTextColor,
  getTextFormatHotkey,
  insertPlainText,
  insertRichText,
  isTextFormatActive,
  selectAllText,
  serializeRichTextToHtml,
  setTextColor,
  toggleTextFormat,
} from "../../src/components/notes/textFormatting";

function createSlateEditor() {
  const editor = createEditor() as SlateEditor;
  editor.children = structuredClone(DEFAULT_NOTE_CONTENT);
  Transforms.select(editor, { path: [0, 0], offset: 0 });
  return editor;
}

describe("textFormatting", () => {
  it("toggles bold, italic, and underline marks for subsequent typing", () => {
    const editor = createSlateEditor();

    toggleTextFormat(editor, "bold");
    expect(isTextFormatActive(editor, "bold")).toBe(true);
    Editor.insertText(editor, "B");

    toggleTextFormat(editor, "bold");
    expect(isTextFormatActive(editor, "bold")).toBe(false);
    toggleTextFormat(editor, "italic");
    expect(isTextFormatActive(editor, "italic")).toBe(true);
    Editor.insertText(editor, "I");

    toggleTextFormat(editor, "italic");
    expect(isTextFormatActive(editor, "italic")).toBe(false);
    toggleTextFormat(editor, "underline");
    expect(isTextFormatActive(editor, "underline")).toBe(true);
    Editor.insertText(editor, "U");

    expect(editor.children).toEqual([
      {
        type: "paragraph",
        children: [
          { text: "B", bold: true },
          { text: "I", italic: true },
          { text: "U", underline: true },
        ],
      },
    ]);
  });

  it("maps Cmd hotkeys to supported text formats", () => {
    expect(
      getTextFormatHotkey({
        altKey: false,
        ctrlKey: false,
        key: "b",
        metaKey: true,
        shiftKey: false,
      }),
    ).toBe("bold");
    expect(
      getTextFormatHotkey({
        altKey: false,
        ctrlKey: false,
        key: "I",
        metaKey: true,
        shiftKey: false,
      }),
    ).toBe("italic");
    expect(
      getTextFormatHotkey({
        altKey: false,
        ctrlKey: true,
        key: "u",
        metaKey: false,
        shiftKey: false,
      }),
    ).toBe("underline");
    expect(
      getTextFormatHotkey({
        altKey: false,
        ctrlKey: false,
        key: "p",
        metaKey: true,
        shiftKey: false,
      }),
    ).toBeNull();
  });

  it("applies color, clears formatting, and selects the full note", () => {
    const editor = createSlateEditor();

    toggleTextFormat(editor, "bold");
    setTextColor(editor, "#2F6BFF");
    expect(getActiveTextColor(editor)).toBe("#2F6BFF");
    insertPlainText(editor, "Hello");
    clearTextFormatting(editor);
    expect(isTextFormatActive(editor, "bold")).toBe(false);
    expect(getActiveTextColor(editor)).toBeNull();
    insertPlainText(editor, " world");

    selectAllText(editor);
    expect(editor.selection).toEqual({
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 1], offset: 6 },
    });
    expect(editor.children).toEqual([
      {
        type: "paragraph",
        children: [
          { text: "Hello", bold: true, color: "#2F6BFF" },
          { text: " world" },
        ],
      },
    ]);
  });

  it("serializes supported formatting to safe clipboard HTML", () => {
    expect(
      serializeRichTextToHtml([
        {
          type: "paragraph",
          children: [
            { text: "Bold", bold: true },
            { text: " italic", italic: true },
            { text: " underline", underline: true },
            { text: " blue", color: "#2F6BFF" },
            { text: " <safe>" },
          ],
        },
      ]),
    ).toBe(
      '<p><strong>Bold</strong><em> italic</em><u> underline</u><span style="color: #2F6BFF"> blue</span> &lt;safe&gt;</p>',
    );
  });

  it("parses supported clipboard HTML into Slate marks", () => {
    expect(
      deserializeRichTextFromHtml(
        '<p><strong>Bold</strong><em> italic</em><u> underline</u><span style="color: #2f6bff"> blue</span></p><p>Next</p>',
      ),
    ).toEqual([
      {
        type: "paragraph",
        children: [
          { text: "Bold", bold: true },
          { text: " italic", italic: true },
          { text: " underline", underline: true },
          { text: " blue", color: "#2F6BFF" },
        ],
      },
      {
        type: "paragraph",
        children: [{ text: "Next" }],
      },
    ]);
  });

  it("inserts clipboard formatting without inheriting the active toolbar mark", () => {
    const editor = createSlateEditor();

    toggleTextFormat(editor, "bold");
    insertRichText(editor, deserializeRichTextFromHtml('<p>Plain <em>source italic</em></p>'));

    expect(editor.children).toEqual([
      {
        type: "paragraph",
        children: [
          { text: "Plain " },
          { text: "source italic", italic: true },
        ],
      },
    ]);
  });
});
