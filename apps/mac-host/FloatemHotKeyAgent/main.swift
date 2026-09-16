import AppKit
import Darwin
import Foundation
import OSLog

private final class FloatemHotKeyAgent: NSObject, NSXPCListenerDelegate, FloatemHotKeyAgentProtocol {
    private let listener: NSXPCListener
    private let hotKeyManager = GlobalHotKeyManager()
    private let logger = Logger(subsystem: "com.floatem.app", category: "HotKeyAgent")
    private let hostConnectionsQueue = DispatchQueue(label: "com.hankch.floatem.hotkey-agent.host-connections")
    private var shortcut = GlobalHotKeyManager.defaultShortcut
    private var hostConnections: [NSXPCConnection] = []
    private var systemWillSleepObserver: NSObjectProtocol?
    private var systemDidWakeObserver: NSObjectProtocol?
    private var wakeRecoveryScheduled = false
    private var hostWasRunningBeforeSleep = false
    private var mainWindowWasVisibleBeforeSleep = false
    private var pendingWakeRecoveryHostNotification = false
    private var pendingWakeRecoveryWindowVisibility: Bool?
    private var pendingHotKeyShowAfterHostLaunch: String?

    override init() {
        listener = NSXPCListener(machServiceName: FloatemAgentXPC.agentServiceName)
        super.init()
        listener.delegate = self
        hotKeyManager.onHotKeyPressed = { [weak self] in
            self?.handleHotKeyPressed()
        }
    }

    func start() {
        listener.resume()
        installSystemWakeObserver()
        configureHotKey(shortcut) { [weak self] registration, message in
            self?.logger.notice("Started Agent shortcut registration=\(registration, privacy: .public) message=\(message ?? "none", privacy: .public)")
        }
        logger.notice("Floatem HotKey Agent started. pid=\(ProcessInfo.processInfo.processIdentifier, privacy: .public)")

        // Do not touch App Group preferences from the background Agent. On
        // macOS 26 this can contend with AppKit's input-source initialization
        // and prevent the global-hotkey event loop from ever starting. The
        // activation counter is diagnostic-only, so skipping it is safer than
        // making shortcut delivery depend on cfprefsd availability.
    }

    deinit {
        if let systemWillSleepObserver {
            NSWorkspace.shared.notificationCenter.removeObserver(systemWillSleepObserver)
        }
        if let systemDidWakeObserver {
            NSWorkspace.shared.notificationCenter.removeObserver(systemDidWakeObserver)
        }
    }

    func listener(_ listener: NSXPCListener, shouldAcceptNewConnection newConnection: NSXPCConnection) -> Bool {
        newConnection.exportedInterface = NSXPCInterface(with: FloatemHotKeyAgentProtocol.self)
        newConnection.exportedObject = self
        newConnection.remoteObjectInterface = NSXPCInterface(with: FloatemHostControlProtocol.self)
        newConnection.invalidationHandler = { [weak self, weak newConnection] in
            guard let self, let newConnection else {
                return
            }
            self.hostConnectionsQueue.async {
                self.hostConnections.removeAll { $0 === newConnection }
            }
        }
        hostConnectionsQueue.sync {
            hostConnections.append(newConnection)
        }
        newConnection.resume()
        DispatchQueue.main.async { [weak self, weak newConnection] in
            guard let self, let newConnection else {
                return
            }
            self.notifyHostOfPendingHotKeyShow(using: newConnection)
            self.notifyHostOfPendingWakeRecovery(using: newConnection)
        }
        return true
    }

    func configureHotKey(_ rawShortcut: String, withReply reply: @escaping (String, String?) -> Void) {
        DispatchQueue.main.async { [weak self] in
            guard let self else {
                reply("agentUnavailable", "Floatem's background shortcut agent is shutting down.")
                return
            }

            let candidate = GlobalHotKeyManager.normalize(shortcut: rawShortcut)
            do {
                try self.hotKeyManager.register(shortcut: candidate)
                self.shortcut = candidate
                reply("registered", nil)
            } catch {
                reply("conflict", error.localizedDescription)
            }
        }
    }

