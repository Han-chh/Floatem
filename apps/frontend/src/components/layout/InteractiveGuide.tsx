import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { useI18n } from "../../lib/i18n";
import {
  CalendarDaysIcon,
  ChevronUpIcon,
  CircleCheckBigIcon,
  Clock3Icon,
  GroupPlusIcon,
  PlusIcon,
  PushPinIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from "../icons/AppIcons";

type InteractiveGuideProps = {
  isOpen: boolean;
  onClose: () => void;
};

type GuideCopy = {
  action: string;
  body: string;
  title: string;
};

const EN_STEPS: GuideCopy[] = [
  { title: "Collapse the navigation", body: "Click the fold button in the app’s top navigation bar to collapse the navigation and make more room for your work.", action: "Click the highlighted fold button" },
  { title: "Add a note card", body: "The plus button creates a new card without interrupting your flow.", action: "Click the highlighted plus button" },
  { title: "Organize it into a group", body: "Groups give related notes a shared color and make them easier to filter.", action: "Assign the note to Work" },
  { title: "Open a floating card", body: "Drag a note outside the main panel in the real app. Here, click the same affordance to practice.", action: "Move the card out of the panel" },
  { title: "Keep it on the desktop", body: "Pin a floating card to the desktop so it returns after StickIt starts in the background.", action: "Click the highlighted pin" },
  { title: "Delete the practice note", body: "Deleting removes the note. Closing a floating card only returns it to the main list.", action: "Click the highlighted delete button" },
  { title: "Switch to Todos", body: "Notes and Todos share the top navigation, so daily planning stays one click away.", action: "Open Todos" },
  { title: "Add a todo", body: "Use quick entry for a task you want to plan and remember.", action: "Add the practice todo" },
  { title: "Plan it for another date", body: "Todos belong to a selected date. You can move between today, tomorrow, or any calendar date.", action: "Move the todo to tomorrow" },
  { title: "Set a reminder", body: "Choose a future time and StickIt will schedule a desktop reminder.", action: "Set a 09:00 reminder" },
  { title: "Group the todo", body: "Todo groups add visual context and can be used as filters.", action: "Assign the todo to Work" },
  { title: "Open Settings", body: "Settings controls startup, language, shortcuts, themes, motion, and notifications.", action: "Click the highlighted settings button" },
  { title: "Switch the theme", body: "Choose a theme for the whole workspace. Notes and Todos remain readable in every palette.", action: "Choose Plum" },
  { title: "Guide complete", body: "You practiced the core StickIt workflow. This sandbox will now be discarded, leaving your app exactly as it was.", action: "Finish and return to StickIt" },
];

const ZH_STEPS: GuideCopy[] = [
  { title: "折叠顶部导航栏", body: "点击应用顶部导航栏中的折叠按钮，可以收起导航栏，腾出更多工作空间。", action: "点击高亮的折叠按钮" },
  { title: "新增便签卡片", body: "底部的加号可以快速创建一张新卡片，不会打断当前思路。", action: "点击高亮的加号" },
  { title: "把卡片加入分组", body: "分组会为相关便签提供统一颜色，也方便之后按主题筛选。", action: "将便签加入“工作”分组" },
  { title: "打开悬浮卡片", body: "在真实应用中，将便签拖出主面板即可悬浮；这里点击相同入口完成演练。", action: "把卡片移出主面板" },
  { title: "固定到桌面", body: "将悬浮卡片固定到桌面后，StickIt 在后台启动时会恢复这张卡片。", action: "点击高亮的图钉" },
  { title: "删除演练便签", body: "删除会移除便签；关闭悬浮卡片只会把它收回主列表，两者并不相同。", action: "点击高亮的删除按钮" },
  { title: "切换到 Todos", body: "Notes 与 Todos 共用顶部导航，日常计划只需一次点击即可进入。", action: "打开 Todos" },
  { title: "添加待办", body: "通过快速输入，记录一件需要安排和提醒的任务。", action: "添加演练待办" },
  { title: "设置不同日期", body: "每条待办都属于一个日期，可以切换到今天、明天或日历中的任意一天。", action: "把待办移到明天" },
  { title: "设置提醒时间", body: "选择未来时间后，StickIt 会安排桌面提醒。", action: "设置 09:00 提醒" },
  { title: "为待办分组", body: "Todo 分组会增加视觉提示，也可以用于筛选。", action: "将待办加入“工作”分组" },
  { title: "打开设置页面", body: "设置页面集中管理启动方式、语言、快捷键、主题、动效和通知。", action: "点击高亮的设置按钮" },
  { title: "切换应用主题", body: "主题会作用于整个工作区，同时保持 Notes 与 Todos 的可读性。", action: "选择“梅”主题" },
  { title: "指引已完成", body: "你已经演练了 StickIt 的核心功能。关闭沙盒后，应用会完整回到指引前的状态。", action: "完成并返回 StickIt" },
];

function GuideAction({ ariaLabel, children, className = "", onClick }: { ariaLabel: string; children: ReactNode; className?: string; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      className={`relative z-10 ring-4 ring-[rgba(255,122,89,0.22)] shadow-[0_0_0_1px_rgba(255,122,89,0.9),0_14px_30px_rgba(61,49,34,0.16)] ${className}`}
      animate={{ opacity: [1, 0.82, 1] }}
      transition={{ duration: 1.35, repeat: Infinity, ease: "easeInOut" }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}

export function InteractiveGuide({ isOpen, onClose }: InteractiveGuideProps) {
  const { language } = useI18n();
  const copy = language === "zh-CN" ? ZH_STEPS : EN_STEPS;
  const isZh = language === "zh-CN";
  const [step, setStep] = useState(0);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [noteCreated, setNoteCreated] = useState(false);
  const [noteGrouped, setNoteGrouped] = useState(false);
  const [noteFloating, setNoteFloating] = useState(false);
  const [notePinned, setNotePinned] = useState(false);
  const [noteDeleted, setNoteDeleted] = useState(false);
  const [tab, setTab] = useState<"notes" | "todos">("notes");
  const [todoCreated, setTodoCreated] = useState(false);
  const [todoTomorrow, setTodoTomorrow] = useState(false);
  const [todoReminder, setTodoReminder] = useState(false);
  const [todoGrouped, setTodoGrouped] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [plumTheme, setPlumTheme] = useState(false);

  const advance = () => setStep((current) => Math.min(copy.length - 1, current + 1));
  const resetAndClose = () => {
    setStep(0);
    setHeaderCollapsed(false);
    setNoteCreated(false);
    setNoteGrouped(false);
    setNoteFloating(false);
    setNotePinned(false);
    setNoteDeleted(false);
    setTab("notes");
    setTodoCreated(false);
    setTodoTomorrow(false);
    setTodoReminder(false);
    setTodoGrouped(false);
    setSettingsOpen(false);
    setPlumTheme(false);
    onClose();
  };
  const run = (effect: () => void) => {
    effect();
    advance();
  };
  const current = copy[step];

  useEffect(() => {
    if (step !== 1 || !headerCollapsed) {
      return;
    }

    const timer = window.setTimeout(() => setHeaderCollapsed(false), 420);
    return () => window.clearTimeout(timer);
  }, [headerCollapsed, step]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={isZh ? "StickIt 交互式指引" : "StickIt interactive guide"}
          data-no-window-drag="true"
          className={`fixed inset-0 z-[120] overflow-hidden ${plumTheme ? "bg-[radial-gradient(circle_at_top,#fff4f5_0,#f4d9df_42%,#c98b9c_100%)]" : "bg-[radial-gradient(circle_at_top,#fffaf3_0,#f5eee4_45%,#d8c4ad_100%)]"}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="relative flex h-full flex-col p-3 sm:p-5">
            <header className="relative z-20 mx-auto flex w-full max-w-[980px] items-center gap-3 rounded-[22px] border border-white/70 bg-white/88 px-3 py-3 shadow-[0_18px_44px_rgba(61,49,34,0.13)] backdrop-blur-xl">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-[linear-gradient(145deg,#ff7a59,#f4b942)] text-white shadow-[0_8px_18px_rgba(255,122,89,0.24)]"><SparklesIcon size={17} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-[12px] font-bold text-[var(--brown-strong)]">{isZh ? `交互式指引 · 第 ${step + 1} / ${copy.length} 步` : `Interactive guide · Step ${step + 1} of ${copy.length}`}</p>
                  <p className="shrink-0 text-[10px] font-semibold text-[var(--muted)]">{Math.round(((step + 1) / copy.length) * 100)}%</p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgba(156,126,94,0.13)]">
                  <motion.div className="h-full rounded-full bg-[linear-gradient(90deg,#ff7a59,#f4b942)]" animate={{ width: `${((step + 1) / copy.length) * 100}%` }} transition={{ duration: 0.28 }} />
                </div>
              </div>
              <button type="button" aria-label={isZh ? "退出指引" : "Exit guide"} className="paper-icon-button inline-flex h-9 w-9 min-h-0 min-w-0 shrink-0 rounded-[12px]" onClick={resetAndClose}><XIcon size={14} /></button>
            </header>

            <div className="relative mx-auto mt-3 grid min-h-0 w-full max-w-[980px] flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="relative min-h-0 overflow-hidden rounded-[30px] border border-white/70 bg-[rgba(255,252,247,0.88)] p-3 shadow-[0_30px_70px_rgba(61,49,34,0.18)] backdrop-blur-xl">
                <div className="flex h-full min-h-0 flex-col gap-2.5">
                  <motion.div layout className="rounded-[21px] border border-[rgba(213,198,180,0.72)] bg-white/76 px-3 py-2.5">
                    {!headerCollapsed ? (
                      <>
                        <div className="mb-2 flex items-center justify-between">
                          <p className="font-display text-[18px] font-semibold text-[var(--brown-strong)]">StickIt</p>
                          {step === 11 ? (
                            <GuideAction ariaLabel={current.action} className="paper-icon-button inline-flex h-8 w-8 min-h-0 min-w-0 items-center justify-center rounded-[11px]" onClick={() => run(() => setSettingsOpen(true))}><SlidersHorizontalIcon size={14} /></GuideAction>
                          ) : (
                            <span className="paper-icon-button inline-flex h-8 w-8 min-h-0 min-w-0 items-center justify-center rounded-[11px] opacity-55"><SlidersHorizontalIcon size={14} /></span>
                          )}
                        </div>
                        <div className="mb-2 grid grid-cols-2 gap-1 rounded-[14px] bg-[rgba(156,126,94,0.09)] p-1">
                          {step === 6 ? (
                            <>
                              <span className="rounded-[11px] px-3 py-2 text-center text-[11px] font-semibold text-[var(--muted)]">Notes</span>
                              <GuideAction ariaLabel={current.action} className="rounded-[11px] bg-white px-3 py-2 text-[11px] font-bold text-[var(--brown-strong)]" onClick={() => run(() => setTab("todos"))}>Todos</GuideAction>
                            </>
                          ) : (
                            <>
                              <span className={`rounded-[11px] px-3 py-2 text-center text-[11px] font-semibold ${tab === "notes" ? "bg-white text-[var(--brown-strong)] shadow-sm" : "text-[var(--muted)]"}`}>Notes</span>
                              <span className={`rounded-[11px] px-3 py-2 text-center text-[11px] font-semibold ${tab === "todos" ? "bg-white text-[var(--brown-strong)] shadow-sm" : "text-[var(--muted)]"}`}>Todos</span>
                            </>
                          )}
                        </div>
                      </>
                    ) : null}
                    <div className="flex items-center gap-2">
                      <span className="h-[2px] flex-1 rounded-full bg-[rgba(255,122,89,0.2)]" />
                      {step === 0 ? (
                        <GuideAction ariaLabel={current.action} className="inline-flex h-7 w-16 items-center justify-center rounded-[12px] bg-white text-[var(--brown-strong)]" onClick={() => run(() => setHeaderCollapsed(true))}><ChevronUpIcon size={14} /></GuideAction>
                      ) : (
                        <span className="inline-flex h-7 w-16 items-center justify-center rounded-[12px] border border-[rgba(156,126,94,0.14)] bg-white text-[var(--brown-strong)]"><ChevronUpIcon size={14} className={headerCollapsed ? "rotate-180" : ""} /></span>
                      )}
                      <span className="h-[2px] flex-1 rounded-full bg-[rgba(47,107,255,0.18)]" />
                    </div>
                  </motion.div>

                  <div className="relative min-h-0 flex-1 overflow-y-auto rounded-[23px] border border-[rgba(213,198,180,0.68)] bg-white/55 p-3">
                    {settingsOpen ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] bg-white text-[#7A5E39]"><SlidersHorizontalIcon size={17} /></span>
                          <div><p className="font-display text-[18px] font-semibold text-[var(--brown-strong)]">{isZh ? "设置" : "Settings"}</p><p className="text-[11px] text-[var(--muted)]">{isZh ? "主题、启动、语言与通知" : "Theme, startup, language, and notifications"}</p></div>
                        </div>
                        <div className="rounded-[18px] border border-[rgba(213,198,180,0.72)] bg-white/74 p-3">
                          <p className="mb-3 text-[11px] font-bold text-[var(--brown-strong)]">{isZh ? "选择主题" : "Choose theme"}</p>
                          <div className="grid grid-cols-3 gap-2">
                            <span className="rounded-[14px] border border-[rgba(213,198,180,0.72)] bg-[#fffaf2] p-3 text-center text-[10px] font-semibold">{isZh ? "经典色" : "Classic"}</span>
                            {step === 12 ? <GuideAction ariaLabel={current.action} className="rounded-[14px] bg-[#8f4057] p-3 text-center text-[10px] font-bold text-white" onClick={() => run(() => setPlumTheme(true))}>{isZh ? "梅" : "Plum"}</GuideAction> : <span className="rounded-[14px] bg-[#8f4057] p-3 text-center text-[10px] font-bold text-white">{isZh ? "梅" : "Plum"}</span>}
                            <span className="rounded-[14px] bg-[#dce9d6] p-3 text-center text-[10px] font-semibold">{isZh ? "竹" : "Forest"}</span>
                          </div>
                        </div>
                      </div>
                    ) : tab === "notes" ? (
                      <div className="flex h-full flex-col">
                        <div className="min-h-0 flex-1">
                          {noteCreated && !noteDeleted ? (
                            <motion.article layoutId="guide-note" className={`rounded-[20px] border bg-[#fff9df] p-3 shadow-[0_12px_24px_rgba(61,49,34,0.08)] ${noteGrouped ? "border-[#d79743]" : "border-[rgba(213,198,180,0.8)]"}`}>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold text-[#8b6739]">{noteGrouped ? (isZh ? "工作" : "Work") : (isZh ? "未分组" : "Ungrouped")}</span>
                                <div className="flex items-center gap-1.5">
                                  {step === 2 ? <GuideAction ariaLabel={current.action} className="rounded-[10px] bg-white/80 px-2 py-1.5 text-[#7A5E39]" onClick={() => run(() => setNoteGrouped(true))}><GroupPlusIcon size={13} /></GuideAction> : null}
                                  {step === 3 ? <GuideAction ariaLabel={current.action} className="rounded-[10px] bg-white/80 px-2 py-1.5 text-[12px] font-bold text-[#7A5E39]" onClick={() => run(() => setNoteFloating(true))}>↗</GuideAction> : null}
                                  {step === 5 ? <GuideAction ariaLabel={current.action} className="rounded-[10px] bg-white/80 p-1.5 text-[#b84c43]" onClick={() => run(() => setNoteDeleted(true))}><Trash2Icon size={13} /></GuideAction> : null}
                                </div>
                              </div>
                              <p className="mt-3 font-display text-[16px] font-semibold text-[var(--brown-strong)]">{isZh ? "准备发布 v1.0.2" : "Prepare v1.0.2 release"}</p>
                              <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">{isZh ? "检查更新内容与构建产物。" : "Review the changes and build artifact."}</p>
                            </motion.article>
                          ) : <div className="flex h-full items-center justify-center text-center text-[12px] leading-6 text-[var(--muted)]">{isZh ? "还没有演练便签" : "No practice notes yet"}</div>}
                        </div>
                        <div className="mt-3 flex items-center justify-end rounded-[18px] border border-[rgba(213,198,180,0.7)] bg-white/72 p-2.5">
                          {step === 1 ? <GuideAction ariaLabel={current.action} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(145deg,#ff7a59,#f4b942)] text-white" onClick={() => run(() => setNoteCreated(true))}><PlusIcon size={17} /></GuideAction> : <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(156,126,94,0.12)] text-[var(--muted)]"><PlusIcon size={17} /></span>}
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full flex-col">
                        <div className="mb-3 flex items-center justify-between rounded-[18px] border border-[rgba(213,198,180,0.7)] bg-white/72 px-3 py-2.5">
                          <div className="flex items-center gap-2"><CalendarDaysIcon size={16} /><div><p className="text-[11px] font-bold text-[var(--brown-strong)]">{todoTomorrow ? (isZh ? "明天" : "Tomorrow") : (isZh ? "今天" : "Today")}</p><p className="text-[9px] text-[var(--muted)]">{todoTomorrow ? (isZh ? "已切换日期" : "Date changed") : (isZh ? "当前日期" : "Current date")}</p></div></div>
                          {step === 8 ? <GuideAction ariaLabel={current.action} className="rounded-[11px] bg-white px-3 py-2 text-[10px] font-bold text-[#2f6bff]" onClick={() => run(() => setTodoTomorrow(true))}>{isZh ? "明天" : "Tomorrow"}</GuideAction> : null}
                        </div>
                        <div className="min-h-0 flex-1">
                          {todoCreated ? (
                            <div className={`rounded-[18px] border bg-white/76 p-3 ${todoGrouped ? "border-[#7691c9]" : "border-[rgba(213,198,180,0.75)]"}`}>
                              <div className="flex items-start gap-2.5">
                                <span className="mt-0.5 h-4 w-4 rounded-[5px] border-2 border-[#2f6bff]" />
                                <div className="min-w-0 flex-1"><p className="text-[12px] font-semibold text-[var(--brown-strong)]">{isZh ? "确认 v1.0.2 构建" : "Verify the v1.0.2 build"}</p><div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-semibold">{todoGrouped ? <span className="rounded-full bg-[#e8eefc] px-2 py-1 text-[#4565a8]">{isZh ? "工作" : "Work"}</span> : null}{todoReminder ? <span className="rounded-full bg-[#fff0df] px-2 py-1 text-[#9a632d]">09:00</span> : null}</div></div>
                                {step === 9 ? <GuideAction ariaLabel={current.action} className="rounded-[10px] bg-white p-2 text-[#9a632d]" onClick={() => run(() => setTodoReminder(true))}><Clock3Icon size={14} /></GuideAction> : null}
                                {step === 10 ? <GuideAction ariaLabel={current.action} className="rounded-[10px] bg-white p-2 text-[#4565a8]" onClick={() => run(() => setTodoGrouped(true))}><GroupPlusIcon size={14} /></GuideAction> : null}
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <div className="mt-3 rounded-[18px] border border-[rgba(213,198,180,0.7)] bg-white/72 p-2.5">
                          {step === 7 ? <GuideAction ariaLabel={current.action} className="flex w-full items-center justify-center gap-2 rounded-[13px] bg-[linear-gradient(145deg,#ff7a59,#f4b942)] px-3 py-2.5 text-[11px] font-bold text-white" onClick={() => run(() => setTodoCreated(true))}><PlusIcon size={15} />{isZh ? "添加演练待办" : "Add practice todo"}</GuideAction> : <span className="block rounded-[13px] bg-[rgba(156,126,94,0.09)] px-3 py-2.5 text-[11px] text-[var(--muted)]">{isZh ? "快速添加待办…" : "Quick add a todo…"}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {noteFloating && !noteDeleted ? (
                    <motion.div className="absolute bottom-7 right-7 z-20 w-[215px] rounded-[20px] border border-[#d79743] bg-[#fff9df] p-3 shadow-[0_24px_54px_rgba(61,49,34,0.26)]" initial={{ opacity: 0, scale: 0.85, x: -30, y: 20 }} animate={{ opacity: 1, scale: 1, x: 0, y: 0 }} exit={{ opacity: 0, scale: 0.88, y: 15 }}>
                      <div className="flex items-center justify-between"><span className="text-[9px] font-bold text-[#8b6739]">{isZh ? "悬浮便签" : "Floating note"}</span>{step === 4 ? <GuideAction ariaLabel={current.action} className="rounded-[9px] bg-white p-1.5 text-[#7A5E39]" onClick={() => run(() => setNotePinned(true))}><PushPinIcon size={13} active={notePinned} /></GuideAction> : <span className="rounded-[9px] bg-white p-1.5 text-[#ff7a59]"><PushPinIcon size={13} active={notePinned} /></span>}</div>
                      <p className="mt-2 text-[12px] font-semibold text-[var(--brown-strong)]">{isZh ? "准备发布 v1.0.2" : "Prepare v1.0.2 release"}</p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <motion.aside key={step} className="relative z-20 self-end rounded-[25px] border border-white/75 bg-[rgba(255,255,255,0.94)] p-4 shadow-[0_24px_54px_rgba(61,49,34,0.19)] backdrop-blur-xl lg:self-center" initial={{ opacity: 0, x: 12, y: 6 }} animate={{ opacity: 1, x: 0, y: 0 }}>
                <span className="status-chip" data-tone="coral">{step + 1} / {copy.length}</span>
                <p className="mt-3 font-display text-[21px] font-semibold tracking-[-0.03em] text-[var(--brown-strong)]">{current.title}</p>
                <p className="mt-2 text-[12px] leading-6 text-[var(--muted)]">{current.body}</p>
                <div className="mt-4 flex items-start gap-2 rounded-[15px] bg-[rgba(255,122,89,0.09)] px-3 py-2.5 text-[11px] font-semibold leading-5 text-[#8f553d]"><SparklesIcon size={14} className="mt-0.5 shrink-0" />{current.action}</div>
                {step === copy.length - 1 ? <motion.button type="button" className="mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(145deg,#ff7a59,#f4b942)] px-4 py-3 text-[12px] font-bold text-white shadow-[0_12px_24px_rgba(255,122,89,0.24)]" whileTap={{ scale: 0.98 }} onClick={resetAndClose}><CircleCheckBigIcon size={16} />{isZh ? "完成指引" : "Finish guide"}</motion.button> : null}
                <button type="button" className="mt-3 w-full text-center text-[11px] font-semibold text-[var(--muted)] underline decoration-[rgba(156,126,94,0.35)] underline-offset-4" onClick={resetAndClose}>{isZh ? "退出指引并丢弃演练状态" : "Exit guide and discard practice state"}</button>
              </motion.aside>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
