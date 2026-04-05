import { createEditor, Range, Transforms } from "slate";
import { withHistory } from "slate-history";
import type { Descendant } from "slate";
import { Editable, ReactEditor, Slate, withReact } from "slate-react";
import type { RenderElementProps, RenderLeafProps } from "slate-react";
import { useRef, useState } from "react";
import { isPrimaryShortcut } from "../../lib/isPrimaryShortcut";
import { useI18n } from "../../lib/i18n";
import { readPlainTextFromClipboard, writePlainTextToClipboard } from "../../lib/plainTextClipboard";
import { DEFAULT_NOTE_CONTENT } from "../../lib/models";
import { withColorMark } from "../../lib/slate-plugins/withColorMark";
import { Toolbar } from "./Toolbar";
import {
  clearTextFormatting,
  getActiveTextColor,
  getAllPlainText,
  getSelectedPlainText,
  getTextFormatHotkey,
  insertPlainText,
  isTextFormatActive,
  selectAllText,
  setTextColor,
  toggleTextFormat,
  type TextFormat,
} from "./textFormatting";

type EditorProps = {
  content: Descendant[];
  onChange: (value: Descendant[]) => void;
};

function renderElement(props: RenderElementProps) {
  return <p {...props.attributes}>{props.children}</p>;
}

function renderLeaf(props: RenderLeafProps) {
  let content = props.children;

  if (props.leaf.bold) {
    content = <strong>{content}</strong>;
  }
  if (props.leaf.italic) {
    content = <em>{content}</em>;
  }
  if (props.leaf.underline) {
    content = <u>{content}</u>;
  }

  return (
    <span {...props.attributes} style={{ color: props.leaf.color }}>
      {content}
    </span>
  );
}

