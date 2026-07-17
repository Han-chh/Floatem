import Foundation

enum DebugFlags {
    private static let supportedDomains = [
        "com.stickit.app",
        "com.stickit.floating",
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
protocol StickItNativeBridgeHandling: AnyObject {
    func loadAllData() throws -> [String: Any]
    func saveNotes(_ notes: Any) throws
    func saveTodos(_ todos: Any) throws
    func saveSettings(_ settings: Any) throws
    func showMainWindowFromBridge()
    func openNotificationSettings() throws
    func sendNotification(id: String?, title: String, body: String, soundEnabled: Bool) async throws
    func scheduleNotification(id: String?, title: String, body: String, scheduledAt: Date?, soundEnabled: Bool) async throws
    func openTextColorPanel(requestID: String, colorHex: String?) throws
    func pickScreenColor() async throws -> String?
    func testReminderNotification(soundEnabled: Bool, language: StickItLanguage) async throws
    func currentHotKeyRegistrationState() -> [String: Any]
    func currentFloatingCardState() -> [String: [String]]
    func readClipboardText() -> String
    func registerHotKey(shortcut: String) throws
    func setEditableInputActiveFromBridge(_ active: Bool)
    func setTextCompositionActiveFromBridge(_ active: Bool)
    func writeClipboardText(_ text: String)
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
    func quitApplicationFromBridge()
    func startWindowDragFromBridge() throws
}

enum StickItLanguage: String {
    case english = "en"
    case simplifiedChinese = "zh-CN"

    init(storedValue: Any?) {
        if let languageCode = storedValue as? String, languageCode == Self.simplifiedChinese.rawValue {
            self = .simplifiedChinese
        } else {
            self = .english
        }
    }

    var localization: StickItLocalization {
        switch self {
        case .english:
            return StickItLocalization(
                menuToggle: "Toggle",
                menuToggleApp: "Toggle StickIt",
                menuQuit: "Quit",
                menuQuitApp: "Quit StickIt",
                menuEdit: "Edit",
                menuUndo: "Undo",
                menuRedo: "Redo",
                menuCut: "Cut",
                menuCopy: "Copy",
                menuPaste: "Paste",
                menuSelectAll: "Select All",
                loadingTitle: "Loading StickIt...",
                loadingDetail: "Preparing the local app interface.",
                missingInterfaceTitle: "StickIt couldn't load its interface.",
                missingInterfaceDetail: "The bundled frontend assets are missing from the app resources.",
                reconnectingTitle: "Reconnecting StickIt...",
                reconnectingDetail: "The embedded WebView process terminated. Retrying once.",
                recoverWindowTitle: "StickIt couldn't recover the window content.",
                recoverWindowDetail: "The embedded WebView process terminated twice. Check the Xcode console for details.",
                finishLoadingTitle: "StickIt couldn't finish loading.",
                loadWindowContentTitle: "StickIt couldn't load its window content.",
                slowStartupTitle: "StickIt is taking longer than expected to appear.",
                slowStartupDetail: "The web interface loaded but did not confirm startup. Check the Xcode console for WebView diagnostics.",
                notificationOpenSettingsFailedMessage: "StickIt couldn't open System Settings. Open Apple menu > System Settings > Notifications, then select StickIt.",
                notificationPermissionDeniedMessage: "StickIt is not allowed to send notifications. Enable alerts and sounds for StickIt in System Settings > Notifications.",
                notificationTestBody: "This is a StickIt test reminder.",
                notificationTestTitle: "StickIt test",
                reminderNotificationTitle: "Todo reminder",
                reminderNotificationFallbackBody: "Open StickIt to review this todo.",
                missingBundleHeading: "StickIt frontend bundle is missing",
                missingBundleBody: "Run pnpm install, then build the app again so the WKWebView host can copy the Vite output into the application bundle."
            )
        case .simplifiedChinese:
            return StickItLocalization(
                menuToggle: "显示或隐藏",
                menuToggleApp: "显示或隐藏 StickIt",
                menuQuit: "退出",
                menuQuitApp: "退出 StickIt",
                menuEdit: "编辑",
                menuUndo: "撤销",
                menuRedo: "重做",
                menuCut: "剪切",
                menuCopy: "复制",
                menuPaste: "粘贴",
                menuSelectAll: "全选",
                loadingTitle: "正在加载 StickIt...",
                loadingDetail: "正在准备本地应用界面。",
                missingInterfaceTitle: "StickIt 无法加载界面。",
                missingInterfaceDetail: "应用资源中缺少打包后的前端文件。",
                reconnectingTitle: "正在重新连接 StickIt...",
                reconnectingDetail: "内嵌 WebView 进程已终止，正在重试一次。",
                recoverWindowTitle: "StickIt 无法恢复窗口内容。",
                recoverWindowDetail: "内嵌 WebView 进程已连续两次终止。请检查 Xcode 控制台获取详情。",
                finishLoadingTitle: "StickIt 无法完成加载。",
                loadWindowContentTitle: "StickIt 无法加载窗口内容。",
                slowStartupTitle: "StickIt 显示时间比预期更长。",
                slowStartupDetail: "网页界面已经加载，但还没有确认启动完成。请检查 Xcode 控制台中的 WebView 诊断信息。",
                notificationOpenSettingsFailedMessage: "StickIt 无法打开系统设置。请手动前往“苹果菜单 > 系统设置 > 通知”，然后选择 StickIt。",
                notificationPermissionDeniedMessage: "StickIt 当前没有通知权限。请在“系统设置 > 通知”里为 StickIt 开启提醒和声音。",
                notificationTestBody: "这是一条来自 StickIt 的测试提醒。",
                notificationTestTitle: "StickIt 测试通知",
                reminderNotificationTitle: "待办提醒",
                reminderNotificationFallbackBody: "打开 StickIt 查看这条待办。",
                missingBundleHeading: "StickIt 前端资源包缺失",
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

struct StickItLocalization {
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
    static let stickItLanguageDidChange = Notification.Name("StickItLanguageDidChange")
}

enum StickItBridgeError: LocalizedError {
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
            return "StickIt could not find the bundled frontend assets."
        }
    }
}
