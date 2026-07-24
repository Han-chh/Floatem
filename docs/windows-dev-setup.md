# Windows 开发环境 setup

> v1.0.8 状态：Windows 宿主是持续维护的开发预览目标，共用 v1.0.8 前端，但不属于当前 macOS App Store/TestFlight 正式包；Windows 悬浮卡片与桌面置顶卡片仍被禁用。

面向在 Windows 上从零接手 Floatem 的开发者：环境要求、安装、验证与常见问题。功能级说明（宿主能力、限制）见 [windows-setup.md](./windows-setup.md)。

## 架构速览（与本机相关部分）

| 区域 | 路径 | 说明 |
|------|------|------|
| 共享前端 | `apps/frontend` | React + Vite，不硬编码 macOS/Windows 宿主逻辑 |
| Windows 宿主 | `apps/windows-host` | .NET 8 WPF + WebView2 + Win32 互操作 |
| Bridge 契约 | `packages/native-bridge` | `HostBridge` 类型与事件名 |
| 前端 bridge 入口 | `apps/frontend/src/lib/nativeBridge.ts` | `window.floatemHost` / 浏览器 fallback |
| 品牌与元数据 | `packages/branding` | `branding.json`、图标路径引用 |

## 仓库根目录结构（速查）

在仓库根目录应能看到下列主要目录（与 [architecture.md](./architecture.md) 一致）：

```text
floatem/
├── apps/
│   ├── frontend/          # 共享 React + Vite 前端（UI、设置、笔记、测试）
│   ├── mac-host/         # macOS 宿主（Xcode / AppKit / WKWebView），Windows 上无需构建
│   └── windows-host/     # Windows 宿主（.NET 8 WPF + WebView2 + Win32）
├── packages/
│   ├── native-bridge/    # 前后端 bridge 的 TypeScript 契约
│   └── branding/         # 应用名、图标路径等共享元数据
├── docs/                 # 架构与各平台开发说明
├── scripts/              # 资源打包、macOS 启动脚本；`scripts/windows/setup-dev.ps1` 为 Windows 环境自检
├── design/               # 设计稿与 logo 概念稿（非运行时依赖）
├── package.json          # 根脚本：`pnpm dev`、`pnpm windows:run` 等
└── pnpm-workspace.yaml   # pnpm workspace 声明
```

**已废弃（勿再安装为运行时依赖）**：历史版本曾使用 Tauri + Rust 壳；当前桌面端为 **macOS AppKit + WKWebView** 与 **Windows WPF + WebView2**。仓库内无 `src-tauri` 或 Cargo 宿主；CHANGELOG 中保留迁移记录。

## 环境要求

| 依赖 | 用途 | 推荐版本 |
|------|------|----------|
| Windows | 宿主目标 SDK | **Windows 10 19041+** 或 Windows 11（与 `Floatem.Windows.csproj` 中 `net8.0-windows10.0.19041.0` 一致） |
| Node.js | 前端构建、Vitest、Playwright | **20 LTS 或 22 LTS**（团队曾用 v24 验证，建议优先 LTS） |
| pnpm | 与仓库 lockfile 一致的包管理 | **9.x / 10.x**（参见根目录 `pnpm-lock.yaml`） |
| Git | 克隆与提交 | 任意近期版本 |
| .NET SDK | 编译/运行 WPF 宿主 | **8.0**（需带 Windows 桌面负载；安装 “.NET desktop development” 或 standalone SDK） |
| Microsoft Edge WebView2 Runtime | WebView2 控件运行时 | **Evergreen**（稳定渠道即可） |

**不需要**（当前仓库无对应宿主代码）：

- Rust toolchain、Tauri CLI  
- Xcode（仅 macOS 宿主需要）

**可选**：

- **Visual Studio 2022**（含 .NET 桌面开发工作负载）：便于调试 WPF、XAML 设计器；仅用 CLI 时 **.NET SDK** 即可。  
- **Playwright 浏览器**（仅跑布局 E2E：`pnpm test:layout` 前执行 `pnpm exec playwright install`）。

## 安装命令（手动）

在仓库根目录（路径中尽量避免多余空格，见下文「路径空格」）：

```powershell
git clone <你的远程地址> floatem
cd floatem
```

安装 Node 依赖（任选其一）：

```powershell
# 推荐：先安装 pnpm（任选一种方式）
npm install -g pnpm
# 若已启用 corepack（可能需要管理员写 Node 安装目录）：
# corepack enable
# corepack prepare pnpm@10.33.0 --activate

pnpm install
```

安装 .NET 与 WebView2：

