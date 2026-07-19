import AppKit
import OSLog
import WebKit

@MainActor
final class FloatingNoteWindowController: NSObject, WKNavigationDelegate, WKScriptMessageHandler, NSWindowDelegate {
    private nonisolated static let diagnostics = Logger(subsystem: "com.stickit.floating", category: "Dock")
    private nonisolated static let lifecycle = Logger(subsystem: "com.stickit.floating", category: "Lifecycle")
    private static let interactiveInputPanelLevel = NSWindow.Level.floating
    private static let textCompositionPanelLevel = NSWindow.Level.normal

    /// When enabled (via `defaults write com.stickit.app DEBUG_FLOATING_LIFECYCLE -bool true`),
    /// lifecycle events are logged at info level so you can trace create/destroy/deinit through every drag cycle.
    ///
    /// Reads UserDefaults once at class-load time; the stored Bool is safe to read
    /// from any context, including the nonisolated deinit.
    private nonisolated static let debugLifecycle: Bool = {
        DebugFlags.isEnabled("DEBUG_FLOATING_LIFECYCLE")
    }()

    private static let bridgeName = "stickItFloatingHost"
    private static let floatingCardStateEventName = "stickit:floating-card-state"
    private static let bridgeBootstrapScript = """
    (() => {
      if (window.stickItFloatingHost) {
        return;
      }

      const send = (method, params = {}) => {
        const id = window.__stickItFloatingNextRequestId++;
        try {
          window.webkit.messageHandlers.stickItFloatingHost.postMessage({ id, method, params });
        } catch (_error) {
          // The native handler was removed (window is closing).
          // Resolve silently — rejecting would trigger unhandled
          // rejection handlers that re-enter send() and loop.
          return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
          window.__stickItFloatingPendingRequests.set(id, { resolve, reject });
          window.setTimeout(() => {
            if (!window.__stickItFloatingPendingRequests.has(id)) {
              return;
            }

            window.__stickItFloatingPendingRequests.delete(id);
            reject(new Error(`StickIt floating bridge request timed out: ${method}`));
          }, 8000);
        });
      };

      window.__stickItFloatingNextRequestId = 1;
      window.__stickItFloatingPendingRequests = new Map();
      window.__stickItFloatingReceive = (id, ok, result) => {
        const request = window.__stickItFloatingPendingRequests.get(id);
        if (!request) {
          return;
        }

        window.__stickItFloatingPendingRequests.delete(id);
        if (ok) {
          request.resolve(result);
          return;
        }

        request.reject(new Error(String(result || "StickIt floating bridge request failed.")));
      };

      window.stickItFloatingHost = {
        platform: "macos",
        getCapabilities() {
          return send("getCapabilities");
        },
        loadAllData() {
          return send("loadAllData");
        },
        saveNotes(cards) {
          return send("saveNotes", { cards });
        },
        saveTodos(todos) {
          return send("saveTodos", { todos });
        },
        saveSettings(settings) {
          return send("saveSettings", { settings });
        },
        readClipboardText() {
          return send("readClipboardText");
        },
        writeClipboardText(text) {
          return send("writeClipboardText", { text: String(text ?? "") });
        },
        closeFloatingCard(card) {
          return send("closeFloatingCard", { kind: String(card?.kind ?? ""), id: String(card?.id ?? "") });
        },
        resizeFloatingCard(size) {
          return send("resizeFloatingCard", {
            width: Number(size?.width ?? 0),
            height: Number(size?.height ?? 0),
            anchor: String(size?.anchor ?? "top"),
            horizontalAnchor: String(size?.horizontalAnchor ?? "left"),
            allowBelowMinimum: Boolean(size?.allowBelowMinimum),
          });
        },
        getFloatingCardScreenPlacement() {
          return send("getFloatingCardScreenPlacement");
        },
        startFloatingCardDrag(card) {
          return send("startFloatingCardDrag", { kind: String(card?.kind ?? ""), id: String(card?.id ?? "") });
        },
        setFloatingCardDesktopPinned(card, pinned) {
          return send("setFloatingCardDesktopPinned", {
            kind: String(card?.kind ?? ""),
            id: String(card?.id ?? ""),
            pinned: Boolean(pinned),
          });
        },
        requestDesktopWidget(card) {
          return send("requestDesktopWidget", { kind: String(card?.kind ?? ""), id: String(card?.id ?? "") });
        },
        removeDesktopWidgetAssociation(card) {
          return send("removeDesktopWidgetAssociation", { kind: String(card?.kind ?? ""), id: String(card?.id ?? "") });
        },
        getDesktopWidgetState(card) {
          return send("getDesktopWidgetState", { kind: String(card?.kind ?? ""), id: String(card?.id ?? "") });
        },
        showWindow() { return Promise.resolve(); },
        hideWindow() { return Promise.resolve(); },
        toggleWindow() { return Promise.resolve(); },
        setAlwaysOnTop() { return Promise.resolve(); },
        showDragPreview() { return Promise.resolve(); },
        hideDragPreview() { return Promise.resolve(); },
        showFloatingCard() { return Promise.resolve(); },
        openNotificationSettings() { return Promise.resolve(); },
        sendNotification() { return Promise.resolve(); },
        showNotification() { return Promise.resolve(); },
        scheduleNotification() { return Promise.resolve(); },
        openTextColorPanel() { return Promise.resolve(); },
        pickScreenColor() { return send("pickScreenColor"); },
        testReminderNotification() { return Promise.resolve(); },
        getHotkeyRegistrationState() { return Promise.resolve({ shortcut: "", registration: "unsupported" }); },
        registerHotkey() { return Promise.resolve(); },
        registerGlobalShortcut() { return Promise.resolve(); },
        unregisterHotkey() { return Promise.resolve(); },
        setEditableInputActive(active) {
          send("setEditableInputActive", { active: Boolean(active) });
        },
        setTextCompositionActive(active) {
          send("setTextCompositionActive", { active: Boolean(active) });
        },
        openDevTools() { return Promise.resolve(); },
        quitApplication() { return Promise.resolve(); },
        reportFrontendReady() {},
        reportFrontendError() {},
      };

      window.stickItHost = window.stickItFloatingHost;
      window.stickItNative = window.stickItFloatingHost;
    })();
    """

