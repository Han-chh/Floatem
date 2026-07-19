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

    mutating func shouldShowAtDidFinish(isApplicationActive _: Bool) -> Bool {
        guard !receivedDeepLink else { return false }
        consumedInitialActivation = true
        return true
    }

    mutating func shouldShowForActivation() -> Bool {
        guard !receivedDeepLink, !consumedInitialActivation else {
            return false
        }
        consumedInitialActivation = true
        return true
    }
}
