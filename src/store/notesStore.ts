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
      set((state) => ({
        cards: state.cards.map((card) =>
          card.id === id
            ? {
                ...card,
                title,
                updatedAt: Date.now(),
              }
            : card,
        ),
      }));
    },
    updateCardContent: (id, content) => {
      set((state) => ({
        cards: state.cards.map((card) =>
          card.id === id
            ? {
                ...card,
                content,
                updatedAt: Date.now(),
              }
            : card,
        ),
      }));
    },
    updateDotColor: (id, dotColor) => {
      set((state) => ({
        cards: state.cards.map((card) =>
          card.id === id
            ? {
                ...card,
                dotColor,
                updatedAt: Date.now(),
              }
            : card,
        ),
      }));
    },
    toggleCollapsed: (id) => {
      set((state) => ({
        cards: state.cards.map((card) =>
          card.id === id
            ? {
                ...card,
                collapsed: !card.collapsed,
                updatedAt: Date.now(),
              }
            : card,
        ),
      }));
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
