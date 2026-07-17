import AppKit

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private let storage = AppStorage()
    private let hotKeyManager = GlobalHotKeyManager()
    private let notificationManager = NotificationManager()
    private var currentLanguage: StickItLanguage = .english

    private lazy var mainWindowController = MainWindowController(
        storage: storage,
        hotKeyManager: hotKeyManager,
        notificationManager: notificationManager
    )

    private weak var statusToggleItem: NSMenuItem?
    private weak var statusQuitItem: NSMenuItem?
    private weak var mainMenuToggleItem: NSMenuItem?
    private weak var mainMenuQuitItem: NSMenuItem?
    private weak var mainMenuEditItem: NSMenuItem?
    private weak var mainMenuUndoItem: NSMenuItem?
    private weak var mainMenuRedoItem: NSMenuItem?
    private weak var mainMenuCutItem: NSMenuItem?
    private weak var mainMenuCopyItem: NSMenuItem?
    private weak var mainMenuPasteItem: NSMenuItem?
    private weak var mainMenuSelectAllItem: NSMenuItem?
    private var languageObserver: NSObjectProtocol?

    private var localization: StickItLocalization {
        currentLanguage.localization
    }

    private lazy var statusMenu: NSMenu = {
        let menu = NSMenu()

        let toggleItem = NSMenuItem(title: localization.menuToggle, action: #selector(toggleMainWindow(_:)), keyEquivalent: "")
        toggleItem.target = self
        menu.addItem(toggleItem)
        statusToggleItem = toggleItem

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
        NSApp.setActivationPolicy(.accessory)
        currentLanguage = (try? storage.currentLanguage()) ?? .english
        notificationManager.configure()
        notificationManager.logCurrentAuthorizationStatus()

        configureMainMenu()
        configureStatusItem()
        installLanguageObserver()
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

            self.mainWindowController.installSavedHotKey()
            self.mainWindowController.syncSavedTodoReminders()
            self.mainWindowController.showMainWindow()
        }
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        mainWindowController.showMainWindow()
        return true
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        false
    }

    deinit {
        if let languageObserver {
            NotificationCenter.default.removeObserver(languageObserver)
        }
    }

    @objc private func statusItemClicked(_ sender: Any?) {
        guard let event = NSApp.currentEvent else {
            toggleMainWindow(sender)
            return
        }

        if event.type == .rightMouseUp, let button = statusItem?.button {
            statusItem?.menu = statusMenu
            button.performClick(nil)
            statusItem?.menu = nil
        } else {
            toggleMainWindow(sender)
        }
    }

    @objc private func toggleMainWindow(_ sender: Any?) {
        mainWindowController.toggleMainWindow()
    }

    @objc private func quitApplication(_ sender: Any?) {
        NSApp.terminate(sender)
    }

    private func configureStatusItem() {
        let statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)

        if let button = statusItem.button {
            button.image = makeStatusItemImage()
            button.target = self
            button.action = #selector(statusItemClicked(_:))
            button.sendAction(on: [.leftMouseUp, .rightMouseUp])
        }

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
        image.accessibilityDescription = "StickIt"
        return image
    }

    private func configureMainMenu() {
        let mainMenu = NSMenu()

        let appMenuItem = NSMenuItem()
        mainMenu.addItem(appMenuItem)

        let appMenu = NSMenu()

        let toggleItem = NSMenuItem(title: localization.menuToggleApp, action: #selector(toggleMainWindow(_:)), keyEquivalent: "")
        toggleItem.target = self
        appMenu.addItem(toggleItem)
        mainMenuToggleItem = toggleItem

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
            forName: .stickItLanguageDidChange,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            Task { @MainActor [weak self] in
                guard let self else {
                    return
                }

                self.currentLanguage = StickItLanguage(storedValue: notification.userInfo?["language"])
                self.updateLocalizedMenuTitles()
            }
        }
    }

    private func updateLocalizedMenuTitles() {
        statusToggleItem?.title = localization.menuToggle
        statusQuitItem?.title = localization.menuQuit
        mainMenuToggleItem?.title = localization.menuToggleApp
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
}
