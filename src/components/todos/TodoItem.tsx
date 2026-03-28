import { motion } from "framer-motion";
import { format, isPast, isToday } from "date-fns";
import type { TodoItem as TodoItemModel } from "../../lib/models";
import { useTodosStore } from "../../store/todosStore";
import { CircleCheckBigIcon, Clock3Icon, Trash2Icon } from "../icons/AppIcons";
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
  const reminderText = todo.reminderAt ? format(new Date(todo.reminderAt), "MMM d, HH:mm") : "No reminder set";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -18, scale: 0.92 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      data-state={todo.done ? "done" : "open"}
      data-testid="todo-item"
      className={`paper-card cq-card relative rounded-[26px] p-4 ${todo.done ? "opacity-65" : ""}`}
    >
      <div className="absolute inset-y-4 left-0 w-1 rounded-r-full" style={{ background: status.rail }} />

      <div className="todo-card-layout pl-2">
        <div className="todo-card-main">
          <motion.button
            type="button"
            aria-label="Mark todo as done"
            aria-pressed={todo.done}
            className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[12px] font-bold shadow-[0_10px_18px_rgba(61,49,34,0.08)] ${status.tone}`}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={(event) => onToggle(todo.id, event.currentTarget.getBoundingClientRect(), !todo.done)}
          >
            <CircleCheckBigIcon size={16} />
          </motion.button>

          <div className="todo-card-copy">
            <p className={`wrap-anywhere text-[15px] font-semibold leading-6 text-[var(--dark-text)] ${todo.done ? "line-through" : ""}`}>
              {todo.text}
            </p>

            <div className="todo-card-status-row">
              <div className="todo-card-meta">
                <span className="status-chip" data-tone="neutral">
                  Task
                </span>
                <span className={`status-chip ${status.pillClass}`}>
                  {status.label}
                </span>
              </div>
              <p className={`wrap-anywhere inline-flex items-center gap-1.5 text-[11px] font-medium ${status.textClass}`}>
                <Clock3Icon size={13} />
                <span>{reminderText}</span>
              </p>
            </div>

            <ReminderPicker reminderAt={todo.reminderAt} onChange={(value) => setReminder(todo.id, value)} />
          </div>
        </div>

        <div className="todo-card-delete-row">
          <motion.button
            type="button"
            aria-label="Delete todo"
            className="paper-button paper-button-danger inline-flex items-center justify-center gap-2 rounded-[14px] px-3 py-2 text-[11px] font-semibold"
            whileHover={{ y: -2, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={(event) => onDelete(todo.id, event.currentTarget.getBoundingClientRect())}
          >
            <Trash2Icon size={15} />
            <span className="wrap-anywhere">Delete</span>
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}
