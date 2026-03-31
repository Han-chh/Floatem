import AppKit
import WebKit

@MainActor
final class WebViewController: NSViewController, WKNavigationDelegate {
    private static let bridgeName = "quickNoteNative"

    weak var bridgeDelegate: QuickNoteNativeBridgeHandling?

    private let webView: WKWebView
    private let scriptMessageProxy = ScriptMessageProxy()

    init(bridgeDelegate: QuickNoteNativeBridgeHandling?) {
        self.bridgeDelegate = bridgeDelegate

        let userContentController = WKUserContentController()
        let configuration = WKWebViewConfiguration()
        configuration.userContentController = userContentController
        configuration.preferences.setValue(true, forKey: "developerExtrasEnabled")

        webView = WKWebView(frame: .zero, configuration: configuration)

        super.init(nibName: nil, bundle: nil)

        scriptMessageProxy.owner = self
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

    override func loadView() {
        let containerView = NSView()
        containerView.wantsLayer = true
        containerView.layer?.backgroundColor = NSColor.clear.cgColor

        containerView.addSubview(webView)

        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: containerView.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: containerView.trailingAnchor),
            webView.topAnchor.constraint(equalTo: containerView.topAnchor),
            webView.bottomAnchor.constraint(equalTo: containerView.bottomAnchor),
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

    private func loadFrontend() {
        guard let indexURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") else {
            webView.loadHTMLString(Self.missingBundleHTML, baseURL: nil)
            return
        }

        webView.loadFileURL(indexURL, allowingReadAccessTo: indexURL.deletingLastPathComponent())
    }

    func handle(message: WKScriptMessage) {
        guard
            let body = message.body as? [String: Any],
            let id = body["id"] as? Int,
            let method = body["method"] as? String
        else {
            return
        }

        let params = body["params"] as? [String: Any] ?? [:]

        do {
            let result: Any

            switch method {
            case "loadAllData":
                result = try bridgeDelegate?.loadAllData() ?? [:]
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
            case "registerHotkey":
                guard let shortcut = params["shortcut"] as? String else {
                    throw QuickNoteBridgeError.invalidParameters("QuickNote expected a shortcut string from JavaScript.")
                }
                try bridgeDelegate?.registerHotKey(shortcut: shortcut)
                result = NSNull()
            case "hidePanelWindow":
                bridgeDelegate?.hideMainWindowFromBridge()
                result = NSNull()
            case "startWindowDrag":
                try bridgeDelegate?.startWindowDragFromBridge()
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

    private static let bridgeBootstrapScript = """
    (() => {
      if (window.quickNoteNative) {
        return;
      }

      const inflight = new Map();
      let nextId = 1;

      const send = (method, params = {}) => new Promise((resolve, reject) => {
        const id = nextId++;
        inflight.set(id, { resolve, reject });
        window.webkit.messageHandlers.quickNoteNative.postMessage({ id, method, params });
      });

      window.quickNoteNative = {
        platform: "macos-appkit-wkwebview",
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
        registerHotkey(shortcut) {
          return send("registerHotkey", { shortcut });
        },
        hidePanelWindow() {
          return send("hidePanelWindow");
        },
        startWindowDrag() {
          return send("startWindowDrag");
        },
      };

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

    private static let missingBundleHTML = """
    <!doctype html>
    <html lang="en">
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
          <h1>QuickNote frontend bundle is missing</h1>
          <p>Run <code>pnpm install</code>, then build the app again so the WKWebView host can copy the Vite output into the application bundle.</p>
        </article>
      </body>
    </html>
    """
}

private final class ScriptMessageProxy: NSObject, WKScriptMessageHandler {
    weak var owner: WebViewController?

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        owner?.handle(message: message)
    }
}
