import { arrayMove } from "@dnd-kit/sortable";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { createTodoItem, type TodoItem } from "../lib/models";

type TodosState = {
  todos: TodoItem[];
  isLoaded: boolean;
  initialize: (todos: TodoItem[]) => void;
  addTodo: (text: string) => TodoItem | null;
  toggleTodo: (id: string) => void;
  moveTodo: (activeId: string, overId: string) => void;
  removeTodo: (id: string) => void;
  setReminder: (id: string, reminderAt: number | null) => void;
  reset: () => void;
};

function partitionTodos(todos: TodoItem[]) {
  const openTodos = todos.filter((todo) => !todo.done);
  const doneTodos = todos.filter((todo) => todo.done);
  return { openTodos, doneTodos };
}

const initialState = () => ({
  todos: [] as TodoItem[],
  isLoaded: false,
});

export const useTodosStore = create<TodosState>()(
  subscribeWithSelector((set) => ({
    ...initialState(),
    initialize: (todos) => {
      const { openTodos, doneTodos } = partitionTodos(todos);
      set({
        todos: [...openTodos, ...doneTodos],
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
        todos: (() => {
          const { openTodos, doneTodos } = partitionTodos(state.todos);
          return [...openTodos, todo, ...doneTodos];
        })(),
      }));
      return todo;
    },
    toggleTodo: (id) => {
      set((state) => {
        const target = state.todos.find((todo) => todo.id === id);
        if (!target) {
          return state;
        }

        const rest = state.todos.filter((todo) => todo.id !== id);
        const { openTodos, doneTodos } = partitionTodos(rest);
        const nextTodo = {
          ...target,
          done: !target.done,
        };

        return {
          todos: target.done
            ? [...openTodos, nextTodo, ...doneTodos]
            : [...openTodos, ...doneTodos, nextTodo],
        };
      });
    },
    moveTodo: (activeId, overId) => {
      if (activeId === overId) {
        return;
      }

      set((state) => {
        const { openTodos, doneTodos } = partitionTodos(state.todos);
        const activeIndex = openTodos.findIndex((todo) => todo.id === activeId);
        const overIndex = openTodos.findIndex((todo) => todo.id === overId);

        if (activeIndex < 0 || overIndex < 0) {
          return state;
        }

        return {
          todos: [...arrayMove(openTodos, activeIndex, overIndex), ...doneTodos],
        };
      });
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