    let cardKind: String
    let cardID: String
    var onClose: ((String, String) -> Void)?
    var onRequestDrag: ((String, String) -> Void)?
    var onSetDesktopPinned: ((String, String, Bool) -> Void)?
    var onRequestDesktopWidget: ((String, String) throws -> [String: Any])?
    var onRemoveDesktopWidgetAssociation: ((String, String) throws -> Void)?
    var onGetDesktopWidgetState: ((String, String) throws -> [String: Any])?
    var onFrameChange: ((NSRect) -> Void)?
    var onMove: ((NSRect) -> Void)?
    var onLoadAllData: (() throws -> [String: Any])?
    var onSaveNotes: ((Any) throws -> Void)?
    var onSaveTodos: ((Any) throws -> Void)?
    var onSaveSettings: ((Any) throws -> Void)?
    var onReadClipboardText: (() -> String)?
    var onWriteClipboardText: ((String) -> Void)?
    var onPickScreenColor: (() async throws -> String?)?

    private var panel: FloatingPanel?
    private let webView: WKWebView
    private var isReady = false
    private var isContentReady = false
    private var isDestroyed = false
    private var isEditableInputActive = false
    private var isTextCompositionActive = false
    private var minimumContentSize = NSSize(width: 1, height: 1)
    private var pendingPayload: Any?
    private var pendingShowFrame: NSRect?
    private(set) var isDesktopPinned = false

