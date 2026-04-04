import { createEditor } from "slate";
import { withHistory } from "slate-history";
import type { Descendant } from "slate";
import { Editable, Slate, withReact } from "slate-react";
import type { RenderElementProps, RenderLeafProps } from "slate-react";
import { useState } from "react";
import { DEFAULT_NOTE_CONTENT } from "../../lib/models";
import { withColorMark } from "../../lib/slate-plugins/withColorMark";

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
  const [editor] = useState(() => withColorMark(withHistory(withReact(createEditor()))));
  const handleChange = (value: Descendant[]) => {
    const hasDocumentChange = editor.operations.some((operation) => operation.type !== "set_selection");

    if (!hasDocumentChange) {
      return;
    }

    onChange(value);
  };

  return (
    <Slate editor={editor} initialValue={content.length > 0 ? content : DEFAULT_NOTE_CONTENT} onChange={handleChange}>
      <Editable
        onPointerDown={(event) => event.stopPropagation()}
        className="surface-field wrap-anywhere min-h-[184px] rounded-[20px] px-3 py-3 text-[12.25px] leading-[1.6] outline-none"
        placeholder="Capture the note while it is fresh..."
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        spellCheck
      />
    </Slate>
  );
}
