import AppKit

@MainActor
final class MainWindowController: NSObject, NSWindowDelegate, QuickNoteNativeBridgeHandling {
    private let storage: AppStorage
    private let hotKeyManager: GlobalHotKeyManager
    private let panel: FloatingPanel
    private let webViewController: WebViewController

    init(storage: AppStorage, hotKeyManager: GlobalHotKeyManager) {
        self.storage = storage
        self.hotKeyManager = hotKeyManager

        panel = FloatingPanel(
            contentRect: NSRect(x: 0, y: 0, width: 400, height: 680),
            styleMask: [.borderless, .fullSizeContentView, .resizable, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )

        webViewController = WebViewController(bridgeDelegate: nil)

        super.init()

        webViewController.bridgeDelegate = self

        panel.delegate = self
        panel.isReleasedWhenClosed = false
        panel.backgroundColor = .clear
        panel.isOpaque = false
        panel.hasShadow = false
        panel.level = .statusBar
        panel.title = "QuickNote"
        panel.collectionBehavior = [
            .canJoinAllSpaces,
            .fullScreenAuxiliary,
            .moveToActiveSpace,
            .transient,
            .ignoresCycle,
        ]
        panel.hidesOnDeactivate = false
        panel.isMovableByWindowBackground = false
        panel.standardWindowButton(.closeButton)?.isHidden = true
        panel.standardWindowButton(.miniaturizeButton)?.isHidden = true
        panel.standardWindowButton(.zoomButton)?.isHidden = true
        panel.minSize = NSSize(width: 320, height: 480)
        panel.contentViewController = webViewController

        hotKeyManager.onHotKeyPressed = { [weak self] in
            self?.toggleMainWindow()
        }
    }

    func installSavedHotKey() {
        do {
            try hotKeyManager.register(shortcut: storage.currentHotkey())
        } catch {
            NSLog("QuickNote failed to restore the saved shortcut: %@", error.localizedDescription)

            do {
                try hotKeyManager.register(shortcut: GlobalHotKeyManager.defaultShortcut)
                try storage.updateHotkey(GlobalHotKeyManager.defaultShortcut)
            } catch {
                NSLog("QuickNote failed to restore the fallback shortcut: %@", error.localizedDescription)
            }
        }
    }

    func showMainWindow() {
        restorePanelPosition()
        NSApp.activate(ignoringOtherApps: true)
        panel.orderFrontRegardless()
        panel.makeKeyAndOrderFront(nil)
    }

    func hideMainWindow() {
        persistPanelPosition()
        panel.orderOut(nil)
    }

    func toggleMainWindow() {
        if panel.isVisible {
            hideMainWindow()
        } else {
            showMainWindow()
        }
    }

    func loadAllData() throws -> [String: Any] {
        try storage.loadAllData()
    }

    func saveNotes(_ notes: Any) throws {
        try storage.saveNotes(notes)
    }

    func saveTodos(_ todos: Any) throws {
        try storage.saveTodos(todos)
    }

    func saveSettings(_ settings: Any) throws {
        guard var settingsDictionary = settings as? [String: Any] else {
            throw QuickNoteBridgeError.invalidParameters("QuickNote expected settings to be a JSON object.")
        }

        let fallbackShortcut = hotKeyManager.registeredShortcut ?? (try? storage.currentHotkey()) ?? GlobalHotKeyManager.defaultShortcut
        let candidateShortcut = settingsDictionary["hotkey"] as? String ?? fallbackShortcut

        settingsDictionary["hotkey"] = GlobalHotKeyManager.isShortcutValid(candidateShortcut)
            ? GlobalHotKeyManager.normalize(shortcut: candidateShortcut)
            : fallbackShortcut

        try storage.saveSettings(settingsDictionary)
    }

    func registerHotKey(shortcut: String) throws {
        try hotKeyManager.register(shortcut: shortcut)
    }

    func hideMainWindowFromBridge() {
        hideMainWindow()
    }

    func startWindowDragFromBridge() throws {
        guard let currentEvent = NSApp.currentEvent else {
            throw QuickNoteBridgeError.invalidParameters("QuickNote could not access the current mouse event for dragging.")
        }

        panel.performDrag(with: currentEvent)
        persistPanelPosition()
        webViewController.emitPanelPosition(panel.frame.origin)
    }

    func windowDidMove(_ notification: Notification) {
        persistPanelPosition()
        webViewController.emitPanelPosition(panel.frame.origin)
    }

    func windowShouldClose(_ sender: NSWindow) -> Bool {
        hideMainWindow()
        return false
    }

    private func restorePanelPosition() {
        guard let targetScreen = NSScreen.main ?? NSScreen.screens.first else {
            panel.center()
            return
        }

        let visibleFrame = targetScreen.visibleFrame
        let settings = try? storage.loadSettings()
        let savedPosition = settings?["panelPosition"] as? [String: Any]

        guard
            let savedPosition,
            let x = savedPosition["x"] as? Double ?? (savedPosition["x"] as? Int).map(Double.init),
            let y = savedPosition["y"] as? Double ?? (savedPosition["y"] as? Int).map(Double.init)
        else {
            panel.center()
            return
        }

        let width = panel.frame.width
        let height = panel.frame.height
        let candidateOrigin = CGPoint(
            x: min(max(CGFloat(x), visibleFrame.minX), visibleFrame.maxX - width),
            y: min(max(CGFloat(y), visibleFrame.minY), visibleFrame.maxY - height)
        )
        let candidateFrame = NSRect(origin: candidateOrigin, size: panel.frame.size)

        if visibleFrame.intersects(candidateFrame) {
            panel.setFrameOrigin(candidateOrigin)
        } else {
            panel.center()
        }
    }

    private func persistPanelPosition() {
        do {
            try storage.savePanelPosition(origin: panel.frame.origin)
        } catch {
            NSLog("QuickNote failed to persist the panel position: %@", error.localizedDescription)
        }
    }
}
