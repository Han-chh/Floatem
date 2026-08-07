# Floatem App Store Distribution Assets

所有对外显示的文案均为简体中文。最终素材按 macOS App Store 的尺寸整理。

## Screenshots

`screenshots/` 中恰好包含 10 张最终 PNG：2880 × 1800、16:10、sRGB、无 alpha 通道。

1. `01-经典色.png`
2. `02-浮光.png`
3. `03-梅.png`
4. `04-兰.png`
5. `05-竹.png`
6. `06-菊.png`
7. `07-悬浮主窗口-视频工作.png`
8. `08-多卡片悬浮-代码工作.png`
9. `09-桌面固定-彩色便签.png`
10. `10-待办与提醒.png`

第 1–6 张用于展示六种主题；第 7–10 张依次展示视频工作时的悬浮主窗口、代码工作时的多卡片悬浮、桌面固定的彩色卡片，以及待办与提醒。

## App Preview drafts

`preview/` 中每个 `*-draft.mp4` 都是 15 秒、1920 × 1080、30 fps、H.264 High Profile、AAC 立体声的中文分镜样片，并附有同名 PNG 海报帧。

它们用于确认叙事、字幕与海报帧，**不得直接作为 App Store Preview 提交**：Apple 要求预览使用连续的真实 App 屏幕录制。最终录制应使用本目录下同名分镜，替换 `-draft.mp4` 文件：

1. 创建笔记与使用：新建笔记 → 输入内容 → 拖出悬浮卡片。
2. 创建待办与使用：新建待办 → 设置日期与提醒 → 完成勾选。
3. 引导式教程：打开帮助 → 启动交互式引导 → 完成一个真实步骤。

录制时保持应用和样例内容为简体中文；不显示真实个人资料、第三方品牌或其他 App 内容。

## Source and regeneration

`source/` 保存原始窗口捕捉和不直接上传的背景素材。`render_assets.swift` 可重新生成 PNG 分镜和截图；运行后，对 `screenshots/` 下最终 PNG 执行无 alpha 的导出处理。
