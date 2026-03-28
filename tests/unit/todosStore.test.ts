import { describe, expect, it } from "vitest";
import { useTodosStore } from "../../src/store/todosStore";

describe("todosStore", () => {
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
});
