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
  format,
  isSameDay,
  isTomorrow,
  isYesterday,
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
import { useDragPointerTracking } from "../../hooks/useDragPointerTracking";
import { isPrimaryShortcut } from "../../lib/isPrimaryShortcut";
import { useI18n } from "../../lib/i18n";
import { formatLocalDateKey, parseLocalDateKey, type TodoItem as TodoItemModel } from "../../lib/models";
import { isNativeQuickNoteHost } from "../../lib/nativeBridge";
import { readPlainTextFromClipboard, writePlainTextToClipboard } from "../../lib/plainTextClipboard";
import { ParticleField } from "../feedback/ParticleField";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheckBigIcon,
  CornerDownLeftIcon,
  SquarePenIcon,
  XIcon,
} from "../icons/AppIcons";
import { useParticleField } from "../../hooks/useParticleField";
import { centerOverlayToCursor, syncLatestDragPointerCoordinates } from "../../lib/dnd/centerOverlayToCursor";
import { resolveDragReorderTarget } from "../../lib/dnd/resolveDragReorderTarget";
import { syncTextareaHeight } from "../../lib/resizeTextarea";
import { useSettingsStore } from "../../store/settingsStore";
import { useTodosStore } from "../../store/todosStore";
import { CompletedTodoItem, TodoItem, TodoItemPreview } from "./TodoItem";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type TodoDayStats = {
  total: number;
  done: number;
  undone: number;
};

function getRelativeDateLabel(date: Date) {
  if (isSameDay(date, new Date())) {
    return "today";
  }

  if (isYesterday(date)) {
    return "yesterday";
  }

  if (isTomorrow(date)) {
    return "tomorrow";
  }

  return null;
}

