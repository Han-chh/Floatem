import { stickItBranding } from "@stickit/branding";
import { useSettingsStore } from "../store/settingsStore";
import type { AppLanguage } from "./models";

type MessageCatalog = {
  app: {
    appName: string;
    collapseNavigation: string;
    expandNavigation: string;
    help: string;
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
    keepOnDesktop: string;
    removeFromDesktop: string;
    resizeFloatingCard: string;
    widgetGuideAddBody: string;
    widgetGuideAddTitle: string;
    widgetGuideDone: string;
    widgetGuideRemoveBody: string;
    widgetGuideRemoveTitle: string;
    save: string;
    scrollToBottom: string;
    scrollToTop: string;
    simplifiedChinese: string;
  };
  launchAtLoginPrompt: {
    title: string;
    body: string;
    suppress: string;
    notNow: string;
    enable: string;
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
    expandToolbar: string;
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
    groupNameRequired: string;
    groupNamePlaceholder: string;
    groupTotal: (count: number) => string;
    groups: (count: number) => string;
    groupsEmpty: string;
    italic: string;
    moreColors: string;
    noGroup: string;
    open: string;
    pickScreenColor: string;
    reorder: string;
    redo: string;
    returnToColors: string;
    screenColorPickerUnavailable: string;
    showColors: string;
    toggleGroupFilter: (name: string) => string;
    titleAria: string;
    toolbarClear: string;
    collapseToolbar: string;
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
    aboutOverviewTitle: string;
    aboutSubtitle: string;
    aboutTitle: string;
    aboutTodosBody: string;
    aboutTodosTitle: string;
    aboutTrayFlowBody: string;
    aboutTrayFlowTitle: string;
    appVersionBody: (version: string) => string;
    appVersionTitle: string;
    appIntro: string;
    backToSettings: string;
    categoryAboutDescription: string;
    categoryAboutTitle: string;
    categoryGeneralDescription: string;
    categoryGeneralTitle: string;
    categoryMotionDescription: string;
    categoryMotionTitle: string;
    categoryNotificationsDescription: string;
    categoryNotificationsTitle: string;
    categoryShortcutsDescription: string;
    categoryShortcutsTitle: string;
    categoryThemeDescription: string;
    categoryThemeTitle: string;
    changeShortcut: string;
    currentShortcut: string;
    dataScopeBody: string;
    dataScopeSubtitle: string;
    dataScopeTitle: string;
    defaultLaunchShortcut: (shortcut: string) => string;
    defaultSection: string;
    dialogRecorded: string;
    dialogSubtitle: string;
    dialogTitle: string;
    dialogWaiting: string;
    englishMode: string;
    firstLevelActionsTitle: string;
    globalShortcutTitle: string;
    hotkeyConflictBannerBody: (shortcut: string) => string;
    hotkeyConflictBannerTitle: string;
    hotkeyConflictBody: (shortcut: string) => string;
    hotkeyConflictTitle: string;
    hotkeyHint: string;
    languageEnglishBody: string;
    languageSectionSubtitle: string;
    languageSimplifiedChineseBody: string;
    languageTitle: string;
    launchAtLoginBody: string;
    launchAtLoginTitle: string;
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
    reminderMutedMeta: string;
    quitApplication: string;
    quitApplicationBody: string;
    quitApplicationButton: string;
    quitApplicationFailed: string;
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
    startupSubtitle: string;
    startupTitle: string;
    switchSpeed: string;
    switchSpeedFast: string;
    switchSpeedMediate: string;
    switchSpeedSlow: string;
    tabTransitionStyle: string;
    timeFormat12Body: string;
    timeFormat24Body: string;
    timeFormatTitle: string;
    timeZoneCurrentLabel: string;
    timeZoneCurrentTime: (time: string) => string;
    timeZoneOptionLabel: (timeZone: string, time: string) => string;
    timeZoneSelectLabel: string;
    timeZoneSubtitle: string;
    timeZoneSystemLabel: (timeZone: string) => string;
    timeZoneTitle: string;
    timeZoneUseSystem: string;
    themeAfterglowTitle: string;
    themeClassicTitle: string;
    themeChrysanthemumTitle: string;
    themeForestTitle: string;
    themeOrchidTitle: string;
    themeManualBody: string;
    themeManualTitle: string;
    themePlumTitle: string;
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
    addGroup: string;
    afternoon: string;
    earlyMorning: string;
    morning: string;
    allDone: string;
    allGroups: string;
    bulkComplete: string;
    bulkCompleteConfirm: string;
    bulkCompleteDialogBody: (count: number) => string;
    bulkCompleteDialogTitle: string;
    bulkDateConfirm: string;
    bulkDateDialogBody: (count: number) => string;
    bulkDateDialogTitle: string;
    bulkDelete: string;
    bulkDeleteConfirm: string;
    bulkDeleteDialogBody: (count: number) => string;
    bulkDeleteDialogTitle: string;
    bulkSetDate: string;
    calendarHint: string;
    changeReminder: string;
    changeTodoDate: string;
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
    editDialogSubtitle: string;
    editDialogTitle: string;
    empty: string;
    exitSelection: string;
    filteredEmpty: string;
    filterGroups: string;
    filterDialogSubtitle: string;
    filterDialogTitle: string;
    changeGroup: string;
    changeGroupColor: string;
    createGroup: string;
    createGroupTitle: string;
    deleteGroupAction: string;
    deleteGroup: (name: string) => string;
    editGroup: (name: string) => string;
    editGroupTitle: string;
    group: string;
    groupColor: string;
    groupFeatureComingSoon: string;
    groupManagerTitle: string;
    groupName: string;
    groupNameDuplicate: string;
    groupNameRequired: string;
    groupNamePlaceholder: string;
    groupTotal: (count: number) => string;
    groupsEmpty: string;
    hour: string;
    items: (count: number) => string;
    minute: string;
    month: string;
    multiSelect: string;
    nextMonth: string;
    noGroup: string;
    notScheduled: string;
    openCalendar: string;
    pickDateTime: string;
    precise: string;
    previousMonth: string;
    quickAdd: string;
    quickAddPlaceholder: string;
    quickAddSubmitTooltip: string;
    quickShortcutsTitle: string;
    reminder: string;
    reminderPastError: string;
    reminderPastTooltip: string;
    reminderExpiredTooltip: string;
    notificationPermissionTitle: string;
    notificationPermissionBody: string;
    notificationPermissionOpenSettings: string;
    notSameDay: string;
    reorder: string;
    restoreTask: string;
    save: string;
    scheduledFor: string;
    selectAllTodos: string;
    selectTodo: (title: string) => string;
    selectedCount: (count: number) => string;
    setReminder: string;
    specificTimeTitle: string;
    statusDone: string;
    statusUndone: string;
    today: string;
    tomorrow: string;
    tomorrowMorning: string;
    tomorrowTimePrompt: string;
    evening: string;
    titleLabel: string;
    titlePlaceholder: string;
    toolbarLabel: string;
    undoneCount: (count: number) => string;
    inOneHour: string;
    inThirtyMinutes: string;
    year: string;
    yesterday: string;
  };
};