    init(cardKind: String, cardID: String) {
        self.cardKind = cardKind
        self.cardID = cardID

        let userContentController = WKUserContentController()
        let configuration = WKWebViewConfiguration()
        configuration.userContentController = userContentController
        webView = WKWebView(frame: .zero, configuration: configuration)
        panel = FloatingPanel(
            contentRect: NSRect(x: 0, y: 0, width: 420, height: 260),
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )

        super.init()

        if Self.debugLifecycle {
            Self.lifecycle.info("createPanel(cardId=\(cardID, privacy: .public)) kind=\(cardKind, privacy: .public)")
        }

        userContentController.add(self, name: Self.bridgeName)
        userContentController.addUserScript(
            WKUserScript(
                source: Self.bridgeBootstrapScript,
                injectionTime: .atDocumentStart,
                forMainFrameOnly: true
            )
        )

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

        // Keep manual lifetime control. AppKit's implicit release-on-close
        // path can crash while cleaning up NSWindow transform animations for
        // rapidly docked borderless panels. We explicitly nil our strong
        // reference after close() so the panel can still deallocate once
        // teardown is complete.
        panel?.isReleasedWhenClosed = false
        panel?.backgroundColor = .clear
        panel?.isOpaque = false
        panel?.alphaValue = 0.001
        panel?.hasShadow = false
        panel?.hidesOnDeactivate = false
        panel?.isFloatingPanel = true
        panel?.lifecycleCardID = cardID
        configurePanelForGlobalOverlay()
        panel?.collectionBehavior = MainWindowController.overlayCollectionBehavior
        panel?.delegate = self
        panel?.contentView = contentView
        applyCornerMask(to: contentView)

        if Self.debugLifecycle {
            Self.lifecycle.info("webView created(cardId=\(cardID, privacy: .public))")
        }

        loadFrontend()
    }

    deinit {
        guard Self.debugLifecycle else {
            return
        }

        Self.lifecycle.info("deinit FloatingCardPanelController(cardId=\(self.cardID, privacy: .public)) controller=FloatingNoteWindowController")
    }

    func updatePayload(_ payload: Any) {
        pendingPayload = payload
        applyPendingPayloadIfPossible()
    }

    var currentFrame: NSRect {
        panel?.frame ?? .zero
    }

    func focusWindow() {
        guard !isDestroyed, let panel else { return }
        panel.orderFrontRegardless()
        panel.makeKey()
        focusWebView()
    }

    func showWindow(frame: NSRect, updateMinimumSize: Bool = true) {
        guard !isDestroyed else { return }
        guard let panel else { return }
        if updateMinimumSize {
            minimumContentSize = frame.size
        }
        pendingShowFrame = frame
        panel.setFrame(frame, display: true)
        guard isContentReady else {
            panel.alphaValue = 0.001
            panel.orderFrontRegardless()
            return
        }
        panel.alphaValue = 1
        panel.orderFrontRegardless()
        focusWebView()
    }

