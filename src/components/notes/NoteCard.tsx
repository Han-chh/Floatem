import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { NOTE_DOT_COLORS, type NoteCard as NoteCardModel } from "../../lib/models";
import { syncTextareaHeight } from "../../lib/resizeTextarea";
import { useNotesStore } from "../../store/notesStore";
import { ChevronsUpDownIcon, PaletteIcon, Trash2Icon } from "../icons/AppIcons";
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
  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
  });

  useEffect(() => {
    if (titleRef.current) {
      syncTextareaHeight(titleRef.current);
    }
  }, [note.id, note.title]);

  const editedLabel = `Edited ${formatDistanceToNow(note.updatedAt, { addSuffix: true })}`;

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
      {...attributes}
      {...listeners}
      aria-label="Reorder note"
      data-testid="note-card"
      className={`paper-card cq-card relative overflow-hidden rounded-[28px] border border-[rgba(213,198,180,0.92)] bg-[linear-gradient(180deg,rgba(255,252,248,0.98),rgba(255,247,239,0.95))] shadow-[0_18px_36px_rgba(61,49,34,0.10)] ${isDragging ? "z-20 opacity-92 shadow-[0_28px_56px_rgba(61,49,34,0.18)]" : ""} cursor-grab active:cursor-grabbing`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            "radial-gradient(rgba(30,25,21,0.038) 0.8px, transparent 0.8px), radial-gradient(rgba(255,255,255,0.24) 0.6px, transparent 0.6px)",
          backgroundPosition: "0 0, 14px 14px",
          backgroundSize: "18px 18px, 28px 28px",
          maskImage: "linear-gradient(180deg, black, rgba(0,0,0,0.3))",
        }}
      />
      <div
        className="pointer-events-none absolute -right-8 top-6 h-28 w-28 rounded-full blur-3xl"
        style={{ backgroundColor: `${note.dotColor}1a` }}
      />
      <div
        className="absolute inset-x-6 top-0 h-1.5 rounded-b-full opacity-90"
        style={{
          background: `linear-gradient(90deg, ${note.dotColor}, rgba(255,255,255,0.88), ${note.dotColor})`,
        }}
      />

      <div className="rounded-t-[28px] px-4 py-4">
        <div className="note-card-header-grid">
          <div className="note-card-title-row">
            <div className="relative mt-0.5 shrink-0">
              <motion.button
                type="button"
                className="paper-button inline-flex h-10 w-10 items-center justify-center rounded-[14px]"
                aria-label="Change note color"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => setShowPalette((current) => !current)}
              >
                <span
                  className="inline-flex h-4 w-4 rounded-full border border-white/70 shadow-[0_4px_10px_rgba(0,0,0,0.08)]"
                  style={{ backgroundColor: note.dotColor }}
                />
                <span className="sr-only">Change note color</span>
              </motion.button>
              {showPalette ? (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  className="paper-card absolute left-0 top-12 z-10 grid w-[min(220px,calc(100vw-64px))] grid-cols-3 gap-1.5 rounded-[18px] p-2"
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
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => {
                        updateDotColor(note.id, color);
                        setShowPalette(false);
                      }}
                    />
                  ))}
                </motion.div>
              ) : null}
            </div>

            <div className="note-card-title-block">
              <textarea
                ref={titleRef}
                id={`note-title-${note.id}`}
                aria-label="Note title"
                rows={1}
                value={note.title}
                onChange={(event) => {
                  syncTextareaHeight(event.currentTarget);
                  updateCardTitle(note.id, event.currentTarget.value);
                }}
                onInput={(event) => syncTextareaHeight(event.currentTarget)}
                onPointerDown={(event) => event.stopPropagation()}
                placeholder="Untitled note"
                className="textarea-reset surface-field wrap-anywhere min-h-[58px] w-full rounded-[20px] px-4 py-3 text-[15px] font-semibold leading-6 tracking-[-0.02em] text-[var(--dark-text)] outline-none placeholder:text-[var(--muted)]"
              />
              <div className="note-card-meta">
                <span
                  className="status-chip"
                  style={{ color: note.dotColor, backgroundColor: `${note.dotColor}1f` }}
                >
                  <PaletteIcon size={12} />
                  Focus card
                </span>
                <span className="note-secondary-chip status-chip" data-tone="neutral">
                  {editedLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="note-card-actions">
            <motion.button
              type="button"
              className="paper-button inline-flex items-center justify-center gap-2 rounded-[14px] px-3 py-2 text-[11px] font-semibold text-[var(--brown-strong)]"
              aria-label="Collapse note"
              whileHover={{ y: -2, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => toggleCollapsed(note.id)}
            >
              <ChevronsUpDownIcon size={15} />
              <span className="wrap-anywhere">{note.collapsed ? "Open" : "Fold"}</span>
            </motion.button>
            <motion.button
              type="button"
              data-action="delete"
              className="paper-button paper-button-danger inline-flex items-center justify-center gap-2 rounded-[14px] px-3 py-2 text-[11px] font-semibold"
              aria-label="Delete note"
              whileHover={{ y: -2, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => onDelete(note.id, event.currentTarget.getBoundingClientRect())}
            >
              <Trash2Icon size={15} />
              <span className="wrap-anywhere">Delete</span>
            </motion.button>
          </div>
        </div>
      </div>

      {note.collapsed ? null : (
        <div className="space-y-4 px-4 pb-4 pt-1">
          <Toolbar />
          <Editor content={note.content} onChange={(value) => updateCardContent(note.id, value)} />
        </div>
      )}
    </motion.article>
  );
}
