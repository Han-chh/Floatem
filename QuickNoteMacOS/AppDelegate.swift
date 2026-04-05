import AppKit

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private let storage = AppStorage()
    private let hotKeyManager = GlobalHotKeyManager()
    private var currentLanguage: QuickNoteLanguage = .english

    private lazy var mainWindowController = MainWindowController(
        storage: storage,
        hotKeyManager: hotKeyManager
    )

    private weak var statusToggleItem: NSMenuItem?
    private weak var statusQuitItem: NSMenuItem?
    private weak var mainMenuToggleItem: NSMenuItem?
    private weak var mainMenuQuitItem: NSMenuItem?
    private var languageObserver: NSObjectProtocol?

    private var localization: QuickNoteLocalization {
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

        configureMainMenu()
        configureStatusItem()
        installLanguageObserver()
        updateLocalizedMenuTitles()

        DispatchQueue.main.async { [weak self] in
            self?.mainWindowController.installSavedHotKey()
            self?.mainWindowController.showMainWindow()
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
        image.accessibilityDescription = "QuickNote"
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
        NSApp.mainMenu = mainMenu
    }

    private func installLanguageObserver() {
        languageObserver = NotificationCenter.default.addObserver(
            forName: .quickNoteLanguageDidChange,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            guard let self else {
                return
            }

            self.currentLanguage = QuickNoteLanguage(storedValue: notification.userInfo?["language"])
            self.updateLocalizedMenuTitles()
        }
    }

    private func updateLocalizedMenuTitles() {
        statusToggleItem?.title = localization.menuToggle
        statusQuitItem?.title = localization.menuQuit
        mainMenuToggleItem?.title = localization.menuToggleApp
        mainMenuQuitItem?.title = localization.menuQuitApp
    }
}
