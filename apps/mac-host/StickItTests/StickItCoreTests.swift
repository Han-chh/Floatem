import XCTest
@testable import StickIt

final class StickItCoreTests: XCTestCase {
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
        let url = try XCTUnwrap(StickItDeepLink.url(for: reference))
        XCTAssertEqual(StickItDeepLink(url: url)?.destination, .floatingCard(reference))
        XCTAssertEqual(StickItDeepLink(url: URL(string: "stickit://open")!)?.destination, .mainWindow)
        XCTAssertNil(StickItDeepLink(url: URL(string: "stickit://open?kind=file&id=/tmp/a&mode=floating")!))
        XCTAssertNil(StickItDeepLink(url: URL(string: "https://example.com/open?kind=note&id=x")!))
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
        XCTAssertEqual(state.schemaVersion, StickItSharedContainer.currentSchemaVersion)
        XCTAssertNil(state.screenIdentifier)
    }

    func testLoginLaunchStaysSilentAndUserLaunchShowsMainWindow() {
        var login = LaunchContextResolver(arguments: ["StickIt", "--stickit-login-item"], environment: [:])
        XCTAssertFalse(login.shouldShowAtDidFinish(isApplicationActive: false, launchAtLoginEnabled: true))
        XCTAssertFalse(login.shouldShowForActivation(launchAtLoginEnabled: true))

        var disabledLogin = LaunchContextResolver(arguments: ["StickIt", "--stickit-login-item"], environment: [:])
        XCTAssertTrue(disabledLogin.shouldShowAtDidFinish(isApplicationActive: false, launchAtLoginEnabled: false))

        var user = LaunchContextResolver(arguments: ["StickIt", "--stickit-user-launch"], environment: [:])
        XCTAssertTrue(user.shouldShowAtDidFinish(isApplicationActive: false, launchAtLoginEnabled: false))

        var automatic = LaunchContextResolver(arguments: ["StickIt"], environment: [:])
        XCTAssertFalse(automatic.shouldShowAtDidFinish(isApplicationActive: false, launchAtLoginEnabled: false))
        XCTAssertTrue(automatic.shouldShowForActivation(launchAtLoginEnabled: false))

        var alreadyActive = LaunchContextResolver(arguments: ["StickIt"], environment: [:])
        XCTAssertTrue(alreadyActive.shouldShowAtDidFinish(isApplicationActive: true, launchAtLoginEnabled: false))
        XCTAssertFalse(alreadyActive.shouldShowForActivation(launchAtLoginEnabled: false))

        var deepLink = LaunchContextResolver(arguments: ["StickIt"], environment: [:])
        deepLink.markDeepLinkReceived()
        XCTAssertFalse(deepLink.shouldShowAtDidFinish(isApplicationActive: true, launchAtLoginEnabled: false))
    }

    private func makeDirectory() throws -> URL {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        temporaryDirectories.append(directory)
        return directory
    }
}
