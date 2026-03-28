import { createEditor } from "slate";
import { withHistory } from "slate-history";
import type { Descendant } from "slate";
import { Editable, Slate, withReact } from "slate-react";
import type { RenderElementProps, RenderLeafProps } from "slate-react";
import { useState } from "react";
import { DEFAULT_NOTE_CONTENT } from "../../lib/models";
import { withColorMark } from "../../lib/slate-plugins/withColorMark";
import { withImages } from "../../lib/slate-plugins/withImages";

type EditorProps = {
  content: Descendant[];
  onChange: (value: Descendant[]) => void;
};

function renderElement(props: RenderElementProps) {
  if (props.element.type === "image") {
    return (
      <div {...props.attributes}>
        <img src={props.element.url} alt="" className="my-2 max-h-40 rounded-[10px] border border-[var(--border)] object-cover" />
        {props.children}
      </div>
    );
  }

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
  const [editor] = useState(() =>
    withColorMark(withImages(withHistory(withReact(createEditor())))),
  );

  return (
    <Slate editor={editor} initialValue={content.length > 0 ? content : DEFAULT_NOTE_CONTENT} onChange={onChange}>
      <Editable
        onPointerDown={(event) => event.stopPropagation()}
        className="surface-field wrap-anywhere min-h-[260px] rounded-[24px] px-4 py-5 text-[13.5px] leading-[1.7] outline-none"
        placeholder="Capture the note while it is fresh..."
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        spellCheck
      />
    </Slate>
  );
}
