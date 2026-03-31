import Foundation

@MainActor
protocol QuickNoteNativeBridgeHandling: AnyObject {
    func loadAllData() throws -> [String: Any]
    func saveNotes(_ notes: Any) throws
    func saveTodos(_ todos: Any) throws
    func saveSettings(_ settings: Any) throws
    func registerHotKey(shortcut: String) throws
    func hideMainWindowFromBridge()
    func startWindowDragFromBridge() throws
}

enum QuickNoteBridgeError: LocalizedError {
    case invalidParameters(String)
    case invalidJSON(String)
    case missingFrontendBundle

    var errorDescription: String? {
        switch self {
        case let .invalidParameters(message):
            return message
        case let .invalidJSON(message):
            return message
        case .missingFrontendBundle:
            return "QuickNote could not find the bundled frontend assets."
        }
    }
}
