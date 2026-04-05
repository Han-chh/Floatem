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
import { useEffect, useMemo, useState } from "react";
import { useDragPointerTracking } from "../../hooks/useDragPointerTracking";
import { useI18n } from "../../lib/i18n";
import { centerOverlayToCursor, syncLatestDragPointerCoordinates } from "../../lib/dnd/centerOverlayToCursor";
import { resolveDragReorderTarget } from "../../lib/dnd/resolveDragReorderTarget";
import { useParticleField } from "../../hooks/useParticleField";
import { useNotesStore } from "../../store/notesStore";
import { useSettingsStore } from "../../store/settingsStore";
import { ParticleField } from "../feedback/ParticleField";
import { PlusIcon } from "../icons/AppIcons";
import { NoteCard, NoteCardPreview } from "./NoteCard";
import { NotesGroupPanel, UNGROUPED_GROUP_FILTER_ID } from "./NotesGroupPanel";

export function NotesList() {
  const { t } = useI18n();
  const cards = useNotesStore((state) => state.cards);
  const groups = useNotesStore((state) => state.groups);
  const addCard = useNotesStore((state) => state.addCard);
  const moveCard = useNotesStore((state) => state.moveCard);
  const removeCard = useNotesStore((state) => state.removeCard);
  const enableParticles = useSettingsStore((state) => state.enableParticles);
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragOverId, setActiveDragOverId] = useState<string | null>(null);
  const [activeDragWidth, setActiveDragWidth] = useState<number | null>(null);
  const [selectedGroupFilters, setSelectedGroupFilters] = useState<string[] | null>(null);
  const [isCompactHeight, setIsCompactHeight] = useState(() => (typeof window === "undefined" ? false : window.innerHeight < 540));
  const { bursts, fieldRef, spawnBurst } = useParticleField();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
  );
  const availableFilterKeys = useMemo(
    () => [UNGROUPED_GROUP_FILTER_ID, ...groups.map((group) => group.id)],
    [groups],
  );

  const matchesGroupFilter = (groupId: string | null) => {
    if (selectedGroupFilters === null) {
      return true;
    }

    return selectedGroupFilters.includes(groupId ?? UNGROUPED_GROUP_FILTER_ID);
  };

  const visibleCards = cards
    .filter((card) => !removingIds.includes(card.id))
    .filter((card) => matchesGroupFilter(card.groupId));
  const activeDragCard = cards.find((card) => card.id === activeDragId) ?? null;
  const dragPointerCoordinates = useDragPointerTracking(Boolean(activeDragId));

  useEffect(() => {
    setSelectedGroupFilters((current) => {
      if (current === null) {
        return null;
      }

      const next = current.filter((key) => availableFilterKeys.includes(key));

      if (next.length === 0) {
        return [];
      }

      if (next.length === availableFilterKeys.length) {
        return null;
      }

      return next;
    });
  }, [availableFilterKeys]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleResize = () => {
      setIsCompactHeight(window.innerHeight < 540);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

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

    if (enableParticles) {
      spawnBurst(
        {
          x: target.left + target.width / 2,
          y: target.top + target.height / 2,
        },
        "rose",
      );
    }
    setRemovingIds((current) => [...current, id]);
    window.setTimeout(() => {
      removeCard(id);
      setRemovingIds((current) => current.filter((item) => item !== id));
    }, 220);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
    setActiveDragOverId(null);
    setActiveDragWidth(event.active.rect.current.initial?.width ?? null);
    syncLatestDragPointerCoordinates(event.activatorEvent);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = resolveDragReorderTarget({
      activeId,
      eventOverId: event.over ? String(event.over.id) : null,
      previewOverId: activeDragOverId,
    });

    setActiveDragId(null);
    setActiveDragOverId(null);
    setActiveDragWidth(null);

    if (!overId) {
      return;
    }

    moveCard(activeId, overId);
  };

  const handleToggleGroupFilter = (key: string) => {
    setSelectedGroupFilters((current) => {
      const allKeys = new Set(availableFilterKeys);
      const next = current === null ? new Set(allKeys) : new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      if (next.size === allKeys.size) {
        return null;
      }

      return Array.from(next);
    });
  };

  const groupPanel = (
    <NotesGroupPanel
      cards={cards}
      selectedFilterKeys={selectedGroupFilters}
      onToggleFilter={handleToggleGroupFilter}
    />
  );

  return (
    <section className="cq-module flex h-full min-h-0 flex-col gap-3">
      {isCompactHeight ? null : groupPanel}

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
            {cards.length === 0 ? t.notes.empty : t.notes.filteredEmpty}
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
            }}
          >
            <SortableContext items={visibleCards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
              <div className="paper-scroll h-full overflow-y-auto pr-1">
                <div className="flex flex-col gap-3">
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
            <DragOverlay
              modifiers={[centerOverlayToCursor]}
              dropAnimation={{
                duration: 180,
                easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              {activeDragCard ? (
                <motion.div initial={{ rotate: -1.2 }} animate={{ rotate: -1.2 }}>
                  <NoteCardPreview note={activeDragCard} width={activeDragWidth ?? undefined} />
                </motion.div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </motion.div>

      {isCompactHeight ? groupPanel : null}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="paper-card flex items-center gap-3 rounded-[22px] px-3 py-3"
      >
        <span className="status-chip shrink-0" data-tone="coral">
          {t.notes.cards(visibleCards.length)}
        </span>
        <p className="min-w-0 flex-1 wrap-anywhere text-[12px] font-medium text-[var(--muted)]">
          {t.notes.dragHint}
        </p>
        <motion.button
          type="button"
          aria-label={t.notes.add}
          className="paper-button paper-button-primary inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          whileHover={{ y: -2, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={(event) => handleAddCard(event.currentTarget.getBoundingClientRect())}
        >
          <PlusIcon size={18} />
        </motion.button>
      </motion.div>
    </section>
  );
}
