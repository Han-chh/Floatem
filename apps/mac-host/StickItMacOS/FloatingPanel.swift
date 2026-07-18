import AppKit
import OSLog

@MainActor
class FloatingPanel: NSPanel {
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

/// A dedicated native carrier for cards that the user has placed on the desktop.
/// Keeping this as a distinct NSPanel instance makes desktop placement a real
/// window-mode transition instead of only changing the overlay panel's level.
@MainActor
final class DesktopCardPanel: FloatingPanel {}
