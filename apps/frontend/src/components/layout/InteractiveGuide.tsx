import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  clearFloatingCardGuides,
  closeFloatingCard,
  setFloatingCardGuide,
} from "../../hooks/usePlatform";
import { useI18n } from "../../lib/i18n";
import {
  subscribeToFloatingCardsState,
  type FloatingCardGuideState,
} from "../../lib/nativeBridge";
import type { TabId } from "../../lib/models";
import { useNotesStore } from "../../store/notesStore";
import { useTodosStore } from "../../store/todosStore";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheckBigIcon,
  SparklesIcon,
  XIcon,
} from "../icons/AppIcons";

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
  noteOrderBefore: string | null;
  secondaryNoteId: string | null;
  todoGroupId: string | null;
  todoGroupIds: string[];
  todoId: string | null;
  todoIds: string[];
  todoOrderBefore: string | null;
  secondaryTodoId: string | null;
};

type GuideStepId =
  | "navigation-collapse"
  | "note-add"
  | "note-title"
  | "note-body"
  | "note-toolbar-overview"
  | "note-toolbar-collapse"
  | "note-toolbar-expand"
  | "note-add-second"
  | "note-reorder"
  | "note-group-open"
  | "note-group-add"
  | "note-group-name"
  | "note-group-color"
  | "note-group-create"
  | "note-group-apply"
  | "note-filter-open"
  | "note-filter-pick"
  | "note-filter-apply"
  | "note-filter-reopen"
  | "note-filter-all"
  | "note-filter-clear"
  | "note-collapse"
  | "note-float"
  | "note-pin"
  | "note-unpin"
  | "note-close-return"
  | "note-float-again"
  | "note-drag-return"
  | "note-delete"
  | "todo-tab"
  | "todo-focus"
  | "todo-draft"
  | "todo-submit"
  | "todo-second-draft"
  | "todo-second-submit"
  | "todo-reorder"
  | "todo-edit-open"
  | "todo-edit-text"
  | "todo-edit-save"
  | "todo-reminder-open"
  | "todo-reminder-time"
  | "todo-reminder-save"
  | "todo-group-open"
  | "todo-group-add"
  | "todo-group-name"
  | "todo-group-color"
  | "todo-group-create"
  | "todo-group-apply"
  | "todo-filter-open"
  | "todo-filter-pick"
  | "todo-filter-apply"
  | "todo-filter-reopen"
  | "todo-filter-all"
  | "todo-filter-clear"
  | "todo-float"
  | "todo-drag-return"
  | "todo-complete"
  | "todo-restore"
  | "todo-delete"
  | "settings-open"
  | "settings-overview";

type GuideStep = {
  advanceOn?: "click" | "focus" | "input" | "pointerdown";
  allowOutsideTarget?: boolean;
  autoAdvanceMs?: number;
  chapter: number;
  id: GuideStepId;
  instruction: string;
  target: () => HTMLElement | null;
  title: string;
};

const GUIDE_CHAPTER_COUNT = 7;

function queryTarget(selector: string) {
  return document.querySelector<HTMLElement>(selector);
}

function queryGroupTarget(groupId: string) {
  return (
    Array.from(document.querySelectorAll<HTMLElement>("[data-guide-group-id]")).find(
      (element) => element.dataset.guideGroupId === groupId,
    ) ?? null
  );
}

