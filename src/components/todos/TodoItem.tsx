import { motion } from "framer-motion";
import { format, isPast, isToday } from "date-fns";
import type { TodoItem as TodoItemModel } from "../../lib/models";
import { useTodosStore } from "../../store/todosStore";
import { ReminderPicker } from "./ReminderPicker";

type TodoItemProps = {
  todo: TodoItemModel;
  onDelete: (id: string, target: DOMRect) => void;
  onToggle: (id: string, target: DOMRect, nextDone: boolean) => void;
};

function getStatusMeta(todo: TodoItemModel) {
  if (todo.done) {
    return {
      label: "done",
      textClass: "text-[var(--status-done)]",
      pillClass: "bg-[var(--status-done-soft)] text-[var(--status-done)]",
      tone: "bg-[linear-gradient(180deg,rgba(93,141,104,0.98),rgba(72,112,82,0.92))] text-white",
      rail: "linear-gradient(180deg, rgba(93,141,104,0.95), rgba(93,141,104,0.28))",
    };
  }

  if (!todo.reminderAt) {
    return {
      label: "open",
      textClass: "text-[var(--status-open)]",
      pillClass: "bg-[var(--status-open-soft)] text-[var(--status-open)]",
      tone: "bg-[rgba(255,255,255,0.72)] text-transparent",
      rail: "linear-gradient(180deg, rgba(138,97,63,0.9), rgba(138,97,63,0.2))",
    };
  }

  const date = new Date(todo.reminderAt);
  if (isPast(date) && !isToday(date)) {
    return {
      label: "overdue",
      textClass: "text-[var(--status-overdue)]",
      pillClass: "bg-[var(--status-overdue-soft)] text-[var(--status-overdue)]",
      tone: "bg-[rgba(255,255,255,0.72)] text-transparent",
      rail: "linear-gradient(180deg, rgba(181,74,77,0.95), rgba(181,74,77,0.22))",
    };
  }

  if (isToday(date)) {
    return {
      label: "today",
      textClass: "text-[var(--status-today)]",
      pillClass: "bg-[var(--status-today-soft)] text-[var(--status-today)]",
      tone: "bg-[rgba(255,255,255,0.72)] text-transparent",
      rail: "linear-gradient(180deg, rgba(185,102,50,0.95), rgba(185,102,50,0.22))",
    };
  }

  return {
    label: "upcoming",
    textClass: "text-[var(--status-upcoming)]",
    pillClass: "bg-[var(--status-upcoming-soft)] text-[var(--status-upcoming)]",
    tone: "bg-[rgba(255,255,255,0.72)] text-transparent",
    rail: "linear-gradient(180deg, rgba(81,127,145,0.95), rgba(81,127,145,0.22))",
  };
}

export function TodoItem({ todo, onDelete, onToggle }: TodoItemProps) {
  const setReminder = useTodosStore((state) => state.setReminder);
  const status = getStatusMeta(todo);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -18, scale: 0.92 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      data-state={todo.done ? "done" : "open"}
      className={`paper-card relative overflow-hidden rounded-[24px] p-4 ${todo.done ? "opacity-65" : ""}`}
    >
      <div className="absolute inset-y-4 left-0 w-1 rounded-r-full" style={{ background: status.rail }} />

      <div className="flex flex-col gap-3 pl-2">
        <div className="flex items-start gap-3">
          <motion.button
            type="button"
            aria-label="Mark todo as done"
            aria-pressed={todo.done}
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[12px] font-bold ${status.tone}`}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={(event) => onToggle(todo.id, event.currentTarget.getBoundingClientRect(), !todo.done)}
          >
            ✓
          </motion.button>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[rgba(122,89,64,0.08)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brown)]">
                Task
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${status.pillClass}`}>
                {status.label}
              </span>
            </div>

            <p className={`break-words text-[14px] font-medium text-[var(--dark-text)] ${todo.done ? "line-through" : ""}`}>
              {todo.text}
            </p>
            <p className={`mt-1 text-[11px] font-medium ${status.textClass}`}>
              {todo.reminderAt ? format(new Date(todo.reminderAt), "MMM d, HH:mm") : "No reminder set"}
            </p>
            <div className="mt-3">
              <ReminderPicker reminderAt={todo.reminderAt} onChange={(value) => setReminder(todo.id, value)} />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <motion.button
            type="button"
            aria-label="Delete todo"
            className="paper-button rounded-[14px] px-3 py-1.5 text-[11px] font-semibold text-[var(--orange-dot)]"
            whileHover={{ y: -2, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={(event) => onDelete(todo.id, event.currentTarget.getBoundingClientRect())}
          >
            Delete
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}
