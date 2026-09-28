import Foundation
import OSLog
import ServiceManagement

@MainActor
final class HotKeyAgentManager {
    static let usesBackgroundAgent: Bool = {
        #if FLOATEM_DEBUG_ISOLATED
        false
        #else
        true
        #endif
    }()

    struct RegistrationState {
        let shortcut: String
        let registration: String
        let message: String?
    }

    struct BackgroundActivityStatus {
        let status: String
        let activationEpoch: Int

        var isEnabled: Bool {
            status == "enabled"
        }
    }

    var onRegistrationStateChanged: ((RegistrationState) -> Void)?
    var onAgentHotKeyPressed: ((String) -> Bool)?
    var onAgentHotKeyShowRequested: ((String) -> Bool)?
    var onAgentWindowVisibilityRestore: ((Bool) -> Bool)?
    var currentMainWindowVisibility: (() -> Bool)?
    var onAgentWakeRecovery: (() -> Bool)?

    private let service = SMAppService.agent(plistName: FloatemAgentXPC.launchAgentPlistName)
    private let localHotKeyManager = GlobalHotKeyManager()
    private let logger = Logger(subsystem: "com.floatem.app", category: "HotKeyAgent")
    private var agentConnection: NSXPCConnection?
    private var pendingHandshakeID: UUID?
    private var hasAttemptedRegistrationRepair = false
    private lazy var hostControlCallback = AgentHostControlCallback { [weak self] shortcut in
        guard let handler = self?.onAgentHotKeyPressed else {
            return false
        }
        handler(shortcut)
        return true
    } onShow: { [weak self] shortcut in
        guard let handler = self?.onAgentHotKeyShowRequested else {
            return false
        }
        handler(shortcut)
        return true
    } onSetMainWindowVisible: { [weak self] visible in
        self?.onAgentWindowVisibilityRestore?(visible) ?? false
    } onCurrentMainWindowVisibility: { [weak self] in
        self?.currentMainWindowVisibility?() ?? false
    } onWakeRecovery: { [weak self] in
        self?.onAgentWakeRecovery?() ?? false
    }

    private(set) var registrationState = RegistrationState(
        shortcut: GlobalHotKeyManager.defaultShortcut,
        registration: "starting",
        message: nil
    ) {
        didSet {
            onRegistrationStateChanged?(registrationState)
        }
    }

    var registeredShortcut: String? {
        registrationState.registration == "registered" ? registrationState.shortcut : nil
    }

    init() {
        #if FLOATEM_DEBUG_ISOLATED
        localHotKeyManager.onHotKeyPressed = { [weak self] in
            guard let self else {
                return
            }
            _ = self.onAgentHotKeyPressed?(self.registrationState.shortcut)
        }
        localHotKeyManager.onRegistrationStateChanged = { [weak self] state in
            self?.publish(
                shortcut: state.shortcut,
                registration: state.registration,
                message: state.message
            )
        }
        #endif
    }

    /// Debug builds used to register their own ServiceManagement Agent. Remove
    /// that legacy registration once so a deleted Debug app cannot be launched
    /// by its stale Agent later.
    func prepareForDevelopmentSession() {
        #if FLOATEM_DEBUG_ISOLATED
        switch service.status {
        case .notRegistered, .notFound:
            return
        case .enabled, .requiresApproval:
            do {
                try service.unregister()
                logger.notice("Removed the legacy Debug hotkey Agent registration.")
            } catch {
                logger.error("Unable to remove the legacy Debug hotkey Agent. error=\(error.localizedDescription, privacy: .public)")
            }
        @unknown default:
            do {
                try service.unregister()
            } catch {
                logger.error("Unable to remove the legacy Debug hotkey Agent. error=\(error.localizedDescription, privacy: .public)")
            }
        }
        #endif
    }

    func configureOnLaunch(shortcut: String) {
        do {
            try configure(shortcut: shortcut)
        } catch {
            publish(shortcut: shortcut, registration: "invalid", message: error.localizedDescription)
        }
    }

