import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { setFloatingCardGuide } from "../../hooks/usePlatform";
import { useI18n } from "../../lib/i18n";
import { subscribeToFloatingCardsState } from "../../lib/nativeBridge";
import type { TabId } from "../../lib/models";
import { useNotesStore } from "../../store/notesStore";
import { useTodosStore } from "../../store/todosStore";
import { CircleCheckBigIcon, SparklesIcon, XIcon } from "../icons/AppIcons";

type InteractiveGuideProps = {
  isHeaderCollapsed: boolean;
  isOpen: boolean;
  onClose: () => void;
  onHeaderCollapsedChange: (collapsed: boolean) => void;
  onSettingsChange: (open: boolean) => void;
  onTabChange: (tab: TabId) => void;
  showSettings: boolean;
};

type GuideRuntime = {
  noteGroupId: string | null;
  noteGroupIds: string[];
  noteId: string | null;
  noteIds: string[];
  todoGroupId: string | null;
  todoGroupIds: string[];
  todoId: string | null;
  todoIds: string[];
};

type GuideStep = {
  advanceOn?: "click" | "input";
  allowOutsideTarget?: boolean;
  instruction: string;
  target: () => HTMLElement | null;
  title: string;
};

const GUIDE_CHAPTER_COUNT = 7;

function chapterForAction(action: number) {
  if (action === 0) return 0;
  if (action <= 17) return 1;
  if (action <= 22) return 2;
  if (action <= 29) return 3;
  if (action <= 32) return 4;
  if (action <= 48) return 5;
  return 6;
}

function queryTarget(selector: string) {
  return document.querySelector<HTMLElement>(selector);
}

function queryGroupTarget(groupId: string) {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-guide-group-id]")).find(
    (element) => element.dataset.guideGroupId === groupId,
  ) ?? null;
}

