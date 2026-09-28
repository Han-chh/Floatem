import XCTest
@testable import Floatem

final class FloatemCoreTests: XCTestCase {
    func testDebugBuildUsesAProcessLocalShortcut() {
        XCTAssertFalse(HotKeyAgentManager.usesBackgroundAgent)
        XCTAssertEqual(GlobalHotKeyManager.defaultShortcut, "Option+Shift+Space")
        XCTAssertEqual(
            GlobalHotKeyManager.shortcutForCurrentBuild("Shift+Space"),
            "Option+Shift+Space"
        )
    }

    func testSystemLanguageDetectionTreatsEveryChineseLocaleAsChinese() {
        XCTAssertEqual(FloatemLanguage.systemPreferred(from: ["zh"]), .simplifiedChinese)
        XCTAssertEqual(FloatemLanguage.systemPreferred(from: ["zh-Hans-CN"]), .simplifiedChinese)
        XCTAssertEqual(FloatemLanguage.systemPreferred(from: ["zh_Hant_TW"]), .simplifiedChinese)
    }

    func testSystemLanguageDetectionTreatsOtherAndMissingLocalesAsEnglish() {
        XCTAssertEqual(FloatemLanguage.systemPreferred(from: ["en-US"]), .english)
        XCTAssertEqual(FloatemLanguage.systemPreferred(from: ["fr-FR"]), .english)
        XCTAssertEqual(FloatemLanguage.systemPreferred(from: []), .english)
    }

    func testMenuLocalizationFollowsTheStoredInternalLanguage() {
        let english = FloatemLanguage(storedValue: "en").localization
        XCTAssertEqual(english.menuShow, "Show Floatem")
        XCTAssertEqual(english.menuHide, "Hide Floatem")
        XCTAssertEqual(english.menuReload, "Reload Interface")
        XCTAssertEqual(english.menuUninstall, "Uninstall Floatem…")
        XCTAssertEqual(english.menuQuit, "Quit")
        XCTAssertEqual(english.uninstallConfirm, "Continue in Finder")
        XCTAssertTrue(english.uninstallMessage.contains("Finder"))

        let chinese = FloatemLanguage(storedValue: "zh-CN").localization
        XCTAssertEqual(chinese.menuShow, "显示 Floatem")
        XCTAssertEqual(chinese.menuHide, "隐藏 Floatem")
        XCTAssertEqual(chinese.menuReload, "重新加载界面")
        XCTAssertEqual(chinese.menuUninstall, "卸载 Floatem…")
        XCTAssertEqual(chinese.menuQuit, "退出")
        XCTAssertEqual(chinese.uninstallConfirm, "在 Finder 中继续")
        XCTAssertTrue(chinese.uninstallMessage.contains("Finder"))
    }

    func testMacHostIsConfiguredAsADocklessMenuBarApplication() {
        XCTAssertEqual(Bundle.main.object(forInfoDictionaryKey: "LSUIElement") as? Bool, true)
    }

    @MainActor
    func testDesktopPinTransitionsToStationaryDesktopNSPanelAndBackToOverlay() {
        let controller = FloatingNoteWindowController(cardKind: "note", cardID: "desktop-test")

        controller.setDesktopPinned(true)
        XCTAssertTrue(controller.usesDesktopCardPanel)
        XCTAssertEqual(controller.currentPanelLevel, MainWindowController.desktopCardPanelLevel)
        XCTAssertTrue(controller.currentPanelCollectionBehavior.contains(.stationary))
        XCTAssertTrue(controller.currentPanelCollectionBehavior.contains(.ignoresCycle))
        XCTAssertTrue(controller.currentPanelCollectionBehavior.contains(.fullScreenNone))
        XCTAssertFalse(controller.currentPanelCollectionBehavior.contains(.canJoinAllSpaces))
        XCTAssertFalse(controller.currentPanelCollectionBehavior.contains(.fullScreenAuxiliary))

        controller.setDesktopPinned(false)
        XCTAssertFalse(controller.usesDesktopCardPanel)
        XCTAssertTrue(controller.currentPanelCollectionBehavior.contains(.canJoinAllSpaces))
        XCTAssertTrue(controller.currentPanelCollectionBehavior.contains(.fullScreenAuxiliary))
        controller.closeWindow()
    }

