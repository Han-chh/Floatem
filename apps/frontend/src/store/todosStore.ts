import { arrayMove } from "@dnd-kit/sortable";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { createTodoItem, formatLocalDateKey, normalizeTodoItem, type TodoItem } from "../lib/models";
import { isFutureReminderTimestamp } from "../lib/reminders";

type TodosState = {
  todos: TodoItem[];
  selectedDateKey: string;
  isLoaded: boolean;
  initialize: (todos: TodoItem[]) => void;
  addTodo: (text: string) => TodoItem | null;
  selectDate: (dateKey: string) => void;
  updateTodoText: (id: string, text: string) => boolean;
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
  selectedDateKey: formatLocalDateKey(new Date()),
  isLoaded: false,
});

function replaceTodosForDate(todos: TodoItem[], dateKey: string, nextTodosForDate: TodoItem[]) {
  return [...todos.filter((todo) => todo.dateKey !== dateKey), ...nextTodosForDate];
}

export const useTodosStore = create<TodosState>()(
  subscribeWithSelector((set) => ({
    ...initialState(),
    initialize: (todos) => {
      const fallbackDateKey = formatLocalDateKey(new Date());
      const normalizedTodos = todos.map((todo) => normalizeTodoItem(todo, fallbackDateKey));
      const { openTodos, doneTodos } = partitionTodos(normalizedTodos);
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

      let createdTodo: TodoItem | null = null;
      set((state) => ({
        todos: (() => {
          const todo = createTodoItem(cleanText, { dateKey: state.selectedDateKey });
          createdTodo = todo;
          const todosForDate = state.todos.filter((item) => item.dateKey === state.selectedDateKey);
          const { openTodos, doneTodos } = partitionTodos(todosForDate);
          return replaceTodosForDate(state.todos, state.selectedDateKey, [...openTodos, todo, ...doneTodos]);
        })(),
      }));
      return createdTodo;
    },
    selectDate: (dateKey) => {
      set({
        selectedDateKey: /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? dateKey : formatLocalDateKey(new Date()),
      });
    },
    updateTodoText: (id, text) => {
      const cleanText = text.trim();
      if (!cleanText) {
        return false;
      }

      let updated = false;
      set((state) => ({
        todos: state.todos.map((todo) => {
          if (todo.id !== id) {
            return todo;
          }

          updated = true;
          return {
            ...todo,
            text: cleanText,
          };
        }),
      }));
      return updated;
    },
    toggleTodo: (id) => {
      set((state) => {
        const target = state.todos.find((todo) => todo.id === id);
        if (!target) {
          return state;
        }

        const rest = state.todos.filter((todo) => todo.id !== id && todo.dateKey === target.dateKey);
        const { openTodos, doneTodos } = partitionTodos(rest);
        const nextTodo = {
          ...target,
          done: !target.done,
        };

        return {
          todos: replaceTodosForDate(
            state.todos,
            target.dateKey,
            target.done ? [...openTodos, nextTodo, ...doneTodos] : [...openTodos, ...doneTodos, nextTodo],
          ),
        };
      });
    },
    moveTodo: (activeId, overId) => {
      if (activeId === overId) {
        return;
      }

      set((state) => {
        const activeTodo = state.todos.find((todo) => todo.id === activeId);
        const overTodo = state.todos.find((todo) => todo.id === overId);

        if (!activeTodo || !overTodo || activeTodo.dateKey !== overTodo.dateKey) {
          return state;
        }

        const todosForDate = state.todos.filter((todo) => todo.dateKey === activeTodo.dateKey);
        const { openTodos, doneTodos } = partitionTodos(todosForDate);
        const activeIndex = openTodos.findIndex((todo) => todo.id === activeId);
        const overIndex = openTodos.findIndex((todo) => todo.id === overId);

        if (activeIndex < 0 || overIndex < 0) {
          return state;
        }

        return {
          todos: replaceTodosForDate(state.todos, activeTodo.dateKey, [
            ...arrayMove(openTodos, activeIndex, overIndex),
            ...doneTodos,
          ]),
        };
      });
    },
    removeTodo: (id) => {
      set((state) => ({
        todos: state.todos.filter((todo) => todo.id !== id),
      }));
    },
    setReminder: (id, reminderAt) => {
      if (!isFutureReminderTimestamp(reminderAt)) {
        return;
      }

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
