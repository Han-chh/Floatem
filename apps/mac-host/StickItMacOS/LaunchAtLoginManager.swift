import Foundation
import OSLog
import ServiceManagement

@MainActor
final class LaunchAtLoginManager {
    private let service = SMAppService.mainApp
    private let logger = Logger(subsystem: "com.stickit.app", category: "LaunchAtLogin")
    private let approvalPromptedKey = "stickit.launchAtLoginApprovalPrompted"

    func setEnabled(_ enabled: Bool) throws {
        if enabled {
            switch service.status {
            case .enabled, .requiresApproval:
                break
            case .notRegistered, .notFound:
                try service.register()
            @unknown default:
                try service.register()
            }
        } else {
            switch service.status {
            case .notRegistered, .notFound:
                break
            case .enabled, .requiresApproval:
                try service.unregister()
            @unknown default:
                try service.unregister()
            }
        }

        logger.info("Launch-at-login preference synchronized. enabled=\(enabled, privacy: .public) status=\(String(describing: self.service.status), privacy: .public)")
    }

    func configureOnLaunch(enabled: Bool) {
        do {
            try setEnabled(enabled)
            promptForApprovalIfNeeded(enabled: enabled)
        } catch {
            logger.error("Failed to synchronize launch-at-login during startup. error=\(error.localizedDescription, privacy: .public)")
        }
    }

    private func promptForApprovalIfNeeded(enabled: Bool) {
        guard enabled, service.status == .requiresApproval else {
            return
        }

        let defaults = UserDefaults.standard
        guard !defaults.bool(forKey: approvalPromptedKey) else {
            return
        }

        defaults.set(true, forKey: approvalPromptedKey)
        SMAppService.openSystemSettingsLoginItems()
    }
}