    func testFloatingGuideDeliveryWaitsForNavigationAndFrontendReadiness() {
        var gate = FloatingGuideDeliveryGate()

        XCTAssertFalse(gate.canDeliver)
        gate.navigationDidFinish()
        XCTAssertFalse(gate.canDeliver)
        gate.frontendDidBecomeReady()
        XCTAssertTrue(gate.canDeliver)

        gate.navigationDidStart()
        XCTAssertFalse(gate.canDeliver)
        gate.navigationDidFinish()
        XCTAssertFalse(gate.canDeliver)
        gate.frontendDidBecomeReady()
        XCTAssertTrue(gate.canDeliver)
    }

    private var temporaryDirectories: [URL] = []

    override func tearDownWithError() throws {
        for directory in temporaryDirectories {
            try? FileManager.default.removeItem(at: directory)
        }
        temporaryDirectories = []
    }

    func testLegacyDesktopCardsMigrateToEntityReferencesOnlyAndAreIdempotent() throws {
        let legacy = try makeDirectory()
        let shared = try makeDirectory()
        let source = legacy.appendingPathComponent("desktop-cards.json")
        let records: [[String: Any]] = [
            ["kind": "note", "id": "n1", "payload": ["title": "private"], "frame": ["x": 10]],
            ["kind": "note", "id": "n1", "payload": ["title": "duplicate"]],
            ["kind": "todo", "id": "t1", "payload": ["text": "secret"]],
        ]
        try JSONSerialization.data(withJSONObject: records).write(to: source)

        let store = SharedDataStore(directoryURL: shared)
        let migrator = LegacyDataMigrator(legacyDirectoryURL: legacy, sharedStore: store)
        try migrator.migrateIfNeeded()
        try migrator.migrateIfNeeded()

        let preferences = try store.widgetPreferences()
        XCTAssertEqual(Set(preferences.map(\.entityID)), ["n1", "t1"])
        let encoded = String(data: try Data(contentsOf: store.url(for: SharedDataStore.widgetPreferencesFilename)), encoding: .utf8)!
        XCTAssertFalse(encoded.contains("payload"))
        XCTAssertFalse(encoded.contains("private"))
        XCTAssertTrue(FileManager.default.fileExists(atPath: source.path))
    }

    func testAppGroupMigrationIsIdempotent() throws {
        let legacy = try makeDirectory()
        let shared = try makeDirectory()
        let source = legacy.appendingPathComponent("notes.json")
        try Data("[{\"id\":\"first\"}]".utf8).write(to: source)
        let store = SharedDataStore(directoryURL: shared)
        let migrator = LegacyDataMigrator(legacyDirectoryURL: legacy, sharedStore: store)
        try migrator.migrateIfNeeded()
        try Data("[{\"id\":\"changed\"}]".utf8).write(to: source)
        try migrator.migrateIfNeeded()
        let migrated = String(data: try Data(contentsOf: store.url(for: SharedDataStore.notesFilename)), encoding: .utf8)
        XCTAssertEqual(migrated, "[{\"id\":\"first\"}]")
    }

    func testFailedMigrationLeavesLegacyDataUntouched() throws {
        let legacy = try makeDirectory()
        let shared = try makeDirectory()
        let source = legacy.appendingPathComponent("notes.json")
        let invalid = Data("not-json".utf8)
        try invalid.write(to: source)
        let store = SharedDataStore(directoryURL: shared)
        XCTAssertThrowsError(try LegacyDataMigrator(legacyDirectoryURL: legacy, sharedStore: store).migrateIfNeeded())
        XCTAssertEqual(try Data(contentsOf: source), invalid)
        XCTAssertFalse(FileManager.default.fileExists(atPath: store.url(for: SharedDataStore.notesFilename).path))
    }

