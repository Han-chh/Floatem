import Foundation
import OSLog
import WebKit

final class FloatingWebViewResourcePool: @unchecked Sendable {
    static let shared = FloatingWebViewResourcePool()

    let processPool = WKProcessPool()
    let websiteDataStore = WKWebsiteDataStore.default()

    private let lock = NSLock()
    private let logger = Logger(subsystem: "com.stickit.floating", category: "WebKitResources")
    private var createdCount = 0
    private var destroyedCount = 0
    private var activeCount = 0

    private init() {}

    @MainActor
    func makeWebView(bootstrapScript: WKUserScript) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.processPool = processPool
        configuration.websiteDataStore = websiteDataStore
        configuration.userContentController.addUserScript(bootstrapScript)

        lock.lock()
        createdCount += 1
        activeCount += 1
        let snapshot = (createdCount, destroyedCount, activeCount)
        lock.unlock()
        logger.info("Floating WebView created. created=\(snapshot.0) destroyed=\(snapshot.1) active=\(snapshot.2) sharedProcessPool=true")
        return WKWebView(frame: .zero, configuration: configuration)
    }

    func recordDestruction() {
        lock.lock()
        destroyedCount += 1
        activeCount = max(0, activeCount - 1)
        let snapshot = (createdCount, destroyedCount, activeCount)
        lock.unlock()
        logger.info("Floating WebView destroyed. created=\(snapshot.0) destroyed=\(snapshot.1) active=\(snapshot.2) sharedProcessPool=true")
    }

    func diagnosticSnapshot() -> (created: Int, destroyed: Int, active: Int) {
        lock.lock()
        defer { lock.unlock() }
        return (createdCount, destroyedCount, activeCount)
    }
}

