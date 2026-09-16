import Foundation
import OSLog
import ServiceManagement

@MainActor
final class HotKeyAgentManager {
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
    private let logger = Logger(subsystem: "com.floatem.app", category: "HotKeyAgent")
    private var agentConnection: NSXPCConnection?
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

    func configureOnLaunch(shortcut: String) {
        do {
            try configure(shortcut: shortcut)
        } catch {
            publish(shortcut: shortcut, registration: "invalid", message: error.localizedDescription)
        }
    }

    func configure(shortcut rawShortcut: String) throws {
        let shortcut = try GlobalHotKeyManager.validShortcut(
            from: GlobalHotKeyManager.shortcutForCurrentBuild(rawShortcut)
        )
        guard try ensureAgentRegistered(shortcut: shortcut) else {
            return
        }
        syncShortcut(shortcut, attempt: 0)
    }

    func reconnectAfterSystemWake(shortcut: String) {
        configureOnLaunch(shortcut: shortcut)
    }

    func backgroundActivityStatus() -> BackgroundActivityStatus {
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

        let proxy = connection.remoteObjectProxyWithErrorHandler { [weak self] error in
            Task { @MainActor [weak self] in
                if self?.agentConnection === connection {
                    self?.agentConnection = nil
                }
                self?.handleAgentConnectionFailure(shortcut: shortcut, attempt: attempt, error: error)
            }
        } as? FloatemHotKeyAgentProtocol

        proxy?.configureHotKey(shortcut) { [weak self] registration, message in
            Task { @MainActor [weak self] in
                self?.publish(shortcut: shortcut, registration: registration, message: message)
            }
        }
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
            publish(
                shortcut: shortcut,
                registration: "agentUnavailable",
                message: "Floatem's background shortcut agent is unavailable: \(error.localizedDescription)"
            )
            logger.error("Unable to configure hotkey agent after retries. error=\(error.localizedDescription, privacy: .public)")
            return
        }

        let delay = pow(2, Double(attempt)) * 0.4
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            self?.syncShortcut(shortcut, attempt: attempt + 1)
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
