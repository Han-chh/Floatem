import Carbon
import Dispatch
import Foundation
import OSLog

final class GlobalHotKeyManager {
    static let defaultShortcut = "Cmd+Shift+Space"

    var onHotKeyPressed: (() -> Void)?

    private(set) var registeredShortcut: String?

    private var eventHandlerRef: EventHandlerRef?
    private var hotKeyRef: EventHotKeyRef?
    private let logger = Logger(subsystem: "com.quicknote.app", category: "HotKey")

    init() {}

    deinit {
        unregister()

        if let eventHandlerRef {
            RemoveEventHandler(eventHandlerRef)
        }
    }

    func register(shortcut rawShortcut: String) throws {
        dispatchPrecondition(condition: .onQueue(.main))

        let shortcut = try Self.validShortcut(from: rawShortcut)

        installEventHandlerIfNeeded()
        unregister()

        let parsed = try HotKeyParser.parse(shortcut)
        let hotKeyID = EventHotKeyID(signature: Self.hotKeySignature, id: 1)
        var hotKeyRef: EventHotKeyRef?

        let status = RegisterEventHotKey(
            parsed.keyCode,
            parsed.modifiers,
            hotKeyID,
            GetEventDispatcherTarget(),
            0,
            &hotKeyRef
        )

        guard status == noErr, let hotKeyRef else {
            throw GlobalHotKeyError.registrationFailed(status)
        }

        self.hotKeyRef = hotKeyRef
        registeredShortcut = shortcut
        logger.info("Registered global shortcut: \(shortcut, privacy: .public)")
    }

    func unregister() {
        dispatchPrecondition(condition: .onQueue(.main))

        if let hotKeyRef {
            UnregisterEventHotKey(hotKeyRef)
            self.hotKeyRef = nil
            registeredShortcut = nil
        }
    }

    static func normalize(shortcut rawShortcut: String) -> String {
        let trimmed = rawShortcut.trimmingCharacters(in: .whitespacesAndNewlines)

        if trimmed.isEmpty {
            return defaultShortcut
        }

        let compact = trimmed
            .components(separatedBy: .whitespacesAndNewlines)
            .joined()
            .lowercased()

        if compact == "alt+space" || compact == "fn+space" {
            return defaultShortcut
        }

        return trimmed
    }

    static func isShortcutValid(_ rawShortcut: String) -> Bool {
        (try? validShortcut(from: rawShortcut)) != nil
    }

    static func validShortcut(from rawShortcut: String) throws -> String {
        let shortcut = normalize(shortcut: rawShortcut)
        _ = try HotKeyParser.parse(shortcut)
        return shortcut
    }

    private func installEventHandlerIfNeeded() {
        guard eventHandlerRef == nil else {
            return
        }

        var eventType = EventTypeSpec(
            eventClass: OSType(kEventClassKeyboard),
            eventKind: UInt32(kEventHotKeyPressed)
        )

        let status = InstallEventHandler(
            GetEventDispatcherTarget(),
            quickNoteHotKeyHandler,
            1,
            &eventType,
            UnsafeMutableRawPointer(Unmanaged.passUnretained(self).toOpaque()),
            &eventHandlerRef
        )

        if status != noErr {
            logger.error("Failed to install the Carbon hotkey handler. status=\(status)")
        } else {
            logger.info("Installed the Carbon hotkey handler.")
        }
    }

    fileprivate static let hotKeySignature: OSType = 0x514E4F54
}

private let hotKeyLogger = Logger(subsystem: "com.quicknote.app", category: "HotKey")

private func quickNoteHotKeyHandler(
    _ nextHandler: EventHandlerCallRef?,
    _ event: EventRef?,
    _ userData: UnsafeMutableRawPointer?
) -> OSStatus {
    guard
        let event,
        let userData
    else {
        return OSStatus(eventNotHandledErr)
    }

    let manager = Unmanaged<GlobalHotKeyManager>
        .fromOpaque(userData)
        .takeUnretainedValue()

    var hotKeyID = EventHotKeyID()
    let result = GetEventParameter(
        event,
        EventParamName(kEventParamDirectObject),
        EventParamType(typeEventHotKeyID),
        nil,
        MemoryLayout<EventHotKeyID>.size,
        nil,
        &hotKeyID
    )

    guard
        result == noErr,
        hotKeyID.signature == GlobalHotKeyManager.hotKeySignature,
        hotKeyID.id == 1
    else {
        return OSStatus(eventNotHandledErr)
    }

    DispatchQueue.main.async {
        hotKeyLogger.info("Received the global shortcut event.")
        manager.onHotKeyPressed?()
    }

    return noErr
}