function cssValue(value: string) {
  return typeof CSS !== "undefined" && CSS.escape
    ? CSS.escape(value)
    : value.replace(/["\\]/g, "\\$&");
}

function orderSignature(ids: string[], firstId: string | null, secondId: string | null) {
  if (!firstId || !secondId) {
    return null;
  }
  return ids.filter((id) => id === firstId || id === secondId).join(":");
}

export function InteractiveGuide({
  isHeaderCollapsed,
  isOpen,
  onClose,
  onHeaderCollapsedChange,
  onSettingsChange,
  onTabChange,
  showSettings,
}: InteractiveGuideProps) {
  const { language } = useI18n();
  const isZh = language === "zh-CN";
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [pinnedNoteIds, setPinnedNoteIds] = useState<string[]>([]);
  const runtimeRef = useRef<GuideRuntime | null>(null);
  const guidedFloatingRef = useRef<{ id: string; kind: "note" | "todo" } | null>(null);
  const cards = useNotesStore((state) => state.cards);
  const floatingCardIds = useNotesStore((state) => state.floatingCardIds);
  const noteGroups = useNotesStore((state) => state.groups);
  const todos = useTodosStore((state) => state.todos);
  const floatingTodoIds = useTodosStore((state) => state.floatingTodoIds);
  const todoGroups = useTodosStore((state) => state.groups);

  const noteId = runtimeRef.current?.noteId ?? null;
  const secondaryNoteId = runtimeRef.current?.secondaryNoteId ?? null;
  const todoId = runtimeRef.current?.todoId ?? null;
  const secondaryTodoId = runtimeRef.current?.secondaryTodoId ?? null;
  const copy = (zh: string, en: string) => (isZh ? zh : en);
  const stepItem = (
    id: GuideStepId,
    chapter: number,
    titleZh: string,
    titleEn: string,
    instructionZh: string,
    instructionEn: string,
    target: () => HTMLElement | null,
    options: Pick<GuideStep, "advanceOn" | "allowOutsideTarget" | "autoAdvanceMs"> = {},
  ): GuideStep => ({
    chapter,
    id,
    instruction: copy(instructionZh, instructionEn),
    target,
    title: copy(titleZh, titleEn),
    ...options,
  });

  const steps = useMemo<GuideStep[]>(
    () => [
      stepItem("navigation-collapse", 0, "折叠顶部导航", "Collapse the navigation", "点击高亮按钮，为内容腾出更多空间", "Click the highlighted control to make more room", () => queryTarget('[data-guide="navigation-fold"]')),

      stepItem("note-add", 1, "新建第一张便签", "Create the first note", "点击新增便签", "Click Add note", () => queryTarget('[data-guide="note-add"]')),
      stepItem("note-title", 1, "填写标题", "Add a title", "直接输入便签标题", "Type a note title", () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"] [data-action="note-title"]`) : null, { advanceOn: "input" }),
      stepItem("note-body", 1, "输入富文本内容", "Write rich text", "在正文输入一行内容；这里支持富文本格式", "Type a line in the body; this editor supports rich text", () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"] [data-action="note-rich-editor"]`) : null, { advanceOn: "input" }),
      stepItem("note-toolbar-overview", 1, "这是富文本工具栏", "This is the rich-text toolbar", "高亮区域包含粗体、斜体、下划线、文字颜色、复制粘贴和撤销重做；此步只需查看，无需点击", "The highlighted toolbar contains bold, italic, underline, text color, clipboard, undo, and redo; just review it—no click needed", () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"] [data-action="note-rich-toolbar"]`) : null, { autoAdvanceMs: 1_800 }),
      stepItem("note-toolbar-collapse", 1, "折叠编辑工具栏", "Collapse the editor toolbar", "点击工具栏末端箭头，把编辑区收成紧凑模式", "Click the arrow at the end of the toolbar for a compact editor", () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"] [data-action="note-toolbar-toggle"]`) : null, { advanceOn: "pointerdown" }),
      stepItem("note-toolbar-expand", 1, "展开编辑工具栏", "Expand the editor toolbar", "再次点击箭头即可恢复全部工具", "Click the arrow again to restore every tool", () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"] [data-action="note-toolbar-toggle"]`) : null, { advanceOn: "pointerdown" }),
      stepItem("note-add-second", 1, "再建一张便签", "Create another note", "点击新增便签，为换序准备第二张卡片", "Click Add note to prepare a second card for reordering", () => queryTarget('[data-guide="note-add"]')),
      stepItem("note-reorder", 1, "交换便签位置", "Reorder note cards", "按住高亮便签的空白区域，把它拖到另一张便签的上方或下方", "Drag the highlighted card by a blank area above or below the other note", () => secondaryNoteId ? queryTarget(`[data-note-card-id="${cssValue(secondaryNoteId)}"]`) : null),
      stepItem("note-group-open", 1, "打开便签分组", "Open note groups", "点击第一张便签的分组标签", "Click the group label on the first note", () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"] [data-action="note-group"]`) : null),
      stepItem("note-group-add", 1, "新增分组", "Add a group", "点击新增分组", "Click Add group", () => queryTarget('[data-guide="note-group-add"]')),
      stepItem("note-group-name", 1, "命名分组", "Name the group", "输入一个分组名称", "Enter a group name", () => queryTarget('[data-guide="note-group-name"]'), { advanceOn: "input" }),
      stepItem("note-group-color", 1, "选择分组颜色", "Choose a group color", "点击调色板并选择任一颜色", "Open the palette and choose any color", () => queryTarget('[data-guide="note-group-color"]'), { allowOutsideTarget: true }),
      stepItem("note-group-create", 1, "创建分组", "Create the group", "选择颜色后点击创建分组", "Choose a color, then click Create group", () => queryTarget('[data-guide="note-group-create"]'), { allowOutsideTarget: true }),
      stepItem("note-group-apply", 1, "应用分组", "Apply the group", "选择刚创建的分组", "Choose the group you just created", () => runtimeRef.current?.noteGroupId ? queryGroupTarget(runtimeRef.current.noteGroupId) : null),
      stepItem("note-filter-open", 1, "打开分组筛选", "Open group filters", "点击底部的分组筛选按钮", "Click the group-filter button at the bottom", () => queryTarget('[data-guide="note-filter-open"]')),
      stepItem("note-filter-pick", 1, "筛选便签", "Filter notes", "取消一个分组的勾选，观察列表如何按分组收窄", "Uncheck one group and watch the list narrow by group", () => queryTarget('[data-testid="note-group-filter-scroll-region"]')),
      stepItem("note-filter-apply", 1, "应用筛选", "Apply the filter", "点击保存应用筛选", "Click Save to apply the filter", () => queryTarget('[data-guide="note-filter-apply"]')),
      stepItem("note-filter-reopen", 1, "恢复全部便签", "Restore all notes", "再次打开筛选", "Open the filters again", () => queryTarget('[data-guide="note-filter-open"]')),
      stepItem("note-filter-all", 1, "选择全部分组", "Select every group", "勾选“全部分组”", "Select All groups", () => queryTarget('[data-testid="note-group-filter-scroll-region"]')),
      stepItem("note-filter-clear", 1, "保存完整列表", "Save the full list", "点击保存，恢复显示所有便签", "Click Save to show every note again", () => queryTarget('[data-guide="note-filter-apply"]')),
      stepItem("note-collapse", 1, "折叠便签", "Fold the note", "点击第一张便签的折叠按钮", "Click the fold control on the first note", () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"] [data-action="note-collapse"]`) : null),

      stepItem("note-float", 2, "创建便签悬浮卡片", "Create a floating note", "把高亮便签拖出主窗口后松开", "Drag the highlighted note outside the main window", () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"]`) : null),
      stepItem("note-pin", 2, "固定到桌面", "Pin it to the desktop", "在悬浮卡片上点击图钉", "Click the pin on the floating card", () => null),
      stepItem("note-unpin", 2, "取消桌面固定", "Remove the desktop pin", "再次点击图钉，恢复普通悬浮", "Click the pin again to return to normal floating mode", () => null),
      stepItem("note-close-return", 2, "用关闭键收回", "Return it with Close", "点击悬浮卡片上的 ×，卡片会回到应用内部", "Click × on the floating card to return it to the app", () => null),
      stepItem("note-float-again", 2, "再次创建悬浮卡片", "Float it again", "再次把便签拖出主窗口", "Drag the note outside the main window again", () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"]`) : null),
      stepItem("note-drag-return", 2, "拖回应用内部", "Drag it back into the app", "按住悬浮卡片，将它拖入主窗口的便签列表；绿色插入线会显示落点", "Drag the floating card into the main note list; the green insertion line shows its destination", () => null),
      stepItem("note-delete", 2, "删除练习便签", "Delete the practice note", "点击便签删除按钮", "Click the note delete button", () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"] [data-action="delete"]`) : null),

      stepItem("todo-tab", 3, "切换到 Todos", "Switch to Todos", "点击 Todos 标签", "Click the Todos tab", () => queryTarget('[data-guide="tab-todos"]')),
      stepItem("todo-focus", 3, "用 Enter 快速定位", "Focus quick entry with Enter", "先点击界面空白处，再直接按 Enter；无需鼠标即可聚焦输入框", "Click a blank area, then press Enter to focus quick entry without the mouse", () => queryTarget('[data-guide="todo-quick-input"]'), { advanceOn: "focus" }),
      stepItem("todo-draft", 3, "输入待办", "Type a todo", "输入第一条待办内容", "Type the first todo", () => queryTarget('[data-guide="todo-quick-input"]'), { advanceOn: "input" }),
      stepItem("todo-submit", 3, "快速创建", "Create it quickly", "按 Enter 立即创建待办；Shift + Enter 可换行", "Press Enter to create it; Shift + Enter inserts a new line", () => queryTarget('[data-guide="todo-quick-input"]')),
      stepItem("todo-second-draft", 3, "再输入一条待办", "Type another todo", "输入第二条待办", "Type a second todo", () => queryTarget('[data-guide="todo-quick-input"]'), { advanceOn: "input" }),
      stepItem("todo-second-submit", 3, "创建第二条待办", "Create the second todo", "按 Enter 创建", "Press Enter to create it", () => queryTarget('[data-guide="todo-quick-input"]')),
      stepItem("todo-reorder", 3, "交换待办位置", "Reorder todos", "把高亮待办拖到另一条待办的上方或下方", "Drag the highlighted todo above or below the other todo", () => secondaryTodoId ? queryTarget(`[data-todo-item-id="${cssValue(secondaryTodoId)}"]`) : null),
      stepItem("todo-edit-open", 3, "打开待办编辑", "Open todo editing", "点击第一条待办的文字区域", "Click the text area of the first todo", () => todoId ? queryTarget(`[data-todo-item-id="${cssValue(todoId)}"]`) : null),
      stepItem("todo-edit-text", 3, "修改待办内容", "Edit the todo", "修改待办文字", "Change the todo text", () => queryTarget('[data-guide="todo-edit-title"]'), { advanceOn: "input" }),
      stepItem("todo-edit-save", 3, "保存修改", "Save the edit", "点击保存", "Click Save", () => queryTarget('[data-guide="todo-edit-save"]')),

      stepItem("todo-reminder-open", 4, "打开待办提醒", "Open the reminder", "点击第一条待办的提醒按钮", "Click the reminder control on the first todo", () => todoId ? queryTarget(`[data-todo-item-id="${cssValue(todoId)}"] [data-action="todo-reminder"]`) : null),
      stepItem("todo-reminder-time", 4, "选择提醒时间", "Choose a reminder time", "选择“上午”", "Choose Morning", () => queryTarget('[data-guide-reminder="morning"]')),
      stepItem("todo-reminder-save", 4, "保存提醒", "Save the reminder", "点击保存；到时 StickIt 会发送系统通知", "Click Save; StickIt will send a system notification at that time", () => queryTarget('[data-guide="reminder-save"]')),

      stepItem("todo-group-open", 5, "打开 Todo 分组", "Open todo groups", "点击第一条待办的分组按钮", "Click the group control on the first todo", () => todoId ? queryTarget(`[data-todo-item-id="${cssValue(todoId)}"] [data-action="todo-group"]`) : null),
      stepItem("todo-group-add", 5, "新增 Todo 分组", "Add a todo group", "点击新增分组", "Click Add group", () => queryTarget('[data-guide="todo-group-add"]')),
      stepItem("todo-group-name", 5, "命名 Todo 分组", "Name the todo group", "输入分组名称", "Enter a group name", () => queryTarget('[data-guide="todo-group-name"]'), { advanceOn: "input" }),
      stepItem("todo-group-color", 5, "选择分组颜色", "Choose a group color", "点击调色板并选择任一颜色", "Open the palette and choose any color", () => queryTarget('[data-guide="todo-group-color"]'), { allowOutsideTarget: true }),
      stepItem("todo-group-create", 5, "创建 Todo 分组", "Create the todo group", "选择颜色后点击创建分组", "Choose a color, then click Create group", () => queryTarget('[data-guide="todo-group-create"]'), { allowOutsideTarget: true }),
      stepItem("todo-group-apply", 5, "应用 Todo 分组", "Apply the todo group", "选择刚创建的分组", "Choose the group you just created", () => runtimeRef.current?.todoGroupId ? queryGroupTarget(runtimeRef.current.todoGroupId) : null),
      stepItem("todo-filter-open", 5, "打开 Todo 分组筛选", "Open todo filters", "点击顶部工具栏的分组筛选按钮", "Click the group-filter control in the top toolbar", () => queryTarget('[data-guide="todo-filter-open"]')),
      stepItem("todo-filter-pick", 5, "筛选待办", "Filter todos", "取消一个分组的勾选", "Uncheck one group", () => queryTarget('[data-testid="todo-group-filter-scroll-region"]')),
      stepItem("todo-filter-apply", 5, "应用筛选", "Apply the filter", "点击保存", "Click Save", () => queryTarget('[data-guide="todo-filter-apply"]')),
      stepItem("todo-filter-reopen", 5, "恢复全部待办", "Restore all todos", "再次打开筛选", "Open the filters again", () => queryTarget('[data-guide="todo-filter-open"]')),
      stepItem("todo-filter-all", 5, "选择全部分组", "Select every group", "勾选“全部分组”", "Select All groups", () => queryTarget('[data-testid="todo-group-filter-scroll-region"]')),
      stepItem("todo-filter-clear", 5, "保存完整列表", "Save the full list", "点击保存，恢复全部待办", "Click Save to restore every todo", () => queryTarget('[data-guide="todo-filter-apply"]')),
      stepItem("todo-float", 5, "创建待办悬浮卡片", "Create a floating todo", "把高亮待办拖出主窗口；Todo 也支持悬浮和桌面固定", "Drag the highlighted todo outside the window; todos also support floating and desktop pinning", () => todoId ? queryTarget(`[data-todo-item-id="${cssValue(todoId)}"]`) : null),
      stepItem("todo-drag-return", 5, "拖回 Todo 列表", "Drag it back to Todos", "把悬浮待办拖回主窗口，插入线会帮助你选择排列位置", "Drag the floating todo back; the insertion line helps choose its position", () => null),
      stepItem("todo-complete", 5, "完成待办", "Complete the todo", "点击待办完成圆圈", "Click the completion circle", () => todoId ? queryTarget(`[data-todo-item-id="${cssValue(todoId)}"] [data-action="todo-completion"]`) : null),
      stepItem("todo-restore", 5, "恢复待办", "Restore the todo", "再次点击完成圆圈", "Click the completion circle again", () => todoId ? queryTarget(`[data-todo-item-id="${cssValue(todoId)}"] [data-action="todo-completion"]`) : null),
      stepItem("todo-delete", 5, "删除练习待办", "Delete the practice todo", "点击待办删除按钮", "Click the todo delete button", () => todoId ? queryTarget(`[data-todo-item-id="${cssValue(todoId)}"] [data-action="todo-delete"]`) : null),

      stepItem("settings-open", 6, "进入设置", "Open Settings", "点击顶部设置按钮", "Click the Settings button in the header", () => queryTarget('[data-guide="settings-open"]')),
      stepItem("settings-overview", 6, "设置一览", "Settings at a glance", "通用：语言、时区、时间格式、默认页面与开机启动；主题：固定外观；快捷键：全局唤出；动效：切换方式、速度与粒子；通知：声音与测试；关于：版本、重置与退出。按需修改即可。", "General covers language, time zone, time format, default page, and launch at login; Theme sets appearance; Shortcuts controls global summon; Motion covers transitions, speed, and particles; Notifications covers sound and testing; About shows version, reset, and quit. Change only what you need.", () => queryTarget('[data-guide="settings-overview"]')),
    ],
    [isZh, noteId, secondaryNoteId, secondaryTodoId, todoId],
  );

  const chapters = useMemo(
    () => [
      {
        title: copy("整理工作区", "Shape your workspace"),
        body: copy("先学会收起导航，让卡片成为视觉中心。", "Start by folding the navigation so cards become the focus."),
      },
      {
        title: copy("编辑与整理便签", "Edit and organize notes"),
        body: copy("体验富文本、工具栏折叠、卡片换序、分组和筛选。", "Try rich text, toolbar folding, card reordering, groups, and filters."),
      },
      {
        title: copy("掌握便签悬浮", "Master floating notes"),
        body: copy("体验桌面固定，并分别用 × 和拖回主窗口两种方式收回卡片。", "Pin a card, then return it both with × and by dragging it into the app."),
      },
      {
        title: copy("快速创建 Todo", "Capture todos quickly"),
        body: copy("用 Enter 聚焦与提交，再交换位置并编辑内容。", "Use Enter to focus and submit, then reorder and edit."),
      },
      {
        title: copy("设置待办提醒", "Schedule a reminder"),
        body: copy("选择提醒时间并保存系统通知。", "Choose a reminder time and save the notification."),
      },
      {
        title: copy("整理与悬浮 Todo", "Organize and float todos"),
        body: copy("体验 Todo 分组筛选、换序、悬浮、拖回、完成与恢复。", "Try todo filters, reordering, floating, drag-back, completion, and restore."),
      },
      {
        title: copy("了解设置", "Meet Settings"),
        body: copy("只进入一次设置，并快速了解所有可修改项目。", "Open Settings once for a concise overview of every configurable area."),
      },
    ],
    [isZh],
  );

  const currentStep = steps[step];
  const currentChapter = currentStep?.chapter ?? 0;
  const currentChapterContent = chapters[currentChapter];
  const currentChapterSteps = steps.filter((item) => item.chapter === currentChapter);
  const currentStepInChapter =
    currentChapterSteps.findIndex((item) => item.id === currentStep?.id) + 1;
  const isFloatingCardWindowStep = [
    "note-pin",
    "note-unpin",
    "note-close-return",
    "note-drag-return",
    "todo-drag-return",
  ].includes(currentStep?.id);

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
      noteOrderBefore: null,
      secondaryNoteId: null,
      todoGroupId: null,
      todoGroupIds: todosState.groups.map((group) => group.id),
      todoId: null,
      todoIds: todosState.todos.map((todo) => todo.id),
      todoOrderBefore: null,
      secondaryTodoId: null,
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
    const runtime = runtimeRef.current;
    if (!isOpen || !runtime || !currentStep) {
      return;
    }

    if (currentStep.id === "note-add" && !runtime.noteId) {
      const created = cards.find((card) => !runtime.noteIds.includes(card.id));
      if (created) {
        runtime.noteId = created.id;
        setStep((value) => value + 1);
      }
    }
    if (currentStep.id === "note-add-second" && !runtime.secondaryNoteId) {
      const created = cards.find(
        (card) => card.id !== runtime.noteId && !runtime.noteIds.includes(card.id),
      );
      if (created) {
        runtime.secondaryNoteId = created.id;
        runtime.noteOrderBefore = orderSignature(
          cards.map((card) => card.id),
          runtime.noteId,
          runtime.secondaryNoteId,
        );
        setStep((value) => value + 1);
      }
    }
    if (currentStep.id === "note-reorder") {
      const nextOrder = orderSignature(
        cards.map((card) => card.id),
        runtime.noteId,
        runtime.secondaryNoteId,
      );
      if (runtime.noteOrderBefore && nextOrder && nextOrder !== runtime.noteOrderBefore) {
        setStep((value) => value + 1);
      }
    }
    if (currentStep.id === "note-group-create" && !runtime.noteGroupId) {
      const created = noteGroups.find((group) => !runtime.noteGroupIds.includes(group.id));
      if (created) {
        runtime.noteGroupId = created.id;
        setStep((value) => value + 1);
      }
    }
    if (
      currentStep.id === "note-group-apply" &&
      runtime.noteId &&
      runtime.noteGroupId &&
      cards.find((card) => card.id === runtime.noteId)?.groupId === runtime.noteGroupId
    ) {
      setStep((value) => value + 1);
    }
    if (currentStep.id === "todo-submit" && !runtime.todoId) {
      const created = todos.find((todo) => !runtime.todoIds.includes(todo.id));
      if (created) {
        runtime.todoId = created.id;
        setStep((value) => value + 1);
      }
    }
    if (currentStep.id === "todo-second-submit" && !runtime.secondaryTodoId) {
      const created = todos.find(
        (todo) => todo.id !== runtime.todoId && !runtime.todoIds.includes(todo.id),
      );
      if (created) {
        runtime.secondaryTodoId = created.id;
        runtime.todoOrderBefore = orderSignature(
          todos.map((todo) => todo.id),
          runtime.todoId,
          runtime.secondaryTodoId,
        );
        setStep((value) => value + 1);
      }
    }
    if (currentStep.id === "todo-reorder") {
      const nextOrder = orderSignature(
        todos.map((todo) => todo.id),
        runtime.todoId,
        runtime.secondaryTodoId,
      );
      if (runtime.todoOrderBefore && nextOrder && nextOrder !== runtime.todoOrderBefore) {
        setStep((value) => value + 1);
      }
    }
    if (currentStep.id === "todo-group-create" && !runtime.todoGroupId) {
      const created = todoGroups.find((group) => !runtime.todoGroupIds.includes(group.id));
      if (created) {
        runtime.todoGroupId = created.id;
        setStep((value) => value + 1);
      }
    }
    if (
      currentStep.id === "todo-group-apply" &&
      runtime.todoId &&
      runtime.todoGroupId &&
      todos.find((todo) => todo.id === runtime.todoId)?.groupId === runtime.todoGroupId
    ) {
      setStep((value) => value + 1);
    }
  }, [cards, currentStep, isOpen, noteGroups, todoGroups, todos]);

  useEffect(() => {
    if (!isOpen || !currentStep || !noteId) {
      return;
    }
    if (currentStep.id === "note-float" && floatingCardIds.includes(noteId)) {
      setStep((value) => value + 1);
    } else if (currentStep.id === "note-pin" && pinnedNoteIds.includes(noteId)) {
      setStep((value) => value + 1);
    } else if (currentStep.id === "note-unpin" && !pinnedNoteIds.includes(noteId)) {
      setStep((value) => value + 1);
    } else if (currentStep.id === "note-close-return" && !floatingCardIds.includes(noteId)) {
      setStep((value) => value + 1);
    } else if (currentStep.id === "note-float-again" && floatingCardIds.includes(noteId)) {
      setStep((value) => value + 1);
    } else if (currentStep.id === "note-drag-return" && !floatingCardIds.includes(noteId)) {
      setStep((value) => value + 1);
    }
  }, [currentStep, floatingCardIds, isOpen, noteId, pinnedNoteIds]);

  useEffect(() => {
    if (!isOpen || !currentStep || !todoId) {
      return;
    }
    if (currentStep.id === "todo-float" && floatingTodoIds.includes(todoId)) {
      setStep((value) => value + 1);
    } else if (currentStep.id === "todo-drag-return" && !floatingTodoIds.includes(todoId)) {
      setStep((value) => value + 1);
    }
  }, [currentStep, floatingTodoIds, isOpen, todoId]);

  useEffect(() => {
    const floatingGuide =
      (currentStep?.id === "note-float" || currentStep?.id === "note-pin") && noteId
        ? {
            card: { kind: "note" as const, id: noteId },
            guide: {
              phase: "pin",
              title: copy("固定到桌面", "Pin to desktop"),
              instruction: copy(
                "点击红圈中的图钉；若出现开机启动提示，请先完成选择",
                "Click the circled pin; handle the launch-at-login prompt if it appears",
              ),
            } satisfies FloatingCardGuideState,
          }
        : currentStep?.id === "note-unpin" && noteId
          ? {
              card: { kind: "note" as const, id: noteId },
              guide: {
                phase: "unpin",
                title: copy("取消桌面固定", "Remove desktop pin"),
                instruction: copy("再次点击高亮图钉", "Click the highlighted pin again"),
              } satisfies FloatingCardGuideState,
            }
          : currentStep?.id === "note-close-return" && noteId
            ? {
                card: { kind: "note" as const, id: noteId },
                guide: {
                  phase: "close",
                  title: copy("点击 × 收回", "Return with ×"),
                  instruction: copy("点击高亮的 ×，卡片会回到主窗口", "Click the highlighted × to return the card"),
                } satisfies FloatingCardGuideState,
              }
            : (currentStep?.id === "note-float-again" ||
                  currentStep?.id === "note-drag-return") &&
                noteId
              ? {
                  card: { kind: "note" as const, id: noteId },
                  guide: {
                    phase: "drag",
                    title: copy("拖回主窗口", "Drag back to the app"),
                    instruction: copy("按住卡片空白处，拖入便签列表", "Drag a blank area of the card into the note list"),
                  } satisfies FloatingCardGuideState,
                }
              : (currentStep?.id === "todo-float" ||
                    currentStep?.id === "todo-drag-return") &&
                  todoId
                ? {
                    card: { kind: "todo" as const, id: todoId },
                    guide: {
                      phase: "drag",
                      title: copy("拖回 Todo 列表", "Drag back to Todos"),
                      instruction: copy("按住卡片空白处，拖入主窗口", "Drag a blank area of the card into the main window"),
                    } satisfies FloatingCardGuideState,
                  }
                : null;

    const previous = guidedFloatingRef.current;
    if (!isOpen || !floatingGuide) {
      guidedFloatingRef.current = null;
      if (previous) {
        void setFloatingCardGuide(previous, null).catch(() => {});
      }
      return;
    }

    if (previous && (previous.id !== floatingGuide.card.id || previous.kind !== floatingGuide.card.kind)) {
      void setFloatingCardGuide(previous, null).catch(() => {});
    }
    guidedFloatingRef.current = floatingGuide.card;
    void setFloatingCardGuide(floatingGuide.card, floatingGuide.guide).catch(() => {});
  }, [currentStep, isOpen, isZh, noteId, todoId]);

  useEffect(() => {
    if (isOpen) {
      return;
    }
    guidedFloatingRef.current = null;
    void clearFloatingCardGuides().catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isHeaderCollapsed || !["todo-tab", "settings-open"].includes(currentStep?.id)) {
      return;
    }
    const timer = window.setTimeout(() => onHeaderCollapsedChange(false), 280);
    return () => window.clearTimeout(timer);
  }, [currentStep, isHeaderCollapsed, isOpen, onHeaderCollapsedChange]);

  useEffect(() => {
    if (!isOpen || !currentStep) {
      setTargetRect(null);
      return;
    }
    let animationFrame = 0;
    let didScrollTarget = false;
    let lastRect: { height: number; left: number; top: number; width: number } | null = null;
    const update = () => {
      const target = currentStep.target();
      const nextRect = target?.getBoundingClientRect() ?? null;
      const didChange =
        nextRect === null
          ? lastRect !== null
          : lastRect === null ||
            nextRect.height !== lastRect.height ||
            nextRect.left !== lastRect.left ||
            nextRect.top !== lastRect.top ||
            nextRect.width !== lastRect.width;
      if (didChange) {
        lastRect = nextRect
          ? {
              height: nextRect.height,
              left: nextRect.left,
              top: nextRect.top,
              width: nextRect.width,
            }
          : null;
        setTargetRect(nextRect);
      }
      if (target && !didScrollTarget) {
        didScrollTarget = true;
        target.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
      }
      animationFrame = window.requestAnimationFrame(update);
    };
    update();
    return () => window.cancelAnimationFrame(animationFrame);
  }, [currentStep, isOpen]);

  useEffect(() => {
    if (!isOpen || !currentStep?.autoAdvanceMs) {
      return;
    }
    const timer = window.setTimeout(
      () => setStep((value) => value + 1),
      currentStep.autoAdvanceMs,
    );
    return () => window.clearTimeout(timer);
  }, [currentStep, isOpen]);

  useEffect(() => {
    if (
      !isOpen ||
      !currentStep ||
      !["input", "focus", "pointerdown"].includes(currentStep.advanceOn ?? "")
    ) {
      return;
    }
    const target = currentStep.target();
    if (!target) {
      return;
    }
    let timer = 0;
    const eventName =
      currentStep.advanceOn === "focus"
        ? "focus"
        : currentStep.advanceOn === "pointerdown"
          ? "pointerdown"
          : "input";
    const advance = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(
        () => setStep((value) => value + 1),
        currentStep.advanceOn === "pointerdown" ? 90 : 220,
      );
    };
    target.addEventListener(eventName, advance);
    return () => {
      window.clearTimeout(timer);
      target.removeEventListener(eventName, advance);
    };
  }, [currentStep, isOpen]);

  useEffect(() => {
    if (
      !isOpen ||
      !currentStep ||
      currentStep.autoAdvanceMs ||
      ["input", "focus", "pointerdown"].includes(currentStep.advanceOn ?? "")
    ) {
      return;
    }
    const stateDrivenSteps: GuideStepId[] = [
      "note-add",
      "note-add-second",
      "note-reorder",
      "note-group-create",
      "note-group-apply",
      "note-float",
      "note-pin",
      "note-unpin",
      "note-close-return",
      "note-float-again",
      "note-drag-return",
      "todo-submit",
      "todo-second-submit",
      "todo-reorder",
      "todo-group-create",
      "todo-group-apply",
      "todo-float",
      "todo-drag-return",
    ];
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
      if (!didClickTarget || stateDrivenSteps.includes(currentStep.id)) {
        return;
      }
      window.setTimeout(() => setStep((value) => value + 1), 90);
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [currentStep, isOpen]);

  useEffect(() => {
    if (currentStep?.id === "settings-open" && showSettings) {
      setStep((value) => value + 1);
    }
  }, [currentStep, showSettings]);

  const cleanupPracticeData = () => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }
    for (const id of [runtime.noteId, runtime.secondaryNoteId]) {
      if (!id) continue;
      if (useNotesStore.getState().floatingCardIds.includes(id)) {
        void closeFloatingCard({ kind: "note", id });
      }
      useNotesStore.getState().removeCard(id);
    }
    for (const id of [runtime.todoId, runtime.secondaryTodoId]) {
      if (!id) continue;
      if (useTodosStore.getState().floatingTodoIds.includes(id)) {
        void closeFloatingCard({ kind: "todo", id });
      }
      useTodosStore.getState().removeTodo(id);
    }
    if (runtime.noteGroupId) {
      useNotesStore.getState().deleteGroup(runtime.noteGroupId);
    }
    if (runtime.todoGroupId) {
      useTodosStore.getState().deleteGroup(runtime.todoGroupId);
    }
  };

  const handleClose = () => {
    setTargetRect(null);
    void clearFloatingCardGuides().catch(() => {});
    cleanupPracticeData();
    runtimeRef.current = null;
    onClose();
  };

  const ensureGuideNotePair = () => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    if (!runtime.noteId || !useNotesStore.getState().cards.some((card) => card.id === runtime.noteId)) {
      const created = useNotesStore.getState().addCard();
      useNotesStore.getState().updateCardTitle(created.id, copy("交互指引便签", "Interactive guide note"));
      runtime.noteId = created.id;
    }
    if (
      !runtime.secondaryNoteId ||
      !useNotesStore.getState().cards.some((card) => card.id === runtime.secondaryNoteId)
    ) {
      const created = useNotesStore.getState().addCard();
      useNotesStore.getState().updateCardTitle(created.id, copy("拖动我来换序", "Drag me to reorder"));
      runtime.secondaryNoteId = created.id;
    }
    runtime.noteOrderBefore = orderSignature(
      useNotesStore.getState().cards.map((card) => card.id),
      runtime.noteId,
      runtime.secondaryNoteId,
    );
  };

  const ensureGuideTodoPair = () => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    if (!runtime.todoId || !useTodosStore.getState().todos.some((todo) => todo.id === runtime.todoId)) {
      runtime.todoId =
        useTodosStore.getState().addTodo(copy("体验 StickIt Todo", "Try a StickIt todo"))?.id ?? null;
    }
    if (
      !runtime.secondaryTodoId ||
      !useTodosStore.getState().todos.some((todo) => todo.id === runtime.secondaryTodoId)
    ) {
      runtime.secondaryTodoId =
        useTodosStore.getState().addTodo(copy("拖动我来换序", "Drag me to reorder"))?.id ?? null;
    }
    runtime.todoOrderBefore = orderSignature(
      useTodosStore.getState().todos.map((todo) => todo.id),
      runtime.todoId,
      runtime.secondaryTodoId,
    );
  };

  const moveToChapter = (nextChapter: number) => {
    const targetChapter = Math.max(0, Math.min(GUIDE_CHAPTER_COUNT - 1, nextChapter));
    const targetStep = steps.findIndex((item) => item.chapter === targetChapter);
    if (targetStep < 0) return;

    document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    if (targetChapter >= 2) ensureGuideNotePair();
    if (targetChapter >= 4) ensureGuideTodoPair();
    setTargetRect(null);
    onSettingsChange(false);
    onTabChange(targetChapter <= 2 ? "notes" : "todos");
    if (targetChapter === 0 || targetChapter === 3 || targetChapter === 6) {
      onHeaderCollapsedChange(false);
    }
    setStep(targetStep);
  };

  const viewportHeight = typeof window === "undefined" ? 800 : window.innerHeight;
  const panelStyle =
    targetRect && targetRect.top > viewportHeight * 0.52
      ? { left: 14, top: 14 }
      : { bottom: 14, right: 14 };

  if (!isOpen || !currentStep || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            className={`pointer-events-none fixed inset-0 z-[195] bg-[rgba(30,25,21,0.08)] ${
              isFloatingCardWindowStep ? "hidden" : ""
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          {targetRect && !isFloatingCardWindowStep ? (
            <motion.div
              key={`highlight-${currentStep.id}`}
              data-guide-highlight
              className="pointer-events-none fixed z-[196] rounded-[16px] border-2 border-[#ff7a59] shadow-[0_0_0_5px_rgba(255,122,89,0.18),0_12px_32px_rgba(61,49,34,0.14)]"
              initial={{ opacity: 0 }}
              animate={{
                height: targetRect.height + 10,
                left: targetRect.left - 5,
                opacity: [0.7, 1, 0.7],
                boxShadow: [
                  "0 0 0 4px rgba(255,122,89,0.18), 0 12px 32px rgba(61,49,34,0.14)",
                  "0 0 0 7px rgba(255,122,89,0.28), 0 12px 32px rgba(61,49,34,0.2)",
                  "0 0 0 4px rgba(255,122,89,0.18), 0 12px 32px rgba(61,49,34,0.14)",
                ],
                top: targetRect.top - 5,
                width: targetRect.width + 10,
              }}
              exit={{ opacity: 0 }}
              transition={{
                height: { duration: 0.2 },
                left: { duration: 0.2 },
                opacity: { duration: 1.25, repeat: Infinity },
                boxShadow: { duration: 1.25, repeat: Infinity },
                top: { duration: 0.2 },
                width: { duration: 0.2 },
              }}
            />
          ) : null}
          <motion.aside
            data-guide-dialog
            role="dialog"
            aria-label={copy("StickIt 交互式指引", "StickIt interactive guide")}
            className={`fixed z-[200] w-[min(268px,calc(100vw-28px))] rounded-[20px] border border-[rgba(213,198,180,0.88)] bg-[rgba(255,252,248,0.97)] p-3.5 shadow-[0_22px_46px_rgba(61,49,34,0.22)] backdrop-blur-xl ${
              isFloatingCardWindowStep ? "hidden" : ""
            }`}
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
                  {copy(
                    `功能 ${currentChapter + 1}/${GUIDE_CHAPTER_COUNT} · 步骤 ${currentStepInChapter}/${currentChapterSteps.length}`,
                    `Feature ${currentChapter + 1} of ${GUIDE_CHAPTER_COUNT} · Step ${currentStepInChapter} of ${currentChapterSteps.length}`,
                  )}
                </p>
                <div className="mt-1.5 flex h-1 gap-0.5" aria-hidden="true">
                  {chapters.map((_, chapterIndex) => (
                    <span
                      key={chapterIndex}
                      className="relative flex-1 overflow-hidden rounded-full bg-[rgba(156,126,94,0.14)]"
                    >
                      <motion.span
                        className="absolute inset-y-0 left-0 rounded-full bg-[#ff7a59]"
                        animate={{
                          width:
                            chapterIndex < currentChapter
                              ? "100%"
                              : chapterIndex === currentChapter
                                ? `${(currentStepInChapter / currentChapterSteps.length) * 100}%`
                                : "0%",
                        }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </span>
                  ))}
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
            <p className="mt-3 font-display text-[17px] font-semibold tracking-[-0.025em] text-[var(--brown-strong)]">
              {currentChapterContent.title}
            </p>
            <p className="mt-1.5 text-[11.5px] leading-5 text-[var(--muted)]">
              {currentChapterContent.body}
            </p>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep.id}
                className="mt-3 rounded-[12px] bg-[rgba(255,122,89,0.09)] px-2.5 py-2 text-[#8f553d]"
                initial={{ opacity: 0, x: 10, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -8, scale: 0.98 }}
                transition={{ duration: 0.22 }}
              >
                <p className="text-[10px] font-bold leading-4">{currentStep.title}</p>
                <p className="mt-0.5 text-[10.5px] font-semibold leading-5">
                  {currentStep.instruction}
                </p>
              </motion.div>
            </AnimatePresence>
            {!targetRect && currentStep.id !== "settings-overview" ? (
              <motion.div
                aria-hidden="true"
                className="mx-auto mt-3 h-2.5 w-2.5 rounded-full bg-[#ff7a59]"
                animate={{
                  boxShadow: [
                    "0 0 0 0 rgba(255,122,89,.38)",
                    "0 0 0 10px rgba(255,122,89,0)",
                  ],
                  scale: [0.9, 1.15, 0.9],
                }}
                transition={{ duration: 1.3, repeat: Infinity }}
              />
            ) : null}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <motion.button
                type="button"
                aria-label={copy("上一功能", "Previous feature")}
                disabled={currentChapter === 0}
                className="paper-button inline-flex items-center justify-center gap-1 rounded-[11px] px-2.5 py-2 text-[10.5px] font-bold disabled:cursor-not-allowed disabled:opacity-40"
                whileTap={currentChapter === 0 ? undefined : { scale: 0.97 }}
                onClick={() => moveToChapter(currentChapter - 1)}
              >
                <ChevronLeftIcon size={12} />
                {copy("上一功能", "Previous feature")}
              </motion.button>
              <motion.button
                type="button"
                aria-label={copy("下一功能", "Next feature")}
                disabled={currentChapter === GUIDE_CHAPTER_COUNT - 1}
                className="paper-button paper-button-primary inline-flex items-center justify-center gap-1 rounded-[11px] px-2.5 py-2 text-[10.5px] font-bold disabled:cursor-not-allowed disabled:opacity-40"
                whileTap={currentChapter === GUIDE_CHAPTER_COUNT - 1 ? undefined : { scale: 0.97 }}
                onClick={() => moveToChapter(currentChapter + 1)}
              >
                {copy("下一功能", "Next feature")}
                <ChevronRightIcon size={12} />
              </motion.button>
            </div>
            {currentStep.id === "settings-overview" ? (
              <motion.button
                type="button"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-[12px] bg-[linear-gradient(145deg,#ff7a59,#f4b942)] px-3 py-2.5 text-[11px] font-bold text-white"
                whileTap={{ scale: 0.98 }}
                onClick={handleClose}
              >
                <CircleCheckBigIcon size={14} />
                {copy("完成指引", "Finish guide")}
              </motion.button>
            ) : null}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
