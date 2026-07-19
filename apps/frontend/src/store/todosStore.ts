import { arrayMove } from "@dnd-kit/sortable";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import {
  createEmptyTodosDocument,
  createTodoGroup,
  createTodoItem,
  formatLocalDateKey,
  normalizeTodosDocument,
  type TodoGroup,
  type TodoItem,
  type TodosDocument,
} from "../lib/models";
import { isFutureReminderTimestamp } from "../lib/reminders";

type TodosState = {
  todos: TodoItem[];
  groups: TodoGroup[];
  floatingTodoIds: string[];
  selectedDateKey: string;
  isLoaded: boolean;
  initialize: (todos: TodoItem[] | TodosDocument) => void;
  addTodo: (text: string) => TodoItem | null;
  selectDate: (dateKey: string) => void;
  updateTodoText: (id: string, text: string) => boolean;
  assignGroupToTodo: (todoId: string, groupId: string | null) => void;
  createGroup: (input: Pick<TodoGroup, "name" | "color">) => TodoGroup | null;
  updateGroup: (id: string, input: Pick<TodoGroup, "name" | "color">) => boolean;
  deleteGroup: (id: string) => void;
  toggleTodo: (id: string) => void;
  completeTodos: (ids: string[]) => void;
  moveTodo: (activeId: string, overId: string) => void;
  moveTodoToIndex: (activeId: string, insertionIndex: number, visibleTodoIds?: string[]) => void;
  moveTodosToDate: (ids: string[], dateKey: string) => void;
  removeTodo: (id: string) => void;
  removeTodos: (ids: string[]) => void;
  setReminder: (id: string, reminderAt: number | null) => void;
  setFloatingTodoIds: (ids: string[]) => void;
  reset: () => void;
};

function partitionTodos(todos: TodoItem[]) {
  const openTodos = todos.filter((todo) => !todo.done);
  const doneTodos = todos.filter((todo) => todo.done);
  return { openTodos, doneTodos };
}

const initialState = () => ({
  todos: [] as TodoItem[],
  groups: createEmptyTodosDocument().groups,
  floatingTodoIds: [] as string[],
  selectedDateKey: formatLocalDateKey(new Date()),
  isLoaded: false,
});

function updateTodoById(todos: TodoItem[], id: string, updater: (todo: TodoItem) => TodoItem) {
  let didChange = false;

  const nextTodos = todos.map((todo) => {
    if (todo.id !== id) {
      return todo;
    }

    const nextTodo = updater(todo);
    didChange ||= nextTodo !== todo;
    return nextTodo;
  });

  return didChange ? nextTodos : todos;
}

