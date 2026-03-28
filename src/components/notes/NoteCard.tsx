import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { useState } from "react";
import { NOTE_DOT_COLORS, type NoteCard as NoteCardModel } from "../../lib/models";
import { useNotesStore } from "../../store/notesStore";
import { Editor } from "./Editor";
import { Toolbar } from "./Toolbar";

type NoteCardProps = {
  note: NoteCardModel;
  onDelete: (id: string, target: DOMRect) => void;
};

export function NoteCard({ note, onDelete }: NoteCardProps) {
  const toggleCollapsed = useNotesStore((state) => state.toggleCollapsed);
  const updateCardTitle = useNotesStore((state) => state.updateCardTitle);
  const updateCardContent = useNotesStore((state) => state.updateCardContent);
  const updateDotColor = useNotesStore((state) => state.updateDotColor);
  const [showPalette, setShowPalette] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
  });

  return (
    <motion.article
      ref={setNodeRef}
      layout
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -18, scale: 0.92 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`paper-card relative overflow-hidden rounded-[24px] ${isDragging ? "opacity-85" : ""}`}
    >
      <div
        className="absolute inset-x-6 top-0 h-1.5 rounded-b-full opacity-90"
        style={{
          background: `linear-gradient(90deg, ${note.dotColor}, rgba(255,255,255,0.88), ${note.dotColor})`,
        }}
      />

      <div className="rounded-t-[24px] border-b border-[rgba(200,183,159,0.75)] bg-[linear-gradient(180deg,rgba(236,224,207,0.92),rgba(248,242,232,0.72))] px-4 py-3">
        <div className="mb-3 flex items-start gap-2">
          <div className="relative mt-0.5 shrink-0">
            <motion.button
              type="button"
              className="h-5 w-5 rounded-full border border-[var(--border)] shadow-[0_6px_12px_rgba(108,82,58,0.12)]"
              style={{ backgroundColor: note.dotColor }}
              aria-label="Change note color"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setShowPalette((current) => !current)}
            />
            {showPalette ? (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                className="paper-card absolute left-0 top-8 z-10 grid w-[132px] grid-cols-3 gap-1.5 rounded-[18px] p-2"
              >
                {NOTE_DOT_COLORS.map((color) => (
                  <motion.button
                    key={color}
                    type="button"
                    className="h-7 w-7 rounded-full border border-[var(--border)]"
                    style={{ backgroundColor: color }}
                    aria-label={`Use ${color} for note`}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      updateDotColor(note.id, color);
                      setShowPalette(false);
                    }}
                  />
                ))}
              </motion.div>
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: note.dotColor, backgroundColor: `${note.dotColor}1a` }}
              >
                Rich card
              </span>
              <span className="rounded-full bg-[rgba(255,255,255,0.55)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                draggable
              </span>
            </div>
            <input
              id={`note-title-${note.id}`}
              value={note.title}
              onChange={(event) => updateCardTitle(note.id, event.currentTarget.value)}
              placeholder="Untitled note"
              className="min-w-0 w-full bg-transparent text-[14px] font-semibold tracking-[-0.01em] text-[var(--dark-text)] outline-none placeholder:text-[var(--muted)]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <motion.button
            type="button"
            className="paper-button rounded-[14px] px-3 py-1.5 text-[11px] font-semibold text-[var(--brown-strong)]"
            aria-label="Drag note"
            whileHover={{ y: -2, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            {...attributes}
            {...listeners}
          >
            Drag
          </motion.button>
          <motion.button
            type="button"
            className="paper-button rounded-[14px] px-3 py-1.5 text-[11px] font-semibold text-[var(--brown-strong)]"
            aria-label="Collapse note"
            whileHover={{ y: -2, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => toggleCollapsed(note.id)}
          >
            {note.collapsed ? "Expand" : "Fold"}
          </motion.button>
          <motion.button
            type="button"
            className="paper-button shrink-0 rounded-[14px] px-3 py-1.5 text-[11px] font-semibold text-[var(--orange-dot)]"
            aria-label="Delete note"
            whileHover={{ y: -2, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={(event) => onDelete(note.id, event.currentTarget.getBoundingClientRect())}
          >
            Delete
          </motion.button>
        </div>
      </div>

      {note.collapsed ? null : (
        <div className="space-y-3 p-4">
          <Toolbar />
          <Editor content={note.content} onChange={(value) => updateCardContent(note.id, value)} />
        </div>
      )}
    </motion.article>
  );
}
