# Floatem App Store Distribution Assets

所有对外显示的文案均为简体中文。最终素材按 macOS App Store 的尺寸整理。

## Screenshots

`screenshots/` 根目录保留 10 张语义化命名的原始截图，不直接上传 App Store：

1. `01-经典色.png`
2. `02-浮光.png`
3. `03-梅.png`
4. `04-兰.png`
5. `05-竹.png`
6. `06-菊.png`
7. `07-视频工作-悬浮记录.png`
8. `08-代码工作-多卡片悬浮.png`
9. `09-桌面固定-彩色卡片.png`
10. `10-交互式引导.png`

`screenshots/Edited/` 包含 7 张可上传的最终 PNG：2880 × 1800、16:10、RGB、无 alpha 通道。

1. `01-让灵感始终在眼前.png`
2. `02-六种主题随心切换.png`
3. `03-富文本记录随手整理.png`
4. `04-看视频也不错过灵光.png`
5. `05-编码时保留上下文.png`
6. `06-固定到桌面一眼看到重点.png`
7. `07-跟着引导快速上手.png`

`screenshots/Edited/WindowCrops/` 保存 7 张 800 × 1424 的透明圆角窗口中间素材；`Branding/` 保存组合图使用的无文字背景。这两个子目录都不用于上传。

## App Preview drafts

`preview/` 中每个 `*-draft.mp4` 都是 15 秒、1920 × 1080、30 fps、H.264 High Profile、AAC 立体声的中文分镜样片，并附有同名 PNG 海报帧。

它们用于确认叙事、字幕与海报帧，**不得直接作为 App Store Preview 提交**：Apple 要求预览使用连续的真实 App 屏幕录制。最终录制应使用本目录下同名分镜，替换 `-draft.mp4` 文件：

1. 创建笔记与使用：新建笔记 → 输入内容 → 拖出悬浮卡片。
2. 创建待办与使用：新建待办 → 设置日期与提醒 → 完成勾选。
3. 引导式教程：打开帮助 → 启动交互式引导 → 完成一个真实步骤。

录制时保持应用和样例内容为简体中文；不显示真实个人资料、第三方品牌或其他 App 内容。

## Source and regeneration

`source/` 保存旧版原始窗口捕捉和不直接上传的背景素材。`render_assets.swift` 是旧版生成脚本，会写入 `screenshots/` 根目录，不用于当前这批原始截图。

当前 App Store 成品由 `render_edited_screenshots.swift` 生成。它会读取 10 张原始截图，重建统一圆角窗口素材，并输出 7 张无 alpha 的 2880 × 1800 成品：

```bash
swift "App Store Distribution/render_edited_screenshots.swift"
```
