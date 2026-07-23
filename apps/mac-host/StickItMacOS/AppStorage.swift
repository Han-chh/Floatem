import Foundation
import OSLog

@MainActor
final class AppStorage {
    private let fileManager = FileManager.default
    private let appSupportDirectory: URL
    private let legacyAppSupportDirectory: URL
    private let sharedStore: SharedDataStore
    private let logger = Logger(subsystem: "com.hankch.stickit", category: "Storage")

    init(bundleIdentifier: String = Bundle.main.bundleIdentifier ?? "com.hankch.stickit") {
        let baseDirectory = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        legacyAppSupportDirectory = baseDirectory.appendingPathComponent(bundleIdentifier, isDirectory: true)
        let preferredDirectory = StickItSharedContainer.sharedDataURL(fileManager: fileManager)
            ?? legacyAppSupportDirectory
        appSupportDirectory = preferredDirectory
        sharedStore = SharedDataStore(directoryURL: preferredDirectory, fileManager: fileManager)

        let previousAppSupportDirectory = baseDirectory.appendingPathComponent("com.stickit.app", isDirectory: true)
        let previousSharedDirectory = fileManager.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/Group Containers/group.com.hankch.stickit/SharedData", isDirectory: true)
        let migrationSources = [previousSharedDirectory, previousAppSupportDirectory, legacyAppSupportDirectory]
            .filter { $0.standardizedFileURL != preferredDirectory.standardizedFileURL }

        for migrationSource in migrationSources where fileManager.fileExists(atPath: migrationSource.path) {
            do {
                try LegacyDataMigrator(
                    legacyDirectoryURL: migrationSource,
                    sharedStore: sharedStore,
                    fileManager: fileManager
                ).migrateIfNeeded()
            } catch {
                logger.error(
                    "Shared data migration failed; source data remains untouched. source=\(migrationSource.path, privacy: .private) error=\(error.localizedDescription, privacy: .public)"
                )
            }
        }

        if preferredDirectory == legacyAppSupportDirectory {
            logger.warning("App Group container is unavailable; using the legacy application-support directory.")
        }
    }

    func loadAllData() throws -> [String: Any] {
        [
            "notes": try loadNotes(),
            "todos": try readJSONObject(at: todosURL) ?? [],
            "settings": try loadSettings(),
        ]
    }

    func loadSettings() throws -> [String: Any] {
        var settings = defaultSettings

        if let savedSettings = try readJSONObject(at: settingsURL) as? [String: Any] {
            for (key, value) in savedSettings {
                settings[key] = value
            }
        }

        if let hotkey = settings["hotkey"] as? String {
            settings["hotkey"] = GlobalHotKeyManager.normalize(shortcut: hotkey)
        } else {
            settings["hotkey"] = GlobalHotKeyManager.defaultShortcut
        }

        if settings["panelPosition"] == nil {
            settings["panelPosition"] = NSNull()
        }

        let language = StickItLanguage(storedValue: settings["language"])
        settings["language"] = language.rawValue

        try saveJSONObject(settings, to: settingsURL)
        return settings
    }

    func currentHotkey() throws -> String {
        let settings = try loadSettings()
        return settings["hotkey"] as? String ?? GlobalHotKeyManager.defaultShortcut
    }

    func currentLanguage() throws -> StickItLanguage {
        let settings = try loadSettings()
        return StickItLanguage(storedValue: settings["language"])
    }

    func currentLaunchAtLogin() throws -> Bool {
        let settings = try loadSettings()
        return settings["launchAtLogin"] as? Bool ?? false
    }

    func updateLaunchAtLogin(_ enabled: Bool) throws {
        var settings = try loadSettings()
        settings["launchAtLogin"] = enabled
        try saveJSONObject(settings, to: settingsURL)
    }

    func updateHotkey(_ shortcut: String) throws {
        var settings = try loadSettings()
        settings["hotkey"] = shortcut
        try saveJSONObject(settings, to: settingsURL)
    }

    func saveNotes(_ notes: Any) throws {
        try saveJSONObject(notes, to: notesURL)
    }

