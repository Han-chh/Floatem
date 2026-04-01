import AppKit
import OSLog

@MainActor
final class MainWindowController: NSObject, NSWindowDelegate, QuickNoteNativeBridgeHandling {
    private static let defaultPanelSize = NSSize(width: 400, height: 680)
    private static let minimumPanelSize = NSSize(width: 320, height: 480)
    private let storage: AppStorage
    private let hotKeyManager: GlobalHotKeyManager
    private let panel: FloatingPanel
    private let webViewController: WebViewController
    private let logger = Logger(subsystem: "com.quicknote.app", category: "Window")
    private var lastHotKeyPressTimestamp: CFAbsoluteTime = 0

    private static let hotKeyDebounceInterval: CFAbsoluteTime = 0.25

    init(storage: AppStorage, hotKeyManager: GlobalHotKeyManager) {
        self.storage = storage
        self.hotKeyManager = hotKeyManager

        panel = FloatingPanel(
            contentRect: NSRect(origin: .zero, size: Self.defaultPanelSize),
            styleMask: [.borderless, .fullSizeContentView, .resizable],
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
        panel.hasShadow = true
        panel.level = .floating
        panel.isFloatingPanel = true
        panel.becomesKeyOnlyIfNeeded = false
        panel.title = "QuickNote"
        panel.collectionBehavior = [
            .fullScreenAuxiliary,
            .moveToActiveSpace,
            .ignoresCycle,
        ]
        panel.hidesOnDeactivate = false
        panel.isMovableByWindowBackground = false
        panel.standardWindowButton(.closeButton)?.isHidden = true
        panel.standardWindowButton(.miniaturizeButton)?.isHidden = true
        panel.standardWindowButton(.zoomButton)?.isHidden = true
        panel.minSize = Self.minimumPanelSize
        panel.contentViewController = webViewController

        hotKeyManager.onHotKeyPressed = { [weak self] in
            self?.handleHotKeyPressed()
        }
    }

    func installSavedHotKey() {
        do {
            let savedShortcut = try storage.currentHotkey()
            try hotKeyManager.register(shortcut: savedShortcut)
        } catch {
            logger.error("Failed to restore the saved shortcut. error=\(error.localizedDescription, privacy: .public)")

            do {
                try hotKeyManager.register(shortcut: GlobalHotKeyManager.defaultShortcut)
                try storage.updateHotkey(GlobalHotKeyManager.defaultShortcut)
            } catch {
                logger.error("Failed to restore the fallback shortcut. error=\(error.localizedDescription, privacy: .public)")
            }
        }
    }

    func showMainWindow() {
        restoreDefaultPanelSizeIfNeeded()
        restorePanelPosition(on: activeScreen())
        NSRunningApplication.current.activate(options: [.activateAllWindows])
        NSApp.activate(ignoringOtherApps: true)
        panel.orderFrontRegardless()
        panel.orderFront(nil)
        panel.makeKeyAndOrderFront(nil)
        panel.makeMain()
        panel.invalidateShadow()
        logPanelState(context: "Showing")
    }

    func hideMainWindow() {
        persistPanelPosition()
        panel.orderOut(nil)
        logPanelState(context: "Hid")
    }

    func toggleMainWindow() {
        if panel.isVisible {
            hideMainWindow()
        } else {
            showMainWindow()
        }
    }

    private func handleHotKeyPressed() {
        let now = CFAbsoluteTimeGetCurrent()

        if now - lastHotKeyPressTimestamp < Self.hotKeyDebounceInterval {
            logger.debug("Ignoring repeated hotkey press within debounce window.")
            return
        }

        lastHotKeyPressTimestamp = now

        if panel.isVisible && panel.occlusionState.contains(.visible) && panel.isKeyWindow {
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

    func windowDidBecomeKey(_ notification: Notification) {
        logPanelState(context: "Panel became key")
    }

    func windowDidBecomeMain(_ notification: Notification) {
        logPanelState(context: "Panel became main")
    }

    func windowDidChangeOcclusionState(_ notification: Notification) {
        logPanelState(context: "Panel occlusion changed")
    }

    func windowDidResignKey(_ notification: Notification) {
        logPanelState(context: "Panel resigned key")
    }

    func windowShouldClose(_ sender: NSWindow) -> Bool {
        hideMainWindow()
        return false
    }

    private func activeScreen() -> NSScreen? {
        let mouseLocation = NSEvent.mouseLocation

        return NSScreen.screens.first(where: { screen in
            NSMouseInRect(mouseLocation, screen.frame, false)
        }) ?? NSScreen.main ?? NSScreen.screens.first
    }

    private func restoreDefaultPanelSizeIfNeeded() {
        let targetSize = Self.defaultPanelSize
        let currentSize = panel.frame.size

        guard currentSize.width < targetSize.width || currentSize.height < targetSize.height else {
            return
        }

        panel.setContentSize(
            NSSize(
                width: max(currentSize.width, targetSize.width),
                height: max(currentSize.height, targetSize.height)
            )
        )
    }

    private func restorePanelPosition(on targetScreen: NSScreen?) {
        guard let targetScreen else {
            panel.center()
            return
        }

        let visibleFrame = targetScreen.visibleFrame
        let settings = try? storage.loadSettings()
        let savedPosition = settings?["panelPosition"] as? [String: Any]
        let fallbackOrigin = centeredPanelOrigin(in: visibleFrame)

        guard
            let savedPosition,
            let x = savedPosition["x"] as? Double ?? (savedPosition["x"] as? Int).map(Double.init),
            let y = savedPosition["y"] as? Double ?? (savedPosition["y"] as? Int).map(Double.init)
        else {
            panel.setFrameOrigin(fallbackOrigin)
            return
        }

        panel.setFrameOrigin(
            clampedPanelOrigin(
                CGPoint(x: CGFloat(x), y: CGFloat(y)),
                in: visibleFrame
            )
        )
    }

    private func persistPanelPosition() {
        do {
            try storage.savePanelPosition(origin: panel.frame.origin)
        } catch {
            logger.error("Failed to persist the panel position. error=\(error.localizedDescription, privacy: .public)")
        }
    }

    private func centeredPanelOrigin(in visibleFrame: NSRect) -> CGPoint {
        let centeredOrigin = CGPoint(
            x: visibleFrame.midX - panel.frame.width / 2,
            y: visibleFrame.midY - panel.frame.height / 2
        )

        return clampedPanelOrigin(centeredOrigin, in: visibleFrame)
    }

    private func clampedPanelOrigin(_ origin: CGPoint, in visibleFrame: NSRect) -> CGPoint {
        let maxX = max(visibleFrame.minX, visibleFrame.maxX - panel.frame.width)
        let maxY = max(visibleFrame.minY, visibleFrame.maxY - panel.frame.height)

        return CGPoint(
            x: min(max(origin.x, visibleFrame.minX), maxX),
            y: min(max(origin.y, visibleFrame.minY), maxY)
        )
    }

    private func logPanelState(context: String) {
        let frameDescription = NSStringFromRect(panel.frame)
        let screenName = panel.screen?.localizedName ?? "none"

        logger.info(
            "\(context, privacy: .public) panel. appActive=\(NSApp.isActive) visible=\(self.panel.isVisible) key=\(self.panel.isKeyWindow) main=\(self.panel.isMainWindow) occlusion=\(self.panel.occlusionState.rawValue) screen=\(screenName, privacy: .public) frame=\(frameDescription, privacy: .public)"
        )
    }
}
