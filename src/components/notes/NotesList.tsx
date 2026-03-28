import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { ParticleField } from "../feedback/ParticleField";
import { useParticleField } from "../../hooks/useParticleField";
import { useNotesStore } from "../../store/notesStore";
import { NoteCard } from "./NoteCard";

export function NotesList() {
  const cards = useNotesStore((state) => state.cards);
  const addCard = useNotesStore((state) => state.addCard);
  const moveCard = useNotesStore((state) => state.moveCard);
  const removeCard = useNotesStore((state) => state.removeCard);
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const { bursts, fieldRef, spawnBurst } = useParticleField();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
  );

  const visibleCards = cards.filter((card) => !removingIds.includes(card.id));

  const handleAddCard = (target: DOMRect) => {
    const card = addCard();
    spawnBurst(target, "paper");
    window.requestAnimationFrame(() => {
      document.getElementById(`note-title-${card.id}`)?.focus();
    });
  };

  const handleDeleteCard = (id: string, target: DOMRect) => {
    if (removingIds.includes(id)) {
      return;
    }

    spawnBurst(target, "rose");
    setRemovingIds((current) => [...current, id]);
    window.setTimeout(() => {
      removeCard(id);
      setRemovingIds((current) => current.filter((item) => item !== id));
    }, 220);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!event.over || event.active.id === event.over.id) {
      return;
    }

    moveCard(String(event.active.id), String(event.over.id));
  };

  return (
    <section className="cq-module flex h-full min-h-0 flex-col gap-3">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="paper-card relative overflow-hidden rounded-[24px] px-4 py-4"
      >
        <div className="absolute -right-6 top-0 h-24 w-24 rounded-full bg-[rgba(214,180,138,0.22)] blur-2xl" />
        <div className="module-header-grid relative">
          <div className="module-header-copy">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[rgba(122,89,64,0.08)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--brown)]">
                Notes studio
              </span>
              <span className="rounded-full bg-[rgba(255,255,255,0.56)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                {cards.length} cards
              </span>
            </div>
            <h2 className="font-display text-[clamp(var(--font-section-compact),4.4vw,var(--font-section-expanded))] font-semibold tracking-[-0.02em] text-[var(--brown-strong)]">
              Layered note cards
            </h2>
            <p className="module-header-summary mt-1 text-[12px] text-[var(--muted)]">
              Flexible cards, readable titles, and controls that reflow instead of colliding.
            </p>
          </div>

          <motion.button
            type="button"
            className="module-primary-action paper-button self-start rounded-[16px] px-4 py-2 text-[12px] font-semibold text-[var(--brown-strong)]"
            whileHover={{ y: -2, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={(event) => handleAddCard(event.currentTarget.getBoundingClientRect())}
          >
            Add note
          </motion.button>
        </div>
      </motion.div>

      <div ref={fieldRef} className="relative min-h-0 flex-1">
        <ParticleField bursts={bursts} />

        {visibleCards.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="paper-card flex h-full items-center justify-center rounded-[24px] px-8 text-center text-[13px] leading-7 text-[var(--muted)]"
          >
            The note surface is ready. Add the first card to see layered entry motion and particle feedback.
          </motion.div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={visibleCards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-4">
                <AnimatePresence>
                  {visibleCards.map((card) => (
                    <NoteCard key={card.id} note={card} onDelete={handleDeleteCard} />
                  ))}
                </AnimatePresence>
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </section>
  );
}
