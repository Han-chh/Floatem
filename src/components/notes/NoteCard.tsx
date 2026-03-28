import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, type Ref } from "react";
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

type NoteCardBodyProps = {
  note: NoteCardModel;
  editedLabel: string;
  onDelete?: (target: DOMRect) => void;
  onToggleCollapsed?: () => void;
  onUpdateTitle?: (value: string, element: HTMLTextAreaElement) => void;
  onUpdateContent?: (value: NoteCardModel["content"]) => void;
  onUpdateDotColor?: (color: string) => void;
  showPalette?: boolean;
  setShowPalette?: (nextValue: boolean) => void;
  titleRef?: Ref<HTMLTextAreaElement>;
  isDraggingPlaceholder?: boolean;
  preview?: boolean;
};

function formatCompactEditedLabel(updatedAt: number) {
  const elapsed = Math.max(0, Date.now() - updatedAt);
  const minute = 60_000;
  const hour = minute * 60;
  const day = hour * 24;

  if (elapsed < minute) {
    return "<1min ago";
  }

  if (elapsed < hour) {
    return `${Math.floor(elapsed / minute)}min ago`;
  }

  if (elapsed < day) {
    return `${Math.floor(elapsed / hour)}h ago`;
  }

  return `${Math.floor(elapsed / day)}d ago`;
}

function NoteCardBody({
  note,
  editedLabel,
  onDelete,
  onToggleCollapsed,
  onUpdateTitle,
  onUpdateContent,
  onUpdateDotColor,
  showPalette = false,
  setShowPalette,
  titleRef,
  isDraggingPlaceholder = false,
  preview = false,
}: NoteCardBodyProps) {
  const isInteractive = !preview;

  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-38"
        style={{
          backgroundImage:
            "radial-gradient(rgba(30,25,21,0.04) 0.8px, transparent 0.8px), radial-gradient(rgba(255,255,255,0.26) 0.6px, transparent 0.6px)",
          backgroundPosition: "0 0, 14px 14px",
          backgroundSize: "18px 18px, 28px 28px",
          maskImage: "linear-gradient(180deg, black, rgba(0,0,0,0.3))",
        }}
      />
      <div
        className="pointer-events-none absolute -right-6 top-4 h-20 w-20 rounded-full border-[8px] opacity-24"
        style={{ borderColor: note.dotColor }}
      />
      <div
        className="pointer-events-none absolute left-5 top-2.5 h-3.5 w-12 -rotate-[10deg] rounded-[5px] border border-white/65 bg-[rgba(255,255,255,0.48)]"
      />
      <div
        className="pointer-events-none absolute right-12 top-2.5 h-3.5 w-10 rotate-[12deg] rounded-[5px] border border-white/60"
        style={{ backgroundColor: `${note.dotColor}26` }}
      />
      <div
        className="pointer-events-none absolute inset-x-6 top-0 h-1.5 rounded-b-full opacity-90"
        style={{
          background: `linear-gradient(90deg, ${note.dotColor}, rgba(255,255,255,0.88), ${note.dotColor})`,
        }}
      />

      {isDraggingPlaceholder ? (
        <div className="absolute inset-0 rounded-[28px] border-2 border-dashed border-[rgba(161,136,113,0.44)] bg-[rgba(255,255,255,0.12)]" />
      ) : null}

      <div className={`relative rounded-t-[28px] px-3 py-2.5 ${isDraggingPlaceholder ? "opacity-0" : ""}`}>
        <div className="note-card-header-grid">
          <div className="note-card-title-row">
            <div className="relative mt-0.5 shrink-0">
              <motion.button
                type="button"
                className="paper-button inline-flex h-8 w-8 items-center justify-center rounded-full"
                aria-label="Change note color"
                whileHover={isInteractive ? { scale: 1.08 } : undefined}
                whileTap={isInteractive ? { scale: 0.94 } : undefined}
                onPointerDown={isInteractive ? (event) => event.stopPropagation() : undefined}
                onClick={isInteractive && setShowPalette ? () => setShowPalette(!showPalette) : undefined}
                style={{
                  borderColor: `${note.dotColor}8c`,
                  boxShadow: `0 0 0 5px ${note.dotColor}16, 0 8px 14px rgba(61,49,34,0.08), inset 0 1px 0 rgba(255,255,255,0.88)`,
                }}
              >
                <span
                  className="inline-flex h-3.5 w-3.5 rounded-full border border-white/70 shadow-[0_4px_8px_rgba(0,0,0,0.08)]"
                  style={{ backgroundColor: note.dotColor }}
                />
                <span className="sr-only">Change note color</span>
              </motion.button>
              {isInteractive && showPalette && setShowPalette && onUpdateDotColor ? (
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
                        onUpdateDotColor(color);
                        setShowPalette(false);
                      }}
                    />
                  ))}
                </motion.div>
              ) : null}
            </div>

            <div className="note-card-title-block">
              {preview ? (
                <div className="surface-field wrap-anywhere min-h-[40px] rounded-[17px] px-3 py-2 text-[13px] font-semibold leading-[1.35] tracking-[-0.02em] text-[var(--dark-text)]">
                  {note.title || "Untitled note"}
                </div>
              ) : (
                <textarea
                  ref={titleRef}
                  id={`note-title-${note.id}`}
                  aria-label="Note title"
                  rows={1}
                  value={note.title}
                  onChange={(event) => onUpdateTitle?.(event.currentTarget.value, event.currentTarget)}
                  onInput={(event) => syncTextareaHeight(event.currentTarget)}
                  onPointerDown={(event) => event.stopPropagation()}
                  placeholder="Untitled note"
                  className="textarea-reset surface-field wrap-anywhere min-h-[40px] w-full rounded-[17px] px-3 py-2 text-[13px] font-semibold leading-[1.35] tracking-[-0.02em] text-[var(--dark-text)] outline-none placeholder:text-[var(--muted)]"
                />
              )}

              <div className="note-card-meta">
                <div className="note-card-chip-group">
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

                <div className="note-card-actions">
                  <motion.button
                    type="button"
                    aria-label="Collapse note"
                    className="paper-icon-button group relative h-7 min-h-0 min-w-0 w-7 rounded-[9px]"
                    whileHover={isInteractive ? { y: -1.5, scale: 1.03 } : undefined}
                    whileTap={isInteractive ? { scale: 0.97 } : undefined}
                    onPointerDown={isInteractive ? (event) => event.stopPropagation() : undefined}
                    onClick={onToggleCollapsed}
                  >
                    <ChevronsUpDownIcon size={13} />
                    <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[rgba(30,25,21,0.94)] px-2 py-1 text-[10px] font-semibold leading-none whitespace-nowrap text-white opacity-0 shadow-[0_10px_20px_rgba(30,25,21,0.18)] transition-all duration-75 ease-out group-hover:-translate-y-1 group-hover:opacity-100">
                      {note.collapsed ? "Open" : "Fold"}
                    </span>
                  </motion.button>
                  <motion.button
                    type="button"
                    data-action="delete"
                    aria-label="Delete note"
                    className="paper-icon-button paper-button-danger group relative h-7 min-h-0 min-w-0 w-7 rounded-[9px]"
                    whileHover={isInteractive ? { y: -1.5, scale: 1.03 } : undefined}
                    whileTap={isInteractive ? { scale: 0.97 } : undefined}
                    onPointerDown={isInteractive ? (event) => event.stopPropagation() : undefined}
                    onClick={
                      onDelete
                        ? (event) => onDelete(event.currentTarget.getBoundingClientRect())
                        : undefined
                    }
                  >
                    <Trash2Icon size={13} />
                    <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[rgba(30,25,21,0.94)] px-2 py-1 text-[10px] font-semibold leading-none whitespace-nowrap text-white opacity-0 shadow-[0_10px_20px_rgba(30,25,21,0.18)] transition-all duration-75 ease-out group-hover:-translate-y-1 group-hover:opacity-100">
                      Delete
                    </span>
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {note.collapsed ? null : (
        <div className={`relative space-y-2 px-3 pb-3 pt-0 ${isDraggingPlaceholder ? "opacity-0" : ""}`}>
          <Toolbar />
          {preview ? (
            <div className="surface-field min-h-[188px] rounded-[20px] px-3 py-3 text-[12.25px] leading-[1.62] text-[var(--muted)]">
              {note.title ? "Editing preview of this card while dragging." : "Drag preview."}
            </div>
          ) : (
            <Editor content={note.content} onChange={(value) => onUpdateContent?.(value)} />
          )}
        </div>
      )}
    </>
  );
}

