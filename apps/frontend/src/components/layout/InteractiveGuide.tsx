import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
  activeTab: TabId;
  isHeaderCollapsed: boolean;
  isOpen: boolean;
  onClose: () => void;
  onHeaderCollapsedChange: (collapsed: boolean) => void;
  onSettingsChange: (open: boolean) => void;
  onTabChange: (tab: TabId) => void;
  showSettings: boolean;
};

type GuideRuntime = {
  dateTodoId: string | null;
  initialHeaderCollapsed: boolean;
  initialShowSettings: boolean;
  initialTab: TabId;
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
  | "note-group-more-colors"
  | "note-group-advanced-open"
  | "note-group-advanced-surface"
  | "note-group-advanced-save"
  | "note-group-create"
  | "note-group-apply"
  | "note-filter-open"
  | "note-filter-pick"
  | "note-filter-apply"
  | "note-filter-reopen"
  | "note-filter-all"
  | "note-filter-clear"
  | "note-group-reopen"
  | "note-group-edit"
  | "note-group-save"
  | "note-group-delete-mode"
  | "note-group-delete"
  | "note-group-close"
  | "note-collapse"
  | "note-float"
  | "note-pin"
  | "note-unpin"
  | "note-resize"
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
  | "todo-calendar-open"
  | "todo-date-tomorrow"
  | "todo-date-draft"
  | "todo-date-submit"
  | "todo-calendar-return-open"
  | "todo-date-today"
  | "todo-reminder-open"
  | "todo-reminder-time"
  | "todo-reminder-save"
  | "todo-group-open"
  | "todo-group-add"
  | "todo-group-name"
  | "todo-group-color"
  | "todo-group-create"
  | "todo-group-apply"
  | "todo-filter-brief"
  | "todo-filter-close"
  | "todo-float"
  | "todo-resize"
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
  details?: string[];
  highlightShape?: "rounded" | "pill";
  id: GuideStepId;
  instruction: string;
  target: () => HTMLElement | null;
  title: string;
  panelPlacement?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
};

const GUIDE_CHAPTER_COUNT = 7;
const GUIDE_PANEL_MARGIN = 14;

type GuidePanelPlacement = "top-left" | "top-right" | "bottom-left" | "bottom-right";

type GuideRect = Pick<DOMRect, "bottom" | "height" | "left" | "right" | "top" | "width">;

