# Floatem 四天上架前冲刺计划

> 历史计划与当前状态（更新于 v1.0.8 build 47）：代码身份、自动签名、App Group、完整前端/原生测试、Release Archive 和 App Store Connect `.pkg` 导出已经完成。v1.0.8 build 47 尚未上传 App Store Connect/TestFlight，Xcode Validate、上传后 TestFlight 安装验证、商店资料终审和正式提交仍属于待办。以下 Day 3–Day 6 内容保留为发布过程与人工验收依据，不表示所有条目均已完成。

## 计划基线

- 原计划 Day 1、Day 2 已完成，不再重复安排。
- 本计划从 Day 3 开始，到 Day 6 结束，共四天。
- 目标平台为 macOS，交付物是可提交 App Store Connect 的候选版本和完整的上架前验证记录。
- 本轮不再开发、接入或验证任何 Agent 功能、Agent 运行时、面向用户的 CLI 功能或 CLI 分发包。
- 构建和验收过程中使用 `pnpm`、`xcodebuild` 等命令只是工程手段，不属于产品 CLI 功能。
- 四天内冻结新功能；除本计划列出的发布阻断问题外，不接受范围扩张。

## 四天结束时的完成定义

以下项目必须全部满足，才能视为“已做好上架前准备”：

- 正式名称、Bundle ID、版本号、Build 号、应用图标在代码、Xcode 工程、应用包和商店资料中一致。
- App Store Connect 导出包使用正确的 Apple Distribution 签名、团队、商店 Provisioning Profile、App Sandbox 和 Hardened Runtime；允许 Xcode Archive 阶段采用自动管理的开发签名，但最终 `.pkg` 不得残留开发 Profile 或临时 Bundle ID。
- Release Archive 能成功生成、通过 Xcode Validate App，并能上传到 App Store Connect/TestFlight。
- “开机自启动”可由用户在设置中开启和关闭，基于 `SMAppService` 实现，状态能正确回显；失败时有可理解的提示。
- 自动化测试、原生冒烟测试、全新安装/升级测试、登录重启测试和签名检查全部通过。
- 无 P0/P1 缺陷；P2 缺陷必须有明确处置结论，且不影响提交、首次启动、核心数据或开机自启动。
- 上架所必需的隐私声明、权限文案、支持链接、截图和版本说明已完成并与候选包一致。

## Day 3：产品身份冻结、更名与图标、Bundle ID

### 工作内容

1. 冻结正式产品身份：最终 App 名称、Bundle ID、SKU、版本号、Build 号和 Apple Developer Team。
2. 在 Apple Developer 与 App Store Connect 创建或确认唯一 App ID；Bundle ID 一经用于首个正式版本，本轮不再变更。
3. 将名称和标识同步到以下位置：
   - `packages/branding/branding.json`
   - `packages/branding/src/index.ts`
   - Xcode target 的 `PRODUCT_NAME`、`PRODUCT_BUNDLE_IDENTIFIER`、`MARKETING_VERSION`、`CURRENT_PROJECT_VERSION`
   - `Info.plist`、应用内 About/帮助文本、菜单栏和通知显示名称
4. 替换正式图标源文件，生成完整 macOS App Icon 资源；检查 Dock、Finder、菜单栏、通知和浅色/深色背景下的辨识度。
5. 明确旧 Bundle ID 数据迁移策略。若正式 Bundle ID 与 `com.floatem.app` 不同，必须增加一次性数据迁移或明确接受全新数据目录，禁止静默丢失既有用户数据。
6. 分别构建 Debug 与 Release，检查产物中的名称、Bundle ID、版本和图标，不只检查源码配置。

### 当日验收

- `Info.plist`、`codesign -d`、Xcode Archive 和 App Store Connect 中的身份字段一致。
- Finder 与 Dock 不再显示旧名称或旧图标，清理图标缓存后仍正确。
- Debug、Release 均可启动，现有笔记和 Todo 数据读写正常。
- 产出《产品身份清单》和一份可安装的 Release 候选包 RC1。

## Day 4：开机自启动实现与专项测试

### 工作内容

1. 使用 macOS 13+ 的 `SMAppService.mainApp` 实现开机自启动，不引入独立 Helper、LaunchAgent 或脚本。
2. 将设置页中的“开机自启动”开关接入原生 bridge：
   - 开启时注册登录项；关闭时注销。
   - 启动设置页时读取系统真实状态，不只读取本地偏好。
   - 处理 `enabled`、`requiresApproval`、`notRegistered`、`notFound` 等状态。
   - 注册失败或需要用户批准时，提供明确提示并引导到系统“登录项”设置。
3. 规定登录启动行为：后台/菜单栏启动，不强制抢焦点或弹出主窗口；用户通过菜单栏或全局快捷键召回。
4. 添加原生单元/集成测试覆盖状态映射和 bridge 调用；保留人工登录测试，因为系统登录项无法只靠前端模拟完成验收。
5. 在签名 Release 包上进行专项测试：开启、注销登录、重新登录、关闭、再次登录，并覆盖系统设置中手动禁用/重新启用。

