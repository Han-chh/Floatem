import AppKit
import OSLog

@MainActor
final class FloatingPanel: NSPanel {
    private nonisolated static let lifecycle = Logger(subsystem: "com.stickit.floating", category: "Lifecycle")
    private nonisolated static let debugLifecycle: Bool = {
        DebugFlags.isEnabled("DEBUG_FLOATING_LIFECYCLE")
    }()

    var lifecycleCardID: String?

    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { false }

    deinit {
        guard Self.debugLifecycle, let lifecycleCardID else {
            return
        }

        Self.lifecycle.info("deinit FloatingCardPanel(cardId=\(lifecycleCardID, privacy: .public))")
    }
}