function updateGroupById(groups: TodoGroup[], id: string, updater: (group: TodoGroup) => TodoGroup) {
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

function normalizeGroupNameKey(name: string) {
  return name.trim().toLocaleLowerCase();
}

function hasConflictingGroupName(groups: TodoGroup[], name: string, excludedId?: string) {
  const normalizedName = normalizeGroupNameKey(name);

  return groups.some((group) => {
    if (group.id === excludedId) {
      return false;
    }

    return normalizeGroupNameKey(group.name) === normalizedName;
  });
}

function replaceTodosForDate(todos: TodoItem[], dateKey: string, nextTodosForDate: TodoItem[]) {
  return [...todos.filter((todo) => todo.dateKey !== dateKey), ...nextTodosForDate];
}

function normalizeTodosForDates(todos: TodoItem[], dateKeys: Iterable<string>) {
  let nextTodos = todos;

  for (const dateKey of dateKeys) {
    const todosForDate = nextTodos.filter((todo) => todo.dateKey === dateKey);
    const { openTodos, doneTodos } = partitionTodos(todosForDate);
    nextTodos = replaceTodosForDate(nextTodos, dateKey, [...openTodos, ...doneTodos]);
  }

  return nextTodos;
}

export const useTodosStore = create<TodosState>()(
  subscribeWithSelector((set) => ({
    ...initialState(),
    initialize: (todos) => {
      const normalizedDocument = normalizeTodosDocument(todos);
      const normalizedTodos = normalizedDocument.items;
      const { openTodos, doneTodos } = partitionTodos(normalizedTodos);
      set({
        todos: [...openTodos, ...doneTodos],
        groups: normalizedDocument.groups,
        floatingTodoIds: [],
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
    assignGroupToTodo: (todoId, groupId) => {
      set((state) => {
        const matchedGroup = groupId ? state.groups.find((group) => group.id === groupId) ?? null : null;
        const todos = updateTodoById(state.todos, todoId, (todo) => {
          const nextGroupId = matchedGroup?.id ?? null;

          return todo.groupId === nextGroupId
            ? todo
            : {
                ...todo,
                groupId: nextGroupId,
              };
        });

        return todos === state.todos ? state : { todos };
      });
    },
    createGroup: (input) => {
      const nextName = input.name.trim();
      let group: TodoGroup | null = null;

      set((state) => {
        if (!nextName || hasConflictingGroupName(state.groups, nextName)) {
          return state;
        }

        group = createTodoGroup({
          id: nextName,
          name: nextName,
          color: input.color,
        });

        return {
          groups: [...state.groups, group],
        };
      });

      return group;
    },
    updateGroup: (id, input) => {
      let didSucceed = false;

      set((state) => {
        const previousGroup = state.groups.find((group) => group.id === id);
        if (!previousGroup) {
          return state;
        }

        const nextName = input.name.trim();
        if (!nextName || hasConflictingGroupName(state.groups, nextName, id)) {
          return state;
        }

        const nextColor = input.color.trim();
        const nextId = nextName;
        const didChange =
          previousGroup.id !== nextId || previousGroup.name !== nextName || previousGroup.color !== nextColor;
        didSucceed = true;

        if (!didChange) {
          return state;
        }

        const updatedAt = Date.now();
        const groups = updateGroupById(state.groups, id, (group) => ({
          ...group,
          id: nextId,
          name: nextName,
          color: nextColor,
          updatedAt,
        }));
        const todos = state.todos.map((todo) =>
          todo.groupId === id
            ? {
                ...todo,
                groupId: nextId,
              }
            : todo,
        );

        return {
          groups,
          todos,
        };
      });

      return didSucceed;
    },
    deleteGroup: (id) => {
      set((state) => ({
        groups: state.groups.filter((group) => group.id !== id),
        todos: state.todos.map((todo) =>
          todo.groupId === id
            ? {
                ...todo,
                groupId: null,
              }
            : todo,
        ),
      }));
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
    completeTodos: (ids) => {
      const targetIds = new Set(ids);
      if (targetIds.size === 0) {
        return;
      }

      set((state) => {
        const affectedDateKeys = new Set<string>();
        const todos = state.todos.map((todo) => {
          if (!targetIds.has(todo.id)) {
            return todo;
          }

          affectedDateKeys.add(todo.dateKey);
          return {
            ...todo,
            done: true,
          };
        });

        return {
          todos: normalizeTodosForDates(todos, affectedDateKeys),
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
    moveTodoToIndex: (activeId, insertionIndex, visibleTodoIds) => {
      set((state) => {
        const activeTodo = state.todos.find((todo) => todo.id === activeId);
        if (!activeTodo || activeTodo.done) {
          return state;
        }

        const todosForDate = state.todos.filter((todo) => todo.dateKey === activeTodo.dateKey);
        const { openTodos, doneTodos } = partitionTodos(todosForDate);
        const remainingOpenTodos = openTodos.filter((todo) => todo.id !== activeId);
        const visibleIds = visibleTodoIds?.filter(
          (id, index) =>
            id !== activeId &&
            visibleTodoIds.indexOf(id) === index &&
            remainingOpenTodos.some((todo) => todo.id === id),
        );
        const visibleIndex = Math.min(
          Math.max(Math.round(insertionIndex), 0),
          visibleIds?.length ?? remainingOpenTodos.length,
        );
        let targetIndex = visibleIndex;

        if (visibleIds?.length) {
          const insertBeforeFirst = visibleIndex === 0;
          const anchorId = insertBeforeFirst ? visibleIds[0] : visibleIds[visibleIndex - 1];
          const anchorIndex = remainingOpenTodos.findIndex((todo) => todo.id === anchorId);
          targetIndex = insertBeforeFirst ? anchorIndex : anchorIndex + 1;
        }

        const reorderedOpenTodos = [...remainingOpenTodos];
        reorderedOpenTodos.splice(targetIndex, 0, activeTodo);
        const todos = replaceTodosForDate(state.todos, activeTodo.dateKey, [
          ...reorderedOpenTodos,
          ...doneTodos,
        ]);

        return todos.every((todo, index) => todo.id === state.todos[index]?.id) ? state : { todos };
      });
    },
    moveTodosToDate: (ids, dateKey) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        return;
      }

      const targetIds = new Set(ids);
      if (targetIds.size === 0) {
        return;
      }

      set((state) => {
        const affectedDateKeys = new Set<string>([dateKey]);
        const todos = state.todos.map((todo) => {
          if (!targetIds.has(todo.id)) {
            return todo;
          }

          affectedDateKeys.add(todo.dateKey);
          return {
            ...todo,
            dateKey,
          };
        });

        return {
          todos: normalizeTodosForDates(todos, affectedDateKeys),
        };
      });
    },
    removeTodo: (id) => {
      set((state) => ({
        todos: state.todos.filter((todo) => todo.id !== id),
      }));
    },
    removeTodos: (ids) => {
      const targetIds = new Set(ids);
      if (targetIds.size === 0) {
        return;
      }

      set((state) => ({
        todos: state.todos.filter((todo) => !targetIds.has(todo.id)),
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
    setFloatingTodoIds: (ids) => {
      set((state) => {
        const validIds = new Set(state.todos.map((todo) => todo.id));
        const nextIds = ids.filter((id, index) => validIds.has(id) && ids.indexOf(id) === index);
        const isUnchanged =
          nextIds.length === state.floatingTodoIds.length &&
          nextIds.every((id, index) => id === state.floatingTodoIds[index]);

        return isUnchanged ? state : { floatingTodoIds: nextIds };
      });
    },
    reset: () => {
      set(initialState());
    },
  })),
);