function getRelativeDateMarker(date: Date, language: "en" | "zh-CN") {
  const label = getRelativeDateLabel(date);

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

export function TodoList() {
  const { t, language } = useI18n();
  const todos = useTodosStore((state) => state.todos);
  const selectedDateKey = useTodosStore((state) => state.selectedDateKey);
  const addTodo = useTodosStore((state) => state.addTodo);
  const selectDate = useTodosStore((state) => state.selectDate);
  const updateTodoText = useTodosStore((state) => state.updateTodoText);
  const moveTodo = useTodosStore((state) => state.moveTodo);
  const toggleTodo = useTodosStore((state) => state.toggleTodo);
  const removeTodo = useTodosStore((state) => state.removeTodo);
  const enableParticles = useSettingsStore((state) => state.enableParticles);
  const [draft, setDraft] = useState("");
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragOverId, setActiveDragOverId] = useState<string | null>(null);
  const [activeDragWidth, setActiveDragWidth] = useState<number | null>(null);
  const [clock, setClock] = useState(() => new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(parseLocalDateKey(selectedDateKey)));
  const formRef = useRef<HTMLFormElement>(null);
  const draftRef = useRef<HTMLTextAreaElement | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const { bursts, fieldRef, spawnBurst } = useParticleField();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );
  const selectedDate = useMemo(() => parseLocalDateKey(selectedDateKey), [selectedDateKey]);
  const selectedDateLabel = getRelativeDateLabel(selectedDate);
  const todoStatsByDate = useMemo(() => buildTodoStats(todos), [todos]);

  const visibleTodos = useMemo(
    () => todos.filter((todo) => todo.dateKey === selectedDateKey && !removingIds.includes(todo.id)),
    [removingIds, selectedDateKey, todos],
  );
  const openTodos = visibleTodos.filter((todo) => !todo.done);
  const doneTodos = visibleTodos.filter((todo) => todo.done);
  const activeDragTodo = openTodos.find((todo) => todo.id === activeDragId) ?? null;
  const activeDragIndex = activeDragId ? openTodos.findIndex((todo) => todo.id === activeDragId) : -1;
  const activeDragOrder = activeDragIndex >= 0 ? activeDragIndex + 1 : undefined;
  const editingTodo = editingTodoId ? (todos.find((todo) => todo.id === editingTodoId) ?? null) : null;
  const calendarQuickDates = useMemo(
    () => [
      { id: "today", label: t.todos.today, date: clock },
      { id: "tomorrow", label: t.todos.tomorrow, date: addDays(clock, 1) },
      { id: "yesterday", label: t.todos.yesterday, date: addDays(clock, -1) },
    ],
    [clock, t.todos.today, t.todos.tomorrow, t.todos.yesterday],
  );
  const normalizedEditDraft = editDraft.trim();
  const isEditSaveDisabled =
    normalizedEditDraft.length === 0 || normalizedEditDraft === (editingTodo?.text.trim() ?? "");
  const dragPointerCoordinates = useDragPointerTracking(Boolean(activeDragId));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(new Date());
    }, 30_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    setCalendarMonth(startOfMonth(selectedDate));
  }, [selectedDate]);

  useEffect(() => {
    if (isCalendarOpen) {
      setCalendarMonth(startOfMonth(selectedDate));
    }
  }, [isCalendarOpen, selectedDate]);

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

    if (enableParticles) {
      spawnBurst(target, "rose");
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
  };

  const closeEditDialog = () => {
    setEditingTodoId(null);
    setEditDraft("");
  };

  const handleSaveEdit = () => {
    if (!editingTodo || isEditSaveDisabled) {
      return;
    }

    if (updateTodoText(editingTodo.id, normalizedEditDraft)) {
      closeEditDialog();
    }
  };

  const handleToggleTodo = (id: string, target: DOMRect, nextDone: boolean) => {
    toggleTodo(id);
    if (enableParticles && nextDone) {
      spawnBurst(target, "green");
    }
  };

  const handleSelectDate = (date: Date) => {
    selectDate(formatLocalDateKey(date));
    setIsCalendarOpen(false);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
    setActiveDragOverId(null);
    setActiveDragWidth(event.active.rect.current.initial?.width ?? null);
    syncLatestDragPointerCoordinates(event.activatorEvent);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = resolveDragReorderTarget({
      activeId,
      eventOverId: event.over ? String(event.over.id) : null,
      previewOverId: activeDragOverId,
    });

    setActiveDragId(null);
    setActiveDragOverId(null);
    setActiveDragWidth(null);

    if (!overId) {
      return;
    }

    moveTodo(activeId, overId);
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

    if (
      event.key === "Enter" &&
      !event.metaKey &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
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

  return (
    <section className="cq-module flex h-full min-h-0 flex-col gap-2.5">
      <motion.button
        type="button"
        data-no-window-drag="true"
        aria-label="Open todo calendar"
        className="paper-button flex w-full items-center justify-between gap-3 rounded-[20px] px-3.5 py-2.5 text-left"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -1.5, scale: 1.005 }}
        whileTap={{ scale: 0.985 }}
        onClick={() => setIsCalendarOpen(true)}
      >
        <span className="min-w-0">
          <span className="block font-display text-[19px] font-semibold leading-none tracking-normal text-[var(--brown-strong)]">
            {format(selectedDate, "yyyy.MM.dd")}
          </span>
          <span className="mt-1 block truncate text-[11px] font-semibold leading-4 text-[var(--muted)]">
            {format(clock, "HH:mm")} · {format(selectedDate, "EEEE")}
          </span>
        </span>
        {selectedDateLabel ? (
          <span className="shrink-0 rounded-[12px] border border-[rgba(81,127,145,0.14)] bg-[rgba(239,248,249,0.86)] px-2.5 py-1 text-[10.5px] font-bold leading-none text-[var(--status-upcoming)]">
            {selectedDateLabel}
          </span>
        ) : null}
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        ref={fieldRef}
        className="relative min-h-0 flex-1"
      >
        <ParticleField bursts={enableParticles ? bursts : []} />

        <div className="paper-scroll h-full overflow-y-auto pr-1">
          {visibleTodos.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-[rgba(213,198,180,0.88)] bg-[rgba(255,255,255,0.34)] px-6 text-center text-[12.5px] leading-6 text-[var(--muted)]"
            >
              {t.todos.empty}
            </motion.div>
          ) : (
            <div className="flex flex-col gap-2.5 pb-1">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={() => {
                  setActiveDragId(null);
                  setActiveDragOverId(null);
                  setActiveDragWidth(null);
                }}
              >
                <SortableContext items={openTodos.map((todo) => todo.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-2">
                    <AnimatePresence>
                      {openTodos.map((todo, index) => (
                        <TodoItem
                          key={todo.id}
                          todo={todo}
                          order={index + 1}
                          onDelete={handleDeleteTodo}
                          onEdit={openEditDialog}
                          onToggle={handleToggleTodo}
                          dropPreview={activeDragOverId === todo.id && activeDragId !== todo.id}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </SortableContext>

                <DragOverlay
                  modifiers={[centerOverlayToCursor]}
                  dropAnimation={{
                    duration: 180,
                    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                >
                  {activeDragTodo ? (
                    <TodoItemPreview todo={activeDragTodo} width={activeDragWidth ?? undefined} order={activeDragOrder} />
                  ) : null}
                </DragOverlay>
              </DndContext>

              {doneTodos.length > 0 ? (
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center gap-2 px-1">
                    <span className="status-chip shrink-0" data-tone="jade">
                      {t.todos.doneCount(doneTodos.length)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <AnimatePresence>
                      {doneTodos.map((todo) => (
                        <CompletedTodoItem
                          key={todo.id}
                          todo={todo}
                          onDelete={handleDeleteTodo}
                          onEdit={openEditDialog}
                          onToggle={handleToggleTodo}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </motion.div>

      <div className="px-1 pb-1">
        <form
          ref={formRef}
          className="paper-card relative overflow-visible rounded-[22px] px-3 py-3"
          onSubmit={handleSubmit}
        >
          <label htmlFor="todo-input" className="sr-only">
            {t.todos.quickAdd}
          </label>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_60px] gap-x-2.5 gap-y-2.5">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="status-chip shrink-0" data-tone="coral">
                {t.todos.undoneCount(openTodos.length)}
              </span>
              {doneTodos.length > 0 ? (
                <span className="status-chip shrink-0" data-tone="jade">
                  {t.todos.doneCount(doneTodos.length)}
                </span>
              ) : null}
            </div>
            <div className="flex items-center justify-center">
              <span
                id="todo-submit-shortcut"
                className="max-w-full text-center text-[9px] font-medium leading-[1.25] tracking-[-0.01em] text-[var(--muted)] opacity-90"
              >
                {t.todos.submitHint}
              </span>
            </div>
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
                if (isNativeQuickNoteHost()) {
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

                if (isNativeQuickNoteHost()) {
                  void handleDraftPaste(event.currentTarget);
                }
              }}
              onKeyDown={handleDraftKeyDown}
              placeholder={t.todos.quickAddPlaceholder}
              className="textarea-reset surface-field wrap-anywhere min-h-[40px] min-w-0 rounded-[16px] px-3.5 py-2 text-[12.5px] font-medium leading-5 text-[var(--dark-text)] outline-none placeholder:text-[var(--muted)]"
            />
            <div className="flex items-center justify-center">
              <motion.button
                type="submit"
                aria-label={t.todos.add}
                aria-describedby="todo-submit-shortcut"
                disabled={!draft.trim()}
                className={`quick-add-submit inline-flex h-10 w-[28px] items-center justify-center rounded-full border transition-colors ${
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

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {isCalendarOpen ? (
                <motion.div
                  data-no-window-drag="true"
                  className="quicknote-modal-backdrop fixed inset-0 z-[88] flex items-center justify-center bg-[rgba(30,25,21,0.24)] px-5 py-6 backdrop-blur-[10px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsCalendarOpen(false)}
                >
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Todo calendar"
                    className="paper-panel flex max-h-[calc(100dvh-3rem)] w-full max-w-[430px] flex-col overflow-hidden rounded-[24px] p-4 shadow-[0_26px_48px_rgba(30,25,21,0.24)]"
                    initial={{ opacity: 0, scale: 0.95, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 8 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <motion.button
                        type="button"
                        aria-label="Previous month"
                        data-no-window-drag="true"
                        className="paper-icon-button inline-flex h-9 w-9 min-h-0 min-w-0 rounded-[12px]"
                        whileHover={{ y: -1.5, scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setCalendarMonth((current) => addDays(startOfMonth(current), -1))}
                      >
                        <ChevronLeftIcon size={14} />
                      </motion.button>
                      <div className="min-w-0 text-center">
                        <p className="font-display text-[21px] font-semibold leading-none tracking-normal text-[var(--brown-strong)]">
                          {format(calendarMonth, "MMMM yyyy")}
                        </p>
                      </div>
                      <motion.button
                        type="button"
                        aria-label="Next month"
                        data-no-window-drag="true"
                        className="paper-icon-button inline-flex h-9 w-9 min-h-0 min-w-0 rounded-[12px]"
                        whileHover={{ y: -1.5, scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setCalendarMonth((current) => addDays(endOfMonth(current), 1))}
                      >
                        <ChevronRightIcon size={14} />
                      </motion.button>
                    </div>

                    <div className="paper-scroll min-h-0 overflow-y-auto pr-1">
                      <div className="grid grid-cols-7 gap-1.5">
                        {WEEKDAY_LABELS.map((label) => (
                          <div
                            key={label}
                            className="text-center text-[10px] font-bold uppercase leading-5 text-[var(--muted)]"
                          >
                            {label}
                          </div>
                        ))}
                        {buildCalendarDays(calendarMonth).map((day) => {
                          const dateKey = formatLocalDateKey(day);
                          const stats = todoStatsByDate.get(dateKey) ?? { total: 0, done: 0, undone: 0 };
                          const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
                          const isSelected = dateKey === selectedDateKey;
                          const relativeLabel = getRelativeDateLabel(day);
                          const relativeMarker = getRelativeDateMarker(day, language);

                          return (
                            <motion.button
                              key={dateKey}
                              type="button"
                              data-no-window-drag="true"
                              aria-label={`${relativeLabel ? `${relativeLabel}, ` : ""}${format(day, "yyyy-MM-dd")}: ${stats.total} todos, ${stats.done} done, ${stats.undone} undone`}
                              className={`min-h-[58px] rounded-[14px] border px-1.5 py-1.5 text-left transition-colors ${
                                isSelected
                                  ? "border-[rgba(30,25,21,0.68)] bg-[rgba(30,25,21,0.9)] text-white shadow-[0_12px_22px_rgba(30,25,21,0.16)]"
                                  : "border-[rgba(213,198,180,0.74)] bg-[rgba(255,255,255,0.58)] text-[var(--dark-text)]"
                              } ${isCurrentMonth ? "" : "opacity-50"}`}
                              whileHover={{ y: -1.5, scale: 1.02 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => handleSelectDate(day)}
                            >
                              <span className="flex h-4 items-center justify-center gap-1">
                                <span className="text-[12px] font-bold leading-none">{format(day, "d")}</span>
                                {relativeMarker ? (
                                  <span
                                    aria-hidden="true"
                                    className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-extrabold leading-none ${
                                      isSelected
                                        ? "bg-[rgba(255,255,255,0.18)] text-white"
                                        : "bg-[rgba(239,248,249,0.96)] text-[var(--status-upcoming)]"
                                    }`}
                                  >
                                    {relativeMarker}
                                  </span>
                                ) : null}
                              </span>
                              <span className="mt-3 flex h-6 items-center justify-center">
                                <TodoDayStatusIcon stats={stats} isSelected={isSelected} />
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        {calendarQuickDates.map((quickDate) => (
                          <motion.button
                            key={quickDate.id}
                            type="button"
                            data-no-window-drag="true"
                            className="inline-flex items-center justify-center rounded-[12px] border border-[rgba(47,107,255,0.45)] bg-[rgba(239,248,249,0.72)] px-2.5 py-2 text-[11px] font-semibold text-[var(--status-upcoming)] shadow-[0_8px_16px_rgba(47,107,255,0.08)] transition-colors hover:border-[rgba(47,107,255,0.68)] hover:bg-[rgba(239,248,249,0.94)]"
                            whileHover={{ y: -1.5, scale: 1.01 }}
                            whileTap={{ scale: 0.985 }}
                            onClick={() => handleSelectDate(quickDate.date)}
                          >
                            {quickDate.label}
                          </motion.button>
                        ))}
                      </div>
                      <motion.button
                        type="button"
                        data-no-window-drag="true"
                        className="paper-button inline-flex items-center justify-center rounded-[14px] px-3.5 py-2.5 text-[12px] font-semibold text-[var(--dark-text)]"
                        whileHover={{ y: -1.5, scale: 1.01 }}
                        whileTap={{ scale: 0.985 }}
                        onClick={() => setIsCalendarOpen(false)}
                      >
                        {t.common.close}
                      </motion.button>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}

              {editingTodo ? (
                <motion.div
                  data-no-window-drag="true"
                  className="quicknote-modal-backdrop fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(30,25,21,0.24)] px-5 py-6 backdrop-blur-[10px]"
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

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <motion.button
                          type="button"
                          data-no-window-drag="true"
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
            </AnimatePresence>,
            document.body,
          )
        : null}
    </section>
  );
}
