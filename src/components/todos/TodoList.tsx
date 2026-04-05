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
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useDragPointerTracking } from "../../hooks/useDragPointerTracking";
import { useI18n } from "../../lib/i18n";
import { ParticleField } from "../feedback/ParticleField";
import { CornerDownLeftIcon } from "../icons/AppIcons";
import { useParticleField } from "../../hooks/useParticleField";
import { centerOverlayToCursor, syncLatestDragPointerCoordinates } from "../../lib/dnd/centerOverlayToCursor";
import { resolveDragReorderTarget } from "../../lib/dnd/resolveDragReorderTarget";
import { syncTextareaHeight } from "../../lib/resizeTextarea";
import { useSettingsStore } from "../../store/settingsStore";
import { useTodosStore } from "../../store/todosStore";
import { CompletedTodoItem, TodoItem, TodoItemPreview } from "./TodoItem";

export function TodoList() {
  const { t } = useI18n();
  const todos = useTodosStore((state) => state.todos);
  const addTodo = useTodosStore((state) => state.addTodo);
  const moveTodo = useTodosStore((state) => state.moveTodo);
  const toggleTodo = useTodosStore((state) => state.toggleTodo);
  const removeTodo = useTodosStore((state) => state.removeTodo);
  const enableParticles = useSettingsStore((state) => state.enableParticles);
  const [draft, setDraft] = useState("");
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragOverId, setActiveDragOverId] = useState<string | null>(null);
  const [activeDragWidth, setActiveDragWidth] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const draftRef = useRef<HTMLTextAreaElement | null>(null);
  const { bursts, fieldRef, spawnBurst } = useParticleField();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const visibleTodos = useMemo(
    () => todos.filter((todo) => !removingIds.includes(todo.id)),
    [removingIds, todos],
  );
  const openTodos = visibleTodos.filter((todo) => !todo.done);
  const doneTodos = visibleTodos.filter((todo) => todo.done);
  const activeDragTodo = openTodos.find((todo) => todo.id === activeDragId) ?? null;
  const activeDragIndex = activeDragId ? openTodos.findIndex((todo) => todo.id === activeDragId) : -1;
  const activeDragOrder = activeDragIndex >= 0 ? activeDragIndex + 1 : undefined;
  const dragPointerCoordinates = useDragPointerTracking(Boolean(activeDragId));

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

  const handleToggleTodo = (id: string, target: DOMRect, nextDone: boolean) => {
    toggleTodo(id);
    if (enableParticles && nextDone) {
      spawnBurst(target, "green");
    }
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
    if (event.key === "Enter" && event.metaKey && !event.shiftKey) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  useEffect(() => {
    if (draftRef.current) {
      syncTextareaHeight(draftRef.current);
    }
  }, [draft]);

  return (
    <section className="cq-module flex h-full min-h-0 flex-col gap-2.5">
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
                    <motion.div initial={{ rotate: -1.2 }} animate={{ rotate: -1.2 }}>
                      <TodoItemPreview todo={activeDragTodo} width={activeDragWidth ?? undefined} order={activeDragOrder} />
                    </motion.div>
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
                className="shrink-0 text-[10px] font-semibold leading-none tracking-[-0.01em] whitespace-nowrap text-[var(--muted)]"
              >
                {t.todos.submitShortcut}
              </span>
            </div>
            <textarea
              ref={draftRef}
              id="todo-input"
              rows={1}
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
              onInput={(event) => syncTextareaHeight(event.currentTarget)}
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
    </section>
  );
}
