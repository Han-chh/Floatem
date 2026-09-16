import Darwin
import Foundation
import OSLog

/// Persists enough host-process state to distinguish a graceful Floatem exit
/// from a session that disappeared without reaching `applicationWillTerminate`.
///
/// This is intentionally diagnostic infrastructure, not a watchdog: a process
/// that macOS has already terminated cannot write a final record or relaunch
/// itself. The next Floatem launch can, however, identify an older session
/// whose PID no longer exists and had no graceful-exit record.
@MainActor
final class LifecycleDiagnostics {
    enum EventKind: String, Codable {
        case launch
        case willSleep
        case didWake
        case recoveredAfterWake
        case gracefulTermination
        case previousSessionEndedUnexpectedly
    }

    struct Event: Codable, Equatable {
        let schemaVersion: Int
        let timestamp: Date
        let kind: EventKind
        let sessionID: String
        let processID: Int32
        let appVersion: String
        let appBuild: String
        let executablePath: String
        let exitReason: String?
        let relatedSessionID: String?
    }

    struct Session: Codable, Equatable {
        let schemaVersion: Int
        let sessionID: String
        let processID: Int32
        let appVersion: String
        let appBuild: String
        let executablePath: String
        let startedAt: Date
        var lastHeartbeatAt: Date
        var lastEventAt: Date
        var lastEvent: EventKind
        var sleptAt: Date?
        var wokeAt: Date?
        var gracefulTerminationAt: Date?
        var exitReason: String?
        var unexpectedTerminationInferredAt: Date?
        var inferredExitReason: String?

        var hadGracefulTermination: Bool {
            gracefulTerminationAt != nil
        }
    }

    private static let sessionDirectoryName = "lifecycle-sessions"
    private static let eventLogFilename = "lifecycle-events.jsonl"
    private static let schemaVersion = 1
    private static let heartbeatInterval: TimeInterval = 30

    private let directoryURL: URL
    private let sessionsDirectoryURL: URL
    private let eventsURL: URL
    private let fileManager: FileManager
    private let processID: Int32
    private let now: () -> Date
    private let processIsRunning: (Int32) -> Bool
    private let appVersion: String
    private let appBuild: String
    private let executablePath: String
    private let logger = Logger(subsystem: "com.floatem.app", category: "Lifecycle")
    private var session: Session?
    private var heartbeatTimer: Timer?

