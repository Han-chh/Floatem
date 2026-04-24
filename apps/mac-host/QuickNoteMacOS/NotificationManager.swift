import AppKit
import OSLog
import UserNotifications

private let quickNoteReminderNotificationPrefix = "quicknote.todo.reminder."
private let quickNoteTestNotificationPrefix = "quicknote.test.notification."
private let quickNoteBridgeNotificationPrefix = "quicknote.bridge.notification."

struct TodoReminderDescriptor: Hashable {
    let todoID: String
    let notificationTitle: String
    let notificationBody: String
    let reminderDate: Date

    var notificationIdentifier: String {
        "\(quickNoteReminderNotificationPrefix)\(todoID)"
    }
}

struct NotificationAuthorizationSnapshot {
    let authorizationStatus: UNAuthorizationStatus
    let alertSetting: UNNotificationSetting
    let notificationCenterSetting: UNNotificationSetting
    let soundSetting: UNNotificationSetting

    var allowsUserVisibleNotifications: Bool {
        guard notificationCenterSetting != .disabled, alertSetting != .disabled else {
            return false
        }

        switch authorizationStatus {
        case .authorized, .provisional, .ephemeral:
            return true
        case .denied, .notDetermined:
            return false
        @unknown default:
            return false
        }
    }

    var logDescription: String {
        "authorization=\(authorizationStatus.logName) center=\(notificationCenterSetting.logName) alert=\(alertSetting.logName) sound=\(soundSetting.logName)"
    }
}

enum NotificationManagerError: LocalizedError {
    case reminderDateMissing(todoID: String)
    case reminderDateInPast(todoID: String, reminderDate: Date)
    case notificationsNotAllowed(message: String, snapshot: NotificationAuthorizationSnapshot)
    case schedulingFailed(identifier: String, underlying: Error)

    var errorDescription: String? {
        switch self {
        case let .reminderDateMissing(todoID):
            return "QuickNote could not schedule reminder \(todoID) because reminderDate is missing."
        case let .reminderDateInPast(todoID, reminderDate):
            return "QuickNote could not schedule reminder \(todoID) because the reminder date \(reminderDate) is not in the future."
        case let .notificationsNotAllowed(message, _):
            return message
        case let .schedulingFailed(identifier, underlying):
            return "QuickNote failed to schedule notification \(identifier): \(underlying.localizedDescription)"
        }
    }

    var authorizationSnapshot: NotificationAuthorizationSnapshot? {
        switch self {
        case let .notificationsNotAllowed(_, snapshot):
            return snapshot
        case .reminderDateMissing, .reminderDateInPast, .schedulingFailed:
            return nil
        }
    }
}

@MainActor
final class NotificationManager: NSObject, @preconcurrency UNUserNotificationCenterDelegate {
    private let center: UNUserNotificationCenter
    private let logger = Logger(subsystem: "com.quicknote.app", category: "Notifications")

    var onReminderResponse: ((String) -> Void)?

    init(center: UNUserNotificationCenter = .current()) {
        self.center = center
        super.init()
    }

    static func reminderIdentifier(for todoID: String) -> String {
        "\(quickNoteReminderNotificationPrefix)\(todoID)"
    }

    func configure() {
        center.delegate = self
    }

    func logCurrentAuthorizationStatus() {
        Task { @MainActor [weak self] in
            guard let self else {
                return
            }

            let snapshot = await self.currentAuthorizationSnapshot()
            self.logger.info("Notification authorization snapshot on launch. \(snapshot.logDescription, privacy: .public)")
        }
    }

    func currentAuthorizationSnapshot() async -> NotificationAuthorizationSnapshot {
        let settings = await currentNotificationSettings()

        return NotificationAuthorizationSnapshot(
            authorizationStatus: settings.authorizationStatus,
            alertSetting: settings.alertSetting,
            notificationCenterSetting: settings.notificationCenterSetting,
            soundSetting: settings.soundSetting
        )
    }

