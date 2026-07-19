import AppKit
import OSLog

@MainActor
final class MainWindowController: NSObject, NSWindowDelegate, StickItNativeBridgeHandling {
    private static let defaultPanelSize = NSSize(width: 400, height: 680)
    private static let minimumPanelSize = NSSize(width: 320, height: 480)
    static let overlayPanelLevel = NSWindow.Level.statusBar
    private static let interactivePanelLevel = NSWindow.Level.floating
    static var overlayCollectionBehavior: NSWindow.CollectionBehavior {
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
    private let launchAtLoginManager: LaunchAtLoginManager
    private let widgetRefreshCoordinator = WidgetRefreshCoordinator()
    private let panel: FloatingPanel
    private let webViewController: WebViewController
    private let dragPreviewWindowController = DragPreviewWindowController()
    private let logger = Logger(subsystem: "com.stickit.app", category: "Window")
    private static let lifecycle = Logger(subsystem: "com.stickit.floating", category: "Lifecycle")
    private static let pipeline = Logger(subsystem: "com.stickit.floating", category: "Pipeline")

    /// When enabled (via `defaults write com.stickit.app DEBUG_FLOATING_LIFECYCLE -bool true`),
    /// lifecycle events are logged at info level so you can trace create/destroy/deinit through every drag cycle.
    private nonisolated static let debugLifecycle: Bool = {
        DebugFlags.isEnabled("DEBUG_FLOATING_LIFECYCLE")
    }()
    private nonisolated static let debugPipeline: Bool = {
        DebugFlags.isEnabled("DEBUG_FLOATING_PIPELINE")
    }()

    private var lastHotKeyPressTimestamp: CFAbsoluteTime = 0
    private var activeTextColorPanelRequestID: String?
    private var isEditableInputActive = false
    private var isTextCompositionActive = false
    private var spaceObserver: NSObjectProtocol?
    private var textColorPanelChangeObserver: NSObjectProtocol?
    private var textColorPanelCloseObserver: NSObjectProtocol?
    private var appDidBecomeActiveObserver: NSObjectProtocol?
    private var activeScreenColorSampler: AnyObject?
    private var dragPreviewTimer: Timer?
    private var activeDragPreviewSession: DragPreviewSession?
    private var isDragPreviewDockZoneActive = false
    private var floatingCardWindowControllers: [String: FloatingNoteWindowController] = [:]
    private var floatingCardPayloads: [String: [String: Any]] = [:]

    private static let hotKeyDebounceInterval: CFAbsoluteTime = 0.25

    private var isPanelPresented: Bool {
        panel.isVisible
    }

    init(
        storage: AppStorage,
        hotKeyManager: GlobalHotKeyManager,
        notificationManager: NotificationManager,
        launchAtLoginManager: LaunchAtLoginManager
    ) {
        self.storage = storage
        self.hotKeyManager = hotKeyManager
        self.notificationManager = notificationManager
        self.launchAtLoginManager = launchAtLoginManager

        panel = FloatingPanel(
            contentRect: NSRect(origin: .zero, size: Self.defaultPanelSize),
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .nonactivatingPanel],
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
        panel.backgroundColor = Self.windowColor(for: "classic")
        panel.isOpaque = true
        panel.hasShadow = true
        panel.level = Self.overlayPanelLevel
        panel.isFloatingPanel = true
        panel.becomesKeyOnlyIfNeeded = false
        panel.title = "StickIt"
        panel.titleVisibility = .hidden
        panel.titlebarAppearsTransparent = true
        panel.collectionBehavior = Self.overlayCollectionBehavior
        panel.hidesOnDeactivate = false
        panel.isMovableByWindowBackground = true
        panel.standardWindowButton(.closeButton)?.isHidden = false
        panel.standardWindowButton(.miniaturizeButton)?.isHidden = false
        panel.standardWindowButton(.zoomButton)?.isHidden = false
        panel.minSize = Self.minimumPanelSize
        panel.contentViewController = webViewController
        installOverlayObservers()

        hotKeyManager.onHotKeyPressed = { [weak self] in
            self?.handleHotKeyPressed()
        }
        hotKeyManager.onRegistrationStateChanged = { [weak self] state in
            self?.webViewController.emitHotkeyRegistrationState(self?.hotKeyRegistrationStatePayload(from: state) ?? [:])
        }
    }

    func setWindowThemeFromBridge(_ theme: String) {
        let color = Self.windowColor(for: theme)
        panel.backgroundColor = color
        panel.appearance = NSAppearance(named: .aqua)
        webViewController.setHostBackgroundColor(color)
    }

    private static func windowColor(for theme: String) -> NSColor {
        switch theme {
        case "forest":
            return NSColor(srgbRed: 0.863, green: 0.910, blue: 0.875, alpha: 1)
        case "orchid":
            return NSColor(srgbRed: 0.933, green: 0.961, blue: 0.922, alpha: 1)
        case "plum":
            return NSColor(srgbRed: 0.957, green: 0.882, blue: 0.898, alpha: 1)
        case "chrysanthemum":
            return NSColor(srgbRed: 0.961, green: 0.929, blue: 0.812, alpha: 1)
        case "afterglow":
            return NSColor(srgbRed: 0.969, green: 0.945, blue: 0.910, alpha: 1)
        default:
            return NSColor(srgbRed: 0.969, green: 0.949, blue: 0.910, alpha: 1)
        }
    }

    deinit {
        dragPreviewTimer?.invalidate()

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
        hideDragPreviewFromBridge()
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
        widgetRefreshCoordinator.requestReload()
    }

    func saveTodos(_ todos: Any) throws {
        try storage.saveTodos(todos)
        widgetRefreshCoordinator.requestReload()
        let settings = try storage.loadSettings()
        syncTodoReminderNotifications(todos: todos, settings: settings, requestAuthorizationIfNeeded: true)
    }

    func saveSettings(_ settings: Any) throws {
        guard var settingsDictionary = settings as? [String: Any] else {
            throw StickItBridgeError.invalidParameters("StickIt expected settings to be a JSON object.")
        }

        let fallbackShortcut = hotKeyManager.registeredShortcut ?? (try? storage.currentHotkey()) ?? GlobalHotKeyManager.defaultShortcut
        let candidateShortcut = settingsDictionary["hotkey"] as? String ?? fallbackShortcut

        settingsDictionary["hotkey"] = GlobalHotKeyManager.isShortcutValid(candidateShortcut)
            ? GlobalHotKeyManager.normalize(shortcut: candidateShortcut)
            : fallbackShortcut

        let launchAtLogin = settingsDictionary["launchAtLogin"] as? Bool
            ?? (try? storage.currentLaunchAtLogin())
            ?? true
        try launchAtLoginManager.setEnabled(launchAtLogin)
        settingsDictionary["launchAtLogin"] = launchAtLogin

        try storage.saveSettings(settingsDictionary)
        widgetRefreshCoordinator.requestReload()
        let todos = try storage.loadTodos()
        let savedSettings = try storage.loadSettings()
        syncTodoReminderNotifications(todos: todos, settings: savedSettings, requestAuthorizationIfNeeded: false)
    }

    func openNotificationSettings() throws {
        let workspace = NSWorkspace.shared
        let language = (try? storage.currentLanguage()) ?? .simplifiedChinese
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

        throw StickItBridgeError.invalidParameters(language.localization.notificationOpenSettingsFailedMessage)
    }

    func sendNotification(id: String?, title: String, body: String, soundEnabled: Bool) async throws {
        let language = (try? storage.currentLanguage()) ?? .simplifiedChinese
        try await notificationManager.scheduleBridgeNotification(
            identifier: id,
            title: title,
            body: body,
            scheduledAt: nil,
            soundEnabled: soundEnabled,
            language: language
        )
    }

    func scheduleNotification(
        id: String?,
        title: String,
        body: String,
        scheduledAt: Date?,
        soundEnabled: Bool
    ) async throws {
        let language = (try? storage.currentLanguage()) ?? .simplifiedChinese
        try await notificationManager.scheduleBridgeNotification(
            identifier: id,
            title: title,
            body: body,
            scheduledAt: scheduledAt,
            soundEnabled: soundEnabled,
            language: language
        )
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

    func pickScreenColor() async throws -> String? {
        if #available(macOS 10.15, *) {
            return await withCheckedContinuation { continuation in
                let sampler = NSColorSampler()
                activeScreenColorSampler = sampler
                sampler.show { [weak self] color in
                    Task { @MainActor [weak self] in
                        guard let self else {
                            continuation.resume(returning: nil)
                            return
                        }

                        self.activeScreenColorSampler = nil
                        guard let color else {
                            continuation.resume(returning: nil)
                            return
                        }

                        continuation.resume(returning: self.hexColor(from: color))
                    }
                }
            }
        }

        return nil
    }

    func testReminderNotification(soundEnabled: Bool, language: StickItLanguage) async throws {
        try await notificationManager.scheduleTestNotification(
            soundEnabled: soundEnabled,
            language: language
        )
    }

    func currentHotKeyRegistrationState() -> [String: Any] {
        hotKeyRegistrationStatePayload(from: hotKeyManager.registrationState)
    }

    func currentFloatingCardState() -> [String: [String]] {
        let noteIDs = floatingCardWindowControllers.values
            .filter { $0.cardKind == "note" }
            .map(\.cardID)
            .sorted()
        let todoIDs = floatingCardWindowControllers.values
            .filter { $0.cardKind == "todo" }
            .map(\.cardID)
            .sorted()

        return [
            "note": noteIDs,
            "todo": todoIDs,
        ]
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

    func showDragPreviewFromBridge(_ payload: Any) throws {
        guard let payloadDictionary = payload as? [String: Any],
              let session = DragPreviewSession(payload: payloadDictionary)
        else {
            throw StickItBridgeError.invalidParameters("StickIt expected a valid drag preview payload from JavaScript.")
        }

        if Self.debugPipeline {
            Self.pipeline.info("showDragPreview(kind=\(session.cardKind, privacy: .public), cardId=\(session.cardID, privacy: .public))")
        }

        setDragPreviewDockZoneActive(false, session: activeDragPreviewSession)
        activeDragPreviewSession = session
        dragPreviewWindowController.updatePayload(payloadDictionary)
        updateDragPreviewWindow()
        ensureDragPreviewTimer()
    }

    func hideDragPreviewFromBridge() {
        if Self.debugPipeline, let session = activeDragPreviewSession {
            Self.pipeline.info("hideDragPreview(kind=\(session.cardKind, privacy: .public), cardId=\(session.cardID, privacy: .public))")
        }

        setDragPreviewDockZoneActive(false, session: activeDragPreviewSession)
        activeDragPreviewSession = nil
        dragPreviewTimer?.invalidate()
        dragPreviewTimer = nil
        dragPreviewWindowController.hidePreview()
    }

    func showFloatingCardFromBridge(_ payload: Any) throws {
        try presentFloatingCard(payload, ignoreMainPanelDropZone: false)
    }

    @discardableResult
    func openFloatingCard(reference: WidgetEntityReference) throws -> Bool {
        let key = Self.floatingCardKey(kind: reference.entityKind.rawValue, id: reference.entityID)
        if let existingController = floatingCardWindowControllers[key] {
            existingController.focusWindow()
            return true
        }

        guard let payload = try storage.floatingCardPayload(kind: reference.entityKind, id: reference.entityID) else {
            return false
        }
        try presentFloatingCard(payload, ignoreMainPanelDropZone: true)
        return true
    }

    private func presentFloatingCard(_ payload: Any, ignoreMainPanelDropZone: Bool) throws {
        guard
            let payloadDictionary = payload as? [String: Any],
            let kind = payloadDictionary["kind"] as? String,
            ["note", "todo"].contains(kind),
            let cardID = Self.floatingCardID(from: payloadDictionary, kind: kind),
            let session = DragPreviewSession(payload: payloadDictionary)
        else {
            throw StickItBridgeError.invalidParameters("StickIt expected a valid floating card payload from JavaScript.")
        }

        let mouseLocation = NSEvent.mouseLocation
        if !ignoreMainPanelDropZone && panel.isVisible && panel.frame.contains(mouseLocation) {
            return
        }

        hideDragPreviewFromBridge()

        let key = Self.floatingCardKey(kind: kind, id: cardID)
        let controller = floatingCardWindowControllers[key] ?? FloatingNoteWindowController(cardKind: kind, cardID: cardID)
        controller.onClose = { [weak self] itemKind, id in
            Task { @MainActor [weak self] in
                self?.closeFloatingCardFromBridge(kind: itemKind, id: id)
            }
        }
        controller.onRequestDrag = { [weak self] itemKind, id in
            self?.logger.info("[FLT:DOCK] onRequestDrag callback fired kind=\(itemKind, privacy: .public) id=\(id, privacy: .public)")
            Task { @MainActor [weak self] in
                self?.logger.info("[FLT:DOCK] Task executing startFloatingCardDragFromBridge")
                self?.startFloatingCardDragFromBridge(kind: itemKind, id: id)
            }
        }
        controller.onSetDesktopPinned = { [weak self] itemKind, id, pinned in
            try? self?.setFloatingCardDesktopPinnedFromBridge(kind: itemKind, id: id, pinned: pinned)
        }
        controller.onRequestDesktopWidget = { [weak self] itemKind, id in
            guard let self else { return [:] }
            return try self.requestDesktopWidgetFromBridge(kind: itemKind, id: id)
        }
        controller.onRemoveDesktopWidgetAssociation = { [weak self] itemKind, id in
            try self?.removeDesktopWidgetAssociationFromBridge(kind: itemKind, id: id)
        }
        controller.onGetDesktopWidgetState = { [weak self] itemKind, id in
            guard let self else { return [:] }
            return try self.getDesktopWidgetStateFromBridge(kind: itemKind, id: id)
        }
        controller.onFrameChange = nil
        controller.onLoadAllData = { [weak self] in
            guard let self else {
                return [:]
            }

            return try self.storage.loadAllData()
        }
        controller.onSaveNotes = { [weak self] notes in
            guard let self else {
                return
            }

            try self.storage.saveNotes(notes)
            self.widgetRefreshCoordinator.requestReload()
            self.webViewController.emitNotesUpdated(notes)
        }
        controller.onSaveTodos = { [weak self] todos in
            guard let self else {
                return
            }

            try self.saveTodos(todos)
            self.webViewController.emitTodosUpdated(todos)
        }
        controller.onSaveSettings = { [weak self] settings in
            guard let self else {
                return
            }

            try self.saveSettings(settings)
        }
        controller.onReadClipboardText = { [weak self] in
            self?.readClipboardText() ?? ""
        }
        controller.onWriteClipboardText = { [weak self] text in
            self?.writeClipboardText(text)
        }
        controller.onPickScreenColor = { [weak self] in
            guard let self else {
                return nil
            }

            return try await self.pickScreenColor()
        }
        floatingCardWindowControllers[key] = controller
        floatingCardPayloads[key] = payloadDictionary
        if Self.debugLifecycle {
            Self.lifecycle.info("panelCreated(cardId=\(cardID, privacy: .public)) kind=\(kind, privacy: .public)")
            logRemainingFloatingPanelCount()
        }
        let cardFrame = floatingCardFrame(for: mouseLocation, session: session)
        controller.updatePayload(payloadDictionary)
        controller.showWindow(frame: cardFrame)
        emitFloatingCardsState()
    }

    func closeFloatingCardFromBridge(kind: String, id: String) {
        destroyFloatingCardPanel(kind: kind, id: id, restoreDockedState: true)
    }

    func setFloatingCardDesktopPinnedFromBridge(kind: String, id: String, pinned: Bool) throws {
        if pinned {
            _ = try requestDesktopWidgetFromBridge(kind: kind, id: id)
        } else {
            try removeDesktopWidgetAssociationFromBridge(kind: kind, id: id)
        }
    }

    func requestDesktopWidgetFromBridge(kind: String, id: String) throws -> [String: Any] {
        guard let entityKind = StickItEntityKind(rawValue: kind), !id.isEmpty else {
            throw StickItBridgeError.invalidParameters("StickIt expected a valid Widget entity reference.")
        }
        try storage.setWidgetPreference(kind: entityKind, id: id, requested: true)
        widgetRefreshCoordinator.reloadImmediately()
        return [
            "requested": true,
            "requiresSystemPlacement": true,
            "message": "Add the StickIt Widget from the macOS Widget Gallery and select this item.",
        ]
    }

    func removeDesktopWidgetAssociationFromBridge(kind: String, id: String) throws {
        guard let entityKind = StickItEntityKind(rawValue: kind), !id.isEmpty else {
            throw StickItBridgeError.invalidParameters("StickIt expected a valid Widget entity reference.")
        }
        try storage.setWidgetPreference(kind: entityKind, id: id, requested: false)
        widgetRefreshCoordinator.reloadImmediately()
    }

    func getDesktopWidgetStateFromBridge(kind: String, id: String) throws -> [String: Any] {
        guard let entityKind = StickItEntityKind(rawValue: kind), !id.isEmpty else {
            throw StickItBridgeError.invalidParameters("StickIt expected a valid Widget entity reference.")
        }
        let requested = try storage.loadWidgetPreferences().contains {
            $0.entityKind == entityKind && $0.entityID == id
        }
        return ["requested": requested, "systemManaged": true]
    }

    @available(*, deprecated, message: "Legacy desktop panels are migration-only; WidgetKit restores desktop content.")
    func restorePinnedDesktopCards() {
        logger.info("Skipping legacy DesktopCardPanel restoration; WidgetKit owns desktop presentation.")
    }

    func startFloatingCardDragFromBridge(kind: String, id: String) {
        guard let controller = floatingCardWindowControllers[Self.floatingCardKey(kind: kind, id: id)] else {
            logger.error("[FLT:DOCK] controller not found for key kind=\(kind, privacy: .public) id=\(id, privacy: .public)")
            return
        }

        logger.info("[FLT:DOCK] dragStart kind=\(kind, privacy: .public) id=\(id, privacy: .public)")
        if Self.debugPipeline, activeDragPreviewSession != nil {
            Self.pipeline.info("dragStart clearingResidualPreview(kind=\(kind, privacy: .public), cardId=\(id, privacy: .public))")
        }

        var previousInDockZone = false
        var moveCount = 0

        // During drag: detect dock-zone enter/leave for visual feedback.
        // Uses BOTH cursor-over-panel AND window-overlap detection so the
        // user gets immediate visual feedback as soon as any part of the
        // floating window touches the main panel — not just when the cursor
        // itself enters the panel bounds.
        controller.onMove = { [weak self] floatingFrame in
            guard let self else {
                return
            }

            moveCount += 1
            let mouseLoc = NSEvent.mouseLocation
            let panelFrame = self.panel.frame
            let panelVisible = self.panel.isVisible

            let cursorInPanel = panelVisible && panelFrame.contains(mouseLoc)
            let windowOverlapsPanel = panelVisible && panelFrame.intersects(floatingFrame)
            let isInDockZone = cursorInPanel || windowOverlapsPanel

            if moveCount <= 3 || isInDockZone || moveCount % 20 == 0 {
                self.logger.info("[FLT:DOCK] onMove #\(moveCount) floatingFrame=(\(Int(floatingFrame.origin.x)),\(Int(floatingFrame.origin.y)),\(Int(floatingFrame.size.width))x\(Int(floatingFrame.size.height))) panelFrame=(\(Int(panelFrame.origin.x)),\(Int(panelFrame.origin.y)),\(Int(panelFrame.size.width))x\(Int(panelFrame.size.height))) mouse=(\(Int(mouseLoc.x)),\(Int(mouseLoc.y))) panelVisible=\(panelVisible) cursorIn=\(cursorInPanel) overlap=\(windowOverlapsPanel) dockZone=\(isInDockZone)")
            }

            if isInDockZone, !previousInDockZone {
                self.logger.info("[FLT:DOCK] emitFloatingDockZoneEnter kind=\(kind, privacy: .public) cardID=\(id, privacy: .public)")
                self.webViewController.emitFloatingDockZoneEnter(kind: kind, cardID: id)
            } else if !isInDockZone, previousInDockZone {
                self.logger.info("[FLT:DOCK] emitFloatingDockZoneLeave kind=\(kind, privacy: .public) cardID=\(id, privacy: .public)")
                self.webViewController.emitFloatingDockZoneLeave(kind: kind, cardID: id)
            }

            previousInDockZone = isInDockZone
        }

        let currentEvent = NSApp.currentEvent
        logger.info("[FLT:DOCK] startWindowDrag currentEvent=\(currentEvent != nil ? "present" : "NIL", privacy: .public)")

        let dragMouseUpEvent = controller.startWindowDrag()
        logger.info("[FLT:DOCK] performDrag returned after \(moveCount) move events")
        controller.onMove = nil

        // Clean up dock-zone highlight regardless of where the drag ended.
        if previousInDockZone {
            logger.info("[FLT:DOCK] emitFloatingDockZoneLeave (cleanup) kind=\(kind, privacy: .public) cardID=\(id, privacy: .public)")
            webViewController.emitFloatingDockZoneLeave(kind: kind, cardID: id)
        }

        // After drag: check if the cursor was released inside the dock zone.
        let mouseAtRelease = NSEvent.mouseLocation
        let panelBounds = panel.frame
        let panelVisible = panel.isVisible
        let isInside = panelVisible && panelBounds.contains(mouseAtRelease)

        logger.info("[FLT:DOCK] dragEnd releaseCheck panelVisible=\(panelVisible) panelFrame=(\(Int(panelBounds.origin.x)),\(Int(panelBounds.origin.y)),\(Int(panelBounds.size.width))x\(Int(panelBounds.size.height))) mouse=(\(Int(mouseAtRelease.x)),\(Int(mouseAtRelease.y))) isInside=\(isInside)")

        guard isInside else {
            controller.restoreWebViewInputAfterDrag(mouseUpEvent: dragMouseUpEvent)

            logger.info("[FLT:DOCK] dragEnd NOT inside dock zone — bailing")
            return
        }

        logger.info("[FLT:DOCK] dockingStart — removing from dict, emitting state, closing window")

        // Remove from dict → emit state → destroy panel.
        // State is emitted BEFORE the window is destroyed so the frontend
        // restores the docked placeholder without any visible gap.
        // Panel close with explicit handler teardown ensures no zombie
        // WebView processes linger after repeated undock/dock cycles.
        destroyFloatingCardPanel(kind: kind, id: id, restoreDockedState: true, controller: controller)
        logger.info("[FLT:DOCK] floatingWindowDestroyed — docking complete")
    }

    func writeClipboardText(_ text: String) {
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)
    }

    func showMainWindowFromBridge() {
        showMainWindow()
    }

    func hideMainWindowFromBridge() {
        hideMainWindow()
    }

    func toggleMainWindowFromBridge() {
        toggleMainWindow()
    }

    func minimizeMainWindowFromBridge() {
        panel.performMiniaturize(nil)
    }

    func maximizeMainWindowFromBridge() {
        panel.zoom(nil)
    }

    func closeMainWindowFromBridge() {
        hideMainWindow()
    }

    func setAlwaysOnTopFromBridge(_ enabled: Bool) {
        panel.level = enabled ? Self.overlayPanelLevel : Self.interactivePanelLevel
        panel.collectionBehavior = enabled ? Self.overlayCollectionBehavior : [.canJoinAllSpaces, .fullScreenAuxiliary]
        bringPanelToFront(context: enabled ? "Enabled always-on-top" : "Disabled always-on-top")
    }

    func quitApplicationFromBridge() {
        NSApp.terminate(nil)
    }

    func startWindowDragFromBridge() throws {
        guard let currentEvent = NSApp.currentEvent else {
            throw StickItBridgeError.invalidParameters("StickIt could not access the current mouse event for dragging.")
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

    private func ensureDragPreviewTimer() {
        guard dragPreviewTimer == nil else {
            return
        }

        dragPreviewTimer = Timer.scheduledTimer(withTimeInterval: 1.0 / 60.0, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.updateDragPreviewWindow()
            }
        }
    }

    private func updateDragPreviewWindow() {
        guard let session = activeDragPreviewSession else {
            dragPreviewWindowController.hidePreview()
            return
        }

        let mouseLocation = NSEvent.mouseLocation
        let isInDockZone = panel.isVisible && panel.frame.contains(mouseLocation)
        setDragPreviewDockZoneActive(isInDockZone, session: session)

        if isInDockZone {
            dragPreviewWindowController.hidePreview()
            return
        }

        dragPreviewWindowController.showPreview(frame: dragPreviewFrame(for: mouseLocation, session: session))
    }

    private func setDragPreviewDockZoneActive(_ active: Bool, session: DragPreviewSession?) {
        guard active != isDragPreviewDockZoneActive else {
            return
        }

        isDragPreviewDockZoneActive = active

        guard let session, !session.cardKind.isEmpty, !session.cardID.isEmpty else {
            return
        }

        if active {
            webViewController.emitFloatingDockZoneEnter(kind: session.cardKind, cardID: session.cardID)
        } else {
            webViewController.emitFloatingDockZoneLeave(kind: session.cardKind, cardID: session.cardID)
        }
    }

    private func dragPreviewFrame(for mouseLocation: CGPoint, session: DragPreviewSession) -> NSRect {
        NSRect(
            x: mouseLocation.x - session.pointerOffset.x - DragPreviewSession.windowPadding,
            y: mouseLocation.y - session.windowHeight + session.pointerOffset.y + DragPreviewSession.windowPadding,
            width: session.windowWidth,
            height: session.windowHeight
        )
    }

    private func floatingCardFrame(for mouseLocation: CGPoint, session: DragPreviewSession) -> NSRect {
        NSRect(
            x: mouseLocation.x - session.pointerOffset.x,
            y: mouseLocation.y - session.contentHeight + session.pointerOffset.y,
            width: session.contentWidth,
            height: session.contentHeight
        )
    }

    private func activeScreen() -> NSScreen? {
        let mouseLocation = NSEvent.mouseLocation

        return NSScreen.screens.first(where: { screen in
            NSMouseInRect(mouseLocation, screen.frame, false)
        }) ?? NSScreen.main ?? NSScreen.screens.first
    }

    private func emitFloatingCardsState() {
        let state = currentFloatingCardState()

        if Self.debugPipeline {
            let noteIDs = state["note"] ?? []
            let todoIDs = state["todo"] ?? []
            Self.pipeline.info("emitFloatingCardsState(noteIds=\(noteIDs.joined(separator: ","), privacy: .public), todoIds=\(todoIDs.joined(separator: ","), privacy: .public), count=\(noteIDs.count + todoIDs.count))")
        }

        webViewController.emitFloatingCardsState(
            noteIDs: state["note"] ?? [],
            todoIDs: state["todo"] ?? []
        )
    }

    private func destroyFloatingCardPanel(
        kind: String,
        id: String,
        restoreDockedState: Bool,
        controller providedController: FloatingNoteWindowController? = nil
    ) {
        let key = Self.floatingCardKey(kind: kind, id: id)
        guard let controller = floatingCardWindowControllers.removeValue(forKey: key) ?? providedController else {
            return
        }

        if Self.debugLifecycle {
            Self.lifecycle.info("dockStart(cardId=\(id, privacy: .public))")
        }

        controller.closeWindow()
        floatingCardPayloads.removeValue(forKey: key)
        removePersistedDesktopCard(kind: kind, id: id)

        if restoreDockedState {
            DispatchQueue.main.async { [weak self] in
                guard let self else {
                    return
                }

                self.emitFloatingCardsState()

                if Self.debugLifecycle {
                    Self.lifecycle.info("restoreDockedState(cardId=\(id, privacy: .public))")
                }
            }
        }

        if Self.debugLifecycle {
            Self.lifecycle.info("panel removedFromRegistry(cardId=\(id, privacy: .public))")
            logRemainingFloatingPanelCount()
        }
    }

    private func persistDesktopCard(kind: String, id: String, frame: NSRect) {
        let key = Self.floatingCardKey(kind: kind, id: id)
        guard var payload = floatingCardPayloads[key] else { return }
        payload["desktopPinned"] = true

        var records = (try? storage.loadDesktopCards()) ?? []
        records.removeAll { record in
            record["kind"] as? String == kind && record["id"] as? String == id
        }
        records.append([
            "kind": kind,
            "id": id,
            "payload": payload,
            "frame": [
                "x": frame.origin.x,
                "y": frame.origin.y,
                "width": frame.width,
                "height": frame.height,
            ],
        ])
        try? storage.saveDesktopCards(records)
    }

    private func removePersistedDesktopCard(kind: String, id: String) {
        var records = (try? storage.loadDesktopCards()) ?? []
        let originalCount = records.count
        records.removeAll { record in
            record["kind"] as? String == kind && record["id"] as? String == id
        }
        if records.count != originalCount {
            try? storage.saveDesktopCards(records)
        }
    }

    private func logRemainingFloatingPanelCount() {
        guard Self.debugLifecycle else {
            return
        }

        Self.lifecycle.info("remainingFloatingPanelCount=\(self.floatingCardWindowControllers.count)")
    }

    private static func floatingCardKey(kind: String, id: String) -> String {
        "\(kind):\(id)"
    }

    private static func floatingCardID(from payload: [String: Any], kind: String) -> String? {
        switch kind {
        case "note":
            return (payload["note"] as? [String: Any])?["id"] as? String
        case "todo":
            return (payload["todo"] as? [String: Any])?["id"] as? String
        default:
            return nil
        }
    }

    private struct DragPreviewSession {
        static let windowPadding: CGFloat = 16

        let windowWidth: CGFloat
        let windowHeight: CGFloat
        let contentWidth: CGFloat
        let contentHeight: CGFloat
        let pointerOffset: CGPoint
        let cardKind: String
        let cardID: String

        init?(payload: [String: Any]) {
            guard
                let size = payload["size"] as? [String: Any],
                let pointerOffset = payload["pointerOffset"] as? [String: Any],
                let width = size["width"] as? Double,
                let height = size["height"] as? Double,
                let offsetX = pointerOffset["x"] as? Double,
                let offsetY = pointerOffset["y"] as? Double,
                width > 0,
                height > 0
            else {
                return nil
            }

            self.contentWidth = width
            self.contentHeight = height
            self.windowWidth = width + Self.windowPadding * 2
            self.windowHeight = height + Self.windowPadding * 2
            self.pointerOffset = CGPoint(x: offsetX, y: offsetY)
            self.cardKind = payload["kind"] as? String ?? ""
            switch cardKind {
            case "note":
                self.cardID = (payload["note"] as? [String: Any])?["id"] as? String ?? ""
            case "todo":
                self.cardID = (payload["todo"] as? [String: Any])?["id"] as? String ?? ""
            default:
                self.cardID = ""
            }
        }
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
            let language = StickItLanguage(storedValue: settings["language"])
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
        language: StickItLanguage
    ) -> [TodoReminderDescriptor] {
        let rawTodos = todoItems(from: todos)

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
        let rawTodos = todoItems(from: todos)

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
            return todos
        }

        let updatedPayload = replacingTodoItems(in: todos, with: updatedTodos)
        persistTodosAfterNativeUpdate(updatedTodos, originalPayload: todos)
        return updatedPayload
    }

    private func clearReminder(forTodoIDs todoIDs: [String], todosOverride: [[String: Any]]?) {
        guard !todoIDs.isEmpty else {
            return
        }

        let targetIDs = Set(todoIDs)

        do {
            let storedPayload = try storage.loadAllData()["todos"] ?? []
            let storedTodos = todoItems(from: storedPayload)
            let rawTodos = todosOverride ?? storedTodos
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

            persistTodosAfterNativeUpdate(updatedTodos, originalPayload: storedPayload)

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
        persistTodosAfterNativeUpdate(todos, originalPayload: todos)
    }

    private func persistTodosAfterNativeUpdate(_ todos: [[String: Any]], originalPayload: Any) {
        let payload = replacingTodoItems(in: originalPayload, with: todos)

        do {
            try storage.saveTodos(payload)
            webViewController.emitTodosUpdated(payload)
        } catch {
            logger.error("Failed to persist native todo reminder updates. error=\(error.localizedDescription, privacy: .public)")
        }
    }

    private func todoItems(from todos: Any) -> [[String: Any]] {
        if let rawTodos = todos as? [[String: Any]] {
            return rawTodos
        }

        if let document = todos as? [String: Any], let rawTodos = document["items"] as? [[String: Any]] {
            return rawTodos
        }

        return []
    }

    private func replacingTodoItems(in payload: Any, with todos: [[String: Any]]) -> Any {
        guard var document = payload as? [String: Any], document["items"] != nil else {
            return todos
        }

        document["items"] = todos
        return document
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

    private func hotKeyRegistrationStatePayload(from state: GlobalHotKeyManager.RegistrationState) -> [String: Any] {
        var payload: [String: Any] = [
            "shortcut": state.shortcut,
            "registration": state.registration,
        ]

        if let message = state.message, !message.isEmpty {
            payload["message"] = message
        }

        return payload
    }
}
