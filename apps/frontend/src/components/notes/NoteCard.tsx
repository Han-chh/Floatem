import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties, type Ref } from "react";
import { formatCompactEditedLabel, useI18n } from "../../lib/i18n";
import { resolveNoteAccentColor, resolveNoteGroup, type NoteCard as NoteCardModel } from "../../lib/models";
import { syncTextareaHeight } from "../../lib/resizeTextarea";
import { useNotesStore } from "../../store/notesStore";
import { ChevronsUpDownIcon, PushPinIcon, Trash2Icon, XIcon } from "../icons/AppIcons";
import { Editor, ReadOnlyEditorPreview } from "./Editor";
import { NoteGroupDialog } from "./NoteGroupDialog";

type NoteCardProps = {
  note: NoteCardModel;
  onDelete: (id: string, target: DOMRect) => void;
  dropPreview?: boolean;
  dockInsertionEdge?: "before" | "after" | null;
};

type NoteCardBodyProps = {
  note: NoteCardModel;
  accentColor: string;
  editedLabel: string;
  groupLabel: string;
  hasAssignedGroup: boolean;
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
  desktopPinned?: boolean;
  onToggleDesktopPinned?: () => void;
  floatingLayout?: boolean;
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

function colorWithAlpha(color: string, alpha: string) {
  return /^#[\da-f]{6}$/i.test(color) ? `${color}${alpha}` : color;
}

function getNoteCardSurface(accentColor: string, hasAssignedGroup = false) {
  const glowAlpha = hasAssignedGroup ? "32" : "18";
  const washAlpha = hasAssignedGroup ? "20" : "12";
  const edgeAlpha = hasAssignedGroup ? "18" : "0d";

  return [
    `radial-gradient(circle at 8% 0%, ${colorWithAlpha(accentColor, glowAlpha)}, transparent 38%)`,
    `linear-gradient(135deg, ${colorWithAlpha(accentColor, washAlpha)}, rgba(255,255,255,0.7) 48%, ${colorWithAlpha(accentColor, edgeAlpha)})`,
    "linear-gradient(180deg, rgba(255,252,248,0.98), rgba(255,247,239,0.95))",
  ].join(", ");
}

function getNoteGroupStyle(accentColor: string, hasAssignedGroup: boolean): CSSProperties {
  return hasAssignedGroup
    ? ({ "--card-group-accent": accentColor, "--note-group-accent": accentColor } as CSSProperties)
    : {};
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
  hasAssignedGroup,
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
  desktopPinned = false,
  onToggleDesktopPinned,
  floatingLayout = false,
}: NoteCardBodyProps) {
  const { t } = useI18n();
  const isInteractive = !preview;
  const isDockAction = actionVariant === "dock";

  return (
    <>
      <div
        className={`pointer-events-none absolute inset-0 ${hasAssignedGroup ? "opacity-60" : "opacity-38"}`}
        style={{
          backgroundImage:
            `radial-gradient(${colorWithAlpha(accentColor, "18")} 0.8px, transparent 0.9px), radial-gradient(rgba(30,25,21,0.035) 0.8px, transparent 0.8px), radial-gradient(rgba(255,255,255,0.26) 0.6px, transparent 0.6px)`,
          backgroundPosition: "0 0, 12px 12px, 24px 24px",
          backgroundSize: "20px 20px, 18px 18px, 28px 28px",
          maskImage: "linear-gradient(180deg, black, rgba(0,0,0,0.3))",
        }}
      />

      {hasAssignedGroup && !isDraggingPlaceholder ? (
        <>
          <div
            aria-hidden="true"
            className="note-group-card-texture pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(${colorWithAlpha(accentColor, "16")} 0.7px, transparent 0.8px), radial-gradient(circle at 92% 8%, ${colorWithAlpha(accentColor, "32")}, transparent 26%)`,
              backgroundSize: "18px 18px, 100% 100%",
            }}
          />
          <div
            aria-hidden="true"
            className="note-group-card-rail pointer-events-none absolute inset-y-4 left-0 w-[5px] rounded-r-full"
            style={{
              background: `linear-gradient(180deg, ${colorWithAlpha(accentColor, "f0")}, ${colorWithAlpha(accentColor, "8f")})`,
              boxShadow: `0 0 14px ${colorWithAlpha(accentColor, "52")}`,
            }}
          />
        </>
      ) : null}

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

          <div className={`note-card-meta ${floatingLayout ? "note-card-meta--floating" : ""}`}>
            <div className={`note-card-chip-group ${floatingLayout ? "note-card-chip-group--floating" : ""}`}>
              <motion.button
                type="button"
                aria-label={t.notes.changeGroup}
                data-tooltip={t.notes.group}
                className="note-group-chip status-chip inline-flex max-w-full items-center gap-1.5"
                whileHover={isInteractive ? { y: -1, scale: 1.015 } : undefined}
                whileTap={isInteractive ? { scale: 0.98 } : undefined}
                onPointerDown={isInteractive ? (event) => event.stopPropagation() : undefined}
                onClick={isInteractive ? onOpenGroupDialog : undefined}
                style={{
                  borderColor: colorWithAlpha(accentColor, "44"),
                  color: accentColor,
                  backgroundColor: colorWithAlpha(accentColor, hasAssignedGroup ? "2e" : "1f"),
                  boxShadow: `0 0 0 2px ${colorWithAlpha(accentColor, hasAssignedGroup ? "20" : "10")}`,
                }}
              >
                <GroupColorGlyph color={accentColor} size="sm" />
                <span className="min-w-0 truncate">{groupLabel}</span>
              </motion.button>
              <span
                className="note-secondary-chip status-chip"
                data-tone="neutral"
                style={{
                  whiteSpace: "nowrap",
                }}
              >
                {editedLabel}
              </span>
            </div>

            <div className={`note-card-actions ${floatingLayout ? "note-card-actions--floating" : ""}`}>
              {onToggleDesktopPinned ? (
                <motion.button
                  type="button"
                  aria-label={desktopPinned ? t.common.removeFromDesktop : t.common.keepOnDesktop}
                  aria-pressed={desktopPinned}
                  data-action="desktop-pin"
                  data-tooltip={desktopPinned ? t.common.removeFromDesktop : t.common.keepOnDesktop}
                  className={`note-card-action-button paper-icon-button relative rounded-[9px] ${
                    desktopPinned ? "text-[var(--accent-cobalt)]" : ""
                  }`}
                  whileHover={{ y: -1.5, scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={onToggleDesktopPinned}
                >
                  <span
                    aria-hidden="true"
                    data-desktop-pin-indicator
                    data-active={desktopPinned}
                    className="desktop-pin-indicator"
                  >
                    <PushPinIcon active={desktopPinned} size={14} />
                  </span>
                </motion.button>
              ) : null}
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
              attachedToolbar
              instantToolbar={instantToolbar}
              noteId={note.id}
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
  const assignedGroup = resolveNoteGroup(note, groups);
  const hasAssignedGroup = Boolean(assignedGroup);
  const groupLabel = assignedGroup?.name ?? t.notes.noGroup;

  return (
    <div
      data-card-grouped={hasAssignedGroup}
      data-note-grouped={hasAssignedGroup}
      className="content-card-classic paper-card cq-card relative overflow-hidden rounded-[28px] border border-[rgba(213,198,180,0.92)] bg-[linear-gradient(180deg,rgba(255,252,248,0.98),rgba(255,247,239,0.95))]"
      style={{
        ...getNoteGroupStyle(accentColor, hasAssignedGroup),
        background: getNoteCardSurface(accentColor, hasAssignedGroup),
        borderColor: colorWithAlpha(accentColor, "48"),
        width: width ?? undefined,
      }}
    >
      <NoteCardBody
        note={note}
        accentColor={accentColor}
        editedLabel={editedLabel}
        groupLabel={groupLabel}
        hasAssignedGroup={hasAssignedGroup}
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
  desktopPinned = false,
  onToggleDesktopPinned,
  minHeight,
}: {
  note: NoteCardModel;
  width?: number;
  onBeginDrag: () => void;
  onDock: () => void;
  desktopPinned?: boolean;
  onToggleDesktopPinned?: () => void;
  minHeight?: number;
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
  const assignedGroup = resolveNoteGroup(note, groups);
  const hasAssignedGroup = Boolean(assignedGroup);
  const groupLabel = assignedGroup?.name ?? t.notes.noGroup;

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
        data-card-grouped={hasAssignedGroup}
        data-note-grouped={hasAssignedGroup}
        className="content-card-classic paper-card cq-card relative overflow-hidden rounded-[28px] border border-[rgba(213,198,180,0.92)] bg-[linear-gradient(180deg,rgba(255,252,248,0.98),rgba(255,247,239,0.95))] shadow-[0_18px_36px_rgba(61,49,34,0.10)] cursor-grab active:cursor-grabbing"
        style={{
          ...getNoteGroupStyle(accentColor, hasAssignedGroup),
          background: getNoteCardSurface(accentColor, hasAssignedGroup),
          borderColor: colorWithAlpha(accentColor, "4d"),
          boxShadow: `0 0 0 2px ${colorWithAlpha(accentColor, "10")}, 0 18px 36px rgba(61,49,34,0.10)`,
          width: width ?? undefined,
          minHeight,
        }}
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
          hasAssignedGroup={hasAssignedGroup}
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
          desktopPinned={desktopPinned}
          onToggleDesktopPinned={onToggleDesktopPinned}
          floatingLayout
        />
      </motion.article>

      <NoteGroupDialog noteId={note.id} isOpen={isGroupDialogOpen} onClose={() => setIsGroupDialogOpen(false)} />
    </>
  );
}

export function NoteCard({ note, onDelete, dropPreview = false, dockInsertionEdge = null }: NoteCardProps) {
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
  const assignedGroup = resolveNoteGroup(note, groups);
  const hasAssignedGroup = Boolean(assignedGroup);
  const groupLabel = assignedGroup?.name ?? t.notes.noGroup;

  return (
    <>
      <motion.article
        ref={setArticleRef}
        layout="position"
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
          ...getNoteGroupStyle(accentColor, hasAssignedGroup),
          background: isDragging ? undefined : getNoteCardSurface(accentColor, hasAssignedGroup),
          borderColor: isDragging ? undefined : colorWithAlpha(accentColor, "4d"),
          boxShadow: isDragging
            ? undefined
            : `0 0 0 2px ${colorWithAlpha(accentColor, "10")}, 0 18px 36px rgba(61,49,34,0.10)`,
          transform: CSS.Transform.toString(transform),
          transition,
        }}
        {...attributes}
        {...listeners}
        data-no-window-drag="true"
        aria-label={t.notes.reorder}
        data-testid="note-card"
        data-note-card-id={note.id}
        data-dock-entity-id={note.id}
        data-card-grouped={hasAssignedGroup}
        data-note-grouped={hasAssignedGroup}
        data-dragging={isDragging}
        className={`content-card-classic paper-card cq-card mx-1 relative overflow-hidden rounded-[28px] border border-[rgba(213,198,180,0.92)] bg-[linear-gradient(180deg,rgba(255,252,248,0.98),rgba(255,247,239,0.95))] shadow-[0_18px_36px_rgba(61,49,34,0.10)] cursor-grab active:cursor-grabbing ${
          isDragging ? "border-transparent bg-[rgba(255,255,255,0.08)] shadow-none" : ""
        }`}
      >
        <NoteCardBody
          note={note}
          accentColor={accentColor}
          editedLabel={editedLabel}
          groupLabel={groupLabel}
          hasAssignedGroup={hasAssignedGroup}
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
        {dockInsertionEdge ? (
          <div
            aria-hidden="true"
            data-testid="note-dock-insertion-line"
            data-edge={dockInsertionEdge}
            className={`pointer-events-none absolute left-3 right-3 z-30 h-[3px] rounded-full bg-[rgb(31,168,122)] shadow-[0_0_0_3px_rgba(31,168,122,0.16)] ${
              dockInsertionEdge === "before" ? "top-[1px]" : "bottom-[1px]"
            }`}
          />
        ) : null}
      </motion.article>

      <NoteGroupDialog noteId={note.id} isOpen={isGroupDialogOpen} onClose={() => setIsGroupDialogOpen(false)} />
    </>
  );
}
