import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, type Ref } from "react";
import { formatCompactEditedLabel, useI18n } from "../../lib/i18n";
import { resolveNoteAccentColor, resolveNoteGroup, type NoteCard as NoteCardModel } from "../../lib/models";
import { syncTextareaHeight } from "../../lib/resizeTextarea";
import { useNotesStore } from "../../store/notesStore";
import { ChevronsUpDownIcon, Trash2Icon, XIcon } from "../icons/AppIcons";
import { Editor, ReadOnlyEditorPreview } from "./Editor";
import { NoteGroupDialog } from "./NoteGroupDialog";

type NoteCardProps = {
  note: NoteCardModel;
  onDelete: (id: string, target: DOMRect) => void;
  dropPreview?: boolean;
};

type NoteCardBodyProps = {
  note: NoteCardModel;
  accentColor: string;
  editedLabel: string;
  groupLabel: string;
  onDelete?: (target: DOMRect) => void;
  onOpenGroupDialog?: () => void;
  onToggleCollapsed?: () => void;
  onUpdateTitle?: (value: string, element: HTMLTextAreaElement) => void;
  onUpdateContent?: (value: NoteCardModel["content"]) => void;
  titleRef?: Ref<HTMLTextAreaElement>;
  instantToolbar?: boolean;
  isDraggingPlaceholder?: boolean;
  isDropTargetPreview?: boolean;
  preview?: boolean;
  actionVariant?: "delete" | "dock";
};

function GroupColorGlyph({ color, size = "md" }: { color: string; size?: "sm" | "md" }) {
  const outerSizeClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const innerSizeClass = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";

  return (
    <span
      aria-hidden="true"
      className={`inline-flex ${outerSizeClass} items-center justify-center rounded-full border border-white/80 shadow-[0_3px_7px_rgba(0,0,0,0.08)]`}
      style={{ backgroundColor: `${color}24`, boxShadow: `0 0 0 2px ${color}14` }}
    >
      <span className={`${innerSizeClass} rounded-full border border-white/80`} style={{ backgroundColor: color }} />
    </span>
  );
}

const FLOATING_NOTE_EDIT_TARGET_SELECTOR =
  'button,input,textarea,select,[contenteditable="true"],[role="textbox"],[data-floating-note-edit-region="true"]';

function isFloatingNoteEditTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest(FLOATING_NOTE_EDIT_TARGET_SELECTOR));
}