    func testWidgetSnapshotQueriesAndDeletedEntityPlaceholderState() throws {
        let shared = try makeDirectory()
        let store = SharedDataStore(directoryURL: shared)
        try store.writeJSONObject([
            "cards": [["id": "n1", "title": "Note", "content": [["children": [["text": "Body"]]]], "updatedAt": 1_000]],
            "groups": [],
        ], filename: SharedDataStore.notesFilename)
        try store.writeJSONObject([
            "items": [["id": "t1", "text": "Todo", "done": false, "createdAt": 1_000]],
            "groups": [],
        ], filename: SharedDataStore.todosFilename)

        XCTAssertEqual(try store.noteSnapshots().map(\.entityID), ["n1"])
        XCTAssertEqual(try store.todoSnapshots().map(\.entityID), ["t1"])
        XCTAssertEqual(try store.noteSnapshot(entityID: "n1")?.summary, "Body")
        XCTAssertNil(try store.noteSnapshot(entityID: "deleted"))
        XCTAssertNil(try store.todoSnapshot(entityID: "deleted"))
    }

    func testDesktopPanelStatePersistsEntityAndPlacementWithoutPayload() throws {
        let directory = try makeDirectory()
        let store = SharedDataStore(directoryURL: directory)
        let windowState = FloatingCardWindowState(
            entityKind: .note,
            entityID: "desktop-note",
            frame: CodableRect(x: 40, y: 50, width: 420, height: 300),
            screenIdentifier: "screen-a",
            screenVisibleFrame: CodableRect(x: 0, y: 0, width: 1_440, height: 900),
            normalizedPosition: CodablePoint(x: 0.2, y: 0.3),
            isAlwaysOnTop: false,
            updatedAt: Date()
        )

        try store.saveDesktopPanelState(DesktopPanelState(windowState: windowState))
        let restored = try XCTUnwrap(store.desktopPanelStates().first)
        XCTAssertEqual(restored.entityKind, .note)
        XCTAssertEqual(restored.entityID, "desktop-note")
        XCTAssertEqual(restored.frame, windowState.frame)
        XCTAssertEqual(restored.screenIdentifier, "screen-a")

        try store.removeDesktopPanelState(
            WidgetEntityReference(entityKind: .note, entityID: "desktop-note")
        )
        XCTAssertTrue(try store.desktopPanelStates().isEmpty)
    }

    func testDeepLinkParsingEncodingAndValidation() throws {
        let reference = WidgetEntityReference(entityKind: .note, entityID: "note / 中文")
        let url = try XCTUnwrap(FloatemDeepLink.url(for: reference))
        XCTAssertEqual(FloatemDeepLink(url: url)?.destination, .floatingCard(reference))
        XCTAssertEqual(FloatemDeepLink(url: URL(string: "floatem://open")!)?.destination, .mainWindow)
        XCTAssertNil(FloatemDeepLink(url: URL(string: "floatem://open?kind=file&id=/tmp/a&mode=floating")!))
        XCTAssertNil(FloatemDeepLink(url: URL(string: "https://example.com/open?kind=note&id=x")!))
    }

    @MainActor
    func testDuplicateEntityDoesNotRequireAnotherFloatingCard() {
        let reference = WidgetEntityReference(entityKind: .todo, entityID: "t1")
        XCTAssertFalse(MainWindowController.requiresNewFloatingCard(existingKeys: ["todo:t1"], reference: reference))
        XCTAssertTrue(MainWindowController.requiresNewFloatingCard(existingKeys: [], reference: reference))
    }

    func testScreenClampHandlesRemovedDisplayAndOversizedWindow() throws {
        let state = FloatingCardWindowState(
            entityKind: .note,
            entityID: "n1",
            frame: CodableRect(x: 2_100, y: 100, width: 2_000, height: 1_500),
            screenIdentifier: "removed",
            screenVisibleFrame: CodableRect(x: 1_920, y: 0, width: 1_920, height: 1_080),
            normalizedPosition: CodablePoint(x: 0.5, y: 0.5),
            isAlwaysOnTop: true,
            updatedAt: Date()
        )
        let screens = [ScreenGeometry(identifier: "main", visibleFrame: CGRect(x: 0, y: 0, width: 1_440, height: 900), isPrimary: true)]
        let frame = try XCTUnwrap(ScreenPlacementResolver.resolve(state, screens: screens))
        XCTAssertTrue(screens[0].visibleFrame.contains(frame))
        XCTAssertLessThanOrEqual(frame.width, 1_440 * 0.95)
        XCTAssertLessThanOrEqual(frame.height, 900 * 0.95)
    }

