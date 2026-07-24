import Foundation
import OSLog

enum SharedDataStoreError: LocalizedError {
    case invalidJSON

    var errorDescription: String? {
        "Floatem shared data is not valid JSON."
    }
}

final class SharedDataStore: @unchecked Sendable {
    static let notesFilename = "notes.json"
    static let todosFilename = "todos.json"
    static let settingsFilename = "settings.json"
    static let widgetPreferencesFilename = "desktop-widget-preferences.json"
    static let desktopPanelStatesFilename = "desktop-panel-states.json"
    static let floatingWindowStatesFilename = "floating-card-window-states.json"

    let directoryURL: URL
    private let fileManager: FileManager
    private let logger = Logger(subsystem: "com.floatem.app", category: "SharedData")

    init(directoryURL: URL, fileManager: FileManager = .default) {
        self.directoryURL = directoryURL
        self.fileManager = fileManager
    }

    convenience init?() {
        guard let directoryURL = FloatemSharedContainer.sharedDataURL() else {
            return nil
        }
        self.init(directoryURL: directoryURL)
    }

    func url(for filename: String) -> URL {
        directoryURL.appendingPathComponent(filename)
    }

    func readJSONObject(filename: String) throws -> Any? {
        let fileURL = url(for: filename)
        do {
            let data = try Data(contentsOf: fileURL)
            return try JSONSerialization.jsonObject(with: data)
        } catch let error as NSError where error.domain == NSCocoaErrorDomain && error.code == NSFileReadNoSuchFileError {
            return nil
        }
    }

    func writeJSONObject(_ object: Any, filename: String) throws {
        guard JSONSerialization.isValidJSONObject(object) else {
            throw SharedDataStoreError.invalidJSON
        }
        try ensureDirectoryExists()
        let data = try JSONSerialization.data(withJSONObject: object, options: [.prettyPrinted, .sortedKeys])
        try data.write(to: url(for: filename), options: [.atomic])
    }

    func readCodable<T: Decodable>(_ type: T.Type, filename: String) throws -> T? {
        let fileURL = url(for: filename)
        do {
            return try Self.decoder.decode(type, from: Data(contentsOf: fileURL))
        } catch let error as NSError where error.domain == NSCocoaErrorDomain && error.code == NSFileReadNoSuchFileError {
            return nil
        }
    }

    func writeCodable<T: Encodable>(_ value: T, filename: String) throws {
        try ensureDirectoryExists()
        let data = try Self.encoder.encode(value)
        try data.write(to: url(for: filename), options: [.atomic])
    }

    func noteSnapshots() throws -> [NoteWidgetSnapshot] {
        let root = try readJSONObject(filename: Self.notesFilename)
        let cards = Self.items(from: root, documentKey: "cards")
        return cards.compactMap(Self.noteSnapshot)
    }

    func noteSnapshot(entityID: String) throws -> NoteWidgetSnapshot? {
        try noteSnapshots().first { $0.entityID == entityID }
    }

    func todoSnapshots() throws -> [TodoWidgetSnapshot] {
        let root = try readJSONObject(filename: Self.todosFilename)
        let items = Self.items(from: root, documentKey: "items")
        return items.compactMap(Self.todoSnapshot)
    }

    func todoSnapshot(entityID: String) throws -> TodoWidgetSnapshot? {
        try todoSnapshots().first { $0.entityID == entityID }
    }

    func widgetPreferences() throws -> [DesktopWidgetPreference] {
        try readCodable([DesktopWidgetPreference].self, filename: Self.widgetPreferencesFilename) ?? []
    }

    func setWidgetPreference(_ reference: WidgetEntityReference, requested: Bool) throws {
        var preferences = try widgetPreferences()
        preferences.removeAll {
            $0.entityKind == reference.entityKind && $0.entityID == reference.entityID
        }
        if requested {
            preferences.append(
                DesktopWidgetPreference(
                    entityKind: reference.entityKind,
                    entityID: reference.entityID,
                    requestedAt: Date(),
                    lastKnownWidgetFamily: nil
                )
            )
        }
        try writeCodable(preferences, filename: Self.widgetPreferencesFilename)
    }

