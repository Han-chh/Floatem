import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../lib/i18n";
import { resolveTodoAccentColor, resolveTodoGroup, type TodoItem as TodoItemModel } from "../../lib/models";
import { formatDateKeyInTimeZone, formatTimestampInTimeZone } from "../../lib/timeZoneDate";
import type { TimeFormat } from "../../lib/models";
import { useSettingsStore } from "../../store/settingsStore";
import { useTodosStore } from "../../store/todosStore";
import { CalendarDaysIcon, CheckSquareIcon, CircleCheckBigIcon, SquarePenIcon, Trash2Icon, XIcon } from "../icons/AppIcons";
import { TodoGroupDialog } from "./TodoGroupDialog";
import { ReminderPicker } from "./ReminderPicker";

type TodoItemProps = {
  todo: TodoItemModel;
  order?: number;
  onDelete: (id: string, target: DOMRect) => void;
  onEdit?: (todo: TodoItemModel) => void;
  onSelect?: (id: string) => void;
  onToggle: (id: string, target: DOMRect, nextDone: boolean) => void;
  dropPreview?: boolean;
  isSelected?: boolean;
  selectionMode?: boolean;
};

function SelectionCheckbox({
  isSelected,
  label,
  onSelect,
}: {
  isSelected: boolean;
  label: string;
  onSelect?: () => void;
}) {
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={isSelected}
      aria-label={label}
      data-tooltip={label}
      data-tooltip-align="left"
      className={`todo-card-select-button inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border ${
        isSelected
          ? "border-[rgba(31,168,122,0.5)] bg-[rgba(31,168,122,0.95)] text-white shadow-[0_8px_16px_rgba(31,168,122,0.18)]"
          : "border-[rgba(156,126,94,0.28)] bg-[rgba(255,255,255,0.82)] text-[rgba(156,126,94,0.72)] shadow-[0_6px_12px_rgba(61,49,34,0.06)]"
      }`}
      whileHover={{ y: -1.5, scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={
        onSelect
          ? (event) => {
              event.stopPropagation();
              onSelect();
            }
          : undefined
      }
    >
      {isSelected ? <CheckSquareIcon size={15} /> : <span aria-hidden="true" className="h-3.5 w-3.5 rounded-[3px] border border-current" />}
    </motion.button>
  );
}

function GroupColorGlyph({ color, size = "md" }: { color: string; size?: "sm" | "md" }) {
  const outerSizeClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const innerSizeClass = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";

  return (
    <span
      aria-hidden="true"
      className={`inline-flex ${outerSizeClass} items-center justify-center rounded-full border border-white/80 shadow-[0_3px_7px_rgba(0,0,0,0.08)]`}
      style={{ backgroundColor: `${color}24`, boxShadow: `0 0 0 2px ${color}14` }}
    >
      <span className={`${innerSizeClass} rounded-full border border-white/80`} style={{ backgroundColor: color }} />
    </span>
  );
}

type TodoRowBodyProps = {
  todo: TodoItemModel;
  order?: number;
  onDelete?: (target: DOMRect) => void;
  onOpenGroupDialog?: () => void;
  onSelect?: () => void;
  onToggle?: (target: DOMRect, nextDone: boolean) => void;
  preview?: boolean;
  isDraggingPlaceholder?: boolean;
  isDropTargetPreview?: boolean;
  isSelected?: boolean;
  selectionMode?: boolean;
  actionVariant?: "delete" | "dock";
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

function colorWithAlpha(color: string, alpha: string) {
  return /^#[\da-f]{6}$/i.test(color) ? `${color}${alpha}` : color;
}

const FLOATING_TODO_DRAG_THRESHOLD_PX = 6;
const FLOATING_TODO_INTERACTIVE_SELECTOR =
  'button,a,input,textarea,select,[contenteditable="true"],[role="button"],[role="checkbox"]';

function isFloatingTodoInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(FLOATING_TODO_INTERACTIVE_SELECTOR));
}

