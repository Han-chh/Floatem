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
  interactiveGuide: {
    action: string;
    body: string;
    title: string;
  };
  sections: HelpSection[];
};

export function buildHelpDialogContent(context: HelpContentContext): HelpDialogContent {
  return context.language === "zh-CN" ? buildChineseHelpContent(context) : buildEnglishHelpContent(context);
}

function buildEnglishHelpContent(context: HelpContentContext): HelpDialogContent {
  return {
    title: `${context.appName} guide`,
    subtitle: "Choose a topic for concise guidance based on the app’s current behavior.",
    heroBadge: "Quick help",
    interactiveGuide: {
      title: "Try the interactive guide",
      body: "Practice seven complete workflows in the real app. When you finish or exit, practice items are removed and temporary changes are restored.",
      action: "Start interactive guide",
    },
    sections: [
      {
        id: "overview",
        title: "Overview",
        summary: "Open the panel, move between workspaces, and recover or quit the app.",
        articles: [
          {
            id: "overview-panel",
            eyebrow: "Start here",
            title: "Use the Floatem panel",
            summary: "Floatem is a lightweight workspace for rich-text notes and date-based todos.",
            highlights: [context.hotkey, context.defaultSectionLabel, context.timeZoneLabel],
            groups: [
              {
                id: "overview-basics",
                title: "Basics",
                items: [
                  `Use ${context.hotkey} to show or hide ${context.appName}.`,
                  "Switch between Notes and Todos from the tabs at the top.",
                  "Use the navigation fold button to make more room for cards; click it again to restore the full header.",
                ],
              },
              ...(context.platform === "macos"
                ? [
                    {
                      id: "overview-access",
                      title: "Menu bar and recovery",
                      items: [
                        "Floatem runs without a Dock icon. Use the Floatem icon on the right side of the menu bar to access it at any time.",
                        "The first menu item changes between Show Floatem and Hide Floatem to match the panel’s current state.",
                        "If the interface becomes unresponsive, choose Reload Interface from the menu-bar menu; Floatem reloads the interface and shows the panel.",
                        "Quit from the menu-bar menu, the Settings home, or the compact menu that appears when you right-click inside the main window or a floating card.",
                      ],
                    },
                  ]
                : []),
              {
                id: "overview-current",
                title: "Current setup",
                items: [
                  `Default workspace: ${context.defaultSectionLabel}.`,
                  `Time zone: ${context.timeZoneLabel}.`,
                  `Time display: ${context.timeFormatLabel.replace(/[.!?。！？]+$/u, "")}.`,
                ],
              },
            ],
          },
        ],
      },
      {
        id: "notes",
        title: "Notes",
        summary: "Capture rich text, arrange cards, and organize notes with groups and filters.",
        articles: [
          {
            id: "notes-workflow",
            eyebrow: "Notes",
            title: "Write and organize note cards",
            summary: "Notes combine direct editing, focused formatting, and lightweight visual organization.",
            highlights: ["Rich text", "Fold", "Reorder", "Groups"],
            groups: [
              {
                id: "notes-cards",
                title: "Cards",
                items: [
                  "Add a note from the footer, then edit its title and body directly on the card.",
                  "The compact top row contains the group, last-edited time, desktop-pin control, fold control, and delete or dock action when available.",
                  "Fold a note to keep only its title and top row visible. A floating note also reduces its window height to fit the folded card.",
                  "Drag a card vertically to reorder it; deleting a card permanently removes that note.",
                ],
              },
              {
                id: "notes-formatting",
                title: "Formatting and grouping",
                items: [
                  "The toolbar provides bold, italic, underline, text color, copy, paste, clear formatting, undo, and redo.",
                  "The toolbar is attached to the body editor. Its expanded or collapsed state stays consistent between the main panel and the same floating note.",
                  "Copy preserves supported rich-text styles and includes a plain-text fallback. Paste keeps supported incoming formatting instead of applying the toolbar’s currently selected style.",
                  "Create, rename, recolor, or delete groups, and use filters to control which notes are visible. Assigned groups add a colored border, side rail, and card texture.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "todos",
        title: "Todos",
        summary: "Plan by date, reorder active tasks, schedule reminders, and use bulk actions.",
        articles: [
          {
            id: "todos-workflow",
            eyebrow: "Todos",
            title: "Plan tasks around a day",
            summary: "Todos stay attached to a selected date while groups, reminders, and status colors keep the list readable.",
            highlights: ["Calendar", "Quick entry", "Reminders", "Bulk actions"],
            groups: [
              {
                id: "todos-daily",
                title: "Daily flow",
                items: [
                  "Use the date card to open the calendar and switch days.",
                  "On the Todos page, press Enter to focus quick entry, type the task, then press Enter again or click the submit control to create it.",
                  "Use Shift+Enter for a new line. Active todos can be edited and dragged to reorder within the selected day.",
                  "Click the completion circle to complete or restore a todo; completed, overdue, today, and upcoming states use distinct visual treatments.",
                ],
              },
              {
                id: "todos-tools",
                title: "Organization and reminders",
                items: [
                  "Selection mode supports bulk completion, date changes, and deletion.",
                  "Create and manage groups, assign a todo to a group, and filter the list by group.",
                  context.isNativeHost
                    ? "Set, change, or remove a future reminder. Floatem schedules it as a system notification in the selected time zone."
                    : "You can explore reminder controls in preview, but system notification scheduling requires the desktop app.",
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
        summary: "Control startup, appearance, shortcuts, motion, notifications, and app information.",
        articles: [
          {
            id: "settings-workflow",
            eyebrow: "Settings",
            title: "Configure Floatem",
            summary: "Settings are grouped by purpose so everyday behavior and recovery actions remain easy to find.",
            highlights: [context.motionLabel, context.reminderSoundLabel],
            groups: [
              {
                id: "settings-behavior",
                title: "General, themes, and shortcuts",
                items: [
                  "General controls launch at login, interface language, time zone, and 12- or 24-hour time display.",
                  "Choose Classic, Afterglow, Plum, Orchid, Bamboo, or Chrysanthemum. Ungrouped note and todo cards keep the classic card color.",
                  `Shortcuts lets you change the global summon shortcut, review background activity, and choose whether ${context.appName} opens to the last workspace, Notes, or Todos.`,
                  "If the global shortcut cannot be registered, Floatem shows a persistent conflict warning so you can choose another combination.",
                ],
              },
              {
                id: "settings-feedback",
                title: "Motion, notifications, and app actions",
                items: [
                  `Current motion profile: ${context.motionLabel}.`,
                  `Reminder sound: ${context.reminderSoundLabel}.`,
                  "Motion settings control the page transition, transition speed, and particle feedback. Notification settings control reminder sound, system permission access, and test notifications.",
                  "About Floatem explains feature and data scope and provides support links. Restore Defaults and Quit Floatem remain available from the Settings home.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "shortcuts",
        title: "Shortcuts",
        summary: "A compact reference for global access, note editing, and todo entry.",
        articles: [
          {
            id: "shortcuts-core",
            eyebrow: "Shortcuts",
            title: "Key shortcuts",
            summary: "Keyboard actions follow familiar editing conventions and stay focused on frequent tasks.",
            highlights: ["Cmd/Ctrl+B", "Cmd/Ctrl+Z", "Enter", "Escape"],
            groups: [
              {
                id: "shortcuts-notes",
                title: "Notes editor",
                items: [
                  "Cmd/Ctrl+B, I, and U toggle bold, italic, and underline.",
                  "Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z handle undo and redo.",
                  "Cmd/Ctrl+A, C, and V work inside note editing fields; supported formatting is preserved through rich-text copy and paste.",
                ],
              },
              {
                id: "shortcuts-todos",
                title: "Todos and dialogs",
                items: [
                  "On the Todos page, Enter focuses quick entry; type a todo and press Enter again to submit it.",
                  "Shift+Enter adds a new line while the quick-entry field is focused.",
                  "Escape closes supported dialogs and modal flows.",
                  `Use ${context.hotkey} from another app to show or hide Floatem.`,
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
      summary: "Floating note and todo windows are available in the macOS desktop app.",
      articles: [
        {
          id: "floating-windows",
          eyebrow: "Platform",
          title: "Windows availability",
          summary: "Notes and todos remain in the main Floatem window on Windows.",
          highlights: ["Windows", "Main window", "No floating cards"],
          groups: [
            {
              id: "floating-windows-status",
              title: "Current behavior",
              items: [
                "Create, edit, group, filter, and reorder notes and todos in the main Floatem window.",
                "Dragging cards into separate native floating windows is not available on Windows.",
                "Native floating-window support requires a platform-specific window and composition implementation.",
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
      summary: "Drag notes and todos out of the panel, work with them independently, and dock them back later.",
      articles: [
        {
          id: "floating-macos",
          eyebrow: "macOS",
          title: "Float notes and todos",
          summary: "On macOS, notes and todos can live in their own resizable card windows.",
          highlights: ["Drag out", "Edit live", "Pin to desktop", "Dock back"],
          groups: [
            {
              id: "floating-start",
              title: "Create a floating card",
              items: [
                "Drag a note card or an active todo away from the list, then release it outside the panel.",
                "The item opens as its own floating card and is hidden from the main list while it is floating.",
                "Float multiple notes and todos at the same time, then edit them without reopening the main panel.",
              ],
            },
            {
              id: "floating-work",
              title: "Work inside floating cards",
              items: [
                "Floating notes support title and body editing, rich-text formatting, group changes, and the same toolbar state as the main panel.",
                "Folding a floating note shrinks the window to its title and top row; expanding restores its previous custom size.",
                "Floating todos support text editing, group and reminder changes, completion, and the same status colors as the main list.",
                "Completing a floating todo saves it, then docks and closes the floating card after a short delay.",
              ],
            },
            {
              id: "floating-dock",
              title: "Move, dock, pin, and resize",
              items: [
                "Drag a floating card by a non-editing surface to move it around the screen.",
                "Drag it onto the Floatem panel; the panel highlights as a dock zone, then release inside to return the card to its list.",
                "The close control returns the card to the main panel without deleting its note or todo.",
                "Use the diagonal pin control to keep a card on the desktop across Spaces; pinned cards, positions, and custom sizes are restored after relaunch.",
                "Desktop-pinned cards require Floatem to keep running. Enable Open Floatem at Login if you want them restored after restarting your Mac.",
                "Resize from the expanded lower-right drag area; text and controls adapt to the available card size.",
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
    summary: "Separate floating note and todo windows require the macOS desktop app.",
    articles: [
      {
        id: "floating-web",
        eyebrow: "Preview",
        title: "Desktop-only feature",
        summary: "Browser preview cannot create native floating card windows.",
        highlights: ["macOS desktop", "Native windows"],
        groups: [
          {
            id: "floating-web-status",
            title: "Availability",
            items: [
              "Floating note and todo cards are available in the macOS desktop app.",
              "Browser preview cannot create separate native card windows.",
              "On Windows, notes and todos remain inside the main Floatem window.",
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
    subtitle: "选择一个主题，查看与当前应用行为一致的简明说明。",
    heroBadge: "快速帮助",
    interactiveGuide: {
      title: "体验交互式指引",
      body: "在真实应用中练习七套完整流程。完成或退出指引后，练习数据会被删除，临时更改也会恢复。",
      action: "开始交互式指引",
    },
    sections: [
      {
        id: "overview",
        title: "总览",
        summary: "打开面板、切换工作区，并在需要时重新加载或退出应用。",
        articles: [
          {
            id: "overview-panel",
            eyebrow: "先看这里",
            title: "使用 Floatem 面板",
            summary: "Floatem 是一个用于富文本便签和日期待办的轻量工作区。",
            highlights: [context.hotkey, context.defaultSectionLabel, context.timeZoneLabel],
            groups: [
              {
                id: "overview-basics",
                title: "基础操作",
                items: [
                  `使用 ${context.hotkey} 显示或隐藏 ${context.appName}。`,
                  "通过顶部标签在 Notes 和 Todos 之间切换。",
                  "使用导航栏折叠按钮为卡片腾出更多空间；再次点击即可恢复完整顶部区域。",
                ],
              },
              ...(context.platform === "macos"
                ? [
                    {
                      id: "overview-access",
                      title: "菜单栏与故障恢复",
                      items: [
                        "Floatem 不会显示在 Dock 中。你可以随时从菜单栏右侧的 Floatem 图标访问应用。",
                        "菜单第一项会根据面板当前状态在“显示 Floatem”和“隐藏 Floatem”之间切换。",
                        "如果界面无响应，可从菜单栏菜单选择“重新加载界面”；Floatem 会重新载入界面并显示主面板。",
                        "可以从菜单栏菜单、设置首页，或在主窗口和悬浮卡片内右键出现的紧凑菜单退出 Floatem。",
                      ],
                    },
                  ]
                : []),
              {
                id: "overview-current",
                title: "当前设置",
                items: [
                  `默认工作区：${context.defaultSectionLabel}。`,
                  `时区：${context.timeZoneLabel}。`,
                  `时间显示：${context.timeFormatLabel.replace(/[.!?。！？]+$/u, "")}。`,
                ],
              },
            ],
          },
        ],
      },
      {
        id: "notes",
        title: "Notes",
        summary: "记录富文本、调整卡片顺序，并使用分组和筛选整理便签。",
        articles: [
          {
            id: "notes-workflow",
            eyebrow: "Notes",
            title: "记录并整理便签卡片",
            summary: "Notes 将直接编辑、专注的格式工具和轻量视觉整理组合在一起。",
            highlights: ["富文本", "折叠", "排序", "分组"],
            groups: [
              {
                id: "notes-cards",
                title: "卡片操作",
                items: [
                  "从底部新增 note，然后直接在卡片上编辑标题和正文。",
                  "紧凑的顶部信息行会按场景显示分组、最后编辑时间、桌面固定、折叠，以及删除或收回操作。",
                  "折叠 note 后只保留标题和顶部信息行；悬浮 note 的窗口高度也会随折叠状态收紧。",
                  "垂直拖动卡片可以调整顺序；删除卡片会永久移除对应 note。",
                ],
              },
              {
                id: "notes-formatting",
                title: "格式与分组",
                items: [
                  "工具栏提供粗体、斜体、下划线、文字颜色、复制、粘贴、清除格式、撤销和重做。",
                  "工具栏与正文编辑器连为一体；同一张 note 在主面板和悬浮窗口中的展开或折叠状态保持一致。",
                  "复制会保留受支持的富文本样式并同时提供纯文本备用内容；粘贴会保留传入的受支持格式，不会套用工具栏当前选中的样式。",
                  "可以创建、重命名、改色或删除分组，并使用筛选控制可见 notes；已分组卡片会显示彩色边框、侧边色轨和卡片纹理。",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "todos",
        title: "Todos",
        summary: "按日期规划、调整未完成任务顺序、设置提醒并执行批量操作。",
        articles: [
          {
            id: "todos-workflow",
            eyebrow: "Todos",
            title: "围绕日期规划任务",
            summary: "Todos 归属于选中日期，并通过分组、提醒和状态颜色保持清晰。",
            highlights: ["日历", "快速输入", "提醒", "批量操作"],
            groups: [
              {
                id: "todos-daily",
                title: "日常流程",
                items: [
                  "通过日期卡片打开日历并切换日期。",
                  "在 Todos 页面按 Enter 聚焦快速输入框，输入任务后再次按 Enter，或点击提交控件完成创建。",
                  "使用 Shift+Enter 换行；未完成 todo 可以编辑，也可以在选中日期内拖拽排序。",
                  "点击完成圆圈可完成或恢复 todo；已完成、逾期、今天和未来状态使用不同的视觉样式。",
                ],
              },
              {
                id: "todos-tools",
                title: "整理与提醒",
                items: [
                  "多选模式支持批量完成、修改日期和删除。",
                  "可以创建和管理分组、为 todo 指定分组，并按分组筛选列表。",
                  context.isNativeHost
                    ? "可以设置、修改或移除未来提醒；Floatem 会按所选时区将其调度为系统通知。"
                    : "预览环境可以查看提醒控件，但调度系统通知需要桌面应用。",
                ],
              },
            ],
          },
        ],
      },
      buildChineseFloatingCardsSection(context),
      {
        id: "settings",
        title: "设置",
        summary: "管理启动、外观、快捷键、动效、通知和应用信息。",
        articles: [
          {
            id: "settings-workflow",
            eyebrow: "设置",
            title: "配置 Floatem",
            summary: "设置按用途分类，让日常行为和恢复操作都容易找到。",
            highlights: [context.motionLabel, context.reminderSoundLabel],
            groups: [
              {
                id: "settings-behavior",
                title: "通用、主题与快捷键",
                items: [
                  "通用设置包含登录时启动、界面语言、时区，以及 12 或 24 小时时间显示。",
                  "主题可选择经典、浮光、梅红、兰绿、竹青或菊黄；未分组的 note 和 todo 保持经典卡片颜色。",
                  `快捷键设置可以修改全局唤起组合键、检查后台活动，并选择 ${context.appName} 打开到上次工作区、Notes 或 Todos。`,
                  "如果全局快捷键注册失败，Floatem 会持续显示冲突提醒，便于改用其他组合键。",
                ],
              },
              {
                id: "settings-feedback",
                title: "动效、通知与应用操作",
                items: [
                  `当前动效：${context.motionLabel}。`,
                  `提醒声音：${context.reminderSoundLabel}。`,
                  "动效设置控制页面切换方式、速度和粒子反馈；通知设置控制提醒声音、系统权限入口和测试通知。",
                  "关于 Floatem 介绍功能与数据范围，并提供支持链接；设置首页始终提供“恢复默认设置”和“退出 Floatem”。",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "shortcuts",
        title: "快捷键",
        summary: "快速查看全局访问、Notes 编辑和 Todo 输入相关键盘操作。",
        articles: [
          {
            id: "shortcuts-core",
            eyebrow: "快捷键",
            title: "常用快捷键",
            summary: "键盘操作遵循常见编辑习惯，并集中在高频任务上。",
            highlights: ["Cmd/Ctrl+B", "Cmd/Ctrl+Z", "Enter", "Escape"],
            groups: [
              {
                id: "shortcuts-notes",
                title: "Notes 编辑器",
                items: [
                  "Cmd/Ctrl+B、I、U 分别切换粗体、斜体和下划线。",
                  "Cmd/Ctrl+Z 与 Cmd/Ctrl+Shift+Z 分别执行撤销和重做。",
                  "Cmd/Ctrl+A、C、V 可在 note 编辑区域使用；富文本复制和粘贴会保留受支持的格式。",
                ],
              },
              {
                id: "shortcuts-todos",
                title: "Todos 与对话框",
                items: [
                  "在 Todos 页面按 Enter 聚焦快速输入框，输入 todo 后再次按 Enter 提交。",
                  "快速输入框获得焦点后，使用 Shift+Enter 换行。",
                  "Escape 可关闭支持该操作的对话框和模态流程。",
                  `在其他应用中使用 ${context.hotkey} 可以显示或隐藏 Floatem。`,
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
      summary: "独立的 note 和 todo 悬浮窗口可在 macOS 桌面应用中使用。",
      articles: [
        {
          id: "floating-windows",
          eyebrow: "平台",
          title: "Windows 可用性",
          summary: "在 Windows 上，notes 和 todos 会保留在 Floatem 主窗口中。",
          highlights: ["Windows", "主窗口", "无悬浮卡片"],
          groups: [
            {
              id: "floating-windows-status",
              title: "当前行为",
              items: [
                "可以在 Floatem 主窗口中创建、编辑、分组、筛选和排序 notes 与 todos。",
                "Windows 暂不支持将卡片拖入独立的原生悬浮窗口。",
                "原生悬浮窗口需要针对平台单独实现窗口与画面合成能力。",
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
      summary: "把 notes 和 todos 拖出主面板独立使用，需要时再收回列表。",
      articles: [
        {
          id: "floating-macos",
          eyebrow: "macOS",
          title: "悬浮 Notes 与 Todos",
          summary: "在 macOS 上，notes 和 todos 可以显示为独立且可调整尺寸的卡片窗口。",
          highlights: ["拖出悬浮", "实时编辑", "固定到桌面", "拖回收纳"],
          groups: [
            {
              id: "floating-start",
              title: "创建悬浮卡片",
              items: [
                "将 note 卡片或未完成 todo 从列表拖出，并在面板外松开。",
                "该项目会打开为独立悬浮卡片，并在悬浮期间从主列表隐藏。",
                "可以同时悬浮多张 notes 和 todos，无需重新打开主面板即可继续编辑。",
              ],
            },
            {
              id: "floating-work",
              title: "在悬浮卡片中操作",
              items: [
                "悬浮 note 支持编辑标题和正文、富文本格式、修改分组，并与主面板保持相同的工具栏状态。",
                "折叠悬浮 note 时，窗口会收紧到标题与顶部信息行；重新展开后恢复之前的自定义尺寸。",
                "悬浮 todo 支持编辑文字、修改分组和提醒、切换完成状态，并保留主列表中的状态颜色。",
                "在悬浮 todo 中标记完成后，会先保存状态，然后在短暂延迟后自动收回并关闭悬浮卡片。",
              ],
            },
            {
              id: "floating-dock",
              title: "移动、收回、固定与缩放",
              items: [
                "按住悬浮卡片的非编辑区域，可以在屏幕上移动卡片。",
                "把卡片拖到 Floatem 主面板上，面板会显示收纳区域；在面板内松开即可放回列表。",
                "关闭控件会把卡片收回主面板，不会删除对应的 note 或 todo。",
                "使用斜向图钉可将卡片固定在桌面并跨空间显示；重新启动后会恢复固定卡片的位置和自定义尺寸。",
                "桌面固定卡片需要 Floatem 保持运行；如需在重启 Mac 后恢复，可开启“登录时打开 Floatem”。",
                "从右下角扩大的拖动区域调整尺寸；文字和控件会根据卡片可用空间自适应。",
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
    summary: "独立的 note 和 todo 悬浮窗口需要 macOS 桌面应用。",
    articles: [
      {
        id: "floating-web",
        eyebrow: "预览环境",
        title: "桌面端功能",
        summary: "浏览器预览无法创建原生悬浮卡片窗口。",
        highlights: ["macOS 桌面端", "原生窗口"],
        groups: [
          {
            id: "floating-web-status",
            title: "可用性",
            items: [
              "note 和 todo 悬浮卡片可在 macOS 桌面应用中使用。",
              "浏览器预览无法创建独立的原生卡片窗口。",
              "在 Windows 上，notes 和 todos 会保留在 Floatem 主窗口中。",
            ],
          },
        ],
      },
    ],
  };
}