export function NoteCardPreview({ note, width }: { note: NoteCardModel; width?: number }) {
  const editedLabel = formatCompactEditedLabel(note.updatedAt);

  return (
    <div
      className="paper-card cq-card relative overflow-hidden rounded-[28px] border border-[rgba(213,198,180,0.92)] bg-[linear-gradient(180deg,rgba(255,252,248,0.98),rgba(255,247,239,0.95))] shadow-[0_30px_60px_rgba(61,49,34,0.22)]"
      style={{ width: width ?? undefined, maxWidth: "calc(100vw - 48px)" }}
    >
      <NoteCardBody note={note} editedLabel={editedLabel} preview />
    </div>
  );
}

export function NoteCard({ note, onDelete }: NoteCardProps) {
  const toggleCollapsed = useNotesStore((state) => state.toggleCollapsed);
  const updateCardTitle = useNotesStore((state) => state.updateCardTitle);
  const updateCardContent = useNotesStore((state) => state.updateCardContent);
  const updateDotColor = useNotesStore((state) => state.updateDotColor);
  const [showPalette, setShowPalette] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
  });

  const setArticleRef = (node: HTMLElement | null) => {
    cardRef.current = node;
    setNodeRef(node);
  };

  useEffect(() => {
    if (titleRef.current) {
      syncTextareaHeight(titleRef.current);
    }
  }, [note.id, note.title]);

  const editedLabel = formatCompactEditedLabel(note.updatedAt);

  return (
    <motion.article
      ref={setArticleRef}
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
      className={`paper-card cq-card relative overflow-hidden rounded-[28px] border border-[rgba(213,198,180,0.92)] bg-[linear-gradient(180deg,rgba(255,252,248,0.98),rgba(255,247,239,0.95))] shadow-[0_18px_36px_rgba(61,49,34,0.10)] cursor-grab active:cursor-grabbing ${
        isDragging ? "border-dashed border-[rgba(161,136,113,0.44)] bg-[rgba(255,255,255,0.12)] shadow-none" : ""
      }`}
    >
      <NoteCardBody
        note={note}
        editedLabel={editedLabel}
        onDelete={(target) => onDelete(note.id, cardRef.current?.getBoundingClientRect() ?? target)}
        onToggleCollapsed={() => toggleCollapsed(note.id)}
        onUpdateTitle={(value, element) => {
          syncTextareaHeight(element);
          updateCardTitle(note.id, value);
        }}
        onUpdateContent={(value) => updateCardContent(note.id, value)}
        onUpdateDotColor={(color) => updateDotColor(note.id, color)}
        showPalette={showPalette}
        setShowPalette={setShowPalette}
        titleRef={titleRef}
        isDraggingPlaceholder={isDragging}
      />
    </motion.article>
  );
}
