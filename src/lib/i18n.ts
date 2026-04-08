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
    addGroup: string;
    allGroups: string;
    cards: (count: number) => string;
    changeColor: string;
    changeGroup: string;
    changeGroupColor: string;
    collapse: string;
    color: string;
    copy: string;
    createGroup: string;
    createGroupTitle: string;
    delete: string;
    deleteGroupAction: string;
    deleteGroup: (name: string) => string;
    dragHint: string;
    dragPreview: string;
    dragPreviewEditing: string;
    editGroup: (name: string) => string;
    editGroupTitle: string;
    editorPlaceholder: string;
    empty: string;
    filterDialogSubtitle: string;
    filterDialogTitle: string;
    filterGroups: string;
    filteredEmpty: string;
    focusCard: string;
    fold: string;
    group: string;
    groupColor: string;
    groupManagerBody: string;
    groupManagerTitle: string;
    groupMenuEmpty: string;
    groupName: string;
    groupNameDuplicate: string;
    groupNamePlaceholder: string;
    groupTotal: (count: number) => string;
    groups: (count: number) => string;
    groupsEmpty: string;
    italic: string;
    moreColors: string;
    noGroup: string;
    open: string;
    reorder: string;
    redo: string;
    showColors: string;
    toggleGroupFilter: (name: string) => string;
    titleAria: string;
    toolbarClear: string;
    undo: string;
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
    notificationPermissionStepOne: string;
    notificationPermissionStepThree: string;
    notificationPermissionStepTwo: string;
    notificationPermissionTitle: string;
    notificationPermissionBody: string;
    notificationOpenSettingsButton: string;
    notificationOpenSettingsFailed: string;
    notificationOpenSettingsUnsupported: string;
    reminderTestButton: string;
    reminderTestBody: string;
    reminderTestFailed: string;
    reminderTestMutedSuccess: string;
    reminderTestSoundSuccess: string;
    reminderTestTitle: string;
    reminderTestUnsupported: string;
    reminderSoundBody: string;
    reminderSoundTitle: string;
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
    calendarHint: string;
    changeReminder: string;
    clear: string;
    completeTask: string;
    currentReminder: string;
    date: string;
    delete: string;
    dialogSubtitle: string;
    dialogTitle: string;
    done: string;
    doneCount: (count: number) => string;
    doneFallback: string;
    empty: string;
    hour: string;
    minute: string;
    month: string;
    nextMonth: string;
    notScheduled: string;
    pickDateTime: string;
    precise: string;
    previousMonth: string;
    quickAdd: string;
    quickAddPlaceholder: string;
    quickShortcutsTitle: string;
    reminder: string;
    reminderPastError: string;
    reorder: string;
    restoreTask: string;
    save: string;
    scheduledFor: string;
    setReminder: string;
    specificTimeTitle: string;
    statusDone: string;
    statusUndone: string;
    submitHint: string;
    tomorrow: string;
    tomorrowMorning: string;
    tomorrowTimePrompt: string;
    tonight: string;
    undoneCount: (count: number) => string;
    inOneHour: string;
    year: string;
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
      addGroup: "Add group",
      allGroups: "All",
      bold: "Bold",
      cards: (count) => `${count} cards`,
      changeColor: "Change note color",
      changeGroup: "Change note group",
      changeGroupColor: "Change group color",
      collapse: "Collapse note",
      color: "Color",
      copy: "Copy",
      createGroup: "Create group",
      createGroupTitle: "Create group",
      delete: "Delete note",
      deleteGroupAction: "Delete group",
      deleteGroup: (name) => `Delete ${name} group`,
      dragHint: "Drag to sort cards",
      dragPreview: "Drag preview.",
      dragPreviewEditing: "Editing preview of this card while dragging.",
      editGroup: (name) => `Edit ${name} group`,
      editGroupTitle: "Edit group",
      editorPlaceholder: "Capture the note while it is fresh...",
      empty: "No notes yet. Tap the plus button below to start a new card.",
      filterDialogSubtitle: "Choose which groups stay visible in Notes.",
      filterDialogTitle: "Filter groups",
      filterGroups: "Filter groups",
      filteredEmpty: "No notes match the selected groups.",
      focusCard: "Focus card",
      fold: "Fold",
      group: "Group",
      groupColor: "Group color",
      groupManagerBody: "Create groups, rename them, change their colors, delete them, and assign this card from one dialog.",
      groupManagerTitle: "Manage groups",
      groupMenuEmpty: "Choose a group below, or create a new one here first.",
      groupName: "Group name",
      groupNameDuplicate: "Group names must be unique.",
      groupNamePlaceholder: "Enter a group name",
      groupTotal: (count) => `${count} groups total`,
      groups: (count) => `${count} groups`,
      groupsEmpty: "No groups yet. This note stays ungrouped until you create one here.",
      italic: "Italic",
      moreColors: "More Colors",
      noGroup: "No group",
      open: "Open",
      paste: "Paste",
      reorder: "Reorder note",
      redo: "Redo",
      showColors: "Show Colors",
      toggleGroupFilter: (name) => `Toggle ${name} filter`,
      titleAria: "Note title",
      toolbarClear: "Clear format",
      undo: "Undo",
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
      notificationPermissionStepOne: "Open the QuickNote item in the Notifications list.",
      notificationPermissionStepThree: "Turn on sounds and choose a visible alert style.",
      notificationPermissionStepTwo: "Turn on Allow notifications.",
      notificationPermissionTitle: "Permission setup",
      notificationPermissionBody: "If test delivery still fails, update QuickNote in Notifications:",
      notificationOpenSettingsButton: "Open System Settings",
      notificationOpenSettingsFailed: "QuickNote couldn't open System Settings.",
      notificationOpenSettingsUnsupported: "This preview cannot open macOS System Settings.",
      reminderTestButton: "Send test notification",
      reminderTestBody: "Trigger a local macOS notification in about two seconds so you can verify alerts and sound.",
      reminderTestFailed: "QuickNote could not schedule the test notification.",
      reminderTestMutedSuccess: "Test notification scheduled. It will arrive silently in about two seconds.",
      reminderTestSoundSuccess: "Test notification scheduled. It should arrive with sound in about two seconds.",
      reminderTestTitle: "Test notification",
      reminderTestUnsupported: "This preview cannot send native macOS notifications.",
      reminderSoundBody: "Play the default notification sound when a todo reminder is delivered.",
      reminderSoundTitle: "Reminder sound",
      restoreDefaults: "Restore defaults",
      restoreDefaultsBody: "Reset language, shortcut, default section, transition style, switch speed, particle feedback, reminder sound, and saved panel position.",
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
      calendarHint: "Use the calendar to choose the day, then fine-tune the time below.",
      changeReminder: "Change reminder",
      clear: "Clear",
      completeTask: "Complete task",
      currentReminder: "Current reminder",
      date: "Date",
      delete: "Delete todo",
      dialogSubtitle: "Choose a date and time for this todo reminder.",
      dialogTitle: "Set todo reminder",
      done: "done",
      doneCount: (count) => `${count} done`,
      doneFallback: "Done",
      empty: "No tasks yet. Add a compact todo below.",
      hour: "Hour",
      inOneHour: "In 1h",
      minute: "Minute",
      month: "Month",
      nextMonth: "Next month",
      notScheduled: "Not scheduled",
      pickDateTime: "Pick date and time",
      precise: "precise",
      previousMonth: "Previous month",
      quickAdd: "Quick add",
      quickAddPlaceholder: "Add a task",
      quickShortcutsTitle: "Quick shortcuts",
      reminder: "Reminder",
      reminderPastError: "Reminder time must be later than the current time.",
      reorder: "Reorder todo",
      restoreTask: "Restore task",
      save: "Save",
      scheduledFor: "Scheduled for",
      setReminder: "Set reminder",
      specificTimeTitle: "Specific time",
      statusDone: "done",
      statusUndone: "undone",
      submitHint: "Cmd+Enter for newline",
      tomorrow: "Tomorrow",
      tomorrowMorning: "Tomorrow 09:00",
      tomorrowTimePrompt: "Tomorrow selected. Choose the hour and minute below.",
      tonight: "Tonight",
      undoneCount: (count) => `${count} undone`,
      year: "Year",
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
      addGroup: "添加分组",
      allGroups: "全部",
      bold: "加粗",
      cards: (count) => `${count} 张卡片`,
      changeColor: "更改笔记颜色",
      changeGroup: "更改笔记分组",
      changeGroupColor: "更改分组颜色",
      collapse: "折叠笔记",
      color: "颜色",
      copy: "复制",
      createGroup: "创建分组",
      createGroupTitle: "创建分组",
      delete: "删除笔记",
      deleteGroupAction: "删除分组",
      deleteGroup: (name) => `删除分组 ${name}`,
      dragHint: "拖动调整卡片顺序",
      dragPreview: "拖动预览。",
      dragPreviewEditing: "正在拖动这张卡片的编辑预览。",
      editGroup: (name) => `编辑分组 ${name}`,
      editGroupTitle: "编辑分组",
      editorPlaceholder: "趁灵感还新鲜，赶紧记下来……",
      empty: "还没有笔记。点击下方加号开始新建卡片。",
      filterDialogSubtitle: "选择在 Notes 主界面中需要显示的分组。",
      filterDialogTitle: "筛选分组",
      filterGroups: "筛选分组",
      filteredEmpty: "当前筛选下没有匹配的笔记。",
      focusCard: "聚焦卡片",
      fold: "折叠",
      group: "分组",
      groupColor: "分组颜色",
      groupManagerBody: "在这个对话框里可以创建、重命名、调色、删除分组，也能直接给当前卡片分配分组。",
      groupManagerTitle: "管理分组",
      groupMenuEmpty: "可以直接选择下方分组，或者先在这里创建一个新分组。",
      groupName: "分组名称",
      groupNameDuplicate: "分组名称必须唯一，不能重复。",
      groupNamePlaceholder: "输入分组名称",
      groupTotal: (count) => `当前共 ${count} 个分组`,
      groups: (count) => `${count} 个分组`,
      groupsEmpty: "还没有分组。当前卡片会保持未分组状态，直到你在这里创建分组。",
      italic: "斜体",
      moreColors: "更多颜色",
      noGroup: "未分组",
      open: "展开",
      paste: "粘贴",
      reorder: "重新排序笔记",
      redo: "重做",
      showColors: "显示颜色面板",
      toggleGroupFilter: (name) => `切换 ${name} 的筛选`,
      titleAria: "笔记标题",
      toolbarClear: "清除格式",
      undo: "撤销",
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
      notificationPermissionStepOne: "在通知列表里找到并点开 QuickNote。",
      notificationPermissionStepThree: "打开声音，并选择一个可见的提醒样式。",
      notificationPermissionStepTwo: "打开“允许通知”。",
      notificationPermissionTitle: "权限设置",
      notificationPermissionBody: "如果测试通知仍然失败，请在通知设置里这样调整 QuickNote：",
      notificationOpenSettingsButton: "打开系统设置",
      notificationOpenSettingsFailed: "QuickNote 无法打开系统设置。",
      notificationOpenSettingsUnsupported: "当前预览环境无法打开 macOS 系统设置。",
      reminderTestButton: "发送测试通知",
      reminderTestBody: "约 2 秒后触发一条本机 macOS 通知，用来确认提醒横幅和声音是否正常。",
      reminderTestFailed: "QuickNote 无法安排这条测试通知。",
      reminderTestMutedSuccess: "测试通知已加入队列，约 2 秒后会以静音方式送达。",
      reminderTestSoundSuccess: "测试通知已加入队列，约 2 秒后应该会带声音送达。",
      reminderTestTitle: "测试通知",
      reminderTestUnsupported: "当前预览环境无法发送原生 macOS 通知。",
      reminderSoundBody: "待办提醒送达时播放默认通知声音。",
      reminderSoundTitle: "提醒声音",
      restoreDefaults: "恢复默认设置",
      restoreDefaultsBody: "重置语言、快捷键、默认分区、切换样式、切换速度、粒子反馈、提醒声音，以及保存的窗口位置。",
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
      calendarHint: "先在日历里选日期，再在下方微调时间。",
      changeReminder: "修改提醒",
      clear: "清除",
      completeTask: "完成任务",
      currentReminder: "当前提醒",
      date: "日期",
      delete: "删除待办",
      dialogSubtitle: "为这条待办选择提醒日期和时间。",
      dialogTitle: "设置待办提醒",
      done: "已完成",
      doneCount: (count) => `${count} 项已完成`,
      doneFallback: "已完成",
      empty: "还没有任务。在下方添加一条简洁待办吧。",
      hour: "小时",
      inOneHour: "1小时后",
      minute: "分钟",
      month: "月份",
      nextMonth: "下个月",
      notScheduled: "未设置",
      pickDateTime: "选择日期和时间",
      precise: "精确",
      previousMonth: "上个月",
      quickAdd: "快速添加",
      quickAddPlaceholder: "添加一项任务",
      quickShortcutsTitle: "快捷选择",
      reminder: "提醒",
      reminderPastError: "提醒时间必须晚于当前时间。",
      reorder: "重新排序待办",
      restoreTask: "恢复任务",
      save: "保存",
      scheduledFor: "计划提醒时间",
      setReminder: "设置提醒",
      specificTimeTitle: "具体时间",
      statusDone: "已完成",
      statusUndone: "未完成",
      submitHint: "Cmd+Enter 换行",
      tomorrow: "明天",
      tomorrowMorning: "明天 09:00",
      tomorrowTimePrompt: "已选择明天，请继续选择具体时分。",
      tonight: "今晚",
      undoneCount: (count) => `${count} 项未完成`,
      year: "年份",
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
