import Foundation

enum DebugFlags {
    private static let supportedDomains = [
        "com.floatem.app",
        "com.floatem.floating",
    ]

    static func isEnabled(_ key: String) -> Bool {
        if let environmentValue = ProcessInfo.processInfo.environment[key] {
            return boolValue(environmentValue)
        }

        if let standardValue = UserDefaults.standard.object(forKey: key) {
            return boolValue(standardValue)
        }

        for domain in supportedDomains {
            if let suiteValue = UserDefaults(suiteName: domain)?.object(forKey: key) {
                return boolValue(suiteValue)
            }

            if let persistentValue = UserDefaults.standard.persistentDomain(forName: domain)?[key] {
                return boolValue(persistentValue)
            }
        }

        return false
    }

    private static func boolValue(_ rawValue: Any) -> Bool {
        switch rawValue {
        case let value as Bool:
            return value
        case let value as NSNumber:
            return value.boolValue
        case let value as String:
            return ["1", "true", "yes", "on"].contains(value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased())
        default:
            return false
        }
    }
}

@MainActor
protocol FloatemNativeBridgeHandling: AnyObject {
    func loadAllData() throws -> [String: Any]
    func saveNotes(_ notes: Any) throws
    func saveTodos(_ todos: Any) throws
    func saveSettings(_ settings: Any) throws
    func currentLaunchAtLoginStatus() -> [String: Any]
    func currentBackgroundActivityStatus() -> [String: Any]
    func showMainWindowFromBridge()
    func openNotificationSettings() throws
    func openBackgroundActivitySettings() throws
    func checkNotificationPermission(language: FloatemLanguage) async throws -> Bool
    func sendNotification(id: String?, title: String, body: String, soundEnabled: Bool) async throws
    func scheduleNotification(id: String?, title: String, body: String, scheduledAt: Date?, soundEnabled: Bool) async throws
    func openTextColorPanel(requestID: String, colorHex: String?) throws
    func pickScreenColor() async throws -> String?
    func testReminderNotification(soundEnabled: Bool, language: FloatemLanguage) async throws
    func currentHotKeyRegistrationState() -> [String: Any]
    func currentFloatingCardState() -> [String: [String]]
    func readClipboardText() -> String
    func readClipboardRichText() -> [String: Any]
    func registerHotKey(shortcut: String) throws
    func setEditableInputActiveFromBridge(_ active: Bool)
    func setTextCompositionActiveFromBridge(_ active: Bool)
    func setWindowThemeFromBridge(_ theme: String)
    func writeClipboardText(_ text: String)
    func writeClipboardRichText(_ html: String, plainText: String)
    func hideMainWindowFromBridge()
    func toggleMainWindowFromBridge()
    func minimizeMainWindowFromBridge()
    func maximizeMainWindowFromBridge()
    func closeMainWindowFromBridge()
    func setAlwaysOnTopFromBridge(_ enabled: Bool)
    func showDragPreviewFromBridge(_ payload: Any) throws
    func hideDragPreviewFromBridge()
    func showFloatingCardFromBridge(_ payload: Any) throws
    func closeFloatingCardFromBridge(kind: String, id: String)
    func startFloatingCardDragFromBridge(kind: String, id: String) throws
    func setFloatingCardDesktopPinnedFromBridge(kind: String, id: String, pinned: Bool) throws -> [String: Any]
    func setFloatingCardGuideFromBridge(kind: String, id: String, guide: [String: Any]?)
    func clearFloatingCardGuidesFromBridge()
    func requestDesktopWidgetFromBridge(kind: String, id: String) throws -> [String: Any]
    func removeDesktopWidgetAssociationFromBridge(kind: String, id: String) throws
    func getDesktopWidgetStateFromBridge(kind: String, id: String) throws -> [String: Any]
    func quitApplicationFromBridge()
    func startWindowDragFromBridge() throws
}

enum FloatemLanguage: String {
    case english = "en"
    case simplifiedChinese = "zh-CN"

    init(storedValue: Any?) {
        if let languageCode = storedValue as? String, languageCode == Self.english.rawValue {
            self = .english
        } else {
            self = .simplifiedChinese
        }
    }

    static var systemPreferred: FloatemLanguage {
        systemPreferred(from: Locale.preferredLanguages)
    }

    static func systemPreferred(from preferredLanguages: [String]) -> FloatemLanguage {
        guard let preferredLanguage = preferredLanguages.first else {
            return .english
        }

        let normalized = preferredLanguage
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()
            .replacingOccurrences(of: "_", with: "-")

        return normalized == "zh" || normalized.hasPrefix("zh-") ? .simplifiedChinese : .english
    }