    @MainActor
    func testRestoredFloatingPayloadMatchesTheResolvedWindowFrame() throws {
        let payload: [String: Any] = [
            "kind": "todo",
            "size": ["width": 360.0, "height": 72.0],
            "minimumSize": ["width": 360.0, "height": 72.0],
            "pointerOffset": ["x": 180.0, "y": 36.0],
        ]
        let restored = MainWindowController.floatingCardPayload(
            payload,
            matching: NSRect(x: 100, y: 200, width: 318, height: 42)
        )
        let size = try XCTUnwrap(restored["size"] as? [String: Double])
        let pointerOffset = try XCTUnwrap(restored["pointerOffset"] as? [String: Double])
        let minimumSize = try XCTUnwrap(restored["minimumSize"] as? [String: Double])

        XCTAssertEqual(size["width"], 318)
        XCTAssertEqual(size["height"], 42)
        XCTAssertEqual(pointerOffset["x"], 159)
        XCTAssertEqual(pointerOffset["y"], 21)
        XCTAssertEqual(minimumSize["width"], 360)
        XCTAssertEqual(minimumSize["height"], 72)
    }

    func testRemovedScreenWithNoIntersectionUsesPrimaryScreen() throws {
        let state = FloatingCardWindowState(
            entityKind: .note,
            entityID: "n-primary",
            frame: CodableRect(x: 5_000, y: 5_000, width: 400, height: 300),
            screenIdentifier: "removed",
            screenVisibleFrame: nil,
            normalizedPosition: nil,
            isAlwaysOnTop: true,
            updatedAt: Date()
        )
        let secondary = ScreenGeometry(identifier: "secondary", visibleFrame: CGRect(x: 1_440, y: 0, width: 1_000, height: 700), isPrimary: false)
        let primary = ScreenGeometry(identifier: "primary", visibleFrame: CGRect(x: 0, y: 0, width: 1_440, height: 900), isPrimary: true)
        let frame = try XCTUnwrap(ScreenPlacementResolver.resolve(state, screens: [secondary, primary]))
        XCTAssertTrue(primary.visibleFrame.contains(frame))
    }

    func testScreenResolverPreservesNormalizedPositionOnMatchedDisplay() throws {
        let state = FloatingCardWindowState(
            entityKind: .todo,
            entityID: "t1",
            frame: CodableRect(x: 0, y: 0, width: 300, height: 200),
            screenIdentifier: "external",
            screenVisibleFrame: nil,
            normalizedPosition: CodablePoint(x: 1, y: 1),
            isAlwaysOnTop: true,
            updatedAt: Date()
        )
        let screen = ScreenGeometry(identifier: "external", visibleFrame: CGRect(x: -1_600, y: 40, width: 1_600, height: 1_000), isPrimary: false)
        let frame = try XCTUnwrap(ScreenPlacementResolver.resolve(state, screens: [screen]))
        XCTAssertEqual(frame.maxX, screen.visibleFrame.maxX, accuracy: 0.001)
        XCTAssertEqual(frame.maxY, screen.visibleFrame.maxY, accuracy: 0.001)
    }

    func testDraggingOutUsesPreviewFrameInsteadOfAStaleSavedFrame() {
        let dragFrame = CGRect(x: 420, y: 260, width: 400, height: 280)
        let savedState = FloatingCardWindowState(
            entityKind: .note,
            entityID: "note-placement",
            frame: CodableRect(x: 20, y: 30, width: 400, height: 280),
            screenIdentifier: "main",
            screenVisibleFrame: nil,
            normalizedPosition: nil,
            isAlwaysOnTop: true,
            updatedAt: Date()
        )
        let screens = [
            ScreenGeometry(
                identifier: "main",
                visibleFrame: CGRect(x: 0, y: 0, width: 1_440, height: 900),
                isPrimary: true
            ),
        ]

        XCTAssertEqual(
            ScreenPlacementResolver.initialFloatingFrame(
                dragFrame: dragFrame,
                savedState: savedState,
                restoreSavedPlacement: false,
                screens: screens
            ),
            dragFrame
        )
        XCTAssertEqual(
            ScreenPlacementResolver.initialFloatingFrame(
                dragFrame: dragFrame,
                savedState: savedState,
                restoreSavedPlacement: true,
                screens: screens
            ).origin,
            CGPoint(x: 20, y: 30)
        )
    }

