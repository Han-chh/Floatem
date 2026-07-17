import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { hideDragPreview, showDragPreview, showFloatingCard } from "../../hooks/usePlatform";
import { useDragPointerTracking } from "../../hooks/useDragPointerTracking";
import { buildTodoDragPreviewPayload } from "../../lib/dragPreview";
import { isPrimaryShortcut } from "../../lib/isPrimaryShortcut";
import { useI18n } from "../../lib/i18n";
import { canUseFloatingTodos } from "../../lib/platformFeatures";
import {
  formatLocalDateKey,
  parseLocalDateKey,
  resolveTodoAccentColor,
  type TodoItem as TodoItemModel,
} from "../../lib/models";
import { isNativeStickItHost } from "../../lib/nativeBridge";
import { readPlainTextFromClipboard, writePlainTextToClipboard } from "../../lib/plainTextClipboard";
import {
  addDaysToDateKey,
  formatDateKeyInTimeZone,
  formatDateKeyLong,
  formatDateKeyMonthYear,
  formatTimeInTimeZone,
} from "../../lib/timeZoneDate";
import { ParticleField } from "../feedback/ParticleField";
import { ThemeAtmosphere } from "../theme/ThemeAtmosphere";
import {
  CalendarDaysIcon,
  CheckSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheckBigIcon,
  CornerDownLeftIcon,
  GroupFilterIcon,
  GroupPlusIcon,
  SquarePenIcon,
  Trash2Icon,
  XIcon,
} from "../icons/AppIcons";
import { useParticleField } from "../../hooks/useParticleField";
import {
  centerOverlayToCursor,
  readEventCoordinates,
  syncLatestDragPointerCoordinates,
} from "../../lib/dnd/centerOverlayToCursor";
import { resolveDragReorderTarget } from "../../lib/dnd/resolveDragReorderTarget";
import { syncTextareaHeight } from "../../lib/resizeTextarea";
import { useSettingsStore } from "../../store/settingsStore";
import { useTodosStore } from "../../store/todosStore";
import { CompletedTodoItem, TodoItem, TodoItemPreview } from "./TodoItem";
import { TodoGroupDialog } from "./TodoGroupDialog";
import { TODO_FILTER_UNGROUPED_KEY, TodoGroupFilterDialog } from "./TodoGroupFilterDialog";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type BulkTodoAction = "complete" | "date" | "delete";

type TodoGroupFilterState =
  | { mode: "all" }
  | { mode: "custom"; keys: string[] };

type BulkConfirmationState = {
  action: BulkTodoAction;
};

type DateChangeDialogState =
  | {
      mode: "single";
      title: string;
    }
  | {
      mode: "bulk";
      title: string;
    };

type TodoDayStats = {
  total: number;
  done: number;
  undone: number;
};

type CalendarQuickDate = {
  id: string;
  label: string;
  dateKey: string;
};

function getRelativeDateLabel(dateKey: string, timeZone: string) {
  const todayDateKey = formatDateKeyInTimeZone(new Date(), timeZone);

  if (dateKey === todayDateKey) {
    return "today";
  }

  if (dateKey === addDaysToDateKey(todayDateKey, -1)) {
    return "yesterday";
  }

  if (dateKey === addDaysToDateKey(todayDateKey, 1)) {
    return "tomorrow";
  }

  return null;
}

function getRelativeDateMarker(dateKey: string, language: "en" | "zh-CN", timeZone: string) {
  const label = getRelativeDateLabel(dateKey, timeZone);

  if (label === "today") {
    return language === "zh-CN" ? "\u4eca" : "tdy";
  }

  if (label === "yesterday") {
    return language === "zh-CN" ? "\u6628" : "yday";
  }

  if (label === "tomorrow") {
    return language === "zh-CN" ? "\u660e" : "tmr";
  }

  return null;
}

function buildCalendarDays(monthDate: Date) {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days: Date[] = [];

  for (let day = calendarStart; day <= calendarEnd; day = addDays(day, 1)) {
    days.push(day);
  }

  return days;
}

function buildTodoStats(todos: TodoItemModel[]) {
  return todos.reduce((statsByDate, todo) => {
    const current = statsByDate.get(todo.dateKey) ?? { total: 0, done: 0, undone: 0 };
    current.total += 1;
    if (todo.done) {
      current.done += 1;
    } else {
      current.undone += 1;
    }
    statsByDate.set(todo.dateKey, current);
    return statsByDate;
  }, new Map<string, TodoDayStats>());
}

function TodoDayStatusIcon({ stats, isSelected }: { stats: TodoDayStats; isSelected: boolean }) {
  if (stats.total === 0) {
    return (
      <span
        aria-hidden="true"
        className={`block h-1 w-5 rounded-full ${
          isSelected ? "bg-[rgba(255,255,255,0.46)]" : "bg-[rgba(145,145,145,0.66)]"
        }`}
      />
    );
  }

  if (stats.undone === 0) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(42,154,98,0.95)] text-white shadow-[0_5px_10px_rgba(42,154,98,0.2)]"
      >
        <CircleCheckBigIcon size={15} />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full border border-[rgba(197,55,55,0.28)] bg-[rgba(205,63,63,0.96)] px-1.5 text-[11px] font-extrabold leading-none text-white shadow-[0_5px_10px_rgba(205,63,63,0.18)]"
    >
      {stats.undone}
    </span>
  );
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable || target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