    func latestRequestedEntity(kind: FloatemEntityKind) throws -> WidgetEntityReference? {
        try widgetPreferences()
            .filter { $0.entityKind == kind }
            .max(by: { $0.requestedAt < $1.requestedAt })
            .map { WidgetEntityReference(entityKind: $0.entityKind, entityID: $0.entityID) }
    }

    func floatingWindowStates() throws -> [FloatingCardWindowState] {
        try readCodable([FloatingCardWindowState].self, filename: Self.floatingWindowStatesFilename) ?? []
    }

    func saveFloatingWindowState(_ state: FloatingCardWindowState) throws {
        var states = try floatingWindowStates()
        states.removeAll { $0.entityKind == state.entityKind && $0.entityID == state.entityID }
        states.append(state)
        try writeCodable(states, filename: Self.floatingWindowStatesFilename)
    }

    func removeFloatingWindowState(_ reference: WidgetEntityReference) throws {
        var states = try floatingWindowStates()
        let initialCount = states.count
        states.removeAll { $0.entityKind == reference.entityKind && $0.entityID == reference.entityID }
        if states.count != initialCount {
            try writeCodable(states, filename: Self.floatingWindowStatesFilename)
        }
    }

    func desktopPanelStates() throws -> [DesktopPanelState] {
        try readCodable([DesktopPanelState].self, filename: Self.desktopPanelStatesFilename) ?? []
    }

    func saveDesktopPanelState(_ state: DesktopPanelState) throws {
        var states = try desktopPanelStates()
        states.removeAll { $0.entityKind == state.entityKind && $0.entityID == state.entityID }
        states.append(state)
        try writeCodable(states, filename: Self.desktopPanelStatesFilename)
    }

    func removeDesktopPanelState(_ reference: WidgetEntityReference) throws {
        var states = try desktopPanelStates()
        let initialCount = states.count
        states.removeAll { $0.entityKind == reference.entityKind && $0.entityID == reference.entityID }
        if states.count != initialCount {
            try writeCodable(states, filename: Self.desktopPanelStatesFilename)
        }
    }

    private func ensureDirectoryExists() throws {
        try fileManager.createDirectory(at: directoryURL, withIntermediateDirectories: true)
    }

    private static let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()

    private static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()

    private static func items(from root: Any?, documentKey: String) -> [[String: Any]] {
        if let array = root as? [[String: Any]] {
            return array
        }
        return (root as? [String: Any])?[documentKey] as? [[String: Any]] ?? []
    }

    private static func millisecondsDate(_ value: Any?, fallback: Date = Date()) -> Date {
        guard let milliseconds = (value as? NSNumber)?.doubleValue else { return fallback }
        return Date(timeIntervalSince1970: milliseconds / 1_000)
    }