    func testLegacyFrameMigrationAddsCurrentSchema() {
        let state = FloatingCardWindowState.migratingLegacyFrame(
            entityKind: .note,
            entityID: "n1",
            frame: CodableRect(x: 1, y: 2, width: 3, height: 4)
        )
        XCTAssertEqual(state.schemaVersion, FloatemSharedContainer.currentSchemaVersion)
        XCTAssertNil(state.screenIdentifier)
    }

    func testLoginLaunchStaysSilentAndUserLaunchShowsMainWindow() {
        var login = LaunchContextResolver(arguments: ["Floatem", "--floatem-login-item"], environment: [:])
        XCTAssertFalse(login.shouldShowAtDidFinish(isApplicationActive: false, launchAtLoginEnabled: true))
        XCTAssertFalse(login.shouldShowForActivation(launchAtLoginEnabled: true))

        var disabledLogin = LaunchContextResolver(arguments: ["Floatem", "--floatem-login-item"], environment: [:])
        XCTAssertTrue(disabledLogin.shouldShowAtDidFinish(isApplicationActive: false, launchAtLoginEnabled: false))

        var agentHotKey = LaunchContextResolver(arguments: ["Floatem", FloatemAgentXPC.agentLaunchArgument], environment: [:])
        XCTAssertTrue(agentHotKey.shouldShowAtDidFinish(isApplicationActive: true, launchAtLoginEnabled: false))
        XCTAssertFalse(agentHotKey.shouldShowForActivation(launchAtLoginEnabled: false))

        var agentWakeRecovery = LaunchContextResolver(arguments: ["Floatem", FloatemAgentXPC.agentWakeRecoveryLaunchArgument], environment: [:])
        XCTAssertFalse(agentWakeRecovery.shouldShowAtDidFinish(isApplicationActive: true, launchAtLoginEnabled: false))
        XCTAssertFalse(agentWakeRecovery.shouldShowForActivation(launchAtLoginEnabled: false))

        var user = LaunchContextResolver(arguments: ["Floatem", "--floatem-user-launch"], environment: [:])
        XCTAssertTrue(user.shouldShowAtDidFinish(isApplicationActive: false, launchAtLoginEnabled: false))

        var automatic = LaunchContextResolver(arguments: ["Floatem"], environment: [:])
        XCTAssertFalse(automatic.shouldShowAtDidFinish(isApplicationActive: false, launchAtLoginEnabled: false))
        XCTAssertTrue(automatic.shouldShowForActivation(launchAtLoginEnabled: false))

        var backgroundLogin = LaunchContextResolver(arguments: ["Floatem"], environment: [:])
        XCTAssertFalse(backgroundLogin.shouldShowAtDidFinish(isApplicationActive: false, launchAtLoginEnabled: true))
        XCTAssertFalse(backgroundLogin.consumedInitialActivation)

        var firstFinderDoubleClick = LaunchContextResolver(arguments: ["Floatem"], environment: [:])
        firstFinderDoubleClick.recordInitialOpenEvent(launchedAsLoginItem: false)
        XCTAssertTrue(firstFinderDoubleClick.shouldShowAtDidFinish(isApplicationActive: false, launchAtLoginEnabled: true))
        XCTAssertFalse(firstFinderDoubleClick.shouldShowForActivation(launchAtLoginEnabled: true))
        XCTAssertFalse(firstFinderDoubleClick.shouldShowAtDidFinish(isApplicationActive: true, launchAtLoginEnabled: true))

        var firstSpotlightLaunch = LaunchContextResolver(arguments: ["Floatem"], environment: [:])
        firstSpotlightLaunch.recordInitialOpenEvent(launchedAsLoginItem: false)
        XCTAssertTrue(firstSpotlightLaunch.shouldShowAtDidFinish(isApplicationActive: false, launchAtLoginEnabled: true))
        XCTAssertFalse(firstSpotlightLaunch.shouldShowForActivation(launchAtLoginEnabled: true))

        var systemLoginItem = LaunchContextResolver(arguments: ["Floatem"], environment: [:])
        systemLoginItem.recordInitialOpenEvent(launchedAsLoginItem: true)
        XCTAssertFalse(systemLoginItem.shouldShowAtDidFinish(isApplicationActive: false, launchAtLoginEnabled: true))
        XCTAssertFalse(systemLoginItem.shouldShowForActivation(launchAtLoginEnabled: true))

        var alreadyActive = LaunchContextResolver(arguments: ["Floatem"], environment: [:])
        XCTAssertTrue(alreadyActive.shouldShowAtDidFinish(isApplicationActive: true, launchAtLoginEnabled: false))
        XCTAssertFalse(alreadyActive.shouldShowForActivation(launchAtLoginEnabled: false))

        var spotlightOrDoubleClick = LaunchContextResolver(arguments: ["Floatem"], environment: [:])
        XCTAssertTrue(spotlightOrDoubleClick.shouldShowAtDidFinish(isApplicationActive: true, launchAtLoginEnabled: true))
        XCTAssertFalse(spotlightOrDoubleClick.shouldShowForActivation(launchAtLoginEnabled: true))

        var deepLink = LaunchContextResolver(arguments: ["Floatem"], environment: [:])
        deepLink.markDeepLinkReceived()
        XCTAssertFalse(deepLink.shouldShowAtDidFinish(isApplicationActive: true, launchAtLoginEnabled: false))
    }