- 从 [Download .NET](https://dotnet.microsoft.com/download/dotnet/8.0) 安装 **.NET 8 SDK**。  
- 从 [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) 安装 **Evergreen Bootstrapper**（多数已随 Edge 预装，若 `EnsureCoreWebView2Async` 失败再装）。

## 验证安装

```powershell
node --version
pnpm --version
git --version
dotnet --version
```

确认 SDK 为 8.x 且含 Windows 目标：

```powershell
dotnet --info
```

WebView2（Evergreen）粗略检测（存在即视为已安装运行时目录）：

```powershell
Test-Path "$env:ProgramFiles(x86)\Microsoft\EdgeWebView\Application"
```

## 启动 React 前端（仅浏览器预览）

```powershell
pnpm install
pnpm dev
```

默认开发服务器：**http://127.0.0.1:1420**（`strictPort: true`，端口被占用则 Vite 会报错退出）。

浏览器预览使用 `nativeBridge.ts` 中的 **web fallback**（localStorage、无全局快捷键等）。

## 启动 Windows 宿主（生产式：内置 dist）

```powershell
pnpm install
pnpm windows:run
```

等价于：先 `pnpm build`（产出 `apps/frontend/dist`），再 `dotnet run --project apps/windows-host/Floatem.Windows.csproj`。宿主将 dist 映射为 `https://floatem.local/index.html`（避免 `file://` 下模块脚本限制）。

## 开发调试（Vite 热更新 + 宿主）

**两个终端**，仓库根目录：

**终端 A：**

```powershell
pnpm frontend:dev
```

**终端 B：**

```powershell
$env:FLOATEM_FRONTEND_URL = "http://127.0.0.1:1420"
dotnet run --project apps/windows-host/Floatem.Windows.csproj
```

宿主在 `MainWindow.xaml.cs` 中读取 `FLOATEM_FRONTEND_URL`；未设置时回退到已构建的 `web/` 或向上查找 `apps/frontend/dist`。

在设置或宿主中调用 `openDevTools` 可打开 WebView2 开发者工具。

## 自动化检查脚本（可选）

运行只读检查（不安装软件、不修改系统）：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\setup-dev.ps1
```

脚本会报告缺失项及建议下载链接；需要管理员权限的步骤会单独说明，**不会**静默安装高风险组件。

## 测试命令

先 **`pnpm install`**，再跑测试。不要依赖裸的 **`npx vitest`**：它会按最新主版本拉取 Vitest，且在未安装依赖时无法解析 `vite.config.ts` 里的 `@tailwindcss/vite`、`@vitejs/plugin-react` 等，从而出现 `ERR_MODULE_NOT_FOUND`。请使用下面命令或根目录的 **`pnpm test`**。

```powershell
pnpm exec vitest --config apps/frontend/vite.config.ts --run
pnpm build
dotnet build apps/windows-host/Floatem.Windows.csproj
```

布局 E2E（需 Playwright 浏览器）：

```powershell
pnpm exec playwright install
pnpm test:layout
```

## 常见问题排查

### PowerShell 禁止运行 `pnpm.ps1`（ExecutionPolicy）

错误类似：`running scripts is disabled on this system`。

**做法**：使用 `pnpm.cmd`：

```powershell
pnpm.cmd install
pnpm.cmd windows:run
```

或对当前用户放宽策略（自行评估安全策略）：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### WebView2 未安装或加载失败

症状：白屏、`EnsureCoreWebView2Async` 异常。安装 [WebView2 Evergreen Runtime](https://developer.microsoft.com/microsoft-edge/webview2/)。企业环境若禁止 Edge 更新，需由 IT 部署固定版本运行时。

### 端口 1420 被占用

改 Vite 端口需同时改 `apps/frontend/vite.config.ts` 的 `server.port` **和** `FLOATEM_FRONTEND_URL`，二者保持一致。

### 路径中的空格

将整个仓库放在无空格路径最省心。若必须在含空格路径下开发，为 dotnet/pnpm 命令加引号，并避免未加引号的拼接。

### `dotnet` 找不到 SDK

安装 **.NET 8 SDK**（不仅是 runtime）。在 Visual Studio 安装程序中勾选 **“.NET 桌面开发”**。

### 仅安装 Node 但未安装 pnpm

使用 `npm install -g pnpm`，或 `corepack prepare`（若 `corepack enable` 因权限失败，优先用全局 npm 安装 pnpm）。

### `corepack enable` 报 EPERM（无法写入 Node 安装目录）

典型日志：`operation not permitted, open '...\Node\yarn'`。Node 装在 `Program Files` 时，corepack 可能需**管理员**终端；若不便提权，直接使用 **`npm install -g pnpm`** 即可，不必依赖 corepack。

### 与 macOS 文档的关系

- macOS 构建与签名：[macos-setup.md](./macos-setup.md)  
- 总架构：[architecture.md](./architecture.md)