export function Editor({ content, onChange }: EditorProps) {
  const { t } = useI18n();
  const [editor] = useState(() => withColorMark(withHistory(withReact(createEditor()))));
  const [formattingState, setFormattingState] = useState<{
    activeColor: string | null;
    activeFormats: Record<TextFormat, boolean>;
  }>({
    activeColor: null,
    activeFormats: {
      bold: false,
      italic: false,
      underline: false,
    },
  });
  const [pendingTextColor, setPendingTextColor] = useState<string | null>(null);
  const [isColorPaletteOpen, setIsColorPaletteOpen] = useState(false);
  const colorSelectionRef = useRef<Range | null>(null);
  const isEmptyEditor = () => getAllPlainText(editor).length === 0;
  const hasExpandedSelection = () => Boolean(getSelectedPlainText(editor));
  const rememberColorSelection = () => {
    colorSelectionRef.current = editor.selection ? (JSON.parse(JSON.stringify(editor.selection)) as Range) : null;
  };
  const restoreColorSelection = () => {
    if (!colorSelectionRef.current) {
      return;
    }

    Transforms.select(editor, colorSelectionRef.current);
  };
  const syncActiveFormats = () => {
    setFormattingState({
      activeColor: getActiveTextColor(editor),
      activeFormats: {
        bold: isTextFormatActive(editor, "bold"),
        italic: isTextFormatActive(editor, "italic"),
        underline: isTextFormatActive(editor, "underline"),
      },
    });
  };
  const syncActiveFormatsWithColor = (color: string | null) => {
    setFormattingState({
      activeColor: color,
      activeFormats: {
        bold: isTextFormatActive(editor, "bold"),
        italic: isTextFormatActive(editor, "italic"),
        underline: isTextFormatActive(editor, "underline"),
      },
    });
  };
  const restoreEditorFocus = () => {
    const focusEditor = () => {
      ReactEditor.focus(editor);
      syncActiveFormats();
    };

    if (typeof window === "undefined") {
      focusEditor();
      return;
    }

    focusEditor();
    window.requestAnimationFrame(focusEditor);
  };
  const handleToggleFormat = (format: TextFormat) => {
    toggleTextFormat(editor, format);
    syncActiveFormats();
    restoreEditorFocus();
  };
  const commitPendingTextColor = () => {
    if (!pendingTextColor) {
      return;
    }

    setTextColor(editor, pendingTextColor);
    setPendingTextColor(null);
    syncActiveFormats();
  };
  const handleApplyColor = (color: string) => {
    ReactEditor.focus(editor);
    restoreColorSelection();

    if (isEmptyEditor() && !hasExpandedSelection()) {
      setPendingTextColor(color);
      setIsColorPaletteOpen(false);
      colorSelectionRef.current = null;
      syncActiveFormatsWithColor(color);
      restoreEditorFocus();
      return;
    }

    setTextColor(editor, color);
    setPendingTextColor(null);
    setIsColorPaletteOpen(false);
    colorSelectionRef.current = null;
    syncActiveFormats();
    restoreEditorFocus();
  };
  const handlePreviewColor = (color: string) => {
    ReactEditor.focus(editor);
    restoreColorSelection();

    if (isEmptyEditor() && !hasExpandedSelection()) {
      setPendingTextColor(color);
      syncActiveFormatsWithColor(color);
      return;
    }

    setTextColor(editor, color);
    setPendingTextColor(null);
    syncActiveFormats();
  };
  const handleClearFormatting = () => {
    clearTextFormatting(editor);
    setPendingTextColor(null);
    setIsColorPaletteOpen(false);
    colorSelectionRef.current = null;
    syncActiveFormats();
    restoreEditorFocus();
  };
  const handleCopy = async (mode: "selection" | "all" | "selection-or-all" = "selection") => {
    const selectedText = getSelectedPlainText(editor);
    const text =
      mode === "all" ? getAllPlainText(editor) : mode === "selection-or-all" ? selectedText || getAllPlainText(editor) : selectedText;

    if (!text) {
      restoreEditorFocus();
      return;
    }

    await writePlainTextToClipboard(text);
    restoreEditorFocus();
  };
  const handlePaste = async () => {
    const text = await readPlainTextFromClipboard();

    if (!text) {
      restoreEditorFocus();
      return;
    }

    insertPlainText(editor, text);
    setIsColorPaletteOpen(false);
    syncActiveFormats();
    restoreEditorFocus();
  };
  const handleChange = (value: Descendant[]) => {
    syncActiveFormats();
    const hasDocumentChange = editor.operations.some((operation) => operation.type !== "set_selection");

    if (!hasDocumentChange) {
      return;
    }

    onChange(value);
  };

  return (
    <Slate editor={editor} initialValue={content.length > 0 ? content : DEFAULT_NOTE_CONTENT} onChange={handleChange}>
      <div className="space-y-2">
        <Toolbar
          activeColor={formattingState.activeColor ?? pendingTextColor}
          activeFormats={formattingState.activeFormats}
          isColorPaletteOpen={isColorPaletteOpen}
          onApplyColor={handleApplyColor}
          onClearFormatting={handleClearFormatting}
          onCloseColorPalette={() => setIsColorPaletteOpen(false)}
          onCopy={() => void handleCopy("all")}
          onPaste={() => void handlePaste()}
          onPreviewColor={handlePreviewColor}
          onToggleColorPalette={() => {
            if (!isColorPaletteOpen) {
              rememberColorSelection();
            }

            setIsColorPaletteOpen((current) => !current);
          }}
          onToggleFormat={handleToggleFormat}
        />
        <Editable
          onDOMBeforeInput={(event) => {
            const inputEvent = event as InputEvent;

            if (
              pendingTextColor &&
              (inputEvent.inputType === "insertCompositionText" ||
                inputEvent.inputType === "insertLineBreak" ||
                inputEvent.inputType === "insertParagraph" ||
                inputEvent.inputType === "insertText")
            ) {
              commitPendingTextColor();
            }
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onCopy={(event) => {
            const text = getSelectedPlainText(editor);

            if (!text) {
              return;
            }

            event.preventDefault();
            event.clipboardData.setData("text/plain", text);
          }}
          onPaste={(event) => {
            event.preventDefault();
            const text = event.clipboardData.getData("text/plain");

            if (!text) {
              return;
            }

            commitPendingTextColor();
            insertPlainText(editor, text);
            setIsColorPaletteOpen(false);
            syncActiveFormats();
          }}
          onKeyDown={(event) => {
            const format = getTextFormatHotkey(event);

            if (format) {
              event.preventDefault();
              handleToggleFormat(format);
              return;
            }

            if (isPrimaryShortcut(event, "a")) {
              event.preventDefault();
              selectAllText(editor);
              syncActiveFormats();
              restoreEditorFocus();
            }
          }}
          className="surface-field wrap-anywhere min-h-[76px] rounded-[20px] px-3 py-3 text-[12.25px] leading-[1.6] outline-none"
          placeholder={t.notes.editorPlaceholder}
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          spellCheck
        />
      </div>
    </Slate>
  );
}