    func currentHotKeyStatus(withReply reply: @escaping (String, String, String?) -> Void) {
        DispatchQueue.main.async { [weak self] in
            guard let self else {
                reply(GlobalHotKeyManager.defaultShortcut, "agentUnavailable", "Floatem's background shortcut agent is shutting down.")
                return
            }
            let state = self.hotKeyManager.registrationState
            reply(state.shortcut, state.registration, state.message)
        }
    }

    func triggerHostLaunchForDiagnostics(withReply reply: @escaping (Bool, String?) -> Void) {
        DispatchQueue.main.async { [weak self] in
            self?.handleHotKeyPressed(completion: reply) ?? reply(false, "Agent deallocated before recovery request.")
        }
    }

    func triggerWakeRecoveryForDiagnostics(withReply reply: @escaping (Bool, String?) -> Void) {
        DispatchQueue.main.async { [weak self] in
            self?.recoverHostAfterSystemWake(completion: reply) ?? reply(false, "Agent deallocated before wake recovery request.")
        }
    }

    private func installSystemWakeObserver() {
        systemWillSleepObserver = NSWorkspace.shared.notificationCenter.addObserver(
            forName: NSWorkspace.willSleepNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.captureHostPresentationBeforeSleep()
        }
        systemDidWakeObserver = NSWorkspace.shared.notificationCenter.addObserver(
            forName: NSWorkspace.didWakeNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.scheduleWakeRecovery()
        }
    }

    private func captureHostPresentationBeforeSleep() {
        let connection = hostConnectionsQueue.sync { hostConnections.last }
        guard let connection else {
            hostWasRunningBeforeSleep = false
            mainWindowWasVisibleBeforeSleep = false
            logger.notice("Floatem host was not connected before sleep; it will not be relaunched after wake.")
            return
        }

        hostWasRunningBeforeSleep = true
        let proxy = connection.remoteObjectProxyWithErrorHandler { [weak self] _ in
            DispatchQueue.main.async {
                self?.mainWindowWasVisibleBeforeSleep = false
            }
        } as? FloatemHostControlProtocol
        proxy?.currentMainWindowVisibility { [weak self] visible in
            DispatchQueue.main.async {
                self?.mainWindowWasVisibleBeforeSleep = visible
                self?.logger.notice("Captured Floatem presentation before sleep. visible=\(visible, privacy: .public)")
            }
        }
    }