    var localization: FloatemLocalization {
        switch self {
        case .english:
            return FloatemLocalization(
                menuToggle: "Toggle",
                menuToggleApp: "Toggle Floatem",
                menuQuit: "Quit",
                menuQuitApp: "Quit Floatem",
                menuEdit: "Edit",
                menuUndo: "Undo",
                menuRedo: "Redo",
                menuCut: "Cut",
                menuCopy: "Copy",
                menuPaste: "Paste",
                menuSelectAll: "Select All",
                loadingTitle: "Loading Floatem...",
                loadingDetail: "Preparing the local app interface.",
                missingInterfaceTitle: "Floatem couldn't load its interface.",
                missingInterfaceDetail: "The bundled frontend assets are missing from the app resources.",
                reconnectingTitle: "Reconnecting Floatem...",
                reconnectingDetail: "The embedded WebView process terminated. Retrying once.",
                recoverWindowTitle: "Floatem couldn't recover the window content.",
                recoverWindowDetail: "The embedded WebView process terminated twice. Check the Xcode console for details.",
                finishLoadingTitle: "Floatem couldn't finish loading.",
                loadWindowContentTitle: "Floatem couldn't load its window content.",
                slowStartupTitle: "Floatem is taking longer than expected to appear.",
                slowStartupDetail: "The web interface loaded but did not confirm startup. Check the Xcode console for WebView diagnostics.",
                notificationOpenSettingsFailedMessage: "Floatem couldn't open System Settings. Open Apple menu > System Settings > Notifications, then select Floatem.",
                notificationPermissionDeniedMessage: "Floatem is not allowed to send notifications. Enable alerts and sounds for Floatem in System Settings > Notifications.",
                notificationTestBody: "This is a Floatem test reminder.",
                notificationTestTitle: "Floatem test",
                reminderNotificationTitle: "Todo reminder",
                reminderNotificationFallbackBody: "Open Floatem to review this todo.",
                missingBundleHeading: "Floatem frontend bundle is missing",
                missingBundleBody: "Run pnpm install, then build the app again so the WKWebView host can copy the Vite output into the application bundle."
            )
        case .simplifiedChinese:
            return FloatemLocalization(
                menuToggle: "显示或隐藏",
                menuToggleApp: "显示或隐藏 Floatem",
                menuQuit: "退出",
                menuQuitApp: "退出 Floatem",
                menuEdit: "编辑",
                menuUndo: "撤销",
                menuRedo: "重做",
                menuCut: "剪切",
                menuCopy: "复制",
                menuPaste: "粘贴",
                menuSelectAll: "全选",
                loadingTitle: "正在加载 Floatem...",
                loadingDetail: "正在准备本地应用界面。",
                missingInterfaceTitle: "Floatem 无法加载界面。",
                missingInterfaceDetail: "应用资源中缺少打包后的前端文件。",
                reconnectingTitle: "正在重新连接 Floatem...",
                reconnectingDetail: "内嵌 WebView 进程已终止，正在重试一次。",
                recoverWindowTitle: "Floatem 无法恢复窗口内容。",
                recoverWindowDetail: "内嵌 WebView 进程已连续两次终止。请检查 Xcode 控制台获取详情。",
                finishLoadingTitle: "Floatem 无法完成加载。",
                loadWindowContentTitle: "Floatem 无法加载窗口内容。",
                slowStartupTitle: "Floatem 显示时间比预期更长。",
                slowStartupDetail: "网页界面已经加载，但还没有确认启动完成。请检查 Xcode 控制台中的 WebView 诊断信息。",
                notificationOpenSettingsFailedMessage: "Floatem 无法打开系统设置。请手动前往“苹果菜单 > 系统设置 > 通知”，然后选择 Floatem。",
                notificationPermissionDeniedMessage: "Floatem 当前没有通知权限。请在“系统设置 > 通知”里为 Floatem 开启提醒和声音。",
                notificationTestBody: "这是一条来自 Floatem 的测试提醒。",
                notificationTestTitle: "Floatem 测试通知",
                reminderNotificationTitle: "待办提醒",
                reminderNotificationFallbackBody: "打开 Floatem 查看这条待办。",
                missingBundleHeading: "Floatem 前端资源包缺失",
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

struct FloatemLocalization {
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
    static let floatemLanguageDidChange = Notification.Name("FloatemLanguageDidChange")
}

enum FloatemBridgeError: LocalizedError {
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
            return "Floatem could not find the bundled frontend assets."
        }
    }
}
