import { useSettingsStore } from "../store/settingsStore";
import type { AppLanguage } from "./models";

type MessageCatalog = {
  app: {
    appName: string;
    hideWindow: string;
    loading: string;
    localOnly: string;
    sectionsAria: string;
    settings: string;
  };
  common: {
    cancel: string;
    change: string;
    clear: string;
    close: string;
    english: string;
    language: string;
    save: string;
    simplifiedChinese: string;
  };
  notes: {
    add: string;
    cards: (count: number) => string;
    changeColor: string;
    collapse: string;
    color: string;
    copy: string;
    delete: string;
    dragHint: string;
    dragPreview: string;
    dragPreviewEditing: string;
    editorPlaceholder: string;
    empty: string;
    focusCard: string;
    fold: string;
    italic: string;
    open: string;
    reorder: string;
    titleAria: string;
    toolbarClear: string;
    underline: string;
    untitled: string;
    useColor: (color: string) => string;
    bold: string;
    paste: string;
  };
  settings: {
    aboutNotesBody: string;
    aboutNotesTitle: string;
    aboutSubtitle: string;
    aboutTitle: string;
    aboutTodosBody: string;
    aboutTodosTitle: string;
    aboutTrayFlowBody: string;
    aboutTrayFlowTitle: string;
    appIntro: string;
    changeShortcut: string;
    currentShortcut: string;
    dataScopeBody: string;
    dataScopeTitle: string;
    defaultLaunchShortcut: (shortcut: string) => string;
    defaultSection: string;
    dialogRecorded: string;
    dialogSubtitle: string;
    dialogTitle: string;
    dialogWaiting: string;
    englishMode: string;
    globalShortcutTitle: string;
    hotkeyHint: string;
    languageEnglishBody: string;
    languageSectionSubtitle: string;
    languageSimplifiedChineseBody: string;
    languageTitle: string;
    lastSavedPosition: string;
    lastStoredSection: (section: string) => string;
    launchAndNavigationSubtitle: string;
    launchAndNavigationTitle: string;
    motionAndFeedbackSubtitle: string;
    motionAndFeedbackTitle: string;
    openLastStoredSection: string;
    openNotesOnHotkey: string;
    openTodosOnHotkey: string;
    panelStatusSubtitle: string;
    panelStatusTitle: string;
    particleFeedbackBody: string;
    particleFeedbackTitle: string;
    preciseLanguageApply: string;
    restoreDefaults: string;
    restoreDefaultsBody: string;
    restoreDefaultsFailed: (shortcut: string) => string;
    restoreDefaultsSuccess: string;
    shortcutApply: string;
    shortcutChanged: (shortcut: string) => string;
    shortcutFailed: (shortcut: string) => string;
    shortcutNoCapture: string;
    shortcutPrompt: string;
    shortcutRecorded: (shortcut: string) => string;
    shortcutUnchanged: (shortcut: string) => string;
    shortcutUnsupported: string;
    shortcutNeedsModifier: string;
    switchSpeed: string;
    switchSpeedFast: string;
    switchSpeedMediate: string;
    switchSpeedSlow: string;
    tabTransitionStyle: string;
    transitionLift: string;
    transitionPage: string;
    transitionSlide: string;
    unset: string;
    zhMode: string;
  };
  tabs: {
    notes: string;
    todos: string;
  };
  todos: {
    add: string;
    changeReminder: string;
    clear: string;
    completeTask: string;
    date: string;
    delete: string;
    done: string;
    doneCount: (count: number) => string;
    doneFallback: string;
    empty: string;
    hour: string;
    minute: string;
    pickDateTime: string;
    precise: string;
    quickAdd: string;
    quickAddPlaceholder: string;
    reminder: string;
    reorder: string;
    restoreTask: string;
    save: string;
    setReminder: string;
    statusDone: string;
    statusUndone: string;
    submitShortcut: string;
    tomorrowMorning: string;
    tonight: string;
    undoneCount: (count: number) => string;
    inOneHour: string;
  };
};

