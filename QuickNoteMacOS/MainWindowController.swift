import AppKit
import OSLog

@MainActor
final class MainWindowController: NSObject, NSWindowDelegate, QuickNoteNativeBridgeHandling {
    private static let defaultPanelSize = NSSize(width: 400, height: 680)
    private static let minimumPanelSize = NSSize(width: 320, height: 480)
    private static let overlayPanelLevel = NSWindow.Level.statusBar
    private static let interactivePanelLevel = NSWindow.Level.floating
    private static var overlayCollectionBehavior: NSWindow.CollectionBehavior {
        var behavior: NSWindow.CollectionBehavior = [
            .canJoinAllSpaces,
            .fullScreenAuxiliary,
            .stationary,
            .transient,
            .ignoresCycle,
        ]

        if #available(macOS 13.0, *) {
            behavior.formUnion(.canJoinAllApplications)
        }

        return behavior
    }
    private let storage: AppStorage
    private let hotKeyManager: GlobalHotKeyManager
    private let notificationManager: NotificationManager
    private let panel: FloatingPanel
    private let webViewController: WebViewController
    private let logger = Logger(subsystem: "com.quicknote.app", category: "Window")
    private var lastHotKeyPressTimestamp: CFAbsoluteTime = 0
    private var activeTextColorPanelRequestID: String?
    private var isEditableInputActive = false
    private var isTextCompositionActive = false
    private var spaceObserver: NSObjectProtocol?
    private var textColorPanelChangeObserver: NSObjectProtocol?
    private var textColorPanelCloseObserver: NSObjectProtocol?
    private var appDidBecomeActiveObserver: NSObjectProtocol?

    private static let hotKeyDebounceInterval: CFAbsoluteTime = 0.25

    private var isPanelPresented: Bool {
        panel.isVisible
    }

    init(storage: AppStorage, hotKeyManager: GlobalHotKeyManager, notificationManager: NotificationManager) {
        self.storage = storage
        self.hotKeyManager = hotKeyManager
        self.notificationManager = notificationManager

        panel = FloatingPanel(
            contentRect: NSRect(origin: .zero, size: Self.defaultPanelSize),
            styleMask: [.borderless, .nonactivatingPanel, .fullSizeContentView, .resizable],
            backing: .buffered,
            defer: false
        )

        webViewController = WebViewController(storage: storage, bridgeDelegate: nil)

        super.init()

        webViewController.bridgeDelegate = self
        self.notificationManager.onReminderResponse = { [weak self] todoID in
            Task { @MainActor [weak self] in
                self?.clearReminder(forTodoIDs: [todoID], todosOverride: nil)
            }
        }

        panel.delegate = self
        panel.isReleasedWhenClosed = false
        panel.backgroundColor = .clear
        panel.isOpaque = false
        panel.hasShadow = true
        panel.level = Self.overlayPanelLevel
        panel.isFloatingPanel = true
        panel.becomesKeyOnlyIfNeeded = false
        panel.title = "QuickNote"
        panel.collectionBehavior = Self.overlayCollectionBehavior
        panel.hidesOnDeactivate = false
        panel.isMovableByWindowBackground = false
        panel.standardWindowButton(.closeButton)?.isHidden = true
        panel.standardWindowButton(.miniaturizeButton)?.isHidden = true
        panel.standardWindowButton(.zoomButton)?.isHidden = true
        panel.minSize = Self.minimumPanelSize
        panel.contentViewController = webViewController
        installOverlayObservers()

        hotKeyManager.onHotKeyPressed = { [weak self] in
            self?.handleHotKeyPressed()
        }
    }

    deinit {
        if let spaceObserver {
            NSWorkspace.shared.notificationCenter.removeObserver(spaceObserver)
        }

        if let appDidBecomeActiveObserver {
            NotificationCenter.default.removeObserver(appDidBecomeActiveObserver)
        }

        if let textColorPanelChangeObserver {
            NotificationCenter.default.removeObserver(textColorPanelChangeObserver)
        }

        if let textColorPanelCloseObserver {
            NotificationCenter.default.removeObserver(textColorPanelCloseObserver)
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

    func syncSavedTodoReminders() {
        do {
            let todos = try storage.loadTodos()
            let settings = try storage.loadSettings()
            syncTodoReminderNotifications(todos: todos, settings: settings, requestAuthorizationIfNeeded: true)
        } catch {
            logger.error("Failed to sync saved todo reminders. error=\(error.localizedDescription, privacy: .public)")
        }
    }

    func showMainWindow() {
        NSApp.activate(ignoringOtherApps: true)
        configurePanelForGlobalOverlay()
        restoreDefaultPanelSizeIfNeeded()
        restorePanelPosition(on: activeScreen())
        panel.orderFrontRegardless()
        webViewController.emitPanelWillOpen()
        panel.makeKey()
        bringPanelToFront(context: "Showing")
        logPanelState(context: "Showing")
    }

    func hideMainWindow() {
        persistPanelPosition()
        dismissTextColorPanel(emitClose: true)
        isEditableInputActive = false
        isTextCompositionActive = false
        panel.orderOut(nil)
        logPanelState(context: "Hid")
    }

    func toggleMainWindow() {
        togglePanel(reason: "manual-toggle")
    }

    private func handleHotKeyPressed() {
        let now = CFAbsoluteTimeGetCurrent()

        if now - lastHotKeyPressTimestamp < Self.hotKeyDebounceInterval {
            logger.debug("Ignoring repeated hotkey press within debounce window.")
            return
        }

        lastHotKeyPressTimestamp = now
        logToggleState(context: "Global hotkey received")
        togglePanel(reason: "global-hotkey")
    }

    func loadAllData() throws -> [String: Any] {
        try storage.loadAllData()
    }

    func saveNotes(_ notes: Any) throws {
        try storage.saveNotes(notes)
    }

    func saveTodos(_ todos: Any) throws {
        try storage.saveTodos(todos)
        let settings = try storage.loadSettings()
        syncTodoReminderNotifications(todos: todos, settings: settings, requestAuthorizationIfNeeded: true)
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
        let todos = try storage.loadTodos()
        let savedSettings = try storage.loadSettings()
        syncTodoReminderNotifications(todos: todos, settings: savedSettings, requestAuthorizationIfNeeded: false)
    }

    func openNotificationSettings() throws {
        let workspace = NSWorkspace.shared
        let language = (try? storage.currentLanguage()) ?? .english
        let candidateURLs = [
            "x-apple.systempreferences:com.apple.Notifications-Settings.extension",
            "x-apple.systempreferences:com.apple.preference.notifications",
        ]

        NSApp.activate(ignoringOtherApps: true)

        for candidate in candidateURLs {
            guard let url = URL(string: candidate) else {
                continue
            }

            if workspace.open(url) {
                return
            }
        }

        let systemSettingsURL = URL(fileURLWithPath: "/System/Applications/System Settings.app")
        if workspace.open(systemSettingsURL) {
            return
        }

        throw QuickNoteBridgeError.invalidParameters(language.localization.notificationOpenSettingsFailedMessage)
    }

    func openTextColorPanel(requestID: String, colorHex: String?) throws {
        let colorPanel = NSColorPanel.shared
        installTextColorPanelObserversIfNeeded()

        activeTextColorPanelRequestID = requestID
        NSColorPanel.setPickerMode(NSColorPanel.Mode.wheel)
        colorPanel.showsAlpha = false
        colorPanel.isContinuous = true
        colorPanel.hidesOnDeactivate = false
        colorPanel.isReleasedWhenClosed = false
        colorPanel.mode = NSColorPanel.Mode.wheel

        if let color = color(from: colorHex) {
            colorPanel.color = color
        }

        logger.debug("Opening text color panel. requestID=\(requestID, privacy: .public)")
        NSApp.activate(ignoringOtherApps: true)
        bringPanelToFront(context: "Opening text color panel")
        presentTextColorPanel(colorPanel, reposition: true)
    }

    func testReminderNotification(soundEnabled: Bool, language: QuickNoteLanguage) async throws {
        try await notificationManager.scheduleTestNotification(
            soundEnabled: soundEnabled,
            language: language
        )
    }

    func registerHotKey(shortcut: String) throws {
        try hotKeyManager.register(shortcut: shortcut)
    }

    func readClipboardText() -> String {
        NSPasteboard.general.string(forType: .string) ?? ""
    }

    func setEditableInputActiveFromBridge(_ active: Bool) {
        isEditableInputActive = active

        if !active {
            isTextCompositionActive = false
        }

        updatePanelPresentationForCurrentInteraction()
    }

    func setTextCompositionActiveFromBridge(_ active: Bool) {
        isTextCompositionActive = active

        if active {
            isEditableInputActive = true
        }

        updatePanelPresentationForCurrentInteraction()
    }

    func writeClipboardText(_ text: String) {
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)
    }

    func hideMainWindowFromBridge() {
        hideMainWindow()
    }

    func quitApplicationFromBridge() {
        NSApp.terminate(nil)
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
        if dismissTextColorPanelIfNeededForPanelFocus(context: "Panel became key") {
            logPanelState(context: "Panel became key")
            return
        }

        updatePanelPresentationForCurrentInteraction()
        logPanelState(context: "Panel became key")
    }

    func windowDidBecomeMain(_ notification: Notification) {
        if dismissTextColorPanelIfNeededForPanelFocus(context: "Panel became main") {
            logPanelState(context: "Panel became main")
            return
        }

        updatePanelPresentationForCurrentInteraction()
        logPanelState(context: "Panel became main")
    }

    func windowDidChangeOcclusionState(_ notification: Notification) {
        logPanelState(context: "Panel occlusion changed")
    }

    func windowDidResignKey(_ notification: Notification) {
        if activeTextColorPanelRequestID != nil {
            return
        }

        updatePanelPresentationForCurrentInteraction()
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

    private func logToggleState(context: String) {
        let appKeyWindowIsPanel = NSApp.keyWindow === panel
        let appMainWindowIsPanel = NSApp.mainWindow === panel
        let panelOccluded = panel.occlusionState.contains(.visible)

        logger.info(
            "\(context, privacy: .public). appActive=\(NSApp.isActive) panelVisible=\(self.panel.isVisible) panelPresented=\(self.isPanelPresented) panelKey=\(self.panel.isKeyWindow) panelMain=\(self.panel.isMainWindow) appKeyWindowIsPanel=\(appKeyWindowIsPanel) appMainWindowIsPanel=\(appMainWindowIsPanel) panelOcclusionVisible=\(panelOccluded)"
        )
    }

    private func togglePanel(reason: String) {
        logToggleState(context: "Toggling panel (\(reason)) before action")

        if isPanelPresented {
            hideMainWindow()
        } else {
            showMainWindow()
        }

        logToggleState(context: "Toggling panel (\(reason)) after action")
    }

    private func configurePanelForGlobalOverlay() {
        panel.level = Self.overlayPanelLevel
        panel.collectionBehavior.formUnion(Self.overlayCollectionBehavior)
    }

    private func configurePanelForInteractiveInput() {
        panel.level = Self.interactivePanelLevel
        panel.collectionBehavior.formUnion(Self.overlayCollectionBehavior)
    }

    private func configurePanelForTextComposition() {
        panel.level = .normal
        panel.collectionBehavior.formUnion(Self.overlayCollectionBehavior)
    }

    private func updatePanelPresentationForCurrentInteraction() {
        guard panel.isVisible else {
            return
        }

        if activeTextColorPanelRequestID != nil {
            configurePanelForInteractiveInput()
            return
        }

        if isTextCompositionActive {
            configurePanelForTextComposition()
            return
        }

        if isEditableInputActive {
            configurePanelForInteractiveInput()
            return
        }

        configurePanelForGlobalOverlay()
    }

    private func bringPanelToFront(context: String) {
        configurePanelForGlobalOverlay()
        panel.orderFrontRegardless()
        panel.orderFront(nil)
        panel.invalidateShadow()
        updatePanelPresentationForCurrentInteraction()
        logger.debug("\(context, privacy: .public): raised panel above the active Space.")
    }

    private func presentTextColorPanel(_ colorPanel: NSColorPanel, reposition: Bool) {
        if reposition {
            positionTextColorPanel(colorPanel)
        }

        colorPanel.collectionBehavior = Self.overlayCollectionBehavior
        colorPanel.level = NSWindow.Level(rawValue: Self.overlayPanelLevel.rawValue + 1)

        colorPanel.makeKeyAndOrderFront(nil)
        colorPanel.orderFrontRegardless()
        logger.debug("Raised text color panel above the main overlay.")
    }

    private func dismissTextColorPanel(emitClose: Bool) {
        let colorPanel = NSColorPanel.shared
        let requestID = activeTextColorPanelRequestID

        activeTextColorPanelRequestID = nil

        if colorPanel.isVisible {
            colorPanel.orderOut(nil)
        }

        if emitClose, let requestID {
            webViewController.emitTextColorPanelClose(requestID: requestID)
        }
    }

    private func dismissTextColorPanelIfNeededForPanelFocus(context: String) -> Bool {
        guard activeTextColorPanelRequestID != nil, NSColorPanel.shared.isVisible else {
            return false
        }

        dismissTextColorPanel(emitClose: true)
        updatePanelPresentationForCurrentInteraction()
        logger.debug("\(context, privacy: .public): dismissed text color panel after the main panel regained focus.")
        return true
    }

    private func positionTextColorPanel(_ colorPanel: NSColorPanel) {
        let windowFrame = panel.frame
        let screenFrame = panel.screen?.visibleFrame ?? NSScreen.main?.visibleFrame ?? windowFrame
        let margin: CGFloat = 16
        let gap: CGFloat = 12
        let panelSize = colorPanel.frame.size

        let preferredRightX = windowFrame.maxX + gap
        let preferredLeftX = windowFrame.minX - panelSize.width - gap

        let x: CGFloat
        if preferredRightX + panelSize.width <= screenFrame.maxX - margin {
            x = preferredRightX
        } else if preferredLeftX >= screenFrame.minX + margin {
            x = preferredLeftX
        } else {
            x = min(
                max(windowFrame.midX - panelSize.width / 2, screenFrame.minX + margin),
                screenFrame.maxX - panelSize.width - margin
            )
        }

        let centeredY = windowFrame.midY - panelSize.height / 2
        let y = min(
            max(centeredY, screenFrame.minY + margin),
            screenFrame.maxY - panelSize.height - margin
        )

        colorPanel.setFrameOrigin(NSPoint(x: x, y: y))
    }

    private func installTextColorPanelObserversIfNeeded() {
        let colorPanel = NSColorPanel.shared

        if textColorPanelChangeObserver == nil {
            textColorPanelChangeObserver = NotificationCenter.default.addObserver(
                forName: NSColorPanel.colorDidChangeNotification,
                object: colorPanel,
                queue: .main
            ) { [weak self, weak colorPanel] _ in
                Task { @MainActor [weak self, weak colorPanel] in
                    guard
                        let self,
                        let requestID = self.activeTextColorPanelRequestID,
                        let panel = colorPanel
                    else {
                        return
                    }

                    self.webViewController.emitTextColorPanelChange(
                        requestID: requestID,
                        colorHex: self.hexColor(from: panel.color)
                    )
                }
            }
        }

        if textColorPanelCloseObserver == nil {
            textColorPanelCloseObserver = NotificationCenter.default.addObserver(
                forName: NSWindow.willCloseNotification,
                object: colorPanel,
                queue: .main
            ) { [weak self] _ in
                Task { @MainActor [weak self] in
                    guard let self, let requestID = self.activeTextColorPanelRequestID else {
                        return
                    }

                    self.activeTextColorPanelRequestID = nil
                    self.webViewController.emitTextColorPanelClose(requestID: requestID)
                }
            }
        }
    }

    private func color(from hexColor: String?) -> NSColor? {
        guard var normalized = hexColor?.trimmingCharacters(in: .whitespacesAndNewlines), !normalized.isEmpty else {
            return nil
        }

        if normalized.hasPrefix("#") {
            normalized.removeFirst()
        }

        guard normalized.count == 6, let value = Int(normalized, radix: 16) else {
            return nil
        }

        let red = CGFloat((value >> 16) & 0xFF) / 255
        let green = CGFloat((value >> 8) & 0xFF) / 255
        let blue = CGFloat(value & 0xFF) / 255

        return NSColor(srgbRed: red, green: green, blue: blue, alpha: 1)
    }

    private func hexColor(from color: NSColor) -> String {
        let srgbColor = color.usingColorSpace(.sRGB) ?? color
        let red = Int((srgbColor.redComponent * 255).rounded())
        let green = Int((srgbColor.greenComponent * 255).rounded())
        let blue = Int((srgbColor.blueComponent * 255).rounded())

        return String(format: "#%02X%02X%02X", red, green, blue)
    }

    private func syncTodoReminderNotifications(
        todos: Any,
        settings: [String: Any],
        requestAuthorizationIfNeeded: Bool
    ) {
        Task { @MainActor [weak self] in
            guard let self else {
                return
            }

            let soundEnabled = (settings["enableReminderSound"] as? Bool) ?? true
            let language = QuickNoteLanguage(storedValue: settings["language"])
            let deliveredTodoIDs = await self.notificationManager.consumeDeliveredTodoReminderIdentifiers()
            let effectiveTodos = self.reconcileReminderState(
                from: todos,
                deliveredTodoIDs: Set(deliveredTodoIDs)
            )
            let reminders = self.reminderDescriptors(from: effectiveTodos, language: language)

            do {
                let scheduledReminders = try await self.notificationManager.replaceScheduledTodoReminders(
                    with: reminders,
                    soundEnabled: soundEnabled,
                    language: language,
                    requestAuthorizationIfNeeded: requestAuthorizationIfNeeded
                )

                self.logger.info(
                    "Reminder sync completed. scheduledCount=\(scheduledReminders.count) targetCount=\(reminders.count)"
                )
            } catch {
                self.logger.error("Reminder sync failed. error=\(error.localizedDescription, privacy: .public)")
            }
        }
    }

    private func reminderDescriptors(
        from todos: Any,
        language: QuickNoteLanguage
    ) -> [TodoReminderDescriptor] {
        guard let rawTodos = todos as? [[String: Any]] else {
            return []
        }

        let now = Date()

        return rawTodos.compactMap { todo in
            let done = (todo["done"] as? Bool) ?? false
            guard !done else {
                return nil
            }

            guard
                let id = todo["id"] as? String,
                let reminderAt = todo["reminderAt"] as? Double ?? (todo["reminderAt"] as? Int).map(Double.init)
            else {
                return nil
            }

            let reminderDate = Date(timeIntervalSince1970: reminderAt / 1000)
            guard reminderDate > now else {
                return nil
            }

            let text = (todo["text"] as? String)?
                .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""

            return TodoReminderDescriptor(
                todoID: id,
                notificationTitle: text.isEmpty ? language.localization.reminderNotificationTitle : text,
                notificationBody: text.isEmpty
                    ? language.localization.reminderNotificationFallbackBody
                    : language.localization.reminderNotificationTitle,
                reminderDate: reminderDate
            )
        }
    }

    private func reconcileReminderState(
        from todos: Any,
        deliveredTodoIDs: Set<String>
    ) -> Any {
        guard let rawTodos = todos as? [[String: Any]] else {
            return todos
        }

        let now = Date().timeIntervalSince1970 * 1000
        var didChange = false

        let updatedTodos = rawTodos.map { todo -> [String: Any] in
            var nextTodo = todo
            let isDone = (todo["done"] as? Bool) ?? false
            let id = todo["id"] as? String

            guard
                !isDone,
                let reminderAt = todo["reminderAt"] as? Double ?? (todo["reminderAt"] as? Int).map(Double.init)
            else {
                return nextTodo
            }

            let shouldClear = reminderAt <= now || id.map(deliveredTodoIDs.contains) == true
            guard shouldClear else {
                return nextTodo
            }

            nextTodo["reminderAt"] = NSNull()
            didChange = true
            return nextTodo
        }

        guard didChange else {
            return rawTodos
        }

        persistTodosAfterNativeUpdate(updatedTodos)
        return updatedTodos
    }

    private func clearReminder(forTodoIDs todoIDs: [String], todosOverride: [[String: Any]]?) {
        guard !todoIDs.isEmpty else {
            return
        }

        let targetIDs = Set(todoIDs)

        do {
            let storedTodos = try storage.loadTodos() as? [[String: Any]]
            let rawTodos = todosOverride ?? storedTodos ?? []
            var didChange = false

            let updatedTodos = rawTodos.map { todo -> [String: Any] in
                var nextTodo = todo

                guard
                    let id = todo["id"] as? String,
                    targetIDs.contains(id),
                    !(todo["reminderAt"] is NSNull),
                    todo["reminderAt"] != nil
                else {
                    return nextTodo
                }

                nextTodo["reminderAt"] = NSNull()
                didChange = true
                return nextTodo
            }

            guard didChange else {
                return
            }

            persistTodosAfterNativeUpdate(updatedTodos)

            if let settings = try? storage.loadSettings() {
                for todoID in todoIDs {
                    notificationManager.cancelReminder(forTodoID: todoID)
                }

                syncTodoReminderNotifications(
                    todos: updatedTodos,
                    settings: settings,
                    requestAuthorizationIfNeeded: false
                )
            }
        } catch {
            logger.error(
                "Failed to clear delivered todo reminders. ids=\(todoIDs.joined(separator: ","), privacy: .public) error=\(error.localizedDescription, privacy: .public)"
            )
        }
    }

    private func persistTodosAfterNativeUpdate(_ todos: [[String: Any]]) {
        do {
            try storage.saveTodos(todos)
            webViewController.emitTodosUpdated(todos)
        } catch {
            logger.error("Failed to persist native todo reminder updates. error=\(error.localizedDescription, privacy: .public)")
        }
    }

    private func installOverlayObservers() {
        spaceObserver = NSWorkspace.shared.notificationCenter.addObserver(
            forName: NSWorkspace.activeSpaceDidChangeNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self, self.panel.isVisible else {
                    return
                }

                if self.activeTextColorPanelRequestID != nil, NSColorPanel.shared.isVisible {
                    self.presentTextColorPanel(NSColorPanel.shared, reposition: false)
                    return
                }

                self.bringPanelToFront(context: "Active space changed")
            }
        }

        appDidBecomeActiveObserver = NotificationCenter.default.addObserver(
            forName: NSApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self, self.panel.isVisible else {
                    return
                }

                if self.activeTextColorPanelRequestID != nil, NSColorPanel.shared.isVisible {
                    self.presentTextColorPanel(NSColorPanel.shared, reposition: false)
                    return
                }

                self.bringPanelToFront(context: "App became active")
            }
        }
    }
}
