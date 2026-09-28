import { createEditor, Editor as SlateEditor, Range, Transforms } from "slate";
import { HistoryEditor, withHistory } from "slate-history";
import type { Descendant } from "slate";
import { Editable, ReactEditor, Slate, withReact } from "slate-react";
import type { RenderElementProps, RenderLeafProps } from "slate-react";
import { useEffect, useRef, useState } from "react";
import { isPrimaryShortcut } from "../../lib/isPrimaryShortcut";
import { useI18n } from "../../lib/i18n";
import { isNativeFloatemHost } from "../../lib/nativeBridge";
import { readRichTextFromClipboard, writeRichTextToClipboard, type RichTextClipboardContent } from "../../lib/plainTextClipboard";
import { cloneNoteContent } from "../../lib/models";
import { withColorMark } from "../../lib/slate-plugins/withColorMark";
import { Toolbar } from "./Toolbar";
import {
  clearTextFormatting,
  deserializeRichTextFromHtml,
  getActiveTextColor,
  getAllPlainText,
  getTextHistoryHotkey,
  getSelectedPlainText,
  getTextFormatHotkey,
  insertRichText,
  isTextFormatActive,
  selectAllText,
  setTextColor,
  plainTextToRichText,
  serializeRichTextToHtml,
  toggleTextFormat,
  type TextFormat,
} from "./textFormatting";

type EditorProps = {
  content: Descendant[];
  onChange: (value: Descendant[]) => void;
  instantToolbar?: boolean;
  attachedToolbar?: boolean;
  noteId?: string;
};

type ReadOnlyNoteContentProps = {
  content: Descendant[];
  className?: string;
  placeholder?: string;
};

const NOTE_EDITOR_INPUT_CLASS =
  "note-editor-input surface-field wrap-anywhere min-h-[76px] rounded-[20px] px-3 py-3 text-[12.25px] leading-[1.6] outline-none";

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

