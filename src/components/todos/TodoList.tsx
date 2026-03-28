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
import { ParticleField } from "../feedback/ParticleField";
import { PlusIcon } from "../icons/AppIcons";
import { useParticleField } from "../../hooks/useParticleField";
import { syncTextareaHeight } from "../../lib/resizeTextarea";
import { useSettingsStore } from "../../store/settingsStore";
import { useTodosStore } from "../../store/todosStore";
import { CompletedTodoItem, TodoItem, TodoItemPreview } from "./TodoItem";

export function TodoList() {
  const todos = useTodosStore((state) => state.todos);
  const addTodo = useTodosStore((state) => state.addTodo);
  const moveTodo = useTodosStore((state) => state.moveTodo);
  const toggleTodo = useTodosStore((state) => state.toggleTodo);
  const removeTodo = useTodosStore((state) => state.removeTodo);
  const enableParticles = useSettingsStore((state) => state.enableParticles);
  const [draft, setDraft] = useState("");
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
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
    setActiveDragWidth(event.active.rect.current.initial?.width ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    setActiveDragWidth(null);

    if (!event.over || event.active.id === event.over.id) {
      return;
    }

    moveTodo(String(event.active.id), String(event.over.id));
  };

  const handleDraftKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
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
              No tasks yet. Add a compact todo below.
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
                  setActiveDragWidth(null);
                }}
              >
                <SortableContext items={openTodos.map((todo) => todo.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-2">
                    <AnimatePresence>
                      {openTodos.map((todo) => (
                        <TodoItem
                          key={todo.id}
                          todo={todo}
                          onDelete={handleDeleteTodo}
                          onToggle={handleToggleTodo}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </SortableContext>

                <DragOverlay
                  dropAnimation={{
                    duration: 180,
                    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                >
                  {activeDragTodo ? (
                    <motion.div initial={{ rotate: -1.2 }} animate={{ rotate: -1.2 }}>
                      <TodoItemPreview todo={activeDragTodo} width={activeDragWidth ?? undefined} />
                    </motion.div>
                  ) : null}
                </DragOverlay>
              </DndContext>

              {doneTodos.length > 0 ? (
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center gap-2 px-1">
                    <span className="status-chip shrink-0" data-tone="jade">
                      {doneTodos.length} done
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

      <form ref={formRef} className="paper-card overflow-hidden rounded-[20px] px-3 py-2.5" onSubmit={handleSubmit}>
        <label htmlFor="todo-input" className="sr-only">
          Quick add
        </label>
        <div className="quick-add-grid">
          <div className="flex flex-wrap items-center gap-2">
            <span className="status-chip shrink-0" data-tone="coral">
              {openTodos.length} open
            </span>
            {doneTodos.length > 0 ? (
              <span className="status-chip shrink-0" data-tone="jade">
                {doneTodos.length} done
              </span>
            ) : null}
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <textarea
              ref={draftRef}
              id="todo-input"
              rows={1}
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
              onInput={(event) => syncTextareaHeight(event.currentTarget)}
              onKeyDown={handleDraftKeyDown}
              placeholder="Add a task"
              className="textarea-reset surface-field wrap-anywhere min-h-[42px] min-w-0 flex-1 rounded-[16px] px-3.5 py-2.5 text-[12.5px] font-medium leading-5 text-[var(--dark-text)] outline-none placeholder:text-[var(--muted)]"
            />
            <motion.button
              type="submit"
              aria-label="Add task"
              className="paper-button paper-button-primary quick-add-submit inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              whileHover={{ y: -2, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <PlusIcon size={15} />
            </motion.button>
          </div>
        </div>
      </form>
    </section>
  );
}