    convenience init?() {
        let fileManager = FileManager.default
        let fallbackDirectory = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask)
            .first?
            .appendingPathComponent(Bundle.main.bundleIdentifier ?? "com.hankch.floatem", isDirectory: true)
        guard let directoryURL = FloatemSharedContainer.sharedDataURL(fileManager: fileManager) ?? fallbackDirectory else {
            return nil
        }
        self.init(directoryURL: directoryURL, fileManager: fileManager)
    }

    init(
        directoryURL: URL,
        fileManager: FileManager = .default,
        processID: Int32 = ProcessInfo.processInfo.processIdentifier,
        now: @escaping () -> Date = Date.init,
        processIsRunning: @escaping (Int32) -> Bool = LifecycleDiagnostics.defaultProcessIsRunning,
        appVersion: String = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "unknown",
        appBuild: String = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "unknown",
        executablePath: String = Bundle.main.executableURL?.path ?? ProcessInfo.processInfo.arguments.first ?? "unknown"
    ) {
        self.directoryURL = directoryURL
        sessionsDirectoryURL = directoryURL.appendingPathComponent(Self.sessionDirectoryName, isDirectory: true)
        eventsURL = directoryURL.appendingPathComponent(Self.eventLogFilename)
        self.fileManager = fileManager
        self.processID = processID
        self.now = now
        self.processIsRunning = processIsRunning
        self.appVersion = appVersion
        self.appBuild = appBuild
        self.executablePath = executablePath
    }

    func start() {
        let timestamp = now()
        let newSession = Session(
            schemaVersion: Self.schemaVersion,
            sessionID: UUID().uuidString,
            processID: processID,
            appVersion: appVersion,
            appBuild: appBuild,
            executablePath: executablePath,
            startedAt: timestamp,
            lastHeartbeatAt: timestamp,
            lastEventAt: timestamp,
            lastEvent: .launch,
            sleptAt: nil,
            wokeAt: nil,
            gracefulTerminationAt: nil,
            exitReason: nil,
            unexpectedTerminationInferredAt: nil,
            inferredExitReason: nil
        )
        session = newSession
        inferUnexpectedTerminationsFromPreviousSessions()
        persist(newSession)
        appendEvent(kind: .launch, timestamp: timestamp)
        startHeartbeat()
        logger.notice("Lifecycle session started. pid=\(self.processID, privacy: .public) session=\(newSession.sessionID, privacy: .public)")
    }

    func recordWillSleep() {
        recordLifecycleEvent(.willSleep)
    }

    func recordDidWake() {
        recordLifecycleEvent(.didWake)
    }

    func recordRecoveredAfterWake() {
        recordLifecycleEvent(.recoveredAfterWake)
    }

    func recordGracefulTermination(reason: String) {
        heartbeatTimer?.invalidate()
        heartbeatTimer = nil
        recordLifecycleEvent(.gracefulTermination, exitReason: reason)
    }

    func currentSession() -> Session? {
        session
    }

    func sessionRecords() -> [Session] {
        guard let sessionURLs = try? fileManager.contentsOfDirectory(
            at: sessionsDirectoryURL,
            includingPropertiesForKeys: nil,
            options: [.skipsHiddenFiles]
        ) else {
            return []
        }
        return sessionURLs.compactMap { url in
            guard url.pathExtension == "json",
                  let data = try? Data(contentsOf: url) else {
                return nil
            }
            return try? Self.decoder.decode(Session.self, from: data)
        }
    }

    func eventRecords() -> [Event] {
        guard let data = try? Data(contentsOf: eventsURL),
              let contents = String(data: data, encoding: .utf8) else {
            return []
        }
        return contents
            .split(whereSeparator: \.isNewline)
            .compactMap { try? Self.decoder.decode(Event.self, from: Data($0.utf8)) }
    }

    private func startHeartbeat() {
        heartbeatTimer?.invalidate()
        let timer = Timer(timeInterval: Self.heartbeatInterval, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.recordHeartbeat()
            }
        }
        heartbeatTimer = timer
        RunLoop.main.add(timer, forMode: .common)
    }

    private func recordHeartbeat() {
        guard var session else {
            return
        }
        let timestamp = now()
        session.lastHeartbeatAt = timestamp
        self.session = session
        persist(session)
    }

    private func recordLifecycleEvent(_ kind: EventKind, exitReason: String? = nil) {
        guard var session else {
            return
        }
        let timestamp = now()
        session.lastHeartbeatAt = timestamp
        session.lastEventAt = timestamp
        session.lastEvent = kind
        switch kind {
        case .willSleep:
            session.sleptAt = timestamp
        case .didWake:
            session.wokeAt = timestamp
        case .recoveredAfterWake:
            break
        case .gracefulTermination:
            session.gracefulTerminationAt = timestamp
            session.exitReason = exitReason
        case .launch, .previousSessionEndedUnexpectedly:
            break
        }
        self.session = session
        persist(session)
        appendEvent(kind: kind, timestamp: timestamp, exitReason: exitReason)
        logger.notice("Lifecycle event=\(kind.rawValue, privacy: .public) pid=\(self.processID, privacy: .public)")
    }

    private func inferUnexpectedTerminationsFromPreviousSessions() {
        for var previous in sessionRecords() where !previous.hadGracefulTermination && previous.unexpectedTerminationInferredAt == nil {
            guard !processIsRunning(previous.processID) else {
                continue
            }
            let timestamp = now()
            previous.unexpectedTerminationInferredAt = timestamp
            previous.inferredExitReason = "No graceful termination record; the recorded PID was absent when a later Floatem session began."
            persist(previous)
            appendEvent(
                kind: .previousSessionEndedUnexpectedly,
                timestamp: timestamp,
                exitReason: previous.inferredExitReason,
                relatedSessionID: previous.sessionID
            )
            logger.error("Previous Floatem session ended without a graceful termination record. pid=\(previous.processID, privacy: .public) session=\(previous.sessionID, privacy: .public)")
        }
    }

    private func persist(_ session: Session) {
        do {
            try fileManager.createDirectory(at: sessionsDirectoryURL, withIntermediateDirectories: true)
            let data = try Self.encoder.encode(session)
            try data.write(to: sessionURL(for: session.sessionID), options: [.atomic])
        } catch {
            logger.error("Unable to persist lifecycle session: \(error.localizedDescription, privacy: .public)")
        }
    }

    private func appendEvent(
        kind: EventKind,
        timestamp: Date,
        exitReason: String? = nil,
        relatedSessionID: String? = nil
    ) {
        guard let session else {
            return
        }
        let event = Event(
            schemaVersion: Self.schemaVersion,
            timestamp: timestamp,
            kind: kind,
            sessionID: session.sessionID,
            processID: processID,
            appVersion: appVersion,
            appBuild: appBuild,
            executablePath: executablePath,
            exitReason: exitReason,
            relatedSessionID: relatedSessionID
        )
        do {
            try fileManager.createDirectory(at: directoryURL, withIntermediateDirectories: true)
            let line = try Self.encoder.encode(event) + Data([0x0A])
            let descriptor = open(eventsURL.path, O_WRONLY | O_APPEND | O_CREAT, S_IRUSR | S_IWUSR)
            guard descriptor >= 0 else {
                throw POSIXError(.init(rawValue: errno) ?? .EIO)
            }
            defer { close(descriptor) }
            try line.withUnsafeBytes { rawBuffer in
                guard let baseAddress = rawBuffer.baseAddress else { return }
                var bytesWritten = 0
                while bytesWritten < rawBuffer.count {
                    let result = write(descriptor, baseAddress.advanced(by: bytesWritten), rawBuffer.count - bytesWritten)
                    guard result > 0 else {
                        throw POSIXError(.init(rawValue: errno) ?? .EIO)
                    }
                    bytesWritten += result
                }
            }
            _ = fsync(descriptor)
        } catch {
            logger.error("Unable to append lifecycle event: \(error.localizedDescription, privacy: .public)")
        }
    }

    private func sessionURL(for sessionID: String) -> URL {
        sessionsDirectoryURL.appendingPathComponent("\(sessionID).json")
    }

    nonisolated private static func defaultProcessIsRunning(_ processID: Int32) -> Bool {
        guard processID > 0 else {
            return false
        }
        if kill(processID, 0) == 0 {
            return true
        }
        return errno == EPERM
    }

    private static let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()

    private static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()
}
