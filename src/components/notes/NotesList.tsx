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
import { useState } from "react";
import { ParticleField } from "../feedback/ParticleField";
import { PlusIcon } from "../icons/AppIcons";
import { useParticleField } from "../../hooks/useParticleField";
import { centerOverlayToCursor } from "../../lib/dnd/centerOverlayToCursor";
import { useNotesStore } from "../../store/notesStore";
import { useSettingsStore } from "../../store/settingsStore";
import { NoteCard, NoteCardPreview } from "./NoteCard";

export function NotesList() {
  const cards = useNotesStore((state) => state.cards);
  const addCard = useNotesStore((state) => state.addCard);
  const moveCard = useNotesStore((state) => state.moveCard);
  const removeCard = useNotesStore((state) => state.removeCard);
  const enableParticles = useSettingsStore((state) => state.enableParticles);
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragWidth, setActiveDragWidth] = useState<number | null>(null);
  const { bursts, fieldRef, spawnBurst } = useParticleField();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
  );

  const visibleCards = cards.filter((card) => !removingIds.includes(card.id));
  const activeDragCard = cards.find((card) => card.id === activeDragId) ?? null;

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
      spawnBurst(target, "rose");
    }
    setRemovingIds((current) => [...current, id]);
    window.setTimeout(() => {
      removeCard(id);
      setRemovingIds((current) => current.filter((item) => item !== id));
    }, 220);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
    setActiveDragWidth(event.active.rect.current.initial?.width ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    setActiveDragWidth(null);

    if (!event.over || event.active.id === event.over.id) {
      return;
    }

    moveCard(String(event.active.id), String(event.over.id));
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
            No notes yet. Tap the plus button below to start a new card.
          </motion.div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => {
              setActiveDragId(null);
              setActiveDragWidth(null);
            }}
          >
            <SortableContext items={visibleCards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
              <div className="paper-scroll h-full overflow-y-auto pr-1">
                <div className="flex flex-col gap-4">
                  <AnimatePresence>
                    {visibleCards.map((card) => (
                      <NoteCard key={card.id} note={card} onDelete={handleDeleteCard} />
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

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="paper-card flex items-center gap-3 rounded-[22px] px-3 py-3"
      >
        <span className="status-chip shrink-0" data-tone="coral">
          {cards.length} cards
        </span>
        <p className="min-w-0 flex-1 wrap-anywhere text-[12px] font-medium text-[var(--muted)]">
          Drag to sort cards and keep the stack compact.
        </p>
        <motion.button
          type="button"
          aria-label="Add note"
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