    func configure(shortcut rawShortcut: String) throws {
        #if FLOATEM_DEBUG_ISOLATED
        let shortcut = try GlobalHotKeyManager.validShortcut(
            from: GlobalHotKeyManager.shortcutForCurrentBuild(rawShortcut)
        )
        try localHotKeyManager.register(shortcut: shortcut)
        return
        #else
        let shortcut = try GlobalHotKeyManager.validShortcut(
            from: GlobalHotKeyManager.shortcutForCurrentBuild(rawShortcut)
        )
        pendingHandshakeID = nil
        hasAttemptedRegistrationRepair = false
        guard try ensureAgentRegistered(shortcut: shortcut) else {
            return
        }
        syncShortcut(shortcut, attempt: 0)
        #endif
    }

    func reconnectAfterSystemWake(shortcut: String) {
        configureOnLaunch(shortcut: shortcut)
    }

    func unregisterForUninstall(completion: @escaping (Error?) -> Void) {
        localHotKeyManager.unregister()
        pendingHandshakeID = nil
        agentConnection?.invalidate()
        agentConnection = nil

        #if FLOATEM_DEBUG_ISOLATED
        completion(nil)
        #else
        switch service.status {
        case .notRegistered, .notFound:
            completion(nil)
        case .enabled, .requiresApproval:
            service.unregister { error in
                DispatchQueue.main.async {
                    completion(error)
                }
            }
        @unknown default:
            service.unregister { error in
                DispatchQueue.main.async {
                    completion(error)
                }
            }
        }
        #endif
    }

    func backgroundActivityStatus() -> BackgroundActivityStatus {
        #if FLOATEM_DEBUG_ISOLATED
        return BackgroundActivityStatus(
            status: "developmentLocal",
            activationEpoch: FloatemBackgroundActivityState.activationEpoch
        )
        #else
        switch service.status {
        case .enabled:
            return BackgroundActivityStatus(status: "enabled", activationEpoch: FloatemBackgroundActivityState.activationEpoch)
        case .requiresApproval:
            return BackgroundActivityStatus(status: "requiresApproval", activationEpoch: FloatemBackgroundActivityState.activationEpoch)
        case .notRegistered:
            return BackgroundActivityStatus(status: "notRegistered", activationEpoch: FloatemBackgroundActivityState.activationEpoch)
        case .notFound:
            return BackgroundActivityStatus(status: "notFound", activationEpoch: FloatemBackgroundActivityState.activationEpoch)
        @unknown default:
            return BackgroundActivityStatus(status: "unknown", activationEpoch: FloatemBackgroundActivityState.activationEpoch)
        }
        #endif
    }

    private func ensureAgentRegistered(shortcut: String) throws -> Bool {
        switch service.status {
        case .enabled:
            return true
        case .notRegistered, .notFound:
            try service.register()
            logger.notice("Registered ServiceManagement hotkey agent.")
            guard service.status == .enabled else {
                publish(
                    shortcut: shortcut,
                    registration: "approvalRequired",
                    message: "Allow Floatem's background item in System Settings to enable the global shortcut."
                )
                return false
            }
            return true
        case .requiresApproval:
            publish(
                shortcut: shortcut,
                registration: "approvalRequired",
                message: "Allow Floatem's background item in System Settings to enable the global shortcut."
            )
            return false
        @unknown default:
            try service.register()
            return service.status == .enabled
        }
    }