    func testWakeRecoveryOnlyRelaunchesAVisibleHost() {
        XCTAssertFalse(FloatemWakeRecoveryPolicy.shouldRelaunchHost(
            hostWasRunningBeforeSleep: false,
            mainWindowWasVisibleBeforeSleep: false
        ))
        XCTAssertFalse(FloatemWakeRecoveryPolicy.shouldRelaunchHost(
            hostWasRunningBeforeSleep: true,
            mainWindowWasVisibleBeforeSleep: false
        ))
        XCTAssertTrue(FloatemWakeRecoveryPolicy.shouldRelaunchHost(
            hostWasRunningBeforeSleep: true,
            mainWindowWasVisibleBeforeSleep: true
        ))
    }

    func testAgentHostLocatorFindsContainingAppFromAbsoluteExecutablePath() {
        let executableURL = URL(fileURLWithPath: "/Applications/Floatem.app/Contents/Resources/FloatemHotKeyAgent")

        XCTAssertEqual(
            FloatemAgentHostLocator.containingAppBundleURL(executableURL: executableURL)?.path,
            "/Applications/Floatem.app"
        )
    }

    func testAgentHostLocatorRejectsADeletedOrIncompleteHostBundle() throws {
        let root = try makeDirectory()
        let appURL = root.appendingPathComponent("Floatem.app", isDirectory: true)
        let contentsURL = appURL.appendingPathComponent("Contents", isDirectory: true)
        let macOSURL = contentsURL.appendingPathComponent("MacOS", isDirectory: true)
        let hostExecutableURL = macOSURL.appendingPathComponent("Floatem")
        let agentExecutableURL = contentsURL
            .appendingPathComponent("Resources", isDirectory: true)
            .appendingPathComponent("FloatemHotKeyAgent")

        try FileManager.default.createDirectory(at: macOSURL, withIntermediateDirectories: true)
        try Data().write(to: hostExecutableURL)
        let info: [String: Any] = [
            "CFBundleExecutable": "Floatem",
            "CFBundleIdentifier": "com.hankch.floatem",
            "CFBundlePackageType": "APPL",
        ]
        let infoData = try PropertyListSerialization.data(fromPropertyList: info, format: .xml, options: 0)
        try infoData.write(to: contentsURL.appendingPathComponent("Info.plist"))

        XCTAssertEqual(
            FloatemAgentHostLocator.validContainingAppBundleURL(executableURL: agentExecutableURL)?.path,
            appURL.path
        )
        XCTAssertEqual(
            FloatemAgentHostLocator.validContainingAppBundleURL(
                executableURL: agentExecutableURL,
                bundleProvider: { _ in nil }
            )?.path,
            appURL.path
        )
        XCTAssertNil(FloatemAgentHostLocator.validContainingAppBundleURL(
            executableURL: agentExecutableURL,
            expectedBundleIdentifier: "com.example.not-floatem"
        ))

        try FileManager.default.removeItem(at: hostExecutableURL)
        XCTAssertNil(FloatemAgentHostLocator.validContainingAppBundleURL(executableURL: agentExecutableURL))
        XCTAssertNil(FloatemAgentHostLocator.validContainingAppBundleURL(
            executableURL: root.appendingPathComponent("Missing.app/Contents/Resources/FloatemHotKeyAgent")
        ))
    }

