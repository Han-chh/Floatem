import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { hideDragPreview, showDragPreview, showFloatingCard } from "../../hooks/usePlatform";
import { useDragPointerTracking } from "../../hooks/useDragPointerTracking";
import { buildNoteDragPreviewPayload } from "../../lib/dragPreview";
import { useI18n } from "../../lib/i18n";
import { resolveNoteAccentColor } from "../../lib/models";
import { canUseFloatingNotes } from "../../lib/platformFeatures";
import {
  centerOverlayToCursor,
  readEventCoordinates,
  syncLatestDragPointerCoordinates,
} from "../../lib/dnd/centerOverlayToCursor";
import { resolveDragReorderTarget } from "../../lib/dnd/resolveDragReorderTarget";
import { useParticleField } from "../../hooks/useParticleField";
import { useNotesStore } from "../../store/notesStore";
import { useSettingsStore } from "../../store/settingsStore";
import { ParticleField } from "../feedback/ParticleField";
import { GroupFilterIcon, PlusIcon } from "../icons/AppIcons";
import { ThemeAtmosphere } from "../theme/ThemeAtmosphere";
import { NoteCard, NoteCardPreview } from "./NoteCard";
import { NOTE_FILTER_UNGROUPED_KEY, NoteGroupFilterDialog } from "./NoteGroupFilterDialog";

type NoteGroupFilterState =
  | { mode: "all" }
  | { mode: "custom"; keys: string[] };