function NoteCardBody({
  note,
  accentColor,
  editedLabel,
  groupLabel,
  onDelete,
  onOpenGroupDialog,
  onToggleCollapsed,
  onUpdateTitle,
  onUpdateContent,
  titleRef,
  instantToolbar = false,
  isDraggingPlaceholder = false,
  isDropTargetPreview = false,
  preview = false,
  actionVariant = "delete",
}: NoteCardBodyProps) {
  const { t } = useI18n();
  const isInteractive = !preview;
  const isDockAction = actionVariant === "dock";

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
        style={{ borderColor: accentColor }}
      />
      <div className="pointer-events-none absolute left-5 top-2.5 h-3.5 w-12 -rotate-[10deg] rounded-[5px] border border-white/65 bg-[rgba(255,255,255,0.48)]" />
      <div
        className="pointer-events-none absolute right-12 top-2.5 h-3.5 w-10 rotate-[12deg] rounded-[5px] border border-white/60"
        style={{ backgroundColor: `${accentColor}26` }}
      />
      <div
        className="pointer-events-none absolute inset-x-6 top-0 h-1.5 rounded-b-full opacity-90"
        style={{
          background: `linear-gradient(90deg, ${accentColor}, rgba(255,255,255,0.88), ${accentColor})`,
        }}
      />

      {isDraggingPlaceholder ? (
        <div className="absolute inset-0 rounded-[28px] border border-transparent bg-[rgba(255,255,255,0.08)]" />
      ) : null}
      {isDropTargetPreview ? (
        <div className="pointer-events-none absolute inset-[3px] rounded-[25px] border-2 border-[rgba(31,168,122,0.82)] bg-[rgba(31,168,122,0.05)] shadow-[0_0_0_4px_rgba(31,168,122,0.14)]" />
      ) : null}

      <div className={`relative rounded-t-[28px] px-3 py-2.5 ${isDraggingPlaceholder ? "opacity-0" : ""}`}>
        <div className="note-card-header-grid">
          <div className="note-card-title-row">
            <div className="note-card-title-block" data-floating-note-edit-region="true">
              {preview ? (
                <div className="surface-field wrap-anywhere min-h-[40px] rounded-[17px] px-3 py-2 text-[13px] font-semibold leading-[1.35] tracking-[-0.02em] text-[var(--dark-text)]">
                  {note.title || t.notes.untitled}
                </div>
              ) : (
                <textarea
                  ref={titleRef}
                  id={`note-title-${note.id}`}
                  aria-label={t.notes.titleAria}
                  rows={1}
                  value={note.title}
                  onChange={(event) => onUpdateTitle?.(event.currentTarget.value, event.currentTarget)}
                  onInput={(event) => syncTextareaHeight(event.currentTarget)}
                  onPointerDown={(event) => event.stopPropagation()}
                  placeholder={t.notes.untitled}
                  className="note-title-input textarea-reset surface-field wrap-anywhere min-h-[40px] w-full rounded-[17px] px-3 py-2 text-[13px] font-semibold leading-[1.35] tracking-[-0.02em] text-[var(--dark-text)] outline-none placeholder:text-[var(--muted)]"
                />
              )}
            </div>
          </div>

          <div className="note-card-meta">
            <div className="note-card-chip-group">
              <span
                className="status-chip"
                style={{ color: accentColor, backgroundColor: `${accentColor}1f` }}
              >
                {groupLabel}
              </span>
              <span className="note-secondary-chip status-chip" data-tone="neutral">
                {editedLabel}
              </span>
            </div>

            <div className="note-card-actions">
              <div className="note-card-action-anchor group">
                <motion.button
                  type="button"
                  className="note-card-action-button paper-icon-button relative rounded-[9px]"
                  aria-label={t.notes.changeGroup}
                  data-tooltip={t.notes.group}
                  whileHover={isInteractive ? { y: -1.5, scale: 1.03 } : undefined}
                  whileTap={isInteractive ? { scale: 0.97 } : undefined}
                  onPointerDown={isInteractive ? (event) => event.stopPropagation() : undefined}
                  onClick={isInteractive ? onOpenGroupDialog : undefined}
                  style={{
                    borderColor: `${accentColor}72`,
                    background: `linear-gradient(180deg, rgba(255,255,255,0.98), ${accentColor}14), rgba(255,255,255,0.96)`,
                    boxShadow: `0 0 0 3px ${accentColor}14, 0 10px 18px rgba(61,49,34,0.08), inset 0 1px 0 rgba(255,255,255,0.88)`,
                  }}
                >
                  <GroupColorGlyph color={accentColor} size="sm" />
                  <span className="sr-only">{t.notes.changeGroup}</span>
                </motion.button>
              </div>
              <motion.button
                type="button"
                aria-label={t.notes.collapse}
                data-tooltip={note.collapsed ? t.notes.open : t.notes.fold}
                className="note-card-action-button paper-icon-button group relative rounded-[9px]"
                whileHover={isInteractive ? { y: -1.5, scale: 1.03 } : undefined}
                whileTap={isInteractive ? { scale: 0.97 } : undefined}
                onPointerDown={isInteractive ? (event) => event.stopPropagation() : undefined}
                onClick={onToggleCollapsed}
              >
                <ChevronsUpDownIcon size={13} />
              </motion.button>
              <motion.button
                type="button"
                data-action={isDockAction ? "dock" : "delete"}
                aria-label={isDockAction ? t.common.close : t.notes.delete}
                data-tooltip={isDockAction ? t.common.close : t.notes.delete}
                data-tooltip-shift="left"
                className={`note-card-action-button paper-icon-button group relative rounded-[9px] ${
                  isDockAction
                    ? "border-[rgba(151,156,152,0.2)] bg-[rgba(236,239,237,0.74)] text-[rgba(101,106,103,0.82)] shadow-[0_5px_12px_rgba(61,49,34,0.04)]"
                    : "paper-button-danger"
                }`}
                whileHover={isInteractive ? { y: -1.5, scale: 1.03 } : undefined}
                whileTap={isInteractive ? { scale: 0.97 } : undefined}
                onPointerDown={isInteractive ? (event) => event.stopPropagation() : undefined}
                onClick={
                  onDelete
                    ? (event) => onDelete(event.currentTarget.getBoundingClientRect())
                    : undefined
                }
              >
                {isDockAction ? <XIcon size={13} /> : <Trash2Icon size={13} />}
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {note.collapsed ? null : (
        <div
          className={`relative space-y-2 px-3 pb-3 pt-0 ${isDraggingPlaceholder ? "opacity-0" : ""}`}
          data-floating-note-edit-region="true"
        >
          {preview ? (
            <ReadOnlyEditorPreview key={`${note.id}:${note.updatedAt}`} content={note.content} />
          ) : (
            <Editor
              content={note.content}
              instantToolbar={instantToolbar}
              onChange={(value) => onUpdateContent?.(value)}
            />
          )}
        </div>
      )}
    </>
  );
}