    private func syncShortcut(_ shortcut: String, attempt: Int) {
        let connection = agentConnection ?? makeAgentConnection()
        let handshakeID = UUID()
        pendingHandshakeID = handshakeID
        scheduleHandshakeTimeout(
            handshakeID: handshakeID,
            connection: connection,
            shortcut: shortcut
        )

        let proxy = connection.remoteObjectProxyWithErrorHandler { [weak self] error in
            Task { @MainActor [weak self] in
                guard let self, self.finishHandshake(handshakeID, connection: connection) else {
                    return
                }
                self.agentConnection = nil
                self.handleAgentConnectionFailure(shortcut: shortcut, attempt: attempt, error: error)
            }
        } as? FloatemHotKeyAgentProtocol

        guard let proxy else {
            guard finishHandshake(handshakeID, connection: connection) else {
                return
            }
            agentConnection = nil
            connection.invalidate()
            handleAgentConnectionFailure(
                shortcut: shortcut,
                attempt: attempt,
                error: NSError(
                    domain: "com.hankch.floatem.hotkey-agent",
                    code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Floatem could not create the Agent XPC proxy."]
                )
            )
            return
        }

        let expectedAppPath = Bundle.main.bundleURL.standardizedFileURL.resolvingSymlinksInPath().path
        proxy.validateHostApplication(atPath: expectedAppPath) { [weak self, weak connection] isValid, detail in
            Task { @MainActor [weak self] in
                guard let self, let connection, self.agentConnection === connection,
                      self.pendingHandshakeID == handshakeID else {
                    return
                }
                guard isValid else {
                    self.pendingHandshakeID = nil
                    self.repairAgentRegistration(shortcut: shortcut, reason: detail)
                    return
                }
                self.configureShortcut(
                    shortcut,
                    using: proxy,
                    handshakeID: handshakeID,
                    connection: connection
                )
            }
        }
    }

    private func configureShortcut(
        _ shortcut: String,
        using proxy: FloatemHotKeyAgentProtocol,
        handshakeID: UUID,
        connection: NSXPCConnection
    ) {
        proxy.configureHotKey(shortcut) { [weak self] registration, message in
            Task { @MainActor [weak self] in
                guard let self, self.finishHandshake(handshakeID, connection: connection) else {
                    return
                }
                if registration == "hostMissing" {
                    self.repairAgentRegistration(shortcut: shortcut, reason: message)
                    return
                }
                self.publish(shortcut: shortcut, registration: registration, message: message)
            }
        }
    }

    private func scheduleHandshakeTimeout(
        handshakeID: UUID,
        connection: NSXPCConnection,
        shortcut: String
    ) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self, weak connection] in
            guard let self, let connection,
                  self.finishHandshake(handshakeID, connection: connection) else {
                return
            }

            self.agentConnection = nil
            connection.invalidate()
            self.repairAgentRegistration(
                shortcut: shortcut,
                reason: "The registered shortcut Agent did not respond within 3 seconds. Its application may have been moved or deleted."
            )
        }
    }

    private func finishHandshake(_ handshakeID: UUID, connection: NSXPCConnection) -> Bool {
        guard pendingHandshakeID == handshakeID, agentConnection === connection else {
            return false
        }
        pendingHandshakeID = nil
        return true
    }

    private func makeAgentConnection() -> NSXPCConnection {
        let connection = NSXPCConnection(machServiceName: FloatemAgentXPC.agentServiceName, options: [])
        connection.remoteObjectInterface = NSXPCInterface(with: FloatemHotKeyAgentProtocol.self)
        connection.exportedInterface = NSXPCInterface(with: FloatemHostControlProtocol.self)
        connection.exportedObject = hostControlCallback
        connection.invalidationHandler = { [weak self, weak connection] in
            Task { @MainActor [weak self, weak connection] in
                guard let self, let connection, self.agentConnection === connection else {
                    return
                }
                self.logger.debug("Hotkey Agent XPC connection invalidated.")
                self.agentConnection = nil
            }
        }
        connection.resume()
        agentConnection = connection
        return connection
    }

    private func handleAgentConnectionFailure(shortcut: String, attempt: Int, error: Error) {
        guard attempt < 3 else {
            repairAgentRegistration(shortcut: shortcut, reason: error.localizedDescription)
            return
        }

        let delay = pow(2, Double(attempt)) * 0.4
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            self?.syncShortcut(shortcut, attempt: attempt + 1)
        }
    }

    private func repairAgentRegistration(shortcut: String, reason: String?) {
        pendingHandshakeID = nil
        guard !hasAttemptedRegistrationRepair else {
            publish(
                shortcut: shortcut,
                registration: "agentUnavailable",
                message: "Floatem's background shortcut agent could not be repaired: \(reason ?? "unknown error")"
            )
            logger.error("Unable to configure hotkey Agent after re-registration. reason=\(reason ?? "unknown", privacy: .public)")
            return
        }

        hasAttemptedRegistrationRepair = true
        publish(shortcut: shortcut, registration: "repairing", message: reason)
        agentConnection?.invalidate()
        agentConnection = nil
        logger.notice("Repairing the registered hotkey Agent. reason=\(reason ?? "unknown", privacy: .public)")

        switch service.status {
        case .notRegistered, .notFound:
            registerRepairedAgent(shortcut: shortcut)
        case .enabled, .requiresApproval:
            service.unregister { [weak self] error in
                Task { @MainActor [weak self] in
                    guard let self else {
                        return
                    }
                    if let error {
                        self.publish(
                            shortcut: shortcut,
                            registration: "agentUnavailable",
                            message: "Floatem could not remove the stale shortcut Agent: \(error.localizedDescription)"
                        )
                        return
                    }
                    self.registerRepairedAgent(shortcut: shortcut)
                }
            }
        @unknown default:
            registerRepairedAgent(shortcut: shortcut)
        }
    }

    private func registerRepairedAgent(shortcut: String) {
        do {
            try service.register()
            guard service.status == .enabled else {
                publish(
                    shortcut: shortcut,
                    registration: "approvalRequired",
                    message: "Allow Floatem's background item in System Settings to enable the global shortcut."
                )
                return
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { [weak self] in
                self?.syncShortcut(shortcut, attempt: 0)
            }
        } catch {
            publish(
                shortcut: shortcut,
                registration: "agentUnavailable",
                message: "Floatem could not register its background shortcut Agent: \(error.localizedDescription)"
            )
        }
    }

    private func publish(shortcut: String, registration: String, message: String?) {
        registrationState = RegistrationState(shortcut: shortcut, registration: registration, message: message)
    }
}

