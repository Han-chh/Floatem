import Foundation

struct LaunchContextResolver {
    enum ExplicitContext: Equatable {
        case automatic
        case loginItem
        case user
    }

    private(set) var explicitContext: ExplicitContext
    private(set) var receivedDeepLink = false
    private(set) var consumedInitialActivation = false

    init(arguments: [String] = ProcessInfo.processInfo.arguments, environment: [String: String] = ProcessInfo.processInfo.environment) {
        if arguments.contains("--stickit-login-item") || environment["STICKIT_LAUNCH_CONTEXT"] == "login" {
            explicitContext = .loginItem
        } else if arguments.contains("--stickit-user-launch") || environment["STICKIT_LAUNCH_CONTEXT"] == "user" {
            explicitContext = .user
        } else {
            explicitContext = .automatic
        }
    }

    mutating func markDeepLinkReceived() {
        receivedDeepLink = true
    }

    mutating func shouldShowAtDidFinish(isApplicationActive: Bool, launchAtLoginEnabled: Bool) -> Bool {
        guard !receivedDeepLink, !consumedInitialActivation else { return false }

        switch explicitContext {
        case .loginItem:
            guard launchAtLoginEnabled else {
                consumedInitialActivation = true
                return true
            }
            consumedInitialActivation = true
            return false
        case .user:
            consumedInitialActivation = true
            return true
        case .automatic:
            guard isApplicationActive else {
                // SMAppService.mainApp launches the same executable without a
                // login-item argument. Both login launches and a first Finder or
                // Spotlight launch can still be inactive at did-finish time.
                // Leave the activation unconsumed: a user launch will immediately
                // become active, while an actual background login launch will not.
                return false
            }
            consumedInitialActivation = true
            return true
        }
    }

    mutating func shouldShowForActivation(launchAtLoginEnabled: Bool) -> Bool {
        guard !receivedDeepLink, !consumedInitialActivation else {
            return false
        }
        if explicitContext == .loginItem, launchAtLoginEnabled {
            consumedInitialActivation = true
            return false
        }
        consumedInitialActivation = true
        return true
    }
}
