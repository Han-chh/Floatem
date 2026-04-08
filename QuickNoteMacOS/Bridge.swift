import Foundation

@MainActor
protocol QuickNoteNativeBridgeHandling: AnyObject {
    func loadAllData() throws -> [String: Any]
    func saveNotes(_ notes: Any) throws
    func saveTodos(_ todos: Any) throws
    func saveSettings(_ settings: Any) throws
    func openNotificationSettings() throws
    func openTextColorPanel(requestID: String, colorHex: String?) throws
    func testReminderNotification(soundEnabled: Bool, language: QuickNoteLanguage) async throws
    func readClipboardText() -> String
    func registerHotKey(shortcut: String) throws
    func setEditableInputActiveFromBridge(_ active: Bool)
    func setTextCompositionActiveFromBridge(_ active: Bool)
    func writeClipboardText(_ text: String)
    func hideMainWindowFromBridge()
    func quitApplicationFromBridge()
    func startWindowDragFromBridge() throws
}

enum QuickNoteLanguage: String {
    case english = "en"
    case simplifiedChinese = "zh-CN"

    init(storedValue: Any?) {
        if let languageCode = storedValue as? String, languageCode == Self.simplifiedChinese.rawValue {
            self = .simplifiedChinese
        } else {
            self = .english
        }
    }

    var localization: QuickNoteLocalization {
        switch self {
        case .english:
            return QuickNoteLocalization(
                menuToggle: "Toggle",
                menuToggleApp: "Toggle QuickNote",
                menuQuit: "Quit",
                menuQuitApp: "Quit QuickNote",
                menuEdit: "Edit",
                menuUndo: "Undo",
                menuRedo: "Redo",
                menuCut: "Cut",
                menuCopy: "Copy",
                menuPaste: "Paste",
                menuSelectAll: "Select All",
                loadingTitle: "Loading QuickNote...",
                loadingDetail: "Preparing the local app interface.",
                missingInterfaceTitle: "QuickNote couldn't load its interface.",
                missingInterfaceDetail: "The bundled frontend assets are missing from the app resources.",
                reconnectingTitle: "Reconnecting QuickNote...",
                reconnectingDetail: "The embedded WebView process terminated. Retrying once.",
                recoverWindowTitle: "QuickNote couldn't recover the window content.",
                recoverWindowDetail: "The embedded WebView process terminated twice. Check the Xcode console for details.",
                finishLoadingTitle: "QuickNote couldn't finish loading.",
                loadWindowContentTitle: "QuickNote couldn't load its window content.",
                slowStartupTitle: "QuickNote is taking longer than expected to appear.",
                slowStartupDetail: "The web interface loaded but did not confirm startup. Check the Xcode console for WebView diagnostics.",
                notificationOpenSettingsFailedMessage: "QuickNote couldn't open System Settings. Open Apple menu > System Settings > Notifications, then select QuickNote.",
                notificationPermissionDeniedMessage: "QuickNote is not allowed to send notifications. Enable alerts and sounds for QuickNote in System Settings > Notifications.",
                notificationTestBody: "This is a QuickNote test reminder.",
                notificationTestTitle: "QuickNote test",
                reminderNotificationTitle: "Todo reminder",
                reminderNotificationFallbackBody: "Open QuickNote to review this todo.",
                missingBundleHeading: "QuickNote frontend bundle is missing",
                missingBundleBody: "Run pnpm install, then build the app again so the WKWebView host can copy the Vite output into the application bundle."
            )
        case .simplifiedChinese:
            return QuickNoteLocalization(
                menuToggle: "显示或隐藏",
                menuToggleApp: "显示或隐藏 QuickNote",
                menuQuit: "退出",
                menuQuitApp: "退出 QuickNote",
                menuEdit: "编辑",
                menuUndo: "撤销",
                menuRedo: "重做",
                menuCut: "剪切",
                menuCopy: "复制",
                menuPaste: "粘贴",
                menuSelectAll: "全选",
                loadingTitle: "正在加载 QuickNote...",
                loadingDetail: "正在准备本地应用界面。",
                missingInterfaceTitle: "QuickNote 无法加载界面。",
                missingInterfaceDetail: "应用资源中缺少打包后的前端文件。",
                reconnectingTitle: "正在重新连接 QuickNote...",
                reconnectingDetail: "内嵌 WebView 进程已终止，正在重试一次。",
                recoverWindowTitle: "QuickNote 无法恢复窗口内容。",
                recoverWindowDetail: "内嵌 WebView 进程已连续两次终止。请检查 Xcode 控制台获取详情。",
                finishLoadingTitle: "QuickNote 无法完成加载。",
                loadWindowContentTitle: "QuickNote 无法加载窗口内容。",
                slowStartupTitle: "QuickNote 显示时间比预期更长。",
                slowStartupDetail: "网页界面已经加载，但还没有确认启动完成。请检查 Xcode 控制台中的 WebView 诊断信息。",
                notificationOpenSettingsFailedMessage: "QuickNote 无法打开系统设置。请手动前往“苹果菜单 > 系统设置 > 通知”，然后选择 QuickNote。",
                notificationPermissionDeniedMessage: "QuickNote 当前没有通知权限。请在“系统设置 > 通知”里为 QuickNote 开启提醒和声音。",
                notificationTestBody: "这是一条来自 QuickNote 的测试提醒。",
                notificationTestTitle: "QuickNote 测试通知",
                reminderNotificationTitle: "待办提醒",
                reminderNotificationFallbackBody: "打开 QuickNote 查看这条待办。",
                missingBundleHeading: "QuickNote 前端资源包缺失",
                missingBundleBody: "请先运行 pnpm install，然后重新构建应用，以便 WKWebView 宿主把 Vite 构建产物复制进应用包。"
            )
        }
    }

    var htmlLanguageCode: String {
        switch self {
        case .english:
            return "en"
        case .simplifiedChinese:
            return "zh-CN"
        }
    }
}

struct QuickNoteLocalization {
    let menuToggle: String
    let menuToggleApp: String
    let menuQuit: String
    let menuQuitApp: String
    let menuEdit: String
    let menuUndo: String
    let menuRedo: String
    let menuCut: String
    let menuCopy: String
    let menuPaste: String
    let menuSelectAll: String
    let loadingTitle: String
    let loadingDetail: String
    let missingInterfaceTitle: String
    let missingInterfaceDetail: String
    let reconnectingTitle: String
    let reconnectingDetail: String
    let recoverWindowTitle: String
    let recoverWindowDetail: String
    let finishLoadingTitle: String
    let loadWindowContentTitle: String
    let slowStartupTitle: String
    let slowStartupDetail: String
    let notificationOpenSettingsFailedMessage: String
    let notificationPermissionDeniedMessage: String
    let notificationTestBody: String
    let notificationTestTitle: String
    let reminderNotificationTitle: String
    let reminderNotificationFallbackBody: String
    let missingBundleHeading: String
    let missingBundleBody: String
}

extension Notification.Name {
    static let quickNoteLanguageDidChange = Notification.Name("QuickNoteLanguageDidChange")
}

enum QuickNoteBridgeError: LocalizedError {
    case invalidParameters(String)
    case invalidJSON(String)
    case missingFrontendBundle

    var errorDescription: String? {
        switch self {
        case let .invalidParameters(message):
            return message
        case let .invalidJSON(message):
            return message
        case .missingFrontendBundle:
            return "QuickNote could not find the bundled frontend assets."
        }
    }
}