function TodoCalendarView({
  calendarMonth,
  calendarWeekCount,
  calendarDays,
  locale,
  language,
  timeZone,
  selectedDateKey,
  todoStatsByDate,
  quickDates,
  t,
  onPreviousMonth,
  onNextMonth,
  onSelectDateKey,
}: {
  calendarMonth: Date;
  calendarWeekCount: number;
  calendarDays: Date[];
  locale: string;
  language: "en" | "zh-CN";
  timeZone: string;
  selectedDateKey: string;
  todoStatsByDate: Map<string, TodoDayStats>;
  quickDates: CalendarQuickDate[];
  t: ReturnType<typeof useI18n>["t"];
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onSelectDateKey: (dateKey: string) => void;
}) {
  return (
    <>
      <div className="mb-3 grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center gap-2">
        <motion.button
          type="button"
          aria-label={t.todos.previousMonth}
          data-tooltip={t.todos.previousMonth}
          data-no-window-drag="true"
          className="paper-icon-button inline-flex h-9 w-9 min-h-0 min-w-0 rounded-[12px]"
          whileHover={{ y: -1.5, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onPreviousMonth}
        >
          <ChevronLeftIcon size={14} />
        </motion.button>
        <div className="min-w-0 text-center">
          <p className="font-display text-[21px] font-semibold leading-none tracking-normal text-[var(--brown-strong)]">
            {formatDateKeyMonthYear(formatLocalDateKey(calendarMonth), locale)}
          </p>
        </div>
        <motion.button
          type="button"
          aria-label={t.todos.nextMonth}
          data-tooltip={t.todos.nextMonth}
          data-no-window-drag="true"
          className="paper-icon-button inline-flex h-9 w-9 min-h-0 min-w-0 rounded-[12px]"
          whileHover={{ y: -1.5, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onNextMonth}
        >
          <ChevronRightIcon size={14} />
        </motion.button>
      </div>

      <div className="paper-scroll min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid min-h-full grid-cols-7 gap-1.5">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="text-center text-[10px] font-bold uppercase leading-5 text-[var(--muted)]">
              {label}
            </div>
          ))}
          {calendarDays.map((day) => {
            const dateKey = formatLocalDateKey(day);
            const stats = todoStatsByDate.get(dateKey) ?? { total: 0, done: 0, undone: 0 };
            const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
            const isSelected = dateKey === selectedDateKey;
            const relativeLabel = getRelativeDateLabel(dateKey, timeZone);
            const relativeMarker = getRelativeDateMarker(dateKey, language, timeZone);

            return (
              <motion.button
                key={dateKey}
                type="button"
                data-no-window-drag="true"
                aria-label={`${relativeLabel ? `${relativeLabel}, ` : ""}${dateKey}: ${t.todos.doneCount(stats.done)}, ${t.todos.undoneCount(stats.undone)}`}
                data-tooltip={`${dateKey}: ${t.todos.doneCount(stats.done)}, ${t.todos.undoneCount(stats.undone)}`}
                className={`rounded-[14px] border px-1.5 text-left transition-colors ${
                  calendarWeekCount >= 6 ? "min-h-[46px] py-1" : "min-h-[56px] py-1.5"
                } ${
                  isSelected
                    ? "border-[rgba(30,25,21,0.68)] bg-[rgba(30,25,21,0.9)] text-white shadow-[0_12px_22px_rgba(30,25,21,0.16)]"
                    : "border-[rgba(213,198,180,0.74)] bg-[rgba(255,255,255,0.58)] text-[var(--dark-text)]"
                } ${isCurrentMonth ? "" : "opacity-50"}`}
                whileHover={{ y: -1.5, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectDateKey(dateKey)}
              >
                <span className="flex h-4 items-center justify-center gap-1">
                  <span className="text-[12px] font-bold leading-none">{day.getDate()}</span>
                  {relativeMarker ? (
                    <span
                      aria-hidden="true"
                      className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-extrabold leading-none ${
                        isSelected ? "bg-[rgba(255,255,255,0.18)] text-white" : "bg-[rgba(239,248,249,0.96)] text-[var(--status-upcoming)]"
                      }`}
                    >
                      {relativeMarker}
                    </span>
                  ) : null}
                </span>
                <span className={`${calendarWeekCount >= 6 ? "mt-2" : "mt-3"} flex h-6 items-center justify-center`}>
                  <TodoDayStatusIcon stats={stats} isSelected={isSelected} />
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex shrink-0 flex-wrap items-center gap-1.5">
        {quickDates.map((quickDate) => (
          <motion.button
            key={quickDate.id}
            type="button"
            data-no-window-drag="true"
            data-tooltip={quickDate.label}
            className="inline-flex items-center justify-center rounded-[12px] border border-[rgba(47,107,255,0.45)] bg-[rgba(239,248,249,0.72)] px-2.5 py-2 text-[11px] font-semibold text-[var(--status-upcoming)] shadow-[0_8px_16px_rgba(47,107,255,0.08)] transition-colors hover:border-[rgba(47,107,255,0.68)] hover:bg-[rgba(239,248,249,0.94)]"
            whileHover={{ y: -1.5, scale: 1.01 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => onSelectDateKey(quickDate.dateKey)}
          >
            {quickDate.label}
          </motion.button>
        ))}
      </div>
    </>
  );
}

export function TodoList() {
  const { t, language } = useI18n();
  const todos = useTodosStore((state) => state.todos);
  const groups = useTodosStore((state) => state.groups);
  const floatingTodoIds = useTodosStore((state) => state.floatingTodoIds);
  const selectedDateKey = useTodosStore((state) => state.selectedDateKey);
  const addTodo = useTodosStore((state) => state.addTodo);
  const selectDate = useTodosStore((state) => state.selectDate);
  const updateTodoText = useTodosStore((state) => state.updateTodoText);
  const moveTodo = useTodosStore((state) => state.moveTodo);
  const toggleTodo = useTodosStore((state) => state.toggleTodo);
  const completeTodos = useTodosStore((state) => state.completeTodos);
  const removeTodo = useTodosStore((state) => state.removeTodo);
  const removeTodos = useTodosStore((state) => state.removeTodos);
  const moveTodosToDate = useTodosStore((state) => state.moveTodosToDate);
  const enableParticles = useSettingsStore((state) => state.enableParticles);
  const timeZone = useSettingsStore((state) => state.timeZone);
  const timeFormat = useSettingsStore((state) => state.timeFormat);
  const [draft, setDraft] = useState("");
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editDateDraft, setEditDateDraft] = useState(selectedDateKey);
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragOverId, setActiveDragOverId] = useState<string | null>(null);
  const [activeDragWidth, setActiveDragWidth] = useState<number | null>(null);
  const [clock, setClock] = useState(() => new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(parseLocalDateKey(selectedDateKey)));
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTodoIds, setSelectedTodoIds] = useState<string[]>([]);
  const [bulkDateDraft, setBulkDateDraft] = useState(selectedDateKey);
  const [dateChangeDialog, setDateChangeDialog] = useState<DateChangeDialogState | null>(null);
  const [pendingBulkConfirmation, setPendingBulkConfirmation] = useState<BulkConfirmationState | null>(null);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [groupFilterState, setGroupFilterState] = useState<TodoGroupFilterState>({ mode: "all" });
  const formRef = useRef<HTMLFormElement>(null);
  const cardScrollRegionRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLTextAreaElement | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const previousTimeZoneRef = useRef(timeZone);
  const allDoneSnapshotRef = useRef({ dateKey: selectedDateKey, open: 0, done: 0 });
  const shouldCelebrateAllDoneRef = useRef(false);
  const allDoneCelebrationTimerRef = useRef<number | null>(null);
  const { bursts, fieldRef, spawnBurst } = useParticleField();
  const [isAllDoneCelebrating, setIsAllDoneCelebrating] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );
  const floatingTodosEnabled = canUseFloatingTodos();
  const selectedDate = useMemo(() => parseLocalDateKey(selectedDateKey), [selectedDateKey]);
  const selectedDateLabel = getRelativeDateLabel(selectedDateKey, timeZone);
  const locale = language === "zh-CN" ? "zh-CN" : "en-US";
  const todoStatsByDate = useMemo(() => buildTodoStats(todos), [todos]);

  const baseVisibleTodos = useMemo(
    () =>
      todos.filter(
        (todo) =>
          todo.dateKey === selectedDateKey &&
          !removingIds.includes(todo.id) &&
          (!floatingTodosEnabled || !floatingTodoIds.includes(todo.id)),
      ),
    [floatingTodoIds, floatingTodosEnabled, removingIds, selectedDateKey, todos],
  );
  const availableFilterKeys = useMemo(
    () => [TODO_FILTER_UNGROUPED_KEY, ...groups.map((group) => group.id)],
    [groups],
  );
  const selectedFilterKeys = useMemo(() => {
    if (groupFilterState.mode === "all") {
      return availableFilterKeys;
    }

    return availableFilterKeys.filter((key) => groupFilterState.keys.includes(key));
  }, [availableFilterKeys, groupFilterState]);
  const selectedFilterKeySet = useMemo(() => new Set(selectedFilterKeys), [selectedFilterKeys]);
  const allGroupsSelected = groupFilterState.mode === "all" || selectedFilterKeys.length === availableFilterKeys.length;
  const visibleTodos = useMemo(() => {
    if (allGroupsSelected) {
      return baseVisibleTodos;
    }

    return baseVisibleTodos.filter((todo) =>
      selectedFilterKeySet.has(todo.groupId ?? TODO_FILTER_UNGROUPED_KEY),
    );
  }, [allGroupsSelected, baseVisibleTodos, selectedFilterKeySet]);
  const openTodos = visibleTodos.filter((todo) => !todo.done);
  const doneTodos = visibleTodos.filter((todo) => todo.done);
  const selectedVisibleTodoIds = useMemo(() => {
    const visibleOpenTodoIds = new Set(openTodos.map((todo) => todo.id));
    return selectedTodoIds.filter((id) => visibleOpenTodoIds.has(id));
  }, [openTodos, selectedTodoIds]);
  const selectedTodoCount = selectedVisibleTodoIds.length;
  const allVisibleSelected = openTodos.length > 0 && selectedVisibleTodoIds.length === openTodos.length;
  const hasOpenTodos = openTodos.length > 0;
  const hasDoneTodos = doneTodos.length > 0;
  const hasMixedTodoStatus = hasOpenTodos && hasDoneTodos;
  const isAllDoneForSelectedDate = hasDoneTodos && !hasOpenTodos;
  const activeDragTodo = openTodos.find((todo) => todo.id === activeDragId) ?? null;
  const activeDragIndex = activeDragId ? openTodos.findIndex((todo) => todo.id === activeDragId) : -1;
  const activeDragOrder = activeDragIndex >= 0 ? activeDragIndex + 1 : undefined;
  const editingTodo = editingTodoId ? (todos.find((todo) => todo.id === editingTodoId) ?? null) : null;
  const calendarQuickDates = useMemo(
    () => [
      { id: "today", label: t.todos.today, dateKey: formatDateKeyInTimeZone(clock, timeZone) },
      { id: "tomorrow", label: t.todos.tomorrow, dateKey: addDaysToDateKey(formatDateKeyInTimeZone(clock, timeZone), 1) },
      { id: "yesterday", label: t.todos.yesterday, dateKey: addDaysToDateKey(formatDateKeyInTimeZone(clock, timeZone), -1) },
    ],
    [clock, t.todos.today, t.todos.tomorrow, t.todos.yesterday, timeZone],
  );
  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);
  const calendarWeekCount = Math.ceil(calendarDays.length / 7);
  const normalizedEditDraft = editDraft.trim();
  const isEditSaveDisabled =
    normalizedEditDraft.length === 0 ||
    (normalizedEditDraft === (editingTodo?.text.trim() ?? "") && editDateDraft === (editingTodo?.dateKey ?? editDateDraft));
  const activeDateDialogDateKey = dateChangeDialog?.mode === "single" ? editDateDraft : bulkDateDraft;
  const isDateDialogConfirmDisabled =
    !dateChangeDialog ||
    !/^\d{4}-\d{2}-\d{2}$/.test(activeDateDialogDateKey) ||
    (dateChangeDialog.mode === "single"
      ? !editingTodo || activeDateDialogDateKey === editingTodo.dateKey
      : selectedTodoCount === 0 || activeDateDialogDateKey === selectedDateKey);
  const dragPointerCoordinates = useDragPointerTracking(Boolean(activeDragId));
  const isFilterActive = !allGroupsSelected;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(new Date());
    }, 30_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const previousSnapshot = allDoneSnapshotRef.current;
    const becameAllDone =
      shouldCelebrateAllDoneRef.current &&
      previousSnapshot.dateKey === selectedDateKey &&
      previousSnapshot.open > 0 &&
      openTodos.length === 0 &&
      doneTodos.length > 0;

    allDoneSnapshotRef.current = {
      dateKey: selectedDateKey,
      open: openTodos.length,
      done: doneTodos.length,
    };
    shouldCelebrateAllDoneRef.current = false;

    if (!becameAllDone) {
      return;
    }

    const fieldBounds = fieldRef.current?.getBoundingClientRect();
    const hasVisibleField = Boolean(fieldBounds && fieldBounds.width > 0 && fieldBounds.height > 0);

    if (!hasVisibleField) {
      return;
    }

    setIsAllDoneCelebrating(true);

    if (allDoneCelebrationTimerRef.current !== null) {
      window.clearTimeout(allDoneCelebrationTimerRef.current);
    }

    if (enableParticles && fieldBounds) {
      spawnBurst(
        {
          x: fieldBounds.left + fieldBounds.width * 0.08,
          y: fieldBounds.top + Math.min(42, Math.max(18, fieldBounds.height * 0.08)),
          width: fieldBounds.width * 0.84,
          height: Math.min(130, Math.max(72, fieldBounds.height * 0.22)),
        },
        "confetti",
      );
    }

    allDoneCelebrationTimerRef.current = window.setTimeout(() => {
      setIsAllDoneCelebrating(false);
      allDoneCelebrationTimerRef.current = null;
    }, 1520);
  }, [doneTodos.length, enableParticles, openTodos.length, selectedDateKey, spawnBurst]);

  useEffect(() => {
    return () => {
      if (allDoneCelebrationTimerRef.current !== null) {
        window.clearTimeout(allDoneCelebrationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setCalendarMonth(startOfMonth(selectedDate));
  }, [selectedDate]);

  useEffect(() => {
    const previousTimeZone = previousTimeZoneRef.current;
    if (previousTimeZone === timeZone) {
      return;
    }

    const previousTodayDateKey = formatDateKeyInTimeZone(new Date(), previousTimeZone);
    const nextTodayDateKey = formatDateKeyInTimeZone(new Date(), timeZone);
    previousTimeZoneRef.current = timeZone;

    if (selectedDateKey === previousTodayDateKey && selectedDateKey !== nextTodayDateKey) {
      selectDate(nextTodayDateKey);
    }
  }, [selectDate, selectedDateKey, timeZone]);

  useEffect(() => {
    if (isCalendarOpen) {
      setCalendarMonth(startOfMonth(selectedDate));
    }
  }, [isCalendarOpen, selectedDate]);

  useEffect(() => {
    const existingTodoIds = new Set(todos.map((todo) => todo.id));
    setSelectedTodoIds((current) => current.filter((id) => existingTodoIds.has(id)));
  }, [todos]);

  useEffect(() => {
    setGroupFilterState((current) => {
      if (current.mode === "all") {
        return current;
      }

      const nextKeys = availableFilterKeys.filter((key) => current.keys.includes(key));
      const isUnchanged =
        nextKeys.length === current.keys.length && nextKeys.every((key, index) => key === current.keys[index]);

      if (nextKeys.length === availableFilterKeys.length) {
        return { mode: "all" };
      }

      return isUnchanged ? current : { mode: "custom", keys: nextKeys };
    });
  }, [availableFilterKeys]);

  useEffect(() => {
    if (!isSelectionMode) {
      return;
    }

    setActiveDragId(null);
    setActiveDragOverId(null);
    setActiveDragWidth(null);
  }, [isSelectionMode]);

  useEffect(() => {
    if (typeof window === "undefined" || isCalendarOpen || editingTodoId) {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.key !== "Enter" ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        event.isComposing ||
        isEditableTarget(event.target)
      ) {
        return;
      }

      event.preventDefault();
      draftRef.current?.focus();
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [editingTodoId, isCalendarOpen]);

  useEffect(() => {
    if (!activeDragId || !dragPointerCoordinates || typeof document === "undefined") {
      setActiveDragOverId(null);
      return;
    }

    const nextTarget =
      document
        .elementsFromPoint(dragPointerCoordinates.x, dragPointerCoordinates.y)
        .map((element) => element.closest("[data-todo-item-id]") as HTMLElement | null)
        .find((element) => {
          const id = element?.dataset.todoItemId;
          return Boolean(id && id !== activeDragId);
        })?.dataset.todoItemId ?? null;

    setActiveDragOverId(nextTarget);
  }, [activeDragId, dragPointerCoordinates]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const created = addTodo(draft);
    if (!created) {
      return;
    }

    setDraft("");
    if (enableParticles && formRef.current) {
      spawnBurst(formRef.current.getBoundingClientRect(), "amber");
    }
  };

  const handleDeleteTodo = (id: string, target: DOMRect) => {
    if (removingIds.includes(id)) {
      return;
    }

    const deletedTodo = todos.find((todo) => todo.id === id) ?? null;
    const particleColor = deletedTodo ? resolveTodoAccentColor(deletedTodo, groups) : undefined;

    if (enableParticles) {
      spawnBurst(target, "rose", { color: particleColor });
    }
    setRemovingIds((current) => [...current, id]);
    window.setTimeout(() => {
      removeTodo(id);
      setRemovingIds((current) => current.filter((item) => item !== id));
    }, 220);
  };

  const openEditDialog = (todo: TodoItemModel) => {
    setEditingTodoId(todo.id);
    setEditDraft(todo.text);
    setEditDateDraft(todo.dateKey);
    setCalendarMonth(startOfMonth(parseLocalDateKey(todo.dateKey)));
  };

  const closeEditDialog = () => {
    setEditingTodoId(null);
    setEditDraft("");
    setEditDateDraft(selectedDateKey);
    setDateChangeDialog((current) => (current?.mode === "single" ? null : current));
  };

  const handleSaveEdit = () => {
    if (!editingTodo) {
      return;
    }

    let changed = false;

    if (normalizedEditDraft.length > 0 && normalizedEditDraft !== editingTodo.text.trim()) {
      changed = updateTodoText(editingTodo.id, normalizedEditDraft) || changed;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(editDateDraft) && editDateDraft !== editingTodo.dateKey) {
      moveTodosToDate([editingTodo.id], editDateDraft);
      changed = true;
    }

    if (changed) {
      closeEditDialog();
    }
  };

  const handleToggleTodo = (id: string, target: DOMRect, nextDone: boolean) => {
    if (nextDone && openTodos.length === 1 && openTodos.some((todo) => todo.id === id)) {
      shouldCelebrateAllDoneRef.current = true;
    }

    toggleTodo(id);
    if (enableParticles && nextDone) {
      spawnBurst(target, "green");
    }
  };

  const enterSelectionMode = () => {
    closeEditDialog();
    setIsCalendarOpen(false);
    setIsGroupDialogOpen(false);
    setIsFilterDialogOpen(false);
    setDateChangeDialog(null);
    setPendingBulkConfirmation(null);
    setSelectedTodoIds([]);
    setIsSelectionMode(true);
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedTodoIds([]);
    setDateChangeDialog((current) => (current?.mode === "bulk" ? null : current));
    setPendingBulkConfirmation(null);
  };

  const toggleSelectedTodo = (id: string) => {
    const todo = visibleTodos.find((item) => item.id === id);
    if (!todo || todo.done) {
      return;
    }

    setSelectedTodoIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    );
  };

  const toggleSelectAllVisibleTodos = () => {
    if (allVisibleSelected) {
      setSelectedTodoIds([]);
      return;
    }

    setSelectedTodoIds(openTodos.map((todo) => todo.id));
  };

  const requestBulkAction = (action: BulkTodoAction) => {
    if (selectedTodoCount === 0) {
      return;
    }

    if (action === "date") {
      setBulkDateDraft(selectedDateKey);
      setCalendarMonth(startOfMonth(parseLocalDateKey(selectedDateKey)));
      setDateChangeDialog({ mode: "bulk", title: t.todos.bulkDateDialogTitle });
      return;
    }

    setPendingBulkConfirmation({ action });
  };

  const closeBulkConfirmation = () => {
    setPendingBulkConfirmation(null);
  };

  const openSingleDateDialog = () => {
    setCalendarMonth(startOfMonth(parseLocalDateKey(editDateDraft)));
    setDateChangeDialog({ mode: "single", title: t.todos.changeTodoDate });
  };

  const closeDateChangeDialog = () => {
    setDateChangeDialog(null);
  };

  const confirmBulkAction = () => {
    if (!pendingBulkConfirmation || selectedTodoCount === 0) {
      return;
    }

    const ids = selectedVisibleTodoIds;
    if (pendingBulkConfirmation.action === "complete") {
      if (openTodos.length > 0 && ids.length === openTodos.length) {
        shouldCelebrateAllDoneRef.current = true;
      }

      completeTodos(ids);
    }

    if (pendingBulkConfirmation.action === "delete") {
      if (enableParticles) {
        ids.forEach((id) => {
          const deletedTodo = todos.find((todo) => todo.id === id) ?? null;
          const target = document.querySelector<HTMLElement>(`[data-todo-item-id="${id}"]`)?.getBoundingClientRect();

          if (deletedTodo && target) {
            spawnBurst(target, "rose", { color: resolveTodoAccentColor(deletedTodo, groups) });
          }
        });
      }

      removeTodos(ids);
    }

    if (pendingBulkConfirmation.action === "date") {
      moveTodosToDate(ids, bulkDateDraft);
    }

    exitSelectionMode();
  };

  const confirmDateChange = () => {
    if (!dateChangeDialog || isDateDialogConfirmDisabled) {
      return;
    }

    if (dateChangeDialog.mode === "single") {
      if (editingTodo && editDateDraft !== editingTodo.dateKey) {
        moveTodosToDate([editingTodo.id], editDateDraft);
      }
      setDateChangeDialog(null);
      return;
    }

    moveTodosToDate(selectedVisibleTodoIds, bulkDateDraft);
    exitSelectionMode();
  };

  const handleSelectDateKey = (dateKey: string) => {
    selectDate(dateKey);
    setIsCalendarOpen(false);
  };

  const handleSelectBulkDateKey = (dateKey: string) => {
    setBulkDateDraft(dateKey);
  };

  const handleSelectEditDateKey = (dateKey: string) => {
    setEditDateDraft(dateKey);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = String(event.active.id);
    setActiveDragId(activeId);
    setActiveDragOverId(null);
    setActiveDragWidth(event.active.rect.current.initial?.width ?? null);
    syncLatestDragPointerCoordinates(event.activatorEvent);

    if (!floatingTodosEnabled) {
      return;
    }

    const rect = document.querySelector<HTMLElement>(`[data-todo-item-id="${activeId}"]`)?.getBoundingClientRect();
    const coordinates = readEventCoordinates(event.activatorEvent);
    const activeTodo = openTodos.find((todo) => todo.id === activeId);

    if (!rect || !coordinates || !activeTodo) {
      return;
    }

    void showDragPreview(
      buildTodoDragPreviewPayload({
        todo: activeTodo,
        groups,
        language,
        timeZone,
        timeFormat,
        order: openTodos.findIndex((todo) => todo.id === activeId) + 1,
        rect,
        coordinates,
      }),
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const activeTodo = openTodos.find((todo) => todo.id === activeId) ?? null;
    const overId = resolveDragReorderTarget({
      activeId,
      eventOverId: event.over ? String(event.over.id) : null,
      previewOverId: activeDragOverId,
    });

    setActiveDragId(null);
    setActiveDragOverId(null);
    setActiveDragWidth(null);

    if (!overId) {
      if (!floatingTodosEnabled) {
        return;
      }

      const rect = document.querySelector<HTMLElement>(`[data-todo-item-id="${activeId}"]`)?.getBoundingClientRect();
      const coordinates = dragPointerCoordinates;

      if (activeTodo && rect && coordinates) {
        void showFloatingCard(
          buildTodoDragPreviewPayload({
            todo: activeTodo,
            groups,
            language,
            timeZone,
            timeFormat,
            order: openTodos.findIndex((todo) => todo.id === activeId) + 1,
            rect,
            coordinates,
          }),
        );
      }
      void hideDragPreview();
      return;
    }
    if (floatingTodosEnabled) {
      void hideDragPreview();
    }
    moveTodo(activeId, overId);
  };

  const handleApplyGroupFilters = (keys: string[]) => {
    const normalizedKeys = availableFilterKeys.filter((item) => keys.includes(item));

    setGroupFilterState(
      normalizedKeys.length === availableFilterKeys.length
        ? { mode: "all" }
        : { mode: "custom", keys: normalizedKeys },
    );
  };

  const handleDraftKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) {
      return;
    }

    if (isPrimaryShortcut(event, "a")) {
      event.preventDefault();
      event.currentTarget.focus();
      event.currentTarget.select();
      return;
    }

    if (isPrimaryShortcut(event, "c")) {
      event.preventDefault();
      void handleDraftCopy(event.currentTarget);
      return;
    }

    if (isPrimaryShortcut(event, "v")) {
      event.preventDefault();
      void handleDraftPaste(event.currentTarget);
      return;
    }

    if (event.key === "Enter") {
      if (event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey) {
        return;
      }

      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  useEffect(() => {
    if (draftRef.current) {
      syncTextareaHeight(draftRef.current);
    }
  }, [draft]);

  useEffect(() => {
    if (!editingTodoId) {
      return;
    }

    if (!todos.some((todo) => todo.id === editingTodoId)) {
      closeEditDialog();
    }
  }, [editingTodoId, todos]);

  useEffect(() => {
    if (dateChangeDialog?.mode === "single" && !editingTodo) {
      setDateChangeDialog(null);
    }
  }, [dateChangeDialog, editingTodo]);

  useEffect(() => {
    if (!editingTodo || typeof window === "undefined") {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    });

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        closeEditDialog();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [editingTodo]);

  const replaceDraftSelection = (textarea: HTMLTextAreaElement, text: string) => {
    const selectionStart = textarea.selectionStart ?? textarea.value.length;
    const selectionEnd = textarea.selectionEnd ?? selectionStart;
    const nextDraft = `${textarea.value.slice(0, selectionStart)}${text}${textarea.value.slice(selectionEnd)}`;
    const nextCaret = selectionStart + text.length;

    setDraft(nextDraft);
    window.requestAnimationFrame(() => {
      if (!draftRef.current) {
        return;
      }

      draftRef.current.focus();
      draftRef.current.setSelectionRange(nextCaret, nextCaret);
      syncTextareaHeight(draftRef.current);
    });
  };

  const handleDraftCopy = async (textarea: HTMLTextAreaElement) => {
    const selectionStart = textarea.selectionStart ?? 0;
    const selectionEnd = textarea.selectionEnd ?? selectionStart;
    const text = textarea.value.slice(selectionStart, selectionEnd);

    if (!text) {
      return;
    }

    await writePlainTextToClipboard(text);
  };

  const handleDraftPaste = async (textarea: HTMLTextAreaElement) => {
    const text = await readPlainTextFromClipboard();

    if (!text) {
      return;
    }

    replaceDraftSelection(textarea, text);
  };

  const pendingBulkTitle =
    pendingBulkConfirmation?.action === "complete"
      ? t.todos.bulkCompleteDialogTitle
      : pendingBulkConfirmation?.action === "delete"
        ? t.todos.bulkDeleteDialogTitle
        : t.todos.bulkDateDialogTitle;
  const pendingBulkBody =
    pendingBulkConfirmation?.action === "complete"
      ? t.todos.bulkCompleteDialogBody(selectedTodoCount)
      : pendingBulkConfirmation?.action === "delete"
        ? t.todos.bulkDeleteDialogBody(selectedTodoCount)
        : t.todos.bulkDateDialogBody(selectedTodoCount);
  const pendingBulkConfirmLabel =
    pendingBulkConfirmation?.action === "complete"
      ? t.todos.bulkCompleteConfirm
      : pendingBulkConfirmation?.action === "delete"
        ? t.todos.bulkDeleteConfirm
        : t.todos.bulkDateConfirm;
  const toolbarButtonClass =
    "inline-flex h-[35px] w-[35px] min-h-[35px] min-w-[35px] shrink-0 items-center justify-center rounded-[9px] border border-[rgba(213,198,180,0.7)] bg-[rgba(255,255,255,0.62)] p-[7px] text-[var(--brown-strong)] shadow-[0_5px_10px_rgba(61,49,34,0.045)] transition-colors hover:bg-[rgba(255,255,255,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(47,107,255,0.3)]";
  const selectAllButtonClass = allVisibleSelected
    ? "inline-flex h-[35px] w-[35px] min-h-[35px] min-w-[35px] shrink-0 items-center justify-center rounded-[9px] border border-[rgba(31,168,122,0.5)] bg-[rgba(31,168,122,0.95)] p-[7px] text-white shadow-[0_8px_16px_rgba(31,168,122,0.18)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(47,107,255,0.3)]"
    : toolbarButtonClass;
  const todoToolbar = (
    <motion.nav
      aria-label={t.todos.toolbarLabel}
      data-no-window-drag="true"
      className="relative z-10 flex min-h-9 w-full shrink-0 items-center justify-start gap-1 overflow-visible px-1 py-0"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {isSelectionMode ? (
          <motion.div
            key="selection-toolbar"
            className="relative z-10 flex w-full min-w-0 items-center justify-between gap-2"
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 3 }}
          >
            <div className="flex min-w-0 items-center gap-2">
              <motion.button
                type="button"
                aria-label={t.todos.selectAllTodos}
                data-tooltip={t.todos.selectAllTodos}
                disabled={openTodos.length === 0}
                className={`${selectAllButtonClass} ${openTodos.length === 0 ? "cursor-not-allowed opacity-40" : ""}`}
                whileHover={openTodos.length === 0 ? undefined : { y: -1, scale: 1.03 }}
                whileTap={openTodos.length === 0 ? undefined : { scale: 0.97 }}
                onClick={toggleSelectAllVisibleTodos}
              >
                {allVisibleSelected ? (
                  <CheckSquareIcon size={18} />
                ) : (
                  <span aria-hidden="true" className="h-[18px] w-[18px] rounded-[3px] border border-current" />
                )}
              </motion.button>
              <motion.button
                type="button"
                aria-label={t.todos.bulkComplete}
                data-tooltip={t.todos.bulkComplete}
                disabled={selectedTodoCount === 0}
                className={`${toolbarButtonClass} ${selectedTodoCount === 0 ? "cursor-not-allowed opacity-40" : ""}`}
                whileHover={selectedTodoCount === 0 ? undefined : { y: -1, scale: 1.03 }}
                whileTap={selectedTodoCount === 0 ? undefined : { scale: 0.97 }}
                onClick={() => requestBulkAction("complete")}
              >
                <CircleCheckBigIcon size={21} />
              </motion.button>
              <motion.button
                type="button"
                aria-label={t.todos.bulkSetDate}
                data-tooltip={t.todos.bulkSetDate}
                disabled={selectedTodoCount === 0}
                className={`${toolbarButtonClass} ${selectedTodoCount === 0 ? "cursor-not-allowed opacity-40" : ""}`}
                whileHover={selectedTodoCount === 0 ? undefined : { y: -1, scale: 1.03 }}
                whileTap={selectedTodoCount === 0 ? undefined : { scale: 0.97 }}
                onClick={() => requestBulkAction("date")}
              >
                <CalendarDaysIcon size={21} />
              </motion.button>
              <motion.button
                type="button"
                aria-label={t.todos.bulkDelete}
                data-tooltip={t.todos.bulkDelete}
                disabled={selectedTodoCount === 0}
                className={`${toolbarButtonClass} ${selectedTodoCount === 0 ? "cursor-not-allowed opacity-40" : ""}`}
                whileHover={selectedTodoCount === 0 ? undefined : { y: -1, scale: 1.03 }}
                whileTap={selectedTodoCount === 0 ? undefined : { scale: 0.97 }}
                onClick={() => requestBulkAction("delete")}
              >
                <Trash2Icon size={21} />
              </motion.button>
              <motion.button
                type="button"
                aria-label={t.todos.exitSelection}
                data-tooltip={t.todos.exitSelection}
                className={toolbarButtonClass}
                whileHover={{ y: -1, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={exitSelectionMode}
              >
                <XIcon size={21} />
              </motion.button>
            </div>
            <span className="min-w-0 truncate px-1 text-[10px] font-semibold text-[var(--muted)]">
              {t.todos.selectedCount(selectedTodoCount)}
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="default-toolbar"
            className="relative z-10 flex w-full min-w-0 items-center justify-start gap-2"
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 3 }}
          >
            <motion.button
              type="button"
              aria-label={t.todos.multiSelect}
              data-tooltip={t.todos.multiSelect}
              className={toolbarButtonClass}
              whileHover={{ y: -1, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={enterSelectionMode}
            >
              <CheckSquareIcon size={21} />
            </motion.button>
            <motion.button
              type="button"
              aria-label={t.todos.addGroup}
              data-tooltip={t.todos.groupFeatureComingSoon}
              className={`${toolbarButtonClass} opacity-78`}
              whileHover={{ y: -1, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsGroupDialogOpen(true)}
            >
              <GroupPlusIcon size={21} />
            </motion.button>
            <motion.button
              type="button"
              aria-label={t.todos.filterGroups}
              aria-pressed={isFilterActive}
              data-tooltip={t.todos.filterGroups}
              className={`${toolbarButtonClass} relative opacity-78 ${
                isFilterActive
                  ? "border-[rgba(156,126,94,0.5)] bg-[rgba(255,249,243,0.96)] text-[var(--brown-strong)]"
                  : ""
              }`}
              whileHover={{ y: -1, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsFilterDialogOpen(true)}
            >
              <GroupFilterIcon size={21} />
              {isFilterActive ? (
                <span className="absolute -right-1 -top-1 inline-flex min-w-[16px] items-center justify-center rounded-full bg-[var(--brown-strong)] px-1 py-0.5 text-[8.5px] font-bold leading-none text-white shadow-[0_8px_16px_rgba(61,49,34,0.18)]">
                  {selectedFilterKeys.length}
                </span>
              ) : null}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );

  return (
    <section className="cq-module flex h-full min-h-0 flex-col gap-2.5">
      <motion.div
        data-no-window-drag="true"
        className="paper-button relative mx-1 mt-1 flex w-[calc(100%-0.5rem)] flex-col items-start gap-0.5 overflow-hidden rounded-[20px] border-[rgba(193,214,220,0.58)] bg-[linear-gradient(135deg,rgba(255,251,246,0.9),rgba(240,249,249,0.82)_48%,rgba(255,248,239,0.86))] px-2.5 py-2 text-left shadow-[0_12px_24px_rgba(61,49,34,0.085),inset_0_1px_0_rgba(255,255,255,0.72)]"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -1.5, scale: 1.005 }}
        whileTap={{ scale: 0.985 }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(rgba(30,25,21,0.045) 0.6px, transparent 0.6px), linear-gradient(90deg, rgba(31,168,122,0.1), transparent 36%, rgba(47,107,255,0.08))",
            backgroundSize: "10px 10px, 100% 100%",
          }}
        />
        <button
          type="button"
          aria-label={t.todos.openCalendar}
          data-tooltip={t.todos.openCalendar}
          data-tooltip-placement="bottom"
          className={`relative z-10 grid min-h-[72px] w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[15px] px-2 py-2 text-left outline-none transition-colors hover:bg-[rgba(255,255,255,0.34)] focus-visible:ring-2 focus-visible:ring-[rgba(47,107,255,0.32)] ${
            isAllDoneCelebrating ? "todo-all-done-cheer" : ""
          }`}
          onClick={() => setIsCalendarOpen(true)}
        >
          <span className="min-w-0">
            <span className="block font-display text-[20px] font-semibold leading-none tracking-normal text-[var(--brown-strong)]">
              {selectedDateKey.replace(/-/g, ".")}
            </span>
            <span className="mt-1.5 block truncate text-[11.5px] font-semibold leading-4 text-[var(--muted)]">
              {formatTimeInTimeZone(clock, timeZone, timeFormat)} · {formatDateKeyLong(selectedDateKey, locale)}
            </span>
          </span>
          {hasOpenTodos || hasDoneTodos ? (
            <span className={`flex min-h-[38px] shrink-0 flex-col ${hasMixedTodoStatus ? "justify-center gap-1" : "justify-center"}`}>
              {hasOpenTodos ? (
                <span className="todo-date-status-chip" data-tone="coral">
                  {t.todos.undoneCount(openTodos.length)}
                </span>
              ) : null}
              {hasDoneTodos && !isAllDoneForSelectedDate ? (
                <span className="todo-date-status-chip" data-tone="jade">
                  {t.todos.doneCount(doneTodos.length)}
                </span>
              ) : null}
              {isAllDoneForSelectedDate ? (
                <span className="todo-date-celebration-chip" data-celebrating={isAllDoneCelebrating ? "true" : undefined}>
                  {t.todos.allDone}
                </span>
              ) : null}
            </span>
          ) : null}
          {selectedDateLabel ? (
            <span className="flex shrink-0 flex-col items-end justify-center gap-1">
              <span className="shrink-0 rounded-[12px] border border-[rgba(81,127,145,0.14)] bg-[rgba(239,248,249,0.86)] px-3 py-1.5 text-[11.5px] font-bold leading-none text-[var(--status-upcoming)]">
                {selectedDateLabel}
              </span>
            </span>
          ) : null}
        </button>
      </motion.div>

      <div className="mx-1 -mt-0.5 flex min-h-8 items-center">
        {todoToolbar}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        ref={fieldRef}
        className="relative min-h-0 flex-1"
      >
        <ParticleField bursts={enableParticles ? bursts : []} />

        <div
          ref={cardScrollRegionRef}
          data-testid="todo-card-scroll-region"
          className="paper-scroll relative h-full overflow-y-auto pr-1"
        >
          <ThemeAtmosphere scrollRootRef={cardScrollRegionRef} />
          <div data-theme-scroll-content className="relative z-10 min-h-full">
          {visibleTodos.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-[rgba(213,198,180,0.88)] bg-[rgba(255,255,255,0.34)] px-6 text-center text-[12.5px] leading-6 text-[var(--muted)]"
            >
              {baseVisibleTodos.length === 0 ? t.todos.empty : t.todos.filteredEmpty}
            </motion.div>
          ) : (
            <div className="flex flex-col gap-2 pb-1 pt-1">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={() => {
                  setActiveDragId(null);
                  setActiveDragOverId(null);
                  setActiveDragWidth(null);
                  if (floatingTodosEnabled) {
                    void hideDragPreview();
                  }
                }}
              >
                <SortableContext items={openTodos.map((todo) => todo.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-1.5">
                    <AnimatePresence>
                      {openTodos.map((todo, index) => (
                        <TodoItem
                          key={todo.id}
                          todo={todo}
                          order={index + 1}
                          onDelete={handleDeleteTodo}
                          onEdit={openEditDialog}
                          onSelect={toggleSelectedTodo}
                          onToggle={handleToggleTodo}
                          dropPreview={activeDragOverId === todo.id && activeDragId !== todo.id}
                          isSelected={selectedVisibleTodoIds.includes(todo.id)}
                          selectionMode={isSelectionMode}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </SortableContext>

                {typeof document !== "undefined"
                  ? createPortal(
                      <DragOverlay
                        modifiers={[centerOverlayToCursor]}
                        dropAnimation={{
                          duration: 180,
                          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
                        }}
                      >
                        {activeDragTodo ? (
                          <TodoItemPreview
                            todo={activeDragTodo}
                            width={activeDragWidth ?? undefined}
                            order={activeDragOrder}
                          />
                        ) : null}
                      </DragOverlay>,
                      document.body,
                    )
                  : null}
              </DndContext>

              {doneTodos.length > 0 ? (
                <div className="flex flex-col gap-1.5 pt-0.5">
                  <AnimatePresence>
                    {doneTodos.map((todo) => (
                      <CompletedTodoItem
                        key={todo.id}
                        todo={todo}
                        onDelete={handleDeleteTodo}
                        onEdit={openEditDialog}
                        onSelect={toggleSelectedTodo}
                        onToggle={handleToggleTodo}
                        isSelected={selectedVisibleTodoIds.includes(todo.id)}
                        selectionMode={isSelectionMode}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : null}
            </div>
          )}
          </div>
        </div>
      </motion.div>

      <div className="pb-1.5">
        <form
          ref={formRef}
          className="paper-card relative overflow-visible rounded-[18px] px-2.5 py-2"
          onSubmit={handleSubmit}
        >
          <label htmlFor="todo-input" className="sr-only">
            {t.todos.quickAdd}
          </label>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_68px] items-center gap-2">
            <textarea
              ref={draftRef}
              id="todo-input"
              rows={1}
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
              onCopy={(event: ClipboardEvent<HTMLTextAreaElement>) => {
                const selectionStart = event.currentTarget.selectionStart ?? 0;
                const selectionEnd = event.currentTarget.selectionEnd ?? selectionStart;
                const text = event.currentTarget.value.slice(selectionStart, selectionEnd);

                if (!text) {
                  return;
                }

                event.preventDefault();
                if (isNativeStickItHost()) {
                  void writePlainTextToClipboard(text);
                  return;
                }

                event.clipboardData.setData("text/plain", text);
              }}
              onInput={(event) => syncTextareaHeight(event.currentTarget)}
              onPaste={(event) => {
                event.preventDefault();
                const text = event.clipboardData.getData("text/plain");

                if (text) {
                  replaceDraftSelection(event.currentTarget, text);
                  return;
                }

                if (isNativeStickItHost()) {
                  void handleDraftPaste(event.currentTarget);
                }
              }}
              onKeyDown={handleDraftKeyDown}
              placeholder={t.todos.quickAddPlaceholder}
              className="textarea-reset surface-field wrap-anywhere min-h-[42px] min-w-0 rounded-[14px] px-3 py-2 text-[12px] font-medium leading-[1.35] text-[var(--dark-text)] outline-none placeholder:text-[10px] placeholder:leading-[1.25] placeholder:text-[var(--muted)]"
            />
            <div className="flex items-center justify-end">
              <motion.button
                type="submit"
                aria-label={t.todos.add}
                data-tooltip={t.todos.quickAddSubmitTooltip}
                data-tooltip-align="left"
                disabled={!draft.trim()}
                className={`quick-add-submit inline-flex h-10 w-16 items-center justify-center rounded-full border transition-colors ${
                  draft.trim()
                    ? "paper-button paper-button-primary border-transparent"
                    : "border-[rgba(213,198,180,0.94)] bg-[rgba(227,221,213,0.72)] text-[rgba(160,152,143,0.96)] shadow-none"
                }`}
                whileHover={draft.trim() ? { y: -2, scale: 1.03 } : undefined}
                whileTap={draft.trim() ? { scale: 0.97 } : undefined}
              >
                <CornerDownLeftIcon size={15} />
              </motion.button>
            </div>
          </div>
        </form>
      </div>

      <TodoGroupDialog isOpen={isGroupDialogOpen} onClose={() => setIsGroupDialogOpen(false)} />
      <TodoGroupFilterDialog
        isOpen={isFilterDialogOpen}
        selectedKeys={selectedFilterKeySet}
        onClose={() => setIsFilterDialogOpen(false)}
        onApplySelection={handleApplyGroupFilters}
      />

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {isCalendarOpen ? (
                <motion.div
                  data-no-window-drag="true"
                  className="stickit-modal-backdrop fixed inset-0 z-[88] flex items-center justify-center bg-[rgba(30,25,21,0.24)] px-5 py-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsCalendarOpen(false)}
                >
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-label={t.todos.openCalendar}
                    className="paper-panel flex max-h-[calc(100dvh-2rem)] w-full max-w-[430px] flex-col overflow-hidden rounded-[24px] p-4 shadow-[0_26px_48px_rgba(30,25,21,0.24)]"
                    initial={{ opacity: 0, scale: 0.95, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 8 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="mb-2 flex items-center justify-end">
                      <motion.button
                        type="button"
                        aria-label={t.common.close}
                        data-tooltip={t.common.close}
                        data-tooltip-align="left"
                        data-no-window-drag="true"
                        className="paper-icon-button inline-flex h-8 w-8 min-h-0 min-w-0 rounded-[11px]"
                        whileHover={{ y: -1.5, scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setIsCalendarOpen(false)}
                      >
                        <XIcon size={13.5} />
                      </motion.button>
                    </div>

                    <TodoCalendarView
                      calendarMonth={calendarMonth}
                      calendarWeekCount={calendarWeekCount}
                      calendarDays={calendarDays}
                      locale={locale}
                      language={language}
                      timeZone={timeZone}
                      selectedDateKey={selectedDateKey}
                      todoStatsByDate={todoStatsByDate}
                      quickDates={calendarQuickDates}
                      t={t}
                      onPreviousMonth={() => setCalendarMonth((current) => addDays(startOfMonth(current), -1))}
                      onNextMonth={() => setCalendarMonth((current) => addDays(endOfMonth(current), 1))}
                      onSelectDateKey={handleSelectDateKey}
                    />
                  </motion.div>
                </motion.div>
              ) : null}

              {editingTodo ? (
                <motion.div
                  data-no-window-drag="true"
                  className="stickit-modal-backdrop fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(30,25,21,0.24)] px-5 py-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={closeEditDialog}
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
                        <span className="status-chip" data-tone={editingTodo.done ? "jade" : "coral"}>
                          <SquarePenIcon size={11} />
                          {editingTodo.done ? t.todos.statusDone : t.todos.statusUndone}
                        </span>
                        <p className="mt-2 font-display text-[22px] font-semibold tracking-[-0.05em] text-[var(--brown-strong)]">
                          {t.todos.editDialogTitle}
                        </p>
                        <p className="mt-1 text-[12px] leading-6 text-[var(--muted)]">
                          {t.todos.editDialogSubtitle}
                        </p>
                      </div>
                      <motion.button
                        type="button"
                        aria-label={t.common.close}
                        data-tooltip={t.common.close}
                        data-no-window-drag="true"
                        className="paper-icon-button inline-flex h-9 w-9 min-h-0 min-w-0 rounded-[12px]"
                        whileHover={{ y: -1.5, scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={closeEditDialog}
                      >
                        <XIcon size={14} />
                      </motion.button>
                    </div>

                    <form
                      className="space-y-4"
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleSaveEdit();
                      }}
                    >
                      <label className="flex flex-col gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                          {t.todos.titleLabel}
                        </span>
                        <input
                          ref={editInputRef}
                          type="text"
                          aria-label={t.todos.titleLabel}
                          value={editDraft}
                          onChange={(event) => setEditDraft(event.currentTarget.value)}
                          placeholder={t.todos.titlePlaceholder}
                          className="surface-field min-w-0 rounded-[16px] px-3 py-2.5 text-[12.5px] font-medium text-[var(--dark-text)] outline-none placeholder:text-[var(--muted)]"
                        />
                      </label>

                      <div className="flex flex-col gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                          {t.todos.date}
                        </span>
                        <motion.button
                          type="button"
                          data-no-window-drag="true"
                          data-tooltip={t.todos.date}
                          className="surface-field inline-flex w-full items-center justify-between rounded-[16px] border px-3 py-2.5 text-left text-[12.5px] font-medium text-[var(--dark-text)]"
                          whileHover={{ y: -1.5, scale: 1.005 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={openSingleDateDialog}
                        >
                          <span>{formatDateKeyLong(editDateDraft, locale)}</span>
                          <CalendarDaysIcon size={15} />
                        </motion.button>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <motion.button
                          type="button"
                          data-no-window-drag="true"
                          data-tooltip={t.common.cancel}
                          className="paper-button inline-flex items-center justify-center rounded-[14px] px-3.5 py-2.5 text-[12px] font-semibold text-[var(--dark-text)]"
                          whileHover={{ y: -1.5, scale: 1.01 }}
                          whileTap={{ scale: 0.985 }}
                          onClick={closeEditDialog}
                        >
                          {t.common.cancel}
                        </motion.button>
                        <motion.button
                          type="submit"
                          data-no-window-drag="true"
                          data-tooltip={t.common.save}
                          disabled={isEditSaveDisabled}
                          className={`paper-button paper-button-primary inline-flex items-center justify-center rounded-[14px] px-3.5 py-2.5 text-[12px] font-semibold ${
                            isEditSaveDisabled ? "cursor-not-allowed opacity-60" : ""
                          }`}
                          whileHover={isEditSaveDisabled ? undefined : { y: -1.5, scale: 1.01 }}
                          whileTap={isEditSaveDisabled ? undefined : { scale: 0.985 }}
                        >
                          {t.common.save}
                        </motion.button>
                      </div>
                    </form>
                  </motion.div>
                </motion.div>
              ) : null}

              {dateChangeDialog ? (
                <motion.div
                  data-no-window-drag="true"
                  className="stickit-modal-backdrop fixed inset-0 z-[91] flex items-center justify-center bg-[rgba(30,25,21,0.24)] px-5 py-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={closeDateChangeDialog}
                >
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-label={dateChangeDialog.title}
                    className="paper-panel flex max-h-[calc(100dvh-2rem)] w-full max-w-[430px] flex-col overflow-hidden rounded-[24px] p-4 shadow-[0_26px_48px_rgba(30,25,21,0.24)]"
                    initial={{ opacity: 0, scale: 0.95, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 8 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-[22px] font-semibold tracking-normal text-[var(--brown-strong)]">
                          {dateChangeDialog.title}
                        </p>
                      </div>
                      <motion.button
                        type="button"
                        aria-label={t.common.close}
                        data-tooltip={t.common.close}
                        data-no-window-drag="true"
                        className="paper-icon-button inline-flex h-9 w-9 min-h-0 min-w-0 rounded-[12px]"
                        whileHover={{ y: -1.5, scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={closeDateChangeDialog}
                      >
                        <XIcon size={14} />
                      </motion.button>
                    </div>

                    <TodoCalendarView
                      calendarMonth={calendarMonth}
                      calendarWeekCount={calendarWeekCount}
                      calendarDays={calendarDays}
                      locale={locale}
                      language={language}
                      timeZone={timeZone}
                      selectedDateKey={activeDateDialogDateKey}
                      todoStatsByDate={todoStatsByDate}
                      quickDates={calendarQuickDates}
                      t={t}
                      onPreviousMonth={() => setCalendarMonth((current) => addDays(startOfMonth(current), -1))}
                      onNextMonth={() => setCalendarMonth((current) => addDays(endOfMonth(current), 1))}
                      onSelectDateKey={dateChangeDialog.mode === "single" ? handleSelectEditDateKey : handleSelectBulkDateKey}
                    />

                    <div className="mt-4 flex justify-end">
                      <motion.button
                        type="button"
                        data-no-window-drag="true"
                        data-tooltip={t.todos.bulkDateConfirm}
                        disabled={isDateDialogConfirmDisabled}
                        className={`paper-button paper-button-primary inline-flex items-center justify-center rounded-[14px] px-3.5 py-2.5 text-[12px] font-semibold ${
                          isDateDialogConfirmDisabled ? "cursor-not-allowed opacity-60" : ""
                        }`}
                        whileHover={isDateDialogConfirmDisabled ? undefined : { y: -1.5, scale: 1.01 }}
                        whileTap={isDateDialogConfirmDisabled ? undefined : { scale: 0.985 }}
                        onClick={confirmDateChange}
                      >
                        {t.todos.bulkDateConfirm}
                      </motion.button>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}

              {pendingBulkConfirmation ? (
                <motion.div
                  data-no-window-drag="true"
                  className="stickit-modal-backdrop fixed inset-0 z-[92] flex items-center justify-center bg-[rgba(30,25,21,0.24)] px-5 py-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={closeBulkConfirmation}
                >
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-label={pendingBulkTitle}
                    className="paper-panel flex w-full max-w-[390px] flex-col rounded-[24px] p-5 shadow-[0_26px_48px_rgba(30,25,21,0.24)]"
                    initial={{ opacity: 0, scale: 0.95, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 8 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-[22px] font-semibold tracking-normal text-[var(--brown-strong)]">
                          {pendingBulkTitle}
                        </p>
                        <p className="mt-1 text-[12px] leading-6 text-[var(--muted)]">{pendingBulkBody}</p>
                      </div>
                      <motion.button
                        type="button"
                        aria-label={t.common.close}
                        data-tooltip={t.common.close}
                        data-no-window-drag="true"
                        className="paper-icon-button inline-flex h-9 w-9 min-h-0 min-w-0 rounded-[12px]"
                        whileHover={{ y: -1.5, scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={closeBulkConfirmation}
                      >
                        <XIcon size={14} />
                      </motion.button>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <motion.button
                        type="button"
                        data-no-window-drag="true"
                        data-tooltip={t.common.cancel}
                        className="paper-button inline-flex items-center justify-center rounded-[14px] px-3.5 py-2.5 text-[12px] font-semibold text-[var(--dark-text)]"
                        whileHover={{ y: -1.5, scale: 1.01 }}
                        whileTap={{ scale: 0.985 }}
                        onClick={closeBulkConfirmation}
                      >
                        {t.common.cancel}
                      </motion.button>
                      <motion.button
                        type="button"
                        data-no-window-drag="true"
                        data-tooltip={pendingBulkConfirmLabel}
                        disabled={selectedTodoCount === 0}
                        className={`paper-button inline-flex items-center justify-center rounded-[14px] px-3.5 py-2.5 text-[12px] font-semibold ${
                          pendingBulkConfirmation.action === "delete" ? "paper-button-danger" : "paper-button-primary"
                        } ${selectedTodoCount === 0 ? "cursor-not-allowed opacity-60" : ""}`}
                        whileHover={
                          selectedTodoCount === 0 ? undefined : { y: -1.5, scale: 1.01 }
                        }
                        whileTap={selectedTodoCount === 0 ? undefined : { scale: 0.985 }}
                        onClick={confirmBulkAction}
                      >
                        {pendingBulkConfirmLabel}
                      </motion.button>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </section>
  );
}
