import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { useRef } from "react";
import { useI18n } from "../../lib/i18n";
import type { TodoItem as TodoItemModel } from "../../lib/models";
import { formatDateKeyInTimeZone, formatTimestampInTimeZone } from "../../lib/timeZoneDate";
import type { TimeFormat } from "../../lib/models";
import { useSettingsStore } from "../../store/settingsStore";
import { useTodosStore } from "../../store/todosStore";
import { CircleCheckBigIcon, Trash2Icon } from "../icons/AppIcons";
import { ReminderPicker } from "./ReminderPicker";

type TodoItemProps = {
  todo: TodoItemModel;
  order?: number;
  onDelete: (id: string, target: DOMRect) => void;
  onEdit?: (todo: TodoItemModel) => void;
  onToggle: (id: string, target: DOMRect, nextDone: boolean) => void;
  dropPreview?: boolean;
};

type TodoRowBodyProps = {
  todo: TodoItemModel;
  order?: number;
  onDelete?: (target: DOMRect) => void;
  onToggle?: (target: DOMRect, nextDone: boolean) => void;
  preview?: boolean;
  isDraggingPlaceholder?: boolean;
  isDropTargetPreview?: boolean;
};

function getStatusMeta(todo: TodoItemModel, doneFallbackLabel: string, timeZone: string, timeFormat: TimeFormat) {
  if (todo.done) {
    return {
      label: "done",
      reminderLabel: todo.reminderAt ? formatTimestampInTimeZone(todo.reminderAt, timeZone, "compact", timeFormat) : doneFallbackLabel,
      reminderClass:
        "border-[rgba(150,154,151,0.13)] bg-[rgba(226,230,227,0.34)] text-[rgba(118,123,119,0.68)]",
      toggleClass:
        "border-[rgba(31,168,122,0.18)] bg-[linear-gradient(180deg,rgba(97,205,164,0.76),rgba(69,173,132,0.72))] text-white shadow-[0_8px_16px_rgba(31,168,122,0.14)]",
      strikeClass: "bg-[rgba(132,136,133,0.4)]",
      cardClass:
        "border-[rgba(184,189,185,0.34)] bg-[linear-gradient(180deg,rgba(230,234,231,0.34),rgba(219,224,220,0.22))]",
      accent: "rgba(154,160,156,0.36)",
    };
  }

  if (!todo.reminderAt) {
    return {
      label: "undone",
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

  const reminderDateKey = formatDateKeyInTimeZone(new Date(todo.reminderAt), timeZone);
  const todayDateKey = formatDateKeyInTimeZone(new Date(), timeZone);

  if (reminderDateKey < todayDateKey) {
    return {
      label: "overdue",
      reminderLabel: formatTimestampInTimeZone(todo.reminderAt, timeZone, "compact", timeFormat),
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

  if (reminderDateKey === todayDateKey) {
    return {
      label: "today",
      reminderLabel: formatTimestampInTimeZone(todo.reminderAt, timeZone, "time", timeFormat),
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
    reminderLabel: formatTimestampInTimeZone(todo.reminderAt, timeZone, "compact", timeFormat),
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
  order,
  onDelete,
  onToggle,
  preview = false,
  isDraggingPlaceholder = false,
  isDropTargetPreview = false,
}: TodoRowBodyProps) {
  const { t } = useI18n();
  const setReminder = useTodosStore((state) => state.setReminder);
  const timeZone = useSettingsStore((state) => state.timeZone);
  const timeFormat = useSettingsStore((state) => state.timeFormat);
  const status = getStatusMeta(todo, t.todos.doneFallback, timeZone, timeFormat);
  const reminderButtonLabel = status.label === "undone" ? undefined : status.reminderLabel;
  const completedReminderLabel = todo.done && todo.reminderAt ? status.reminderLabel : null;
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
        <div className="absolute inset-0 rounded-[22px] border border-transparent bg-[rgba(255,255,255,0.08)]" />
      ) : null}
      {isDropTargetPreview ? (
        <div className="pointer-events-none absolute inset-[2px] rounded-[18px] border-2 border-[rgba(31,168,122,0.82)] bg-[rgba(31,168,122,0.05)] shadow-[0_0_0_4px_rgba(31,168,122,0.14)]" />
      ) : null}

      <div className={`todo-row-grid relative z-10 pl-1 ${isDraggingPlaceholder ? "opacity-0" : ""}`}>
        <div className={`todo-row-toggle relative ${order ? "gap-1 pl-0" : "justify-center"}`}>
          {order ? (
            <span
              data-testid="todo-order"
              className="relative z-10 min-w-[14px] text-right text-[11px] font-semibold leading-none text-[var(--muted)]"
            >
              {order}
            </span>
          ) : null}
          {!todo.done ? (
            <span
              className="pointer-events-none absolute right-0 inset-y-0 my-auto h-6.5 w-6.5 rounded-full opacity-95"
              style={{
                boxShadow: `0 0 0 3px ${status.accent}2b`,
                background:
                  "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.78), rgba(255,255,255,0) 62%)",
              }}
            />
          ) : null}
          <motion.button
            type="button"
            aria-label={todo.done ? t.todos.restoreTask : t.todos.completeTask}
            aria-pressed={todo.done}
            data-tooltip={todo.done ? t.todos.restoreTask : t.todos.completeTask}
            className={`relative inline-flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full border text-[9.5px] font-bold shadow-[0_6px_12px_rgba(61,49,34,0.08)] ${status.toggleClass}`}
            whileHover={isInteractive ? { scale: 1.06 } : undefined}
            whileTap={isInteractive ? { scale: 0.93 } : undefined}
            onPointerDown={isInteractive ? (event) => event.stopPropagation() : undefined}
            onClick={
              onToggle
                ? (event) => {
                    event.stopPropagation();
                    onToggle(event.currentTarget.getBoundingClientRect(), !todo.done);
                  }
                : undefined
            }
          >
            {!todo.done ? (
              <span
                className="pointer-events-none absolute inset-[1px] rounded-full opacity-70"
                style={{
                  background:
                    "radial-gradient(circle at 28% 28%, rgba(255,255,255,0.82), rgba(255,255,255,0) 58%)",
                }}
              />
            ) : null}
            <CircleCheckBigIcon size={12.5} />
          </motion.button>
        </div>

        <div className="todo-row-text">
          <div className="relative min-w-0">
            <p
              className={`wrap-anywhere pr-1 text-[12.5px] font-semibold leading-[1.32] ${
                todo.done ? "text-[rgba(136,141,137,0.92)]" : "text-[var(--dark-text)]"
              }`}
            >
              {todo.text}
            </p>
          </div>
        </div>

        <div className="todo-row-actions">
          {todo.done ? (
            completedReminderLabel ? (
              <span
                className={`inline-flex max-w-full min-w-0 shrink items-center gap-1.5 rounded-full border px-2.5 py-1.25 text-[10.5px] font-semibold shadow-[0_7px_14px_rgba(61,49,34,0.04)] ${status.reminderClass}`}
                title={completedReminderLabel}
              >
                {completedReminderLabel}
              </span>
            ) : null
          ) : (
            <ReminderPicker
              todoTitle={todo.text}
              reminderAt={todo.reminderAt}
              timeZone={timeZone}
              timeFormat={timeFormat}
              displayValue={reminderButtonLabel}
              className={status.reminderClass}
              disabled={preview}
              onChange={(value) => setReminder(todo.id, value)}
            />
          )}

          <motion.button
            type="button"
            aria-label={t.todos.delete}
            data-tooltip={t.todos.delete}
            data-tooltip-align="left"
            className={`paper-icon-button todo-card-action-button inline-flex h-6.5 min-w-10 items-center justify-center rounded-full px-2.5 ${
              todo.done
                ? "border-[rgba(151,156,152,0.14)] bg-[rgba(236,239,237,0.54)] text-[rgba(128,134,130,0.62)] shadow-[0_5px_12px_rgba(61,49,34,0.035)]"
                : "paper-button-danger"
            }`}
            whileHover={isInteractive ? { y: -1.5, scale: 1.03 } : undefined}
            whileTap={isInteractive ? { scale: 0.97 } : undefined}
            onPointerDown={isInteractive ? (event) => event.stopPropagation() : undefined}
            onClick={
              onDelete
                ? (event) => {
                    event.stopPropagation();
                    onDelete(event.currentTarget.getBoundingClientRect());
                  }
                : undefined
            }
          >
            <Trash2Icon size={12.5} />
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

export function TodoItemPreview({ todo, width, order }: { todo: TodoItemModel; width?: number; order?: number }) {
  const { t } = useI18n();
  const timeZone = useSettingsStore((state) => state.timeZone);
  const timeFormat = useSettingsStore((state) => state.timeFormat);
  return (
    <div
      className={`paper-card cq-card relative overflow-hidden rounded-[18px] px-2 py-1.25 shadow-[0_24px_48px_rgba(61,49,34,0.2)] ${getStatusMeta(todo, t.todos.doneFallback, timeZone, timeFormat).cardClass}`}
      style={{ width: width ?? undefined, maxWidth: "calc(100vw - 48px)" }}
    >
      <TodoRowBody todo={todo} order={order} preview />
    </div>
  );
}

export function TodoItem({ todo, order, onDelete, onEdit, onToggle, dropPreview = false }: TodoItemProps) {
  const { t } = useI18n();
  const timeZone = useSettingsStore((state) => state.timeZone);
  const timeFormat = useSettingsStore((state) => state.timeFormat);
  const cardRef = useRef<HTMLElement | null>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
  });
  const status = getStatusMeta(todo, t.todos.doneFallback, timeZone, timeFormat);
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
      whileHover={!isDragging ? { y: -1.5, scale: 1.006 } : undefined}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
      data-no-window-drag="true"
      data-testid="todo-item"
      data-todo-item-id={todo.id}
      aria-label={t.todos.reorder}
      className={`paper-card cq-card mx-1 relative overflow-hidden rounded-[18px] px-2 py-1.25 shadow-[0_10px_22px_rgba(61,49,34,0.08)] cursor-grab active:cursor-grabbing ${status.cardClass} ${
        isDragging ? "border-transparent bg-[rgba(255,255,255,0.08)] shadow-none" : ""
      }`}
      onClick={() => onEdit?.(todo)}
    >
      <TodoRowBody
        todo={todo}
        order={order}
        onDelete={(target) => onDelete(todo.id, cardRef.current?.getBoundingClientRect() ?? target)}
        onToggle={(target, nextDone) => onToggle(todo.id, target, nextDone)}
        isDraggingPlaceholder={isDragging}
        isDropTargetPreview={dropPreview}
      />
    </motion.article>
  );
}

export function CompletedTodoItem({ todo, onDelete, onEdit, onToggle }: TodoItemProps) {
  const { t } = useI18n();
  const timeZone = useSettingsStore((state) => state.timeZone);
  const timeFormat = useSettingsStore((state) => state.timeFormat);
  const status = getStatusMeta(todo, t.todos.doneFallback, timeZone, timeFormat);
  const cardRef = useRef<HTMLElement | null>(null);

  return (
    <motion.article
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -1.5, scale: 1.006 }}
      data-no-window-drag="true"
      data-testid="todo-item"
      className={`paper-card cq-card mx-1 relative overflow-hidden rounded-[18px] px-2 py-1.25 shadow-[0_8px_18px_rgba(61,49,34,0.04)] ${status.cardClass}`}
      onClick={() => onEdit?.(todo)}
    >
      <TodoRowBody
        todo={todo}
        onDelete={(target) => onDelete(todo.id, cardRef.current?.getBoundingClientRect() ?? target)}
        onToggle={(target, nextDone) => onToggle(todo.id, target, nextDone)}
      />
    </motion.article>
  );
}