### 当日验收

- 设置开关与“系统设置 → 通用 → 登录项”状态一致。
- 开启后重新登录能自动运行，且不弹主窗口、不重复启动、不丢失菜单栏图标和快捷键。
- 关闭后重新登录不再启动；App 更新或覆盖安装后设置行为符合预期。
- 未授权、需要批准和注册失败路径均有可见反馈，不出现假开启状态。
- 产出《开机自启动测试记录》和 RC2。

## Day 5：Release 签名、构建链路与完整回归

### 工作内容

1. 固化 Release 签名与能力配置：
   - Archive 阶段使用正确 Team 与 Automatic Signing；App Store Connect export 阶段使用 Apple Distribution 证书。
   - 导出包中的 App Store Provisioning Profile/自动签名结果正确。
   - App Sandbox、Hardened Runtime 和实际所需 entitlements 最小化。
   - 最终上传 `.pkg` 不得继续使用 `Apple Development` 身份。
2. 建立可重复的 Release Archive 流程，确保前端资源随 Archive 一起打包，禁止引用开发服务器或本机绝对路径。
3. 执行自动化回归：TypeScript/前端构建、Vitest、Playwright 布局测试、macOS Release 构建。
4. 执行原生功能矩阵：首次启动、菜单栏、主窗口、全局快捷键、Notes、Todos、浮动卡片、通知、剪贴板、数据持久化、开机自启动、退出与再次启动。
5. 执行安装场景：全新用户目录、从上一正式版本升级、覆盖安装、重启、离线启动；确认 Bundle ID 变更时的数据迁移结果。
6. 检查最终应用包：签名链、entitlements、架构、嵌入资源、图标、版本号，并运行 Xcode Validate App。

### 当日验收

- 全部自动化测试通过；失败项必须修复并完整重跑，不以“偶发”直接放行。
- `codesign --verify --deep --strict`、`spctl`/Xcode 验证和 Archive Validate 均通过。
- Release 包在非开发环境启动时不要求 Node、pnpm 或本地前端服务。
- 无 P0/P1 缺陷，形成冻结的 RC3；RC3 之后只允许发布阻断修复。
- 产出《Release 构建记录》《签名与 Entitlements 清单》《完整回归报告》以及可上传的 Archive。

## Day 6：候选版封板与提交前准备

### 工作内容

1. 用 RC3 做最终验收；若修复任何代码，Build 号递增并重新执行 Day 5 的签名检查和受影响回归。
2. 通过 Xcode Organizer 上传候选包到 App Store Connect/TestFlight，等待处理完成并解决所有错误或警告。
3. 在 TestFlight 安装上传后的构建，重复最短关键路径：首次启动、核心数据、菜单栏/快捷键、通知、开机自启动、退出重启。
4. 完成仅与上架直接相关的资料：应用名称与副标题、描述、关键词、分类、支持 URL、隐私政策 URL、App Privacy、年龄分级、截图、版本说明和审核备注。
5. 核对权限与隐私：应用声明、系统权限提示、实际数据行为和商店隐私问卷一致；没有未使用权限或遗漏声明。
6. 完成最终 Go/No-Go 评审并锁定提交包、Git commit/tag、Build 号和回滚包。

### 当日验收

- App Store Connect 已识别候选构建，且无阻止提交的错误、协议或合规项。
- TestFlight 安装包的名称、图标、Bundle ID、版本、签名与 RC3/最终修复版一致。
- 上架资料完整，截图与当前 UI 一致，审核人员能按审核备注验证菜单栏、快捷键和开机自启动。
- 发布清单全部签字确认，候选版本达到“可立即提交审核”状态。

## 每日节奏与范围控制

- 每天开始先确认前一天验收项；未通过的发布阻断项优先于当天新工作。
- 每天结束生成一个可安装候选包和对应测试记录，保证问题不会堆到 Day 6。
- P0：崩溃、数据丢失、无法安装/启动/签名/上传，立即阻断。
- P1：核心功能、登录项、权限或升级路径失效，当天必须修复。
- P2：不影响提交与核心使用的问题，只能在风险可控且不破坏封板的前提下处理。
- Agent、CLI、跨平台新功能、架构重构和非必要视觉优化全部进入上架后 backlog，不得占用这四天。

## 外部依赖（Day 3 开始前必须就绪）

- Apple Developer Program 与 App Store Connect 权限。
- 最终 App 名称、Bundle ID、图标源文件、支持 URL 和隐私政策 URL。
- Apple Distribution 证书或可用的自动签名权限。
- 一台用于干净安装/登录重启验证的 macOS 14+ 测试环境。

若上述任一签名或账号依赖未就绪，不应挪用时间开发 Agent/CLI 或其他新功能；应立即将其标记为上架阻断项并解决。
