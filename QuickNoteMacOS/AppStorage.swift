import Foundation

@MainActor
final class AppStorage {
    private let fileManager = FileManager.default
    private let appSupportDirectory: URL

    init(bundleIdentifier: String = Bundle.main.bundleIdentifier ?? "com.quicknote.app") {
        let baseDirectory = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        appSupportDirectory = baseDirectory.appendingPathComponent(bundleIdentifier, isDirectory: true)
    }

    func loadAllData() throws -> [String: Any] {
        [
            "notes": try readJSONArray(at: notesURL),
            "todos": try readJSONArray(at: todosURL),
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

        try saveJSONObject(settings, to: settingsURL)
        return settings
    }

    func currentHotkey() throws -> String {
        let settings = try loadSettings()
        return settings["hotkey"] as? String ?? GlobalHotKeyManager.defaultShortcut
    }

    func updateHotkey(_ shortcut: String) throws {
        var settings = try loadSettings()
        settings["hotkey"] = shortcut
        try saveJSONObject(settings, to: settingsURL)
    }

    func saveNotes(_ notes: Any) throws {
        try saveJSONObject(notes, to: notesURL)
    }

    func saveTodos(_ todos: Any) throws {
        try saveJSONObject(todos, to: todosURL)
    }

    func saveSettings(_ settings: [String: Any]) throws {
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

        try saveJSONObject(mergedSettings, to: settingsURL)
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

    private var defaultSettings: [String: Any] {
        [
            "hotkey": GlobalHotKeyManager.defaultShortcut,
            "panelPosition": NSNull(),
            "activeTab": "notes",
            "transitionStyle": "page",
            "animationSpeed": "faster",
            "enableParticles": true,
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
            throw QuickNoteBridgeError.invalidJSON("Expected a JSON array at \(url.lastPathComponent).")
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
            throw QuickNoteBridgeError.invalidJSON("QuickNote received data that cannot be encoded to JSON.")
        }

        try ensureAppSupportDirectoryExists()

        let data = try JSONSerialization.data(withJSONObject: object, options: [.prettyPrinted, .sortedKeys])
        try data.write(to: url, options: [.atomic])
    }
}
