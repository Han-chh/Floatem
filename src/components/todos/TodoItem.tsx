import { format, isPast, isToday } from "date-fns";
import type { TodoItem as TodoItemModel } from "../../lib/models";
import { useTodosStore } from "../../store/todosStore";
import { ReminderPicker } from "./ReminderPicker";

type TodoItemProps = {
  todo: TodoItemModel;
};

function reminderColor(reminderAt: number | null) {
  if (!reminderAt) {
    return "text-[var(--muted)]";
  }

  const date = new Date(reminderAt);
  if (isPast(date) && !isToday(date)) {
    return "text-red-500";
  }
  if (isToday(date)) {
    return "text-[var(--orange-dot)]";
  }
  return "text-[var(--green-dot)]";
}

export function TodoItem({ todo }: TodoItemProps) {
  const toggleTodo = useTodosStore((state) => state.toggleTodo);
  const removeTodo = useTodosStore((state) => state.removeTodo);
  const setReminder = useTodosStore((state) => state.setReminder);

  return (
    <article
      data-state={todo.done ? "done" : "open"}
      className={`rounded-[14px] border border-[var(--border)] bg-[var(--cream)] p-3 transition ${
        todo.done ? "opacity-55" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-label="Mark todo as done"
          aria-pressed={todo.done}
          className={`mt-0.5 h-5 w-5 rounded-full border border-[var(--border)] transition ${
            todo.done ? "bg-[var(--brown)]" : "bg-transparent"
          }`}
          onClick={() => toggleTodo(todo.id)}
        />
        <div className="min-w-0 flex-1">
          <p className={`break-words text-[13px] text-[var(--dark-text)] ${todo.done ? "line-through" : ""}`}>
            {todo.text}
          </p>
          <p className={`mt-1 text-[11px] ${reminderColor(todo.reminderAt)}`}>
            {todo.reminderAt ? format(new Date(todo.reminderAt), "MMM d, HH:mm") : "No reminder set"}
          </p>
          <div className="mt-2">
            <ReminderPicker reminderAt={todo.reminderAt} onChange={(value) => setReminder(todo.id, value)} />
          </div>
        </div>
        <button
          type="button"
          aria-label="Delete todo"
          className="rounded-[8px] border border-[var(--border)] bg-[var(--sand)] px-2 py-1 text-[11px] text-[var(--orange-dot)] opacity-80 transition hover:opacity-100"
          onClick={() => removeTodo(todo.id)}
        >
          Delete
        </button>
      </div>
    </article>
  );
}
