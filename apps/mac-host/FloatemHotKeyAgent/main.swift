import AppKit
import Foundation
import OSLog

private final class FloatemHotKeyAgent: NSObject, NSXPCListenerDelegate, FloatemHotKeyAgentProtocol {
    private let listener = NSXPCListener(machServiceName: FloatemAgentXPC.agentServiceName)
    private let hotKeyManager = GlobalHotKeyManager()
    private let logger = Logger(subsystem: "com.floatem.app", category: "HotKeyAgent")
    private var shortcut = GlobalHotKeyManager.defaultShortcut
    private var hostConnections: [NSXPCConnection] = []

    override init() {
        super.init()
        listener.delegate = self
        hotKeyManager.onHotKeyPressed = { [weak self] in
            self?.handleHotKeyPressed()
        }
    }

    func start() {
        let activationEpoch = FloatemBackgroundActivityState.recordAgentActivation()
        listener.resume()
        configureHotKey(shortcut) { [weak self] registration, message in
            self?.logger.notice("Started Agent shortcut registration=\(registration, privacy: .public) message=\(message ?? "none", privacy: .public)")
        }
        logger.notice("Floatem HotKey Agent started. pid=\(ProcessInfo.processInfo.processIdentifier, privacy: .public) activationEpoch=\(activationEpoch, privacy: .public)")
    }

    func listener(_ listener: NSXPCListener, shouldAcceptNewConnection newConnection: NSXPCConnection) -> Bool {
        newConnection.exportedInterface = NSXPCInterface(with: FloatemHotKeyAgentProtocol.self)
        newConnection.exportedObject = self
        newConnection.remoteObjectInterface = NSXPCInterface(with: FloatemHostControlProtocol.self)
        newConnection.invalidationHandler = { [weak self, weak newConnection] in
            DispatchQueue.main.async {
                guard let self, let newConnection else {
                    return
                }
                self.hostConnections.removeAll { $0 === newConnection }
            }
        }
        if Thread.isMainThread {
            hostConnections.append(newConnection)
        } else {
            DispatchQueue.main.sync {
                self.hostConnections.append(newConnection)
            }
        }
        newConnection.resume()
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
            self.launchHostAndRetryToggle(completion: completion)
        }
    }

    private func requestRunningHostToggle(completion: @escaping (Bool) -> Void) {
        guard let connection = hostConnections.last else {
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

        connection.invalidationHandler = {
            DispatchQueue.main.async {
                finish(false)
            }
        }
        let proxy = connection.remoteObjectProxyWithErrorHandler { _ in
            DispatchQueue.main.async {
                self.hostConnections.removeAll { $0 === connection }
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

    private func launchHostAndRetryToggle(completion: ((Bool, String?) -> Void)? = nil) {
        guard let appURL = containingAppBundleURL() else {
            logger.error("Unable to locate the containing Floatem.app bundle.")
            let executablePath = FloatemAgentHostLocator.currentExecutableURL()?.path ?? "unknown"
            completion?(false, "Unable to locate Floatem.app from Agent executable: \(executablePath)")
            return
        }

        do {
            _ = try NSWorkspace.shared.launchApplication(
                at: appURL,
                options: [.newInstance, .withoutAddingToRecents],
                configuration: [.arguments: [FloatemAgentXPC.agentLaunchArgument]]
            )
        } catch {
            let detail = error.localizedDescription
            logger.error("Unable to launch Floatem from Agent. error=\(detail, privacy: .public)")
            completion?(false, "NSWorkspace failed to launch \(appURL.path): \(detail)")
            return
        }
        completion?(true, nil)
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
application.run()
