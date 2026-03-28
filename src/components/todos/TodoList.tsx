import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ParticleField } from "../feedback/ParticleField";
import { CircleCheckBigIcon, PlusIcon, SparklesIcon } from "../icons/AppIcons";
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
        className="relative overflow-hidden rounded-[26px] border border-[rgba(213,198,180,0.92)] bg-[linear-gradient(150deg,#eef5ff_0%,#ffffff_40%,#ecfff8_100%)] px-4 py-4 shadow-[0_18px_38px_rgba(61,49,34,0.10)]"
      >
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,var(--accent-cobalt),var(--accent-jade),var(--accent-marigold))]" />
        <div className="absolute -left-6 top-0 h-20 w-20 rounded-full bg-[rgba(31,168,122,0.18)] blur-2xl" />
        <div className="module-header-grid relative">
          <div className="module-header-copy">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="status-chip" data-tone="blue">
                <SparklesIcon size={12} />
                Todo flow
              </span>
              <span className="status-chip" data-tone="coral">
                {openCount} open
              </span>
              <span className="status-chip" data-tone="jade">
                {completedCount} done
              </span>
            </div>
            <h2 className="font-display max-w-[13ch] text-[clamp(24px,6vw,30px)] font-semibold leading-[1.04] tracking-[-0.05em] text-[var(--brown-strong)]">
              Tasks stay vivid, too.
            </h2>
            <p className="module-header-summary mt-2 max-w-[30ch] text-[13px] leading-6 text-[var(--muted)]">
              Strong status color, clearer reminders, and task controls that stack instead of squeezing.
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
            className="paper-card flex min-h-52 flex-col items-center justify-center gap-4 rounded-[26px] px-8 text-center text-[13px] leading-7 text-[var(--muted)]"
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-[rgba(31,168,122,0.12)] text-[var(--status-done)]">
              <CircleCheckBigIcon size={22} />
            </span>
            <p className="max-w-[26ch]">
              Add a task below to see the richer task hierarchy, brighter status chips, and particle feedback.
            </p>
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

      <form ref={formRef} className="paper-card rounded-[26px] p-4" onSubmit={handleSubmit}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="status-chip" data-tone="blue">
            <CircleCheckBigIcon size={12} />
            Quick add
          </span>
          <span className="status-chip" data-tone="neutral">Capture next task</span>
        </div>
        <label htmlFor="todo-input" className="sr-only">
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
            placeholder="Type a task and press Enter"
            className="textarea-reset surface-field wrap-anywhere min-h-[58px] w-full rounded-[20px] px-4 py-4 text-[13px] font-medium text-[var(--dark-text)] outline-none placeholder:text-[var(--muted)]"
          />
          <motion.button
            type="submit"
            aria-label="Add task"
            className="quick-add-submit paper-button paper-button-primary inline-flex items-center gap-2 self-start rounded-[18px] px-4 py-3 text-[12px] font-semibold"
            whileHover={{ y: -2, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <PlusIcon size={16} />
            <span className="wrap-anywhere">Add task</span>
          </motion.button>
        </div>
      </form>
    </section>
  );
}
