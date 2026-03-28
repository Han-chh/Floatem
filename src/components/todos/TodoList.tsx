import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ParticleField } from "../feedback/ParticleField";
import { useParticleField } from "../../hooks/useParticleField";
import { syncTextareaHeight } from "../../lib/resizeTextarea";
import { useTodosStore } from "../../store/todosStore";
import { TodoItem } from "./TodoItem";

export function TodoList() {
  const todos = useTodosStore((state) => state.todos);
  const addTodo = useTodosStore((state) => state.addTodo);
  const toggleTodo = useTodosStore((state) => state.toggleTodo);
  const removeTodo = useTodosStore((state) => state.removeTodo);
  const [draft, setDraft] = useState("");
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const draftRef = useRef<HTMLTextAreaElement | null>(null);
  const { bursts, fieldRef, spawnBurst } = useParticleField();

  const openCount = todos.filter((todo) => !todo.done).length;
  const completedCount = todos.length - openCount;
  const visibleTodos = todos.filter((todo) => !removingIds.includes(todo.id));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const created = addTodo(draft);
    if (!created) {
      return;
    }

    setDraft("");
    if (formRef.current) {
      spawnBurst(formRef.current.getBoundingClientRect(), "amber");
    }
  };

  const handleDeleteTodo = (id: string, target: DOMRect) => {
    if (removingIds.includes(id)) {
      return;
    }

    spawnBurst(target, "rose");
    setRemovingIds((current) => [...current, id]);
    window.setTimeout(() => {
      removeTodo(id);
      setRemovingIds((current) => current.filter((item) => item !== id));
    }, 220);
  };

  const handleToggleTodo = (id: string, target: DOMRect, nextDone: boolean) => {
    toggleTodo(id);
    if (nextDone) {
      spawnBurst(target, "green");
    }
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
    <section className="cq-module flex h-full min-h-0 flex-col gap-3">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="paper-card relative overflow-hidden rounded-[24px] px-4 py-4"
      >
        <div className="absolute -left-6 top-0 h-20 w-20 rounded-full bg-[rgba(111,155,118,0.18)] blur-2xl" />
        <div className="module-header-grid relative">
          <div className="module-header-copy">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[rgba(122,89,64,0.08)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--brown)]">
                Todo flow
              </span>
              <span className="rounded-full bg-[var(--status-open-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--status-open)]">
                {openCount} open
              </span>
              <span className="rounded-full bg-[var(--status-done-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--status-done)]">
                {completedCount} done
              </span>
            </div>
            <h2 className="font-display text-[clamp(var(--font-section-compact),4.4vw,var(--font-section-expanded))] font-semibold tracking-[-0.02em] text-[var(--brown-strong)]">
              Animated task board
            </h2>
            <p className="module-header-summary mt-1 text-[12px] text-[var(--muted)]">
              Status-first tasks with reminders and controls that stack cleanly in narrow windows.
            </p>
          </div>
        </div>
      </motion.div>

      <div ref={fieldRef} className="relative min-h-0 flex-1">
        <ParticleField bursts={bursts} />

        <div className="paper-scroll flex h-full flex-col gap-4 overflow-y-auto">
          {visibleTodos.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="paper-card flex min-h-52 items-center justify-center rounded-[24px] px-8 text-center text-[13px] leading-7 text-[var(--muted)]"
            >
              Add a task below to see the new motion system, clearer hierarchy, and particle feedback.
            </motion.div>
          ) : (
            <div className="flex flex-col gap-4">
              <AnimatePresence>
                {visibleTodos.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onDelete={handleDeleteTodo}
                    onToggle={handleToggleTodo}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <form ref={formRef} className="paper-card rounded-[24px] p-4" onSubmit={handleSubmit}>
        <label htmlFor="todo-input" className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
          Quick add
        </label>
        <div className="quick-add-grid">
          <textarea
            ref={draftRef}
            id="todo-input"
            rows={1}
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            onInput={(event) => syncTextareaHeight(event.currentTarget)}
            onKeyDown={handleDraftKeyDown}
            placeholder="Type a task and press Enter..."
            className="textarea-reset wrap-anywhere min-h-[52px] w-full rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.68)] px-4 py-3 text-[13px] font-medium text-[var(--dark-text)] outline-none placeholder:text-[var(--muted)]"
          />
          <motion.button
            type="submit"
            className="quick-add-submit paper-button self-start rounded-[18px] px-4 py-3 text-[12px] font-semibold text-[var(--brown-strong)]"
            whileHover={{ y: -2, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Add
          </motion.button>
        </div>
      </form>
    </section>
  );
}
