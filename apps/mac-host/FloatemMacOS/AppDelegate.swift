import AppKit
import OSLog

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate {
    private lazy var storage = AppStorage()
    private let hotKeyAgentManager = HotKeyAgentManager()
    private let notificationManager = NotificationManager()
    private let launchAtLoginManager = LaunchAtLoginManager()
    private let lifecycleDiagnostics = LifecycleDiagnostics()
    private var currentLanguage: FloatemLanguage = .simplifiedChinese

    private lazy var mainWindowController = MainWindowController(
        storage: storage,
        hotKeyAgentManager: hotKeyAgentManager,
        notificationManager: notificationManager,
        launchAtLoginManager: launchAtLoginManager
    )

    private weak var statusToggleItem: NSMenuItem?
    private weak var statusReloadItem: NSMenuItem?
    private weak var statusUninstallItem: NSMenuItem?
    private weak var statusQuitItem: NSMenuItem?
    private weak var mainMenuToggleItem: NSMenuItem?
    private weak var mainMenuReloadItem: NSMenuItem?
    private weak var mainMenuUninstallItem: NSMenuItem?
    private weak var mainMenuQuitItem: NSMenuItem?
    private weak var mainMenuEditItem: NSMenuItem?
    private weak var mainMenuUndoItem: NSMenuItem?
    private weak var mainMenuRedoItem: NSMenuItem?
    private weak var mainMenuCutItem: NSMenuItem?
    private weak var mainMenuCopyItem: NSMenuItem?
    private weak var mainMenuPasteItem: NSMenuItem?
    private weak var mainMenuSelectAllItem: NSMenuItem?
    private var languageObserver: NSObjectProtocol?
    private var systemWillSleepObserver: NSObjectProtocol?
    private var systemDidWakeObserver: NSObjectProtocol?
    private var launchContextResolver = LaunchContextResolver()
    private var isAwaitingInitialHotKeyRegistration = false
    private var isPresentingUninstallConfirmation = false
    private var isUninstalling = false

    private var localization: FloatemLocalization {
        currentLanguage.localization
    }

    private lazy var statusMenu: NSMenu = {
        let menu = NSMenu()
        menu.delegate = self

        let toggleItem = NSMenuItem(title: localization.menuShow, action: #selector(toggleMainWindow(_:)), keyEquivalent: "")
        toggleItem.target = self
        menu.addItem(toggleItem)
        statusToggleItem = toggleItem

        let reloadItem = NSMenuItem(title: localization.menuReload, action: #selector(reloadApplicationInterface(_:)), keyEquivalent: "r")
        reloadItem.keyEquivalentModifierMask = [.command]
        reloadItem.target = self
        menu.addItem(reloadItem)
        statusReloadItem = reloadItem

        menu.addItem(NSMenuItem.separator())

        let uninstallItem = NSMenuItem(title: localization.menuUninstall, action: #selector(confirmUninstallApplication(_:)), keyEquivalent: "")
        uninstallItem.target = self
        menu.addItem(uninstallItem)
        statusUninstallItem = uninstallItem

        menu.addItem(NSMenuItem.separator())

        let quitItem = NSMenuItem(title: localization.menuQuit, action: #selector(quitApplication(_:)), keyEquivalent: "q")
        quitItem.keyEquivalentModifierMask = [.command]
        quitItem.target = self
        menu.addItem(quitItem)
        statusQuitItem = quitItem

        return menu
    }()

    private var statusItem: NSStatusItem?

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Unit tests load the app binary as a host. Do not initialize services or
        // touch the real App Group while XCTest is exercising pure core logic.
        if ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil {
            return
        }
        hotKeyAgentManager.prepareForDevelopmentSession()
        classifyInitialOpenEvent()
        lifecycleDiagnostics?.start()
        if launchContextResolver.explicitContext == .agentWakeRecovery {
            lifecycleDiagnostics?.recordRecoveredAfterWake()
        }
        NSApp.setActivationPolicy(.regular)
        currentLanguage = (try? storage.currentLanguage()) ?? .simplifiedChinese
        notificationManager.configure()
        notificationManager.logCurrentAuthorizationStatus()
        launchAtLoginManager.configureOnLaunch(enabled: (try? storage.currentLaunchAtLogin()) ?? false)

        configureMainMenu()
        configureStatusItem()
        installLanguageObserver()
        installSystemPowerObservers()
        hotKeyAgentManager.onAgentWakeRecovery = { [weak self] in
            self?.lifecycleDiagnostics?.recordRecoveredAfterWake()
            return self != nil
        }
        hotKeyAgentManager.onAgentHotKeyShowRequested = { [weak self] _ in
            guard let self else {
                return false
            }
            self.showMainWindowForUserAction()
            return true
        }
        hotKeyAgentManager.onAgentWindowVisibilityRestore = { [weak self] visible in
            guard let self else {
                return false
            }
            if visible {
                self.showMainWindowForUserAction()
            } else {
                self.mainWindowController.hideMainWindow()
            }
            return true
        }
        hotKeyAgentManager.currentMainWindowVisibility = { [weak self] in
            self?.mainWindowController.isMainWindowVisible ?? false
        }
        mainWindowController.onHotKeyRegistrationStateChanged = { [weak self] state in
            self?.handleInitialHotKeyRegistrationState(state)
        }
        updateLocalizedMenuTitles()

        DispatchQueue.main.async { [weak self] in
            guard let self else {
                return
            }

            Task { @MainActor [weak self] in
                guard let self else {
                    return
                }

                await self.notificationManager.requestAuthorizationOnLaunchIfNeeded(
                    language: self.currentLanguage
                )
            }

            self.isAwaitingInitialHotKeyRegistration = true
            self.mainWindowController.installSavedHotKey()
            self.mainWindowController.syncSavedTodoReminders()
            // Desktop-pinned cards are application-owned NSPanel instances, so
            // restore them before presenting the main window on every launch.
            self.mainWindowController.restorePinnedDesktopCards()
            // Login-item launches stay in the background. Direct user launches
            // present on the initial activation, while deep links present only
            // their requested destination.
            if self.launchContextResolver.shouldShowAtDidFinish(
                isApplicationActive: NSApp.isActive,
                launchAtLoginEnabled: self.launchAtLoginManager.isEnabled
            ) {
                self.showMainWindowForUserAction()
            }
        }
    }

    func applicationDidBecomeActive(_ notification: Notification) {
        if launchContextResolver.shouldShowForActivation(launchAtLoginEnabled: launchAtLoginManager.isEnabled) {
            showMainWindowForUserAction()
        }
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        showMainWindowForUserAction()
        return true
    }

    func application(_ application: NSApplication, open urls: [URL]) {
        launchContextResolver.markDeepLinkReceived()
        showMainWindowForUserAction()
        for url in urls {
            guard let deepLink = FloatemDeepLink(url: url) else { continue }
            switch deepLink.destination {
            case .mainWindow:
                break
            case let .floatingCard(reference):
                do {
                    _ = try mainWindowController.openFloatingCard(reference: reference)
                } catch {
                    // The main window is already visible and lets the user recover
                    // when the requested card no longer exists.
                }
            }
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        false
    }

    func applicationWillTerminate(_ notification: Notification) {
        if !isUninstalling {
            lifecycleDiagnostics?.recordGracefulTermination(reason: "applicationWillTerminate")
        }
    }

    private func classifyInitialOpenEvent() {
        guard let event = NSAppleEventManager.shared().currentAppleEvent,
              event.eventID == kAEOpenApplication else {
            return
        }
        let launchedAsLoginItem = event.paramDescriptor(forKeyword: keyAELaunchedAsLogInItem) != nil
        launchContextResolver.recordInitialOpenEvent(launchedAsLoginItem: launchedAsLoginItem)
    }

    deinit {
        if let languageObserver {
            NotificationCenter.default.removeObserver(languageObserver)
        }
        if let systemWillSleepObserver {
            NSWorkspace.shared.notificationCenter.removeObserver(systemWillSleepObserver)
        }
        if let systemDidWakeObserver {
            NSWorkspace.shared.notificationCenter.removeObserver(systemDidWakeObserver)
        }
    }

    @objc private func toggleMainWindow(_ sender: Any?) {
        mainWindowController.toggleMainWindow()
        updateToggleMenuTitles()
    }

    @objc private func reloadApplicationInterface(_ sender: Any?) {
        mainWindowController.reloadApplicationInterface()
        showMainWindowForUserAction()
    }

    @objc private func confirmUninstallApplication(_ sender: Any?) {
        guard !isUninstalling, !isPresentingUninstallConfirmation else {
            return
        }

        isPresentingUninstallConfirmation = true
        showMainWindowForUserAction()
        updateToggleMenuTitles()

        // Let the status or application menu close before attaching the sheet
        // so the confirmation is visibly anchored to the Floatem window.
        DispatchQueue.main.async { [weak self] in
            guard let self else {
                return
            }

            let alert = NSAlert()
            alert.alertStyle = .warning
            alert.messageText = self.localization.uninstallTitle
            alert.informativeText = self.localization.uninstallMessage
            alert.addButton(withTitle: self.localization.uninstallConfirm)
            alert.addButton(withTitle: self.localization.uninstallCancel)

            let keepDataCheckbox = NSButton(
                checkboxWithTitle: self.localization.uninstallKeepData,
                target: nil,
                action: nil
            )
            keepDataCheckbox.state = .on
            alert.accessoryView = keepDataCheckbox

            alert.beginSheetModal(for: self.mainWindowController.sheetParentWindow) { [weak self] response in
                guard let self else {
                    return
                }
                self.isPresentingUninstallConfirmation = false
                guard response == .alertFirstButtonReturn else {
                    return
                }
                self.performUninstall(keepUserData: keepDataCheckbox.state == .on)
            }
        }
    }

    @objc private func quitApplication(_ sender: Any?) {
        NSApp.terminate(sender)
    }

    private func configureStatusItem() {
        let statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)

        if let button = statusItem.button {
            button.image = makeStatusItemImage()
        }

        statusItem.menu = statusMenu
        self.statusItem = statusItem
    }

    private func makeStatusItemImage() -> NSImage {
        let size = NSSize(width: 18, height: 18)
        let image = NSImage(size: size, flipped: false) { bounds in
            let strokeColor = NSColor.black

            let noteRect = NSRect(x: 3.5, y: 2.75, width: 9.5, height: 11.0)
            let notePath = NSBezierPath(roundedRect: noteRect, xRadius: 2.2, yRadius: 2.2)
            strokeColor.setStroke()
            notePath.lineWidth = 1.35
            notePath.stroke()

            let line1 = NSBezierPath()
            line1.move(to: CGPoint(x: 5.6, y: 10.5))
            line1.line(to: CGPoint(x: 10.6, y: 10.5))
            line1.lineWidth = 1.15
            line1.lineCapStyle = .round
            line1.stroke()

            let line2 = NSBezierPath()
            line2.move(to: CGPoint(x: 5.6, y: 8.0))
            line2.line(to: CGPoint(x: 9.3, y: 8.0))
            line2.lineWidth = 1.15
            line2.lineCapStyle = .round
            line2.stroke()

            let pencil = NSBezierPath()
            pencil.move(to: CGPoint(x: 10.9, y: 4.3))
            pencil.line(to: CGPoint(x: 14.9, y: 8.3))
            pencil.lineWidth = 1.4
            pencil.lineCapStyle = .round
            pencil.stroke()

            let tip = NSBezierPath()
            tip.move(to: CGPoint(x: 14.9, y: 8.3))
            tip.line(to: CGPoint(x: 15.8, y: 7.4))
            tip.line(to: CGPoint(x: 14.9, y: 6.6))
            tip.close()
            strokeColor.setFill()
            tip.fill()

            return bounds.width > 0
        }

        image.isTemplate = true
        image.accessibilityDescription = "Floatem"
        return image
    }

    private func configureMainMenu() {
        let mainMenu = NSMenu()

        let appMenuItem = NSMenuItem(title: "Floatem", action: nil, keyEquivalent: "")
        mainMenu.addItem(appMenuItem)

        let appMenu = NSMenu(title: "Floatem")
        appMenu.delegate = self

        let toggleItem = NSMenuItem(title: localization.menuShow, action: #selector(toggleMainWindow(_:)), keyEquivalent: "")
        toggleItem.target = self
        appMenu.addItem(toggleItem)
        mainMenuToggleItem = toggleItem

        let reloadItem = NSMenuItem(title: localization.menuReload, action: #selector(reloadApplicationInterface(_:)), keyEquivalent: "r")
        reloadItem.keyEquivalentModifierMask = [.command]
        reloadItem.target = self
        appMenu.addItem(reloadItem)
        mainMenuReloadItem = reloadItem

        appMenu.addItem(NSMenuItem.separator())

        let uninstallItem = NSMenuItem(title: localization.menuUninstall, action: #selector(confirmUninstallApplication(_:)), keyEquivalent: "")
        uninstallItem.target = self
        appMenu.addItem(uninstallItem)
        mainMenuUninstallItem = uninstallItem

        appMenu.addItem(NSMenuItem.separator())

        let quitItem = NSMenuItem(title: localization.menuQuitApp, action: #selector(quitApplication(_:)), keyEquivalent: "q")
        quitItem.keyEquivalentModifierMask = [.command]
        quitItem.target = self
        appMenu.addItem(quitItem)
        mainMenuQuitItem = quitItem

        appMenuItem.submenu = appMenu

        let editMenuItem = NSMenuItem(title: localization.menuEdit, action: nil, keyEquivalent: "")
        mainMenu.addItem(editMenuItem)
        mainMenuEditItem = editMenuItem

        let editMenu = NSMenu(title: localization.menuEdit)

        let undoItem = NSMenuItem(title: localization.menuUndo, action: Selector(("undo:")), keyEquivalent: "z")
        undoItem.keyEquivalentModifierMask = [.command]
        editMenu.addItem(undoItem)
        mainMenuUndoItem = undoItem

        let redoItem = NSMenuItem(title: localization.menuRedo, action: Selector(("redo:")), keyEquivalent: "Z")
        redoItem.keyEquivalentModifierMask = [.command, .shift]
        editMenu.addItem(redoItem)
        mainMenuRedoItem = redoItem

        editMenu.addItem(NSMenuItem.separator())

        let cutItem = NSMenuItem(title: localization.menuCut, action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        cutItem.keyEquivalentModifierMask = [.command]
        editMenu.addItem(cutItem)
        mainMenuCutItem = cutItem

        let copyItem = NSMenuItem(title: localization.menuCopy, action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        copyItem.keyEquivalentModifierMask = [.command]
        editMenu.addItem(copyItem)
        mainMenuCopyItem = copyItem

        let pasteItem = NSMenuItem(title: localization.menuPaste, action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        pasteItem.keyEquivalentModifierMask = [.command]
        editMenu.addItem(pasteItem)
        mainMenuPasteItem = pasteItem

        editMenu.addItem(NSMenuItem.separator())

        let selectAllItem = NSMenuItem(
            title: localization.menuSelectAll,
            action: #selector(NSResponder.selectAll(_:)),
            keyEquivalent: "a"
        )
        selectAllItem.keyEquivalentModifierMask = [.command]
        editMenu.addItem(selectAllItem)
        mainMenuSelectAllItem = selectAllItem

        editMenuItem.submenu = editMenu
        NSApp.mainMenu = mainMenu
    }

    private func installLanguageObserver() {
        languageObserver = NotificationCenter.default.addObserver(
            forName: .floatemLanguageDidChange,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            Task { @MainActor [weak self] in
                guard let self else {
                    return
                }

                self.currentLanguage = FloatemLanguage(storedValue: notification.userInfo?["language"])
                self.updateLocalizedMenuTitles()
            }
        }
    }

    private func installSystemPowerObservers() {
        let workspaceNotifications = NSWorkspace.shared.notificationCenter
        systemWillSleepObserver = workspaceNotifications.addObserver(
            forName: NSWorkspace.willSleepNotification,
            object: nil,
            queue: .main
        ) { _ in
            Task { @MainActor [weak self] in
                self?.lifecycleDiagnostics?.recordWillSleep()
            }
            Logger(subsystem: "com.floatem.app", category: "Lifecycle").notice("System will sleep.")
        }
        systemDidWakeObserver = workspaceNotifications.addObserver(
            forName: NSWorkspace.didWakeNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self else {
                    return
                }

                Logger(subsystem: "com.floatem.app", category: "Lifecycle").notice("System did wake; restoring Floatem services.")
                self.lifecycleDiagnostics?.recordDidWake()
                self.mainWindowController.recoverAfterSystemWake()
            }
        }
    }

    private func updateLocalizedMenuTitles() {
        updateToggleMenuTitles()
        statusReloadItem?.title = localization.menuReload
        statusUninstallItem?.title = localization.menuUninstall
        statusQuitItem?.title = localization.menuQuit
        mainMenuReloadItem?.title = localization.menuReload
        mainMenuUninstallItem?.title = localization.menuUninstall
        mainMenuQuitItem?.title = localization.menuQuitApp
        mainMenuEditItem?.title = localization.menuEdit
        mainMenuEditItem?.submenu?.title = localization.menuEdit
        mainMenuUndoItem?.title = localization.menuUndo
        mainMenuRedoItem?.title = localization.menuRedo
        mainMenuCutItem?.title = localization.menuCut
        mainMenuCopyItem?.title = localization.menuCopy
        mainMenuPasteItem?.title = localization.menuPaste
        mainMenuSelectAllItem?.title = localization.menuSelectAll
    }

    func menuWillOpen(_ menu: NSMenu) {
        synchronizeLanguageFromStorage()
        updateToggleMenuTitles()
    }

    private func synchronizeLanguageFromStorage() {
        guard let storedLanguage = try? storage.currentLanguage(), storedLanguage != currentLanguage else {
            return
        }
        currentLanguage = storedLanguage
        updateLocalizedMenuTitles()
    }

    private func updateToggleMenuTitles() {
        let title = mainWindowController.isMainWindowVisible
            ? localization.menuHide
            : localization.menuShow
        statusToggleItem?.title = title
        mainMenuToggleItem?.title = title
    }

    private func handleInitialHotKeyRegistrationState(_ state: HotKeyAgentManager.RegistrationState) {
        guard isAwaitingInitialHotKeyRegistration else {
            return
        }

        switch state.registration {
        case "starting", "repairing":
            return
        case "registered":
            isAwaitingInitialHotKeyRegistration = false
        default:
            isAwaitingInitialHotKeyRegistration = false
            showMainWindowForUserAction()
            DispatchQueue.main.async { [weak self] in
                self?.presentHotKeyRegistrationFailure(state)
            }
        }
    }

    private func presentHotKeyRegistrationFailure(_ state: HotKeyAgentManager.RegistrationState) {
        let alert = NSAlert()
        alert.alertStyle = .warning
        alert.messageText = localization.hotKeyRegistrationFailedTitle
        let detail = state.message?.trimmingCharacters(in: .whitespacesAndNewlines)
        alert.informativeText = [localization.hotKeyRegistrationFailedMessage, detail]
            .compactMap { value in
                guard let value, !value.isEmpty else { return nil }
                return value
            }
            .joined(separator: "\n\n")

        if state.registration == "approvalRequired" {
            alert.addButton(withTitle: localization.hotKeyOpenSettings)
            alert.addButton(withTitle: localization.hotKeyDismiss)
            if alert.runModal() == .alertFirstButtonReturn {
                try? mainWindowController.openBackgroundActivitySettings()
            }
        } else {
            alert.addButton(withTitle: localization.hotKeyDismiss)
            alert.runModal()
        }
    }

    private func performUninstall(keepUserData: Bool) {
        isUninstalling = true
        statusUninstallItem?.isEnabled = false
        mainMenuUninstallItem?.isEnabled = false

        hotKeyAgentManager.unregisterForUninstall { [weak self] agentError in
            guard let self else {
                return
            }
            if let agentError {
                self.finishFailedUninstall(agentError)
                return
            }

            do {
                try self.launchAtLoginManager.unregisterForUninstall()
                if !keepUserData {
                    self.lifecycleDiagnostics?.stopForUninstall()
                    self.notificationManager.removeAllNotificationsForUninstall()
                    try self.storage.removeAllUserData()
                }
            } catch {
                self.finishFailedUninstall(error)
                return
            }

            let appURL = Bundle.main.bundleURL.standardizedFileURL
            NSWorkspace.shared.recycle([appURL]) { [weak self] movedURLs, recycleError in
                Task { @MainActor [weak self] in
                    guard let self else {
                        return
                    }
                    if let recycleError {
                        self.finishFailedUninstall(recycleError)
                        return
                    }
                    guard movedURLs[appURL] != nil else {
                        let error = NSError(
                            domain: "com.hankch.floatem.uninstall",
                            code: 1,
                            userInfo: [NSLocalizedDescriptionKey: "macOS did not move Floatem.app to the Trash."]
                        )
                        self.finishFailedUninstall(error)
                        return
                    }
                    NSApp.terminate(nil)
                }
            }
        }
    }

    private func finishFailedUninstall(_ error: Error) {
        isUninstalling = false
        statusUninstallItem?.isEnabled = true
        mainMenuUninstallItem?.isEnabled = true
        mainWindowController.installSavedHotKey()
        showMainWindowForUserAction()

        let alert = NSAlert(error: error)
        alert.alertStyle = .critical
        alert.messageText = localization.uninstallFailedTitle
        alert.beginSheetModal(for: mainWindowController.sheetParentWindow)
    }

    private func showMainWindowForUserAction() {
        mainWindowController.showMainWindow()
    }
}
