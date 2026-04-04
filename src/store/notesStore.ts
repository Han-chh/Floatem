import { arrayMove } from "@dnd-kit/sortable";
import type { Descendant } from "slate";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { createNoteCard, type NoteCard } from "../lib/models";

type NotesState = {
  cards: NoteCard[];
  isLoaded: boolean;
  initialize: (cards: NoteCard[]) => void;
  addCard: () => NoteCard;
  removeCard: (id: string) => void;
  updateCardTitle: (id: string, title: string) => void;
  updateCardContent: (id: string, content: Descendant[]) => void;
  updateDotColor: (id: string, dotColor: string) => void;
  toggleCollapsed: (id: string) => void;
  moveCard: (activeId: string, overId: string) => void;
  reset: () => void;
};

const initialState = () => ({
  cards: [] as NoteCard[],
  isLoaded: false,
});

function updateCardById(cards: NoteCard[], id: string, updater: (card: NoteCard) => NoteCard) {
  let didChange = false;

  const nextCards = cards.map((card) => {
    if (card.id !== id) {
      return card;
    }

    const nextCard = updater(card);
    didChange ||= nextCard !== card;
    return nextCard;
  });

  return didChange ? nextCards : cards;
}

function isSameContent(left: Descendant[], right: Descendant[]) {
  if (left === right) {
    return true;
  }

  return JSON.stringify(left) === JSON.stringify(right);
}

export const useNotesStore = create<NotesState>()(
  subscribeWithSelector((set) => ({
    ...initialState(),
    initialize: (cards) => {
      set({
        cards,
        isLoaded: true,
      });
    },
    addCard: () => {
      const card = createNoteCard();
      set((state) => ({
        cards: [card, ...state.cards],
      }));
      return card;
    },
    removeCard: (id) => {
      set((state) => ({
        cards: state.cards.filter((card) => card.id !== id),
      }));
    },
    updateCardTitle: (id, title) => {
      set((state) => {
        const cards = updateCardById(state.cards, id, (card) =>
          card.title === title
            ? card
            : {
                ...card,
                title,
                updatedAt: Date.now(),
              },
        );

        return cards === state.cards ? state : { cards };
      });
    },
    updateCardContent: (id, content) => {
      set((state) => {
        const cards = updateCardById(state.cards, id, (card) =>
          isSameContent(card.content, content)
            ? card
            : {
                ...card,
                content,
                updatedAt: Date.now(),
              },
        );

        return cards === state.cards ? state : { cards };
      });
    },
    updateDotColor: (id, dotColor) => {
      set((state) => {
        const cards = updateCardById(state.cards, id, (card) =>
          card.dotColor === dotColor
            ? card
            : {
                ...card,
                dotColor,
              },
        );

        return cards === state.cards ? state : { cards };
      });
    },
    toggleCollapsed: (id) => {
      set((state) => {
        const cards = updateCardById(state.cards, id, (card) => ({
          ...card,
          collapsed: !card.collapsed,
        }));

        return cards === state.cards ? state : { cards };
      });
    },
    moveCard: (activeId, overId) => {
      set((state) => {
        const oldIndex = state.cards.findIndex((card) => card.id === activeId);
        const newIndex = state.cards.findIndex((card) => card.id === overId);

        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
          return state;
        }

        return {
          cards: arrayMove(state.cards, oldIndex, newIndex),
        };
      });
    },
    reset: () => {
      set(initialState());
    },
  })),
);