function cssValue(value: string) {
  return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value.replace(/["\\]/g, "\\$&");
}

export function InteractiveGuide({
  isHeaderCollapsed,
  isOpen,
  onClose,
  onHeaderCollapsedChange,
  onSettingsChange,
  onTabChange,
}: InteractiveGuideProps) {
  const { language } = useI18n();
  const isZh = language === "zh-CN";
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [pinnedNoteIds, setPinnedNoteIds] = useState<string[]>([]);
  const runtimeRef = useRef<GuideRuntime | null>(null);
  const cards = useNotesStore((state) => state.cards);
  const floatingCardIds = useNotesStore((state) => state.floatingCardIds);
  const noteGroups = useNotesStore((state) => state.groups);
  const todos = useTodosStore((state) => state.todos);
  const todoGroups = useTodosStore((state) => state.groups);

  const noteId = runtimeRef.current?.noteId ?? null;
  const todoId = runtimeRef.current?.todoId ?? null;
  const copy = (zh: string, en: string) => (isZh ? zh : en);
  const stepItem = (
    titleZh: string,
    titleEn: string,
    instructionZh: string,
    instructionEn: string,
    target: () => HTMLElement | null,
    options: Pick<GuideStep, "advanceOn" | "allowOutsideTarget"> = {},
  ): GuideStep => ({
    instruction: copy(instructionZh, instructionEn),
    target,
    title: copy(titleZh, titleEn),
    ...options,
  });

  const steps = useMemo<GuideStep[]>(
    () => [
      stepItem("折叠顶部导航", "Collapse the navigation", "点击高亮的折叠按钮", "Click the highlighted fold button", () => queryTarget('[data-guide="navigation-fold"]')),

      stepItem("新增便签", "Add a note", "点击新增便签", "Click Add note", () => queryTarget('[data-guide="note-add"]')),
      stepItem("编辑便签标题", "Edit the note title", "直接输入一个便签标题", "Type a title for the note", () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"] [data-action="note-title"]`) : null, { advanceOn: "input" }),
      stepItem("打开便签分组", "Open note groups", "点击便签上的分组标签", "Click the group label on the note", () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"] [data-action="note-group"]`) : null),
      stepItem("新增便签分组", "Add a note group", "点击新增分组", "Click Add group", () => queryTarget('[data-guide="note-group-add"]')),
      stepItem("命名便签分组", "Name the note group", "输入一个分组名称", "Enter a group name", () => queryTarget('[data-guide="note-group-name"]'), { advanceOn: "input" }),
      stepItem("打开颜色选择", "Open the color picker", "点击调色板按钮", "Click the palette button", () => queryTarget('[data-guide="note-group-color"]')),
      stepItem("选择分组颜色", "Choose a group color", "选择任意一种颜色", "Choose any color", () => queryTarget('[data-guide="note-group-color-options"]')),
      stepItem("创建便签分组", "Create the note group", "点击创建分组", "Click Create group", () => queryTarget('[data-guide="note-group-create"]')),
      stepItem("应用新分组", "Apply the new group", "选择刚创建的分组", "Choose the group you just created", () => runtimeRef.current?.noteGroupId ? queryGroupTarget(runtimeRef.current.noteGroupId) : null),
      stepItem("再次打开分组", "Open groups again", "再次点击便签分组标签", "Click the note group label again", () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"] [data-action="note-group"]`) : null),
      stepItem("编辑便签分组", "Edit the note group", "点击刚创建分组旁的编辑按钮", "Click Edit beside the new group", () => runtimeRef.current?.noteGroupId ? queryTarget(`[data-guide-group-edit-id="${cssValue(runtimeRef.current.noteGroupId)}"]`) : null),
      stepItem("修改分组名称", "Rename the group", "修改分组名称", "Change the group name", () => queryTarget('[data-guide="note-group-name"]'), { advanceOn: "input" }),
      stepItem("保存分组修改", "Save the group changes", "点击保存", "Click Save", () => queryTarget('[data-guide="note-group-save"]')),
      stepItem("进入删除模式", "Enter delete mode", "点击删除模式按钮", "Click the delete-mode button", () => queryTarget('[data-guide="note-group-delete-mode"]')),
      stepItem("删除便签分组", "Delete the note group", "点击刚才分组旁的删除按钮", "Click Delete beside the group", () => runtimeRef.current?.noteGroupId ? queryTarget(`[data-guide-group-delete-id="${cssValue(runtimeRef.current.noteGroupId)}"]`) : null),
      stepItem("关闭分组管理", "Close group management", "点击关闭按钮", "Click Close", () => queryTarget('[data-guide="note-group-close"]')),
      stepItem("折叠便签", "Fold the note", "点击便签折叠按钮", "Click the note fold button", () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"] [data-action="note-collapse"]`) : null),

      stepItem("创建悬浮卡片", "Create a floating card", "把高亮便签拖出主窗口后松开", "Drag the highlighted note outside the window", () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"]`) : null),
      stepItem("固定到桌面", "Pin it to the desktop", "在悬浮卡片上点击图钉", "Click the pin on the floating card", () => null),
      stepItem("取消桌面固定", "Remove the desktop pin", "再次点击悬浮卡片图钉", "Click the floating-card pin again", () => null),
      stepItem("收回悬浮卡片", "Return the floating card", "关闭悬浮卡片", "Close the floating card", () => null),
      stepItem("删除便签", "Delete the note", "点击便签删除按钮", "Click the note delete button", () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"] [data-action="delete"]`) : null),

      stepItem("切换到 Todos", "Switch to Todos", "点击 Todos 标签", "Click the Todos tab", () => queryTarget('[data-guide="tab-todos"]')),
      stepItem("打开日期选择", "Open the calendar", "点击日期卡片", "Click the date card", () => queryTarget('[data-guide="todo-calendar"]')),
      stepItem("切换到明天", "Switch to tomorrow", "点击“明天”", "Click Tomorrow", () => queryTarget('[data-guide-date="tomorrow"]')),
      stepItem("添加待办", "Add a todo", "输入一条待办并按 Enter", "Type a todo and press Enter", () => queryTarget('[data-guide="todo-quick-add"]')),
      stepItem("打开待办编辑", "Open todo editing", "点击刚创建的待办", "Click the todo you just created", () => todoId ? queryTarget(`[data-todo-item-id="${cssValue(todoId)}"]`) : null),
      stepItem("编辑待办内容", "Edit the todo", "修改待办内容", "Change the todo text", () => queryTarget('[data-guide="todo-edit-title"]'), { advanceOn: "input" }),
      stepItem("保存待办修改", "Save the todo", "点击保存", "Click Save", () => queryTarget('[data-guide="todo-edit-save"]')),

      stepItem("打开提醒", "Open the reminder", "点击待办提醒按钮", "Click the todo reminder button", () => todoId ? queryTarget(`[data-todo-item-id="${cssValue(todoId)}"] [data-action="todo-reminder"]`) : null),
      stepItem("选择提醒时间", "Choose a reminder time", "点击“上午”", "Click Morning", () => queryTarget('[data-guide-reminder="morning"]')),
      stepItem("保存提醒", "Save the reminder", "点击保存", "Click Save", () => queryTarget('[data-guide="reminder-save"]')),

      stepItem("打开 Todo 分组", "Open todo groups", "点击待办分组按钮", "Click the todo group button", () => todoId ? queryTarget(`[data-todo-item-id="${cssValue(todoId)}"] [data-action="todo-group"]`) : null),
      stepItem("新增 Todo 分组", "Add a todo group", "点击新增分组", "Click Add group", () => queryTarget('[data-guide="todo-group-add"]')),
      stepItem("命名 Todo 分组", "Name the todo group", "输入一个分组名称", "Enter a group name", () => queryTarget('[data-guide="todo-group-name"]'), { advanceOn: "input" }),
      stepItem("打开颜色选择", "Open the color picker", "点击调色板按钮", "Click the palette button", () => queryTarget('[data-guide="todo-group-color"]')),
      stepItem("选择分组颜色", "Choose a group color", "选择任意一种颜色", "Choose any color", () => queryTarget('[data-guide="todo-group-color-options"]')),
      stepItem("创建 Todo 分组", "Create the todo group", "点击创建分组", "Click Create group", () => queryTarget('[data-guide="todo-group-create"]')),
      stepItem("应用新分组", "Apply the new group", "选择刚创建的分组", "Choose the group you just created", () => runtimeRef.current?.todoGroupId ? queryGroupTarget(runtimeRef.current.todoGroupId) : null),
      stepItem("再次打开分组", "Open groups again", "再次点击待办分组按钮", "Click the todo group button again", () => todoId ? queryTarget(`[data-todo-item-id="${cssValue(todoId)}"] [data-action="todo-group"]`) : null),
      stepItem("编辑 Todo 分组", "Edit the todo group", "点击刚创建分组旁的编辑按钮", "Click Edit beside the new group", () => runtimeRef.current?.todoGroupId ? queryTarget(`[data-guide-group-edit-id="${cssValue(runtimeRef.current.todoGroupId)}"]`) : null),
      stepItem("修改分组名称", "Rename the group", "修改分组名称", "Change the group name", () => queryTarget('[data-guide="todo-group-name"]'), { advanceOn: "input" }),
      stepItem("保存分组修改", "Save the group changes", "点击保存", "Click Save", () => queryTarget('[data-guide="todo-group-save"]')),
      stepItem("进入删除模式", "Enter delete mode", "点击删除模式按钮", "Click the delete-mode button", () => queryTarget('[data-guide="todo-group-delete-mode"]')),
      stepItem("删除 Todo 分组", "Delete the todo group", "点击刚才分组旁的删除按钮", "Click Delete beside the group", () => runtimeRef.current?.todoGroupId ? queryTarget(`[data-guide-group-delete-id="${cssValue(runtimeRef.current.todoGroupId)}"]`) : null),
      stepItem("关闭分组管理", "Close group management", "点击关闭按钮", "Click Close", () => queryTarget('[data-guide="todo-group-close"]')),
      stepItem("完成待办", "Complete the todo", "点击待办完成圆圈", "Click the todo completion circle", () => todoId ? queryTarget(`[data-todo-item-id="${cssValue(todoId)}"] [data-action="todo-completion"]`) : null),
      stepItem("恢复待办", "Restore the todo", "再次点击完成圆圈", "Click the completion circle again", () => todoId ? queryTarget(`[data-todo-item-id="${cssValue(todoId)}"] [data-action="todo-completion"]`) : null),

      stepItem("打开设置", "Open Settings", "点击顶部设置按钮", "Click the Settings button", () => queryTarget('[data-guide="settings-open"]')),
      stepItem("查看通用设置", "View General settings", "点击通用", "Click General", () => queryTarget('[data-guide-settings-category="general"]')),
      stepItem("返回设置目录", "Return to Settings", "点击返回", "Click Back", () => queryTarget('[data-guide="settings-back"]')),
      stepItem("查看主题设置", "View Theme settings", "点击主题", "Click Theme", () => queryTarget('[data-guide-settings-category="theme"]')),
      stepItem("切换主题", "Switch the theme", "选择“梅”主题", "Choose the Plum theme", () => queryTarget('[data-guide-theme="plum"]')),
      stepItem("返回设置目录", "Return to Settings", "点击返回", "Click Back", () => queryTarget('[data-guide="settings-back"]')),
      stepItem("查看快捷键", "View Shortcuts", "点击快捷键", "Click Shortcuts", () => queryTarget('[data-guide-settings-category="shortcuts"]')),
      stepItem("返回设置目录", "Return to Settings", "点击返回", "Click Back", () => queryTarget('[data-guide="settings-back"]')),
      stepItem("查看动效设置", "View Motion settings", "点击动效", "Click Motion", () => queryTarget('[data-guide-settings-category="motion"]')),
      stepItem("返回设置目录", "Return to Settings", "点击返回", "Click Back", () => queryTarget('[data-guide="settings-back"]')),
      stepItem("查看通知设置", "View Notifications", "点击通知", "Click Notifications", () => queryTarget('[data-guide-settings-category="notifications"]')),
      stepItem("返回设置目录", "Return to Settings", "点击返回", "Click Back", () => queryTarget('[data-guide="settings-back"]')),
      stepItem("查看关于页面", "View About", "点击关于", "Click About", () => queryTarget('[data-guide-settings-category="about"]')),
      stepItem("返回设置目录", "Return to Settings", "点击返回", "Click Back", () => queryTarget('[data-guide="settings-back"]')),
      stepItem("关闭设置", "Close Settings", "点击关闭按钮", "Click Close", () => queryTarget('[data-guide="settings-close"]')),
      stepItem("删除待办", "Delete the todo", "点击待办删除按钮", "Click the todo delete button", () => todoId ? queryTarget(`[data-todo-item-id="${cssValue(todoId)}"] [data-action="todo-delete"]`) : null),
      stepItem("指引完成", "Guide complete", "你已经实际体验了 StickIt 的主要功能", "You have now tried StickIt's main features", () => null),
    ],
    [isZh, noteId, todoId],
  );

  const chapters = useMemo(
    () => [
      {
        title: copy("整理工作区", "Shape your workspace"),
        body: copy("折叠导航，为内容腾出更多空间；导航会保持折叠，直到后续功能需要它。", "Collapse the navigation to make room; it stays folded until a later feature needs it."),
      },
      {
        title: copy("完整管理便签", "Manage a note end to end"),
        body: copy("依次演示便签的创建、编辑、分组创建与修改、分组删除和折叠。", "Create and edit a note, manage its group, then fold it."),
      },
      {
        title: copy("使用悬浮卡片", "Use a floating card"),
        body: copy("把便签拖出主窗口，体验桌面固定、取消固定、收回与删除。", "Drag the note out, pin and unpin it, return it, then delete it."),
      },
      {
        title: copy("创建并编辑待办", "Create and edit a todo"),
        body: copy("选择日期，创建真实待办，并在编辑对话框中修改和保存。", "Choose a date, create a todo, then edit and save it in the dialog."),
      },
      {
        title: copy("设置待办提醒", "Schedule a reminder"),
        body: copy("在提醒对话框中选择未来时间并保存。", "Choose a future time in the reminder dialog and save it."),
      },
      {
        title: copy("完整管理待办", "Manage a todo end to end"),
        body: copy("演示分组创建、应用、编辑与删除，以及完成和恢复待办。", "Create, apply, edit, and delete a group, then complete and restore the todo."),
      },
      {
        title: copy("浏览全部设置", "Explore every Settings area"),
        body: copy("依次打开通用、主题、快捷键、动效、通知和关于，最后演示删除待办。", "Open General, Theme, Shortcuts, Motion, Notifications, and About, then delete the todo."),
      },
    ],
    [isZh],
  );

  useEffect(() => {
    if (!isOpen || runtimeRef.current) {
      return;
    }

    const notesState = useNotesStore.getState();
    const todosState = useTodosStore.getState();
    runtimeRef.current = {
      noteGroupId: null,
      noteGroupIds: notesState.groups.map((group) => group.id),
      noteId: null,
      noteIds: notesState.cards.map((card) => card.id),
      todoGroupId: null,
      todoGroupIds: todosState.groups.map((group) => group.id),
      todoId: null,
      todoIds: todosState.todos.map((todo) => todo.id),
    };
    setStep(0);
    setPinnedNoteIds([]);
    onSettingsChange(false);
    onTabChange("notes");
    onHeaderCollapsedChange(false);
  }, [isOpen, onHeaderCollapsedChange, onSettingsChange, onTabChange]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    return subscribeToFloatingCardsState((state) => setPinnedNoteIds(state.pinnedNoteIds ?? []));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleColorSelected = (event: Event) => {
      const guideId = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (step === 7 && guideId === "note-group") {
        setStep(8);
      } else if (step === 37 && guideId === "todo-group") {
        setStep(38);
      }
    };
    window.addEventListener("stickit:guide-color-selected", handleColorSelected);
    return () => window.removeEventListener("stickit:guide-color-selected", handleColorSelected);
  }, [isOpen, step]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!isOpen || !runtime) {
      return;
    }

    if (step === 1 && !runtime.noteId) {
      const created = cards.find((card) => !runtime.noteIds.includes(card.id));
      if (created) {
        runtime.noteId = created.id;
        setStep(2);
      }
    }
    if (step === 8 && !runtime.noteGroupId) {
      const created = noteGroups.find((group) => !runtime.noteGroupIds.includes(group.id));
      if (created) {
        runtime.noteGroupId = created.id;
        setStep(9);
      }
    }
    if (step === 9 && runtime.noteId && runtime.noteGroupId) {
      if (cards.find((card) => card.id === runtime.noteId)?.groupId === runtime.noteGroupId) {
        setStep(10);
      }
    }
    if (step === 15 && runtime.noteGroupId && !noteGroups.some((group) => group.id === runtime.noteGroupId)) {
      setStep(16);
    }
    if (step === 26 && !runtime.todoId) {
      const created = todos.find((todo) => !runtime.todoIds.includes(todo.id));
      if (created) {
        runtime.todoId = created.id;
        setStep(27);
      }
    }
    if (step === 38 && !runtime.todoGroupId) {
      const created = todoGroups.find((group) => !runtime.todoGroupIds.includes(group.id));
      if (created) {
        runtime.todoGroupId = created.id;
        setStep(39);
      }
    }
    if (step === 39 && runtime.todoId && runtime.todoGroupId) {
      if (todos.find((todo) => todo.id === runtime.todoId)?.groupId === runtime.todoGroupId) {
        setStep(40);
      }
    }
    if (step === 45 && runtime.todoGroupId && !todoGroups.some((group) => group.id === runtime.todoGroupId)) {
      setStep(46);
    }
  }, [cards, isOpen, noteGroups, step, todoGroups, todos]);

  useEffect(() => {
    if (!isOpen || !noteId) {
      return;
    }
    if (step === 18 && floatingCardIds.includes(noteId)) {
      setStep(19);
    } else if (step === 19 && pinnedNoteIds.includes(noteId)) {
      setStep(20);
    } else if (step === 20 && !pinnedNoteIds.includes(noteId)) {
      setStep(21);
    } else if (step === 21 && !floatingCardIds.includes(noteId)) {
      setStep(22);
    }
  }, [floatingCardIds, isOpen, noteId, pinnedNoteIds, step]);

  useEffect(() => {
    if (!isOpen || !noteId || ![19, 20, 21].includes(step)) {
      return;
    }

    const guide = step === 19
      ? {
          phase: "pin" as const,
          title: copy("固定到桌面", "Pin to desktop"),
          instruction: copy("点击高亮的图钉", "Click the highlighted pin"),
        }
      : step === 20
        ? {
            phase: "unpin" as const,
            title: copy("取消桌面固定", "Remove desktop pin"),
            instruction: copy("再次点击高亮的图钉", "Click the highlighted pin again"),
          }
        : {
            phase: "close" as const,
            title: copy("收回悬浮卡片", "Return the floating card"),
            instruction: copy("点击高亮的关闭按钮", "Click the highlighted close button"),
          };

    void setFloatingCardGuide({ kind: "note", id: noteId }, guide).catch(() => {});
    return () => {
      void setFloatingCardGuide({ kind: "note", id: noteId }, null).catch(() => {});
    };
  }, [isOpen, isZh, noteId, step]);

  useEffect(() => {
    if (!isOpen || !isHeaderCollapsed || ![23, 49].includes(step)) {
      return;
    }
    const timer = window.setTimeout(() => onHeaderCollapsedChange(false), 280);
    return () => window.clearTimeout(timer);
  }, [isHeaderCollapsed, isOpen, onHeaderCollapsedChange, step]);

  const currentStep = steps[step];
  const currentChapter = chapterForAction(step);
  const currentChapterContent = chapters[currentChapter];

  useEffect(() => {
    if (!isOpen || !currentStep) {
      setTargetRect(null);
      return;
    }
    const update = () => {
      const target = currentStep.target();
      setTargetRect(target?.getBoundingClientRect() ?? null);
      target?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [currentStep, isOpen, step]);

  useEffect(() => {
    if (!isOpen || !currentStep || currentStep.advanceOn !== "input") {
      return;
    }
    const target = currentStep.target();
    if (!target) {
      return;
    }
    let timer = 0;
    const handleInput = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setStep((value) => value + 1), 260);
    };
    target.addEventListener("input", handleInput);
    return () => {
      window.clearTimeout(timer);
      target.removeEventListener("input", handleInput);
    };
  }, [currentStep, isOpen]);

  useEffect(() => {
    if (!isOpen || !currentStep || step === steps.length - 1 || currentStep.advanceOn === "input") {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      const target = currentStep.target();
      const clicked = event.target;
      if (!(clicked instanceof Node)) {
        return;
      }
      if ((clicked instanceof Element && clicked.closest("[data-guide-dialog]")) || !target) {
        return;
      }
      const didClickTarget = target.contains(clicked);
      if (!didClickTarget && !currentStep.allowOutsideTarget) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (!didClickTarget || [1, 8, 9, 15, 26, 38, 39, 45].includes(step)) {
        return;
      }
      window.setTimeout(() => setStep((value) => value + 1), 90);
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [currentStep, isOpen, step, steps.length]);

  const handleClose = () => {
    runtimeRef.current = null;
    onClose();
  };

  const viewportHeight = typeof window === "undefined" ? 800 : window.innerHeight;
  const panelStyle = targetRect && targetRect.top > viewportHeight * 0.52
    ? { left: 14, top: 14 }
    : { bottom: 14, right: 14 };

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            className="pointer-events-none fixed inset-0 z-[195] bg-[rgba(30,25,21,0.08)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          {targetRect ? (
            <motion.div
              key={`highlight-${step}`}
              data-guide-highlight
              className="pointer-events-none fixed z-[196] rounded-[16px] border-2 border-[#ff7a59] shadow-[0_0_0_5px_rgba(255,122,89,0.18),0_12px_32px_rgba(61,49,34,0.14)]"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{
                height: targetRect.height + 10,
                left: targetRect.left - 5,
                opacity: [0.7, 1, 0.7],
                scale: [0.97, 1.025, 0.97],
                top: targetRect.top - 5,
                width: targetRect.width + 10,
              }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{
                height: { duration: 0.2 },
                left: { duration: 0.2 },
                opacity: { duration: 1.25, repeat: Infinity },
                scale: { duration: 1.25, repeat: Infinity },
                top: { duration: 0.2 },
                width: { duration: 0.2 },
              }}
            />
          ) : null}
          <motion.aside
            data-guide-dialog
            role="dialog"
            aria-label={copy("StickIt 交互式指引", "StickIt interactive guide")}
            className="fixed z-[200] w-[min(268px,calc(100vw-28px))] rounded-[20px] border border-[rgba(213,198,180,0.88)] bg-[rgba(255,252,248,0.97)] p-3.5 shadow-[0_22px_46px_rgba(61,49,34,0.22)] backdrop-blur-xl"
            style={panelStyle}
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
          >
            <div className="flex items-center gap-2.5">
              <motion.span
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] bg-[linear-gradient(145deg,#ff7a59,#f4b942)] text-white"
                animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.08, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 0.45 }}
              >
                <SparklesIcon size={14} />
              </motion.span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
                  {copy(`第 ${currentChapter + 1} / ${GUIDE_CHAPTER_COUNT} 步`, `Step ${currentChapter + 1} of ${GUIDE_CHAPTER_COUNT}`)}
                </p>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-[rgba(156,126,94,0.14)]">
                  <motion.div className="h-full rounded-full bg-[#ff7a59]" animate={{ width: `${((currentChapter + 1) / GUIDE_CHAPTER_COUNT) * 100}%` }} />
                </div>
              </div>
              <button
                type="button"
                aria-label={copy("退出指引", "Exit guide")}
                data-tooltip={copy("退出指引", "Exit guide")}
                className="paper-icon-button inline-flex h-8 w-8 min-h-0 min-w-0 rounded-[11px]"
                onClick={handleClose}
              >
                <XIcon size={13} />
              </button>
            </div>
            <p className="mt-3 font-display text-[17px] font-semibold tracking-[-0.025em] text-[var(--brown-strong)]">{currentChapterContent.title}</p>
            <p className="mt-1.5 text-[11.5px] leading-5 text-[var(--muted)]">{currentChapterContent.body}</p>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                className="mt-3 rounded-[12px] bg-[rgba(255,122,89,0.09)] px-2.5 py-2 text-[#8f553d]"
                initial={{ opacity: 0, x: 10, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -8, scale: 0.98 }}
                transition={{ duration: 0.22 }}
              >
                <p className="text-[10px] font-bold leading-4">{currentStep.title}</p>
                <p className="mt-0.5 text-[10.5px] font-semibold leading-5">{currentStep.instruction}</p>
              </motion.div>
            </AnimatePresence>
            {!targetRect && step !== steps.length - 1 ? (
              <motion.div
                aria-hidden="true"
                className="mx-auto mt-3 h-2.5 w-2.5 rounded-full bg-[#ff7a59]"
                animate={{ boxShadow: ["0 0 0 0 rgba(255,122,89,.38)", "0 0 0 10px rgba(255,122,89,0)"], scale: [0.9, 1.15, 0.9] }}
                transition={{ duration: 1.3, repeat: Infinity }}
              />
            ) : null}
            {step === steps.length - 1 ? (
              <motion.button
                type="button"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-[12px] bg-[linear-gradient(145deg,#ff7a59,#f4b942)] px-3 py-2.5 text-[11px] font-bold text-white"
                whileTap={{ scale: 0.98 }}
                onClick={handleClose}
              >
                <CircleCheckBigIcon size={14} />
                {copy("完成", "Done")}
              </motion.button>
            ) : null}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
