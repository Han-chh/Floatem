export type HelpContentContext = {
  appName: string;
  defaultSectionLabel: string;
  hotkey: string;
  isNativeHost: boolean;
  language: "en" | "zh-CN";
  motionLabel: string;
  reminderSoundLabel: string;
  timeFormatLabel: string;
  timeZoneLabel: string;
};

export type HelpArticleGroup = {
  id: string;
  title: string;
  items: string[];
};

export type HelpArticle = {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  highlights: string[];
  groups: HelpArticleGroup[];
};

export type HelpSection = {
  id: "overview" | "notes" | "todos" | "settings" | "shortcuts";
  title: string;
  summary: string;
  articles: HelpArticle[];
};

export type HelpDialogContent = {
  title: string;
  subtitle: string;
  heroBadge: string;
  sections: HelpSection[];
};

export function buildHelpDialogContent(context: HelpContentContext): HelpDialogContent {
  return context.language === "zh-CN" ? buildChineseHelpContent(context) : buildEnglishHelpContent(context);
}

function buildEnglishHelpContent(context: HelpContentContext): HelpDialogContent {
  return {
    title: `${context.appName} guide`,
    subtitle: "Open a topic to see the details in a dedicated second layer.",
    heroBadge: "Quick help",
    sections: [
      {
        id: "overview",
        title: "Overview",
        summary: "How the floating panel opens, switches, and stays configured.",
        articles: [
          {
            id: "overview-panel",
            eyebrow: "Start here",
            title: "Panel flow and current setup",
            summary: "QuickNote is a lightweight floating space for notes and date-based todos.",
            highlights: [context.hotkey, context.defaultSectionLabel, context.timeZoneLabel],
            groups: [
              {
                id: "overview-basics",
                title: "Basics",
                items: [
                  `Use ${context.hotkey} to summon or hide ${context.appName}.`,
                  "Switch between Notes and Todos from the top tabs.",
                  "Use the long fold control to collapse the header and free more vertical space.",
                ],
              },
              {
                id: "overview-current",
                title: "Current setup",
                items: [
                  `Default section: ${context.defaultSectionLabel}.`,
                  `Timezone: ${context.timeZoneLabel}.`,
                  `Time format: ${context.timeFormatLabel}.`,
                ],
              },
            ],
          },
        ],
      },
      {
        id: "notes",
        title: "Notes",
        summary: "Create cards, fold them, format text, and organize by group.",
        articles: [
          {
            id: "notes-workflow",
            eyebrow: "Notes",
            title: "Write and organize note cards",
            summary: "Notes are designed for quick capture with just enough formatting and structure.",
            highlights: ["Add", "Fold", "Drag", "Group"],
            groups: [
              {
                id: "notes-cards",
                title: "Cards",
                items: [
                  "Add a card from the footer and edit title and body directly.",
                  "Fold a card to keep only its title visible in the stack.",
                  "Drag cards vertically to reorder them.",
                ],
              },
              {
                id: "notes-formatting",
                title: "Formatting and grouping",
                items: [
                  "Toolbar actions include bold, italic, underline, color, undo, and redo.",
                  "Copy and paste stay plain-text to keep notes clean.",
                  "Groups and filters help separate topics or projects.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "todos",
        title: "Todos",
        summary: "Plan by date, reorder open tasks, and use reminder and bulk tools.",
        articles: [
          {
            id: "todos-workflow",
            eyebrow: "Todos",
            title: "Plan tasks around a day",
            summary: "Todos stay anchored to the selected day for quick daily planning.",
            highlights: ["Calendar", "Enter submit", "Bulk actions", "Reminders"],
            groups: [
              {
                id: "todos-daily",
                title: "Daily flow",
                items: [
                  "Use the date card to open the calendar and switch days.",
                  "Press Enter to submit a todo and Shift+Enter to add a new line.",
                  "Open todos can be dragged to reorder within the day.",
                ],
              },
              {
                id: "todos-tools",
                title: "Tools",
                items: [
                  "Selection mode supports bulk complete, bulk date change, and bulk delete.",
                  "Groups and filters help narrow the visible task list.",
                  context.isNativeHost
                    ? "Reminder times can be scheduled through the native host."
                    : "Reminder UI is available in preview, but native scheduling needs the desktop host.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "settings",
        title: "Settings",
        summary: "Adjust launch behavior, language, motion, and reminder sound.",
        articles: [
          {
            id: "settings-workflow",
            eyebrow: "Settings",
            title: "Adjust how QuickNote opens and feels",
            summary: "Settings keep behavior, localization, and motion controls in one place.",
            highlights: [context.motionLabel, context.reminderSoundLabel],
            groups: [
              {
                id: "settings-general",
                title: "General",
                items: [
                  "Choose whether QuickNote opens to the last section, Notes, or Todos.",
                  "Switch language, timezone, and time format independently from the system.",
                  "Review the current summon shortcut in the shortcuts section.",
                ],
              },
              {
                id: "settings-feedback",
                title: "Feel and reminders",
                items: [
                  `Current motion profile: ${context.motionLabel}.`,
                  `Reminder sound: ${context.reminderSoundLabel}.`,
                  "Restore defaults when you want a clean reset.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "shortcuts",
        title: "Shortcuts",
        summary: "A quick reminder of the highest-value keyboard actions.",
        articles: [
          {
            id: "shortcuts-core",
            eyebrow: "Shortcuts",
            title: "Key shortcuts",
            summary: "QuickNote keeps its keyboard actions compact and predictable.",
            highlights: ["Cmd/Ctrl+B", "Cmd/Ctrl+Z", "Enter", "Escape"],
            groups: [
              {
                id: "shortcuts-notes",
                title: "Notes editor",
                items: [
                  "Cmd/Ctrl+B, I, and U toggle bold, italic, and underline.",
                  "Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z handle undo and redo.",
                  "Cmd/Ctrl+A, C, and V work inside note editing fields.",
                ],
              },
              {
                id: "shortcuts-todos",
                title: "Todos and dialogs",
                items: [
                  "Enter submits the quick todo draft and Shift+Enter adds a new line.",
                  "Escape closes todo dialogs and modal flows.",
                  `Global shortcut: ${context.hotkey}.`,
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

function buildChineseHelpContent(context: HelpContentContext): HelpDialogContent {
  return {
    title: `${context.appName} 使用指南`,
    subtitle: "一级面板负责导航，点击模块后在二级对话框查看细节。",
    heroBadge: "快速帮助",
    sections: [
      {
        id: "overview",
        title: "总览",
        summary: "了解面板如何打开、切换，以及当前配置状态。",
        articles: [
          {
            id: "overview-panel",
            eyebrow: "先看这里",
            title: "面板流转与当前配置",
            summary: "QuickNote 是一个用于快速记录便签和日期待办的悬浮工作区。",
            highlights: [context.hotkey, context.defaultSectionLabel, context.timeZoneLabel],
            groups: [
              {
                id: "overview-basics",
                title: "基础说明",
                items: [
                  `使用 ${context.hotkey} 可以唤起或隐藏 ${context.appName}。`,
                  "通过顶部标签可以在 Notes 和 Todos 之间切换。",
                  "通过加长折叠条可以收起顶部区域，腾出更多纵向空间。",
                ],
              },
              {
                id: "overview-current",
                title: "当前配置",
                items: [
                  `默认分区：${context.defaultSectionLabel}。`,
                  `时区：${context.timeZoneLabel}。`,
                  `时间格式：${context.timeFormatLabel}。`,
                ],
              },
            ],
          },
        ],
      },
      {
        id: "notes",
        title: "Notes",
        summary: "创建卡片、折叠内容、格式化文字，并通过分组整理。",
        articles: [
          {
            id: "notes-workflow",
            eyebrow: "Notes",
            title: "记录并整理便签卡片",
            summary: "Notes 强调快速输入、轻量格式和可视化整理。",
            highlights: ["新增", "折叠", "拖拽", "分组"],
            groups: [
              {
                id: "notes-cards",
                title: "卡片",
                items: [
                  "通过底部新增按钮创建卡片，并直接编辑标题与正文。",
                  "折叠卡片后只保留标题，方便快速浏览。",
                  "支持垂直拖拽排序。",
                ],
              },
              {
                id: "notes-formatting",
                title: "格式与分组",
                items: [
                  "工具栏支持粗体、斜体、下划线、颜色、撤销和重做。",
                  "复制和粘贴保持为纯文本，避免外部样式污染。",
                  "通过分组和筛选整理不同主题或项目。",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "todos",
        title: "Todos",
        summary: "围绕日期规划任务，并使用提醒与批量工具。",
        articles: [
          {
            id: "todos-workflow",
            eyebrow: "Todos",
            title: "围绕日期规划任务",
            summary: "Todos 以选中日期为中心，适合做每日整理。",
            highlights: ["日历", "Enter 提交", "批量操作", "提醒"],
            groups: [
              {
                id: "todos-daily",
                title: "日常流程",
                items: [
                  "通过日期卡片打开日历并切换日期。",
                  "按 Enter 提交待办，Shift+Enter 换行。",
                  "未完成待办支持拖拽排序。",
                ],
              },
              {
                id: "todos-tools",
                title: "工具能力",
                items: [
                  "多选模式支持批量完成、批量改日期和批量删除。",
                  "分组和筛选可以缩小当前可见任务范围。",
                  context.isNativeHost ? "提醒时间可由桌面宿主调度。" : "预览环境可查看提醒界面，但系统调度需要桌面宿主。",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "settings",
        title: "Settings",
        summary: "调整启动方式、语言、动效和提醒声音。",
        articles: [
          {
            id: "settings-workflow",
            eyebrow: "Settings",
            title: "调整 QuickNote 的打开方式与体验",
            summary: "设置集中管理行为、语言与动效控制。",
            highlights: [context.motionLabel, context.reminderSoundLabel],
            groups: [
              {
                id: "settings-general",
                title: "基础设置",
                items: [
                  "可以设置打开时进入上次分区、Notes 或 Todos。",
                  "可以独立切换语言、时区和时间格式。",
                  "当前唤起快捷键可在快捷键区域查看。",
                ],
              },
              {
                id: "settings-feedback",
                title: "动效与提醒",
                items: [
                  `当前动效：${context.motionLabel}。`,
                  `提醒声音：${context.reminderSoundLabel}。`,
                  "如果想回到初始体验，可以恢复默认设置。",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "shortcuts",
        title: "快捷键",
        summary: "快速回顾最值得记住的键盘操作。",
        articles: [
          {
            id: "shortcuts-core",
            eyebrow: "快捷键",
            title: "关键快捷键",
            summary: "QuickNote 的快捷键尽量保持少而稳定。",
            highlights: ["Cmd/Ctrl+B", "Cmd/Ctrl+Z", "Enter", "Escape"],
            groups: [
              {
                id: "shortcuts-notes",
                title: "Notes 编辑器",
                items: [
                  "Cmd/Ctrl+B、I、U 分别对应粗体、斜体和下划线。",
                  "Cmd/Ctrl+Z 与 Cmd/Ctrl+Shift+Z 对应撤销和重做。",
                  "Cmd/Ctrl+A、C、V 可在便签编辑区域使用。",
                ],
              },
              {
                id: "shortcuts-todos",
                title: "Todos 与弹窗",
                items: [
                  "Enter 提交待办草稿，Shift+Enter 换行。",
                  "Escape 可关闭待办编辑弹窗与模态层。",
                  `全局快捷键：${context.hotkey}。`,
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}
