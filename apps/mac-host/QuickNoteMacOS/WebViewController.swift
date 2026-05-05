import AppKit
import OSLog
import WebKit

@MainActor
final class WebViewController: NSViewController, WKNavigationDelegate {
    private static let bridgeName = "quickNoteHost"
    private static let panelWillOpenEventName = "quicknote:panel-will-open"
    private static let hotkeyRegistrationStateEventName = "quicknote:hotkey-registration-state"
    private static let textColorPanelChangeEventName = "quicknote:text-color-panel-change"
    private static let textColorPanelCloseEventName = "quicknote:text-color-panel-close"
    private static let todosUpdatedEventName = "quicknote:todos-updated"
    private static let frontendBootstrapProbeScript = """
    (() => {
      const root = document.getElementById("root");
      const html = document.documentElement;
      const bodyText = document.body?.innerText?.trim() ?? "";
      const rootText = root?.innerText?.trim() ?? "";

      return {
        bodyTextLength: bodyText.length,
        frontendState: html?.dataset.quicknoteFrontendState ?? "",
        hasBridge: typeof window.quickNoteHost === "object" && typeof window.quickNoteHost.loadAllData === "function",
        hasReceiver: typeof window.__quickNoteNativeReceive === "function",
        readyState: document.readyState,
        rootChildCount: root?.childElementCount ?? 0,
        rootTextLength: rootText.length,
      };
    })();
    """

    weak var bridgeDelegate: QuickNoteNativeBridgeHandling?

    private let webView: WKWebView
    private var currentLanguage: QuickNoteLanguage
    private let containerView = NSView()
    private let loadingOverlay = NSView()
    private let loadingTitleLabel = NSTextField(labelWithString: "Loading QuickNote...")
    private let loadingDetailLabel = NSTextField(labelWithString: "Preparing the local app interface.")
    private let scriptMessageProxy = ScriptMessageProxy()
    private let logger = Logger(subsystem: "com.quicknote.app", category: "WebView")
    private var hasRetriedAfterTermination = false
    private var frontendProbeAttemptsRemaining = 0
    private var languageObserver: NSObjectProtocol?

    private var localization: QuickNoteLocalization {
        currentLanguage.localization
    }

    init(storage: AppStorage, bridgeDelegate: QuickNoteNativeBridgeHandling?) {
        self.bridgeDelegate = bridgeDelegate
        self.currentLanguage = (try? storage.currentLanguage()) ?? .english

        let userContentController = WKUserContentController()
        let configuration = WKWebViewConfiguration()
        configuration.userContentController = userContentController
        configuration.preferences.setValue(true, forKey: "developerExtrasEnabled")

        webView = WKWebView(frame: .zero, configuration: configuration)

        super.init(nibName: nil, bundle: nil)

        scriptMessageProxy.owner = self
        installLanguageObserver()
        userContentController.add(scriptMessageProxy, name: Self.bridgeName)
        userContentController.addUserScript(
            WKUserScript(
                source: Self.bridgeBootstrapScript,
                injectionTime: .atDocumentStart,
                forMainFrameOnly: true
            )
        )

        webView.navigationDelegate = self
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.underPageBackgroundColor = .clear
        webView.setValue(false, forKey: "drawsBackground")
        webView.allowsMagnification = false

        loadFrontend()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        nil
    }

    deinit {
        if let languageObserver {
            NotificationCenter.default.removeObserver(languageObserver)
        }
    }