private struct HotKeyRegistration {
    let keyCode: UInt32
    let modifiers: UInt32
}

private enum GlobalHotKeyError: LocalizedError {
    case invalidShortcut(String)
    case registrationFailed(OSStatus)

    var errorDescription: String? {
        switch self {
        case let .invalidShortcut(shortcut):
            return "Unsupported global shortcut: \(shortcut)"
        case let .registrationFailed(status):
            return "macOS could not register the global shortcut (status \(status))."
        }
    }
}

private enum HotKeyParser {
    private static let modifierMap: [String: UInt32] = [
        "cmd": UInt32(cmdKey),
        "command": UInt32(cmdKey),
        "⌘": UInt32(cmdKey),
        "shift": UInt32(shiftKey),
        "⇧": UInt32(shiftKey),
        "option": UInt32(optionKey),
        "alt": UInt32(optionKey),
        "⌥": UInt32(optionKey),
        "ctrl": UInt32(controlKey),
        "control": UInt32(controlKey),
        "⌃": UInt32(controlKey),
    ]

    private static let keyMap: [String: UInt32] = [
        "a": 0x00, "s": 0x01, "d": 0x02, "f": 0x03, "h": 0x04, "g": 0x05,
        "z": 0x06, "x": 0x07, "c": 0x08, "v": 0x09, "b": 0x0B, "q": 0x0C,
        "w": 0x0D, "e": 0x0E, "r": 0x0F, "y": 0x10, "t": 0x11, "1": 0x12,
        "2": 0x13, "3": 0x14, "4": 0x15, "6": 0x16, "5": 0x17, "=": 0x18,
        "equal": 0x18, "plus": 0x18, "9": 0x19, "7": 0x1A, "-": 0x1B,
        "minus": 0x1B, "8": 0x1C, "0": 0x1D, "]": 0x1E, "rightbracket": 0x1E,
        "o": 0x1F, "u": 0x20, "[": 0x21, "leftbracket": 0x21, "i": 0x22,
        "p": 0x23, "l": 0x25, "j": 0x26, "'": 0x27, "quote": 0x27, "k": 0x28,
        ";": 0x29, "semicolon": 0x29, "\\": 0x2A, "backslash": 0x2A,
        ",": 0x2B, "comma": 0x2B, "/": 0x2C, "slash": 0x2C, "n": 0x2D,
        "m": 0x2E, ".": 0x2F, "period": 0x2F, "`": 0x32, "grave": 0x32,
        "space": 0x31, "return": 0x24, "enter": 0x24, "tab": 0x30,
        "delete": 0x33, "backspace": 0x33, "escape": 0x35, "esc": 0x35,
        "up": 0x7E, "down": 0x7D, "left": 0x7B, "right": 0x7C,
    ]

    static func parse(_ shortcut: String) throws -> HotKeyRegistration {
        let tokens = shortcut
            .split(separator: "+")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        guard !tokens.isEmpty else {
            throw GlobalHotKeyError.invalidShortcut(shortcut)
        }

        var modifiers: UInt32 = 0
        var keyCode: UInt32?

        for token in tokens {
            let lowercased = token.lowercased()

            if let modifier = modifierMap[lowercased] {
                modifiers |= modifier
                continue
            }

            guard keyCode == nil, let mappedKey = keyMap[lowercased] else {
                throw GlobalHotKeyError.invalidShortcut(shortcut)
            }

            keyCode = mappedKey
        }

        guard let keyCode, modifiers != 0 else {
            throw GlobalHotKeyError.invalidShortcut(shortcut)
        }

        return HotKeyRegistration(keyCode: keyCode, modifiers: modifiers)
    }
}