export function Editor({ content, onChange, instantToolbar = false, attachedToolbar = false, noteId }: EditorProps) {
  const { t } = useI18n();
  const [editor] = useState(() => withColorMark(withHistory(withReact(createEditor()))));
  const [initialValue] = useState(() => cloneNoteContent(content));
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [toolbarState, setToolbarState] = useState<{
    activeColor: string | null;
    activeFormats: Record<TextFormat, boolean>;
    canRedo: boolean;
    canUndo: boolean;
  }>({
    activeColor: null,
    activeFormats: {
      bold: false,
      italic: false,
      underline: false,
    },
    canRedo: false,
    canUndo: false,
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
  const readToolbarState = (activeColorOverride?: string | null) => ({
    activeColor: activeColorOverride === undefined ? getActiveTextColor(editor) : activeColorOverride,
    activeFormats: {
      bold: isTextFormatActive(editor, "bold"),
      italic: isTextFormatActive(editor, "italic"),
      underline: isTextFormatActive(editor, "underline"),
    },
    canRedo: editor.history.redos.length > 0,
    canUndo: editor.history.undos.length > 0,
  });
  const syncToolbarState = (activeColorOverride?: string | null) => {
    setToolbarState({
      ...readToolbarState(activeColorOverride),
    });
  };
  const restoreEditorFocus = () => {
    const focusEditor = () => {
      ReactEditor.focus(editor);
      syncToolbarState();
    };

    if (typeof window === "undefined") {
      focusEditor();
      return;
    }

    focusEditor();
    window.requestAnimationFrame(focusEditor);
  };
  const getCopyText = (mode: "selection" | "all" | "selection-or-all" = "selection") => {
    const selectedText = getSelectedPlainText(editor);

    return mode === "all" ? getAllPlainText(editor) : mode === "selection-or-all" ? selectedText || getAllPlainText(editor) : selectedText;
  };
  const getCopyContent = (mode: "selection" | "all" | "selection-or-all" = "selection") => {
    const text = getCopyText(mode);
    const shouldCopyAll = mode === "all" || (mode === "selection-or-all" && !getSelectedPlainText(editor));
    const richText = shouldCopyAll || !editor.selection ? editor.children : SlateEditor.fragment(editor, editor.selection);

    return {
      html: serializeRichTextToHtml(richText),
      text,
    };
  };
  const handleToggleFormat = (format: TextFormat) => {
    toggleTextFormat(editor, format);
    syncToolbarState();
    restoreEditorFocus();
  };
  const commitPendingTextColor = () => {
    if (!pendingTextColor) {
      return;
    }

    setTextColor(editor, pendingTextColor);
    setPendingTextColor(null);
    syncToolbarState();
  };
  const handleApplyColor = (color: string) => {
    ReactEditor.focus(editor);
    restoreColorSelection();

    if (isEmptyEditor() && !hasExpandedSelection()) {
      setPendingTextColor(color);
      setIsColorPaletteOpen(false);
      colorSelectionRef.current = null;
      syncToolbarState(color);
      restoreEditorFocus();
      return;
    }

    setTextColor(editor, color);
    setPendingTextColor(null);
    setIsColorPaletteOpen(false);
    colorSelectionRef.current = null;
    syncToolbarState();
    restoreEditorFocus();
  };
  const handlePreviewColor = (color: string) => {
    ReactEditor.focus(editor);
    restoreColorSelection();

    if (isEmptyEditor() && !hasExpandedSelection()) {
      setPendingTextColor(color);
      syncToolbarState(color);
      return;
    }

    setTextColor(editor, color);
    setPendingTextColor(null);
    syncToolbarState();
  };
  const handleClearFormatting = () => {
    clearTextFormatting(editor);
    setPendingTextColor(null);
    setIsColorPaletteOpen(false);
    colorSelectionRef.current = null;
    syncToolbarState();
    restoreEditorFocus();
  };
  const handleCopy = async (mode: "selection" | "all" | "selection-or-all" = "selection") => {
    const contentToCopy = getCopyContent(mode);

    if (!contentToCopy.text) {
      restoreEditorFocus();
      return;
    }

    await writeRichTextToClipboard(contentToCopy);
    restoreEditorFocus();
  };
  const handlePaste = async () => {
    const clipboardContent = await readRichTextFromClipboard();

    insertPastedContent(clipboardContent);
  };
  const insertPastedContent = ({ html, text }: RichTextClipboardContent) => {
    const richText = html ? deserializeRichTextFromHtml(html) : [];
    const contentToInsert = richText.length > 0 ? richText : text ? plainTextToRichText(text) : [];

    if (contentToInsert.length === 0) {
      restoreEditorFocus();
      return;
    }

    insertRichText(editor, contentToInsert);
    setIsColorPaletteOpen(false);
    syncToolbarState();
    restoreEditorFocus();
  };
  const handleUndo = () => {
    if (editor.history.undos.length === 0) {
      restoreEditorFocus();
      return;
    }

    HistoryEditor.undo(editor);
    syncToolbarState();
    restoreEditorFocus();
  };
  const handleRedo = () => {
    if (editor.history.redos.length === 0) {
      restoreEditorFocus();
      return;
    }

    HistoryEditor.redo(editor);
    syncToolbarState();
    restoreEditorFocus();
  };
  const handleChange = (value: Descendant[]) => {
    syncToolbarState();
    const hasDocumentChange = editor.operations.some((operation) => operation.type !== "set_selection");

    if (!hasDocumentChange) {
      return;
    }

    onChange(value);
  };

  useEffect(() => {
    return () => {
      if (typeof window === "undefined") {
        return;
      }

      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement && rootRef.current?.contains(activeElement)) {
        activeElement.blur();
      }

      const selection = window.getSelection();
      if (selection?.rangeCount) {
        const anchorNode = selection.anchorNode;
        if (anchorNode && rootRef.current?.contains(anchorNode)) {
          selection.removeAllRanges();
        }
      }
    };
  }, []);

  return (
    <Slate editor={editor} initialValue={initialValue} onChange={handleChange}>
      <div ref={rootRef} className={attachedToolbar ? "note-editor-shell-attached" : "space-y-2"}>
        <Toolbar
          activeColor={toolbarState.activeColor ?? pendingTextColor}
          activeFormats={toolbarState.activeFormats}
          canRedo={toolbarState.canRedo}
          canUndo={toolbarState.canUndo}
          attached={attachedToolbar}
          instant={instantToolbar}
          isColorPaletteOpen={isColorPaletteOpen}
          onApplyColor={handleApplyColor}
          onClearFormatting={handleClearFormatting}
          onCloseColorPalette={() => setIsColorPaletteOpen(false)}
          onCopy={() => void handleCopy("selection-or-all")}
          onPaste={() => void handlePaste()}
          onPreviewColor={handlePreviewColor}
          onRedo={handleRedo}
          onToggleColorPalette={() => {
            if (!isColorPaletteOpen) {
              rememberColorSelection();
            }

            setIsColorPaletteOpen((current) => !current);
          }}
          onToggleFormat={handleToggleFormat}
          onUndo={handleUndo}
          noteId={noteId}
        />
        <Editable
          data-action="note-rich-editor"
          onDOMBeforeInput={(event) => {
            const inputEvent = event as InputEvent;

            if (inputEvent.inputType === "historyUndo") {
              event.preventDefault();
              handleUndo();
              return;
            }

            if (inputEvent.inputType === "historyRedo") {
              event.preventDefault();
              handleRedo();
              return;
            }

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
            const contentToCopy = getCopyContent("selection-or-all");

            if (!contentToCopy.text) {
              return;
            }

            event.preventDefault();
            if (isNativeFloatemHost()) {
              void handleCopy("selection-or-all");
              return;
            }

            event.clipboardData.setData("text/plain", contentToCopy.text);
            event.clipboardData.setData("text/html", contentToCopy.html);
          }}
          onPaste={(event) => {
            event.preventDefault();
            const html = event.clipboardData.getData("text/html");
            const text = event.clipboardData.getData("text/plain");

            if (html || text) {
              insertPastedContent({ html, text });
              return;
            }

            if (isNativeFloatemHost()) {
              void handlePaste();
            }
          }}
          onKeyDown={(event) => {
            const historyAction = getTextHistoryHotkey(event);

            if (historyAction) {
              event.preventDefault();

              if (historyAction === "undo") {
                handleUndo();
                return;
              }

              handleRedo();
              return;
            }

            const format = getTextFormatHotkey(event);

            if (format) {
              event.preventDefault();
              handleToggleFormat(format);
              return;
            }

            if (isPrimaryShortcut(event, "a")) {
              event.preventDefault();
              selectAllText(editor);
              syncToolbarState();
              restoreEditorFocus();
              return;
            }

            if (isPrimaryShortcut(event, "c")) {
              event.preventDefault();
              void handleCopy("selection-or-all");
              return;
            }

            if (isPrimaryShortcut(event, "v")) {
              event.preventDefault();
              void handlePaste();
            }
          }}
          className={`${NOTE_EDITOR_INPUT_CLASS} ${attachedToolbar ? "note-editor-input-attached" : ""}`}
          placeholder={t.notes.editorPlaceholder}
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          spellCheck
        />
      </div>
    </Slate>
  );
}

export function ReadOnlyNoteContent({ content, className, placeholder }: ReadOnlyNoteContentProps) {
  const [editor] = useState(() => withReact(createEditor()));
  const [initialValue] = useState(() => cloneNoteContent(content));

  return (
    <Slate editor={editor} initialValue={initialValue}>
      <Editable
        readOnly
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        className={className}
        placeholder={placeholder}
      />
    </Slate>
  );
}

export function ReadOnlyEditorPreview({ content }: { content: Descendant[] }) {
  const { t } = useI18n();

  return (
    <div className="note-editor-shell-attached">
      <Toolbar
        activeColor={null}
        activeFormats={{
          bold: false,
          italic: false,
          underline: false,
        }}
        canRedo={false}
        canUndo={false}
        attached
        instant
        isColorPaletteOpen={false}
        onApplyColor={() => {}}
        onClearFormatting={() => {}}
        onCloseColorPalette={() => {}}
        onCopy={() => {}}
        onPaste={() => {}}
        onPreviewColor={() => {}}
        onRedo={() => {}}
        onToggleColorPalette={() => {}}
        onToggleFormat={() => {}}
        onUndo={() => {}}
        visualOnly
      />
      <ReadOnlyNoteContent
        content={content}
        className={`${NOTE_EDITOR_INPUT_CLASS} note-editor-input-attached`}
        placeholder={t.notes.editorPlaceholder}
      />
    </div>
  );
}