    func closeWindow() {
        guard !isDestroyed else { return }
        isDestroyed = true

        if Self.debugLifecycle {
            Self.lifecycle.info("destroyPanelStart(cardId=\(self.cardID, privacy: .public))")
        }

        // 1. Break callbacks FIRST — they capture weak self but we nil
        //    them explicitly so no accidental re-entry during teardown.
        onMove = nil
        onClose = nil
        onRequestDrag = nil
        onSetDesktopPinned = nil
        onRequestDesktopWidget = nil
        onRemoveDesktopWidgetAssociation = nil
        onGetDesktopWidgetState = nil
        onFrameChange = nil
        onLoadAllData = nil
        onSaveNotes = nil
        onSaveTodos = nil
        onSaveSettings = nil
        onReadClipboardText = nil
        onWriteClipboardText = nil
        onPickScreenColor = nil

        guard let panel else {
            pendingPayload = nil
            isReady = false
            return
        }

        // 2. Detach WebKit delegates, remove injected bridge hooks, and
        //    shut down the content process. stopLoading() alone does not
        //    terminate the WebContent process — loading a blank page after
        //    removing handlers forces the process to wind down, which
        //    prevents zombie processes from accumulating in the shared
        //    WKProcessPool and killing the main WebView with a Script error.
        webView.navigationDelegate = nil
        webView.uiDelegate = nil
        webView.stopLoading()
        webView.configuration.userContentController.removeAllUserScripts()

        if Self.debugLifecycle {
            Self.lifecycle.info("webView stopLoading(cardId=\(self.cardID, privacy: .public))")
        }

        // 3. Remove the script message handler.  This breaks the retain
        //    cycle: WKUserContentController → self → webView.
        webView.configuration.userContentController.removeScriptMessageHandler(forName: Self.bridgeName)

        if Self.debugLifecycle {
            Self.lifecycle.info("removeHandlers(cardId=\(self.cardID, privacy: .public))")
        }

        webView.loadHTMLString("<html><body></body></html>", baseURL: nil)

        // 4. Fully tear down the view hierarchy — remove the WebView
        //    from its superview before releasing the contentView.
        webView.removeFromSuperview()
        panel.contentViewController = nil
        panel.contentView = nil

        if Self.debugLifecycle {
            Self.lifecycle.info("contentView removed(cardId=\(self.cardID, privacy: .public))")
        }

        // 5. Close and order out the panel.  isReleasedWhenClosed remains
        //    false so the panel is not double-released — the controller
        //    keeps its strong reference and the panel deallocs when the
        //    controller deinits.
        panel.delegate = nil
        panel.orderOut(nil)
        panel.close()
        self.panel = nil

        if Self.debugLifecycle {
            Self.lifecycle.info("panel closed(cardId=\(self.cardID, privacy: .public))")
        }

        // 6. Clear remaining transient state.
        pendingPayload = nil
        isReady = false
        isEditableInputActive = false
        isTextCompositionActive = false
    }

    func startWindowDrag() -> NSEvent? {
        // NSPanel.performDrag(with:) does not work for borderless
        // NSPanels — it returns immediately with 0 move events.
        // Instead, implement a manual event-tracking loop that
        // reads mouse drag events and moves the panel frame.
        let initialMouse = NSEvent.mouseLocation
        guard let panel else {
            return nil
        }

        let initialOrigin = panel.frame.origin
        let eventMask: NSEvent.EventTypeMask = [.leftMouseDragged, .leftMouseUp]

        Self.diagnostics.info("startWindowDrag manual tracking initialMouse=(\(Int(initialMouse.x)),\(Int(initialMouse.y))) initialOrigin=(\(Int(initialOrigin.x)),\(Int(initialOrigin.y)))")

        var mouseUpEvent: NSEvent?

        while true {
            guard let event = NSApp.nextEvent(
                matching: eventMask,
                until: .distantFuture,
                inMode: .eventTracking,
                dequeue: true
            ) else {
                continue
            }

            switch event.type {
            case .leftMouseUp:
                mouseUpEvent = event
                Self.diagnostics.info("startWindowDrag manual tracking ended on mouseUp")
                break
            case .leftMouseDragged:
                // Use current screen-space mouse position for delta.
                let currentMouse = NSEvent.mouseLocation
                let deltaX = currentMouse.x - initialMouse.x
                let deltaY = currentMouse.y - initialMouse.y
                let newOrigin = NSPoint(
                    x: initialOrigin.x + deltaX,
                    y: initialOrigin.y + deltaY
                )
                panel.setFrameOrigin(newOrigin)
            default:
                break
            }

            // Exit after processing the mouseUp case above.
            if mouseUpEvent != nil {
                break
            }
        }

        return mouseUpEvent
    }