private final class AgentHostControlCallback: NSObject, FloatemHostControlProtocol {
    private let onToggle: @MainActor (String) -> Bool
    private let onShow: @MainActor (String) -> Bool
    private let onSetMainWindowVisible: @MainActor (Bool) -> Bool
    private let onCurrentMainWindowVisibility: @MainActor () -> Bool
    private let onWakeRecovery: @MainActor () -> Bool

    init(
        onToggle: @escaping @MainActor (String) -> Bool,
        onShow: @escaping @MainActor (String) -> Bool,
        onSetMainWindowVisible: @escaping @MainActor (Bool) -> Bool,
        onCurrentMainWindowVisibility: @escaping @MainActor () -> Bool,
        onWakeRecovery: @escaping @MainActor () -> Bool
    ) {
        self.onToggle = onToggle
        self.onShow = onShow
        self.onSetMainWindowVisible = onSetMainWindowVisible
        self.onCurrentMainWindowVisibility = onCurrentMainWindowVisibility
        self.onWakeRecovery = onWakeRecovery
    }

    func toggleMainWindow(shortcut: String, withReply reply: @escaping (Bool) -> Void) {
        Task { @MainActor in
            reply(onToggle(shortcut))
        }
    }

    func showMainWindow(shortcut: String, withReply reply: @escaping (Bool) -> Void) {
        Task { @MainActor in
            reply(onShow(shortcut))
        }
    }

    func setMainWindowVisible(_ visible: Bool, withReply reply: @escaping (Bool) -> Void) {
        Task { @MainActor in
            reply(onSetMainWindowVisible(visible))
        }
    }

    func currentMainWindowVisibility(withReply reply: @escaping (Bool) -> Void) {
        Task { @MainActor in
            reply(onCurrentMainWindowVisibility())
        }
    }

    func recordWakeRecovery(withReply reply: @escaping (Bool) -> Void) {
        Task { @MainActor in
            reply(onWakeRecovery())
        }
    }
}
