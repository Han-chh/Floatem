import AppKit
import WebKit

@MainActor
final class DragPreviewWindowController: NSObject, WKNavigationDelegate {
    private static let dragPreviewEventName = "floatem:drag-preview-state"

    private let panel: NSPanel
    private let webView: WKWebView
    private var isReady = false
    private var isContentReady = false
    private var pendingPayload: Any?
    private var pendingFrame: NSRect?
    private var payloadRevision = 0

    override init() {
        let configuration = WKWebViewConfiguration()
        webView = WKWebView(frame: .zero, configuration: configuration)
        panel = NSPanel(
            contentRect: NSRect(x: 0, y: 0, width: 420, height: 260),
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )

        super.init()

        webView.navigationDelegate = self
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.wantsLayer = true
        webView.layer?.backgroundColor = NSColor.clear.cgColor
        webView.underPageBackgroundColor = .clear
        webView.setValue(false, forKey: "drawsBackground")

        let contentView = NSView()
        contentView.wantsLayer = true
        contentView.layer?.backgroundColor = NSColor.clear.cgColor
        contentView.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
            webView.topAnchor.constraint(equalTo: contentView.topAnchor),
            webView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor),
        ])

        panel.isReleasedWhenClosed = false
        panel.backgroundColor = .clear
        panel.isOpaque = false
        panel.hasShadow = false
        panel.hidesOnDeactivate = false
        panel.ignoresMouseEvents = true
        panel.isFloatingPanel = true
        panel.level = MainWindowController.overlayPanelLevel
        panel.collectionBehavior = MainWindowController.overlayCollectionBehavior
        panel.contentView = contentView

        loadFrontend()
    }

    func updatePayload(_ payload: Any) {
        payloadRevision += 1
        isContentReady = false
        panel.alphaValue = 0.001
        pendingPayload = payload
        applyCornerMask(for: payload)
        applyPendingPayloadIfPossible()
    }

    func showPreview(frame: NSRect) {
        pendingFrame = frame
        panel.setFrame(frame, display: true)
        guard isContentReady else {
            panel.alphaValue = 0.001
            panel.orderFrontRegardless()
            return
        }
        panel.alphaValue = 1
        panel.orderFrontRegardless()
    }

    func hidePreview() {
        pendingFrame = nil
        panel.alphaValue = 0.001
        panel.orderOut(nil)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        isReady = true
        applyPendingPayloadIfPossible()
    }

    private func loadFrontend() {
        guard let indexURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") else {
            return
        }

        let previewURL = URL(string: "\(indexURL.absoluteString)?mode=drag-preview") ?? indexURL
        webView.loadFileURL(previewURL, allowingReadAccessTo: indexURL.deletingLastPathComponent())
    }

    private func applyPendingPayloadIfPossible() {
        guard
            isReady,
            let payload = pendingPayload,
            let json = jsonString(for: payload)
        else {
            return
        }

        let revision = payloadRevision
        webView.callAsyncJavaScript(
            """
            window.__FLOATEM_DRAG_PREVIEW_STATE__ = \(json);
            window.dispatchEvent(new CustomEvent('\(Self.dragPreviewEventName)', { detail: \(json) }));
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            return true;
            """,
            arguments: [:],
            in: nil,
            in: .page,
            completionHandler: { [weak self] result in
                guard let self, case .success = result, revision == self.payloadRevision else { return }
                self.isContentReady = true
                guard let frame = self.pendingFrame else { return }
                self.panel.setFrame(frame, display: true)
                self.panel.alphaValue = 1
                self.panel.orderFrontRegardless()
            }
        )
    }

    private func applyCornerMask(for payload: Any) {
        let kind = (payload as? [String: Any])?["kind"] as? String
        let radius: CGFloat = kind == "todo" ? 18 : 28

        [panel.contentView?.layer, webView.layer].forEach { layer in
            layer?.cornerRadius = radius
            layer?.cornerCurve = .continuous
            layer?.masksToBounds = true
        }
    }

    private func jsonString(for value: Any) -> String? {
        guard JSONSerialization.isValidJSONObject(value) else {
            return nil
        }

        guard
            let data = try? JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]),
            let json = String(data: data, encoding: .utf8)
        else {
            return nil
        }

        return json
    }
}
