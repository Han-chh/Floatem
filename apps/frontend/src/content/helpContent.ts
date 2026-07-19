export type HelpContentContext = {
  appName: string;
  defaultSectionLabel: string;
  hotkey: string;
  isNativeHost: boolean;
  language: "en" | "zh-CN";
  motionLabel: string;
  platform: "web" | "macos" | "windows";
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
  id: "overview" | "notes" | "todos" | "floating" | "settings" | "shortcuts";
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
            summary: "StickIt is a lightweight floating space for notes and date-based todos.",
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
                  "The group control, edited time, and card actions share one compact header row.",
                  "Fold a card to keep its title and top row visible; a floating note also shrinks its window to fit.",
                  "Drag cards vertically to reorder them.",
                ],
              },
              {
                id: "notes-formatting",
                title: "Formatting and grouping",
                items: [
                  "Toolbar actions include bold, italic, underline, color, undo, and redo.",
                  "The formatting toolbar is attached to the editor; its expanded or folded state stays consistent between the panel and floating card.",
                  "Copy and paste stay plain-text to keep notes clean.",
                  "Groups and filters separate topics; assigned groups add a stronger colored border, rail, and card texture.",
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
                  "To create a todo, switch to Todos, press Enter to focus the quick-entry field, type the todo, then press Enter again to submit it.",
                  "Use Shift+Enter while typing when the todo needs a new line.",
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
      buildEnglishFloatingCardsSection(context),
      {
        id: "settings",
        title: "Settings",
        summary: "Adjust startup, themes, language, motion, particles, and reminders.",
        articles: [
          {
            id: "settings-workflow",
            eyebrow: "Settings",
            title: "Adjust how StickIt opens and feels",
            summary: "Settings keep behavior, localization, and motion controls in one place.",
            highlights: [context.motionLabel, context.reminderSoundLabel],
            groups: [
              {
                id: "settings-general",
                title: "General",
                items: [
                  "On macOS, choose whether StickIt launches automatically when you sign in.",
                  "Choose whether StickIt opens to the last section, Notes, or Todos.",
                  "Switch language, timezone, and time format independently from the system.",
                  "Choose Classic, Afterglow, Plum, Orchid, Forest, or Chrysanthemum; note and todo cards keep their classic initial color until grouped.",
                ],
              },
              {
                id: "settings-feedback",
                title: "Feel and reminders",
                items: [
                  `Current motion profile: ${context.motionLabel}.`,
                  `Reminder sound: ${context.reminderSoundLabel}.`,
                  "Particle feedback can be enabled or disabled independently.",
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
            summary: "StickIt keeps its keyboard actions compact and predictable.",
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
                  "On the Todos page, Enter focuses quick entry; type a todo and press Enter again to submit it.",
                  "Shift+Enter adds a new line while the quick-entry field is focused.",
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

function buildEnglishFloatingCardsSection(context: HelpContentContext): HelpSection {
  if (context.platform === "windows") {
    return {
      id: "floating",
      title: "Floating cards",
      summary: "Floating Notes & Todos are currently supported on macOS only.",
      articles: [
        {
          id: "floating-windows",
          eyebrow: "Platform",
          title: "Windows support status",
          summary: "Floating notes and todos are disabled on Windows in v0.5.0.",
          highlights: ["Windows", "Not supported", "v0.5.0"],
          groups: [
            {
              id: "floating-windows-status",
              title: "Current status",
              items: [
                "Floating Notes & Todos are currently supported on macOS only.",
                "They are disabled on Windows in v0.5.0 due to rendering/composition instability.",
                "Windows keeps the stable v0.4.5 notes/todos behavior.",
                "Windows floating support will require a separate architecture redesign in a future release.",
              ],
            },
          ],
        },
      ],
    };
  }

  if (context.platform === "macos") {
    return {
      id: "floating",
      title: "Floating cards",
      summary: "Tear notes and todos out of the panel, keep them on screen, and dock them back later.",
      articles: [
        {
          id: "floating-macos",
          eyebrow: "macOS",
          title: "Float notes and todos",
          summary: "On macOS, notes and todos can live in their own always-on-top card windows.",
          highlights: ["Drag out", "Edit live", "Dock back", "Multiple cards"],
          groups: [
            {
              id: "floating-start",
              title: "Create a floating card",
              items: [
                "Drag a note card or an open todo away from the list, then release it outside the panel.",
                "The item opens as its own floating card and is hidden from the main list while it is floating.",
                "Multiple notes and todos can be floating at the same time.",
              ],
            },
            {
              id: "floating-work",
              title: "Work inside floating cards",
              items: [
                "Floating notes support title and body editing, formatting, group changes, color, and the same toolbar state as the main panel.",
                "Folding a floating note shrinks the window to its title and top row; expanding restores its previous custom size.",
                "Floating todos support group changes, reminder changes, completion, and the same status colors as the main list.",
                "Completing a floating todo saves it, then docks and closes the floating card after a short delay.",
              ],
            },
            {
              id: "floating-dock",
              title: "Move, dock, and close",
              items: [
                "Drag a floating card by its non-editing surface to move it around the screen.",
                "Drag it back onto the StickIt panel; the panel highlights as a dock zone, then release inside to dock it.",
                "Click the close control on the floating card to dock it back into the main panel without deleting it.",
                "Use the diagonal pin control to keep a card on the desktop; pinned cards and their custom sizes are restored after relaunch.",
                "Desktop-pinned cards are StickIt windows, so StickIt must keep running in the background. Enable Open StickIt at login to restore them after restarting your Mac.",
                "Resize horizontally, vertically, or diagonally from the expanded lower-right drag area; card text and controls adapt to the new size.",
              ],
            },
          ],
        },
      ],
    };
  }

  return {
    id: "floating",
    title: "Floating cards",
    summary: "Floating notes and todos need the macOS desktop host.",
    articles: [
      {
        id: "floating-web",
        eyebrow: "Preview",
        title: "Desktop-only feature",
        summary: "Browser preview cannot open native floating card windows.",
        highlights: ["macOS desktop", "Native windows"],
        groups: [
          {
            id: "floating-web-status",
            title: "Availability",
            items: [
              "Floating note cards and floating todo cards are available in the macOS desktop app.",
              "Browser preview cannot create separate always-on-top card windows.",
              "On Windows, floating notes and todos are disabled in v0.5.0.",
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
            summary: "StickIt 是一个用于快速记录便签和日期待办的悬浮工作区。",
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
                  `时间格式：${context.timeFormatLabel}`,
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
                  "分组入口、编辑时间与卡片操作位于同一条紧凑的顶部信息行。",
                  "折叠后只保留标题与顶部信息行；悬浮 note 的窗口也会同步收紧。",
                  "支持垂直拖拽排序。",
                ],
              },
              {
                id: "notes-formatting",
                title: "格式与分组",
                items: [
                  "工具栏支持粗体、斜体、下划线、颜色、撤销和重做。",
                  "格式工具栏与正文输入框连为一体，其展开或折叠状态会在主面板与悬浮卡片之间保持一致。",
                  "复制和粘贴保持为纯文本，避免外部样式污染。",
                  "通过分组和筛选整理主题；选择分组后，卡片会显示更明显的彩色边框、侧边色轨和装饰纹理。",
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
                  "创建 todo 时，只需切换到 Todos 页面，按一次 Enter 获取快速输入焦点，输入 todo，再按一次 Enter 提交。",
                  "输入过程中需要换行时使用 Shift+Enter。",
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
      buildChineseFloatingCardsSection(context),
      {
        id: "settings",
        title: "设置选项",
        summary: "调整启动方式、主题、语言、动效、粒子反馈和提醒。",
        articles: [
          {
            id: "settings-workflow",
            eyebrow: "设置选项",
            title: "调整 StickIt 的打开方式与体验",
            summary: "设置集中管理行为、语言与动效控制。",
            highlights: [context.motionLabel, context.reminderSoundLabel],
            groups: [
              {
                id: "settings-general",
                title: "基础设置",
                items: [
                  "macOS 可设置登录系统时自动启动 StickIt。",
                  "可以设置打开时进入上次分区、Notes 或 Todos。",
                  "可以独立切换语言、时区和时间格式。",
                  "主题可选择经典、浮光、梅、兰、竹、菊；未分组的 note 与 todo 初始卡片色保持经典色。",
                ],
              },
              {
                id: "settings-feedback",
                title: "动效与提醒",
                items: [
                  `当前动效：${context.motionLabel}。`,
                  `提醒声音：${context.reminderSoundLabel}。`,
                  "粒子反馈可独立开启或关闭。",
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
            summary: "StickIt 的快捷键尽量保持少而稳定。",
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
                  "在 Todos 页面按 Enter 聚焦快速输入框，输入 todo 后再按 Enter 提交。",
                  "快速输入框获得焦点后，Shift+Enter 可以换行。",
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

function buildChineseFloatingCardsSection(context: HelpContentContext): HelpSection {
  if (context.platform === "windows") {
    return {
      id: "floating",
      title: "悬浮卡片",
      summary: "Floating Notes & Todos 当前仅支持 macOS。",
      articles: [
        {
          id: "floating-windows",
          eyebrow: "平台状态",
          title: "Windows 支持状态",
          summary: "Windows 端在 v0.5.0 中禁用悬浮 Notes 和 Todos。",
          highlights: ["Windows", "暂不支持", "v0.5.0"],
          groups: [
            {
              id: "floating-windows-status",
              title: "当前状态",
              items: [
                "Floating Notes & Todos 当前仅支持 macOS。",
                "由于渲染和窗口合成不稳定，Windows 端在 v0.5.0 中禁用该功能。",
                "Windows 端会保留稳定的 v0.4.5 Notes 和 Todos 行为。",
                "未来的 Windows 悬浮支持需要在独立的架构重设计分支中开发。",
              ],
            },
          ],
        },
      ],
    };
  }

  if (context.platform === "macos") {
    return {
      id: "floating",
      title: "悬浮卡片",
      summary: "把 Notes 和 Todos 从主面板拖出，保留在屏幕上，需要时再收回。",
      articles: [
        {
          id: "floating-macos",
          eyebrow: "macOS",
          title: "悬浮 Notes 与 Todos",
          summary: "在 macOS 上，Notes 和 Todos 可以作为独立置顶卡片停留在屏幕上。",
          highlights: ["拖出悬浮", "实时编辑", "拖回收纳", "多卡片"],
          groups: [
            {
              id: "floating-start",
              title: "创建悬浮卡片",
              items: [
                "将一个 note 卡片或未完成 todo 从列表中拖出，并在面板外松开。",
                "该项目会打开为独立悬浮卡片，并在悬浮期间从主列表中隐藏，避免重复显示。",
                "可以同时悬浮多个 notes 和 todos。",
              ],
            },
            {
              id: "floating-work",
              title: "在悬浮卡片中操作",
              items: [
                "悬浮 note 支持编辑标题和正文、文字格式、分组与颜色，并与主面板保持相同的工具栏状态。",
                "折叠悬浮 note 时，窗口会收紧到标题与顶部信息行；重新展开后恢复折叠前的自定义尺寸。",
                "悬浮 todo 支持更改分组、修改提醒、切换完成状态，并保留主列表中的状态颜色。",
                "在悬浮 todo 中标记完成后，会先保存状态，然后在短暂延迟后自动收回并关闭悬浮卡片。",
              ],
            },
            {
              id: "floating-dock",
              title: "移动、收回与关闭",
              items: [
                "按住悬浮卡片的非编辑区域可以在屏幕上移动卡片。",
                "把悬浮卡片拖回 StickIt 主面板时，面板会显示收纳区域；在面板内松开即可收回。",
                "点击悬浮卡片上的关闭按钮会把卡片收回主面板，不会删除对应 note 或 todo。",
                "点击斜向图钉可把卡片固定在桌面；重新启动应用后会恢复固定卡片及其自定义尺寸。",
                "桌面置顶卡片是 StickIt 创建的窗口，必须让 StickIt 在后台保持运行；开启“登录时打开 StickIt”后，重新启动 Mac 会自动恢复这些卡片。",
                "通过右下角扩大的拖动区域横向、纵向或斜向调整尺寸，文字、按钮和组件会随新尺寸自适应。",
              ],
            },
          ],
        },
      ],
    };
  }

  return {
    id: "floating",
    title: "悬浮卡片",
    summary: "悬浮 Notes 和 Todos 需要 macOS 桌面宿主。",
    articles: [
      {
        id: "floating-web",
        eyebrow: "预览环境",
        title: "仅桌面端可用",
        summary: "浏览器预览无法创建原生悬浮卡片窗口。",
        highlights: ["macOS 桌面端", "原生窗口"],
        groups: [
          {
            id: "floating-web-status",
            title: "可用性",
            items: [
              "悬浮 note 卡片和悬浮 todo 卡片可在 macOS 桌面应用中使用。",
              "浏览器预览无法创建独立置顶卡片窗口。",
              "Windows 端在 v0.5.0 中禁用悬浮 Notes 和 Todos。",
            ],
          },
        ],
      },
    ],
  };
}
