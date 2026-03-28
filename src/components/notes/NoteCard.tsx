import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { NOTE_DOT_COLORS, type NoteCard as NoteCardModel } from "../../lib/models";
import { useNotesStore } from "../../store/notesStore";
import { Editor } from "./Editor";
import { Toolbar } from "./Toolbar";

type NoteCardProps = {
  note: NoteCardModel;
};

export function NoteCard({ note }: NoteCardProps) {
  const removeCard = useNotesStore((state) => state.removeCard);
  const toggleCollapsed = useNotesStore((state) => state.toggleCollapsed);
  const updateCardTitle = useNotesStore((state) => state.updateCardTitle);
  const updateCardContent = useNotesStore((state) => state.updateCardContent);
  const updateDotColor = useNotesStore((state) => state.updateDotColor);
  const [showPalette, setShowPalette] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
  });

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`rounded-[14px] border border-[var(--border)] bg-[var(--cream)] shadow-[0_10px_20px_rgba(106,84,61,0.06)] ${isDragging ? "opacity-80" : ""}`}
    >
      <div className="rounded-t-[14px] border-b border-[var(--border)] bg-[var(--sand)] px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              className="h-4 w-4 rounded-full border border-[var(--border)]"
              style={{ backgroundColor: note.dotColor }}
              aria-label="Change note color"
              onClick={() => setShowPalette((current) => !current)}
            />
            {showPalette ? (
              <div className="absolute left-0 top-6 z-10 grid w-[120px] grid-cols-3 gap-1 rounded-[10px] border border-[var(--border)] bg-[var(--cream)] p-2 shadow-[0_12px_24px_rgba(112,89,64,0.15)]">
                {NOTE_DOT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="h-6 w-6 rounded-full border border-[var(--border)]"
                    style={{ backgroundColor: color }}
                    aria-label={`Use ${color} for note`}
                    onClick={() => {
                      updateDotColor(note.id, color);
                      setShowPalette(false);
                    }}
                  />
                ))}
              </div>
            ) : null}
          </div>
          <input
            id={`note-title-${note.id}`}
            value={note.title}
            onChange={(event) => updateCardTitle(note.id, event.currentTarget.value)}
            placeholder="Untitled note"
            className="min-w-0 flex-1 bg-transparent text-[12px] font-medium text-[var(--dark-text)] outline-none placeholder:text-[var(--muted)]"
          />
          <button
            type="button"
            className="rounded-[8px] border border-[var(--border)] bg-[var(--cream)] px-2 py-1 text-[11px] text-[var(--dark-text)]"
            aria-label="Drag note"
            {...attributes}
            {...listeners}
          >
            Drag
          </button>
          <button
            type="button"
            className="rounded-[8px] border border-[var(--border)] bg-[var(--cream)] px-2 py-1 text-[11px] text-[var(--dark-text)]"
            aria-label="Collapse note"
            onClick={() => toggleCollapsed(note.id)}
          >
            {note.collapsed ? "Expand" : "Fold"}
          </button>
          <button
            type="button"
            className="rounded-[8px] border border-[var(--border)] bg-[var(--cream)] px-2 py-1 text-[11px] text-[var(--orange-dot)]"
            aria-label="Delete note"
            onClick={() => removeCard(note.id)}
          >
            Delete
          </button>
        </div>
      </div>

      {note.collapsed ? null : (
        <div className="space-y-2 p-3">
          <Toolbar />
          <Editor content={note.content} onChange={(value) => updateCardContent(note.id, value)} />
        </div>
      )}
    </article>
  );
}
