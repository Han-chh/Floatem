import AppKit

@main
@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private let storage = AppStorage()
    private let hotKeyManager = GlobalHotKeyManager()

    private lazy var mainWindowController = MainWindowController(
        storage: storage,
        hotKeyManager: hotKeyManager
    )

    private lazy var statusMenu: NSMenu = {
        let menu = NSMenu()

        let toggleItem = NSMenuItem(title: "Toggle", action: #selector(toggleMainWindow(_:)), keyEquivalent: "")
        toggleItem.target = self
        menu.addItem(toggleItem)

        menu.addItem(NSMenuItem.separator())

        let quitItem = NSMenuItem(title: "Quit", action: #selector(quitApplication(_:)), keyEquivalent: "q")
        quitItem.keyEquivalentModifierMask = [.command]
        quitItem.target = self
        menu.addItem(quitItem)

        return menu
    }()

    private var statusItem: NSStatusItem?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)

        configureMainMenu()
        configureStatusItem()

        mainWindowController.installSavedHotKey()
        mainWindowController.showMainWindow()
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        mainWindowController.showMainWindow()
        return true
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        false
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
            button.image = NSImage(systemSymbolName: "square.and.pencil", accessibilityDescription: "QuickNote")
            button.image?.isTemplate = true
            button.target = self
            button.action = #selector(statusItemClicked(_:))
            button.sendAction(on: [.leftMouseUp, .rightMouseUp])
        }

        self.statusItem = statusItem
    }

    private func configureMainMenu() {
        let mainMenu = NSMenu()

        let appMenuItem = NSMenuItem()
        mainMenu.addItem(appMenuItem)

        let appMenu = NSMenu()

        let toggleItem = NSMenuItem(title: "Toggle QuickNote", action: #selector(toggleMainWindow(_:)), keyEquivalent: "")
        toggleItem.target = self
        appMenu.addItem(toggleItem)

        appMenu.addItem(NSMenuItem.separator())

        let quitItem = NSMenuItem(title: "Quit QuickNote", action: #selector(quitApplication(_:)), keyEquivalent: "q")
        quitItem.keyEquivalentModifierMask = [.command]
        quitItem.target = self
        appMenu.addItem(quitItem)

        appMenuItem.submenu = appMenu
        NSApp.mainMenu = mainMenu
    }
}
