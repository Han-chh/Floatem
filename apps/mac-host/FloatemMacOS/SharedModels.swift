import Foundation
import Security

enum FloatemSharedContainer {
    static let appGroupIdentifier = "group.com.hankch.floatem"
    static let sharedDataDirectoryName = "SharedData"
    static let currentSchemaVersion = 1

    static func containerURL(fileManager: FileManager = .default) -> URL? {
        guard hasAppGroupEntitlement() else {
            return nil
        }
        return fileManager.containerURL(forSecurityApplicationGroupIdentifier: appGroupIdentifier)
    }

    private static func hasAppGroupEntitlement() -> Bool {
        guard
            let task = SecTaskCreateFromSelf(nil),
            let value = SecTaskCopyValueForEntitlement(
                task,
                "com.apple.security.application-groups" as CFString,
                nil
            ),
            let identifiers = value as? [String]
        else {
            return false
        }
        return identifiers.contains(appGroupIdentifier)
    }

    static func sharedDataURL(fileManager: FileManager = .default) -> URL? {
        containerURL(fileManager: fileManager)?
            .appendingPathComponent(sharedDataDirectoryName, isDirectory: true)
    }

}

enum FloatemEntityKind: String, Codable, CaseIterable, Sendable {
    case note
    case todo
}

struct WidgetEntityReference: Codable, Hashable, Sendable {
    var entityKind: FloatemEntityKind
    var entityID: String
}

struct NoteWidgetSnapshot: Codable, Hashable, Sendable {
    var entityID: String
    var title: String
    var summary: String
    var colorHex: String
    var updatedAt: Date
    var schemaVersion: Int = FloatemSharedContainer.currentSchemaVersion
}

struct TodoWidgetSnapshot: Codable, Hashable, Sendable {
    var entityID: String
    var title: String
    var isCompleted: Bool
    var dueDateKey: String?
    var reminderAt: Date?
    var updatedAt: Date
    var schemaVersion: Int = FloatemSharedContainer.currentSchemaVersion
}

struct DesktopWidgetPreference: Codable, Hashable, Sendable {
    var entityKind: FloatemEntityKind
    var entityID: String
    var requestedAt: Date
    var lastKnownWidgetFamily: String?
    var schemaVersion: Int = FloatemSharedContainer.currentSchemaVersion
}

struct DesktopPanelState: Codable, Hashable, Sendable {
    var entityKind: FloatemEntityKind
    var entityID: String
    var frame: CodableRect
    var screenIdentifier: String?
    var screenVisibleFrame: CodableRect?
    var normalizedPosition: CodablePoint?
    var updatedAt: Date
    var schemaVersion: Int = FloatemSharedContainer.currentSchemaVersion

    var windowState: FloatingCardWindowState {
        FloatingCardWindowState(
            entityKind: entityKind,
            entityID: entityID,
            frame: frame,
            screenIdentifier: screenIdentifier,
            screenVisibleFrame: screenVisibleFrame,
            normalizedPosition: normalizedPosition,
            isAlwaysOnTop: false,
            updatedAt: updatedAt,
            schemaVersion: schemaVersion
        )
    }

    init(windowState: FloatingCardWindowState) {
        entityKind = windowState.entityKind
        entityID = windowState.entityID
        frame = windowState.frame
        screenIdentifier = windowState.screenIdentifier
        screenVisibleFrame = windowState.screenVisibleFrame
        normalizedPosition = windowState.normalizedPosition
        updatedAt = windowState.updatedAt
        schemaVersion = windowState.schemaVersion
    }
}

struct DesktopPinStateMigrationRecord: Codable, Sendable {
    var migratedEntityCount: Int
    var migratedAt: Date
    var sourceFilename: String
    var schemaVersion: Int = FloatemSharedContainer.currentSchemaVersion
}

struct CodablePoint: Codable, Hashable, Sendable {
    var x: Double
    var y: Double
}

struct CodableRect: Codable, Hashable, Sendable {
    var x: Double
    var y: Double
    var width: Double
    var height: Double
}

struct FloatingCardWindowState: Codable, Hashable, Sendable {
    var entityKind: FloatemEntityKind
    var entityID: String
    var frame: CodableRect
    var screenIdentifier: String?
    var screenVisibleFrame: CodableRect?
    var normalizedPosition: CodablePoint?
    var isAlwaysOnTop: Bool
    var updatedAt: Date
    var schemaVersion: Int = FloatemSharedContainer.currentSchemaVersion

    static func migratingLegacyFrame(
        entityKind: FloatemEntityKind,
        entityID: String,
        frame: CodableRect,
        isAlwaysOnTop: Bool = true
    ) -> FloatingCardWindowState {
        FloatingCardWindowState(
            entityKind: entityKind,
            entityID: entityID,
            frame: frame,
            screenIdentifier: nil,
            screenVisibleFrame: nil,
            normalizedPosition: nil,
            isAlwaysOnTop: isAlwaysOnTop,
            updatedAt: Date(),
            schemaVersion: FloatemSharedContainer.currentSchemaVersion
        )
    }
}

struct ScreenPlacementState: Codable, Hashable, Sendable {
    var frame: CodableRect
    var screenIdentifier: String?
    var screenVisibleFrame: CodableRect?
    var normalizedPosition: CodablePoint?
    var schemaVersion: Int = FloatemSharedContainer.currentSchemaVersion
}

struct SharedThemeSettings: Codable, Hashable, Sendable {
    var theme: String
    var language: String
    var updatedAt: Date
    var schemaVersion: Int = FloatemSharedContainer.currentSchemaVersion
}
