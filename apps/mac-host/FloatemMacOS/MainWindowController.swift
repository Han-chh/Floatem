import AppKit
import OSLog
import ServiceManagement

@MainActor
final class MainWindowController: NSObject, NSWindowDelegate, FloatemNativeBridgeHandling {
    private static let defaultPanelSize = NSSize(width: 400, height: 680)
    private static let minimumPanelSize = NSSize(width: 320, height: 480)
    static let overlayPanelLevel = NSWindow.Level.statusBar
    private static let interactivePanelLevel = NSWindow.Level.floating
    static var desktopCardCollectionBehavior: NSWindow.CollectionBehavior {
        [
            .stationary,
            .ignoresCycle,
            .fullScreenNone,
        ]
    }
    static var desktopCardPanelLevel: NSWindow.Level {
        NSWindow.Level(rawValue: Int(CGWindowLevelForKey(.desktopIconWindow)) + 1)
    }
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
    private let hotKeyAgentManager: HotKeyAgentManager
    private let notificationManager: NotificationManager
    private let launchAtLoginManager: LaunchAtLoginManager
    private let panel: FloatingPanel
    private let webViewController: WebViewController
    private let dragPreviewWindowController = DragPreviewWindowController()
    private let logger = Logger(subsystem: "com.floatem.app", category: "Window")
    private static let lifecycle = Logger(subsystem: "com.floatem.floating", category: "Lifecycle")
    private static let pipeline = Logger(subsystem: "com.floatem.floating", category: "Pipeline")

    /// When enabled (via `defaults write com.floatem.app DEBUG_FLOATING_LIFECYCLE -bool true`),
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
    private var floatingCardGuideStates: [String: [String: Any]] = [:]

    private static let hotKeyDebounceInterval: CFAbsoluteTime = 0.25

    private var isPanelPresented: Bool {
        panel.isVisible
    }

    var isMainWindowVisible: Bool {
        panel.isVisible
    }

    init(
        storage: AppStorage,
        hotKeyAgentManager: HotKeyAgentManager,
        notificationManager: NotificationManager,
        launchAtLoginManager: LaunchAtLoginManager
    ) {
        self.storage = storage
        self.hotKeyAgentManager = hotKeyAgentManager
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
        panel.title = "Floatem"
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

        hotKeyAgentManager.onRegistrationStateChanged = { [weak self] state in
            self?.webViewController.emitHotkeyRegistrationState(self?.hotKeyRegistrationStatePayload(from: state) ?? [:])
        }
        hotKeyAgentManager.onAgentHotKeyPressed = { [weak self] shortcut in
            guard let self else {
                return false
            }
            self.handleAgentHotKeyPressed(shortcut: shortcut)
            return true
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
            try hotKeyAgentManager.configure(shortcut: savedShortcut)
        } catch {
            logger.error("Failed to restore the saved shortcut. error=\(error.localizedDescription, privacy: .public)")
        }
    }

