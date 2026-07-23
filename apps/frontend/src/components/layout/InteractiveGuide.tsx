import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../lib/i18n";
import { subscribeToFloatingCardsState } from "../../lib/nativeBridge";
import type { TabId, ThemeId } from "../../lib/models";
import { useNotesStore } from "../../store/notesStore";
import { useSettingsStore } from "../../store/settingsStore";
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

type GuideSnapshot = {
  activeTab: TabId;
  headerCollapsed: boolean;
  noteGroupIds: string[];
  noteIds: string[];
  selectedDateKey: string;
  showSettings: boolean;
  theme: ThemeId;
  todoGroupIds: string[];
  todoIds: string[];
};

type GuideRuntime = {
  noteGroupId: string | null;
  noteId: string | null;
  snapshot: GuideSnapshot;
  todoGroupId: string | null;
  todoId: string | null;
};

type GuideStep = {
  allowOutsideTarget?: boolean;
  body: string;
  instruction: string;
  target: () => HTMLElement | null;
  title: string;
};

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
  showSettings,
}: InteractiveGuideProps) {
  const { language } = useI18n();
  const isZh = language === "zh-CN";
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [pinnedNoteIds, setPinnedNoteIds] = useState<string[]>([]);
  const runtimeRef = useRef<GuideRuntime | null>(null);
  const isFinishingRef = useRef(false);
  const cards = useNotesStore((state) => state.cards);
  const floatingCardIds = useNotesStore((state) => state.floatingCardIds);
  const noteGroups = useNotesStore((state) => state.groups);
  const todos = useTodosStore((state) => state.todos);
  const todoGroups = useTodosStore((state) => state.groups);
  const theme = useSettingsStore((state) => state.theme);

  const noteId = runtimeRef.current?.noteId ?? null;
  const todoId = runtimeRef.current?.todoId ?? null;

  const steps = useMemo<GuideStep[]>(
    () => [
      {
        title: isZh ? "折叠顶部导航" : "Collapse the navigation",
        body: isZh ? "点击顶部折叠按钮，腾出更多工作空间。" : "Use the top fold button to make more room for your work.",
        instruction: isZh ? "点击高亮的折叠按钮" : "Click the highlighted fold button",
        target: () => queryTarget('[data-guide="navigation-fold"]'),
      },
      {
        title: isZh ? "新增便签" : "Add a note",
        body: isZh ? "通过底部加号创建一张真实便签。" : "Create a real note with the plus button in the footer.",
        instruction: isZh ? "点击新增便签" : "Click Add note",
        target: () => queryTarget('[data-guide="note-add"]'),
      },
      {
        title: isZh ? "打开便签分组" : "Open note groups",
        body: isZh ? "分组会为相关便签增加统一的视觉标记。" : "Groups give related notes a shared visual marker.",
        instruction: isZh ? "点击便签上的分组标签" : "Click the group label on the note",
        target: () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"] [data-action="note-group"]`) : null,
      },
      {
        title: isZh ? "新增便签分组" : "Add a note group",
        body: isZh ? "由你创建这次演练使用的分组。" : "Create the group you want to use for this practice.",
        instruction: isZh ? "点击新增分组" : "Click Add group",
        target: () => queryTarget('[data-guide="note-group-add"]'),
      },
      {
        allowOutsideTarget: true,
        title: isZh ? "设置名称与颜色" : "Choose a name and color",
        body: isZh ? "先输入任意分组名称，再打开颜色选择器。" : "Enter any group name, then open the color picker.",
        instruction: isZh ? "填写名称后，点击高亮的调色板按钮" : "Enter a name, then click the highlighted palette button",
        target: () => queryTarget('[data-guide="note-group-color"]'),
      },
      {
        title: isZh ? "选择分组颜色" : "Choose the group color",
        body: isZh ? "从调色板中选择一种你喜欢的颜色。" : "Choose any color you like from the palette.",
        instruction: isZh ? "点击一种高亮区域内的颜色" : "Click a color in the highlighted palette",
        target: () => queryTarget('[data-guide="note-group-color-options"]'),
      },
      {
        title: isZh ? "创建便签分组" : "Create the note group",
        body: isZh ? "名称和颜色设置完成后，创建这个分组。" : "Create the group with the name and color you selected.",
        instruction: isZh ? "点击“创建分组”" : "Click Create group",
        target: () => queryTarget('[data-guide="note-group-create"]'),
      },
      {
        title: isZh ? "应用新分组" : "Apply the new group",
        body: isZh ? "把刚创建的分组应用到这张便签。" : "Apply the group you just created to this note.",
        instruction: isZh ? "选择高亮的新分组" : "Choose the highlighted new group",
        target: () => runtimeRef.current?.noteGroupId ? queryGroupTarget(runtimeRef.current.noteGroupId) : null,
      },
      {
        title: isZh ? "折叠便签" : "Fold the note",
        body: isZh ? "折叠后只保留便签标题和顶部操作。" : "Folding keeps only the note title and its top actions visible.",
        instruction: isZh ? "点击便签折叠按钮" : "Click the note fold button",
        target: () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"] [data-action="note-collapse"]`) : null,
      },
      {
        title: isZh ? "创建悬浮卡片" : "Create a floating card",
        body: isZh ? "按住这张便签并拖出 StickIt 主窗口，然后松开。" : "Drag this note outside the StickIt window, then release it.",
        instruction: isZh ? "将高亮便签拖出窗口" : "Drag the highlighted note outside",
        target: () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"]`) : null,
      },
      {
        title: isZh ? "固定到桌面" : "Pin it to the desktop",
        body: isZh ? "在刚打开的真实悬浮卡片上点击图钉。" : "Click the pin in the real floating card you just opened.",
        instruction: isZh ? "在悬浮卡片中点击“固定到桌面”" : "Click “Keep on desktop” in the floating card",
        target: () => null,
      },
      {
        title: isZh ? "取消桌面固定" : "Remove the desktop pin",
        body: isZh ? "再次点击图钉，避免演练卡片保留在桌面上。" : "Click the pin again so the practice card does not remain on your desktop.",
        instruction: isZh ? "在悬浮卡片中取消桌面固定" : "Remove the desktop pin in the floating card",
        target: () => null,
      },
      {
        title: isZh ? "收回悬浮卡片" : "Return the floating card",
        body: isZh ? "点击悬浮卡片的关闭按钮，将它收回主列表。" : "Close the floating card to return it to the main list.",
        instruction: isZh ? "关闭悬浮卡片" : "Close the floating card",
        target: () => null,
      },
      {
        title: isZh ? "删除演练便签" : "Delete the practice note",
        body: isZh ? "现在删除这张便签，完成 Notes 的收尾。" : "Delete the note now to finish the Notes practice.",
        instruction: isZh ? "点击便签删除按钮" : "Click the note delete button",
        target: () => noteId ? queryTarget(`[data-note-card-id="${cssValue(noteId)}"] [data-action="delete"]`) : null,
      },
      {
        title: isZh ? "切换到 Todos" : "Switch to Todos",
        body: isZh ? "通过顶部标签进入待办页面。" : "Open daily planning from the top tabs.",
        instruction: isZh ? "点击 Todos 标签" : "Click the Todos tab",
        target: () => queryTarget('[data-guide="tab-todos"]'),
      },
      {
        title: isZh ? "打开日期选择" : "Open the calendar",
        body: isZh ? "待办会归属于当前选择的日期。" : "Todos belong to the currently selected date.",
        instruction: isZh ? "点击日期卡片" : "Click the date card",
        target: () => queryTarget('[data-guide="todo-calendar"]'),
      },
      {
        title: isZh ? "切换到明天" : "Switch to tomorrow",
        body: isZh ? "使用快捷日期为不同日期安排任务。" : "Use a quick date to plan work for another day.",
        instruction: isZh ? "点击“明天”" : "Click “Tomorrow”",
        target: () => queryTarget('[data-guide-date="tomorrow"]'),
      },
      {
        title: isZh ? "添加待办" : "Add a todo",
        body: isZh ? "在真实快速输入框中输入内容，然后按 Enter。" : "Type in the real quick-entry field, then press Enter.",
        instruction: isZh ? "输入“StickIt 指引待办”并提交" : "Enter “StickIt guide todo” and submit",
        target: () => queryTarget('[data-guide="todo-quick-add"]'),
      },
      {
        title: isZh ? "打开提醒" : "Open the reminder",
        body: isZh ? "为刚创建的待办安排一个未来提醒。" : "Schedule a future reminder for the todo you just created.",
        instruction: isZh ? "点击待办提醒按钮" : "Click the todo reminder button",
        target: () => todoId ? queryTarget(`[data-todo-item-id="${cssValue(todoId)}"] [data-action="todo-reminder"]`) : null,
      },
      {
        title: isZh ? "选择提醒时间" : "Choose a reminder time",
        body: isZh ? "快捷选项会为明天自动填入一个有效时间。" : "A quick option fills a valid time for tomorrow.",
        instruction: isZh ? "点击“上午”" : "Click “Morning”",
        target: () => queryTarget('[data-guide-reminder="morning"]'),
      },
      {
        title: isZh ? "保存提醒" : "Save the reminder",
        body: isZh ? "保存后，桌面宿主会调度系统提醒。" : "Saving lets the desktop host schedule the system reminder.",
        instruction: isZh ? "点击保存" : "Click Save",
        target: () => queryTarget('[data-guide="reminder-save"]'),
      },
      {
        title: isZh ? "打开 Todo 分组" : "Open todo groups",
        body: isZh ? "Todo 也可以通过分组增加上下文。" : "Todo groups add visual context too.",
        instruction: isZh ? "点击待办分组按钮" : "Click the todo group button",
        target: () => todoId ? queryTarget(`[data-todo-item-id="${cssValue(todoId)}"] [data-action="todo-group"]`) : null,
      },
      {
        title: isZh ? "新增 Todo 分组" : "Add a todo group",
        body: isZh ? "Todo 分组独立管理，请再创建一个分组。" : "Todo groups are managed separately, so create one here too.",
        instruction: isZh ? "点击新增分组" : "Click Add group",
        target: () => queryTarget('[data-guide="todo-group-add"]'),
      },
      {
        allowOutsideTarget: true,
        title: isZh ? "设置名称与颜色" : "Choose a name and color",
        body: isZh ? "先输入 Todo 分组名称，再打开颜色选择器。" : "Enter a todo group name, then open the color picker.",
        instruction: isZh ? "填写名称后，点击高亮的调色板按钮" : "Enter a name, then click the highlighted palette button",
        target: () => queryTarget('[data-guide="todo-group-color"]'),
      },
      {
        title: isZh ? "选择分组颜色" : "Choose the group color",
        body: isZh ? "为 Todo 分组选择一种颜色。" : "Choose a color for the todo group.",
        instruction: isZh ? "点击一种高亮区域内的颜色" : "Click a color in the highlighted palette",
        target: () => queryTarget('[data-guide="todo-group-color-options"]'),
      },
      {
        title: isZh ? "创建 Todo 分组" : "Create the todo group",
        body: isZh ? "使用刚才填写的名称与颜色创建分组。" : "Create the group with the name and color you selected.",
        instruction: isZh ? "点击“创建分组”" : "Click Create group",
        target: () => queryTarget('[data-guide="todo-group-create"]'),
      },
      {
        title: isZh ? "应用新分组" : "Apply the new group",
        body: isZh ? "把刚创建的分组应用到演练待办。" : "Apply the group you just created to the practice todo.",
        instruction: isZh ? "选择高亮的新分组" : "Choose the highlighted new group",
        target: () => runtimeRef.current?.todoGroupId ? queryGroupTarget(runtimeRef.current.todoGroupId) : null,
      },
      {
        title: isZh ? "打开设置" : "Open Settings",
        body: isZh ? "设置页面集中管理主题、启动、语言与通知。" : "Settings brings themes, startup, language, and notifications together.",
        instruction: isZh ? "点击顶部设置按钮" : "Click the Settings button",
        target: () => queryTarget('[data-guide="settings-open"]'),
      },
      {
        title: isZh ? "进入主题设置" : "Open theme settings",
        body: isZh ? "主题会作用于整个真实应用界面。" : "Themes apply to the entire real app interface.",
        instruction: isZh ? "点击主题分类" : "Click the Theme category",
        target: () => queryTarget('[data-guide-settings-category="theme"]'),
      },
      {
        title: isZh ? "切换主题" : "Switch the theme",
        body: isZh ? "选择“梅”查看主题变化；稍后会恢复原主题。" : "Choose Plum to see the change; your original theme will be restored.",
        instruction: isZh ? "选择“梅”" : "Choose Plum",
        target: () => queryTarget('[data-guide-theme="plum"]'),
      },
      {
        title: isZh ? "删除演练待办" : "Delete the practice todo",
        body: isZh ? "最后删除待办，应用数据随后会恢复到演练前。" : "Delete the todo; the app data will then match its pre-guide state.",
        instruction: isZh ? "点击待办删除按钮" : "Click the todo delete button",
        target: () => todoId ? queryTarget(`[data-todo-item-id="${cssValue(todoId)}"] [data-action="todo-delete"]`) : null,
      },
      {
        title: isZh ? "指引完成" : "Guide complete",
        body: isZh ? "演练卡片、你创建的演练分组、日期与主题均已归位。" : "Practice cards, the groups you created, date, and theme are back where they started.",
        instruction: isZh ? "返回 StickIt" : "Return to StickIt",
        target: () => null,
      },
    ],
    [isZh, noteId, todoId],
  );

  const finishCleanup = useCallback(() => {
    const runtime = runtimeRef.current;
    if (!runtime || isFinishingRef.current) {
      return;
    }

    isFinishingRef.current = true;
    const notesState = useNotesStore.getState();
    const todosState = useTodosStore.getState();
    const settingsState = useSettingsStore.getState();

    if (runtime.noteId) {
      notesState.removeCard(runtime.noteId);
    }
    if (runtime.todoId) {
      todosState.removeTodo(runtime.todoId);
    }
    if (runtime.noteGroupId) {
      notesState.deleteGroup(runtime.noteGroupId);
    }
    if (runtime.todoGroupId) {
      todosState.deleteGroup(runtime.todoGroupId);
    }
    todosState.selectDate(runtime.snapshot.selectedDateKey);
    settingsState.setTheme(runtime.snapshot.theme);
    onHeaderCollapsedChange(runtime.snapshot.headerCollapsed);
    onSettingsChange(runtime.snapshot.showSettings);
    onTabChange(runtime.snapshot.activeTab);
    setStep(steps.length - 1);
  }, [onHeaderCollapsedChange, onSettingsChange, onTabChange, steps.length]);

  useEffect(() => {
    if (!isOpen || runtimeRef.current) {
      return;
    }

    const notesState = useNotesStore.getState();
    const todosState = useTodosStore.getState();
    const settingsState = useSettingsStore.getState();
    const runtime: GuideRuntime = {
      noteGroupId: null,
      noteId: null,
      snapshot: {
        activeTab: settingsState.activeTab,
        headerCollapsed: isHeaderCollapsed,
        noteGroupIds: notesState.groups.map((group) => group.id),
        noteIds: notesState.cards.map((card) => card.id),
        selectedDateKey: todosState.selectedDateKey,
        showSettings,
        theme: settingsState.theme,
        todoGroupIds: todosState.groups.map((group) => group.id),
        todoIds: todosState.todos.map((todo) => todo.id),
      },
      todoGroupId: null,
      todoId: null,
    };

    runtimeRef.current = runtime;
    isFinishingRef.current = false;
    setStep(0);
    setPinnedNoteIds([]);
    onSettingsChange(false);
    onTabChange("notes");
    onHeaderCollapsedChange(false);
  }, [isHeaderCollapsed, isOpen, isZh, onHeaderCollapsedChange, onSettingsChange, onTabChange, showSettings]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    return subscribeToFloatingCardsState((state) => {
      setPinnedNoteIds(state.pinnedNoteIds ?? []);
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleColorSelected = (event: Event) => {
      const guideId = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (step === 5 && guideId === "note-group") {
        setStep(6);
      } else if (step === 24 && guideId === "todo-group") {
        setStep(25);
      }
    };

    window.addEventListener("stickit:guide-color-selected", handleColorSelected);
    return () => window.removeEventListener("stickit:guide-color-selected", handleColorSelected);
  }, [isOpen, step]);

  useEffect(() => {
    if (!isOpen || !runtimeRef.current) {
      return;
    }

    const runtime = runtimeRef.current;
    if (step === 1 && !runtime.noteId) {
      const created = cards.find((card) => !runtime.snapshot.noteIds.includes(card.id));
      if (created) {
        runtime.noteId = created.id;
        useNotesStore.getState().updateCardTitle(created.id, isZh ? "StickIt 指引便签" : "StickIt guide note");
        setStep(2);
      }
    }

    if (step === 6 && !runtime.noteGroupId) {
      const createdGroup = noteGroups.find((group) => !runtime.snapshot.noteGroupIds.includes(group.id));
      if (createdGroup) {
        runtime.noteGroupId = createdGroup.id;
        setStep(7);
      }
    }

    if (step === 7 && runtime.noteId && runtime.noteGroupId) {
      const guideNote = cards.find((card) => card.id === runtime.noteId);
      if (guideNote?.groupId === runtime.noteGroupId) {
        setStep(8);
      }
    }

    if (step === 17 && !runtime.todoId) {
      const created = todos.find((todo) => !runtime.snapshot.todoIds.includes(todo.id));
      if (created) {
        runtime.todoId = created.id;
        setStep(18);
      }
    }

    if (step === 25 && !runtime.todoGroupId) {
      const createdGroup = todoGroups.find((group) => !runtime.snapshot.todoGroupIds.includes(group.id));
      if (createdGroup) {
        runtime.todoGroupId = createdGroup.id;
        setStep(26);
      }
    }

    if (step === 26 && runtime.todoId && runtime.todoGroupId) {
      const guideTodo = todos.find((todo) => todo.id === runtime.todoId);
      if (guideTodo?.groupId === runtime.todoGroupId) {
        setStep(27);
      }
    }
  }, [cards, isOpen, isZh, noteGroups, step, todoGroups, todos]);

  useEffect(() => {
    if (!isOpen || !noteId) {
      return;
    }

    if (step === 9 && floatingCardIds.includes(noteId)) {
      setStep(10);
    } else if (step === 10 && pinnedNoteIds.includes(noteId)) {
      setStep(11);
    } else if (step === 11 && !pinnedNoteIds.includes(noteId)) {
      setStep(12);
    } else if (step === 12 && !floatingCardIds.includes(noteId)) {
      setStep(13);
    }
  }, [floatingCardIds, isOpen, noteId, pinnedNoteIds, step]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (step === 1 && isHeaderCollapsed) {
      const timer = window.setTimeout(() => onHeaderCollapsedChange(false), 360);
      return () => window.clearTimeout(timer);
    }
  }, [isHeaderCollapsed, isOpen, onHeaderCollapsedChange, step]);

  useEffect(() => {
    if (!isOpen || step !== 30 || !showSettings) {
      return;
    }

    const runtime = runtimeRef.current;
    if (!runtime || theme !== "plum") {
      return;
    }

    const timer = window.setTimeout(() => {
      useSettingsStore.getState().setTheme(runtime.snapshot.theme);
      onSettingsChange(false);
      onTabChange("todos");
      setStep(30);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [isOpen, onSettingsChange, onTabChange, showSettings, step, theme]);

  const currentStep = steps[step];

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
    if (!isOpen || !currentStep || step === steps.length - 1) {
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
      if (!didClickTarget) {
        return;
      }

      if ([1, 6, 7, 17, 25, 26].includes(step)) {
        return;
      }

      window.setTimeout(() => {
        if (step === 8) {
          setStep(9);
          window.setTimeout(() => {
            if (runtimeRef.current?.noteId) {
              useNotesStore.getState().toggleCollapsed(runtimeRef.current.noteId);
            }
          }, 280);
        } else if (step === 30) {
          window.setTimeout(finishCleanup, 260);
        } else {
          setStep(step + 1);
        }
      }, 80);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [currentStep, finishCleanup, isOpen, step, steps.length]);

  const handleExit = () => {
    runtimeRef.current = null;
    onClose();
  };

  const handleFinish = () => {
    runtimeRef.current = null;
    onClose();
  };

  const viewportHeight = typeof window === "undefined" ? 800 : window.innerHeight;
  const panelStyle = targetRect && targetRect.top > viewportHeight * 0.52
    ? { left: 14, top: 14 }
    : { bottom: 14, right: 14 };

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            className="pointer-events-none fixed inset-0 z-[105] bg-[rgba(30,25,21,0.08)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          {targetRect ? (
            <motion.div
              className="pointer-events-none fixed z-[106] rounded-[16px] border-2 border-[#ff7a59] shadow-[0_0_0_5px_rgba(255,122,89,0.18),0_12px_32px_rgba(61,49,34,0.14)]"
              animate={{
                height: targetRect.height + 10,
                left: targetRect.left - 5,
                top: targetRect.top - 5,
                width: targetRect.width + 10,
              }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            />
          ) : null}
          <motion.aside
            data-guide-dialog
            role="dialog"
            aria-label={isZh ? "StickIt 交互式指引" : "StickIt interactive guide"}
            className="fixed z-[110] w-[min(268px,calc(100vw-28px))] rounded-[20px] border border-[rgba(213,198,180,0.88)] bg-[rgba(255,252,248,0.97)] p-3.5 shadow-[0_22px_46px_rgba(61,49,34,0.22)] backdrop-blur-xl"
            style={panelStyle}
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
          >
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] bg-[linear-gradient(145deg,#ff7a59,#f4b942)] text-white">
                <SparklesIcon size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
                  {isZh ? `第 ${step + 1} / ${steps.length} 步` : `Step ${step + 1} of ${steps.length}`}
                </p>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-[rgba(156,126,94,0.14)]">
                  <motion.div className="h-full rounded-full bg-[#ff7a59]" animate={{ width: `${((step + 1) / steps.length) * 100}%` }} />
                </div>
              </div>
              <button
                type="button"
                aria-label={isZh ? "退出指引" : "Exit guide"}
                data-tooltip={isZh ? "退出指引" : "Exit guide"}
                className="paper-icon-button inline-flex h-8 w-8 min-h-0 min-w-0 rounded-[11px]"
                onClick={handleExit}
              >
                <XIcon size={13} />
              </button>
            </div>
            <p className="mt-3 font-display text-[17px] font-semibold tracking-[-0.025em] text-[var(--brown-strong)]">{currentStep.title}</p>
            <p className="mt-1.5 text-[11.5px] leading-5 text-[var(--muted)]">{currentStep.body}</p>
            <p className="mt-3 rounded-[12px] bg-[rgba(255,122,89,0.09)] px-2.5 py-2 text-[10.5px] font-semibold leading-5 text-[#8f553d]">{currentStep.instruction}</p>
            {step === steps.length - 1 ? (
              <motion.button
                type="button"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-[12px] bg-[linear-gradient(145deg,#ff7a59,#f4b942)] px-3 py-2.5 text-[11px] font-bold text-white"
                whileTap={{ scale: 0.98 }}
                onClick={handleFinish}
              >
                <CircleCheckBigIcon size={14} />
                {isZh ? "完成" : "Done"}
              </motion.button>
            ) : null}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