export function NoteCardPreview({ note, width }: { note: NoteCardModel; width?: number }) {
  const { language, t } = useI18n();
  const groups = useNotesStore((state) => state.groups);
  const editedLabel = formatCompactEditedLabel(note.updatedAt, language);
  const accentColor = resolveNoteAccentColor(note, groups);
  const groupLabel = resolveNoteGroup(note, groups)?.name ?? t.notes.noGroup;

  return (
    <div
      className="paper-card cq-card relative overflow-hidden rounded-[28px] border border-[rgba(213,198,180,0.92)] bg-[linear-gradient(180deg,rgba(255,252,248,0.98),rgba(255,247,239,0.95))]"
      style={{ width: width ?? undefined }}
    >
      <NoteCardBody
        note={note}
        accentColor={accentColor}
        editedLabel={editedLabel}
        groupLabel={groupLabel}
        preview
      />
    </div>
  );
}

export function FloatingNoteCard({
  note,
  width,
  onBeginDrag,
  onDock,
}: {
  note: NoteCardModel;
  width?: number;
  onBeginDrag: () => void;
  onDock: () => void;
}) {
  const { language, t } = useI18n();
  const groups = useNotesStore((state) => state.groups);
  const toggleCollapsed = useNotesStore((state) => state.toggleCollapsed);
  const updateCardTitle = useNotesStore((state) => state.updateCardTitle);
  const updateCardContent = useNotesStore((state) => state.updateCardContent);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const editedLabel = formatCompactEditedLabel(note.updatedAt, language);
  const accentColor = resolveNoteAccentColor(note, groups);
  const groupLabel = resolveNoteGroup(note, groups)?.name ?? t.notes.noGroup;

  useEffect(() => {
    if (titleRef.current) {
      syncTextareaHeight(titleRef.current);
    }
  }, [note.id, note.title]);

  return (
    <>
      <motion.article
        ref={cardRef}
        data-no-window-drag="true"
        aria-label={t.notes.reorder}
        data-testid="note-card"
        data-note-card-id={note.id}
        className="paper-card cq-card relative overflow-hidden rounded-[28px] border border-[rgba(213,198,180,0.92)] bg-[linear-gradient(180deg,rgba(255,252,248,0.98),rgba(255,247,239,0.95))] shadow-[0_18px_36px_rgba(61,49,34,0.10)] cursor-grab active:cursor-grabbing"
        style={{ width: width ?? undefined }}
        onPointerDownCapture={(event) => {
          if (event.button !== 0) {
            return;
          }

          if (isFloatingNoteEditTarget(event.target)) {
            return;
          }

          // Defer to next microtask so the WebView finishes processing
          // the pointer event before the native drag loop starts.
          // Starting the drag loop during the capture phase otherwise
          // crashes the WebView content process.
          Promise.resolve().then(() => onBeginDrag());
        }}
      >
        <NoteCardBody
          note={note}
          accentColor={accentColor}
          editedLabel={editedLabel}
          groupLabel={groupLabel}
          onDelete={onDock}
          onOpenGroupDialog={() => setIsGroupDialogOpen(true)}
          onToggleCollapsed={() => toggleCollapsed(note.id)}
          onUpdateTitle={(value, element) => {
            syncTextareaHeight(element);
            updateCardTitle(note.id, value);
          }}
          onUpdateContent={(value) => updateCardContent(note.id, value)}
          instantToolbar
          titleRef={titleRef}
          actionVariant="dock"
        />
      </motion.article>

      <NoteGroupDialog noteId={note.id} isOpen={isGroupDialogOpen} onClose={() => setIsGroupDialogOpen(false)} />
    </>
  );
}