const messages: Record<AppLanguage, MessageCatalog> = {
  en: {
    app: {
      appName: "QuickNote",
      hideWindow: "Hide QuickNote",
      loading: "Loading QuickNote...",
      localOnly: "local only",
      sectionsAria: "QuickNote sections",
      settings: "Settings",
    },
    common: {
      cancel: "Cancel",
      change: "Change",
      clear: "Clear",
      close: "Close",
      english: "English",
      language: "Language",
      save: "Save",
      simplifiedChinese: "Simplified Chinese",
    },
    notes: {
      add: "Add note",
      bold: "Bold",
      cards: (count) => `${count} cards`,
      changeColor: "Change note color",
      collapse: "Collapse note",
      color: "Color",
      copy: "Copy",
      delete: "Delete note",
      dragHint: "Drag to sort cards and keep the stack compact.",
      dragPreview: "Drag preview.",
      dragPreviewEditing: "Editing preview of this card while dragging.",
      editorPlaceholder: "Capture the note while it is fresh...",
      empty: "No notes yet. Tap the plus button below to start a new card.",
      focusCard: "Focus card",
      fold: "Fold",
      italic: "Italic",
      open: "Open",
      paste: "Paste",
      reorder: "Reorder note",
      titleAria: "Note title",
      toolbarClear: "Clear",
      underline: "Underline",
      untitled: "Untitled note",
      useColor: (color) => `Use ${color} for note`,
    },
    settings: {
      aboutNotesBody: "Card-based notes with drag sorting, color tags, and a compact editor surface.",
      aboutNotesTitle: "Notes",
      aboutSubtitle: "A tray-first capture surface for fast notes and timed todos on macOS.",
      aboutTitle: "About QuickNote",
      aboutTodosBody: "Status-colored tasks with reminders, fast entry, and quicker scanning in narrow windows.",
      aboutTodosTitle: "Todos",
      aboutTrayFlowBody: "Open from the global shortcut, keep the panel floating, and tune motion to match your pace.",
      aboutTrayFlowTitle: "Tray flow",
      appIntro: "Configure how the tray panel opens, switches between Notes and Todos, and how much motion feedback you want while working.",
      changeShortcut: "Change",
      currentShortcut: "Current shortcut",
      dataScopeBody: "Notes, todos, and settings are stored locally in the app data directory and auto-saved after edits.",
      dataScopeTitle: "Data scope",
      defaultLaunchShortcut: (shortcut) => `Default launch shortcut: ${shortcut}`,
      defaultSection: "Default section",
      dialogRecorded: "Recorded shortcut",
      dialogSubtitle: "Press a shortcut combination with at least one modifier key, then apply it.",
      dialogTitle: "Change global shortcut",
      dialogWaiting: "Waiting for input...",
      englishMode: "English",
      globalShortcutTitle: "Global shortcut",
      hotkeyHint: "Click change, then press your new shortcut combination.",
      languageEnglishBody: "Keep the interface in English.",
      languageSectionSubtitle: "Switch the app interface language instantly.",
      languageSimplifiedChineseBody: "Switch the interface to Simplified Chinese.",
      languageTitle: "Language",
      lastSavedPosition: "Last saved position",
      lastStoredSection: (section) => `Last stored section: ${section}.`,
      launchAndNavigationSubtitle: "Control how the panel opens and which section should be ready first.",
      launchAndNavigationTitle: "Launch and navigation",
      motionAndFeedbackSubtitle: "Tune the animation used for tab switches and for moving between the main surface and Settings.",
      motionAndFeedbackTitle: "Motion and feedback",
      openLastStoredSection: "Open last stored section by default",
      openNotesOnHotkey: "Open Notes on hotkey summon",
      openTodosOnHotkey: "Open Todos on hotkey summon",
      panelStatusSubtitle: "Current runtime details from the desktop shell.",
      panelStatusTitle: "Panel status",
      particleFeedbackBody: "Show burst effects when notes and todos are added, completed, or removed.",
      particleFeedbackTitle: "Particle feedback",
      preciseLanguageApply: "Apply language",
      restoreDefaults: "Restore defaults",
      restoreDefaultsBody: "Reset language, shortcut, default section, transition style, switch speed, particle feedback, and saved panel position.",
      restoreDefaultsFailed: (shortcut) => `Defaults were not restored. Keeping ${shortcut}.`,
      restoreDefaultsSuccess: "Default settings restored.",
      shortcutApply: "Apply shortcut",
      shortcutChanged: (shortcut) => `Shortcut updated to ${shortcut}.`,
      shortcutFailed: (shortcut) => `Shortcut change failed. Keeping ${shortcut}.`,
      shortcutNoCapture: "No shortcut has been recorded yet.",
      shortcutPrompt: "Press the shortcut you want to use.",
      shortcutRecorded: (shortcut) => `Recorded ${shortcut}. Click Apply shortcut to confirm.`,
      shortcutUnchanged: (shortcut) => `Shortcut unchanged: ${shortcut}.`,
      shortcutUnsupported: "This key combination is not supported for the global shortcut.",
      shortcutNeedsModifier: "Global shortcuts need at least one modifier key.",
      switchSpeed: "Switch speed",
      switchSpeedFast: "Fast",
      switchSpeedMediate: "Mediate",
      switchSpeedSlow: "Slow",
      tabTransitionStyle: "Tab transition style",
      transitionLift: "Lift",
      transitionPage: "Page turn",
      transitionSlide: "Slide",
      unset: "Unset",
      zhMode: "简体中文",
    },
    tabs: {
      notes: "Notes",
      todos: "Todos",
    },
    todos: {
      add: "Add task",
      changeReminder: "Change reminder",
      clear: "Clear",
      completeTask: "Complete task",
      date: "Date",
      delete: "Delete todo",
      done: "done",
      doneCount: (count) => `${count} done`,
      doneFallback: "Done",
      empty: "No tasks yet. Add a compact todo below.",
      hour: "Hour",
      inOneHour: "In 1h",
      minute: "Minute",
      pickDateTime: "Pick date and time",
      precise: "precise",
      quickAdd: "Quick add",
      quickAddPlaceholder: "Add a task",
      reminder: "Reminder",
      reorder: "Reorder todo",
      restoreTask: "Restore task",
      save: "Save",
      setReminder: "Set reminder",
      statusDone: "done",
      statusUndone: "undone",
      submitShortcut: "Cmd+Enter",
      tomorrowMorning: "Tomorrow 09:00",
      tonight: "Tonight",
      undoneCount: (count) => `${count} undone`,
    },
  },
  "zh-CN": {
    app: {
      appName: "QuickNote",
      hideWindow: "隐藏 QuickNote",
      loading: "正在加载 QuickNote...",
      localOnly: "仅本地",
      sectionsAria: "QuickNote 分区",
      settings: "设置",
    },
    common: {
      cancel: "取消",
      change: "更改",
      clear: "清除",
      close: "关闭",
      english: "English",
      language: "语言",
      save: "保存",
      simplifiedChinese: "简体中文",
    },
    notes: {
      add: "新增笔记",
      bold: "加粗",
      cards: (count) => `${count} 张卡片`,
      changeColor: "更改笔记颜色",
      collapse: "折叠笔记",
      color: "颜色",
      copy: "复制",
      delete: "删除笔记",
      dragHint: "拖动即可调整卡片顺序，让笔记列表保持紧凑。",
      dragPreview: "拖动预览。",
      dragPreviewEditing: "正在拖动这张卡片的编辑预览。",
      editorPlaceholder: "趁灵感还新鲜，赶紧记下来……",
      empty: "还没有笔记。点击下方加号开始新建卡片。",
      focusCard: "聚焦卡片",
      fold: "折叠",
      italic: "斜体",
      open: "展开",
      paste: "粘贴",
      reorder: "重新排序笔记",
      titleAria: "笔记标题",
      toolbarClear: "清除",
      underline: "下划线",
      untitled: "未命名笔记",
      useColor: (color) => `使用 ${color} 作为笔记颜色`,
    },
    settings: {
      aboutNotesBody: "卡片式笔记支持拖拽排序、颜色标记和紧凑编辑区域。",
      aboutNotesTitle: "笔记",
      aboutSubtitle: "一个面向托盘的快速记录界面，适合在 macOS 上迅速记下笔记和定时待办。",
      aboutTitle: "关于 QuickNote",
      aboutTodosBody: "待办事项带有状态颜色和提醒，输入更快，在窄窗口里也更好浏览。",
      aboutTodosTitle: "待办",
      aboutTrayFlowBody: "通过全局快捷键呼出面板，让窗口保持悬浮，并按你的节奏调整动画。",
      aboutTrayFlowTitle: "托盘流程",
      appIntro: "配置托盘面板的打开方式、Notes 与 Todos 的切换方式，以及你希望保留多少动效反馈。",
      changeShortcut: "更改",
      currentShortcut: "当前快捷键",
      dataScopeBody: "笔记、待办和设置都会保存在本地应用数据目录中，并在编辑后自动保存。",
      dataScopeTitle: "数据范围",
      defaultLaunchShortcut: (shortcut) => `默认启动快捷键：${shortcut}`,
      defaultSection: "默认分区",
      dialogRecorded: "已录入快捷键",
      dialogSubtitle: "按下一个至少包含一个修饰键的快捷键组合，然后点击应用。",
      dialogTitle: "更改全局快捷键",
      dialogWaiting: "等待输入……",
      englishMode: "English",
      globalShortcutTitle: "全局快捷键",
      hotkeyHint: "点击更改，然后按下你想要的新快捷键组合。",
      languageEnglishBody: "界面保持为英文。",
      languageSectionSubtitle: "立即切换应用界面语言。",
      languageSimplifiedChineseBody: "将界面切换为简体中文。",
      languageTitle: "语言",
      lastSavedPosition: "上次保存的位置",
      lastStoredSection: (section) => `上次停留分区：${section}。`,
      launchAndNavigationSubtitle: "控制面板如何打开，以及优先显示哪个分区。",
      launchAndNavigationTitle: "启动与导航",
      motionAndFeedbackSubtitle: "调整标签切换以及主界面与设置界面之间切换时的动画效果。",
      motionAndFeedbackTitle: "动效与反馈",
      openLastStoredSection: "默认打开上次停留的分区",
      openNotesOnHotkey: "按快捷键呼出时优先打开 Notes",
      openTodosOnHotkey: "按快捷键呼出时优先打开 Todos",
      panelStatusSubtitle: "来自桌面外壳的当前运行信息。",
      panelStatusTitle: "面板状态",
      particleFeedbackBody: "在新增、完成或删除笔记和待办时显示粒子反馈效果。",
      particleFeedbackTitle: "粒子反馈",
      preciseLanguageApply: "应用语言",
      restoreDefaults: "恢复默认设置",
      restoreDefaultsBody: "重置语言、快捷键、默认分区、切换样式、切换速度、粒子反馈，以及保存的窗口位置。",
      restoreDefaultsFailed: (shortcut) => `默认设置未恢复，当前仍保留 ${shortcut}。`,
      restoreDefaultsSuccess: "默认设置已恢复。",
      shortcutApply: "应用快捷键",
      shortcutChanged: (shortcut) => `快捷键已更新为 ${shortcut}。`,
      shortcutFailed: (shortcut) => `快捷键修改失败，仍保留 ${shortcut}。`,
      shortcutNoCapture: "还没有录入任何快捷键。",
      shortcutPrompt: "请按下你想使用的快捷键。",
      shortcutRecorded: (shortcut) => `已录入 ${shortcut}。点击“应用快捷键”确认。`,
      shortcutUnchanged: (shortcut) => `快捷键未变化：${shortcut}。`,
      shortcutUnsupported: "这个快捷键组合当前不受支持。",
      shortcutNeedsModifier: "全局快捷键至少需要一个修饰键。",
      switchSpeed: "切换速度",
      switchSpeedFast: "快速",
      switchSpeedMediate: "中速",
      switchSpeedSlow: "慢速",
      tabTransitionStyle: "标签切换样式",
      transitionLift: "抬升",
      transitionPage: "翻页",
      transitionSlide: "滑动",
      unset: "未设置",
      zhMode: "简体中文",
    },
    tabs: {
      notes: "笔记",
      todos: "待办",
    },
    todos: {
      add: "添加任务",
      changeReminder: "修改提醒",
      clear: "清除",
      completeTask: "完成任务",
      date: "日期",
      delete: "删除待办",
      done: "已完成",
      doneCount: (count) => `${count} 项已完成`,
      doneFallback: "已完成",
      empty: "还没有任务。在下方添加一条简洁待办吧。",
      hour: "小时",
      inOneHour: "1小时后",
      minute: "分钟",
      pickDateTime: "选择日期和时间",
      precise: "精确",
      quickAdd: "快速添加",
      quickAddPlaceholder: "添加一项任务",
      reminder: "提醒",
      reorder: "重新排序待办",
      restoreTask: "恢复任务",
      save: "保存",
      setReminder: "设置提醒",
      statusDone: "已完成",
      statusUndone: "未完成",
      submitShortcut: "Cmd+Enter",
      tomorrowMorning: "明天 09:00",
      tonight: "今晚",
      undoneCount: (count) => `${count} 项未完成`,
    },
  },
};

export function useI18n() {
  const language = useSettingsStore((state) => state.language);

  return {
    language,
    t: messages[language],
  };
}

export function formatCompactEditedLabel(updatedAt: number, language: AppLanguage) {
  const elapsed = Math.max(0, Date.now() - updatedAt);
  const minute = 60_000;
  const hour = minute * 60;
  const day = hour * 24;

  if (elapsed < minute) {
    return language === "zh-CN" ? "刚刚" : "<1min ago";
  }

  if (elapsed < hour) {
    const value = Math.floor(elapsed / minute);
    return language === "zh-CN" ? `${value}分钟前` : `${value}min ago`;
  }

  if (elapsed < day) {
    const value = Math.floor(elapsed / hour);
    return language === "zh-CN" ? `${value}小时前` : `${value}h ago`;
  }

  const value = Math.floor(elapsed / day);
  return language === "zh-CN" ? `${value}天前` : `${value}d ago`;
}