export function getGuidePanelPosition(
  target: GuideRect,
  panel: Pick<DOMRect, "height" | "width">,
  viewport: { height: number; width: number },
  preferredPlacement: GuidePanelPlacement,
) {
  const right = Math.max(GUIDE_PANEL_MARGIN, viewport.width - panel.width - GUIDE_PANEL_MARGIN);
  const bottom = Math.max(GUIDE_PANEL_MARGIN, viewport.height - panel.height - GUIDE_PANEL_MARGIN);
  const candidates: Record<GuidePanelPlacement, { left: number; top: number }> = {
    "top-left": { left: GUIDE_PANEL_MARGIN, top: GUIDE_PANEL_MARGIN },
    "top-right": { left: right, top: GUIDE_PANEL_MARGIN },
    "bottom-left": { left: GUIDE_PANEL_MARGIN, top: bottom },
    "bottom-right": { left: right, top: bottom },
  };
  const paddedTarget = {
    bottom: target.bottom + 12,
    left: target.left - 12,
    right: target.right + 12,
    top: target.top - 12,
  };
  const placementOrder = [
    preferredPlacement,
    ...(["top-left", "top-right", "bottom-left", "bottom-right"] as const).filter(
      (placement) => placement !== preferredPlacement,
    ),
  ];

  const overlapArea = ({ left, top }: { left: number; top: number }) => {
    const overlapWidth = Math.max(0, Math.min(left + panel.width, paddedTarget.right) - Math.max(left, paddedTarget.left));
    const overlapHeight = Math.max(0, Math.min(top + panel.height, paddedTarget.bottom) - Math.max(top, paddedTarget.top));
    return overlapWidth * overlapHeight;
  };
  const nonOverlappingPlacement = placementOrder.find((placement) => overlapArea(candidates[placement]) === 0);
  const placement = nonOverlappingPlacement ?? placementOrder.reduce((best, candidate) =>
    overlapArea(candidates[candidate]) < overlapArea(candidates[best]) ? candidate : best,
  );

  return candidates[placement];
}

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
  activeTab,
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
  const [guidePanelPosition, setGuidePanelPosition] = useState<CSSProperties | null>(null);
  const [pinnedNoteIds, setPinnedNoteIds] = useState<string[]>([]);
  const [isCompletionVisible, setIsCompletionVisible] = useState(false);
  const runtimeRef = useRef<GuideRuntime | null>(null);
  const guidedFloatingRef = useRef<{ id: string; kind: "note" | "todo" } | null>(null);
  const guidePanelRef = useRef<HTMLElement>(null);
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
    options: Pick<
      GuideStep,
      "advanceOn" | "allowOutsideTarget" | "autoAdvanceMs" | "details" | "highlightShape" | "panelPlacement"
    > = {},
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
      stepItem("note-toolbar-overview", 1, "这是富文本工具栏", "This is the rich-text toolbar", "高亮区域包含粗体、斜体、下划线、文字颜色、复制粘贴和撤销重做；请查看 5 秒，无需点击", "The highlighted toolbar contains bold, italic, underline, text color, clipboard, undo, and redo; review it for five seconds—no click needed", () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"] [data-action="note-rich-toolbar"]`) : null, { autoAdvanceMs: 5_000 }),
      stepItem("note-toolbar-collapse", 1, "折叠编辑工具栏", "Collapse the editor toolbar", "点击工具栏末端箭头，把编辑区收成紧凑模式", "Click the arrow at the end of the toolbar for a compact editor", () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"] [data-action="note-toolbar-toggle"]`) : null, { advanceOn: "pointerdown" }),
      stepItem("note-toolbar-expand", 1, "展开编辑工具栏", "Expand the editor toolbar", "再次点击箭头即可恢复全部工具", "Click the arrow again to restore every tool", () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"] [data-action="note-toolbar-toggle"]`) : null, { advanceOn: "pointerdown" }),
      stepItem("note-add-second", 1, "再建一张便签", "Create another note", "点击新增便签，为换序准备第二张卡片", "Click Add note to prepare a second card for reordering", () => queryTarget('[data-guide="note-add"]')),
      stepItem("note-reorder", 1, "交换便签位置", "Reorder note cards", "按住高亮便签的空白区域，把它拖到另一张便签的上方或下方", "Drag the highlighted card by a blank area above or below the other note", () => secondaryNoteId ? queryTarget(`[data-note-card-id="${cssValue(secondaryNoteId)}"]`) : null),
      stepItem("note-group-open", 1, "打开便签分组", "Open note groups", "点击第一张便签的分组标签", "Click the group label on the first note", () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"] [data-action="note-group"]`) : null),
      stepItem("note-group-add", 1, "新增分组", "Add a group", "点击新增分组", "Click Add group", () => queryTarget('[data-guide="note-group-add"]')),
      stepItem("note-group-name", 1, "命名分组", "Name the group", "输入一个分组名称", "Enter a group name", () => queryTarget('[data-guide="note-group-name"]'), { advanceOn: "input" }),
      stepItem("note-group-color", 1, "打开分组调色板", "Open the group palette", "点击调色板，查看便签分组的颜色选项", "Open the palette to explore note-group colors", () => queryTarget('[data-guide="note-group-color"]')),
      stepItem("note-group-more-colors", 1, "丰富的分组颜色", "A rich group palette", "预设色可快速区分不同分组；点击彩色按钮展开更多颜色", "Preset colors make groups easy to distinguish; click the multicolor button for more", () => queryTarget('[data-guide="note-group-more-colors"]'), { advanceOn: "pointerdown" }),
      stepItem("note-group-advanced-open", 1, "打开系统调色板", "Open the full color picker", "点击“显示颜色”，进入完整颜色编辑", "Click Show Colors for full color editing", () => queryTarget('[data-guide="note-group-advanced-open"]'), { advanceOn: "pointerdown" }),
      stepItem("note-group-advanced-surface", 1, "自定义任意颜色", "Customize any color", "在色彩区域点选一个颜色", "Pick any color from the color surface", () => queryTarget('[data-guide="note-group-advanced-surface"]'), { advanceOn: "pointerdown" }),
      stepItem("note-group-advanced-save", 1, "保存自定义颜色", "Save the custom color", "点击保存颜色", "Click Save color", () => queryTarget('[data-guide="note-group-advanced-save"]'), { advanceOn: "pointerdown" }),
      stepItem("note-group-create", 1, "创建分组", "Create the group", "点击创建分组", "Click Create group", () => queryTarget('[data-guide="note-group-create"]')),
      stepItem("note-group-apply", 1, "应用分组", "Apply the group", "选择刚创建的分组", "Choose the group you just created", () => runtimeRef.current?.noteGroupId ? queryGroupTarget(runtimeRef.current.noteGroupId) : null),
      stepItem("note-filter-open", 1, "打开分组筛选", "Open group filters", "点击底部的分组筛选按钮", "Click the group-filter button at the bottom", () => queryTarget('[data-guide="note-filter-open"]')),
      stepItem("note-filter-pick", 1, "筛选便签", "Filter notes", "取消一个分组的勾选，观察列表如何按分组收窄", "Uncheck one group and watch the list narrow by group", () => queryTarget('[data-testid="note-group-filter-scroll-region"]')),
      stepItem("note-filter-apply", 1, "应用筛选", "Apply the filter", "点击保存应用筛选", "Click Save to apply the filter", () => queryTarget('[data-guide="note-filter-apply"]')),
      stepItem("note-filter-reopen", 1, "恢复全部便签", "Restore all notes", "再次打开筛选", "Open the filters again", () => queryTarget('[data-guide="note-filter-open"]')),
      stepItem("note-filter-all", 1, "选择全部分组", "Select every group", "勾选“全部分组”", "Select All groups", () => queryTarget('[data-testid="note-group-filter-scroll-region"]')),
      stepItem("note-filter-clear", 1, "保存完整列表", "Save the full list", "点击保存，恢复显示所有便签", "Click Save to show every note again", () => queryTarget('[data-guide="note-filter-apply"]')),
      stepItem("note-group-reopen", 1, "再次打开分组", "Open groups again", "重新打开便签分组，继续了解编辑和删除", "Open note groups again to review editing and deletion", () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"] [data-action="note-group"]`) : null),
      stepItem("note-group-edit", 1, "编辑已有分组", "Edit an existing group", "点击分组右侧的编辑按钮", "Click the edit button beside the group", () => runtimeRef.current?.noteGroupId ? queryTarget(`[data-guide-group-edit-id="${cssValue(runtimeRef.current.noteGroupId)}"]`) : null),
      stepItem("note-group-save", 1, "保存分组修改", "Save group changes", "这里可以修改名称和颜色；本次直接保存即可", "You can change the name and color here; save it as-is for this tour", () => queryTarget('[data-guide="note-group-save"]')),
      stepItem("note-group-delete-mode", 1, "进入分组删除模式", "Enter group deletion mode", "点击垃圾桶按钮；列表会显示每个分组的删除入口", "Click the trash button to reveal a delete control for each group", () => queryTarget('[data-guide="note-group-delete-mode"]')),
      stepItem("note-group-delete", 1, "删除练习分组", "Delete the practice group", "点击刚创建分组右侧的删除按钮", "Click Delete beside the group you just created", () => runtimeRef.current?.noteGroupId ? queryTarget(`[data-guide-group-delete-id="${cssValue(runtimeRef.current.noteGroupId)}"]`) : null),
      stepItem("note-group-close", 1, "关闭分组面板", "Close the group panel", "点击关闭，返回便签列表", "Click Close to return to notes", () => queryTarget('[data-guide="note-group-close"]')),
      stepItem("note-collapse", 1, "折叠便签", "Fold the note", "点击第一张便签的折叠按钮", "Click the fold control on the first note", () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"] [data-action="note-collapse"]`) : null),

      stepItem("note-float", 2, "创建便签悬浮卡片", "Create a floating note", "把高亮便签拖出主窗口后松开", "Drag the highlighted note outside the main window", () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"]`) : null),
      stepItem("note-pin", 2, "固定到桌面", "Pin it to the desktop", "点击悬浮卡片上的图钉，将它放到桌面", "Click the pin on the floating card to place it on your desktop", () => null),
      stepItem("note-unpin", 2, "普通悬浮与桌面置顶", "Floating vs. desktop-pinned", "普通悬浮便签显示在当前工作空间的窗口上方；桌面置顶便签像固定在桌面的卡片，不会覆盖其他全屏空间，重新登录后还可自动恢复。阅读后再次点击图钉，恢复普通悬浮。", "A floating note stays above windows in the current workspace. A desktop-pinned note stays with the desktop, does not cover other full-screen spaces, and can return after sign-in. When you are ready, click the pin again to return to normal floating mode.", () => null),
      stepItem("note-resize", 2, "调整便签悬浮大小", "Resize the floating note", "拖动悬浮卡片右下角即可放大或缩小；请实际试一试", "Drag the floating card's bottom-right corner to make it larger or smaller", () => null, { autoAdvanceMs: 5_000 }),
      stepItem("note-close-return", 2, "用关闭键收回", "Return it with Close", "点击悬浮卡片上的 ×，卡片会回到应用内部", "Click × on the floating card to return it to the app", () => null),
      stepItem("note-float-again", 2, "再次创建悬浮卡片", "Float it again", "再次把便签拖出主窗口", "Drag the note outside the main window again", () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"]`) : null),
      stepItem("note-drag-return", 2, "拖回应用内部", "Drag it back into the app", "按住悬浮卡片，将它拖入主窗口的便签列表；绿色插入线会显示落点", "Drag the floating card into the main note list; the green insertion line shows its destination", () => null),
      stepItem("note-delete", 2, "删除练习便签", "Delete the practice note", "点击便签删除按钮", "Click the note delete button", () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"] [data-action="delete"]`) : null),

      stepItem("todo-tab", 3, "切换到 Todos", "Switch to Todos", "点击 Todos 标签", "Click the Todos tab", () => queryTarget('[data-guide="tab-todos"]')),
      stepItem("todo-focus", 3, "用Enter快速定位", "Focus quickly with Enter", "应用唤起后按Enter键或点击输入框获取焦点，按Enter键获取焦点无需鼠标", "After Floatem appears, press Enter or click the input field to focus it. Pressing Enter lets you focus without a mouse.", () => queryTarget('[data-guide="todo-quick-input"]'), { advanceOn: "focus" }),
      stepItem("todo-draft", 3, "输入待办", "Type a todo", "输入第一条待办内容", "Type the first todo", () => queryTarget('[data-guide="todo-quick-input"]'), { advanceOn: "input" }),
      stepItem("todo-submit", 3, "快速创建", "Create it quickly", "按 Enter 或点击右侧的可视化提交按键均可创建；Shift + Enter 可换行", "Press Enter or click the visible submit key on the right; Shift + Enter inserts a new line", () => queryTarget('[data-guide="todo-quick-add"]')),
      stepItem("todo-second-draft", 3, "再输入一条待办", "Type another todo", "输入第二条待办", "Type a second todo", () => queryTarget('[data-guide="todo-quick-input"]'), { advanceOn: "input" }),
      stepItem("todo-second-submit", 3, "创建第二条待办", "Create the second todo", "按 Enter 或点击右侧提交按键创建", "Press Enter or click the submit key on the right", () => queryTarget('[data-guide="todo-quick-add"]')),
      stepItem("todo-reorder", 3, "交换待办位置", "Reorder todos", "把高亮待办拖到另一条待办的上方或下方", "Drag the highlighted todo above or below the other todo", () => secondaryTodoId ? queryTarget(`[data-todo-item-id="${cssValue(secondaryTodoId)}"]`) : null),
      stepItem("todo-edit-open", 3, "打开待办编辑", "Open todo editing", "点击第一条待办的文字区域", "Click the text area of the first todo", () => todoId ? queryTarget(`[data-todo-item-id="${cssValue(todoId)}"]`) : null),
      stepItem("todo-edit-text", 3, "修改待办内容", "Edit the todo", "修改待办文字", "Change the todo text", () => queryTarget('[data-guide="todo-edit-title"]'), { advanceOn: "input" }),
      stepItem("todo-edit-save", 3, "保存修改", "Save the edit", "点击保存", "Click Save", () => queryTarget('[data-guide="todo-edit-save"]')),
      stepItem("todo-calendar-open", 3, "选择其他日期", "Choose another date", "打开日期面板，为不同日期添加待办", "Open the date panel to add a todo on another day", () => queryTarget('[data-guide="todo-calendar"]')),
      stepItem("todo-date-tomorrow", 3, "切换到明天", "Switch to tomorrow", "点击“明天”", "Click Tomorrow", () => queryTarget('[data-guide-date="tomorrow"]')),
      stepItem("todo-date-draft", 3, "输入明天的待办", "Type tomorrow's todo", "在输入框填写一条明日待办", "Type a todo for tomorrow", () => queryTarget('[data-guide="todo-quick-input"]'), { advanceOn: "input" }),
      stepItem("todo-date-submit", 3, "添加到指定日期", "Add it to that date", "按 Enter 或点击右侧提交按键，待办会保存到当前选择的明天", "Press Enter or click the submit key to save the todo under tomorrow", () => queryTarget('[data-guide="todo-quick-add"]')),
      stepItem("todo-calendar-return-open", 3, "返回今天", "Return to today", "再次打开日期面板", "Open the date panel again", () => queryTarget('[data-guide="todo-calendar"]')),
      stepItem("todo-date-today", 3, "恢复今天列表", "Restore today's list", "点击“今天”，继续后续功能", "Click Today to continue with the remaining features", () => queryTarget('[data-guide-date="today"]')),

      stepItem("todo-reminder-open", 4, "打开待办提醒", "Open the reminder", "点击第一条待办的提醒按钮", "Click the reminder control on the first todo", () => todoId ? queryTarget(`[data-todo-item-id="${cssValue(todoId)}"] [data-action="todo-reminder"]`) : null),
      stepItem("todo-reminder-time", 4, "选择提醒时间", "Choose a reminder time", "选择“上午”", "Choose Morning", () => queryTarget('[data-guide-reminder="morning"]')),
      stepItem("todo-reminder-save", 4, "保存提醒", "Save the reminder", "点击保存；到时 Floatem 会发送系统通知", "Click Save; Floatem will send a system notification at that time", () => queryTarget('[data-guide="reminder-save"]')),

      stepItem("todo-group-open", 5, "打开 Todo 分组", "Open todo groups", "点击第一条待办的分组按钮", "Click the group control on the first todo", () => todoId ? queryTarget(`[data-todo-item-id="${cssValue(todoId)}"] [data-action="todo-group"]`) : null),
      stepItem("todo-group-add", 5, "新增 Todo 分组", "Add a todo group", "点击新增分组", "Click Add group", () => queryTarget('[data-guide="todo-group-add"]')),
      stepItem("todo-group-name", 5, "命名 Todo 分组", "Name the todo group", "输入分组名称", "Enter a group name", () => queryTarget('[data-guide="todo-group-name"]'), { advanceOn: "input" }),
      stepItem("todo-group-color", 5, "选择分组颜色", "Choose a group color", "点击调色板并选择任一颜色", "Open the palette and choose any color", () => queryTarget('[data-guide="todo-group-color"]'), { allowOutsideTarget: true }),
      stepItem("todo-group-create", 5, "创建 Todo 分组", "Create the todo group", "选择颜色后点击创建分组", "Choose a color, then click Create group", () => queryTarget('[data-guide="todo-group-create"]'), { allowOutsideTarget: true }),
      stepItem("todo-group-apply", 5, "应用 Todo 分组", "Apply the todo group", "选择刚创建的分组", "Choose the group you just created", () => runtimeRef.current?.todoGroupId ? queryGroupTarget(runtimeRef.current.todoGroupId) : null),
      stepItem("todo-filter-brief", 5, "Todo 同样支持分组筛选", "Todos support group filters too", "点击筛选按钮。这里与便签一致：选择需要显示的分组并保存即可", "Open filters. This works like notes: choose which groups to show, then save", () => queryTarget('[data-guide="todo-filter-open"]')),
      stepItem("todo-filter-close", 5, "返回 Todo 列表", "Return to Todos", "Todo 筛选功能在此简要带过，点击关闭继续", "That is the todo filter flow in brief; click Close to continue", () => queryTarget('[data-guide="todo-filter-close"]')),
      stepItem("todo-float", 5, "创建待办悬浮卡片", "Create a floating todo", "把高亮待办拖出主窗口；Todo 也支持悬浮和桌面固定", "Drag the highlighted todo outside the window; todos also support floating and desktop pinning", () => todoId ? queryTarget(`[data-todo-item-id="${cssValue(todoId)}"]`) : null),
      stepItem("todo-resize", 5, "调整待办悬浮大小", "Resize the floating todo", "拖动悬浮待办右下角，体验放大和缩小", "Drag the floating todo's bottom-right corner to resize it", () => null, { autoAdvanceMs: 5_000 }),
      stepItem("todo-drag-return", 5, "拖回 Todo 列表", "Drag it back to Todos", "把悬浮待办拖回主窗口，插入线会帮助你选择排列位置", "Drag the floating todo back; the insertion line helps choose its position", () => null),
      stepItem("todo-complete", 5, "完成待办", "Complete the todo", "点击待办完成圆圈", "Click the completion circle", () => todoId ? queryTarget(`[data-todo-item-id="${cssValue(todoId)}"] [data-action="todo-completion"]`) : null),
      stepItem("todo-restore", 5, "恢复待办", "Restore the todo", "再次点击完成圆圈", "Click the completion circle again", () => todoId ? queryTarget(`[data-todo-item-id="${cssValue(todoId)}"] [data-action="todo-completion"]`) : null),
      stepItem("todo-delete", 5, "删除练习待办", "Delete the practice todo", "点击高亮圆圈中的待办删除按钮", "Click the todo delete button inside the highlighted ring", () => todoId ? queryTarget(`[data-todo-item-id="${cssValue(todoId)}"] [data-action="todo-delete"]`) : null, { highlightShape: "pill", panelPlacement: "top-left" }),

      stepItem("settings-open", 6, "进入设置", "Open Settings", "点击顶部设置按钮", "Click the Settings button in the header", () => queryTarget('[data-guide="settings-open"]')),
      stepItem("settings-overview", 6, "设置一览", "Settings at a glance", "以下是各子菜单支持的修改项。确认后将结束指引。", "Here is what each submenu lets you change. Confirm to finish the guide.", () => queryTarget('[data-guide="settings-overview"]'), {
        details: isZh
          ? [
              "通用：语言、时区、时间格式、默认页面、开机启动",
              "主题：经典、余晖等固定浅色主题风格",
              "快捷键：全局唤起组合键",
              "动效：切换方式、速度与粒子效果",
              "通知：提醒声音与测试通知",
              "关于：版本、功能与隐私说明；设置首页还可重置和退出",
            ]
          : [
              "General: language, time zone, time format, default page, launch at login",
              "Theme: a fixed light visual style such as Classic or Afterglow",
              "Shortcuts: global summon key combination",
              "Motion: transition style, speed, and particles",
              "Notifications: reminder sound and test notification",
              "About: version, features, and privacy; the Settings index also offers reset and quit",
            ],
      }),
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
        body: copy("了解普通悬浮与桌面置顶的区别，再分别用 × 和拖回主窗口两种方式收回卡片。", "Learn how floating and desktop-pinned cards differ, then return one with × and by dragging it into the app."),
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
  const settingsOverviewItems = useMemo(
    () => [
      {
        title: copy("通用", "General"),
        body: copy(
          "修改语言、时区、12/24 小时时间格式、默认打开页面，以及是否开机自动启动。",
          "Change language, time zone, 12/24-hour time format, the default page, and launch at login.",
        ),
      },
      {
        title: copy("主题", "Theme"),
        body: copy(
          "选择经典、余晖、梅红、兰绿、竹青、菊黄等固定浅色主题。",
          "Choose a fixed light theme such as Classic, Afterglow, Plum, Orchid, Bamboo, or Chrysanthemum.",
        ),
      },
      {
        title: copy("快捷键", "Shortcuts"),
        body: copy(
          "设置在任何应用中唤起 Floatem 的全局快捷键组合。",
          "Set the global key combination that summons Floatem from any app.",
        ),
      },
      {
        title: copy("动效与反馈", "Motion and feedback"),
        body: copy(
          "调整页面切换方式、动画速度和完成待办时的粒子反馈。",
          "Adjust page transitions, animation speed, and completion particles.",
        ),
      },
      {
        title: copy("通知", "Notifications"),
        body: copy(
          "控制提醒声音，查看系统通知状态，并发送测试通知。",
          "Control reminder sounds, review system notification status, and send a test notification.",
        ),
      },
      {
        title: copy("关于 Floatem", "About Floatem"),
        body: copy(
          "查看版本与构建号、功能概览、数据隐私范围、版权声明和联系邮箱。",
          "Review the version and build, feature summary, data privacy scope, copyright, and contact email.",
        ),
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
  const isFloatingCardWindowStep =
    ((noteId !== null && floatingCardIds.includes(noteId)) &&
      ["note-pin", "note-unpin", "note-resize", "note-close-return", "note-drag-return"].includes(
        currentStep?.id,
      )) ||
    ((todoId !== null && floatingTodoIds.includes(todoId)) &&
      ["todo-resize", "todo-drag-return"].includes(currentStep?.id));

  useEffect(() => {
    if (!isOpen || runtimeRef.current) {
      return;
    }
    const notesState = useNotesStore.getState();
    const todosState = useTodosStore.getState();
    runtimeRef.current = {
      dateTodoId: null,
      initialHeaderCollapsed: isHeaderCollapsed,
      initialShowSettings: showSettings,
      initialTab: activeTab,
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
    setIsCompletionVisible(false);
    setPinnedNoteIds([]);
    onSettingsChange(false);
    onTabChange("notes");
    onHeaderCollapsedChange(false);
  }, [
    activeTab,
    isHeaderCollapsed,
    isOpen,
    onHeaderCollapsedChange,
    onSettingsChange,
    onTabChange,
    showSettings,
  ]);

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
    if (
      currentStep.id === "note-group-delete" &&
      runtime.noteGroupId &&
      !noteGroups.some((group) => group.id === runtime.noteGroupId)
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
    if (currentStep.id === "todo-date-submit" && !runtime.dateTodoId) {
      const created = todos.find(
        (todo) =>
          todo.id !== runtime.todoId &&
          todo.id !== runtime.secondaryTodoId &&
          !runtime.todoIds.includes(todo.id),
      );
      if (created) {
        runtime.dateTodoId = created.id;
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
    const activeGuideTodo = runtime.todoId
      ? todos.find((todo) => todo.id === runtime.todoId)
      : null;
    if (currentStep.id === "todo-complete" && activeGuideTodo?.done) {
      setStep((value) => value + 1);
    }
    if (currentStep.id === "todo-restore" && activeGuideTodo && !activeGuideTodo.done) {
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
                title: copy("普通悬浮与桌面置顶", "Floating vs. desktop-pinned"),
                instruction: copy(
                  "点击高亮图钉，恢复普通悬浮。详细说明见主窗口指引。",
                  "Click the highlighted pin to return to normal floating. See the main guide for details.",
                ),
                } satisfies FloatingCardGuideState,
              }
          : currentStep?.id === "note-resize" && noteId
            ? {
                card: { kind: "note" as const, id: noteId },
                guide: {
                  phase: "resize",
                  title: copy("拖动右下角缩放", "Resize from the bottom-right"),
                  instruction: copy("拖动高亮的右下角，放大或缩小便签", "Drag the highlighted corner to resize the note"),
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
                    currentStep?.id === "todo-resize" ||
                    currentStep?.id === "todo-drag-return") &&
                  todoId
                ? {
                    card: { kind: "todo" as const, id: todoId },
                    guide: {
                      phase: currentStep.id === "todo-resize" ? "resize" : "drag",
                      title:
                        currentStep.id === "todo-resize"
                          ? copy("拖动右下角缩放", "Resize from the bottom-right")
                          : copy("拖回 Todo 列表", "Drag back to Todos"),
                      instruction:
                        currentStep.id === "todo-resize"
                          ? copy("拖动高亮的右下角，放大或缩小待办", "Drag the highlighted corner to resize the todo")
                          : copy("按住卡片空白处，拖入主窗口", "Drag a blank area of the card into the main window"),
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
        const scrollRegion = target.closest<HTMLElement>(".paper-scroll");
        if (scrollRegion) {
          const targetBounds = target.getBoundingClientRect();
          const scrollBounds = scrollRegion.getBoundingClientRect();
          const isOutsideVisibleRegion =
            targetBounds.top < scrollBounds.top || targetBounds.bottom > scrollBounds.bottom;
          if (isOutsideVisibleRegion) {
            const centeredTop =
              scrollRegion.scrollTop +
              targetBounds.top -
              scrollBounds.top -
              Math.max(0, (scrollBounds.height - targetBounds.height) / 2);
            scrollRegion.scrollTop = Math.max(0, centeredTop);
          }
        }
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
      "note-group-delete",
      "note-float",
      "note-pin",
      "note-unpin",
      "note-close-return",
      "note-float-again",
      "note-drag-return",
      "todo-submit",
      "todo-second-submit",
      "todo-date-submit",
      "todo-reorder",
      "todo-group-create",
      "todo-group-apply",
      "todo-complete",
      "todo-restore",
      "todo-float",
      "todo-drag-return",
      "settings-open",
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
      setStep((value) => (steps[value]?.id === "settings-open" ? value + 1 : value));
    }
  }, [currentStep, showSettings, steps]);

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
    for (const id of [runtime.todoId, runtime.secondaryTodoId, runtime.dateTodoId]) {
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

  const resetGuideViewport = () => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.querySelectorAll<HTMLElement>('[data-testid="panel-scroll-region"]').forEach((region) => {
      region.scrollTop = 0;
    });
  };

  const restoreInterfaceState = () => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }
    onSettingsChange(runtime.initialShowSettings);
    onTabChange(runtime.initialTab);
    onHeaderCollapsedChange(runtime.initialHeaderCollapsed);
    resetGuideViewport();
  };

  const handleClose = () => {
    setTargetRect(null);
    void clearFloatingCardGuides().catch(() => {});
    cleanupPracticeData();
    restoreInterfaceState();
    runtimeRef.current = null;
    onClose();
  };

  const handleFinish = () => {
    setTargetRect(null);
    void clearFloatingCardGuides().catch(() => {});
    cleanupPracticeData();
    restoreInterfaceState();
    setIsCompletionVisible(true);
  };

  const handleCompletionClose = () => {
    setIsCompletionVisible(false);
    runtimeRef.current = null;
    resetGuideViewport();
    onClose();
  };

  const moveToStep = (nextStep: number) => {
    const targetStep = Math.max(0, Math.min(steps.length - 1, nextStep));
    setTargetRect(null);
    setGuidePanelPosition(null);
    if (steps[targetStep]?.id === "settings-open") {
      onSettingsChange(false);
    }
    setStep(targetStep);
  };

  const viewportHeight = typeof window === "undefined" ? 800 : window.innerHeight;
  const viewportWidth = typeof window === "undefined" ? 1000 : window.innerWidth;
  const automaticPanelPlacement =
    targetRect && targetRect.top > viewportHeight * 0.52
      ? targetRect.left > viewportWidth * 0.5
        ? "top-left"
        : "top-right"
      : targetRect && targetRect.left > viewportWidth * 0.5
        ? "bottom-left"
        : "bottom-right";
  const panelPlacement = currentStep?.panelPlacement ?? automaticPanelPlacement;
  const panelStyle =
    panelPlacement === "top-left"
      ? { left: 14, top: 14 }
      : panelPlacement === "top-right"
        ? { right: 14, top: 14 }
        : panelPlacement === "bottom-left"
          ? { bottom: 14, left: 14 }
          : { bottom: 14, right: 14 };

  useLayoutEffect(() => {
    if (!targetRect || isFloatingCardWindowStep || currentStep.id === "settings-overview") {
      setGuidePanelPosition(null);
      return;
    }

    const panel = guidePanelRef.current;
    if (!panel) {
      return;
    }

    const panelRect = panel.getBoundingClientRect();
    setGuidePanelPosition(
      getGuidePanelPosition(targetRect, panelRect, { height: window.innerHeight, width: window.innerWidth }, panelPlacement),
    );
  }, [currentStep.id, isFloatingCardWindowStep, panelPlacement, targetRect]);

  if (!isOpen || !currentStep || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      {isOpen && !isCompletionVisible ? (
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
              data-guide-highlight-shape={currentStep.highlightShape ?? "rounded"}
              className={`pointer-events-none fixed z-[196] border-2 border-[#ff7a59] shadow-[0_0_0_5px_rgba(255,122,89,0.18),0_12px_32px_rgba(61,49,34,0.14)] ${
                currentStep.highlightShape === "pill" ? "rounded-full" : "rounded-[16px]"
              }`}
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
            ref={guidePanelRef}
            data-guide-dialog
            data-guide-step={currentStep.id}
            role="dialog"
            aria-label={copy("Floatem 交互式指引", "Floatem interactive guide")}
            className={`paper-scroll fixed z-[200] max-h-[calc(100vh-28px)] w-[min(268px,calc(100vw-28px))] overflow-y-auto rounded-[20px] border border-[rgba(213,198,180,0.88)] bg-[rgba(255,252,248,0.97)] p-3.5 shadow-[0_22px_46px_rgba(61,49,34,0.22)] backdrop-blur-xl ${
              isFloatingCardWindowStep || currentStep.id === "settings-overview" ? "hidden" : ""
            }`}
            style={guidePanelPosition ?? panelStyle}
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
                {currentStep.details?.length ? (
                  <ul className="mt-1.5 space-y-1 border-t border-[rgba(143,85,61,0.14)] pt-1.5 text-[9.5px] font-semibold leading-4">
                    {currentStep.details.map((detail) => (
                      <li key={detail} className="flex gap-1.5">
                        <span aria-hidden="true" className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-[#ff7a59]" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
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
                aria-label={copy("上一步", "Previous step")}
                disabled={step === 0}
                className="paper-button inline-flex items-center justify-center gap-1 rounded-[11px] px-2.5 py-2 text-[10.5px] font-bold disabled:cursor-not-allowed disabled:opacity-40"
                whileTap={step === 0 ? undefined : { scale: 0.97 }}
                onClick={() => moveToStep(step - 1)}
              >
                <ChevronLeftIcon size={12} />
                {copy("上一步", "Previous step")}
              </motion.button>
              <motion.button
                type="button"
                aria-label={copy("下一步", "Next step")}
                disabled={step === steps.length - 1}
                className="paper-button paper-button-primary inline-flex items-center justify-center gap-1 rounded-[11px] px-2.5 py-2 text-[10.5px] font-bold disabled:cursor-not-allowed disabled:opacity-40"
                whileTap={step === steps.length - 1 ? undefined : { scale: 0.97 }}
                onClick={() => moveToStep(step + 1)}
              >
                {copy("下一步", "Next step")}
                <ChevronRightIcon size={12} />
              </motion.button>
            </div>
            {currentStep.id === "settings-overview" ? (
              <motion.button
                type="button"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-[12px] bg-[linear-gradient(145deg,#ff7a59,#f4b942)] px-3 py-2.5 text-[11px] font-bold text-white"
                whileTap={{ scale: 0.98 }}
                onClick={handleFinish}
              >
                <CircleCheckBigIcon size={14} />
                {copy("确认并完成", "Confirm and finish")}
              </motion.button>
            ) : null}
          </motion.aside>
        </>
      ) : null}
      {!isCompletionVisible && currentStep.id === "settings-overview" ? (
        <motion.div
          key="settings-overview-dialog"
          className="fixed inset-0 z-[220] flex items-center justify-center bg-[rgba(30,25,21,0.22)] px-5 backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            data-guide-dialog
            aria-label={copy("设置菜单与可调整项", "Settings menus and options")}
            className="paper-panel paper-scroll max-h-[calc(100vh-32px)] w-full max-w-[680px] overflow-y-auto rounded-[26px] border border-[rgba(213,198,180,0.9)] p-6 text-left shadow-[0_28px_64px_rgba(61,49,34,0.26)]"
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
          >
            <div className="flex items-start gap-4">
              <motion.span
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[17px] bg-[linear-gradient(145deg,#ff7a59,#f4b942)] text-white shadow-[0_12px_24px_rgba(255,122,89,0.25)]"
                animate={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 1.5 }}
              >
                <SparklesIcon size={21} />
              </motion.span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-[var(--muted)]">
                  {copy("功能 7/7 · 最后一步", "Feature 7 of 7 · Final step")}
                </p>
                <h2 className="mt-1 font-display text-[25px] font-semibold tracking-[-0.04em] text-[var(--brown-strong)]">
                  {copy("设置菜单与可调整项", "Settings menus and options")}
                </h2>
              </div>
            </div>
            <p className="mt-4 border-b border-[rgba(213,198,180,0.72)] pb-4 text-[12px] leading-6 text-[var(--muted)]">
              {copy(
                "你已经进入设置界面。以下文字概括了全部设置子菜单及其支持的调整项，无需逐项打开浏览。",
                "You are now in Settings. The text below summarizes every submenu and its adjustable options, so you do not need to open them one by one.",
              )}
            </p>
            <div className="mt-4 grid gap-x-6 gap-y-0 sm:grid-cols-2">
              {settingsOverviewItems.map((item, index) => (
                <section
                  key={item.title}
                  className="border-b border-[rgba(213,198,180,0.56)] py-3.5"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] font-bold tabular-nums text-[#ff7a59]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-[13px] font-bold text-[var(--brown-strong)]">
                      {item.title}
                    </h3>
                  </div>
                  <p className="mt-1.5 pl-6 text-[11px] leading-5 text-[var(--muted)]">
                    {item.body}
                  </p>
                </section>
              ))}
            </div>
            <p className="mt-4 rounded-[14px] bg-[rgba(47,107,255,0.06)] px-3 py-2.5 text-[10.5px] font-semibold leading-5 text-[#2853C7]">
              {copy(
                "设置首页还提供“恢复默认设置”和“退出 Floatem”操作。",
                "The Settings home also provides Restore defaults and Quit Floatem actions.",
              )}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <motion.button
                type="button"
                className="paper-button inline-flex items-center justify-center gap-1 rounded-[14px] px-4 py-3 text-[12px] font-bold"
                whileTap={{ scale: 0.98 }}
                onClick={() => moveToStep(step - 1)}
              >
                <ChevronLeftIcon size={14} />
                {copy("上一步", "Previous step")}
              </motion.button>
              <motion.button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(145deg,#ff7a59,#f4b942)] px-4 py-3 text-[12px] font-bold text-white"
                whileTap={{ scale: 0.98 }}
                onClick={handleFinish}
              >
                <CircleCheckBigIcon size={15} />
                {copy("完成指引", "Finish guide")}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
      {isCompletionVisible ? (
        <motion.div
          key="guide-complete-dialog"
          className="fixed inset-0 z-[230] flex items-center justify-center bg-[rgba(30,25,21,0.2)] px-5 backdrop-blur-[4px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={copy("恭喜完成所有交互指引", "Congratulations on completing the interactive guide")}
            className="paper-panel w-full max-w-[420px] rounded-[26px] border border-[rgba(213,198,180,0.9)] px-7 py-8 text-center shadow-[0_28px_64px_rgba(61,49,34,0.24)]"
            initial={{ opacity: 0, y: 18, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
          >
            <motion.span
              className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(145deg,#ff7a59,#f4b942)] text-white shadow-[0_14px_30px_rgba(255,122,89,0.28)]"
              animate={{ rotate: [0, -6, 6, 0], scale: [1, 1.08, 1] }}
              transition={{ duration: 1.4 }}
            >
              <SparklesIcon size={28} />
            </motion.span>
            <h2 className="mt-5 font-display text-[25px] font-semibold tracking-[-0.04em] text-[var(--brown-strong)]">
              {copy("恭喜完成所有交互指引", "You completed the interactive guide")}
            </h2>
            <p className="mx-auto mt-3 max-w-[330px] text-[12px] leading-6 text-[var(--muted)]">
              {copy(
                "你已经体验了 Floatem 的便签、待办、分组、悬浮卡片与设置。练习内容已清理，主界面也已恢复。",
                "You explored Floatem notes, todos, groups, floating cards, and settings. Practice content has been cleared and your workspace restored.",
              )}
            </p>
            <motion.button
              type="button"
              className="mt-6 inline-flex min-w-[150px] items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(145deg,#ff7a59,#f4b942)] px-5 py-3 text-[12px] font-bold text-white"
              whileTap={{ scale: 0.98 }}
              onClick={handleCompletionClose}
            >
              <CircleCheckBigIcon size={15} />
              {copy("返回 Floatem", "Return to Floatem")}
            </motion.button>
          </motion.div>
        </motion.div>
      ) : null}
    </>,
    document.body,
  );
}