    func loadNotes() throws -> Any {
        try readJSONObject(at: notesURL) ?? []
    }

    func loadTodos() throws -> [Any] {
        let savedTodos = try readJSONObject(at: todosURL)
        if let todoArray = savedTodos as? [Any] {
            return todoArray
        }

        if let todoDocument = savedTodos as? [String: Any], let todoItems = todoDocument["items"] as? [Any] {
            return todoItems
        }

        return []
    }

    func saveTodos(_ todos: Any) throws {
        try saveJSONObject(todos, to: todosURL)
    }

    func saveSettings(_ settings: [String: Any]) throws {
        let previousLanguage = try? currentLanguage()
        var mergedSettings = defaultSettings

        for (key, value) in settings {
            mergedSettings[key] = value
        }

        if mergedSettings["panelPosition"] == nil {
            mergedSettings["panelPosition"] = NSNull()
        }

        if let hotkey = mergedSettings["hotkey"] as? String {
            mergedSettings["hotkey"] = GlobalHotKeyManager.normalize(shortcut: hotkey)
        } else {
            mergedSettings["hotkey"] = GlobalHotKeyManager.defaultShortcut
        }

        let language = StickItLanguage(storedValue: mergedSettings["language"])
        mergedSettings["language"] = language.rawValue

        try saveJSONObject(mergedSettings, to: settingsURL)

        if previousLanguage != language {
            NotificationCenter.default.post(
                name: .stickItLanguageDidChange,
                object: self,
                userInfo: ["language": language.rawValue]
            )
        }
    }

    func loadDesktopCards() throws -> [[String: Any]] {
        try readJSONObject(at: desktopCardsURL) as? [[String: Any]] ?? []
    }

    func saveDesktopCards(_ cards: [[String: Any]]) throws {
        try saveJSONObject(cards, to: desktopCardsURL)
    }

    func loadWidgetPreferences() throws -> [DesktopWidgetPreference] {
        try sharedStore.widgetPreferences()
    }

    func setWidgetPreference(kind: StickItEntityKind, id: String, requested: Bool) throws {
        try sharedStore.setWidgetPreference(
            WidgetEntityReference(entityKind: kind, entityID: id),
            requested: requested
        )
    }

    func desktopPanelStates() throws -> [DesktopPanelState] {
        try sharedStore.desktopPanelStates()
    }

    func saveDesktopPanelState(_ state: DesktopPanelState) throws {
        try sharedStore.saveDesktopPanelState(state)
    }

    func removeDesktopPanelState(kind: StickItEntityKind, id: String) throws {
        try sharedStore.removeDesktopPanelState(
            WidgetEntityReference(entityKind: kind, entityID: id)
        )
    }

    func noteSnapshots() throws -> [NoteWidgetSnapshot] {
        try sharedStore.noteSnapshots()
    }

    func todoSnapshots() throws -> [TodoWidgetSnapshot] {
        try sharedStore.todoSnapshots()
    }

    func floatingCardPayload(kind: StickItEntityKind, id: String) throws -> [String: Any]? {
        let settings = try loadSettings()
        let desktopRequested = try desktopPanelStates().contains {
            $0.entityKind == kind && $0.entityID == id
        }
        switch kind {
        case .note:
            let root = try loadNotes()
            let cards = Self.documentItems(root, key: "cards")
            guard let note = cards.first(where: { $0["id"] as? String == id }) else { return nil }
            let groups = (root as? [String: Any])?["groups"] as? [[String: Any]] ?? []
            return [
                "kind": kind.rawValue,
                "language": settings["language"] as? String ?? "zh-CN",
                "size": ["width": 420.0, "height": 300.0] as [String: Any],
                "minimumSize": ["width": 420.0, "height": 300.0] as [String: Any],
                "pointerOffset": ["x": 24.0, "y": 24.0] as [String: Any],
                "note": note,
                "groups": groups,
                "desktopPinned": desktopRequested,
            ]
        case .todo:
            let root = try readJSONObject(at: todosURL) ?? []
            let items = Self.documentItems(root, key: "items")
            guard let todo = items.first(where: { $0["id"] as? String == id }) else { return nil }
            let groups = (root as? [String: Any])?["groups"] as? [[String: Any]] ?? []
            return [
                "kind": kind.rawValue,
                "language": settings["language"] as? String ?? "zh-CN",
                "timeZone": settings["timeZone"] as? String ?? TimeZone.current.identifier,
                "timeFormat": settings["timeFormat"] as? String ?? "24h",
                "size": ["width": 360.0, "height": 72.0] as [String: Any],
                "minimumSize": ["width": 360.0, "height": 72.0] as [String: Any],
                "pointerOffset": ["x": 24.0, "y": 24.0] as [String: Any],
                "todo": todo,
                "groups": groups,
                "desktopPinned": desktopRequested,
            ]
        }
    }