    private static func noteSnapshot(_ object: [String: Any]) -> NoteWidgetSnapshot? {
        guard let id = object["id"] as? String, !id.isEmpty else { return nil }
        let title = (object["title"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
        return NoteWidgetSnapshot(
            entityID: id,
            title: title?.isEmpty == false ? title! : "Untitled note",
            summary: plainText(from: object["content"]).trimmingCharacters(in: .whitespacesAndNewlines),
            colorHex: object["dotColor"] as? String ?? "#FF7A59",
            updatedAt: millisecondsDate(object["updatedAt"])
        )
    }

    private static func todoSnapshot(_ object: [String: Any]) -> TodoWidgetSnapshot? {
        guard let id = object["id"] as? String, !id.isEmpty else { return nil }
        let createdAt = millisecondsDate(object["createdAt"])
        let reminderAt = (object["reminderAt"] as? NSNumber).map {
            Date(timeIntervalSince1970: $0.doubleValue / 1_000)
        }
        return TodoWidgetSnapshot(
            entityID: id,
            title: object["text"] as? String ?? "Untitled todo",
            isCompleted: object["done"] as? Bool ?? false,
            dueDateKey: object["dateKey"] as? String,
            reminderAt: reminderAt,
            updatedAt: reminderAt ?? createdAt
        )
    }

    private static func plainText(from value: Any?) -> String {
        if let dictionary = value as? [String: Any] {
            let ownText = dictionary["text"] as? String ?? ""
            let childText = (dictionary["children"] as? [Any] ?? []).map(plainText).joined()
            return ownText + childText
        }
        if let array = value as? [Any] {
            return array.map(plainText).filter { !$0.isEmpty }.joined(separator: "\n")
        }
        return ""
    }
}

struct LegacyDataMigrator {
    static let migrationRecordFilename = "legacy-data-migration.json"
    static let desktopMigrationRecordFilename = "desktop-pin-migration.json"

    let legacyDirectoryURL: URL
    let sharedStore: SharedDataStore
    var fileManager: FileManager = .default
    private let logger = Logger(subsystem: "com.floatem.app", category: "Migration")

    func migrateIfNeeded() throws {
        try fileManager.createDirectory(at: sharedStore.directoryURL, withIntermediateDirectories: true)
        for filename in [SharedDataStore.notesFilename, SharedDataStore.todosFilename, SharedDataStore.settingsFilename] {
            try migrateFileIfNeeded(filename)
        }
        try migrateDesktopCardsIfNeeded()
        let record = [
            "schemaVersion": FloatemSharedContainer.currentSchemaVersion,
            "migratedAt": ISO8601DateFormatter().string(from: Date()),
        ] as [String: Any]
        try sharedStore.writeJSONObject(record, filename: Self.migrationRecordFilename)
    }

    private func migrateFileIfNeeded(_ filename: String) throws {
        let sourceURL = legacyDirectoryURL.appendingPathComponent(filename)
        let destinationURL = sharedStore.url(for: filename)
        guard !fileManager.fileExists(atPath: destinationURL.path), fileManager.fileExists(atPath: sourceURL.path) else {
            return
        }
        let data = try Data(contentsOf: sourceURL)
        _ = try JSONSerialization.jsonObject(with: data)
        try data.write(to: destinationURL, options: [.atomic])
        logger.info("Migrated legacy shared data file. file=\(filename, privacy: .public)")
    }

    private func migrateDesktopCardsIfNeeded() throws {
        guard try sharedStore.readCodable(
            DesktopPinStateMigrationRecord.self,
            filename: Self.desktopMigrationRecordFilename
        ) == nil else { return }

        let sourceURL = legacyDirectoryURL.appendingPathComponent("desktop-cards.json")
        var references: Set<WidgetEntityReference> = []
        if fileManager.fileExists(atPath: sourceURL.path) {
            let object = try JSONSerialization.jsonObject(with: Data(contentsOf: sourceURL))
            for record in object as? [[String: Any]] ?? [] {
                guard
                    let kindValue = record["kind"] as? String,
                    let kind = FloatemEntityKind(rawValue: kindValue),
                    let id = record["id"] as? String,
                    !id.isEmpty
                else { continue }
                references.insert(WidgetEntityReference(entityKind: kind, entityID: id))
            }
        }

        var preferences = try sharedStore.widgetPreferences()
        let existing = Set(preferences.map { WidgetEntityReference(entityKind: $0.entityKind, entityID: $0.entityID) })
        for reference in references.subtracting(existing) {
            preferences.append(
                DesktopWidgetPreference(
                    entityKind: reference.entityKind,
                    entityID: reference.entityID,
                    requestedAt: Date(),
                    lastKnownWidgetFamily: nil
                )
            )
        }
        try sharedStore.writeCodable(preferences, filename: SharedDataStore.widgetPreferencesFilename)
        try sharedStore.writeCodable(
            DesktopPinStateMigrationRecord(
                migratedEntityCount: references.count,
                migratedAt: Date(),
                sourceFilename: sourceURL.lastPathComponent
            ),
            filename: Self.desktopMigrationRecordFilename
        )
        logger.info("Migrated legacy desktop cards to entity-only Widget preferences. count=\(references.count)")
    }
}