    func recoverAfterSystemWake() {
        logger.notice("Restoring Floatem services after system wake.")
        hotKeyAgentManager.reconnectAfterSystemWake(
            shortcut: (try? storage.currentHotkey()) ?? GlobalHotKeyManager.defaultShortcut
        )
        webViewController.recoverAfterSystemWake()
        floatingCardWindowControllers.values.forEach { $0.recoverAfterSystemWake() }

        if panel.isVisible {
            bringPanelToFront(context: "System wake")
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

    func handleAgentHotKeyPressed(shortcut: String) {
        let now = CFAbsoluteTimeGetCurrent()

        if now - lastHotKeyPressTimestamp < Self.hotKeyDebounceInterval {
            logger.debug("Ignoring repeated hotkey press within debounce window.")
            return
        }

        lastHotKeyPressTimestamp = now
        logToggleState(context: "Global hotkey received")
        let isOpeningPanel = !isPanelPresented
        togglePanel(reason: "global-hotkey")

        if isOpeningPanel {
            webViewController.emitShortcutInvoked(shortcut)
        }
    }

    func loadAllData() throws -> [String: Any] {
        var data = try storage.loadAllData()
        if var settings = data["settings"] as? [String: Any] {
            settings["launchAtLogin"] = launchAtLoginManager.isEnabled
            data["settings"] = settings
        }
        return data
    }

    func currentLaunchAtLoginStatus() -> [String: Any] {
        ["enabled": launchAtLoginManager.isEnabled]
    }

    func currentBackgroundActivityStatus() -> [String: Any] {
        let status = hotKeyAgentManager.backgroundActivityStatus()
        return [
            "status": status.status,
            "enabled": status.isEnabled,
            "activationEpoch": status.activationEpoch,
        ]
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
            throw FloatemBridgeError.invalidParameters("Floatem expected settings to be a JSON object.")
        }

        let fallbackShortcut = hotKeyAgentManager.registeredShortcut ?? (try? storage.currentHotkey()) ?? GlobalHotKeyManager.defaultShortcut
        let candidateShortcut = settingsDictionary["hotkey"] as? String ?? fallbackShortcut

        settingsDictionary["hotkey"] = GlobalHotKeyManager.isShortcutValid(candidateShortcut)
            ? GlobalHotKeyManager.normalize(shortcut: candidateShortcut)
            : fallbackShortcut

        let launchAtLogin = settingsDictionary["launchAtLogin"] as? Bool
            ?? (try? storage.currentLaunchAtLogin())
            ?? false
        try launchAtLoginManager.setEnabled(launchAtLogin)
        settingsDictionary["launchAtLogin"] = launchAtLoginManager.isEnabled

        try storage.saveSettings(settingsDictionary)
        try hotKeyAgentManager.configure(shortcut: settingsDictionary["hotkey"] as? String ?? fallbackShortcut)
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

        throw FloatemBridgeError.invalidParameters(language.localization.notificationOpenSettingsFailedMessage)
    }

    func openBackgroundActivitySettings() throws {
        NSApp.activate(ignoringOtherApps: true)
        SMAppService.openSystemSettingsLoginItems()
    }

    func checkNotificationPermission(language: FloatemLanguage) async throws -> Bool {
        try await notificationManager.checkAuthorization(language: language)
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

    func testReminderNotification(soundEnabled: Bool, language: FloatemLanguage) async throws {
        try await notificationManager.scheduleTestNotification(
            soundEnabled: soundEnabled,
            language: language
        )
    }

    func currentHotKeyRegistrationState() -> [String: Any] {
        hotKeyRegistrationStatePayload(from: hotKeyAgentManager.registrationState)
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
        let pinnedNoteIDs = floatingCardWindowControllers.values
            .filter { $0.cardKind == "note" && $0.isDesktopPinned }
            .map(\.cardID)
            .sorted()
        let pinnedTodoIDs = floatingCardWindowControllers.values
            .filter { $0.cardKind == "todo" && $0.isDesktopPinned }
            .map(\.cardID)
            .sorted()

        return [
            "note": noteIDs,
            "pinnedNote": pinnedNoteIDs,
            "pinnedTodo": pinnedTodoIDs,
            "todo": todoIDs,
        ]
    }

    func registerHotKey(shortcut: String) throws {
        try hotKeyAgentManager.configure(shortcut: shortcut)
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
            throw FloatemBridgeError.invalidParameters("Floatem expected a valid drag preview payload from JavaScript.")
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

    static func requiresNewFloatingCard(existingKeys: Set<String>, reference: WidgetEntityReference) -> Bool {
        !existingKeys.contains(floatingCardKey(kind: reference.entityKind.rawValue, id: reference.entityID))
    }

    private func presentFloatingCard(
        _ payload: Any,
        ignoreMainPanelDropZone: Bool,
        restoredFrame: NSRect? = nil
    ) throws {
        guard
            let payloadDictionary = payload as? [String: Any],
            let kind = payloadDictionary["kind"] as? String,
            ["note", "todo"].contains(kind),
            let cardID = Self.floatingCardID(from: payloadDictionary, kind: kind),
            let session = DragPreviewSession(payload: payloadDictionary)
        else {
            throw FloatemBridgeError.invalidParameters("Floatem expected a valid floating card payload from JavaScript.")
        }

        let mouseLocation = NSEvent.mouseLocation
        let cardFrameAtDrop = floatingCardFrame(for: mouseLocation, session: session)
        if !ignoreMainPanelDropZone && panel.isVisible && cardFrameAtDrop.intersects(panel.frame) {
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
            guard let self else { return [:] }
            return try self.setFloatingCardDesktopPinnedFromBridge(kind: itemKind, id: id, pinned: pinned)
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
        controller.onFrameChange = { [weak self, weak controller] frame in
            guard let self, let entityKind = FloatemEntityKind(rawValue: kind) else { return }
            let state = ScreenPlacementResolver.state(
                for: WidgetEntityReference(entityKind: entityKind, entityID: cardID),
                frame: frame,
                isAlwaysOnTop: controller?.isDesktopPinned != true
            )
            try? self.storage.saveFloatingWindowState(state)
            if controller?.isDesktopPinned == true {
                try? self.storage.saveDesktopPanelState(DesktopPanelState(windowState: state))
            }
        }
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
        controller.onOpenNotificationSettings = { [weak self] in
            try self?.openNotificationSettings()
        }
        controller.onCheckNotificationPermission = { [weak self] language in
            guard let self else {
                return false
            }

            return try await self.checkNotificationPermission(language: language)
        }
        floatingCardWindowControllers[key] = controller
        if let guide = floatingCardGuideStates[key] {
            controller.updateGuideState(guide)
        }
        if Self.debugLifecycle {
            Self.lifecycle.info("panelCreated(cardId=\(cardID, privacy: .public)) kind=\(kind, privacy: .public)")
            logRemainingFloatingPanelCount()
        }
        let defaultCardFrame = cardFrameAtDrop
        let savedState = ignoreMainPanelDropZone
            ? (try? storage.floatingWindowStates())?.first {
                $0.entityKind.rawValue == kind && $0.entityID == cardID
            }
            : nil
        let cardFrame = restoredFrame ?? ScreenPlacementResolver.initialFloatingFrame(
            dragFrame: defaultCardFrame,
            savedState: savedState,
            restoreSavedPlacement: ignoreMainPanelDropZone,
            screens: ScreenPlacementResolver.currentScreens()
        )
        let resolvedPayload = ignoreMainPanelDropZone
            ? Self.floatingCardPayload(payloadDictionary, matching: cardFrame)
            : payloadDictionary
        floatingCardPayloads[key] = resolvedPayload
        controller.updatePayload(resolvedPayload)
        if resolvedPayload["desktopPinned"] as? Bool == true {
            controller.setDesktopPinned(true)
        }
        controller.showWindow(frame: cardFrame)
        emitFloatingCardsState()
    }

    func closeFloatingCardFromBridge(kind: String, id: String) {
        destroyFloatingCardPanel(kind: kind, id: id, restoreDockedState: true)
    }

    func setFloatingCardDesktopPinnedFromBridge(kind: String, id: String, pinned: Bool) throws -> [String: Any] {
        guard
            FloatemEntityKind(rawValue: kind) != nil,
            !id.isEmpty,
            let controller = floatingCardWindowControllers[Self.floatingCardKey(kind: kind, id: id)]
        else {
            throw FloatemBridgeError.invalidParameters("Floatem could not find the requested floating card.")
        }

        controller.setDesktopPinned(pinned)
        if pinned {
            persistDesktopCard(kind: kind, id: id, frame: controller.currentFrame)
        } else {
            removePersistedDesktopCard(kind: kind, id: id)
        }

        // Keep the cached payload authoritative after replacing the underlying
        // panel. The bridge result updates the UI without reloading the complete
        // card payload, which could otherwise disturb an in-progress edit.
        let key = Self.floatingCardKey(kind: kind, id: id)
        if var payload = floatingCardPayloads[key] {
            payload["desktopPinned"] = pinned
            floatingCardPayloads[key] = payload
        }
        emitFloatingCardsState()

        let launchAtLoginEnabled = launchAtLoginManager.isEnabled
        return [
            "pinned": pinned,
            "launchAtLoginEnabled": launchAtLoginEnabled,
            "requiresLaunchAtLogin": pinned && !launchAtLoginEnabled,
        ]
    }

    func setFloatingCardGuideFromBridge(kind: String, id: String, guide: [String: Any]?) {
        let key = Self.floatingCardKey(kind: kind, id: id)
        if let guide {
            // The guide can be registered before the user releases the card
            // outside the main panel. Cache it so a newly created floating
            // WKWebView receives the guide during its initial payload load.
            floatingCardGuideStates[key] = guide
        } else {
            floatingCardGuideStates.removeValue(forKey: key)
        }
        floatingCardWindowControllers[key]?.updateGuideState(guide)
    }

    func clearFloatingCardGuidesFromBridge() {
        floatingCardGuideStates.removeAll()
        for controller in floatingCardWindowControllers.values {
            controller.updateGuideState(nil)
        }
    }

    // Compatibility adapters for frontend builds from the short-lived Widget
    // desktop implementation. Desktop pinning is now backed by DesktopCardPanel.
    func requestDesktopWidgetFromBridge(kind: String, id: String) throws -> [String: Any] {
        let result = try setFloatingCardDesktopPinnedFromBridge(kind: kind, id: id, pinned: true)
        return result.merging(["requested": true, "requiresSystemPlacement": false]) { current, _ in current }
    }

    func removeDesktopWidgetAssociationFromBridge(kind: String, id: String) throws {
        _ = try setFloatingCardDesktopPinnedFromBridge(kind: kind, id: id, pinned: false)
    }

    func getDesktopWidgetStateFromBridge(kind: String, id: String) throws -> [String: Any] {
        guard let entityKind = FloatemEntityKind(rawValue: kind), !id.isEmpty else {
            throw FloatemBridgeError.invalidParameters("Floatem expected a valid desktop card reference.")
        }
        let requested = try storage.desktopPanelStates().contains {
            $0.entityKind == entityKind && $0.entityID == id
        }
        return ["requested": requested, "systemManaged": false]
    }

    func restorePinnedDesktopCards() {
        var states = (try? storage.desktopPanelStates()) ?? []
        if states.isEmpty {
            states = migrateLegacyDesktopPanelStates()
        }

        for state in states {
            let reference = WidgetEntityReference(entityKind: state.entityKind, entityID: state.entityID)
            do {
                let frame = ScreenPlacementResolver.resolve(
                    state.windowState,
                    screens: ScreenPlacementResolver.currentScreens()
                ) ?? NSRect(
                    x: state.frame.x,
                    y: state.frame.y,
                    width: state.frame.width,
                    height: state.frame.height
                )
                guard var payload = try storage.floatingCardPayload(kind: state.entityKind, id: state.entityID) else {
                    try storage.removeDesktopPanelState(kind: state.entityKind, id: state.entityID)
                    continue
                }
                payload["desktopPinned"] = true
                try presentFloatingCard(payload, ignoreMainPanelDropZone: true, restoredFrame: frame)
                let key = Self.floatingCardKey(kind: state.entityKind.rawValue, id: state.entityID)
                guard let controller = floatingCardWindowControllers[key] else { continue }
                controller.setDesktopPinned(true)
                persistDesktopCard(kind: reference.entityKind.rawValue, id: reference.entityID, frame: frame)
            } catch {
                logger.error("Failed to restore desktop panel kind=\(state.entityKind.rawValue, privacy: .public) id=\(state.entityID, privacy: .public). error=\(error.localizedDescription, privacy: .public)")
            }
        }
    }

    func startFloatingCardDragFromBridge(kind: String, id: String) {
        guard let controller = floatingCardWindowControllers[Self.floatingCardKey(kind: kind, id: id)] else {
            logger.error("[FLT:DOCK] controller not found for key kind=\(kind, privacy: .public) id=\(id, privacy: .public)")
            return
        }

        if controller.isDesktopPinned {
            let mouseUpEvent = controller.startWindowDrag()
            controller.restoreWebViewInputAfterDrag(mouseUpEvent: mouseUpEvent)
            persistDesktopCard(kind: kind, id: id, frame: controller.currentFrame)
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

            if isInDockZone {
                if !previousInDockZone {
                    self.logger.info("[FLT:DOCK] emitFloatingDockZoneEnter kind=\(kind, privacy: .public) cardID=\(id, privacy: .public)")
                }
                self.webViewController.emitFloatingDockZoneEnter(
                    kind: kind,
                    cardID: id,
                    source: "floating",
                    screenPoint: mouseLoc
                )
            } else if previousInDockZone {
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
            throw FloatemBridgeError.invalidParameters("Floatem could not access the current mouse event for dragging.")
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
        setDragPreviewDockZoneActive(isInDockZone, session: session, mouseLocation: mouseLocation)

        if isInDockZone {
            dragPreviewWindowController.hidePreview()
            return
        }

        dragPreviewWindowController.showPreview(frame: dragPreviewFrame(for: mouseLocation, session: session))
    }

    private func setDragPreviewDockZoneActive(
        _ active: Bool,
        session: DragPreviewSession?,
        mouseLocation: CGPoint = NSEvent.mouseLocation
    ) {
        guard let session, !session.cardKind.isEmpty, !session.cardID.isEmpty else {
            isDragPreviewDockZoneActive = active
            return
        }

        if active {
            isDragPreviewDockZoneActive = true
            webViewController.emitFloatingDockZoneEnter(
                kind: session.cardKind,
                cardID: session.cardID,
                source: "preview",
                screenPoint: mouseLocation
            )
        } else if isDragPreviewDockZoneActive {
            isDragPreviewDockZoneActive = false
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
            pinnedNoteIDs: state["pinnedNote"] ?? [],
            pinnedTodoIDs: state["pinnedTodo"] ?? [],
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
        floatingCardGuideStates.removeValue(forKey: key)
        removePersistedDesktopCard(kind: kind, id: id)
        if let entityKind = FloatemEntityKind(rawValue: kind) {
            try? storage.removeFloatingWindowState(kind: entityKind, id: id)
        }

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
        guard let entityKind = FloatemEntityKind(rawValue: kind) else { return }
        let windowState = ScreenPlacementResolver.state(
            for: WidgetEntityReference(entityKind: entityKind, entityID: id),
            frame: frame,
            isAlwaysOnTop: false
        )
        do {
            try storage.saveDesktopPanelState(DesktopPanelState(windowState: windowState))
        } catch {
            logger.error("Failed to persist desktop panel state. error=\(error.localizedDescription, privacy: .public)")
        }
    }

    private func removePersistedDesktopCard(kind: String, id: String) {
        if let entityKind = FloatemEntityKind(rawValue: kind) {
            try? storage.removeDesktopPanelState(kind: entityKind, id: id)
        }

        // Remove a matching legacy record after the typed state has taken over.
        var records = (try? storage.loadDesktopCards()) ?? []
        let originalCount = records.count
        records.removeAll { record in
            record["kind"] as? String == kind && record["id"] as? String == id
        }
        if records.count != originalCount {
            try? storage.saveDesktopCards(records)
        }
    }

    private func migrateLegacyDesktopPanelStates() -> [DesktopPanelState] {
        var statesByKey: [String: DesktopPanelState] = [:]

        for record in (try? storage.loadDesktopCards()) ?? [] {
            guard
                let kindValue = record["kind"] as? String,
                let kind = FloatemEntityKind(rawValue: kindValue),
                let id = record["id"] as? String,
                !id.isEmpty
            else { continue }

            let frameValue = record["frame"] as? [String: Any]
            let defaultFrame = defaultDesktopPanelFrame(for: kind)
            let frame = NSRect(
                x: Self.doubleValue(frameValue?["x"]) ?? Double(defaultFrame.minX),
                y: Self.doubleValue(frameValue?["y"]) ?? Double(defaultFrame.minY),
                width: Self.doubleValue(frameValue?["width"]) ?? Double(defaultFrame.width),
                height: Self.doubleValue(frameValue?["height"]) ?? Double(defaultFrame.height)
            )
            let windowState = ScreenPlacementResolver.state(
                for: WidgetEntityReference(entityKind: kind, entityID: id),
                frame: frame,
                isAlwaysOnTop: false
            )
            statesByKey[Self.floatingCardKey(kind: kind.rawValue, id: id)] = DesktopPanelState(windowState: windowState)
        }

        let legacyWidgetPreferences = (try? storage.loadWidgetPreferences()) ?? []
        for preference in legacyWidgetPreferences {
            let key = Self.floatingCardKey(kind: preference.entityKind.rawValue, id: preference.entityID)
            guard statesByKey[key] == nil else { continue }
            let windowState = ScreenPlacementResolver.state(
                for: WidgetEntityReference(entityKind: preference.entityKind, entityID: preference.entityID),
                frame: defaultDesktopPanelFrame(for: preference.entityKind),
                isAlwaysOnTop: false
            )
            statesByKey[key] = DesktopPanelState(windowState: windowState)
        }

        let states = Array(statesByKey.values)
        for state in states {
            try? storage.saveDesktopPanelState(state)
        }
        // The Widget preference file was used by the superseded desktop-pin
        // implementation. Clear migrated references so an intentionally
        // unpinned panel is not recreated on a later launch.
        for preference in legacyWidgetPreferences {
            try? storage.setWidgetPreference(
                kind: preference.entityKind,
                id: preference.entityID,
                requested: false
            )
        }
        if !states.isEmpty {
            logger.info("Migrated \(states.count, privacy: .public) desktop pin references to typed DesktopCardPanel state.")
        }
        return states
    }

    private func defaultDesktopPanelFrame(for kind: FloatemEntityKind) -> NSRect {
        let size = kind == .note ? NSSize(width: 420, height: 300) : NSSize(width: 360, height: 120)
        let visibleFrame = activeScreen()?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1_440, height: 900)
        return NSRect(
            x: visibleFrame.midX - size.width / 2,
            y: visibleFrame.midY - size.height / 2,
            width: size.width,
            height: size.height
        )
    }

    private static func doubleValue(_ value: Any?) -> Double? {
        (value as? NSNumber)?.doubleValue
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

    static func floatingCardPayload(_ payload: [String: Any], matching frame: NSRect) -> [String: Any] {
        guard frame.width > 0, frame.height > 0 else {
            return payload
        }

        var resolvedPayload = payload
        resolvedPayload["size"] = [
            "width": Double(frame.width),
            "height": Double(frame.height),
        ]
        resolvedPayload["pointerOffset"] = [
            "x": Double(frame.width / 2),
            "y": Double(frame.height / 2),
        ]
        return resolvedPayload
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
        WindowFrameClamper.clamp(
            CGRect(origin: origin, size: panel.frame.size),
            to: visibleFrame,
            maximumScreenFraction: 1
        ).origin
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
            let language = FloatemLanguage(storedValue: settings["language"])
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
        language: FloatemLanguage
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

    private func hotKeyRegistrationStatePayload(from state: HotKeyAgentManager.RegistrationState) -> [String: Any] {
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