    @MainActor
    func testLifecycleDiagnosticsPersistLifecycleEventsAndHeartbeats() throws {
        let directory = try makeDirectory()
        var currentDate = Date(timeIntervalSince1970: 1_700_000_000)
        let diagnostics = LifecycleDiagnostics(
            directoryURL: directory,
            processID: 4_242,
            now: { currentDate },
            processIsRunning: { $0 == 4_242 },
            appVersion: "1.0.11",
            appBuild: "53",
            executablePath: "/Applications/Floatem.app/Contents/MacOS/Floatem"
        )

        diagnostics.start()
        currentDate.addTimeInterval(30)
        diagnostics.recordWillSleep()
        currentDate.addTimeInterval(10)
        diagnostics.recordDidWake()
        currentDate.addTimeInterval(5)
        diagnostics.recordRecoveredAfterWake()
        currentDate.addTimeInterval(5)
        diagnostics.recordGracefulTermination(reason: "applicationWillTerminate")

        let session = try XCTUnwrap(diagnostics.currentSession())
        XCTAssertEqual(session.processID, 4_242)
        XCTAssertEqual(session.appVersion, "1.0.11")
        XCTAssertEqual(session.appBuild, "53")
        XCTAssertEqual(session.lastHeartbeatAt, currentDate)
        XCTAssertEqual(session.sleptAt, Date(timeIntervalSince1970: 1_700_000_030))
        XCTAssertEqual(session.wokeAt, Date(timeIntervalSince1970: 1_700_000_040))
        XCTAssertEqual(session.exitReason, "applicationWillTerminate")
        XCTAssertTrue(session.hadGracefulTermination)
        XCTAssertEqual(diagnostics.eventRecords().map(\.kind), [.launch, .willSleep, .didWake, .recoveredAfterWake, .gracefulTermination])
    }

    @MainActor
    func testLifecycleDiagnosticsInfersMissingGracefulExitOnlyAfterPIDIsGone() throws {
        let directory = try makeDirectory()
        let first = LifecycleDiagnostics(
            directoryURL: directory,
            processID: 101,
            processIsRunning: { $0 == 101 },
            appVersion: "1.0.11",
            appBuild: "53",
            executablePath: "/tmp/Floatem"
        )
        first.start()
        let firstSessionID = try XCTUnwrap(first.currentSession()?.sessionID)

        let second = LifecycleDiagnostics(
            directoryURL: directory,
            processID: 202,
            processIsRunning: { $0 == 202 },
            appVersion: "1.0.11",
            appBuild: "53",
            executablePath: "/tmp/Floatem"
        )
        second.start()

        let priorSession = try XCTUnwrap(second.sessionRecords().first { $0.sessionID == firstSessionID })
        XCTAssertNotNil(priorSession.unexpectedTerminationInferredAt)
        XCTAssertEqual(
            priorSession.inferredExitReason,
            "No graceful termination record; the recorded PID was absent when a later Floatem session began."
        )
        XCTAssertTrue(second.eventRecords().contains {
            $0.kind == .previousSessionEndedUnexpectedly && $0.relatedSessionID == firstSessionID
        })
    }

    private func makeDirectory() throws -> URL {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        temporaryDirectories.append(directory)
        return directory
    }
}