    func restoreWebViewInputAfterDrag(mouseUpEvent: NSEvent?) {
        guard !isDestroyed else {
            return
        }

        // The manual drag loop consumes mouseUp before WKWebView sees it.
        // Make the floating panel/web view key again before replaying the
        // release so WebKit does not require a focus-only click before the
        // next pointerDown can start another drag.
        focusWebView()

        if let mouseUpEvent {
            NSApp.postEvent(mouseUpEvent, atStart: false)
        }
    }

    private func setEditableInputActive(_ active: Bool) {
        isEditableInputActive = active

        if !active {
            isTextCompositionActive = false
        }

        updatePanelPresentationForCurrentInteraction()
    }

    private func setTextCompositionActive(_ active: Bool) {
        isTextCompositionActive = active

        if active {
            isEditableInputActive = true
        }

        updatePanelPresentationForCurrentInteraction()
    }

    private func resizeContent(
        width: CGFloat,
        height: CGFloat,
        anchor: String = "top",
        horizontalAnchor: String = "left",
        allowBelowMinimum: Bool = false
    ) {
        guard !isDestroyed, let panel, width > 0, height > 0 else {
            return
        }

        let nextWidth = allowBelowMinimum ? width.rounded(.up) : max(width.rounded(.up), minimumContentSize.width)
        let nextHeight = allowBelowMinimum ? height.rounded(.up) : max(height.rounded(.up), minimumContentSize.height)
        let currentFrame = panel.frame

        guard abs(currentFrame.width - nextWidth) >= 1 || abs(currentFrame.height - nextHeight) >= 1 else {
            return
        }

        let shouldPinBottom = anchor == "bottom"
        let shouldPinRight = horizontalAnchor == "right"
        var nextFrame = NSRect(
            x: shouldPinRight ? currentFrame.maxX - nextWidth : currentFrame.origin.x,
            y: shouldPinBottom ? currentFrame.origin.y : currentFrame.maxY - nextHeight,
            width: nextWidth,
            height: nextHeight
        )

        if let visibleFrame = (panel.screen ?? NSScreen.screens.first { $0.frame.intersects(currentFrame) })?.visibleFrame {
            let maxX = max(visibleFrame.minX, visibleFrame.maxX - nextWidth)
            nextFrame.origin.x = min(max(nextFrame.origin.x, visibleFrame.minX), maxX)
        }

        // Keep the card's vertical anchor fixed even when the dialog window
        // grows beyond the visible screen bounds.
        panel.setFrame(
            nextFrame,
            display: true
        )
        pendingShowFrame = nextFrame
        panel.orderFrontRegardless()
        onFrameChange?(nextFrame)
    }

    private func currentScreenPlacement() -> [String: Any]? {
        guard let panel else {
            return nil
        }

        let cardFrame = panel.frame
        let screen = panel.screen ?? NSScreen.screens.first { screen in
            screen.frame.intersects(cardFrame)
        }
        let availableFrame = screen?.visibleFrame ?? cardFrame

        return [
            "cardFrame": [
                "left": cardFrame.minX,
                "top": cardFrame.minY,
                "width": cardFrame.width,
                "height": cardFrame.height,
            ],
            "availableFrame": [
                "left": availableFrame.minX,
                "top": availableFrame.minY,
                "width": availableFrame.width,
                "height": availableFrame.height,
            ],
        ]
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard !isDestroyed else { return }
        isReady = true
        applyPendingPayloadIfPossible()
        focusWebView()
    }

    private func focusWebView() {
        guard !isDestroyed, let panel, panel.isVisible else {
            return
        }

        NSApp.activate(ignoringOtherApps: true)
        panel.orderFrontRegardless()
        panel.makeKey()
        panel.makeFirstResponder(webView)
    }

    private func configurePanelForGlobalOverlay() {
        panel?.level = MainWindowController.overlayPanelLevel
    }

