import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useNotesStore } from "../../store/notesStore";
import { NoteCard } from "./NoteCard";

export function NotesList() {
  const cards = useNotesStore((state) => state.cards);
  const addCard = useNotesStore((state) => state.addCard);
  const moveCard = useNotesStore((state) => state.moveCard);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
  );

  const handleAddCard = () => {
    const card = addCard();
    window.requestAnimationFrame(() => {
      document.getElementById(`note-title-${card.id}`)?.focus();
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!event.over || event.active.id === event.over.id) {
      return;
    }

    moveCard(String(event.active.id), String(event.over.id));
  };

  return (
    <section className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between rounded-[14px] border border-[var(--border)] bg-[var(--cream)] px-3 py-3">
        <div>
          <h2 className="text-[14px] font-semibold text-[var(--brown)]">Notes</h2>
          <p className="mt-1 text-[11px] text-[var(--muted)]">Rich note cards, ready for Slate and drag sorting.</p>
        </div>
        <button
          type="button"
          className="rounded-[8px] border border-[var(--border)] bg-[var(--sand)] px-3 py-2 text-[12px] font-medium text-[var(--dark-text)]"
          onClick={handleAddCard}
        >
          Add note
        </button>
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-[14px] border border-dashed border-[var(--border)] bg-[var(--cream)]/70 px-6 text-center text-[12px] leading-6 text-[var(--muted)]">
          The notes module is scaffolded. Add the first card to start wiring in full Slate tools next.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {cards.map((card) => (
                <NoteCard key={card.id} note={card} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