    func requestAuthorizationOnLaunchIfNeeded(language: QuickNoteLanguage) async {
        do {
            let snapshot = try await requestAuthorizationIfNeeded(
                language: language,
                activateAppIfNeeded: true
            )
            logger.info(
                "Launch-time notification authorization check completed. \(snapshot.logDescription, privacy: .public)"
            )
        } catch {
            logger.error(
                "Launch-time notification authorization request failed. error=\(error.localizedDescription, privacy: .public)"
            )
        }
    }

    func scheduleTestNotification(soundEnabled: Bool, language: QuickNoteLanguage) async throws {
        let snapshot = try await ensureSchedulingAuthorization(
            language: language,
            activateAppIfNeeded: true
        )

        let content = UNMutableNotificationContent()
        content.title = language.localization.notificationTestTitle
        content.body = language.localization.notificationTestBody
        content.sound = soundEnabled ? .default : nil

        let request = UNNotificationRequest(
            identifier: "\(quickNoteTestNotificationPrefix)\(UUID().uuidString)",
            content: content,
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: 2, repeats: false)
        )

        do {
            try await add(request)
            logger.info(
                "Scheduled test notification. soundEnabled=\(soundEnabled) \(snapshot.logDescription, privacy: .public)"
            )
        } catch {
            let mappedError = mapSchedulingError(
                error,
                language: language,
                snapshot: snapshot,
                identifier: request.identifier
            )
            logger.error(
                "Failed to schedule test notification. id=\(request.identifier, privacy: .public) error=\(mappedError.localizedDescription, privacy: .public)"
            )
            throw mappedError
        }
    }

    func scheduleBridgeNotification(
        identifier: String?,
        title: String,
        body: String,
        scheduledAt: Date?,
        soundEnabled: Bool,
        language: QuickNoteLanguage
    ) async throws {
        let snapshot = try await ensureSchedulingAuthorization(
            language: language,
            activateAppIfNeeded: true
        )

        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = soundEnabled ? .default : nil

        let trigger: UNNotificationTrigger?
        if let scheduledAt {
            trigger = UNTimeIntervalNotificationTrigger(
                timeInterval: max(1, scheduledAt.timeIntervalSinceNow),
                repeats: false
            )
        } else {
            trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        }

        let request = UNNotificationRequest(
            identifier: identifier ?? "\(quickNoteBridgeNotificationPrefix)\(UUID().uuidString)",
            content: content,
            trigger: trigger
        )

        do {
            try await add(request)
            logger.info(
                "Scheduled bridge notification. id=\(request.identifier, privacy: .public) \(snapshot.logDescription, privacy: .public)"
            )
        } catch {
            throw mapSchedulingError(
                error,
                language: language,
                snapshot: snapshot,
                identifier: request.identifier
            )
        }
    }

    func replaceScheduledTodoReminders(
        with reminders: [TodoReminderDescriptor],
        soundEnabled: Bool,
        language: QuickNoteLanguage,
        requestAuthorizationIfNeeded: Bool
    ) async throws -> [TodoReminderDescriptor] {
        let validReminders = reminders.filter { $0.reminderDate > Date() }
        let existingIdentifiers = await pendingTodoReminderIdentifiers()

        guard !validReminders.isEmpty else {
            if !existingIdentifiers.isEmpty {
                center.removePendingNotificationRequests(withIdentifiers: Array(existingIdentifiers))
                logger.info("Removed all pending todo reminder requests because no future reminders remain. count=\(existingIdentifiers.count)")
            }

            return []
        }

        let snapshot = try await ensureSchedulingAuthorization(
            language: language,
            activateAppIfNeeded: requestAuthorizationIfNeeded
        )

        logger.info(
            "Starting todo reminder sync. targetCount=\(validReminders.count) soundEnabled=\(soundEnabled) \(snapshot.logDescription, privacy: .public)"
        )

        let targetIdentifiers = Set(validReminders.map(\.notificationIdentifier))
        let staleIdentifiers = existingIdentifiers.subtracting(targetIdentifiers)

        if !staleIdentifiers.isEmpty {
            center.removePendingNotificationRequests(withIdentifiers: Array(staleIdentifiers))
            logger.info("Removed stale todo reminder requests. count=\(staleIdentifiers.count)")
        }

        var scheduledReminders: [TodoReminderDescriptor] = []

        for reminder in validReminders {
            do {
                let request = try makeReminderRequest(for: reminder, soundEnabled: soundEnabled)
                try await add(request)
                scheduledReminders.append(reminder)
                logger.info(
                    "Scheduled todo reminder. id=\(request.identifier, privacy: .public) fireDate=\(reminder.reminderDate.timeIntervalSince1970, privacy: .public)"
                )
            } catch {
                let mappedError = mapSchedulingError(
                    error,
                    language: language,
                    snapshot: snapshot,
                    identifier: reminder.notificationIdentifier
                )
                logger.error(
                    "Failed to schedule todo reminder. id=\(reminder.notificationIdentifier, privacy: .public) error=\(mappedError.localizedDescription, privacy: .public)"
                )
            }
        }

        logger.info(
            "Finished todo reminder sync. scheduledCount=\(scheduledReminders.count) targetCount=\(validReminders.count)"
        )

        return scheduledReminders
    }

    func cancelReminder(forTodoID todoID: String) {
        let identifier = Self.reminderIdentifier(for: todoID)
        center.removePendingNotificationRequests(withIdentifiers: [identifier])
        center.removeDeliveredNotifications(withIdentifiers: [identifier])
        logger.info("Cancelled todo reminder. id=\(identifier, privacy: .public)")
    }

    func consumeDeliveredTodoReminderIdentifiers() async -> [String] {
        let notifications = await deliveredNotifications()
        let identifiers = notifications
            .map(\.request.identifier)
            .filter { $0.hasPrefix(quickNoteReminderNotificationPrefix) }

        guard !identifiers.isEmpty else {
            return []
        }

        center.removeDeliveredNotifications(withIdentifiers: identifiers)
        logger.info("Consumed delivered todo reminders. count=\(identifiers.count)")

        return identifiers.compactMap(Self.todoID(fromReminderIdentifier:))
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        let identifier = notification.request.identifier
        guard
            identifier.hasPrefix(quickNoteReminderNotificationPrefix) ||
            identifier.hasPrefix(quickNoteTestNotificationPrefix) ||
            identifier.hasPrefix(quickNoteBridgeNotificationPrefix)
        else {
            completionHandler([])
            return
        }

        var options: UNNotificationPresentationOptions = [.banner, .list]
        if notification.request.content.sound != nil {
            options.insert(.sound)
        }

        completionHandler(options)
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        if let todoID = Self.todoID(fromReminderIdentifier: response.notification.request.identifier) {
            onReminderResponse?(todoID)
        }

        completionHandler()
    }

    private func currentNotificationSettings() async -> UNNotificationSettings {
        await withCheckedContinuation { continuation in
            center.getNotificationSettings { settings in
                continuation.resume(returning: settings)
            }
        }
    }

    private func deliveredNotifications() async -> [UNNotification] {
        await withCheckedContinuation { continuation in
            center.getDeliveredNotifications { notifications in
                continuation.resume(returning: notifications)
            }
        }
    }

    private func pendingTodoReminderIdentifiers() async -> Set<String> {
        await withCheckedContinuation { continuation in
            center.getPendingNotificationRequests { requests in
                let identifiers = Set(
                    requests
                        .map(\.identifier)
                        .filter { $0.hasPrefix(quickNoteReminderNotificationPrefix) }
                )
                continuation.resume(returning: identifiers)
            }
        }
    }

    private func requestAuthorizationIfNeeded(
        language: QuickNoteLanguage,
        activateAppIfNeeded: Bool
    ) async throws -> NotificationAuthorizationSnapshot {
        var snapshot = await currentAuthorizationSnapshot()
        logger.info("Current notification authorization status. \(snapshot.logDescription, privacy: .public)")

        guard snapshot.authorizationStatus == .notDetermined else {
            return snapshot
        }

        if activateAppIfNeeded {
            NSApp.activate(ignoringOtherApps: true)
        }

        do {
            let granted = try await center.requestAuthorization(options: [.alert, .sound])
            logger.info("Notification authorization request completed. granted=\(granted)")
        } catch {
            logger.error("Notification authorization request failed. error=\(error.localizedDescription, privacy: .public)")
            throw mapSchedulingError(
                error,
                language: language,
                snapshot: snapshot,
                identifier: "authorization-request"
            )
        }

        snapshot = await currentAuthorizationSnapshot()
        logger.info("Notification authorization status after request. \(snapshot.logDescription, privacy: .public)")
        return snapshot
    }

    private func ensureSchedulingAuthorization(
        language: QuickNoteLanguage,
        activateAppIfNeeded: Bool
    ) async throws -> NotificationAuthorizationSnapshot {
        let snapshot = try await requestAuthorizationIfNeeded(
            language: language,
            activateAppIfNeeded: activateAppIfNeeded
        )

        guard snapshot.allowsUserVisibleNotifications else {
            logger.error("Notifications are not allowed for QuickNote. \(snapshot.logDescription, privacy: .public)")
            throw NotificationManagerError.notificationsNotAllowed(
                message: language.localization.notificationPermissionDeniedMessage,
                snapshot: snapshot
            )
        }

        return snapshot
    }

    private func add(_ request: UNNotificationRequest) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            center.add(request) { error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }

                continuation.resume()
            }
        }
    }

    private func makeReminderRequest(
        for reminder: TodoReminderDescriptor,
        soundEnabled: Bool
    ) throws -> UNNotificationRequest {
        let interval = reminder.reminderDate.timeIntervalSinceNow

        guard interval > 0 else {
            throw NotificationManagerError.reminderDateInPast(
                todoID: reminder.todoID,
                reminderDate: reminder.reminderDate
            )
        }

        let content = UNMutableNotificationContent()
        content.title = reminder.notificationTitle
        content.body = reminder.notificationBody
        content.sound = soundEnabled ? .default : nil

        let trigger = UNTimeIntervalNotificationTrigger(
            timeInterval: max(1, interval),
            repeats: false
        )

        return UNNotificationRequest(
            identifier: reminder.notificationIdentifier,
            content: content,
            trigger: trigger
        )
    }

    private func mapSchedulingError(
        _ error: Error,
        language: QuickNoteLanguage,
        snapshot: NotificationAuthorizationSnapshot,
        identifier: String
    ) -> Error {
        let nsError = error as NSError

        if nsError.domain == UNErrorDomain, nsError.code == 1 {
            return NotificationManagerError.notificationsNotAllowed(
                message: language.localization.notificationPermissionDeniedMessage,
                snapshot: snapshot
            )
        }

        return NotificationManagerError.schedulingFailed(identifier: identifier, underlying: error)
    }

    private static func todoID(fromReminderIdentifier identifier: String) -> String? {
        guard identifier.hasPrefix(quickNoteReminderNotificationPrefix) else {
            return nil
        }

        return String(identifier.dropFirst(quickNoteReminderNotificationPrefix.count))
    }
}

private extension UNAuthorizationStatus {
    var logName: String {
        switch self {
        case .notDetermined:
            return "notDetermined"
        case .denied:
            return "denied"
        case .authorized:
            return "authorized"
        case .provisional:
            return "provisional"
        case .ephemeral:
            return "ephemeral"
        @unknown default:
            return "unknown"
        }
    }
}

private extension UNNotificationSetting {
    var logName: String {
        switch self {
        case .notSupported:
            return "notSupported"
        case .disabled:
            return "disabled"
        case .enabled:
            return "enabled"
        @unknown default:
            return "unknown"
        }
    }
}