export function NoteCard({ note, onDelete, dropPreview = false }: NoteCardProps) {
  const { language, t } = useI18n();
  const groups = useNotesStore((state) => state.groups);
  const toggleCollapsed = useNotesStore((state) => state.toggleCollapsed);
  const updateCardTitle = useNotesStore((state) => state.updateCardTitle);
  const updateCardContent = useNotesStore((state) => state.updateCardContent);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
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

  const editedLabel = formatCompactEditedLabel(note.updatedAt, language);
  const accentColor = resolveNoteAccentColor(note, groups);
  const groupLabel = resolveNoteGroup(note, groups)?.name ?? t.notes.noGroup;

  return (
    <>
      <motion.article
        ref={setArticleRef}
        layout
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -14, scale: 0.94 }}
        whileHover={
          !isDragging
            ? {
                y: -2,
                scale: 1.004,
                boxShadow: "0 24px 46px rgba(61,49,34,0.14)",
              }
            : undefined
        }
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
        }}
        {...attributes}
        {...listeners}
        data-no-window-drag="true"
        aria-label={t.notes.reorder}
        data-testid="note-card"
        data-note-card-id={note.id}
        className={`paper-card cq-card mx-1 relative overflow-hidden rounded-[28px] border border-[rgba(213,198,180,0.92)] bg-[linear-gradient(180deg,rgba(255,252,248,0.98),rgba(255,247,239,0.95))] shadow-[0_18px_36px_rgba(61,49,34,0.10)] cursor-grab active:cursor-grabbing ${
          isDragging ? "border-transparent bg-[rgba(255,255,255,0.08)] shadow-none" : ""
        }`}
      >
        <NoteCardBody
          note={note}
          accentColor={accentColor}
          editedLabel={editedLabel}
          groupLabel={groupLabel}
          onDelete={(target) => onDelete(note.id, cardRef.current?.getBoundingClientRect() ?? target)}
          onOpenGroupDialog={() => setIsGroupDialogOpen(true)}
          onToggleCollapsed={() => toggleCollapsed(note.id)}
          onUpdateTitle={(value, element) => {
            syncTextareaHeight(element);
            updateCardTitle(note.id, value);
          }}
          onUpdateContent={(value) => updateCardContent(note.id, value)}
          titleRef={titleRef}
          isDraggingPlaceholder={isDragging}
          isDropTargetPreview={dropPreview}
        />
      </motion.article>

      <NoteGroupDialog noteId={note.id} isOpen={isGroupDialogOpen} onClose={() => setIsGroupDialogOpen(false)} />
    </>
  );
}
