import { beforeEach, describe, expect, it } from "vitest";
import { useTodosStore } from "../../src/store/todosStore";

describe("todosStore", () => {
  beforeEach(() => {
    useTodosStore.getState().reset();
  });

  it("adds, toggles, and removes todos", () => {
    const created = useTodosStore.getState().addTodo("Ship alpha");
    expect(created).not.toBeNull();
    expect(useTodosStore.getState().todos).toHaveLength(1);

    useTodosStore.getState().toggleTodo(created!.id);
    expect(useTodosStore.getState().todos[0]?.done).toBe(true);

    useTodosStore.getState().removeTodo(created!.id);
    expect(useTodosStore.getState().todos).toHaveLength(0);
  });

  it("stores reminder timestamps", () => {
    const created = useTodosStore.getState().addTodo("With reminder");
    const reminderAt = Date.now() + 60_000;

    useTodosStore.getState().setReminder(created!.id, reminderAt);
    expect(useTodosStore.getState().todos[0]?.reminderAt).toBe(reminderAt);
  });

  it("updates todo text with trimmed non-empty titles", () => {
    const created = useTodosStore.getState().addTodo("Original title");

    expect(useTodosStore.getState().updateTodoText(created!.id, "  Updated title  ")).toBe(true);
    expect(useTodosStore.getState().todos[0]?.text).toBe("Updated title");

    expect(useTodosStore.getState().updateTodoText(created!.id, "   ")).toBe(false);
    expect(useTodosStore.getState().todos[0]?.text).toBe("Updated title");
  });

  it("does not report success when updating a missing todo", () => {
    expect(useTodosStore.getState().updateTodoText("missing", "Updated title")).toBe(false);
  });

  it("rejects reminder timestamps earlier than now", () => {
    const created = useTodosStore.getState().addTodo("Past reminder");
    const reminderAt = Date.now() - 60_000;

    useTodosStore.getState().setReminder(created!.id, reminderAt);
    expect(useTodosStore.getState().todos[0]?.reminderAt).toBeNull();
  });

  it("keeps completed todos at the bottom and restored todos at the open tail", () => {
    useTodosStore.getState().initialize([]);
    const first = useTodosStore.getState().addTodo("First open");
    useTodosStore.getState().addTodo("Second open");

    useTodosStore.getState().toggleTodo(first!.id);
    expect(useTodosStore.getState().todos.map((todo) => `${todo.text}:${todo.done}`)).toEqual([
      "Second open:false",
      "First open:true",
    ]);

    useTodosStore.getState().toggleTodo(first!.id);
    expect(useTodosStore.getState().todos.map((todo) => `${todo.text}:${todo.done}`)).toEqual([
      "Second open:false",
      "First open:false",
    ]);
  });

  it("reorders only open todos", () => {
    useTodosStore.getState().initialize([]);
    const first = useTodosStore.getState().addTodo("Alpha");
    const second = useTodosStore.getState().addTodo("Beta");
    const third = useTodosStore.getState().addTodo("Gamma");

    useTodosStore.getState().toggleTodo(second!.id);
    useTodosStore.getState().moveTodo(third!.id, first!.id);

    expect(useTodosStore.getState().todos.map((todo) => `${todo.text}:${todo.done}`)).toEqual([
      "Gamma:false",
      "Alpha:false",
      "Beta:true",
    ]);
  });

  it("keeps separate todo card records for each selected date", () => {
    useTodosStore.getState().initialize([]);
    useTodosStore.getState().selectDate("2026-05-12");
    const today = useTodosStore.getState().addTodo("Today task");

    useTodosStore.getState().selectDate("2026-05-13");
    const tomorrow = useTodosStore.getState().addTodo("Tomorrow task");
    useTodosStore.getState().toggleTodo(tomorrow!.id);

    const todos = useTodosStore.getState().todos;
    expect(todos.filter((todo) => todo.dateKey === "2026-05-12").map((todo) => todo.text)).toEqual([
      "Today task",
    ]);
    expect(todos.filter((todo) => todo.dateKey === "2026-05-13").map((todo) => `${todo.text}:${todo.done}`)).toEqual([
      "Tomorrow task:true",
    ]);
    expect(today?.dateKey).toBe("2026-05-12");
    expect(tomorrow?.dateKey).toBe("2026-05-13");
  });
});
