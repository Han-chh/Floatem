import { beforeEach, describe, expect, it } from "vitest";
import { createNoteGroup } from "../../src/lib/models";
import { useNotesStore } from "../../src/store/notesStore";
import { useTodosStore } from "../../src/store/todosStore";

describe("todosStore", () => {
  beforeEach(() => {
    useNotesStore.getState().reset();
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

  it("completes, deletes, and moves selected todos in batches", () => {
    useTodosStore.getState().initialize([]);
    useTodosStore.getState().selectDate("2026-05-12");
    const first = useTodosStore.getState().addTodo("First");
    const second = useTodosStore.getState().addTodo("Second");
    const third = useTodosStore.getState().addTodo("Third");

    useTodosStore.getState().completeTodos([first!.id, third!.id]);
    expect(useTodosStore.getState().todos.map((todo) => `${todo.text}:${todo.done}`)).toEqual([
      "Second:false",
      "First:true",
      "Third:true",
    ]);

    useTodosStore.getState().moveTodosToDate([first!.id, second!.id], "2026-05-13");
    expect(useTodosStore.getState().todos.filter((todo) => todo.dateKey === "2026-05-13").map((todo) => todo.text)).toEqual([
      "Second",
      "First",
    ]);

    useTodosStore.getState().removeTodos([second!.id, third!.id]);
    expect(useTodosStore.getState().todos.map((todo) => todo.text)).toEqual(["First"]);
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

  it("manages todo groups independently from note groups", () => {
    useNotesStore.getState().initialize({
      cards: [],
      groups: [createNoteGroup({ id: "Work", name: "Work", color: "#FF7A59" })],
    });
    useTodosStore.getState().initialize([]);
    const todo = useTodosStore.getState().addTodo("Grouped task");

    const group = useTodosStore.getState().createGroup({ name: "Work", color: "#2F6BFF" });

    expect(group).not.toBeNull();
    expect(useNotesStore.getState().groups[0]?.color).toBe("#FF7A59");
    expect(useTodosStore.getState().groups[0]?.color).toBe("#2F6BFF");

    useTodosStore.getState().assignGroupToTodo(todo!.id, group!.id);
    expect(useTodosStore.getState().todos[0]?.groupId).toBe("Work");

    expect(useTodosStore.getState().updateGroup("Work", { name: "Errands", color: "#1FA87A" })).toBe(true);
    expect(useTodosStore.getState().todos[0]?.groupId).toBe("Errands");
    expect(useNotesStore.getState().groups[0]?.id).toBe("Work");

    useTodosStore.getState().deleteGroup("Errands");
    expect(useTodosStore.getState().todos[0]?.groupId).toBeNull();
    expect(useNotesStore.getState().groups).toHaveLength(1);
  });
});
