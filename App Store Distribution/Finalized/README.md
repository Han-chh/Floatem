# App Store Connect finalized media

此目录只放可上传的成品；原始素材保留在同级的 `screenshots/` 与 `Previews/Raw/` 中，未被修改。

## Screenshots

`Screenshots/` 中的 6 张 JPEG 都是 2880 × 1800 px、16:10、8-bit sRGB、无 alpha 通道。该尺寸和 `.jpeg` 格式符合 macOS App Store 的截图要求；所有文件均小于 1 MB。

这些文件来自现有的营销成图 `screenshots/finalized/`，仅做无裁切的极轻微比例校正（1586 × 992 → 2880 × 1800）与 JPEG 优化，以满足 App Store Connect 的精确尺寸要求。

## Preview

`Preview/` 中的 4 条 MP4 都是 1920 × 1080 px、横向、30 fps、H.264 High Profile Level 4.0、yuv420p、AAC-LC 立体声 48 kHz，且文件大小远低于 500 MB。原始的 16:10 录屏按比例缩放并在左右补黑边，因此没有拉伸或裁切画面。

- `01-悬浮卡片演示.mp4`：16.9 秒
- `02-快速记录演示.mp4`：27.0 秒
- `03-提醒事项演示.mp4`：30.0 秒（从原始 33.8 秒素材截取）
- `04-交互式引导演示.mp4`：30.0 秒（从原始 143.1 秒素材截取）

App Store Connect 每个语言和设备尺寸最多上传 3 条 App Preview；因此提交时请选择前三条，或以另一条替换。第 4 条画面含 Bilibili 标识、课程画面和人物，尽管技术规格合规，仍不建议提交审核；请用只包含 Floatem 实际 UI 的录屏替换后再上传。

规格依据：Apple 的 [截图规格](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications) 与 [App Preview 规格](https://developer.apple.com/help/app-store-connect/reference/app-information/app-preview-specifications)。