    override func loadView() {
        containerView.wantsLayer = true
        containerView.layer?.backgroundColor = Self.hostBackgroundColor.cgColor

        containerView.addSubview(webView)
        configureLoadingOverlay()
        containerView.addSubview(loadingOverlay)

        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: containerView.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: containerView.trailingAnchor),
            webView.topAnchor.constraint(equalTo: containerView.topAnchor),
            webView.bottomAnchor.constraint(equalTo: containerView.bottomAnchor),
            loadingOverlay.leadingAnchor.constraint(equalTo: containerView.leadingAnchor),
            loadingOverlay.trailingAnchor.constraint(equalTo: containerView.trailingAnchor),
            loadingOverlay.topAnchor.constraint(equalTo: containerView.topAnchor),
            loadingOverlay.bottomAnchor.constraint(equalTo: containerView.bottomAnchor),
        ])

        view = containerView
    }

    func emitPanelPosition(_ point: CGPoint) {
        let payload: [String: Any] = [
            "x": Int(point.x.rounded()),
            "y": Int(point.y.rounded()),
        ]

        guard let json = jsonString(for: payload) else {
            return
        }

        webView.evaluateJavaScript(
            "window.dispatchEvent(new CustomEvent('quicknote:panel-position', { detail: \(json) }));"
        )
    }

    func emitPanelWillOpen() {
        webView.evaluateJavaScript(
            "window.dispatchEvent(new Event('\(Self.panelWillOpenEventName)'));"
        )
    }

    func emitHotkeyRegistrationState(_ state: [String: Any]) {
        guard let json = jsonString(for: state) else {
            return
        }

        webView.evaluateJavaScript(
            "window.dispatchEvent(new CustomEvent('\(Self.hotkeyRegistrationStateEventName)', { detail: \(json) }));"
        )
    }

    func emitTextColorPanelChange(requestID: String, colorHex: String) {
        let payload: [String: Any] = [
            "color": colorHex,
            "requestId": requestID
        ]

        guard let json = jsonString(for: payload) else {
            return
        }

        webView.evaluateJavaScript(
            "window.dispatchEvent(new CustomEvent('\(Self.textColorPanelChangeEventName)', { detail: \(json) }));"
        )
    }

    func emitTextColorPanelClose(requestID: String) {
        let payload: [String: Any] = [
            "requestId": requestID
        ]

        guard let json = jsonString(for: payload) else {
            return
        }

        webView.evaluateJavaScript(
            "window.dispatchEvent(new CustomEvent('\(Self.textColorPanelCloseEventName)', { detail: \(json) }));"
        )
    }

    func emitTodosUpdated(_ todos: Any) {
        guard let json = jsonString(for: todos) else {
            return
        }

        webView.evaluateJavaScript(
            "window.dispatchEvent(new CustomEvent('\(Self.todosUpdatedEventName)', { detail: \(json) }));"
        )
    }

    private func loadFrontend() {
        guard let indexURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") else {
            logger.error("Missing bundled frontend assets in QuickNote.app/Contents/Resources/web.")
            showLoadingOverlay(
                title: localization.missingInterfaceTitle,
                detail: localization.missingInterfaceDetail
            )
            webView.loadHTMLString(Self.missingBundleHTML(for: currentLanguage), baseURL: nil)
            return
        }

        logger.info("Loading bundled frontend from \(indexURL.path, privacy: .public)")
        showLoadingOverlay(
            title: localization.loadingTitle,
            detail: localization.loadingDetail
        )
        webView.loadFileURL(indexURL, allowingReadAccessTo: indexURL.deletingLastPathComponent())
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        logger.info("Started provisional WebView navigation. url=\(webView.url?.absoluteString ?? "nil", privacy: .public)")
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        hasRetriedAfterTermination = false
        logger.info("Finished WebView navigation. url=\(webView.url?.absoluteString ?? "nil", privacy: .public)")
        beginFrontendProbe()
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        handleNavigationFailure(error, stage: "committed")
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        handleNavigationFailure(error, stage: "provisional")
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        logger.error("WebView content process terminated.")

        guard !hasRetriedAfterTermination else {
            showLoadingOverlay(
                title: localization.recoverWindowTitle,
                detail: localization.recoverWindowDetail
            )
            return
        }

        hasRetriedAfterTermination = true
        showLoadingOverlay(
            title: localization.reconnectingTitle,
            detail: localization.reconnectingDetail
        )
        webView.reload()
    }

    func handle(message: WKScriptMessage) {
        guard
            let body = message.body as? [String: Any],
            let method = body["method"] as? String
        else {
            return
        }

        let id = body["id"] as? Int
        let params = body["params"] as? [String: Any] ?? [:]

        switch method {
        case "frontendReady":
            logger.info("Frontend reported that the initial UI is ready.")
            if let state = bridgeDelegate?.currentHotKeyRegistrationState() {
                emitHotkeyRegistrationState(state)
            }
            hideLoadingOverlay()
            return
        case "setEditableInputActive":
            guard let active = params["active"] as? Bool else {
                logger.error("Bridge method 'setEditableInputActive' was missing a Boolean active flag.")
                return
            }

            bridgeDelegate?.setEditableInputActiveFromBridge(active)
            return
        case "setTextCompositionActive":
            guard let active = params["active"] as? Bool else {
                logger.error("Bridge method 'setTextCompositionActive' was missing a Boolean active flag.")
                return
            }

            bridgeDelegate?.setTextCompositionActiveFromBridge(active)
            return
        case "reportFrontendError":
            let source = params["source"] as? String ?? "unknown"
            let message = params["message"] as? String ?? "Unknown frontend error."
            logger.error("Frontend reported an error from \(source, privacy: .public): \(message, privacy: .public)")
            showLoadingOverlay(
                title: localization.finishLoadingTitle,
                detail: message
            )
            return
        default:
            logger.debug("Received bridge request from WebView. method=\(method, privacy: .public)")
            break
        }

        guard let id else {
            logger.error("Bridge method '\(method, privacy: .public)' was missing a request id.")
            return
        }

        if method == "testReminderNotification" {
            let soundEnabled = params["soundEnabled"] as? Bool ?? true
            let language = QuickNoteLanguage(storedValue: params["language"])

            Task { @MainActor [weak self] in
                guard let self else {
                    return
                }

                do {
                    try await self.bridgeDelegate?.testReminderNotification(soundEnabled: soundEnabled, language: language)
                    self.sendResponse(id: id, ok: true, payload: NSNull())
                } catch {
                    let errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
                    self.sendResponse(id: id, ok: false, payload: errorMessage)
                }
            }
            return
        }

        do {
            let result: Any

            switch method {
            case "getCapabilities":
                result = [
                    "platform": "macos",
                    "runtime": "appkit-wkwebview",
                    "capabilities": [
                        "window.show": true,
                        "window.hide": true,
                        "window.toggle": true,
                        "window.minimize": true,
                        "window.maximize": true,
                        "window.close": true,
                        "window.drag": true,
                        "window.alwaysOnTop": true,
                        "notifications.send": true,
                        "notifications.schedule": true,
                        "notifications.openSettings": true,
                        "shortcuts.global": true,
                        "settings.persist": true,
                        "clipboard.read": true,
                        "clipboard.write": true,
                        "devtools.open": true,
                        "app.quit": true,
                    ],
                    "limitations": [],
                ]
            case "loadAllData":
                result = try bridgeDelegate?.loadAllData() ?? [:]
            case "getHotkeyRegistrationState":
                result = bridgeDelegate?.currentHotKeyRegistrationState() ?? [:]
            case "saveNotes":
                guard let cards = params["cards"] else {
                    throw QuickNoteBridgeError.invalidParameters("QuickNote expected notes data from JavaScript.")
                }
                try bridgeDelegate?.saveNotes(cards)
                result = NSNull()
            case "saveTodos":
                guard let todos = params["todos"] else {
                    throw QuickNoteBridgeError.invalidParameters("QuickNote expected todos data from JavaScript.")
                }
                try bridgeDelegate?.saveTodos(todos)
                result = NSNull()
            case "saveSettings":
                guard let settings = params["settings"] else {
                    throw QuickNoteBridgeError.invalidParameters("QuickNote expected settings data from JavaScript.")
                }
                try bridgeDelegate?.saveSettings(settings)
                result = NSNull()
            case "openNotificationSettings":
                try bridgeDelegate?.openNotificationSettings()
                result = NSNull()
            case "openTextColorPanel":
                guard let requestID = params["requestId"] as? String, !requestID.isEmpty else {
                    throw QuickNoteBridgeError.invalidParameters("QuickNote expected a text color panel request id from JavaScript.")
                }
                let colorHex = params["color"] as? String
                try bridgeDelegate?.openTextColorPanel(requestID: requestID, colorHex: colorHex)
                result = NSNull()
            case "registerHotkey", "registerGlobalShortcut":
                guard let shortcut = params["shortcut"] as? String else {
                    throw QuickNoteBridgeError.invalidParameters("QuickNote expected a shortcut string from JavaScript.")
                }
                try bridgeDelegate?.registerHotKey(shortcut: shortcut)
                result = NSNull()
            case "unregisterHotkey":
                try bridgeDelegate?.registerHotKey(shortcut: GlobalHotKeyManager.defaultShortcut)
                result = NSNull()
            case "readClipboardText":
                result = bridgeDelegate?.readClipboardText() ?? ""
            case "showWindow":
                bridgeDelegate?.showMainWindowFromBridge()
                result = NSNull()
            case "hideWindow", "hidePanelWindow":
                bridgeDelegate?.hideMainWindowFromBridge()
                result = NSNull()
            case "toggleWindow":
                bridgeDelegate?.toggleMainWindowFromBridge()
                result = NSNull()
            case "minimizeWindow":
                bridgeDelegate?.minimizeMainWindowFromBridge()
                result = NSNull()
            case "maximizeWindow":
                bridgeDelegate?.maximizeMainWindowFromBridge()
                result = NSNull()
            case "closeWindow":
                bridgeDelegate?.closeMainWindowFromBridge()
                result = NSNull()
            case "setAlwaysOnTop":
                bridgeDelegate?.setAlwaysOnTopFromBridge(params["enabled"] as? Bool ?? true)
                result = NSNull()
            case "quitApplication":
                bridgeDelegate?.quitApplicationFromBridge()
                result = NSNull()
            case "startWindowDrag":
                try bridgeDelegate?.startWindowDragFromBridge()
                result = NSNull()
            case "writeClipboardText":
                let text = params["text"] as? String ?? ""
                bridgeDelegate?.writeClipboardText(text)
                result = NSNull()
            case "sendNotification", "showNotification", "scheduleNotification":
                let notificationID = params["id"] as? String
                let title = params["title"] as? String ?? "QuickNote"
                let body = params["body"] as? String ?? ""
                let soundEnabled = params["soundEnabled"] as? Bool ?? true
                let scheduledAt = (params["scheduledAt"] as? Double ?? (params["scheduledAt"] as? Int).map(Double.init))
                    .map { Date(timeIntervalSince1970: $0 / 1000) }

                Task { @MainActor [weak self] in
                    guard let self else {
                        return
                    }

                    do {
                        if method == "scheduleNotification" {
                            try await self.bridgeDelegate?.scheduleNotification(
                                id: notificationID,
                                title: title,
                                body: body,
                                scheduledAt: scheduledAt,
                                soundEnabled: soundEnabled
                            )
                        } else {
                            try await self.bridgeDelegate?.sendNotification(
                                id: notificationID,
                                title: title,
                                body: body,
                                soundEnabled: soundEnabled
                            )
                        }

                        self.sendResponse(id: id, ok: true, payload: NSNull())
                    } catch {
                        let errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
                        self.sendResponse(id: id, ok: false, payload: errorMessage)
                    }
                }
                return
            case "openDevTools":
                if #available(macOS 13.3, *) {
                    webView.isInspectable = true
                }
                result = NSNull()
            default:
                throw QuickNoteBridgeError.invalidParameters("QuickNote does not support the native bridge method '\(method)'.")
            }

            sendResponse(id: id, ok: true, payload: result)
        } catch {
            let errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            sendResponse(id: id, ok: false, payload: errorMessage)
        }
    }

    private func sendResponse(id: Int, ok: Bool, payload: Any) {
        let jsonPayload: [String: Any] = ok
            ? ["id": id, "ok": true, "result": payload]
            : ["id": id, "ok": false, "error": payload]

        guard let json = jsonString(for: jsonPayload) else {
            return
        }

        webView.evaluateJavaScript("window.__quickNoteNativeReceive(\(json));")
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

    private func configureLoadingOverlay() {
        loadingOverlay.translatesAutoresizingMaskIntoConstraints = false
        loadingOverlay.wantsLayer = true
        loadingOverlay.layer?.backgroundColor = Self.hostBackgroundColor.cgColor

        loadingTitleLabel.stringValue = localization.loadingTitle
        loadingTitleLabel.translatesAutoresizingMaskIntoConstraints = false
        loadingTitleLabel.textColor = NSColor(calibratedRed: 0.12, green: 0.10, blue: 0.08, alpha: 1)
        loadingTitleLabel.font = .systemFont(ofSize: 18, weight: .semibold)
        loadingTitleLabel.alignment = .center

        loadingDetailLabel.stringValue = localization.loadingDetail
        loadingDetailLabel.translatesAutoresizingMaskIntoConstraints = false
        loadingDetailLabel.textColor = NSColor(calibratedRed: 0.38, green: 0.34, blue: 0.30, alpha: 1)
        loadingDetailLabel.font = .systemFont(ofSize: 13, weight: .medium)
        loadingDetailLabel.alignment = .center
        loadingDetailLabel.maximumNumberOfLines = 2
        loadingDetailLabel.lineBreakMode = .byWordWrapping

        loadingOverlay.addSubview(loadingTitleLabel)
        loadingOverlay.addSubview(loadingDetailLabel)

        NSLayoutConstraint.activate([
            loadingTitleLabel.centerXAnchor.constraint(equalTo: loadingOverlay.centerXAnchor),
            loadingTitleLabel.centerYAnchor.constraint(equalTo: loadingOverlay.centerYAnchor, constant: -12),
            loadingTitleLabel.leadingAnchor.constraint(greaterThanOrEqualTo: loadingOverlay.leadingAnchor, constant: 32),
            loadingTitleLabel.trailingAnchor.constraint(lessThanOrEqualTo: loadingOverlay.trailingAnchor, constant: -32),
            loadingDetailLabel.topAnchor.constraint(equalTo: loadingTitleLabel.bottomAnchor, constant: 10),
            loadingDetailLabel.centerXAnchor.constraint(equalTo: loadingOverlay.centerXAnchor),
            loadingDetailLabel.leadingAnchor.constraint(greaterThanOrEqualTo: loadingOverlay.leadingAnchor, constant: 32),
            loadingDetailLabel.trailingAnchor.constraint(lessThanOrEqualTo: loadingOverlay.trailingAnchor, constant: -32),
        ])
    }

    private func showLoadingOverlay(title: String, detail: String) {
        loadingTitleLabel.stringValue = title
        loadingDetailLabel.stringValue = detail
        loadingOverlay.alphaValue = 1
        loadingOverlay.isHidden = false
    }

    private func hideLoadingOverlay() {
        guard !loadingOverlay.isHidden else {
            return
        }

        NSAnimationContext.runAnimationGroup { context in
            context.duration = 0.18
            loadingOverlay.animator().alphaValue = 0
        } completionHandler: {
            self.loadingOverlay.isHidden = true
            self.loadingOverlay.alphaValue = 1
        }
    }

    private func handleNavigationFailure(_ error: Error, stage: String) {
        let nsError = error as NSError
        logger.error(
            "WebView navigation failed during \(stage, privacy: .public). code=\(nsError.code) domain=\(nsError.domain, privacy: .public) description=\(nsError.localizedDescription, privacy: .public)"
        )
        showLoadingOverlay(
            title: localization.loadWindowContentTitle,
            detail: nsError.localizedDescription
        )
    }

    private func beginFrontendProbe() {
        frontendProbeAttemptsRemaining = 20
        probeFrontendReadiness()
    }

    private func probeFrontendReadiness() {
        guard frontendProbeAttemptsRemaining > 0 else {
            logger.error("Frontend probe timed out before the page reported readiness.")
            showLoadingOverlay(
                title: localization.slowStartupTitle,
                detail: localization.slowStartupDetail
            )
            return
        }

        frontendProbeAttemptsRemaining -= 1

        webView.evaluateJavaScript(Self.frontendBootstrapProbeScript) { [weak self] result, error in
            guard let self else {
                return
            }

            if let error {
                self.logger.error("Frontend probe JavaScript failed. error=\(error.localizedDescription, privacy: .public)")
                self.scheduleFrontendProbeRetry()
                return
            }

            guard let payload = result as? [String: Any] else {
                self.logger.error("Frontend probe returned an unexpected payload type.")
                self.scheduleFrontendProbeRetry()
                return
            }

            let frontendState = payload["frontendState"] as? String ?? ""
            let rootChildCount = payload["rootChildCount"] as? Int ?? 0
            let rootTextLength = payload["rootTextLength"] as? Int ?? 0
            let bodyTextLength = payload["bodyTextLength"] as? Int ?? 0
            let hasBridge = payload["hasBridge"] as? Bool ?? false
            let hasReceiver = payload["hasReceiver"] as? Bool ?? false
            let readyState = payload["readyState"] as? String ?? "unknown"

            self.logger.info(
                "Frontend probe. state=\(frontendState, privacy: .public) readyState=\(readyState, privacy: .public) rootChildren=\(rootChildCount) rootTextLength=\(rootTextLength) bodyTextLength=\(bodyTextLength) hasBridge=\(hasBridge) hasReceiver=\(hasReceiver)"
            )

            if frontendState == "ready" || rootChildCount > 0 || rootTextLength > 0 || bodyTextLength > 0 {
                self.hideLoadingOverlay()
                return
            }

            self.scheduleFrontendProbeRetry()
        }
    }

    private func scheduleFrontendProbeRetry() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
            self?.probeFrontendReadiness()
        }
    }

    private func installLanguageObserver() {
        languageObserver = NotificationCenter.default.addObserver(
            forName: .quickNoteLanguageDidChange,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            Task { @MainActor [weak self] in
                guard let self else {
                    return
                }

                self.currentLanguage = QuickNoteLanguage(storedValue: notification.userInfo?["language"])
            }
        }
    }

    private static let hostBackgroundColor = NSColor(
        calibratedRed: 247 / 255,
        green: 242 / 255,
        blue: 232 / 255,
        alpha: 0.98
    )

    private static let bridgeBootstrapScript = """
    (() => {
      if (window.quickNoteHost) {
        return;
      }

      const inflight = new Map();
      let nextId = 1;

      const sendWithoutReply = (method, params = {}) => {
        try {
          window.webkit.messageHandlers.quickNoteHost.postMessage({ method, params });
        } catch (error) {
          console.error("QuickNote failed to post a bridge message without reply.", error);
        }
      };

      const send = (method, params = {}) => new Promise((resolve, reject) => {
        const id = nextId++;
        inflight.set(id, { resolve, reject });
        window.webkit.messageHandlers.quickNoteHost.postMessage({ id, method, params });
      });

      window.quickNoteHost = {
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
        openNotificationSettings() {
          return send("openNotificationSettings");
        },
        sendNotification(request = {}) {
          return send("sendNotification", request);
        },
        showNotification(request = {}) {
          return send("showNotification", request);
        },
        scheduleNotification(request = {}) {
          return send("scheduleNotification", request);
        },
        openTextColorPanel(options = {}) {
          return send("openTextColorPanel", options);
        },
        testReminderNotification(options = {}) {
          return send("testReminderNotification", options);
        },
        getHotkeyRegistrationState() {
          return send("getHotkeyRegistrationState");
        },
        readClipboardText() {
          return send("readClipboardText");
        },
        registerHotkey(shortcut) {
          const normalized = typeof shortcut === "object" && shortcut ? shortcut.shortcut : shortcut;
          return send("registerHotkey", { shortcut: String(normalized ?? "") });
        },
        registerGlobalShortcut(shortcut) {
          const normalized = typeof shortcut === "object" && shortcut ? shortcut.shortcut : shortcut;
          return send("registerGlobalShortcut", { shortcut: String(normalized ?? "") });
        },
        unregisterHotkey() {
          return send("unregisterHotkey");
        },
        showWindow() {
          return send("showWindow");
        },
        hideWindow() {
          return send("hideWindow");
        },
        toggleWindow() {
          return send("toggleWindow");
        },
        minimizeWindow() {
          return send("minimizeWindow");
        },
        maximizeWindow() {
          return send("maximizeWindow");
        },
        closeWindow() {
          return send("closeWindow");
        },
        setAlwaysOnTop(enabled) {
          return send("setAlwaysOnTop", { enabled: Boolean(enabled) });
        },
        hidePanelWindow() {
          return send("hideWindow");
        },
        quitApplication() {
          return send("quitApplication");
        },
        startWindowDrag() {
          return send("startWindowDrag");
        },
        writeClipboardText(text) {
          return send("writeClipboardText", { text: String(text ?? "") });
        },
        openDevTools() {
          return send("openDevTools");
        },
        reportFrontendReady() {
          sendWithoutReply("frontendReady");
        },
        setEditableInputActive(active) {
          sendWithoutReply("setEditableInputActive", { active: Boolean(active) });
        },
        setTextCompositionActive(active) {
          sendWithoutReply("setTextCompositionActive", { active: Boolean(active) });
        },
        reportFrontendError(message, source = "javascript") {
          sendWithoutReply("reportFrontendError", { message, source });
        },
      };

      window.quickNoteNative = window.quickNoteHost;

      window.addEventListener("error", (event) => {
        const message = event.error?.stack || event.message || "Unknown window error";
        window.quickNoteHost.reportFrontendError(message, "window.error");
      });

      window.addEventListener("unhandledrejection", (event) => {
        const reason = event.reason;
        let message = "Unhandled promise rejection";

        if (reason instanceof Error) {
          message = reason.stack || reason.message || message;
        } else if (typeof reason === "string") {
          message = reason;
        } else {
          try {
            message = JSON.stringify(reason) || message;
          } catch {
            message = String(reason) || message;
          }
        }

        window.quickNoteHost.reportFrontendError(message || "Unhandled promise rejection", "unhandledrejection");
      });

      window.__quickNoteNativeReceive = (message) => {
        const record = inflight.get(message.id);
        if (!record) {
          return;
        }

        inflight.delete(message.id);

        if (message.ok) {
          record.resolve(message.result);
          return;
        }

        record.reject(new Error(message.error || "Unknown QuickNote native bridge error"));
      };
    })();
    """

    private static func missingBundleHTML(for language: QuickNoteLanguage) -> String {
        let localization = language.localization

        return """
    <!doctype html>
    <html lang="\(language.htmlLanguageCode)">
      <head>
        <meta charset="utf-8" />
        <title>QuickNote</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #f7f2e8;
            color: #1e1915;
            font: 15px/1.6 -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
          }

          article {
            max-width: 420px;
            padding: 24px 28px;
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.92);
            box-shadow: 0 22px 48px rgba(61, 49, 34, 0.12);
          }
        </style>
      </head>
      <body>
        <article>
          <h1>\(localization.missingBundleHeading)</h1>
          <p>\(localization.missingBundleBody)</p>
        </article>
      </body>
    </html>
    """
    }
}

private final class ScriptMessageProxy: NSObject, WKScriptMessageHandler {
    weak var owner: WebViewController?

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        owner?.handle(message: message)
    }
}