function getTodoCardSurface(todo: TodoItemModel, groupAccentColor: string) {
  const groupMist = colorWithAlpha(groupAccentColor, todo.done ? "10" : "24");
  const groupWash = colorWithAlpha(groupAccentColor, todo.done ? "0b" : "18");
  const groupGlow = colorWithAlpha(groupAccentColor, todo.done ? "16" : "2e");

  if (todo.done) {
    return [
      `radial-gradient(circle at 10% 0%, ${groupGlow}, transparent 34%)`,
      `linear-gradient(138deg, ${groupWash}, rgba(246,248,246,0.74) 46%, ${groupMist})`,
      "linear-gradient(180deg, rgba(241,244,241,0.86), rgba(229,234,230,0.76))",
    ].join(", ");
  }

  return [
    `radial-gradient(circle at 10% -8%, ${groupGlow}, transparent 38%)`,
    `linear-gradient(135deg, ${groupWash}, rgba(255,255,255,0.78) 46%, ${groupMist})`,
    "linear-gradient(180deg, rgba(255,252,248,0.98), rgba(255,247,239,0.9))",
  ].join(", ");
}

function TodoRowBody({
  todo,
  order,
  onDelete,
  onOpenGroupDialog,
  onSelect,
  onToggle,
  preview = false,
  isDraggingPlaceholder = false,
  isDropTargetPreview = false,
  isSelected = false,
  selectionMode = false,
  actionVariant = "delete",
}: TodoRowBodyProps) {
  const { t } = useI18n();
  const setReminder = useTodosStore((state) => state.setReminder);
  const groups = useTodosStore((state) => state.groups);
  const timeZone = useSettingsStore((state) => state.timeZone);
  const timeFormat = useSettingsStore((state) => state.timeFormat);
  const status = getStatusMeta(todo, t.todos.doneFallback, timeZone, timeFormat);
  const groupAccentColor = resolveTodoAccentColor(todo, groups);
  const groupLabel = resolveTodoGroup(todo, groups)?.name ?? t.todos.noGroup;
  const reminderButtonLabel = status.label === "undone" ? undefined : status.reminderLabel;
  const completedReminderLabel = todo.done && todo.reminderAt ? status.reminderLabel : null;
  const isInteractive = !preview;
  const canUseItemActions = isInteractive && !selectionMode;
  const isDockAction = actionVariant === "dock";
  const selectionLabel = t.todos.selectTodo(todo.text);
  const canSelectTodo = selectionMode && !todo.done;

  return (
    <>
      <div
        className={`pointer-events-none absolute inset-0 ${todo.done ? "opacity-[0.35]" : "opacity-[0.65]"}`}
        style={{
          backgroundImage:
            `radial-gradient(${colorWithAlpha(groupAccentColor, "38")} 0.7px, transparent 0.8px), linear-gradient(120deg, transparent 0 38%, ${colorWithAlpha(groupAccentColor, "1e")} 38% 41%, transparent 41% 100%), linear-gradient(140deg, ${colorWithAlpha(groupAccentColor, "20")}, rgba(255,255,255,0.34) 42%, transparent 70%)`,
          backgroundSize: "15px 15px, 22px 22px, 100% 100%",
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-2 left-2 w-2 rounded-full opacity-90 shadow-[0_5px_12px_rgba(61,49,34,0.08)]"
        style={{
          background: `linear-gradient(180deg, ${groupAccentColor}, ${colorWithAlpha(groupAccentColor, "9c")} 54%, rgba(255,255,255,0.24))`,
        }}
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
          {!todo.done && !selectionMode ? (
            <span
              className="pointer-events-none absolute right-0 inset-y-0 my-auto h-6.5 w-6.5 rounded-full opacity-95"
              style={{
                boxShadow: `0 0 0 3px ${status.accent}2b`,
                background:
                  "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.78), rgba(255,255,255,0) 62%)",
              }}
            />
          ) : null}
          {canSelectTodo ? (
            <SelectionCheckbox isSelected={isSelected} label={selectionLabel} onSelect={onSelect} />
          ) : selectionMode ? (
            <span aria-hidden="true" className="inline-flex h-7 w-7 shrink-0" />
          ) : (
            <motion.button
              type="button"
              aria-label={todo.done ? t.todos.restoreTask : t.todos.completeTask}
              aria-pressed={todo.done}
              data-tooltip={todo.done ? t.todos.restoreTask : t.todos.completeTask}
              disabled={preview}
              className={`relative inline-flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full border text-[9.5px] font-bold shadow-[0_6px_12px_rgba(61,49,34,0.08)] ${status.toggleClass}`}
              whileHover={canUseItemActions ? { scale: 1.06 } : undefined}
              whileTap={canUseItemActions ? { scale: 0.93 } : undefined}
              onPointerDown={canUseItemActions ? (event) => event.stopPropagation() : undefined}
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
          )}
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
          {selectionMode ? null : (
            <>
              <motion.button
                type="button"
                aria-label={t.todos.changeGroup}
                data-tooltip={`${t.todos.group}: ${groupLabel}`}
                className="paper-icon-button todo-card-action-button todo-card-group-button inline-flex shrink-0 items-center justify-center rounded-full border p-0"
                style={{
                  borderColor: `${groupAccentColor}88`,
                  background: `radial-gradient(circle at 32% 24%, rgba(255,255,255,0.9), transparent 42%), linear-gradient(180deg, ${colorWithAlpha(groupAccentColor, "28")}, ${colorWithAlpha(groupAccentColor, "12")}), rgba(255,255,255,0.9)`,
                  boxShadow: `0 0 0 3px ${colorWithAlpha(groupAccentColor, "16")}, 0 8px 16px rgba(61,49,34,0.08)`,
                  color: groupAccentColor,
                }}
                whileHover={canUseItemActions ? { y: -1.5, scale: 1.06 } : undefined}
                whileTap={canUseItemActions ? { scale: 0.94 } : undefined}
                onPointerDown={canUseItemActions ? (event) => event.stopPropagation() : undefined}
                onClick={
                  canUseItemActions && onOpenGroupDialog
                    ? (event) => {
                        event.stopPropagation();
                        onOpenGroupDialog();
                      }
                    : undefined
                }
              >
                <GroupColorGlyph color={groupAccentColor} size="sm" />
              </motion.button>

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
                  todoDateKey={todo.dateKey}
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
                aria-label={isDockAction ? t.common.close : t.todos.delete}
                data-tooltip={isDockAction ? t.common.close : t.todos.delete}
                data-tooltip-align="left"
                className={`paper-icon-button todo-card-action-button inline-flex h-6.5 min-w-10 items-center justify-center rounded-full px-2.5 ${
                  isDockAction
                    ? "border-[rgba(151,156,152,0.2)] bg-[rgba(236,239,237,0.74)] text-[rgba(101,106,103,0.82)] shadow-[0_5px_12px_rgba(61,49,34,0.04)]"
                    : todo.done
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
                {isDockAction ? <XIcon size={12.5} /> : <Trash2Icon size={12.5} />}
              </motion.button>
            </>
          )}
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
  const groups = useTodosStore((state) => state.groups);
  const timeZone = useSettingsStore((state) => state.timeZone);
  const timeFormat = useSettingsStore((state) => state.timeFormat);
  const groupAccentColor = resolveTodoAccentColor(todo, groups);
  return (
    <div
      className={`paper-card cq-card relative h-full w-full overflow-hidden rounded-[18px] px-2 py-1.25 ${getStatusMeta(todo, t.todos.doneFallback, timeZone, timeFormat).cardClass}`}
      style={{
        background: getTodoCardSurface(todo, groupAccentColor),
        borderColor: `${groupAccentColor}86`,
        width: width ? `${width}px` : "100%",
      }}
    >
      <TodoRowBody todo={todo} order={order} preview />
    </div>
  );
}

export function FloatingTodoItem({
  todo,
  width,
  order,
  onBeginDrag,
  onDock,
  onToggle,
}: {
  todo: TodoItemModel;
  width?: number;
  order?: number;
  onBeginDrag: () => void;
  onDock: () => void;
  onToggle: (id: string, target: DOMRect, nextDone: boolean) => void;
}) {
  const { t } = useI18n();
  const groups = useTodosStore((state) => state.groups);
  const timeZone = useSettingsStore((state) => state.timeZone);
  const timeFormat = useSettingsStore((state) => state.timeFormat);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);
  const pendingPointerRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const status = getStatusMeta(todo, t.todos.doneFallback, timeZone, timeFormat);
  const groupAccentColor = resolveTodoAccentColor(todo, groups);

  const clearPendingPointer = (element: HTMLElement, pointerId: number) => {
    pendingPointerRef.current = null;
    if (typeof element.hasPointerCapture === "function" && element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
  };

  return (
    <>
      <motion.article
        ref={cardRef}
        data-no-window-drag="true"
        data-testid="todo-item"
        data-todo-item-id={todo.id}
        aria-label={t.todos.reorder}
        className={`paper-card cq-card relative overflow-hidden rounded-[18px] px-2 py-1.25 cursor-grab active:cursor-grabbing ${status.cardClass}`}
        style={{
          background: getTodoCardSurface(todo, groupAccentColor),
          borderColor: `${groupAccentColor}78`,
          boxShadow: `0 0 0 2px ${colorWithAlpha(groupAccentColor, "14")}, 0 12px 24px ${colorWithAlpha(groupAccentColor, "12")}, 0 10px 22px rgba(61,49,34,0.08)`,
          width: width ? `${width}px` : "100%",
        }}
        onPointerDownCapture={(event) => {
          if (event.button !== 0) {
            return;
          }

          if (isFloatingTodoInteractiveTarget(event.target)) {
            pendingPointerRef.current = null;
            return;
          }

          pendingPointerRef.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
          };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMoveCapture={(event) => {
          const pendingPointer = pendingPointerRef.current;
          if (!pendingPointer || pendingPointer.pointerId !== event.pointerId) {
            return;
          }

          const distance = Math.hypot(event.clientX - pendingPointer.x, event.clientY - pendingPointer.y);
          if (distance < FLOATING_TODO_DRAG_THRESHOLD_PX) {
            return;
          }

          clearPendingPointer(event.currentTarget, event.pointerId);
          // Defer to next microtask so the WebView finishes processing the
          // pointer event before the native drag loop starts.
          Promise.resolve().then(() => onBeginDrag());
        }}
        onPointerUpCapture={(event) => {
          if (isFloatingTodoInteractiveTarget(event.target)) {
            pendingPointerRef.current = null;
            return;
          }

          const pendingPointer = pendingPointerRef.current;
          if (!pendingPointer || pendingPointer.pointerId !== event.pointerId) {
            return;
          }

          clearPendingPointer(event.currentTarget, event.pointerId);
          setIsEditDialogOpen(true);
        }}
        onPointerCancelCapture={(event) => {
          const pendingPointer = pendingPointerRef.current;
          if (!pendingPointer || pendingPointer.pointerId !== event.pointerId) {
            return;
          }

          clearPendingPointer(event.currentTarget, event.pointerId);
        }}
      >
        <TodoRowBody
          todo={todo}
          order={order}
          onDelete={onDock}
          onOpenGroupDialog={() => setIsGroupDialogOpen(true)}
          onToggle={(target, nextDone) => onToggle(todo.id, target, nextDone)}
          actionVariant="dock"
        />
      </motion.article>
      <FloatingTodoEditDialog todo={todo} isOpen={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} />
      <TodoGroupDialog todoId={todo.id} isOpen={isGroupDialogOpen} onClose={() => setIsGroupDialogOpen(false)} />
    </>
  );
}

function FloatingTodoEditDialog({
  todo,
  isOpen,
  onClose,
}: {
  todo: TodoItemModel;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const updateTodoText = useTodosStore((state) => state.updateTodoText);
  const moveTodosToDate = useTodosStore((state) => state.moveTodosToDate);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState(todo.text);
  const [dateDraft, setDateDraft] = useState(todo.dateKey);
  const normalizedDraft = draft.trim();
  const isSaveDisabled =
    normalizedDraft.length === 0 || (normalizedDraft === todo.text.trim() && dateDraft === todo.dateKey);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setDraft(todo.text);
    setDateDraft(todo.dateKey);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [isOpen, todo.dateKey, todo.text]);

  const handleSave = () => {
    if (isSaveDisabled) {
      return;
    }

    if (normalizedDraft !== todo.text.trim()) {
      updateTodoText(todo.id, normalizedDraft);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateDraft) && dateDraft !== todo.dateKey) {
      moveTodosToDate([todo.id], dateDraft);
    }

    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          data-no-window-drag="true"
          className="quicknote-modal-backdrop fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(30,25,21,0.24)] px-5 py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t.todos.editDialogTitle}
            className="paper-panel flex w-full max-w-[420px] flex-col rounded-[24px] p-5 shadow-[0_26px_48px_rgba(30,25,21,0.24)]"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="status-chip" data-tone={todo.done ? "jade" : "coral"}>
                  <SquarePenIcon size={11} />
                  {todo.done ? t.todos.statusDone : t.todos.statusUndone}
                </span>
                <p className="mt-2 font-display text-[22px] font-semibold tracking-[-0.05em] text-[var(--brown-strong)]">
                  {t.todos.editDialogTitle}
                </p>
                <p className="mt-1 text-[12px] leading-6 text-[var(--muted)]">{t.todos.editDialogSubtitle}</p>
              </div>
              <motion.button
                type="button"
                aria-label={t.common.close}
                data-tooltip={t.common.close}
                data-no-window-drag="true"
                className="paper-icon-button inline-flex h-9 w-9 min-h-0 min-w-0 rounded-[12px]"
                whileHover={{ y: -1.5, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
              >
                <XIcon size={14} />
              </motion.button>
            </div>

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                handleSave();
              }}
            >
              <label className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  {t.todos.titleLabel}
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  aria-label={t.todos.titleLabel}
                  value={draft}
                  onChange={(event) => setDraft(event.currentTarget.value)}
                  placeholder={t.todos.titlePlaceholder}
                  className="surface-field min-w-0 rounded-[16px] px-3 py-2.5 text-[12.5px] font-medium text-[var(--dark-text)] outline-none placeholder:text-[var(--muted)]"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  {t.todos.date}
                </span>
                <span className="surface-field inline-flex w-full items-center gap-2 rounded-[16px] border px-3 py-2.5 text-[12.5px] font-medium text-[var(--dark-text)]">
                  <CalendarDaysIcon size={15} />
                  <input
                    type="date"
                    aria-label={t.todos.date}
                    value={dateDraft}
                    onChange={(event) => setDateDraft(event.currentTarget.value)}
                    className="min-w-0 flex-1 bg-transparent font-medium outline-none"
                  />
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-1">
                <motion.button
                  type="button"
                  data-no-window-drag="true"
                  data-tooltip={t.common.cancel}
                  className="paper-button inline-flex items-center justify-center rounded-[14px] px-3.5 py-2.5 text-[12px] font-semibold text-[var(--dark-text)]"
                  whileHover={{ y: -1.5, scale: 1.01 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={onClose}
                >
                  {t.common.cancel}
                </motion.button>
                <motion.button
                  type="submit"
                  data-no-window-drag="true"
                  data-tooltip={t.common.save}
                  disabled={isSaveDisabled}
                  className={`paper-button paper-button-primary inline-flex items-center justify-center rounded-[14px] px-3.5 py-2.5 text-[12px] font-semibold ${
                    isSaveDisabled ? "cursor-not-allowed opacity-60" : ""
                  }`}
                  whileHover={isSaveDisabled ? undefined : { y: -1.5, scale: 1.01 }}
                  whileTap={isSaveDisabled ? undefined : { scale: 0.985 }}
                >
                  {t.common.save}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

export function TodoItem({
  todo,
  order,
  onDelete,
  onEdit,
  onSelect,
  onToggle,
  dropPreview = false,
  isSelected = false,
  selectionMode = false,
}: TodoItemProps) {
  const { t } = useI18n();
  const groups = useTodosStore((state) => state.groups);
  const timeZone = useSettingsStore((state) => state.timeZone);
  const timeFormat = useSettingsStore((state) => state.timeFormat);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
    disabled: selectionMode,
  });
  const status = getStatusMeta(todo, t.todos.doneFallback, timeZone, timeFormat);
  const groupAccentColor = resolveTodoAccentColor(todo, groups);
  const setArticleRef = (node: HTMLElement | null) => {
    cardRef.current = node;
    setNodeRef(node);
  };

  return (
    <>
      <motion.article
        ref={setArticleRef}
        layout
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -14, scale: 0.94 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        whileHover={!isDragging ? { y: -1.5, scale: 1.006 } : undefined}
        style={{
          background: isDragging ? undefined : getTodoCardSurface(todo, groupAccentColor),
          borderColor: isDragging ? undefined : `${groupAccentColor}78`,
          boxShadow: isDragging
            ? undefined
            : `0 0 0 2px ${colorWithAlpha(groupAccentColor, "14")}, 0 12px 24px ${colorWithAlpha(groupAccentColor, "12")}, 0 10px 22px rgba(61,49,34,0.08)`,
          transform: CSS.Transform.toString(transform),
          transition,
        }}
        {...attributes}
        {...(selectionMode ? {} : listeners)}
        data-no-window-drag="true"
        data-testid="todo-item"
        data-todo-item-id={todo.id}
        aria-label={t.todos.reorder}
        className={`paper-card cq-card mx-1 relative overflow-hidden rounded-[18px] px-2 py-1.25 cursor-grab active:cursor-grabbing ${status.cardClass} ${
          isDragging ? "border-transparent bg-[rgba(255,255,255,0.08)] shadow-none" : ""
        } ${selectionMode ? "cursor-pointer active:cursor-pointer" : ""}`}
        onClick={() => {
          if (selectionMode && !todo.done) {
            onSelect?.(todo.id);
            return;
          }

          onEdit?.(todo);
        }}
      >
        <TodoRowBody
          todo={todo}
          order={order}
          onDelete={(target) => onDelete(todo.id, cardRef.current?.getBoundingClientRect() ?? target)}
          onOpenGroupDialog={() => setIsGroupDialogOpen(true)}
          onSelect={() => onSelect?.(todo.id)}
          onToggle={(target, nextDone) => onToggle(todo.id, target, nextDone)}
          isDraggingPlaceholder={isDragging}
          isDropTargetPreview={dropPreview}
          isSelected={isSelected}
          selectionMode={selectionMode}
        />
      </motion.article>
      <TodoGroupDialog todoId={todo.id} isOpen={isGroupDialogOpen} onClose={() => setIsGroupDialogOpen(false)} />
    </>
  );
}

export function CompletedTodoItem({
  todo,
  onDelete,
  onEdit,
  onSelect,
  onToggle,
  isSelected = false,
  selectionMode = false,
}: TodoItemProps) {
  const { t } = useI18n();
  const groups = useTodosStore((state) => state.groups);
  const timeZone = useSettingsStore((state) => state.timeZone);
  const timeFormat = useSettingsStore((state) => state.timeFormat);
  const status = getStatusMeta(todo, t.todos.doneFallback, timeZone, timeFormat);
  const groupAccentColor = resolveTodoAccentColor(todo, groups);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);

  return (
    <>
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
        style={{
          background: getTodoCardSurface(todo, groupAccentColor),
          borderColor: `${groupAccentColor}66`,
          boxShadow: `0 0 0 2px ${colorWithAlpha(groupAccentColor, "10")}, 0 8px 18px rgba(61,49,34,0.04)`,
        }}
        className={`paper-card cq-card mx-1 relative overflow-hidden rounded-[18px] px-2 py-1.25 ${status.cardClass}`}
        onClick={() => {
          if (selectionMode && !todo.done) {
            onSelect?.(todo.id);
            return;
          }

          onEdit?.(todo);
        }}
      >
        <TodoRowBody
          todo={todo}
          onDelete={(target) => onDelete(todo.id, cardRef.current?.getBoundingClientRect() ?? target)}
          onOpenGroupDialog={() => setIsGroupDialogOpen(true)}
          onSelect={() => onSelect?.(todo.id)}
          onToggle={(target, nextDone) => onToggle(todo.id, target, nextDone)}
          isSelected={isSelected}
          selectionMode={selectionMode}
        />
      </motion.article>
      <TodoGroupDialog todoId={todo.id} isOpen={isGroupDialogOpen} onClose={() => setIsGroupDialogOpen(false)} />
    </>
  );
}