    func floatingWindowStates() throws -> [FloatingCardWindowState] {
        try sharedStore.floatingWindowStates()
    }

    func saveFloatingWindowState(_ state: FloatingCardWindowState) throws {
        try sharedStore.saveFloatingWindowState(state)
    }

    func removeFloatingWindowState(kind: StickItEntityKind, id: String) throws {
        try sharedStore.removeFloatingWindowState(WidgetEntityReference(entityKind: kind, entityID: id))
    }

    func savePanelPosition(origin: CGPoint) throws {
        var settings = try loadSettings()
        settings["panelPosition"] = [
            "x": Int(origin.x.rounded()),
            "y": Int(origin.y.rounded()),
        ]
        try saveJSONObject(settings, to: settingsURL)
    }

    private var notesURL: URL {
        appSupportDirectory.appendingPathComponent("notes.json")
    }

    private var todosURL: URL {
        appSupportDirectory.appendingPathComponent("todos.json")
    }

    private var settingsURL: URL {
        appSupportDirectory.appendingPathComponent("settings.json")
    }

    private var desktopCardsURL: URL {
        appSupportDirectory.appendingPathComponent("desktop-cards.json")
    }

    private var defaultSettings: [String: Any] {
        [
            "hotkey": GlobalHotKeyManager.defaultShortcut,
            "language": "zh-CN",
            "timeZone": TimeZone.current.identifier,
            "timeFormat": "24h",
            "theme": "classic",
            "panelPosition": NSNull(),
            "activeTab": "notes",
            "lastActiveTab": "notes",
            "defaultOpenSection": "last",
            "transitionStyle": "page",
            "animationSpeed": "mediate",
            "launchAtLogin": false,
            "enableParticles": true,
            "enableReminderSound": true,
        ]
    }

    private func ensureAppSupportDirectoryExists() throws {
        try fileManager.createDirectory(at: appSupportDirectory, withIntermediateDirectories: true)
    }

    private func readJSONArray(at url: URL) throws -> [Any] {
        guard let json = try readJSONObject(at: url) else {
            return []
        }

        guard let array = json as? [Any] else {
            throw StickItBridgeError.invalidJSON("Expected a JSON array at \(url.lastPathComponent).")
        }

        return array
    }

    private func readJSONObject(at url: URL) throws -> Any? {
        do {
            let data = try Data(contentsOf: url)
            return try JSONSerialization.jsonObject(with: data)
        } catch let error as NSError where error.domain == NSCocoaErrorDomain && error.code == NSFileReadNoSuchFileError {
            return nil
        }
    }

    private func saveJSONObject(_ object: Any, to url: URL) throws {
        guard JSONSerialization.isValidJSONObject(object) else {
            throw StickItBridgeError.invalidJSON("StickIt received data that cannot be encoded to JSON.")
        }

        try ensureAppSupportDirectoryExists()

        let data = try JSONSerialization.data(withJSONObject: object, options: [.prettyPrinted, .sortedKeys])
        try data.write(to: url, options: [.atomic])
    }

    private static func documentItems(_ root: Any, key: String) -> [[String: Any]] {
        if let items = root as? [[String: Any]] {
            return items
        }
        return (root as? [String: Any])?[key] as? [[String: Any]] ?? []
    }
}
