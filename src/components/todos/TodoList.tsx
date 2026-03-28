import { useState } from "react";
import { useTodosStore } from "../../store/todosStore";
import { TodoItem } from "./TodoItem";

export function TodoList() {
  const todos = useTodosStore((state) => state.todos);
  const addTodo = useTodosStore((state) => state.addTodo);
  const [draft, setDraft] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const created = addTodo(draft);
    if (created) {
      setDraft("");
    }
  };

  return (
    <section className="flex h-full flex-col gap-3">
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--cream)] px-3 py-3">
        <h2 className="text-[14px] font-semibold text-[var(--brown)]">Todos</h2>
        <p className="mt-1 text-[11px] text-[var(--muted)]">Quick capture, toggles, and reminder scaffolding are in place.</p>
      </div>

      <div className="paper-scroll flex-1 overflow-y-auto">
        {todos.length === 0 ? (
          <div className="flex h-full min-h-52 items-center justify-center rounded-[14px] border border-dashed border-[var(--border)] bg-[var(--cream)]/70 px-6 text-center text-[12px] leading-6 text-[var(--muted)]">
            The todo module is ready for the next step. Add an item below to test complete and delete flows.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {todos.map((todo) => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
          </div>
        )}
      </div>

      <form className="rounded-[14px] border border-[var(--border)] bg-[var(--cream)] p-3" onSubmit={handleSubmit}>
        <label htmlFor="todo-input" className="mb-2 block text-[11px] font-medium text-[var(--muted)]">
          Quick add
        </label>
        <div className="flex items-center gap-2">
          <input
            id="todo-input"
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            placeholder="Press Enter to add the next task..."
            className="flex-1 rounded-[8px] border border-[var(--border)] bg-[var(--sand)] px-3 py-2 text-[13px] text-[var(--dark-text)] outline-none placeholder:text-[var(--muted)]"
          />
          <button
            type="submit"
            className="rounded-[8px] border border-[var(--border)] bg-[var(--sand)] px-3 py-2 text-[12px] font-medium text-[var(--dark-text)]"
          >
            Add
          </button>
        </div>
      </form>
    </section>
  );
}
