import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, isPast, isToday } from "date-fns";
import { motion } from "framer-motion";
import { useRef } from "react";
import type { TodoItem as TodoItemModel } from "../../lib/models";
import { useTodosStore } from "../../store/todosStore";
import { CircleCheckBigIcon, Trash2Icon } from "../icons/AppIcons";
import { ReminderPicker } from "./ReminderPicker";

type TodoItemProps = {
  todo: TodoItemModel;
  onDelete: (id: string, target: DOMRect) => void;
  onToggle: (id: string, target: DOMRect, nextDone: boolean) => void;
};

type TodoRowBodyProps = {
  todo: TodoItemModel;
  onDelete?: (target: DOMRect) => void;
  onToggle?: (target: DOMRect, nextDone: boolean) => void;
  preview?: boolean;
  isDraggingPlaceholder?: boolean;
};

function getStatusMeta(todo: TodoItemModel) {
  if (todo.done) {
    return {
      label: "done",
      reminderLabel: todo.reminderAt ? format(new Date(todo.reminderAt), "M/d HH:mm") : "Done",
      reminderClass:
        "border-[rgba(150,154,151,0.16)] bg-[rgba(219,223,220,0.38)] text-[rgba(111,116,112,0.74)]",
      toggleClass:
        "border-[rgba(31,168,122,0.28)] bg-[linear-gradient(180deg,rgba(49,191,138,0.98),rgba(24,147,104,0.96))] text-white shadow-[0_10px_20px_rgba(31,168,122,0.22)]",
      strikeClass: "bg-[rgba(132,136,133,0.48)]",
      cardClass:
        "border-[rgba(172,177,173,0.4)] bg-[linear-gradient(180deg,rgba(220,224,221,0.42),rgba(208,213,209,0.28))]",
      accent: "rgba(142,147,143,0.44)",
    };
  }

  if (!todo.reminderAt) {
    return {
      label: "open",
      reminderLabel: "",
      reminderClass:
        "border-[rgba(213,198,180,0.92)] bg-[rgba(255,255,255,0.86)] text-[var(--muted)]",
      toggleClass:
        "border-[rgba(213,198,180,0.98)] bg-[rgba(255,255,255,0.82)] text-[var(--brown-strong)]",
      strikeClass: "bg-[rgba(138,97,63,0.88)]",
      cardClass:
        "border-[rgba(213,198,180,0.92)] bg-[linear-gradient(180deg,rgba(255,252,248,0.98),rgba(255,247,239,0.95))]",
      accent: "rgba(156,126,94,0.86)",
    };
  }

  const date = new Date(todo.reminderAt);
  if (isPast(date) && !isToday(date)) {
    return {
      label: "overdue",
      reminderLabel: format(date, "M/d HH:mm"),
      reminderClass:
        "border-[rgba(181,74,77,0.16)] bg-[var(--status-overdue-soft)] text-[var(--status-overdue)]",
      toggleClass:
        "border-[rgba(181,74,77,0.18)] bg-[rgba(255,255,255,0.82)] text-[var(--status-overdue)]",
      strikeClass: "bg-[rgba(181,74,77,0.92)]",
      cardClass:
        "border-[rgba(232,198,200,0.92)] bg-[linear-gradient(180deg,rgba(255,251,251,0.98),rgba(255,241,241,0.95))]",
      accent: "rgba(181,74,77,0.9)",
    };
  }

  if (isToday(date)) {
    return {
      label: "today",
      reminderLabel: format(date, "HH:mm"),
      reminderClass:
        "border-[rgba(192,120,80,0.16)] bg-[var(--status-today-soft)] text-[var(--status-today)]",
      toggleClass:
        "border-[rgba(192,120,80,0.18)] bg-[rgba(255,255,255,0.82)] text-[var(--status-today)]",
      strikeClass: "bg-[rgba(192,120,80,0.92)]",
      cardClass:
        "border-[rgba(231,205,188,0.92)] bg-[linear-gradient(180deg,rgba(255,252,248,0.98),rgba(255,244,235,0.95))]",
      accent: "rgba(192,120,80,0.9)",
    };
  }

  return {
    label: "upcoming",
    reminderLabel: format(date, "M/d HH:mm"),
    reminderClass:
      "border-[rgba(81,127,145,0.16)] bg-[var(--status-upcoming-soft)] text-[var(--status-upcoming)]",
    toggleClass:
      "border-[rgba(81,127,145,0.18)] bg-[rgba(255,255,255,0.82)] text-[var(--status-upcoming)]",
    strikeClass: "bg-[rgba(81,127,145,0.92)]",
    cardClass:
      "border-[rgba(193,214,220,0.92)] bg-[linear-gradient(180deg,rgba(249,252,252,0.98),rgba(239,248,249,0.95))]",
    accent: "rgba(81,127,145,0.9)",
  };
}