export function NotesList() {
  const cardScrollRegionRef = useRef<HTMLDivElement>(null);
  const { t, language } = useI18n();
  const cards = useNotesStore((state) => state.cards);
  const groups = useNotesStore((state) => state.groups);
  const floatingCardIds = useNotesStore((state) => state.floatingCardIds);
  const addCard = useNotesStore((state) => state.addCard);
  const moveCard = useNotesStore((state) => state.moveCard);
  const removeCard = useNotesStore((state) => state.removeCard);
  const enableParticles = useSettingsStore((state) => state.enableParticles);
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragOverId, setActiveDragOverId] = useState<string | null>(null);
  const [activeDragWidth, setActiveDragWidth] = useState<number | null>(null);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [groupFilterState, setGroupFilterState] = useState<NoteGroupFilterState>({ mode: "all" });
  const { bursts, fieldRef, spawnBurst } = useParticleField();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
  );
  const floatingNotesEnabled = canUseFloatingNotes();
  const baseVisibleCards = useMemo(
    () =>
      cards.filter(
        (card) =>
          !removingIds.includes(card.id) &&
          (!floatingNotesEnabled || !floatingCardIds.includes(card.id)),
      ),
    [cards, floatingCardIds, floatingNotesEnabled, removingIds],
  );
  const availableFilterKeys = useMemo(
    () => [NOTE_FILTER_UNGROUPED_KEY, ...groups.map((group) => group.id)],
    [groups],
  );
  const selectedFilterKeys = useMemo(() => {
    if (groupFilterState.mode === "all") {
      return availableFilterKeys;
    }

    return availableFilterKeys.filter((key) => groupFilterState.keys.includes(key));
  }, [availableFilterKeys, groupFilterState]);
  const selectedFilterKeySet = useMemo(() => new Set(selectedFilterKeys), [selectedFilterKeys]);
  const allGroupsSelected = groupFilterState.mode === "all" || selectedFilterKeys.length === availableFilterKeys.length;
  const visibleCards = useMemo(() => {
    if (allGroupsSelected) {
      return baseVisibleCards;
    }

    return baseVisibleCards.filter((card) =>
      selectedFilterKeySet.has(card.groupId ?? NOTE_FILTER_UNGROUPED_KEY),
    );
  }, [allGroupsSelected, baseVisibleCards, selectedFilterKeySet]);
  const activeDragCard =
    visibleCards.find((card) => card.id === activeDragId) ??
    baseVisibleCards.find((card) => card.id === activeDragId) ??
    null;
  const dragPointerCoordinates = useDragPointerTracking(Boolean(activeDragId));
  const isFilterActive = !allGroupsSelected;

  const resetInteractiveSelectionBeforeFloatingCard = () => {
    if (typeof window === "undefined") {
      return;
    }

    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLElement &&
      (activeElement.isContentEditable ||
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement)
    ) {
      activeElement.blur();
    }

    window.getSelection()?.removeAllRanges();
  };

  useEffect(() => {
    if (!activeDragId || !dragPointerCoordinates || typeof document === "undefined") {
      setActiveDragOverId(null);
      return;
    }

    const nextTarget =
      document
        .elementsFromPoint(dragPointerCoordinates.x, dragPointerCoordinates.y)
        .map((element) => element.closest("[data-note-card-id]") as HTMLElement | null)
        .find((element) => {
          const id = element?.dataset.noteCardId;
          return Boolean(id && id !== activeDragId);
        })?.dataset.noteCardId ?? null;

    setActiveDragOverId(nextTarget);
  }, [activeDragId, dragPointerCoordinates]);

  useEffect(() => {
    setGroupFilterState((current) => {
      if (current.mode === "all") {
        return current;
      }

      const nextKeys = availableFilterKeys.filter((key) => current.keys.includes(key));
      const isUnchanged =
        nextKeys.length === current.keys.length && nextKeys.every((key, index) => key === current.keys[index]);

      if (nextKeys.length === availableFilterKeys.length) {
        return { mode: "all" };
      }

      return isUnchanged ? current : { mode: "custom", keys: nextKeys };
    });
  }, [availableFilterKeys]);

  const handleAddCard = (target: DOMRect) => {
    const card = addCard();
    if (enableParticles) {
      spawnBurst(target, "paper");
    }
    window.requestAnimationFrame(() => {
      document.getElementById(`note-title-${card.id}`)?.focus();
    });
  };

  const handleDeleteCard = (id: string, target: DOMRect) => {
    if (removingIds.includes(id)) {
      return;
    }

    const deletedCard = cards.find((card) => card.id === id) ?? null;
    const particleColor = deletedCard ? resolveNoteAccentColor(deletedCard, groups) : undefined;

    if (enableParticles) {
      spawnBurst(target, "rose", { color: particleColor });
    }
    setRemovingIds((current) => [...current, id]);
    window.setTimeout(() => {
      removeCard(id);
      setRemovingIds((current) => current.filter((item) => item !== id));
    }, 220);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = String(event.active.id);
    setActiveDragId(activeId);
    setActiveDragOverId(null);
    setActiveDragWidth(event.active.rect.current.initial?.width ?? null);
    syncLatestDragPointerCoordinates(event.activatorEvent);

    if (!floatingNotesEnabled) {
      return;
    }

    const rect = document.querySelector<HTMLElement>(`[data-note-card-id="${activeId}"]`)?.getBoundingClientRect();
    const coordinates = readEventCoordinates(event.activatorEvent);
    const activeCard = cards.find((card) => card.id === activeId);

    if (!rect || !coordinates || !activeCard) {
      return;
    }

    void showDragPreview(
      buildNoteDragPreviewPayload({
        note: activeCard,
        groups,
        language,
        rect,
        coordinates,
      }),
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const activeCard = cards.find((card) => card.id === activeId) ?? null;
    const overId = resolveDragReorderTarget({
      activeId,
      eventOverId: event.over ? String(event.over.id) : null,
      previewOverId: activeDragOverId,
    });

    setActiveDragId(null);
    setActiveDragOverId(null);
    setActiveDragWidth(null);

    if (!overId) {
      if (!floatingNotesEnabled) {
        return;
      }

      const rect = document.querySelector<HTMLElement>(`[data-note-card-id="${activeId}"]`)?.getBoundingClientRect();
      const coordinates = dragPointerCoordinates;

      if (activeCard && rect && coordinates) {
        resetInteractiveSelectionBeforeFloatingCard();
        void showFloatingCard(
          buildNoteDragPreviewPayload({
            note: activeCard,
            groups,
            language,
            rect,
            coordinates,
          }),
        );
      }
      void hideDragPreview();
      return;
    }
    if (floatingNotesEnabled) {
      void hideDragPreview();
    }
    moveCard(activeId, overId);
  };

  const handleApplyGroupFilters = (keys: string[]) => {
    const normalizedKeys = availableFilterKeys.filter((item) => keys.includes(item));

    setGroupFilterState(
      normalizedKeys.length === availableFilterKeys.length
        ? { mode: "all" }
        : { mode: "custom", keys: normalizedKeys },
    );
  };

  return (
    <section className="cq-module flex h-full min-h-0 flex-col gap-3">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        ref={fieldRef}
        className="relative min-h-0 flex-1"
      >
        <ParticleField bursts={enableParticles ? bursts : []} />

        {visibleCards.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-[rgba(213,198,180,0.88)] bg-[rgba(255,255,255,0.34)] px-6 text-center text-[13px] leading-6 text-[var(--muted)]"
          >
            {baseVisibleCards.length === 0 ? t.notes.empty : t.notes.filteredEmpty}
          </motion.div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => {
              setActiveDragId(null);
              setActiveDragOverId(null);
              setActiveDragWidth(null);
              if (floatingNotesEnabled) {
                void hideDragPreview();
              }
            }}
          >
            <SortableContext items={visibleCards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
              <div
                ref={cardScrollRegionRef}
                data-testid="note-card-scroll-region"
                className="paper-scroll relative h-full overflow-y-auto pr-1"
              >
                <ThemeAtmosphere scrollRootRef={cardScrollRegionRef} />
                <div data-theme-scroll-content className="relative z-10 flex flex-col gap-3 pb-1 pt-2">
                  <AnimatePresence>
                    {visibleCards.map((card) => (
                      <NoteCard
                        key={card.id}
                        note={card}
                        onDelete={handleDeleteCard}
                        dropPreview={activeDragOverId === card.id && activeDragId !== card.id}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </SortableContext>
            {typeof document !== "undefined"
              ? createPortal(
                  <DragOverlay
                    modifiers={[centerOverlayToCursor]}
                    dropAnimation={{
                      duration: 180,
                      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                  >
                    {activeDragCard ? (
                      <NoteCardPreview note={activeDragCard} width={activeDragWidth ?? undefined} />
                    ) : null}
                  </DragOverlay>,
                  document.body,
                )
              : null}
          </DndContext>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="paper-card mb-1.5 flex items-center gap-3 rounded-[22px] px-3 py-3"
      >
        <span className="status-chip shrink-0" data-tone="coral">
          {t.notes.cards(visibleCards.length)}
        </span>
        <p className="min-w-0 flex-1 wrap-anywhere text-[12px] font-medium text-[var(--muted)]">
          {t.notes.dragHint}
        </p>
        <motion.button
          type="button"
          aria-label={t.notes.filterGroups}
          aria-pressed={isFilterActive}
          data-tooltip={t.notes.filterGroups}
          data-tooltip-align="left"
          className={`paper-button relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            isFilterActive
              ? "border-[rgba(156,126,94,0.5)] bg-[linear-gradient(180deg,rgba(255,251,246,0.98),rgba(255,240,224,0.95))] text-[var(--brown-strong)] shadow-[0_14px_28px_rgba(156,126,94,0.16)]"
              : ""
          }`}
          whileHover={{ y: -2, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setIsFilterDialogOpen(true)}
        >
          <GroupFilterIcon size={16} />
          {isFilterActive ? (
            <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[var(--brown-strong)] px-1.5 py-0.5 text-[9px] font-bold leading-none text-white shadow-[0_8px_16px_rgba(61,49,34,0.18)]">
              {selectedFilterKeys.length}
            </span>
          ) : null}
        </motion.button>
        <motion.button
          type="button"
          aria-label={t.notes.add}
          data-tooltip={t.notes.add}
          data-tooltip-align="left"
          className="paper-button paper-button-primary inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          whileHover={{ y: -2, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={(event) => handleAddCard(event.currentTarget.getBoundingClientRect())}
        >
          <PlusIcon size={18} />
        </motion.button>
      </motion.div>

      <NoteGroupFilterDialog
        isOpen={isFilterDialogOpen}
        selectedKeys={selectedFilterKeySet}
        onClose={() => setIsFilterDialogOpen(false)}
        onApplySelection={handleApplyGroupFilters}
      />
    </section>
  );
}
