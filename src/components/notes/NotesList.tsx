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
import { NotebookPenIcon, SparklesIcon, SquarePenIcon } from "../icons/AppIcons";
import { useParticleField } from "../../hooks/useParticleField";
import { useNotesStore } from "../../store/notesStore";
import { useSettingsStore } from "../../store/settingsStore";
import { NoteCard } from "./NoteCard";

export function NotesList() {
  const cards = useNotesStore((state) => state.cards);
  const addCard = useNotesStore((state) => state.addCard);
  const moveCard = useNotesStore((state) => state.moveCard);
  const removeCard = useNotesStore((state) => state.removeCard);
  const enableParticles = useSettingsStore((state) => state.enableParticles);
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
        className="relative overflow-hidden rounded-[26px] border border-[rgba(213,198,180,0.92)] bg-[linear-gradient(150deg,#fff2de_0%,#ffffff_42%,#f6f4ff_100%)] px-4 py-4 shadow-[0_18px_38px_rgba(61,49,34,0.10)]"
      >
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,var(--accent-coral),var(--accent-cobalt),var(--accent-jade))]" />
        <div className="absolute -right-6 top-0 h-24 w-24 rounded-full bg-[rgba(123,92,250,0.14)] blur-2xl" />
        <div className="module-header-grid relative">
          <div className="module-header-copy">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="status-chip" data-tone="plum">
                <SparklesIcon size={12} />
                Focus mode
              </span>
              <span className="status-chip" data-tone="coral">
                {cards.length} active cards
              </span>
            </div>
            <h2 className="font-display max-w-[13ch] text-[clamp(24px,6vw,30px)] font-semibold leading-[1.04] tracking-[-0.05em] text-[var(--brown-strong)]">
              Notes, without the clutter.
            </h2>
            <p className="module-header-summary mt-2 max-w-[30ch] text-[13px] leading-6 text-[var(--muted)]">
              Strong contrast, richer color, and icon-led note controls that stay readable while the panel compresses.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <motion.button
              type="button"
              aria-label="Add note"
              className="module-primary-action paper-button paper-button-primary inline-flex items-center gap-2 self-start rounded-[18px] px-4 py-3 text-[12px] font-semibold"
              whileHover={{ y: -2, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={(event) => handleAddCard(event.currentTarget.getBoundingClientRect())}
            >
              <SquarePenIcon size={16} />
              <span className="wrap-anywhere">New note</span>
            </motion.button>

            <div className="inline-flex min-w-0 items-center gap-2 rounded-[18px] border border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.10)] px-3 py-3 text-[12px] font-semibold text-[#2853C7]">
              <NotebookPenIcon size={16} />
              <span className="wrap-anywhere">Responsive card stack</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div ref={fieldRef} className="relative min-h-0 flex-1">
        <ParticleField bursts={enableParticles ? bursts : []} />

        {visibleCards.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="paper-card flex h-full flex-col items-center justify-center gap-4 rounded-[26px] px-8 text-center text-[13px] leading-7 text-[var(--muted)]"
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-[rgba(255,122,89,0.12)] text-[var(--orange-dot)]">
              <NotebookPenIcon size={22} />
            </span>
            <p className="max-w-[26ch]">
              The note surface is ready. Add the first card to see the richer note hierarchy and particle feedback in motion.
            </p>
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