function TodoRowBody({
  todo,
  onDelete,
  onToggle,
  preview = false,
  isDraggingPlaceholder = false,
}: TodoRowBodyProps) {
  const setReminder = useTodosStore((state) => state.setReminder);
  const status = getStatusMeta(todo);
  const reminderButtonLabel = status.label === "open" ? undefined : status.reminderLabel;
  const isInteractive = !preview;

  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-32"
        style={{
          backgroundImage:
            "radial-gradient(rgba(30,25,21,0.04) 0.8px, transparent 0.8px), linear-gradient(140deg, rgba(255,255,255,0.28), transparent 58%)",
          backgroundSize: "18px 18px, 100% 100%",
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-2 left-2 w-1.5 rounded-full opacity-88"
        style={{ background: `linear-gradient(180deg, ${status.accent}, rgba(255,255,255,0.16))` }}
      />
      {isDraggingPlaceholder ? (
        <div className="absolute inset-0 rounded-[22px] border-2 border-dashed border-[rgba(161,136,113,0.42)] bg-[rgba(255,255,255,0.12)]" />
      ) : null}

      <div className={`todo-row-grid relative z-10 pl-3 ${isDraggingPlaceholder ? "opacity-0" : ""}`}>
        <div className="todo-row-toggle relative flex items-center justify-center">
          <span
            className="pointer-events-none absolute inset-0 rounded-full opacity-95"
            style={{
              boxShadow: `0 0 0 4px ${status.accent}26`,
              background:
                "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.78), rgba(255,255,255,0) 62%)",
            }}
          />
          <motion.button
            type="button"
            aria-label="Mark todo as done"
            aria-pressed={todo.done}
            title={todo.done ? "Restore task" : "Complete task"}
            className={`relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold shadow-[0_6px_12px_rgba(61,49,34,0.08)] ${status.toggleClass}`}
            whileHover={isInteractive ? { scale: 1.06 } : undefined}
            whileTap={isInteractive ? { scale: 0.93 } : undefined}
            onPointerDown={isInteractive ? (event) => event.stopPropagation() : undefined}
            onClick={
              onToggle
                ? (event) => onToggle(event.currentTarget.getBoundingClientRect(), !todo.done)
                : undefined
            }
          >
            <span
              className="pointer-events-none absolute inset-[1px] rounded-full opacity-70"
              style={{
                background:
                  "radial-gradient(circle at 28% 28%, rgba(255,255,255,0.82), rgba(255,255,255,0) 58%)",
              }}
            />
            <CircleCheckBigIcon size={13} />
          </motion.button>
        </div>

        <div className="todo-row-text">
          <div className="relative min-w-0">
            <p
              className={`wrap-anywhere pr-1 text-[12px] font-semibold leading-[1.3] ${
                todo.done ? "text-[rgba(136,141,137,0.92)]" : "text-[var(--dark-text)]"
              }`}
            >
              {todo.text}
            </p>
          </div>
        </div>

        <div className="todo-row-actions">
          <ReminderPicker
            reminderAt={todo.reminderAt}
            displayValue={reminderButtonLabel}
            className={status.reminderClass}
            disabled={preview}
            onChange={(value) => setReminder(todo.id, value)}
          />

          <motion.button
            type="button"
            aria-label="Delete todo"
            title="Delete todo"
            className={`paper-icon-button inline-flex h-6.5 w-6.5 min-h-0 min-w-0 items-center justify-center rounded-full ${
              todo.done
                ? "border-[rgba(151,156,152,0.24)] bg-[rgba(222,226,223,0.72)] text-[rgba(113,118,114,0.9)]"
                : "paper-button-danger"
            }`}
            whileHover={isInteractive ? { y: -1.5, scale: 1.03 } : undefined}
            whileTap={isInteractive ? { scale: 0.97 } : undefined}
            onPointerDown={isInteractive ? (event) => event.stopPropagation() : undefined}
            onClick={
              onDelete
                ? (event) => onDelete(event.currentTarget.getBoundingClientRect())
                : undefined
            }
          >
            <Trash2Icon size={13} />
          </motion.button>
        </div>
      </div>

      {todo.done && !isDraggingPlaceholder ? (
        <motion.span
          aria-hidden="true"
          initial={{ opacity: 0, scaleX: 0.18 }}
          animate={{ opacity: 1, scaleX: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className={`todo-done-strike-line ${status.strikeClass}`}
        />
      ) : null}
    </>
  );
}

export function TodoItemPreview({ todo, width }: { todo: TodoItemModel; width?: number }) {
  return (
    <div
      className={`paper-card cq-card relative overflow-hidden rounded-[20px] px-2 py-1.75 shadow-[0_24px_48px_rgba(61,49,34,0.2)] ${getStatusMeta(todo).cardClass}`}
      style={{ width: width ?? undefined, maxWidth: "calc(100vw - 48px)" }}
    >
      <TodoRowBody todo={todo} preview />
    </div>
  );
}

export function TodoItem({ todo, onDelete, onToggle }: TodoItemProps) {
  const cardRef = useRef<HTMLElement | null>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
  });
  const status = getStatusMeta(todo);
  const setArticleRef = (node: HTMLElement | null) => {
    cardRef.current = node;
    setNodeRef(node);
  };

  return (
    <motion.article
      ref={setArticleRef}
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -14, scale: 0.94 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
      data-testid="todo-item"
      aria-label="Reorder todo"
      className={`paper-card cq-card relative overflow-hidden rounded-[20px] px-2 py-1.75 shadow-[0_10px_22px_rgba(61,49,34,0.08)] cursor-grab active:cursor-grabbing ${status.cardClass} ${
        isDragging ? "border-dashed border-[rgba(161,136,113,0.42)] bg-[rgba(255,255,255,0.12)] shadow-none" : ""
      }`}
    >
      <TodoRowBody
        todo={todo}
        onDelete={(target) => onDelete(todo.id, cardRef.current?.getBoundingClientRect() ?? target)}
        onToggle={(target, nextDone) => onToggle(todo.id, target, nextDone)}
        isDraggingPlaceholder={isDragging}
      />
    </motion.article>
  );
}

export function CompletedTodoItem({ todo, onDelete, onToggle }: TodoItemProps) {
  const status = getStatusMeta(todo);
  const cardRef = useRef<HTMLElement | null>(null);

  return (
    <motion.article
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      data-testid="todo-item"
      className={`paper-card cq-card relative overflow-hidden rounded-[20px] px-2 py-1.75 shadow-[0_8px_18px_rgba(61,49,34,0.04)] ${status.cardClass}`}
    >
      <TodoRowBody
        todo={todo}
        onDelete={(target) => onDelete(todo.id, cardRef.current?.getBoundingClientRect() ?? target)}
        onToggle={(target, nextDone) => onToggle(todo.id, target, nextDone)}
      />
    </motion.article>
  );
}
