import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../lib/i18n";
import { DEFAULT_TODO_GROUP_COLOR, DEFAULT_UNGROUPED_TODO_COLOR, resolveTodoGroup } from "../../lib/models";
import { useTodosStore } from "../../store/todosStore";
import { PaletteIcon, PlusIcon, SquarePenIcon, Trash2Icon, XIcon } from "../icons/AppIcons";
import { ColorPickerPopover } from "../notes/ColorPickerPopover";

type TodoGroupDialogProps = {
  todoId?: string | null;
  isOpen: boolean;
  onClose: () => void;
};

type GroupEditorMode = "create" | "edit";

function normalizeGroupNameKey(name: string) {
  return name.trim().toLocaleLowerCase();
}

function GroupColorGlyph({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-white/80 shadow-[0_3px_7px_rgba(0,0,0,0.08)]"
      style={{ backgroundColor: `${color}24`, boxShadow: `0 0 0 2px ${color}14` }}
    >
      <span className="h-2 w-2 rounded-full border border-white/80" style={{ backgroundColor: color }} />
    </span>
  );
}

export function TodoGroupDialog({ todoId = null, isOpen, onClose }: TodoGroupDialogProps) {
  const { t } = useI18n();
  const todos = useTodosStore((state) => state.todos);
  const groups = useTodosStore((state) => state.groups);
  const assignGroupToTodo = useTodosStore((state) => state.assignGroupToTodo);
  const createGroup = useTodosStore((state) => state.createGroup);
  const updateGroup = useTodosStore((state) => state.updateGroup);
  const deleteGroup = useTodosStore((state) => state.deleteGroup);
  const todo = todoId ? todos.find((item) => item.id === todoId) ?? null : null;
  const colorButtonRef = useRef<HTMLButtonElement | null>(null);
  const draftInputRef = useRef<HTMLInputElement | null>(null);
  const [editorMode, setEditorMode] = useState<GroupEditorMode | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState<string>(DEFAULT_TODO_GROUP_COLOR);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [isNameRequiredDialogOpen, setIsNameRequiredDialogOpen] = useState(false);
  const currentGroup = todo ? resolveTodoGroup(todo, groups) : null;
  const currentGroupColor = currentGroup?.color ?? DEFAULT_UNGROUPED_TODO_COLOR;
  const isEditorOpen = editorMode !== null;
  const isEditing = editorMode === "edit";
  const normalizedDraftName = draftName.trim();
  const isDraftNameEmpty = normalizedDraftName.length === 0;
  const hasDuplicateDraftName =
    normalizedDraftName.length > 0 &&
    groups.some((group) => {
      if (group.id === editingGroupId) {
        return false;
      }

      return normalizeGroupNameKey(group.name) === normalizeGroupNameKey(normalizedDraftName);
    });
  const isSaveDisabled = hasDuplicateDraftName;
  const groupTodoCount = useMemo(() => {
    const counts = new Map<string, number>();

    for (const item of todos) {
      if (item.groupId) {
        counts.set(item.groupId, (counts.get(item.groupId) ?? 0) + 1);
      }
    }

    return counts;
  }, [todos]);
  const ungroupedCount = useMemo(() => todos.filter((item) => !item.groupId).length, [todos]);

  const resetEditorState = () => {
    setEditorMode(null);
    setEditingGroupId(null);
    setDraftName("");
    setDraftColor(DEFAULT_TODO_GROUP_COLOR);
    setIsColorPickerOpen(false);
    setIsNameRequiredDialogOpen(false);
  };

  const resetDialogState = () => {
    resetEditorState();
    setIsDeleteMode(false);
  };

  useEffect(() => {
    if (!isOpen) {
      resetDialogState();
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (isColorPickerOpen) {
        setIsColorPickerOpen(false);
        return;
      }

      if (isNameRequiredDialogOpen) {
        setIsNameRequiredDialogOpen(false);
        draftInputRef.current?.focus();
        return;
      }

      if (isEditorOpen) {
        resetEditorState();
        return;
      }

      if (isDeleteMode) {
        setIsDeleteMode(false);
        return;
      }

      onClose();
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isColorPickerOpen, isDeleteMode, isEditorOpen, isNameRequiredDialogOpen, isOpen, onClose]);

  useEffect(() => {
    if (!isEditorOpen || typeof window === "undefined") {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      draftInputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [isEditorOpen]);

  useEffect(() => {
    if (editorMode === "edit" && editingGroupId && !groups.some((group) => group.id === editingGroupId)) {
      resetEditorState();
    }
  }, [editingGroupId, editorMode, groups]);

  useEffect(() => {
    if (isDeleteMode && groups.length === 0) {
      setIsDeleteMode(false);
    }
  }, [groups.length, isDeleteMode]);

  if (typeof document === "undefined") {
    return null;
  }

  const openCreateDialog = () => {
    setIsDeleteMode(false);
    setEditorMode("create");
    setEditingGroupId(null);
    setDraftName("");
    setDraftColor(DEFAULT_TODO_GROUP_COLOR);
    setIsColorPickerOpen(false);
  };

  const openEditDialog = (groupId: string) => {
    const group = groups.find((item) => item.id === groupId);
    if (!group) {
      return;
    }

    setIsDeleteMode(false);
    setEditorMode("edit");
    setEditingGroupId(group.id);
    setDraftName(group.name);
    setDraftColor(group.color);
    setIsColorPickerOpen(false);
  };

  const handleAssignGroup = (groupId: string | null) => {
    if (!todo) {
      return;
    }

    assignGroupToTodo(todo.id, groupId);
    resetDialogState();
    onClose();
  };

  const handleSaveGroup = () => {
    if (isDraftNameEmpty) {
      setIsNameRequiredDialogOpen(true);
      return;
    }

    if (isSaveDisabled) {
      return;
    }

    if (isEditing && editingGroupId) {
      if (
        updateGroup(editingGroupId, {
          color: draftColor,
          name: normalizedDraftName,
        })
      ) {
        resetEditorState();
      }
      return;
    }

    if (
      createGroup({
        color: draftColor,
        name: normalizedDraftName,
      })
    ) {
      resetEditorState();
    }
  };

  const handleDeleteGroup = () => {
    if (!editingGroupId) {
      return;
    }

    deleteGroup(editingGroupId);
    resetDialogState();
  };

  const editorDialogTitle = isEditing ? t.todos.editGroupTitle : t.todos.createGroupTitle;

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            className="stickit-modal-backdrop fixed inset-0 z-[90] flex items-start justify-center overflow-hidden bg-[rgba(30,25,21,0.24)] px-5 py-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              resetDialogState();
              onClose();
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={t.todos.groupManagerTitle}
              className="paper-panel relative flex w-full max-w-[480px] flex-col overflow-hidden rounded-[28px] p-5 shadow-[0_30px_60px_rgba(30,25,21,0.2)]"
              style={{ maxHeight: "calc(100dvh - 32px)" }}
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-[22px] font-semibold tracking-[-0.05em] text-[var(--brown-strong)]">
                    {todo?.text.trim() || t.todos.groupManagerTitle}
                  </p>
                </div>
                <motion.button
                  type="button"
                  aria-label={t.common.close}
                  data-guide="todo-group-close"
                  data-tooltip={t.common.close}
                  data-no-window-drag="true"
                  className="paper-button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[14px] px-3 py-2 text-[12px] font-semibold text-[var(--dark-text)]"
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => {
                    resetDialogState();
                    onClose();
                  }}
                >
                  <XIcon size={14} />
                  {t.common.close}
                </motion.button>
              </div>

              <div data-testid="todo-group-dialog-scroll-region" className="paper-scroll min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                <div className="flex min-h-[64px] items-center justify-center gap-3 px-3 text-center">
                  <span className="inline-flex shrink-0">
                    <GroupColorGlyph color={currentGroupColor} />
                  </span>
                  <p
                    title={currentGroup?.name ?? t.todos.noGroup}
                    className="max-w-full wrap-anywhere font-display text-[24px] font-semibold tracking-[-0.04em] text-[var(--brown-strong)]"
                  >
                    {currentGroup?.name ?? t.todos.noGroup}
                  </p>
                </div>

                <div className="relative space-y-2 rounded-[24px] border border-[rgba(213,198,180,0.88)] bg-[rgba(255,255,255,0.56)] p-3 pt-5">
                  <div className="absolute left-4 top-0 -translate-y-1/2 rounded-full border border-[rgba(213,198,180,0.88)] bg-[rgba(255,252,248,0.96)] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted)] shadow-[0_6px_14px_rgba(61,49,34,0.06)]">
                    {t.todos.groupTotal(groups.length + 1)}
                  </div>

                  <div className="mb-2 flex items-center justify-end gap-2">
                    <motion.button
                      type="button"
                      aria-label={t.todos.deleteGroupAction}
                      aria-pressed={isDeleteMode}
                      data-guide="todo-group-delete-mode"
                      data-tooltip={t.todos.deleteGroupAction}
                      disabled={groups.length === 0}
                      className={`paper-icon-button inline-flex h-8 w-8 min-h-0 min-w-0 rounded-full ${
                        isDeleteMode
                          ? "paper-button-danger border-[rgba(190,75,56,0.28)] bg-[rgba(190,75,56,0.12)] text-[#B64B2E]"
                          : "border-[rgba(213,198,180,0.86)] bg-[rgba(255,255,255,0.82)] text-[var(--muted)]"
                      } ${groups.length === 0 ? "cursor-not-allowed opacity-45" : ""}`}
                      whileHover={groups.length === 0 ? undefined : { y: -1.5, scale: 1.03 }}
                      whileTap={groups.length === 0 ? undefined : { scale: 0.97 }}
                      onClick={() => setIsDeleteMode((current) => !current)}
                    >
                      <Trash2Icon size={14} />
                    </motion.button>
                    <motion.button
                      type="button"
                      aria-label={t.todos.addGroup}
                      data-guide="todo-group-add"
                      data-tooltip={t.todos.addGroup}
                      className="paper-icon-button inline-flex h-8 w-8 min-h-0 min-w-0 rounded-full"
                      whileHover={{ y: -1.5, scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={openCreateDialog}
                    >
                      <PlusIcon size={14} />
                    </motion.button>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      aria-label={t.todos.noGroup}
                      data-tooltip={t.todos.noGroup}
                      disabled={!todo}
                      className={`flex w-full items-center gap-3 rounded-[18px] border px-3 py-2 text-left text-[12.5px] font-semibold ${
                        todo?.groupId === null
                          ? "border-[rgba(30,25,21,0.16)] bg-[rgba(30,25,21,0.06)] text-[var(--dark-text)]"
                          : "border-[rgba(213,198,180,0.84)] bg-[rgba(255,255,255,0.72)] text-[var(--dark-text)]"
                      } ${todo ? "" : "cursor-default"}`}
                      onClick={() => handleAssignGroup(null)}
                    >
                      <GroupColorGlyph color={DEFAULT_UNGROUPED_TODO_COLOR} />
                      <span className="min-w-0 flex-1 truncate">{t.todos.noGroup}</span>
                      <span className="status-chip shrink-0" data-tone="neutral">
                        {t.todos.items(ungroupedCount)}
                      </span>
                    </button>

                    {groups.map((group) => (
                      <div key={group.id} className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={group.name}
                          data-guide-group-id={group.id}
                          data-tooltip={group.name}
                          className={`flex flex-1 items-center gap-3 rounded-[18px] border px-3 py-2 text-left text-[12.5px] font-semibold ${
                            todo?.groupId === group.id
                              ? "bg-[rgba(255,255,255,0.92)] shadow-[0_8px_16px_rgba(61,49,34,0.10)]"
                              : "bg-[rgba(255,255,255,0.72)]"
                          } ${todo ? "" : "cursor-default"}`}
                          style={{
                            borderColor: todo?.groupId === group.id ? `${group.color}42` : "rgba(213,198,180,0.84)",
                            color: todo?.groupId === group.id ? group.color : "var(--dark-text)",
                          }}
                          onClick={() => handleAssignGroup(group.id)}
                        >
                          <GroupColorGlyph color={group.color} />
                          <span title={group.name} className="min-w-0 flex-1 truncate">
                            {group.name}
                          </span>
                          <span className="status-chip shrink-0" style={{ backgroundColor: `${group.color}1f`, color: group.color }}>
                            {t.todos.items(groupTodoCount.get(group.id) ?? 0)}
                          </span>
                        </button>

                        <motion.button
                          type="button"
                          aria-label={isDeleteMode ? t.todos.deleteGroup(group.name) : t.todos.editGroup(group.name)}
                          data-guide-group-delete-id={isDeleteMode ? group.id : undefined}
                          data-guide-group-edit-id={isDeleteMode ? undefined : group.id}
                          data-tooltip={isDeleteMode ? t.todos.deleteGroup(group.name) : t.todos.editGroup(group.name)}
                          data-tooltip-align="left"
                          className={`paper-icon-button inline-flex h-9 w-9 min-h-0 min-w-0 rounded-[12px] ${
                            isDeleteMode
                              ? "paper-button-danger border-[rgba(190,75,56,0.28)] bg-[rgba(190,75,56,0.12)] text-[#B64B2E]"
                              : ""
                          }`}
                          whileHover={{ y: -1.5, scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => {
                            if (isDeleteMode) {
                              deleteGroup(group.id);
                              return;
                            }

                            openEditDialog(group.id);
                          }}
                        >
                          {isDeleteMode ? <XIcon size={13} /> : <SquarePenIcon size={13} />}
                        </motion.button>
                      </div>
                    ))}
                  </div>

                  {groups.length === 0 ? (
                    <p className="wrap-anywhere rounded-[16px] border border-dashed border-[rgba(213,198,180,0.86)] bg-[rgba(255,255,255,0.34)] px-3 py-2 text-[12px] leading-5 text-[var(--muted)]">
                      {t.todos.groupsEmpty}
                    </p>
                  ) : null}
                </div>
              </div>
            </motion.div>
          </motion.div>

          <AnimatePresence>
            {isEditorOpen ? (
              <motion.div
                className="stickit-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(30,25,21,0.2)] px-5 py-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={resetEditorState}
              >
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label={editorDialogTitle}
                  data-guide="todo-group-editor"
                  className="paper-panel flex w-full max-w-[420px] flex-col rounded-[24px] p-5 shadow-[0_26px_48px_rgba(30,25,21,0.24)]"
                  initial={{ opacity: 0, scale: 0.95, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 8 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-[22px] font-semibold tracking-[-0.05em] text-[var(--brown-strong)]">
                        {editorDialogTitle}
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
                      onClick={resetEditorState}
                    >
                      <XIcon size={14} />
                    </motion.button>
                  </div>

                  <form
                    className="space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleSaveGroup();
                    }}
                  >
                    <label className="flex flex-col gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                        {t.todos.groupName}
                      </span>
                      <input
                        ref={draftInputRef}
                        type="text"
                        aria-label={t.todos.groupName}
                        data-guide="todo-group-name"
                        value={draftName}
                        onChange={(event) => setDraftName(event.currentTarget.value)}
                        placeholder={t.todos.groupNamePlaceholder}
                        className="surface-field min-w-0 rounded-[16px] px-3 py-2.5 text-[12.5px] font-medium text-[var(--dark-text)] outline-none placeholder:text-[var(--muted)]"
                      />
                    </label>

                    <div className="surface-field flex items-center justify-between gap-3 rounded-[18px] px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                        {t.todos.groupColor}
                      </p>
                      <motion.button
                        ref={colorButtonRef}
                        type="button"
                        aria-label={t.todos.changeGroupColor}
                        data-guide="todo-group-color"
                        data-tooltip={t.todos.changeGroupColor}
                        className="group relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-[rgba(213,198,180,0.88)] bg-[rgba(255,255,255,0.82)] text-[#2853C7] shadow-[0_10px_20px_rgba(61,49,34,0.08)]"
                        whileHover={{ y: -1.5, scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onClick={() => setIsColorPickerOpen((current) => !current)}
                      >
                        <PaletteIcon size={14} />
                        <span
                          className="pointer-events-none absolute bottom-[7px] right-[7px] h-2.5 w-2.5 rounded-full border border-white/80"
                          style={{ backgroundColor: draftColor }}
                        />
                      </motion.button>
                    </div>

                    {hasDuplicateDraftName ? (
                      <p className="rounded-[14px] border border-[rgba(190,75,56,0.16)] bg-[rgba(190,75,56,0.08)] px-3 py-2 text-[12px] leading-5 text-[#8B3A2A]">
                        {t.todos.groupNameDuplicate}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <motion.button
                        type="submit"
                        data-guide={isEditing ? "todo-group-save" : "todo-group-create"}
                        data-tooltip={isEditing ? t.common.save : t.todos.createGroup}
                        className="paper-button inline-flex items-center justify-center rounded-[13px] px-3 py-2 text-[12px] font-semibold text-[var(--dark-text)]"
                        whileHover={isSaveDisabled ? undefined : { y: -1.5, scale: 1.01 }}
                        whileTap={isSaveDisabled ? undefined : { scale: 0.98 }}
                        disabled={isSaveDisabled}
                      >
                        {isEditing ? t.common.save : t.todos.createGroup}
                      </motion.button>
                      <motion.button
                        type="button"
                        data-tooltip={t.common.cancel}
                        className="paper-button inline-flex items-center justify-center rounded-[13px] px-3 py-2 text-[12px] font-semibold text-[var(--muted)]"
                        whileHover={{ y: -1.5, scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={resetEditorState}
                      >
                        {t.common.cancel}
                      </motion.button>
                      {isEditing ? (
                        <motion.button
                          type="button"
                          data-tooltip={t.todos.deleteGroupAction}
                          className="paper-button paper-button-danger inline-flex items-center justify-center gap-1.5 rounded-[13px] px-3 py-2 text-[12px] font-semibold"
                          whileHover={{ y: -1.5, scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleDeleteGroup}
                        >
                          <Trash2Icon size={13} />
                          {t.todos.deleteGroupAction}
                        </motion.button>
                      ) : null}
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {isNameRequiredDialogOpen ? (
              <motion.div
                className="stickit-modal-backdrop fixed inset-0 z-[130] flex items-center justify-center bg-[rgba(30,25,21,0.24)] px-5 py-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setIsNameRequiredDialogOpen(false);
                  draftInputRef.current?.focus();
                }}
              >
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label={t.todos.groupNameRequired}
                  className="paper-panel flex w-full max-w-[360px] flex-col rounded-[24px] p-5 shadow-[0_26px_48px_rgba(30,25,21,0.24)]"
                  initial={{ opacity: 0, scale: 0.95, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 8 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="mb-4 min-w-0">
                    <span className="status-chip" data-tone="coral">
                      {t.todos.groupName}
                    </span>
                    <p className="mt-3 text-[13px] font-semibold leading-6 text-[var(--dark-text)]">
                      {t.todos.groupNameRequired}
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <motion.button
                      type="button"
                      data-no-window-drag="true"
                      className="paper-button paper-button-primary inline-flex items-center justify-center rounded-[14px] px-3.5 py-2.5 text-[12px] font-semibold"
                      whileHover={{ y: -1.5, scale: 1.01 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => {
                        setIsNameRequiredDialogOpen(false);
                        draftInputRef.current?.focus();
                      }}
                    >
                      {t.common.close}
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <ColorPickerPopover
            activeColor={draftColor}
            anchorRef={colorButtonRef}
            dataGuideId="todo-group"
            dataTestId="todo-group-dialog-color-palette"
            isOpen={isEditorOpen && isColorPickerOpen}
            onApplyColor={(color) => {
              setDraftColor(color);
              setIsColorPickerOpen(false);
            }}
            onClose={() => setIsColorPickerOpen(false)}
            onPreviewColor={setDraftColor}
            zIndexClassName="z-[120]"
          />
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