const messages: Record<AppLanguage, MessageCatalog> = {
  en: {
    app: {
      appName: stickItBranding.displayName,
      collapseNavigation: "Collapse navigation",
      expandNavigation: "Expand navigation",
      help: "StickIt help",
      hideWindow: "Hide StickIt",
      loading: "Loading StickIt...",
      localOnly: "local only",
      sectionsAria: "StickIt sections",
      settings: "Settings",
    },
    common: {
      cancel: "Cancel",
      change: "Change",
      clear: "Clear",
      close: "Close",
      english: "English",
      language: "Language",
      keepOnDesktop: "Keep on desktop",
      removeFromDesktop: "Remove from desktop",
      resizeFloatingCard: "Resize floating card",
      widgetGuideAddBody: "Desktop cards are StickIt windows. StickIt must be running in the background to display them. Turn on “Open StickIt at login” to restore them automatically after restarting your Mac.",
      widgetGuideAddTitle: "Keep StickIt running",
      widgetGuideDone: "Got it",
      widgetGuideRemoveBody: "StickIt removed this card from the desktop.",
      widgetGuideRemoveTitle: "Removed from desktop",
      save: "Save",
      scrollToBottom: "Scroll to bottom",
      scrollToTop: "Scroll to top",
      simplifiedChinese: "Simplified Chinese",
    },
    launchAtLoginPrompt: {
      title: "Open StickIt at login?",
      body: "This keeps the shortcut ready and restores desktop-pinned cards after you sign in.",
      suppress: "Don't show this dialog again",
      notNow: "Not Now",
      enable: "Enable",
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
      expandToolbar: "Expand formatting toolbar",
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
      groupNameRequired: "New group name cannot be empty.",
      groupNamePlaceholder: "Enter a group name",
      groupTotal: (count) => `${count} groups total`,
      groups: (count) => `${count} groups`,
      groupsEmpty: "No groups yet. This note stays ungrouped until you create one here.",
      italic: "Italic",
      moreColors: "More Colors",
      noGroup: "No group",
      open: "Open",
      paste: "Paste",
      pickScreenColor: "Pick screen color",
      reorder: "Reorder note",
      redo: "Redo",
      returnToColors: "Return",
      screenColorPickerUnavailable: "Screen color picker unavailable",
      showColors: "Show Colors",
      toggleGroupFilter: (name) => `Toggle ${name} filter`,
      titleAria: "Note title",
      toolbarClear: "Clear format",
      collapseToolbar: "Collapse formatting toolbar",
      undo: "Undo",
      underline: "Underline",
      untitled: "Untitled note",
      useColor: (color) => `Use ${color} for note`,
    },
    settings: {
      aboutNotesBody: "Card-based notes with drag sorting, color tags, and a compact editor surface.",
      aboutNotesTitle: "Notes",
      aboutOverviewTitle: "Overview",
      aboutSubtitle: "A tray-first capture surface for fast notes and timed todos on macOS.",
      aboutTitle: "About StickIt",
      aboutTodosBody: "Status-colored tasks with reminders, fast entry, and quicker scanning in narrow windows.",
      aboutTodosTitle: "Todos",
      aboutTrayFlowBody: "Open from the global shortcut, keep the panel floating, and tune motion to match your pace.",
      aboutTrayFlowTitle: "Tray flow",
      appVersionBody: (version) => `Current app version: ${version}. This value is read from package.json at build time.`,
      appVersionTitle: "Version",
      appIntro: "Configure how the tray panel opens, switches between Notes and Todos, and how much motion feedback you want while working.",
      backToSettings: "All settings",
      categoryAboutDescription: "App overview and local-only data details.",
      categoryAboutTitle: "About StickIt",
      categoryGeneralDescription: "Startup, language, and timezone preferences for the app.",
      categoryGeneralTitle: "General",
      categoryMotionDescription: "Tab transitions, switching speed, and small completion effects.",
      categoryMotionTitle: "Motion and feedback",
      categoryNotificationsDescription: "Reminder sound, test delivery, and system notification permission.",
      categoryNotificationsTitle: "Notifications",
      categoryShortcutsDescription: "Global shortcut and which section appears when StickIt opens.",
      categoryShortcutsTitle: "Shortcuts and launch",
      categoryThemeDescription: "Background, surfaces, contrast, and ambient light.",
      categoryThemeTitle: "Theme",
      changeShortcut: "Change",
      currentShortcut: "Current shortcut",
      dataScopeBody: "Notes, todos, and settings are stored locally in the app data directory and auto-saved after edits.",
      dataScopeSubtitle: "StickIt keeps your working data on this device.",
      dataScopeTitle: "Data scope",
      defaultLaunchShortcut: (shortcut) => `Default launch shortcut: ${shortcut}`,
      defaultSection: "Default section",
      dialogRecorded: "Recorded shortcut",
      dialogSubtitle: "Press a shortcut combination with at least one modifier key, then apply it.",
      dialogTitle: "Change global shortcut",
      dialogWaiting: "Waiting for input...",
      englishMode: "English",
      firstLevelActionsTitle: "Actions",
      globalShortcutTitle: "Global shortcut",
      hotkeyConflictBannerBody: (shortcut) =>
        `Global shortcut ${shortcut} is conflicting with another app or system shortcut. Change it in Settings.`,
      hotkeyConflictBannerTitle: "Global shortcut conflict",
      hotkeyConflictBody: (shortcut) =>
        `StickIt could not register ${shortcut}. The shortcut is already reserved or in use by another app. Pick a different shortcut to restore summon and hide.`,
      hotkeyConflictTitle: "Shortcut conflict detected",
      hotkeyHint: "Click change, then press your new shortcut combination.",
      languageEnglishBody: "Keep the interface in English.",
      languageSectionSubtitle: "Switch the app interface language instantly.",
      languageSimplifiedChineseBody: "Switch the interface to Simplified Chinese.",
      languageTitle: "Language",
      launchAtLoginBody: "Start StickIt in the background after login and restore desktop-pinned cards. Desktop cards require StickIt to keep running. You can also manage this in System Settings > General > Login Items.",
      launchAtLoginTitle: "Open StickIt at login",
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
      notificationPermissionStepOne: "Open the StickIt item in the Notifications list.",
      notificationPermissionStepThree: "Turn on sounds and choose a visible alert style.",
      notificationPermissionStepTwo: "Turn on Allow notifications.",
      notificationPermissionTitle: "Permission setup",
      notificationPermissionBody: "If test delivery still fails, update StickIt in Notifications:",
      notificationOpenSettingsButton: "Open System Settings",
      notificationOpenSettingsFailed: "StickIt couldn't open System Settings.",
      notificationOpenSettingsUnsupported: "This preview cannot open macOS System Settings.",
      reminderTestButton: "Send test notification",
      reminderTestBody: "Trigger a local system notification in about two seconds so you can verify alerts and sound.",
      reminderTestFailed: "StickIt could not schedule the test notification.",
      reminderTestMutedSuccess: "Test notification scheduled. It will arrive silently in about two seconds.",
      reminderTestSoundSuccess: "Test notification scheduled. It should arrive with sound in about two seconds.",
      reminderTestTitle: "Test notification",
      reminderTestUnsupported: "This preview cannot send native desktop notifications.",
      reminderSoundBody: "Play the default notification sound when a todo reminder is delivered.",
      reminderSoundTitle: "Reminder sound",
      reminderMutedMeta: "Reminder sound off",
      quitApplication: "Quit application",
      quitApplicationBody: "Fully terminate StickIt instead of only hiding the floating panel.",
      quitApplicationButton: "Quit StickIt",
      quitApplicationFailed: "StickIt could not quit from the current environment.",
      restoreDefaults: "Restore defaults",
      restoreDefaultsBody: "Reset startup, theme, language, timezone, time format, shortcut, default section, motion, reminder sound, and saved panel position.",
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
      startupSubtitle: "Choose whether StickIt should be ready as soon as you sign in.",
      startupTitle: "Startup",
      switchSpeed: "Switch speed",
      switchSpeedFast: "Fast",
      switchSpeedMediate: "Mediate",
      switchSpeedSlow: "Slow",
      tabTransitionStyle: "Tab transition style",
      timeFormat12Body: "Show app times with AM and PM.",
      timeFormat24Body: "Show app times in 24-hour format.",
      timeFormatTitle: "24-hour time",
      timeZoneCurrentLabel: "Current timezone",
      timeZoneCurrentTime: (time) => `Current time: ${time}`,
      timeZoneOptionLabel: (timeZone, time) => `${timeZone} - ${time}`,
      timeZoneSelectLabel: "Choose timezone",
      timeZoneSubtitle: "StickIt detects your system timezone automatically, and you can switch to another timezone from the list.",
      timeZoneSystemLabel: (timeZone) => `System timezone: ${timeZone}`,
      timeZoneTitle: "Timezone",
      timeZoneUseSystem: "Use system timezone",
      themeAfterglowTitle: "Afterglow",
      themeClassicTitle: "Classic",
      themeChrysanthemumTitle: "Chrysanthemum yellow · Chrysanthemum",
      themeForestTitle: "Ink green · Bamboo",
      themeOrchidTitle: "White green · Orchid",
      themeManualBody: "Choose one fixed light theme for StickIt.",
      themeManualTitle: "Choose theme",
      themePlumTitle: "Plum red · Plum blossom",
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
      addGroup: "Add todo group",
      allDone: "All done",
      allGroups: "All",
      bulkComplete: "Complete selected",
      bulkCompleteConfirm: "Complete",
      bulkCompleteDialogBody: (count) => `Complete ${count} selected todo${count === 1 ? "" : "s"}?`,
      bulkCompleteDialogTitle: "Complete selected todos",
      bulkDateConfirm: "Change date",
      bulkDateDialogBody: (count) => `Move ${count} selected todo${count === 1 ? "" : "s"} to this date?`,
      bulkDateDialogTitle: "Change selected date",
      bulkDelete: "Delete selected",
      bulkDeleteConfirm: "Delete",
      bulkDeleteDialogBody: (count) => `Delete ${count} selected todo${count === 1 ? "" : "s"}? This cannot be undone.`,
      bulkDeleteDialogTitle: "Delete selected todos",
      bulkSetDate: "Set date",
      afternoon: "Afternoon",
      earlyMorning: "Early morning",
      morning: "Morning",
      calendarHint: "Use the calendar to choose the day, then fine-tune the time below.",
      changeTodoDate: "Change todo date",
      changeReminder: "Change reminder",
      clear: "Clear",
      completeTask: "Complete task",
      currentReminder: "Current reminder",
      date: "Date",
      delete: "Delete todo",
      dialogSubtitle: "Choose a reminder time for this todo's date.",
      dialogTitle: "Set todo reminder",
      done: "done",
      doneCount: (count) => `${count} done`,
      doneFallback: "Done",
      editDialogSubtitle: "Update the todo title while keeping its status and reminder.",
      editDialogTitle: "Edit todo",
      empty: "No tasks yet. Add a compact todo below.",
      exitSelection: "Exit selection",
      filteredEmpty: "No todos match the selected groups.",
      filterGroups: "Filter todo groups",
      filterDialogSubtitle: "Choose which groups stay visible in Todos.",
      filterDialogTitle: "Filter todo groups",
      changeGroup: "Change todo group",
      changeGroupColor: "Change group color",
      createGroup: "Create group",
      createGroupTitle: "Create group",
      deleteGroupAction: "Delete group",
      deleteGroup: (name) => `Delete ${name} group`,
      editGroup: (name) => `Edit ${name} group`,
      editGroupTitle: "Edit group",
      group: "Group",
      groupColor: "Group color",
      groupFeatureComingSoon: "Manage groups",
      groupManagerTitle: "Manage todo groups",
      groupName: "Group name",
      groupNameDuplicate: "Group names must be unique.",
      groupNameRequired: "New group name cannot be empty.",
      groupNamePlaceholder: "Enter a group name",
      groupTotal: (count) => `${count} groups total`,
      groupsEmpty: "No custom todo groups yet. Create one here, then assign it from a todo card.",
      hour: "Hour",
      inOneHour: "In 1h",
      inThirtyMinutes: "In 30m",
      items: (count) => `${count} todos`,
      minute: "Minute",
      month: "Month",
      multiSelect: "Select todos",
      nextMonth: "Next month",
      noGroup: "No group",
      notScheduled: "Not scheduled",
      openCalendar: "Open todo calendar",
      pickDateTime: "Pick a time",
      precise: "precise",
      previousMonth: "Previous month",
      quickAdd: "Quick add",
      quickAddPlaceholder: "Enter to add a todo\nClick a todo to edit it",
      quickAddSubmitTooltip: "Enter to add · Shift+Enter for new line",
      quickShortcutsTitle: "Quick shortcuts",
      reminder: "Reminder",
      reminderPastError: "Reminder time must be later than the current time.",
      reminderPastTooltip: "Already passed",
      reminderExpiredTooltip: "This reminder has expired",
      notificationPermissionTitle: "Notifications are turned off",
      notificationPermissionBody: "The reminder was saved, but StickIt cannot notify you until notifications are enabled in system settings.",
      notificationPermissionOpenSettings: "Open settings",
      notSameDay: "Not same day",
      reorder: "Reorder todo",
      restoreTask: "Restore task",
      save: "Save",
      scheduledFor: "Scheduled for",
      selectAllTodos: "Select all todos",
      selectTodo: (title) => `Select ${title}`,
      selectedCount: (count) => `${count} selected`,
      setReminder: "Set reminder",
      specificTimeTitle: "Specific time",
      statusDone: "done",
      statusUndone: "undone",
      today: "Today",
      tomorrow: "Tomorrow",
      tomorrowMorning: "Tomorrow 09:00",
      tomorrowTimePrompt: "Tomorrow selected. Choose the hour and minute below.",
      evening: "Evening",
      titleLabel: "Todo title",
      titlePlaceholder: "Update task title",
      toolbarLabel: "Todo actions",
      undoneCount: (count) => `${count} undone`,
      year: "Year",
      yesterday: "Yesterday",
    },
  },
  "zh-CN": {
    app: {
      appName: stickItBranding.displayName,
      hideWindow: "隐藏 StickIt",
      loading: "正在加载 StickIt...",
      localOnly: "仅本地",
      sectionsAria: "StickIt 分区",
      settings: "设置",
      collapseNavigation: "\u6536\u8d77\u5bfc\u822a",
      expandNavigation: "\u5c55\u5f00\u5bfc\u822a",
      help: "StickIt \u5e2e\u52a9",
    },
    common: {
      cancel: "取消",
      change: "更改",
      clear: "清除",
      close: "关闭",
      english: "English",
      language: "语言",
      keepOnDesktop: "固定到桌面",
      removeFromDesktop: "取消桌面固定",
      resizeFloatingCard: "调整悬浮卡片大小",
      widgetGuideAddBody: "桌面置顶卡片是 StickIt 创建的窗口，必须让 StickIt 在后台运行才能显示。请开启“登录时打开 StickIt”，这样重新启动 Mac 后会自动恢复桌面卡片。",
      widgetGuideAddTitle: "需要让 StickIt 保持运行",
      widgetGuideDone: "知道了",
      widgetGuideRemoveBody: "StickIt 已从桌面移除这张卡片。",
      widgetGuideRemoveTitle: "已取消桌面固定",
      save: "保存",
      scrollToBottom: "滚动到底部",
      scrollToTop: "滚动到顶部",
      simplifiedChinese: "简体中文",
    },
    launchAtLoginPrompt: {
      title: "登录时启动 StickIt？",
      body: "开启后，快捷键会在登录后立即可用，并自动恢复桌面置顶卡片。",
      suppress: "以后不再显示此对话框",
      notNow: "暂不开启",
      enable: "开启",
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
      editorPlaceholder: "趁灵感还在，赶紧记下来……",
      expandToolbar: "展开富文本工具栏",
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
      groupNameRequired: "新组名不能为空。",
      groupNamePlaceholder: "输入分组名称",
      groupTotal: (count) => `当前共 ${count} 个分组`,
      groups: (count) => `${count} 个分组`,
      groupsEmpty: "还没有分组。当前卡片会保持未分组状态，直到你在这里创建分组。",
      italic: "斜体",
      moreColors: "更多颜色",
      noGroup: "未分组",
      open: "展开",
      paste: "粘贴",
      pickScreenColor: "吸取屏幕颜色",
      reorder: "重新排序笔记",
      redo: "重做",
      returnToColors: "返回",
      screenColorPickerUnavailable: "屏幕取色器不可用",
      showColors: "显示颜色面板",
      toggleGroupFilter: (name) => `切换 ${name} 的筛选`,
      titleAria: "笔记标题",
      toolbarClear: "清除格式",
      collapseToolbar: "折叠富文本工具栏",
      undo: "撤销",
      underline: "下划线",
      untitled: "未命名笔记",
      useColor: (color) => `使用 ${color} 作为笔记颜色`,
    },
    settings: {
      aboutNotesBody: "卡片式笔记支持拖拽排序、颜色标记和紧凑编辑区域。",
      aboutNotesTitle: "笔记",
      aboutOverviewTitle: "概览",
      aboutSubtitle: "一个面向托盘的快速记录界面，适合在 macOS 上迅速记下笔记和定时待办。",
      aboutTitle: "关于 StickIt",
      aboutTodosBody: "待办事项带有状态颜色和提醒，输入更快，在窄窗口里也更好浏览。",
      aboutTodosTitle: "待办",
      aboutTrayFlowBody: "通过全局快捷键呼出面板，让窗口保持悬浮，并按你的节奏调整动画。",
      aboutTrayFlowTitle: "托盘流程",
      appVersionBody: (version) => `当前应用版本：${version}。该值会在构建时从 package.json 读取。`,
      appVersionTitle: "版本号",
      appIntro: "配置托盘面板的打开方式、Notes 与 Todos 的切换方式，以及你希望保留多少动效反馈。",
      backToSettings: "全部设置",
      categoryAboutDescription: "应用概览和仅本地存储的数据说明。",
      categoryAboutTitle: "关于 StickIt",
      categoryGeneralDescription: "开机启动、应用语言和时区偏好设置。",
      categoryGeneralTitle: "通用",
      categoryMotionDescription: "标签切换、切换速度和完成反馈效果。",
      categoryMotionTitle: "动效与反馈",
      categoryNotificationsDescription: "提醒声音、测试通知和系统通知权限。",
      categoryNotificationsTitle: "通知",
      categoryShortcutsDescription: "全局快捷键，以及 StickIt 打开时优先显示的分区。",
      categoryShortcutsTitle: "快捷键与启动",
      categoryThemeDescription: "调整整体背景、界面层级、对比度与环境光感。",
      categoryThemeTitle: "主题",
      changeShortcut: "更改",
      currentShortcut: "当前快捷键",
      dataScopeBody: "笔记、待办和设置都会保存在本地应用数据目录中，并在编辑后自动保存。",
      dataScopeSubtitle: "StickIt 会将你的工作数据保存在这台设备上。",
      dataScopeTitle: "数据范围",
      defaultLaunchShortcut: (shortcut) => `默认启动快捷键：${shortcut}`,
      defaultSection: "默认分区",
      dialogRecorded: "已录入快捷键",
      dialogSubtitle: "按下一个至少包含一个修饰键的快捷键组合，然后点击应用。",
      dialogTitle: "更改全局快捷键",
      dialogWaiting: "等待输入……",
      englishMode: "English",
      firstLevelActionsTitle: "操作",
      globalShortcutTitle: "全局快捷键",
      hotkeyConflictBannerBody: (shortcut) =>
        `\u5168\u5c40\u5feb\u6377\u952e ${shortcut} \u6b63\u5728\u4e0e\u5176\u4ed6\u5e94\u7528\u6216\u7cfb\u7edf\u5feb\u6377\u952e\u51b2\u7a81\uff0c\u8bf7\u5728\u8bbe\u7f6e\u4e2d\u4fee\u6539\u3002`,
      hotkeyConflictBannerTitle: "\u5168\u5c40\u5feb\u6377\u952e\u51b2\u7a81",
      hotkeyConflictBody: (shortcut) =>
        `StickIt \u65e0\u6cd5\u6ce8\u518c ${shortcut}\u3002\u8fd9\u7ec4\u5feb\u6377\u952e\u5df2\u88ab\u7cfb\u7edf\u4fdd\u7559\u6216\u88ab\u5176\u4ed6\u5e94\u7528\u5360\u7528\uff0c\u8bf7\u66f4\u6362\u4e3a\u5176\u4ed6\u5feb\u6377\u952e\u4ee5\u6062\u590d\u5524\u8d77\u548c\u9690\u85cf\u80fd\u529b\u3002`,
      hotkeyConflictTitle: "\u68c0\u6d4b\u5230\u5feb\u6377\u952e\u51b2\u7a81",
      hotkeyHint: "点击更改，然后按下你想要的新快捷键组合。",
      languageEnglishBody: "界面保持为英文。",
      languageSectionSubtitle: "立即切换应用界面语言。",
      languageSimplifiedChineseBody: "将界面切换为简体中文。",
      languageTitle: "语言",
      launchAtLoginBody: "登录这台电脑后自动在后台启动 StickIt，并恢复桌面置顶卡片。桌面置顶卡片需要 StickIt 保持运行。你也可以在“系统设置 > 通用 > 登录项”中管理它。",
      launchAtLoginTitle: "登录时打开 StickIt",
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
      notificationPermissionStepOne: "在通知列表里找到并点开 StickIt。",
      notificationPermissionStepThree: "打开声音，并选择一个可见的提醒样式。",
      notificationPermissionStepTwo: "打开“允许通知”。",
      notificationPermissionTitle: "权限设置",
      notificationPermissionBody: "如果测试通知仍然失败，请在通知设置里这样调整 StickIt：",
      notificationOpenSettingsButton: "打开系统设置",
      notificationOpenSettingsFailed: "StickIt 无法打开系统设置。",
      notificationOpenSettingsUnsupported: "当前预览环境无法打开 macOS 系统设置。",
      reminderTestButton: "发送测试通知",
      reminderTestBody: "约 2 秒后触发一条本机 macOS 通知，用来确认提醒横幅和声音是否正常。",
      reminderTestFailed: "StickIt 无法安排这条测试通知。",
      reminderTestMutedSuccess: "测试通知已加入队列，约 2 秒后会以静音方式送达。",
      reminderTestSoundSuccess: "测试通知已加入队列，约 2 秒后应该会带声音送达。",
      reminderTestTitle: "测试通知",
      reminderTestUnsupported: "当前预览环境无法发送原生 macOS 通知。",
      reminderSoundBody: "待办提醒送达时播放默认通知声音。",
      reminderSoundTitle: "提醒声音",
      reminderMutedMeta: "提醒声音关闭",
      quitApplication: "退出应用",
      quitApplicationBody: "完全结束 StickIt，而不只是隐藏悬浮面板。",
      quitApplicationButton: "完全退出 StickIt",
      quitApplicationFailed: "当前环境下无法退出 StickIt。",
      restoreDefaults: "恢复默认设置",
      restoreDefaultsBody: "重置开机启动、主题、语言、时区、时间格式、快捷键、默认分区、动效、提醒声音以及保存的窗口位置。",
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
      startupSubtitle: "选择是否让 StickIt 在登录系统后立即就绪。",
      startupTitle: "开机启动",
      switchSpeed: "切换速度",
      switchSpeedFast: "快速",
      switchSpeedMediate: "中速",
      switchSpeedSlow: "慢速",
      tabTransitionStyle: "标签切换样式",
      timeFormat12Body: "使用 AM/PM 显示应用内时间。",
      timeFormat24Body: "使用 24 小时制显示应用内时间。",
      timeFormatTitle: "24 小时制",
      timeZoneCurrentLabel: "当前时区",
      timeZoneCurrentTime: (time) => `当前时间：${time}`,
      timeZoneOptionLabel: (timeZone, time) => `${timeZone} - ${time}`,
      timeZoneSelectLabel: "选择时区",
      timeZoneSubtitle: "StickIt 会自动识别系统时区，也可以从列表中切换到其他时区。",
      timeZoneSystemLabel: (timeZone) => `系统时区：${timeZone}`,
      timeZoneTitle: "时区",
      timeZoneUseSystem: "使用系统时区",
      themeAfterglowTitle: "浮光",
      themeClassicTitle: "经典色",
      themeChrysanthemumTitle: "菊花黄 · 菊",
      themeForestTitle: "墨绿色 · 竹",
      themeOrchidTitle: "白绿色 · 兰",
      themeManualBody: "为 StickIt 选择一套固定的浅色主题。",
      themeManualTitle: "选择主题",
      themePlumTitle: "深红粉 · 梅",
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
      afternoon: "\u4e0b\u5348",
      earlyMorning: "早上",
      morning: "上午",
      calendarHint: "先在日历里选日期，再在下方微调时间。",
      changeReminder: "修改提醒",
      clear: "清除",
      completeTask: "完成任务",
      currentReminder: "当前提醒",
      date: "日期",
      delete: "删除待办",
      dialogSubtitle: "\u4e3a\u8fd9\u6761\u5f85\u529e\u6240\u5728\u65e5\u671f\u9009\u62e9\u63d0\u9192\u65f6\u95f4\u3002",
      dialogTitle: "设置待办提醒",
      done: "已完成",
      doneCount: (count) => `${count} 项已完成`,
      doneFallback: "已完成",
      editDialogSubtitle: "修改待办标题，同时保留它的状态和提醒。",
      editDialogTitle: "编辑待办",
      empty: "还没有任务。在下方添加一条简洁待办吧。",
      hour: "小时",
      inOneHour: "1小时后",
      inThirtyMinutes: "30分钟后",
      minute: "分钟",
      month: "月份",
      nextMonth: "下个月",
      notScheduled: "未设置",
      openCalendar: "\u6253\u5f00\u5f85\u529e\u65e5\u5386",
      addGroup: "\u6dfb\u52a0\u5f85\u529e\u5206\u7ec4",
      allDone: "\u5168\u90e8\u5b8c\u6210",
      allGroups: "\u5168\u90e8",
      bulkComplete: "\u5b8c\u6210\u6240\u9009",
      bulkCompleteConfirm: "\u5b8c\u6210",
      bulkCompleteDialogBody: (count) => `\u786e\u8ba4\u5b8c\u6210 ${count} \u4e2a\u6240\u9009\u5f85\u529e\uff1f`,
      bulkCompleteDialogTitle: "\u5b8c\u6210\u6240\u9009\u5f85\u529e",
      bulkDateConfirm: "\u66f4\u6539\u65e5\u671f",
      bulkDateDialogBody: (count) => `\u5c06 ${count} \u4e2a\u6240\u9009\u5f85\u529e\u79fb\u5230\u8fd9\u4e2a\u65e5\u671f\uff1f`,
      bulkDateDialogTitle: "\u66f4\u6539\u6240\u9009\u65e5\u671f",
      bulkDelete: "\u5220\u9664\u6240\u9009",
      bulkDeleteConfirm: "\u5220\u9664",
      bulkDeleteDialogBody: (count) => `\u786e\u8ba4\u5220\u9664 ${count} \u4e2a\u6240\u9009\u5f85\u529e\uff1f\u6b64\u64cd\u4f5c\u65e0\u6cd5\u64a4\u9500\u3002`,
      bulkDeleteDialogTitle: "\u5220\u9664\u6240\u9009\u5f85\u529e",
      bulkSetDate: "\u8bbe\u5b9a\u65e5\u671f",
      changeTodoDate: "\u66f4\u6539\u5f85\u529e\u65e5\u671f",
      exitSelection: "\u9000\u51fa\u590d\u9009",
      filteredEmpty: "\u5f53\u524d\u5206\u7ec4\u7b5b\u9009\u4e0b\u6ca1\u6709\u5339\u914d\u7684\u5f85\u529e\u3002",
      filterGroups: "\u7b5b\u9009\u5f85\u529e\u5206\u7ec4",
      filterDialogSubtitle: "\u9009\u62e9\u5728 Todos \u4e2d\u9700\u8981\u663e\u793a\u7684\u5206\u7ec4\u3002",
      filterDialogTitle: "\u7b5b\u9009\u5f85\u529e\u5206\u7ec4",
      changeGroup: "\u66f4\u6539\u5f85\u529e\u5206\u7ec4",
      changeGroupColor: "\u66f4\u6539\u5206\u7ec4\u989c\u8272",
      createGroup: "\u521b\u5efa\u5206\u7ec4",
      createGroupTitle: "\u521b\u5efa\u5206\u7ec4",
      deleteGroupAction: "\u5220\u9664\u5206\u7ec4",
      deleteGroup: (name) => `\u5220\u9664\u5206\u7ec4 ${name}`,
      editGroup: (name) => `\u7f16\u8f91\u5206\u7ec4 ${name}`,
      editGroupTitle: "\u7f16\u8f91\u5206\u7ec4",
      group: "\u5206\u7ec4",
      groupColor: "\u5206\u7ec4\u989c\u8272",
      groupFeatureComingSoon: "\u7ba1\u7406\u5206\u7ec4",
      groupManagerTitle: "\u7ba1\u7406\u5f85\u529e\u5206\u7ec4",
      groupName: "\u5206\u7ec4\u540d\u79f0",
      groupNameDuplicate: "\u5206\u7ec4\u540d\u79f0\u5fc5\u987b\u552f\u4e00\u3002",
      groupNameRequired: "\u65b0\u7ec4\u540d\u4e0d\u80fd\u4e3a\u7a7a\u3002",
      groupNamePlaceholder: "\u8f93\u5165\u5206\u7ec4\u540d\u79f0",
      groupTotal: (count) => `\u5f53\u524d\u5171 ${count} \u4e2a\u5206\u7ec4`,
      groupsEmpty: "\u8fd8\u6ca1\u6709\u81ea\u5b9a\u4e49\u5f85\u529e\u5206\u7ec4\u3002\u5728\u8fd9\u91cc\u521b\u5efa\u540e\uff0c\u53ef\u4ece\u5f85\u529e\u5361\u7247\u5206\u914d\u3002",
      items: (count) => `${count} \u4e2a\u5f85\u529e`,
      multiSelect: "\u590d\u9009\u5f85\u529e",
      selectTodo: (title) => `\u9009\u4e2d ${title}`,
      noGroup: "\u672a\u5206\u7ec4",
      selectedCount: (count) => `\u5df2\u9009 ${count} \u4e2a`,
      toolbarLabel: "\u5f85\u529e\u64cd\u4f5c",
      pickDateTime: "\u9009\u62e9\u65f6\u95f4",
      precise: "精确",
      previousMonth: "上个月",
      quickAdd: "快速添加",
      quickAddPlaceholder: "Enter \u6dfb\u52a0\u5f85\u529e\n\u70b9\u51fb\u5f85\u529e\u53ef\u7f16\u8f91",
      quickAddSubmitTooltip: "Enter \u6dfb\u52a0 \u00b7 Shift+Enter \u6362\u884c",
      quickShortcutsTitle: "快捷选择",
      reminder: "提醒",
      reminderPastError: "提醒时间必须晚于当前时间。",
      reminderPastTooltip: "已过时",
      reminderExpiredTooltip: "该提醒已经过时",
      notificationPermissionTitle: "通知权限未开启",
      notificationPermissionBody: "提醒已保存，但 StickIt 暂时无法发送通知。请在系统设置中开启通知权限。",
      notificationPermissionOpenSettings: "打开系统设置",
      notSameDay: "非当日",
      reorder: "重新排序待办",
      restoreTask: "恢复任务",
      save: "保存",
      scheduledFor: "计划提醒时间",
      selectAllTodos: "全选待办",
      setReminder: "设置提醒",
      specificTimeTitle: "具体时间",
      statusDone: "已完成",
      statusUndone: "未完成",
      today: "\u4eca\u5929",
      tomorrow: "明天",
      tomorrowMorning: "明天 09:00",
      tomorrowTimePrompt: "已选择明天，请继续选择具体时分。",
      evening: "晚上",
      titleLabel: "待办标题",
      titlePlaceholder: "更新任务标题",
      undoneCount: (count) => `${count} 项未完成`,
      year: "年份",
      yesterday: "\u6628\u5929",
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
