import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ParticleField } from "../feedback/ParticleField";
import { PlusIcon } from "../icons/AppIcons";
import { useParticleField } from "../../hooks/useParticleField";
import { syncTextareaHeight } from "../../lib/resizeTextarea";
import { useSettingsStore } from "../../store/settingsStore";
import { useTodosStore } from "../../store/todosStore";
import { TodoItem } from "./TodoItem";

export function TodoList() {
  const todos = useTodosStore((state) => state.todos);
  const addTodo = useTodosStore((state) => state.addTodo);
  const toggleTodo = useTodosStore((state) => state.toggleTodo);
  const removeTodo = useTodosStore((state) => state.removeTodo);
  const enableParticles = useSettingsStore((state) => state.enableParticles);
  const [draft, setDraft] = useState("");
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const draftRef = useRef<HTMLTextAreaElement | null>(null);
  const { bursts, fieldRef, spawnBurst } = useParticleField();

  const openCount = todos.filter((todo) => !todo.done).length;
  const visibleTodos = todos.filter((todo) => !removingIds.includes(todo.id));

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
              className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-[rgba(213,198,180,0.88)] bg-[rgba(255,255,255,0.34)] px-6 text-center text-[13px] leading-6 text-[var(--muted)]"
            >
              No tasks yet. Use the input below and the plus button to queue the next todo.
            </motion.div>
          ) : (
            <div className="flex flex-col gap-4 pb-1">
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
      </motion.div>

      <form ref={formRef} className="paper-card rounded-[22px] p-3" onSubmit={handleSubmit}>
        <label htmlFor="todo-input" className="sr-only">
          Quick add
        </label>
        <div className="flex items-center gap-2">
          <span className="status-chip shrink-0" data-tone="coral">
            {openCount} open
          </span>
          <textarea
            ref={draftRef}
            id="todo-input"
            rows={1}
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            onInput={(event) => syncTextareaHeight(event.currentTarget)}
            onKeyDown={handleDraftKeyDown}
            placeholder="Add a task"
            className="textarea-reset surface-field wrap-anywhere min-h-[46px] flex-1 rounded-[18px] px-4 py-3 text-[13px] font-medium text-[var(--dark-text)] outline-none placeholder:text-[var(--muted)]"
          />
          <motion.button
            type="submit"
            aria-label="Add task"
            className="paper-button paper-button-primary inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
            whileHover={{ y: -2, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <PlusIcon size={16} />
          </motion.button>
        </div>
      </form>
    </section>
  );
}
