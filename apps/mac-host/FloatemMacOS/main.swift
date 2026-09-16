import AppKit
import ServiceManagement

private final class AgentDiagnosticHostCallback: NSObject, FloatemHostControlProtocol {
    func toggleMainWindow(shortcut: String, withReply reply: @escaping (Bool) -> Void) {
        reply(false)
    }

    func showMainWindow(shortcut: String, withReply reply: @escaping (Bool) -> Void) {
        reply(false)
    }

    func recordWakeRecovery(withReply reply: @escaping (Bool) -> Void) {
        reply(false)
    }
}

private func runAgentDiagnosticCommandIfRequested() {
    let arguments = CommandLine.arguments
    guard arguments.contains("--floatem-agent-status") || arguments.contains("--floatem-agent-trigger") || arguments.contains("--floatem-agent-trigger-wake") else {
        return
    }

    let connection = NSXPCConnection(machServiceName: FloatemAgentXPC.agentServiceName, options: [])
    connection.remoteObjectInterface = NSXPCInterface(with: FloatemHotKeyAgentProtocol.self)
    connection.exportedInterface = NSXPCInterface(with: FloatemHostControlProtocol.self)
    connection.exportedObject = AgentDiagnosticHostCallback()
    connection.resume()
    let result = DispatchSemaphore(value: 0)
    var exitCode: Int32 = EXIT_FAILURE
    let proxy = connection.remoteObjectProxyWithErrorHandler { error in
        fputs("Unable to reach Floatem HotKey Agent: \(error.localizedDescription)\n", stderr)
        result.signal()
    } as? FloatemHotKeyAgentProtocol

    if arguments.contains("--floatem-agent-status") {
        proxy?.currentHotKeyStatus { shortcut, registration, message in
            print("shortcut=\(shortcut) registration=\(registration) message=\(message ?? "none")")
            exitCode = registration == "registered" ? EXIT_SUCCESS : EXIT_FAILURE
            result.signal()
        }
    } else if arguments.contains("--floatem-agent-trigger") {
        proxy?.triggerHostLaunchForDiagnostics { didReachHost, detail in
            print("hostRecovery=\(didReachHost ? "success" : "failure") detail=\(detail ?? "none")")
            exitCode = didReachHost ? EXIT_SUCCESS : EXIT_FAILURE
            result.signal()
        }
    } else {
        proxy?.triggerWakeRecoveryForDiagnostics { didRecoverHost, detail in
            print("wakeRecovery=\(didRecoverHost ? "success" : "failure") detail=\(detail ?? "none")")
            exitCode = didRecoverHost ? EXIT_SUCCESS : EXIT_FAILURE
            result.signal()
        }
    }

    if result.wait(timeout: .now() + 8) == .timedOut {
        fputs("Timed out waiting for Floatem HotKey Agent.\n", stderr)
    }
    connection.invalidate()
    exit(exitCode)
}

runAgentDiagnosticCommandIfRequested()

if CommandLine.arguments.contains("--floatem-agent-unregister") {
    let service = SMAppService.agent(plistName: FloatemAgentXPC.launchAgentPlistName)
    if service.status != .notRegistered {
        do {
            try service.unregister()
        } catch {
            fputs("Unable to unregister Floatem HotKey Agent: \(error.localizedDescription)\n", stderr)
            exit(EXIT_FAILURE)
        }
    }
    exit(EXIT_SUCCESS)
}

let app = NSApplication.shared
let delegate = MainActor.assumeIsolated {
    AppDelegate()
}

app.delegate = delegate
_ = NSApplicationMain(CommandLine.argc, CommandLine.unsafeArgv)
