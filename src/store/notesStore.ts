import { arrayMove } from "@dnd-kit/sortable";
import type { Descendant } from "slate";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import {
  createEmptyNotesDocument,
  createNoteCard,
  createNoteGroup,
  DEFAULT_UNGROUPED_NOTE_COLOR,
  normalizeNotesDocument,
  type NoteCard,
  type NoteGroup,
  type NotesDocument,
} from "../lib/models";

type NotesState = {
  cards: NoteCard[];
  groups: NoteGroup[];
  isLoaded: boolean;
  initialize: (notes: NoteCard[] | NotesDocument) => void;
  addCard: () => NoteCard;
  removeCard: (id: string) => void;
  updateCardTitle: (id: string, title: string) => void;
  updateCardContent: (id: string, content: Descendant[]) => void;
  assignGroupToCard: (cardId: string, groupId: string | null) => void;
  createGroup: (input: Pick<NoteGroup, "name" | "color">) => NoteGroup;
  updateGroup: (id: string, input: Pick<NoteGroup, "name" | "color">) => void;
  deleteGroup: (id: string) => void;
  toggleCollapsed: (id: string) => void;
  moveCard: (activeId: string, overId: string) => void;
  reset: () => void;
};

const initialState = () => ({
  ...createEmptyNotesDocument(),
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

function updateGroupById(groups: NoteGroup[], id: string, updater: (group: NoteGroup) => NoteGroup) {
  let didChange = false;

  const nextGroups = groups.map((group) => {
    if (group.id !== id) {
      return group;
    }

    const nextGroup = updater(group);
    didChange ||= nextGroup !== group;
    return nextGroup;
  });

  return didChange ? nextGroups : groups;
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
    initialize: (notes) => {
      const normalizedNotes = normalizeNotesDocument(notes);
      set({
        cards: normalizedNotes.cards,
        groups: normalizedNotes.groups,
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
    assignGroupToCard: (cardId, groupId) => {
      set((state) => {
        const matchedGroup = groupId ? state.groups.find((group) => group.id === groupId) ?? null : null;
        const cards = updateCardById(state.cards, cardId, (card) => {
          const nextGroupId = matchedGroup?.id ?? null;

          if (card.groupId === nextGroupId) {
            return card;
          }

          return {
            ...card,
            groupId: nextGroupId,
            dotColor: matchedGroup?.color ?? DEFAULT_UNGROUPED_NOTE_COLOR,
          };
        });

        return cards === state.cards ? state : { cards };
      });
    },
    createGroup: (input) => {
      const group = createNoteGroup({
        name: input.name,
        color: input.color,
      });

      set((state) => ({
        groups: [...state.groups, group],
      }));

      return group;
    },
    updateGroup: (id, input) => {
      set((state) => {
        const previousGroup = state.groups.find((group) => group.id === id);
        if (!previousGroup) {
          return state;
        }

        const nextName = input.name.trim();
        const nextColor = input.color.trim();
        const didChange = previousGroup.name !== nextName || previousGroup.color !== nextColor;

        if (!didChange) {
          return state;
        }

        const updatedAt = Date.now();
        const groups = updateGroupById(state.groups, id, (group) => ({
          ...group,
          name: nextName,
          color: nextColor,
          updatedAt,
        }));
        const cards = state.cards.map((card) =>
          card.groupId === id
            ? {
                ...card,
                dotColor: nextColor,
              }
            : card,
        );

        return {
          groups,
          cards,
        };
      });
    },
    deleteGroup: (id) => {
      set((state) => ({
        groups: state.groups.filter((group) => group.id !== id),
        cards: state.cards.map((card) =>
          card.groupId === id
            ? {
                ...card,
                groupId: null,
                dotColor: DEFAULT_UNGROUPED_NOTE_COLOR,
              }
            : card,
        ),
      }));
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
