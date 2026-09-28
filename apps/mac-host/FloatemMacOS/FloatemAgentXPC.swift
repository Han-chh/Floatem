import Darwin
import Foundation

enum FloatemAgentXPC {
    static var agentServiceName: String {
        #if FLOATEM_DEBUG_ISOLATED
        "com.hankch.floatem.debug.hotkey-agent"
        #else
        "com.hankch.floatem.hotkey-agent"
        #endif
    }

    static var launchAgentPlistName: String {
        "\(agentServiceName).plist"
    }

    static let agentLaunchArgument = "--floatem-agent-hotkey"
    static let agentWakeRecoveryLaunchArgument = "--floatem-agent-wake-recovery"
}

/// The background Agent must stay available after wake, but a hidden Floatem
/// host must not be recreated merely because macOS removed it while sleeping.
/// The next user shortcut is the explicit request that starts a hidden host.
enum FloatemWakeRecoveryPolicy {
    static func shouldRelaunchHost(hostWasRunningBeforeSleep: Bool, mainWindowWasVisibleBeforeSleep: Bool) -> Bool {
        hostWasRunningBeforeSleep && mainWindowWasVisibleBeforeSleep
    }
}

enum FloatemBackgroundActivityState {
    static let appGroupIdentifier = "group.com.hankch.floatem"
    private static let activationEpochKey = "floatem.backgroundActivity.activationEpoch"

    static var activationEpoch: Int {
        UserDefaults(suiteName: appGroupIdentifier)?.integer(forKey: activationEpochKey) ?? 0
    }

    /// The Agent can only start while its background item is enabled. Recording
    /// this generation lets the host distinguish a newly disabled interval from
    /// the interval for which the user previously dismissed the prompt.
    @discardableResult
    static func recordAgentActivation() -> Int {
        let defaults = UserDefaults(suiteName: appGroupIdentifier)
        let nextEpoch = max(activationEpoch, 0) + 1
        defaults?.set(nextEpoch, forKey: activationEpochKey)
        return nextEpoch
    }
}

enum FloatemAgentHostLocator {
    /// launchd starts a ServiceManagement agent with the relative BundleProgram
    /// value as argv[0]. `_NSGetExecutablePath` is the authoritative absolute
    /// path of the already-running executable.
    static func currentExecutableURL() -> URL? {
        var bufferSize: UInt32 = 0
        _ = _NSGetExecutablePath(nil, &bufferSize)
        guard bufferSize > 0 else {
            return nil
        }

        var buffer = [CChar](repeating: 0, count: Int(bufferSize))
        guard _NSGetExecutablePath(&buffer, &bufferSize) == 0 else {
            return nil
        }
        return URL(fileURLWithPath: String(cString: buffer)).resolvingSymlinksInPath()
    }

    static func containingAppBundleURL(executableURL: URL) -> URL? {
        var candidate = executableURL.standardizedFileURL
        while candidate.path != "/" {
            if candidate.pathExtension == "app" {
                return candidate
            }
            candidate.deleteLastPathComponent()
        }
        return nil
    }

    static func validContainingAppBundleURL(
        executableURL: URL,
        expectedBundleIdentifier: String = "com.hankch.floatem",
        fileManager: FileManager = .default,
        bundleProvider: (URL) -> Bundle? = { Bundle(url: $0) }
    ) -> URL? {
        guard let appURL = containingAppBundleURL(executableURL: executableURL),
              fileManager.fileExists(atPath: appURL.path) else {
            return nil
        }

        // A sandboxed ServiceManagement Agent can execute from inside its
        // containing application while Foundation still refuses to resolve
        // that parent directory as a Bundle (notably for local Release builds
        // outside /Applications). Use readable metadata when available, but
        // do not treat sandbox-limited Bundle lookup as proof that the host was
        // deleted. The host executable itself is the authoritative liveness
        // check because it disappears together with a removed application.
        let bundle = bundleProvider(appURL)
        if let bundleIdentifier = bundle?.bundleIdentifier,
           bundleIdentifier != expectedBundleIdentifier {
            return nil
        }

        let hostExecutableURL = bundle?.executableURL
            ?? appURL.appendingPathComponent("Contents/MacOS/Floatem", isDirectory: false)
        guard fileManager.fileExists(atPath: hostExecutableURL.path) else {
            return nil
        }
        return appURL.standardizedFileURL.resolvingSymlinksInPath()
    }
}

/// The main host can only configure the Agent. The Agent is the sole owner of
/// the Carbon global shortcut and never delegates registration back to the host.
@objc protocol FloatemHotKeyAgentProtocol {
    func validateHostApplication(atPath path: String, withReply reply: @escaping (Bool, String?) -> Void)
    func configureHotKey(_ shortcut: String, withReply reply: @escaping (String, String?) -> Void)
    func currentHotKeyStatus(withReply reply: @escaping (String, String, String?) -> Void)
    func triggerHostLaunchForDiagnostics(withReply reply: @escaping (Bool, String?) -> Void)
    func triggerWakeRecoveryForDiagnostics(withReply reply: @escaping (Bool, String?) -> Void)
}

/// Deliberately minimal: a locally running Agent can only request the same
/// panel toggle that the user invokes through the global shortcut.
@objc protocol FloatemHostControlProtocol {
    func toggleMainWindow(shortcut: String, withReply reply: @escaping (Bool) -> Void)
    func showMainWindow(shortcut: String, withReply reply: @escaping (Bool) -> Void)
    func setMainWindowVisible(_ visible: Bool, withReply reply: @escaping (Bool) -> Void)
    func currentMainWindowVisibility(withReply reply: @escaping (Bool) -> Void)
    func recordWakeRecovery(withReply reply: @escaping (Bool) -> Void)
}
