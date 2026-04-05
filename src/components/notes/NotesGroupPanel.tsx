import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../lib/i18n";
import { DEFAULT_NOTE_GROUP_COLOR, type NoteCard } from "../../lib/models";
import { useNotesStore } from "../../store/notesStore";
import { ChevronsUpDownIcon, PaletteIcon, SlidersHorizontalIcon, SquarePenIcon, Trash2Icon } from "../icons/AppIcons";
import { ColorPickerPopover } from "./ColorPickerPopover";

export const UNGROUPED_GROUP_FILTER_ID = "__ungrouped__";

type NotesGroupPanelProps = {
  cards: NoteCard[];
  selectedFilterKeys: string[] | null;
  onToggleFilter: (key: string) => void;
};

export function NotesGroupPanel({ cards, selectedFilterKeys, onToggleFilter }: NotesGroupPanelProps) {
  const { t } = useI18n();
  const groups = useNotesStore((state) => state.groups);
  const createGroup = useNotesStore((state) => state.createGroup);
  const updateGroup = useNotesStore((state) => state.updateGroup);
  const deleteGroup = useNotesStore((state) => state.deleteGroup);
  const colorButtonRef = useRef<HTMLButtonElement | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState<string>(DEFAULT_NOTE_GROUP_COLOR);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(() => (typeof window === "undefined" ? true : window.innerHeight >= 540));
  const groupCardCount = useMemo(() => {
    const counts = new Map<string, number>();

    for (const card of cards) {
      if (card.groupId) {
        counts.set(card.groupId, (counts.get(card.groupId) ?? 0) + 1);
      }
    }

    return counts;
  }, [cards]);
  const ungroupedCount = useMemo(() => cards.filter((card) => !card.groupId).length, [cards]);
  const isSaveDisabled = draftName.trim().length === 0;

  useEffect(() => {
    if (editingGroupId && !groups.some((group) => group.id === editingGroupId)) {
      setEditingGroupId(null);
      setDraftName("");
      setDraftColor(DEFAULT_NOTE_GROUP_COLOR);
      setIsColorPickerOpen(false);
    }
  }, [editingGroupId, groups]);

  const resetDraft = () => {
    setEditingGroupId(null);
    setDraftName("");
    setDraftColor(DEFAULT_NOTE_GROUP_COLOR);
    setIsColorPickerOpen(false);
  };

  const handleSubmit = () => {
    const nextName = draftName.trim();
    if (!nextName) {
      return;
    }

    if (editingGroupId) {
      updateGroup(editingGroupId, {
        color: draftColor,
        name: nextName,
      });
    } else {
      createGroup({
        color: draftColor,
        name: nextName,
      });
    }

    resetDraft();
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="paper-card paper-scroll max-h-[min(220px,42vh)] space-y-3 overflow-y-auto rounded-[24px] px-3.5 py-3.5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="status-chip" data-tone="blue">
              <SlidersHorizontalIcon size={12} />
              {t.notes.groupManagerTitle}
            </span>
            <span className="status-chip" data-tone="neutral">
              {t.notes.groups(groups.length)}
            </span>
          </div>
          {isExpanded ? (
            <p className="wrap-anywhere text-[12px] leading-5 text-[var(--muted)]">{t.notes.groupManagerBody}</p>
          ) : null}
        </div>
        <motion.button
          type="button"
          aria-label={isExpanded ? t.notes.fold : t.notes.open}
          className="paper-icon-button inline-flex h-9 w-9 min-h-0 min-w-0 shrink-0 rounded-[13px]"
          whileHover={{ y: -1.5, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setIsExpanded((current) => !current)}
        >
          <ChevronsUpDownIcon size={14} />
        </motion.button>
      </div>

      {isExpanded ? (
        <>
          <div className="surface-field space-y-2 rounded-[20px] px-3 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                {editingGroupId ? t.notes.editGroupTitle : t.notes.createGroupTitle}
              </span>
              <span className="status-chip" data-tone="neutral">
                {t.notes.groupColor}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                aria-label={t.notes.groupName}
                value={draftName}
                onChange={(event) => setDraftName(event.currentTarget.value)}
                placeholder={t.notes.groupNamePlaceholder}
                className="surface-field min-w-0 flex-1 rounded-[16px] px-3 py-2 text-[12.5px] font-medium text-[var(--dark-text)] outline-none placeholder:text-[var(--muted)]"
              />
              <motion.button
                ref={colorButtonRef}
                type="button"
                aria-label={t.notes.changeGroupColor}
                className="group relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-[rgba(213,198,180,0.88)] bg-[rgba(255,255,255,0.82)] text-[#2853C7] shadow-[0_10px_20px_rgba(61,49,34,0.08)]"
                whileHover={{ y: -1.5, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClick={() => setIsColorPickerOpen((current) => !current)}
              >
                <PaletteIcon size={14} />
                <span
                  className="pointer-events-none absolute bottom-[7px] right-[7px] h-2.5 w-2.5 rounded-full border border-white/80"
                  style={{ backgroundColor: draftColor }}
                />
              </motion.button>
            </div>

            <div className="flex flex-wrap gap-2">
              <motion.button
                type="button"
                className="paper-button inline-flex items-center justify-center rounded-[13px] px-3 py-2 text-[12px] font-semibold text-[var(--dark-text)]"
                whileHover={{ y: -1.5, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                disabled={isSaveDisabled}
                onClick={handleSubmit}
              >
                {editingGroupId ? t.common.save : t.notes.createGroup}
              </motion.button>
              {editingGroupId ? (
                <motion.button
                  type="button"
                  className="paper-button inline-flex items-center justify-center rounded-[13px] px-3 py-2 text-[12px] font-semibold text-[var(--muted)]"
                  whileHover={{ y: -1.5, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={resetDraft}
                >
                  {t.common.cancel}
                </motion.button>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="status-chip" data-tone="plum">
                {t.notes.group}
              </span>
              <span className="status-chip" data-tone="neutral">
                {t.notes.cards(cards.length)}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 rounded-[18px] border border-[rgba(213,198,180,0.84)] bg-[rgba(255,255,255,0.52)] px-3 py-2">
                <label className="flex min-w-0 flex-1 items-center gap-3">
                  <input
                    type="checkbox"
                    aria-label={t.notes.toggleGroupFilter(t.notes.noGroup)}
                    checked={selectedFilterKeys === null || selectedFilterKeys.includes(UNGROUPED_GROUP_FILTER_ID)}
                    onChange={() => onToggleFilter(UNGROUPED_GROUP_FILTER_ID)}
                  />
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border border-white/80 shadow-[0_2px_6px_rgba(0,0,0,0.08)]"
                    style={{ backgroundColor: "var(--muted)" }}
                  />
                  <span className="min-w-0 truncate text-[12.5px] font-semibold text-[var(--dark-text)]">{t.notes.noGroup}</span>
                </label>
                <span className="status-chip" data-tone="neutral">
                  {t.notes.cards(ungroupedCount)}
                </span>
              </div>

              {groups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between gap-3 rounded-[18px] border border-[rgba(213,198,180,0.84)] bg-[rgba(255,255,255,0.52)] px-3 py-2"
                >
                  <label className="flex min-w-0 flex-1 items-center gap-3">
                    <input
                      type="checkbox"
                      aria-label={t.notes.toggleGroupFilter(group.name)}
                      checked={selectedFilterKeys === null || selectedFilterKeys.includes(group.id)}
                      onChange={() => onToggleFilter(group.id)}
                    />
                    <span
                      className="h-3 w-3 shrink-0 rounded-full border border-white/80 shadow-[0_2px_6px_rgba(0,0,0,0.08)]"
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="min-w-0 truncate text-[12.5px] font-semibold text-[var(--dark-text)]">{group.name}</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="status-chip" style={{ backgroundColor: `${group.color}1f`, color: group.color }}>
                      {t.notes.cards(groupCardCount.get(group.id) ?? 0)}
                    </span>
                    <motion.button
                      type="button"
                      aria-label={t.notes.editGroup(group.name)}
                      className="paper-icon-button inline-flex h-8 w-8 min-h-0 min-w-0 rounded-[11px]"
                      whileHover={{ y: -1.5, scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setEditingGroupId(group.id);
                        setDraftName(group.name);
                        setDraftColor(group.color);
                        setIsColorPickerOpen(false);
                        setIsExpanded(true);
                      }}
                    >
                      <SquarePenIcon size={13} />
                    </motion.button>
                    <motion.button
                      type="button"
                      aria-label={t.notes.deleteGroup(group.name)}
                      className="paper-icon-button paper-button-danger inline-flex h-8 w-8 min-h-0 min-w-0 rounded-[11px]"
                      whileHover={{ y: -1.5, scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        if (editingGroupId === group.id) {
                          resetDraft();
                        }

                        deleteGroup(group.id);
                      }}
                    >
                      <Trash2Icon size={13} />
                    </motion.button>
                  </div>
                </div>
              ))}
            </div>

            {groups.length === 0 ? (
              <p className="wrap-anywhere rounded-[16px] border border-dashed border-[rgba(213,198,180,0.86)] bg-[rgba(255,255,255,0.34)] px-3 py-2 text-[12px] leading-5 text-[var(--muted)]">
                {t.notes.groupsEmpty}
              </p>
            ) : null}
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="status-chip" data-tone="plum">
            {t.notes.group}
          </span>
          <span className="status-chip" data-tone="neutral">
            {t.notes.cards(cards.length)}
          </span>
          <span className="status-chip" data-tone="neutral">
            {t.notes.noGroup}: {ungroupedCount}
          </span>
        </div>
      )}

      <ColorPickerPopover
        activeColor={draftColor}
        anchorRef={colorButtonRef}
        dataTestId="note-group-color-palette"
        isOpen={isColorPickerOpen}
        onApplyColor={(color) => {
          setDraftColor(color);
          setIsColorPickerOpen(false);
        }}
        onClose={() => setIsColorPickerOpen(false)}
        onPreviewColor={setDraftColor}
      />
    </motion.section>
  );
}