    private func scheduleWakeRecovery() {
        guard !wakeRecoveryScheduled else {
            return
        }
        wakeRecoveryScheduled = true
        logger.notice("System did wake; checking whether the Floatem host needs recovery.")
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            guard let self else {
                return
            }
            self.wakeRecoveryScheduled = false
            self.recoverHostAfterSystemWake()
        }
    }

    private func handleHotKeyPressed(completion: ((Bool, String?) -> Void)? = nil) {
        requestRunningHostToggle { [weak self] succeeded in
            guard let self else {
                completion?(false, "Agent deallocated before host control request.")
                return
            }
            guard !succeeded else {
                completion?(true, nil)
                return
            }
            self.launchHostAndShow(completion: completion)
        }
    }

    private func requestRunningHostToggle(completion: @escaping (Bool) -> Void) {
        let connection = hostConnectionsQueue.sync { hostConnections.last }
        guard let connection else {
            completion(false)
            return
        }

        var resolved = false
        func finish(_ succeeded: Bool) {
            guard !resolved else {
                return
            }
            resolved = true
            completion(succeeded)
        }

        connection.invalidationHandler = { [weak self, weak connection] in
            if let self, let connection {
                self.hostConnectionsQueue.async {
                    self.hostConnections.removeAll { $0 === connection }
                }
            }
            DispatchQueue.main.async {
                finish(false)
            }
        }
        let proxy = connection.remoteObjectProxyWithErrorHandler { _ in
            self.hostConnectionsQueue.async {
                self.hostConnections.removeAll { $0 === connection }
            }
            DispatchQueue.main.async {
                finish(false)
            }
        } as? FloatemHostControlProtocol
        proxy?.toggleMainWindow(shortcut: shortcut) { succeeded in
            DispatchQueue.main.async {
                finish(succeeded)
            }
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            finish(false)
        }
    }

    private func launchHostAndShow(completion: ((Bool, String?) -> Void)? = nil) {
        // NSWorkspace does not deliver `OpenConfiguration.arguments` from a
        // sandboxed LaunchAgent. Ask the newly launched host to explicitly
        // show its window after XPC reconnects. A toggle here would hide a
        // window that the normal launch sequence has already presented.
        pendingHotKeyShowAfterHostLaunch = shortcut
        launchHost(
            arguments: [FloatemAgentXPC.agentLaunchArgument],
            completion: { [weak self] succeeded, detail in
                if !succeeded {
                    self?.pendingHotKeyShowAfterHostLaunch = nil
                }
                completion?(succeeded, detail)
            }
        )
    }

    private func recoverHostAfterSystemWake(completion: ((Bool, String?) -> Void)? = nil) {
        guard FloatemWakeRecoveryPolicy.shouldRelaunchHost(
            hostWasRunningBeforeSleep: hostWasRunningBeforeSleep,
            mainWindowWasVisibleBeforeSleep: mainWindowWasVisibleBeforeSleep
        ) else {
            let detail = hostWasRunningBeforeSleep
                ? "Floatem was hidden before sleep; preserving the hidden and stopped state after wake."
                : "Floatem was not running before sleep."
            logger.notice("\(detail, privacy: .public)")
            completion?(true, detail)
            return
        }
        guard let appURL = containingAppBundleURL() else {
            logger.error("Unable to locate the containing Floatem.app bundle for wake recovery.")
            completion?(false, "Unable to locate the containing Floatem.app bundle.")
            return
        }
        guard !isHostRunning(appURL: appURL) else {
            logger.notice("Floatem host is still running after wake; no relaunch is needed.")
            completion?(true, "Floatem host is already running.")
            return
        }

        let windowVisibility = true
        logger.notice("Floatem host was visible before sleep and is missing after wake; restoring it visibly.")
        pendingWakeRecoveryHostNotification = true
        pendingWakeRecoveryWindowVisibility = windowVisibility
        launchHost(
            appURL: appURL,
            arguments: [FloatemAgentXPC.agentWakeRecoveryLaunchArgument],
            completion: { [weak self] succeeded, detail in
                if !succeeded {
                    self?.pendingWakeRecoveryHostNotification = false
                    self?.pendingWakeRecoveryWindowVisibility = nil
                }
                completion?(succeeded, detail)
            }
        )
    }

    private func isHostRunning(appURL: URL) -> Bool {
        let standardizedAppURL = appURL.standardizedFileURL.resolvingSymlinksInPath()
        return NSWorkspace.shared.runningApplications.contains { application in
            guard application.bundleURL?.standardizedFileURL.resolvingSymlinksInPath() == standardizedAppURL else {
                return false
            }
            return isHostProcessRunning(application, appURL: standardizedAppURL)
        }
    }

    private func isHostProcessRunning(_ application: NSRunningApplication, appURL: URL) -> Bool {
        guard !application.isTerminated else {
            return false
        }
        let processID = application.processIdentifier
        guard processID > 0 else {
            return false
        }
        guard kill(processID, 0) == 0 || errno == EPERM,
              let expectedExecutableURL = Bundle(url: appURL)?.executableURL else {
            return false
        }

        var buffer = [CChar](repeating: 0, count: Int(MAXPATHLEN))
        guard proc_pidpath(processID, &buffer, UInt32(buffer.count)) > 0 else {
            return false
        }
        let executableURL = URL(fileURLWithPath: String(cString: buffer)).resolvingSymlinksInPath()
        return executableURL == expectedExecutableURL.resolvingSymlinksInPath()
    }

    private func launchHost(
        appURL: URL? = nil,
        arguments: [String],
        completion: ((Bool, String?) -> Void)? = nil
    ) {
        guard let appURL = appURL ?? containingAppBundleURL() else {
            logger.error("Unable to locate the containing Floatem.app bundle.")
            let executablePath = FloatemAgentHostLocator.currentExecutableURL()?.path ?? "unknown"
            completion?(false, "Unable to locate Floatem.app from Agent executable: \(executablePath)")
            return
        }

        let configuration = NSWorkspace.OpenConfiguration()
        configuration.createsNewApplicationInstance = true
        configuration.addsToRecentItems = false
        configuration.activates = false
        // Sandboxed callers cannot pass argv through NSWorkspace. The Agent
        // sends a recovery acknowledgement after the new host reconnects.
        configuration.arguments = arguments
        NSWorkspace.shared.openApplication(at: appURL, configuration: configuration) { [weak self] _, error in
            if let error {
                let detail = error.localizedDescription
                self?.logger.error("Unable to launch Floatem from Agent. error=\(detail, privacy: .public)")
                completion?(false, "NSWorkspace failed to launch \(appURL.path): \(detail)")
            } else {
                completion?(true, nil)
            }
        }
    }

    private func notifyHostOfPendingWakeRecovery(using connection: NSXPCConnection) {
        guard pendingWakeRecoveryHostNotification,
              let visible = pendingWakeRecoveryWindowVisibility else {
            return
        }
        let proxy = connection.remoteObjectProxyWithErrorHandler { [weak self] _ in
            DispatchQueue.main.async {
                self?.logger.error("Unable to restore Floatem's window state after reconnecting from wake.")
            }
        } as? FloatemHostControlProtocol
        proxy?.setMainWindowVisible(visible) { [weak self] restored in
            DispatchQueue.main.async {
                guard let self else {
                    return
                }
                guard restored else {
                    return
                }
                self.pendingWakeRecoveryHostNotification = false
                self.pendingWakeRecoveryWindowVisibility = nil
                self.logger.notice("Restored Floatem presentation after wake. visible=\(visible, privacy: .public)")
                self.recordWakeRecovery(using: connection)
            }
        }
    }

    private func recordWakeRecovery(using connection: NSXPCConnection) {
        let proxy = connection.remoteObjectProxyWithErrorHandler { [weak self] _ in
            DispatchQueue.main.async {
                self?.logger.error("Unable to record the host wake recovery after reconnecting.")
            }
        } as? FloatemHostControlProtocol
        proxy?.recordWakeRecovery { [weak self] recorded in
            DispatchQueue.main.async {
                if recorded {
                    self?.logger.notice("Floatem host recorded its wake recovery after reconnecting.")
                }
            }
        }
    }

    private func notifyHostOfPendingHotKeyShow(using connection: NSXPCConnection) {
        guard let shortcut = pendingHotKeyShowAfterHostLaunch else {
            return
        }
        let proxy = connection.remoteObjectProxyWithErrorHandler { [weak self] _ in
            DispatchQueue.main.async {
                self?.logger.error("Unable to show Floatem after the host launched from a global shortcut.")
            }
        } as? FloatemHostControlProtocol
        proxy?.showMainWindow(shortcut: shortcut) { [weak self] shown in
            DispatchQueue.main.async {
                guard shown else {
                    return
                }
                self?.pendingHotKeyShowAfterHostLaunch = nil
                self?.logger.notice("Showed Floatem after the host reconnected from a global shortcut.")
            }
        }
    }

    private func containingAppBundleURL() -> URL? {
        guard let executableURL = FloatemAgentHostLocator.currentExecutableURL() else {
            return nil
        }
        return FloatemAgentHostLocator.containingAppBundleURL(executableURL: executableURL)
    }
}

let application = NSApplication.shared
application.setActivationPolicy(.accessory)
private let agent = FloatemHotKeyAgent()
agent.start()
// Carbon's global-hotkey events are dispatched through AppKit's application
// event loop. A plain RunLoop keeps XPC alive but never delivers the keyboard
// event, even when registration succeeds.
application.run()