    func setDesktopPinned(_ pinned: Bool) {
        guard !isDestroyed, isDesktopPinned != pinned else { return }
        replacePanelForDesktopMode(pinned)
        guard let panel else { return }
        isDesktopPinned = pinned
        if pinned {
            let desktopIconLevel = Int(CGWindowLevelForKey(.desktopIconWindow)) + 1
            panel.level = NSWindow.Level(rawValue: desktopIconLevel)
            panel.collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle]
        } else {
            panel.collectionBehavior = MainWindowController.overlayCollectionBehavior
            configurePanelForGlobalOverlay()
        }
        if isContentReady {
            panel.orderFrontRegardless()
        }
    }

    private func replacePanelForDesktopMode(_ desktopPinned: Bool) {
        guard let previousPanel = panel else { return }

        let replacement: FloatingPanel
        if desktopPinned {
            replacement = DesktopCardPanel(
                contentRect: previousPanel.frame,
                styleMask: [.borderless, .nonactivatingPanel],
                backing: .buffered,
                defer: false
            )
        } else {
            replacement = FloatingPanel(
                contentRect: previousPanel.frame,
                styleMask: [.borderless, .nonactivatingPanel],
                backing: .buffered,
                defer: false
            )
        }

        let contentView = previousPanel.contentView
        previousPanel.contentView = nil

        replacement.isReleasedWhenClosed = false
        replacement.backgroundColor = .clear
        replacement.isOpaque = false
        replacement.alphaValue = previousPanel.alphaValue
        replacement.hasShadow = false
        replacement.hidesOnDeactivate = false
        replacement.isFloatingPanel = true
        replacement.lifecycleCardID = cardID
        replacement.delegate = self
        replacement.contentView = contentView
        replacement.setFrame(previousPanel.frame, display: false)

        let wasVisible = previousPanel.isVisible
        previousPanel.delegate = nil
        previousPanel.orderOut(nil)
        previousPanel.close()
        panel = replacement

        if wasVisible {
            replacement.orderFrontRegardless()
            if isContentReady {
                replacement.makeKey()
                replacement.makeFirstResponder(webView)
            }
        }
    }

    private func configurePanelForInteractiveInput() {
        panel?.level = Self.interactiveInputPanelLevel
    }

    private func configurePanelForTextComposition() {
        panel?.level = Self.textCompositionPanelLevel
    }

    private func updatePanelPresentationForCurrentInteraction() {
        guard let panel, panel.isVisible else {
            return
        }

        if isDesktopPinned {
            setDesktopPinned(true)
            return
        }

        if isTextCompositionActive {
            configurePanelForTextComposition()
            panel.orderFrontRegardless()
            return
        }

        if isEditableInputActive {
            configurePanelForInteractiveInput()
            panel.orderFrontRegardless()
            return
        }

        configurePanelForGlobalOverlay()
        panel.orderFrontRegardless()
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard
            !isDestroyed,
            message.name == Self.bridgeName,
            let body = message.body as? [String: Any],
            let method = body["method"] as? String
        else {
            return
        }

        let params = body["params"] as? [String: Any] ?? [:]
        let requestID = body["id"] as? Int ?? 0

        switch method {
        case "closeFloatingCard":
            let kind = params["kind"] as? String ?? cardKind
            let requestedCardID = params["id"] as? String ?? cardID
            onClose?(kind, requestedCardID)
            resolveBridgeRequest(id: requestID, ok: true, result: NSNull())
        case "startFloatingCardDrag":
            let kind = params["kind"] as? String ?? cardKind
            let requestedCardID = params["id"] as? String ?? cardID
            Self.diagnostics.info("WKScriptMessage startFloatingCardDrag kind=\(kind, privacy: .public) id=\(requestedCardID, privacy: .public) onRequestDrag=\(self.onRequestDrag != nil)")
            onRequestDrag?(kind, requestedCardID)
            resolveBridgeRequest(id: requestID, ok: true, result: NSNull())
        case "setFloatingCardDesktopPinned":
            let kind = params["kind"] as? String ?? cardKind
            let requestedCardID = params["id"] as? String ?? cardID
            let pinned = params["pinned"] as? Bool ?? false
            onSetDesktopPinned?(kind, requestedCardID, pinned)
            resolveBridgeRequest(id: requestID, ok: true, result: NSNull())
        case "requestDesktopWidget":
            do {
                resolveBridgeRequest(id: requestID, ok: true, result: try onRequestDesktopWidget?(cardKind, cardID) ?? [:])
            } catch {
                resolveBridgeRequest(id: requestID, ok: false, result: error.localizedDescription)
            }
        case "removeDesktopWidgetAssociation":
            do {
                try onRemoveDesktopWidgetAssociation?(cardKind, cardID)
                resolveBridgeRequest(id: requestID, ok: true, result: NSNull())
            } catch {
                resolveBridgeRequest(id: requestID, ok: false, result: error.localizedDescription)
            }
        case "getDesktopWidgetState":
            do {
                resolveBridgeRequest(id: requestID, ok: true, result: try onGetDesktopWidgetState?(cardKind, cardID) ?? [:])
            } catch {
                resolveBridgeRequest(id: requestID, ok: false, result: error.localizedDescription)
            }
        case "getCapabilities":
            resolveBridgeRequest(id: requestID, ok: true, result: floatingCapabilities())
        case "loadAllData":
            do {
                resolveBridgeRequest(id: requestID, ok: true, result: try onLoadAllData?() ?? [:])
            } catch {
                resolveBridgeRequest(id: requestID, ok: false, result: error.localizedDescription)
            }
        case "saveNotes":
            do {
                try onSaveNotes?(params["cards"] ?? [])
                resolveBridgeRequest(id: requestID, ok: true, result: NSNull())
            } catch {
                resolveBridgeRequest(id: requestID, ok: false, result: error.localizedDescription)
            }
        case "saveTodos":
            do {
                try onSaveTodos?(params["todos"] ?? [])
                resolveBridgeRequest(id: requestID, ok: true, result: NSNull())
            } catch {
                resolveBridgeRequest(id: requestID, ok: false, result: error.localizedDescription)
            }
        case "saveSettings":
            do {
                try onSaveSettings?(params["settings"] ?? [:])
                resolveBridgeRequest(id: requestID, ok: true, result: NSNull())
            } catch {
                resolveBridgeRequest(id: requestID, ok: false, result: error.localizedDescription)
            }
        case "readClipboardText":
            resolveBridgeRequest(id: requestID, ok: true, result: onReadClipboardText?() ?? "")
        case "writeClipboardText":
            onWriteClipboardText?(params["text"] as? String ?? "")
            resolveBridgeRequest(id: requestID, ok: true, result: NSNull())
        case "pickScreenColor":
            Task { @MainActor [weak self] in
                guard let self else {
                    return
                }

                do {
                    if let colorHex = try await self.onPickScreenColor?() {
                        self.resolveBridgeRequest(id: requestID, ok: true, result: ["sRGBHex": colorHex])
                    } else {
                        self.resolveBridgeRequest(id: requestID, ok: true, result: NSNull())
                    }
                } catch {
                    self.resolveBridgeRequest(id: requestID, ok: false, result: error.localizedDescription)
                }
            }
        case "resizeFloatingCard":
            let width = params["width"] as? Double ?? 0
            let height = params["height"] as? Double ?? 0
            resizeContent(
                width: CGFloat(width),
                height: CGFloat(height),
                anchor: params["anchor"] as? String ?? "top",
                horizontalAnchor: params["horizontalAnchor"] as? String ?? "left",
                allowBelowMinimum: params["allowBelowMinimum"] as? Bool ?? false
            )
            resolveBridgeRequest(id: requestID, ok: true, result: NSNull())
        case "getFloatingCardScreenPlacement":
            resolveBridgeRequest(id: requestID, ok: true, result: currentScreenPlacement() ?? NSNull())
        case "setEditableInputActive":
            setEditableInputActive(params["active"] as? Bool ?? false)
            resolveBridgeRequest(id: requestID, ok: true, result: NSNull())
        case "setTextCompositionActive":
            setTextCompositionActive(params["active"] as? Bool ?? false)
            resolveBridgeRequest(id: requestID, ok: true, result: NSNull())
        default:
            resolveBridgeRequest(id: requestID, ok: true, result: NSNull())
            break
        }
    }

    func windowDidMove(_ notification: Notification) {
        guard let panel else {
            return
        }

        let f = panel.frame
        Self.diagnostics.info("windowDidMove frame=(\(Int(f.origin.x)),\(Int(f.origin.y)),\(Int(f.size.width))x\(Int(f.size.height))) onMove=\(self.onMove != nil)")
        onMove?(panel.frame)
    }

    private func loadFrontend() {
        guard let indexURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") else {
            return
        }

        let previewURL = URL(string: "\(indexURL.absoluteString)?mode=floating-note") ?? indexURL
        webView.loadFileURL(previewURL, allowingReadAccessTo: indexURL.deletingLastPathComponent())
    }

    private func applyPendingPayloadIfPossible() {
        guard
            !isDestroyed,
            isReady,
            let payload = pendingPayload,
            let json = jsonString(for: payload)
        else {
            return
        }

        webView.callAsyncJavaScript(
            """
            window.__STICKIT_FLOATING_CARD_STATE__ = \(json);
            window.dispatchEvent(new CustomEvent('\(Self.floatingCardStateEventName)', { detail: \(json) }));
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            return true;
            """,
            arguments: [:],
            in: nil,
            in: .page,
            completionHandler: { [weak self] result in
                guard let self, !self.isDestroyed, case .success = result else { return }
                self.isContentReady = true
                guard let panel = self.panel, let frame = self.pendingShowFrame else { return }
                panel.setFrame(frame, display: true)
                panel.alphaValue = 1
                panel.orderFrontRegardless()
                self.focusWebView()
            }
        )
    }

    private func applyCornerMask(to contentView: NSView) {
        let radius: CGFloat = cardKind == "todo" ? 18 : 28

        [contentView.layer, webView.layer].forEach { layer in
            layer?.cornerRadius = radius
            layer?.cornerCurve = .continuous
            layer?.masksToBounds = true
        }
    }

    private func jsonString(for value: Any) -> String? {
        let canSerializeFragment = value is String || value is NSNumber || value is NSNull
        guard canSerializeFragment || JSONSerialization.isValidJSONObject(value) else {
            return nil
        }

        guard
            let data = try? JSONSerialization.data(withJSONObject: value, options: [.fragmentsAllowed, .sortedKeys]),
            let json = String(data: data, encoding: .utf8)
        else {
            return nil
        }

        return json
    }

    private func resolveBridgeRequest(id: Int, ok: Bool, result: Any) {
        guard !isDestroyed, id > 0, let json = jsonString(for: result) else {
            return
        }

        webView.evaluateJavaScript(
            "window.__stickItFloatingReceive?.(\(id), \(ok ? "true" : "false"), \(json));"
        )
    }

    private func floatingCapabilities() -> [String: Any] {
        [
            "platform": "macos",
            "runtime": "AppKit WKWebView floating",
            "capabilities": [
                "window.show": false,
                "window.hide": false,
                "window.toggle": false,
                "window.alwaysOnTop": true,
                "window.dragPreview": false,
                "window.floatingCards": true,
                "notifications.send": false,
                "notifications.schedule": false,
                "notifications.openSettings": false,
                "shortcuts.global": false,
                "settings.persist": true,
                "clipboard.read": true,
                "clipboard.write": true,
                "devtools.open": false,
                "app.quit": false,
            ],
        ]
    }
}
