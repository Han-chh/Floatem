import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../lib/i18n";
import { useNotesStore } from "../../store/notesStore";
import { GroupFilterIcon, XIcon } from "../icons/AppIcons";

export const NOTE_FILTER_UNGROUPED_KEY = "@@quicknote/no-group";

type NoteGroupFilterDialogProps = {
  isOpen: boolean;
  allSelected: boolean;
  selectedKeys: ReadonlySet<string>;
  onClose: () => void;
  onSelectAll: () => void;
  onToggleFilter: (key: string) => void;
};

type FilterOptionRowProps = {
  checked: boolean;
  count: number;
  label: string;
  onChange: () => void;
  swatch?: ReactNode;
};

function FilterOptionRow({ checked, count, label, onChange, swatch }: FilterOptionRowProps) {
  const { t } = useI18n();

  return (
    <label
      data-no-window-drag="true"
      className={`flex cursor-pointer items-center gap-3 rounded-[16px] border px-3 py-2.5 transition-colors ${
        checked
          ? "border-[rgba(156,126,94,0.38)] bg-[rgba(255,249,243,0.96)]"
          : "border-[rgba(213,198,180,0.84)] bg-[rgba(255,255,255,0.82)]"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 shrink-0 rounded border-[rgba(156,126,94,0.42)]"
        style={{ accentColor: "var(--brown-strong)" }}
      />
      <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center text-[var(--brown-strong)]">
        {swatch}
      </span>
      <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[var(--dark-text)]">{label}</span>
      <span aria-hidden="true" className="status-chip shrink-0" data-tone="neutral">
        {t.notes.cards(count)}
      </span>
    </label>
  );
}

export function NoteGroupFilterDialog({
  isOpen,
  allSelected,
  selectedKeys,
  onClose,
  onSelectAll,
  onToggleFilter,
}: NoteGroupFilterDialogProps) {
  const { t } = useI18n();
  const cards = useNotesStore((state) => state.cards);
  const groups = useNotesStore((state) => state.groups);
  const dialogMaxHeight = "calc(100dvh * 2 / 3)";
  const groupCounts = useMemo(() => {
    const nextCounts = new Map<string, number>();

    for (const card of cards) {
      if (card.groupId) {
        nextCounts.set(card.groupId, (nextCounts.get(card.groupId) ?? 0) + 1);
      }
    }

    return nextCounts;
  }, [cards]);
  const ungroupedCount = useMemo(() => cards.filter((card) => card.groupId === null).length, [cards]);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="quicknote-modal-backdrop fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-[rgba(30,25,21,0.16)] px-4 py-4 backdrop-blur-[8px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t.notes.filterDialogTitle}
            className="paper-panel my-4 flex w-full max-w-[360px] flex-col overflow-hidden rounded-[26px] p-4 shadow-[0_28px_56px_rgba(30,25,21,0.2)]"
            style={{ maxHeight: dialogMaxHeight }}
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-[20px] font-semibold tracking-[-0.04em] text-[var(--brown-strong)]">
                  {t.notes.filterDialogTitle}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-[var(--muted)]">{t.notes.filterDialogSubtitle}</p>
              </div>

              <motion.button
                type="button"
                aria-label={t.common.close}
                data-tooltip={t.common.close}
                data-no-window-drag="true"
                className="paper-button inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px]"
                whileHover={{ y: -1.5, scale: 1.02 }}
                whileTap={{ scale: 0.985 }}
                onClick={onClose}
              >
                <XIcon size={14} />
              </motion.button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span className="status-chip shrink-0" data-tone="coral">
                {t.notes.cards(cards.length)}
              </span>
            </div>

            <div
              data-testid="note-group-filter-scroll-region"
              data-no-window-drag="true"
              className="paper-scroll mt-3 min-h-0 flex flex-1 flex-col gap-2 overflow-y-auto pr-1"
            >
              <FilterOptionRow
                checked={allSelected}
                count={cards.length}
                label={t.notes.allGroups}
                onChange={onSelectAll}
                swatch={<GroupFilterIcon size={14} />}
              />

              <FilterOptionRow
                checked={selectedKeys.has(NOTE_FILTER_UNGROUPED_KEY)}
                count={ungroupedCount}
                label={t.notes.noGroup}
                onChange={() => onToggleFilter(NOTE_FILTER_UNGROUPED_KEY)}
                swatch={
                  <span className="inline-flex h-2.5 w-2.5 rounded-full border border-[rgba(156,126,94,0.34)] bg-[rgba(200,192,181,0.96)]" />
                }
              />

              {groups.map((group) => (
                <FilterOptionRow
                  key={group.id}
                  checked={selectedKeys.has(group.id)}
                  count={groupCounts.get(group.id) ?? 0}
                  label={group.name}
                  onChange={() => onToggleFilter(group.id)}
                  swatch={<span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: group.color }} />}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
