import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { createTodoItem, type TodoItem } from "../lib/models";

type TodosState = {
  todos: TodoItem[];
  isLoaded: boolean;
  initialize: (todos: TodoItem[]) => void;
  addTodo: (text: string) => TodoItem | null;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
  setReminder: (id: string, reminderAt: number | null) => void;
  reset: () => void;
};

const initialState = () => ({
  todos: [] as TodoItem[],
  isLoaded: false,
});

export const useTodosStore = create<TodosState>()(
  subscribeWithSelector((set) => ({
    ...initialState(),
    initialize: (todos) => {
      set({
        todos,
        isLoaded: true,
      });
    },
    addTodo: (text) => {
      const cleanText = text.trim();
      if (!cleanText) {
        return null;
      }

      const todo = createTodoItem(cleanText);
      set((state) => ({
        todos: [todo, ...state.todos],
      }));
      return todo;
    },
    toggleTodo: (id) => {
      set((state) => ({
        todos: state.todos.map((todo) =>
          todo.id === id
            ? {
                ...todo,
                done: !todo.done,
              }
            : todo,
        ),
      }));
    },
    removeTodo: (id) => {
      set((state) => ({
        todos: state.todos.filter((todo) => todo.id !== id),
      }));
    },
    setReminder: (id, reminderAt) => {
      set((state) => ({
        todos: state.todos.map((todo) =>
          todo.id === id
            ? {
                ...todo,
                reminderAt,
              }
            : todo,
        ),
      }));
    },
    reset: () => {
      set(initialState());
    },
  })),
);
