using System.Text.Json;
using System.Text.Json.Nodes;
using System.Diagnostics;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;

namespace QuickNote.Windows;

internal sealed class HostBridgeController
{
    private readonly MainWindow window;
    private readonly WebView2 webView;
    private readonly AppStorage storage;
    private readonly Native.Win32HotKeyManager hotKeys;
    private readonly NotificationScheduler notifications;

    public HostBridgeController(
        MainWindow window,
        WebView2 webView,
        AppStorage storage,
        Native.Win32HotKeyManager hotKeys,
        NotificationScheduler notifications)
    {
        this.window = window;
        this.webView = webView;
        this.storage = storage;
        this.hotKeys = hotKeys;
        this.notifications = notifications;
        this.hotKeys.RegistrationStateChanged += (_, state) => _ = EmitHotkeyRegistrationStateAsync(state);
    }

    public async Task InstallAsync()
    {
        await webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(BridgeScript);
        webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;
    }

    public Task EmitPanelWillOpenAsync()
    {
        return DispatchEventAsync("quicknote:panel-will-open");
    }

    public Task EmitShortcutInvokedAsync(string shortcut)
    {
        var detail = new JsonObject { ["shortcut"] = shortcut };
        return DispatchEventAsync("quicknote:shortcut-invoked", detail);
    }

    public Task EmitHotkeyRegistrationStateAsync(Native.Win32HotKeyManager.RegistrationState? state = null)
    {
        return DispatchEventAsync("quicknote:hotkey-registration-state", ToHotkeyRegistrationState(state ?? hotKeys.GetRegistrationState()));
    }

    private async void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        var request = JsonNode.Parse(e.WebMessageAsJson) as JsonObject;
        if (request is null)
        {
            return;
        }

        var id = ReadNullableInt(request["id"]);
        var method = request["method"]?.GetValue<string>() ?? "";
        var parameters = request["params"] as JsonObject ?? new JsonObject();

        try
        {
            var result = await HandleAsync(method, parameters);
            if (id is not null)
            {
                await SendResponseAsync(id.Value, true, result);
            }
        }
        catch (Exception error)
        {
            if (id is not null)
            {
                await SendResponseAsync(id.Value, false, error.Message);
            }
        }
    }

    private async Task<JsonNode?> HandleAsync(string method, JsonObject parameters)
    {
        switch (method)
        {
            case "frontendReady":
                _ = EmitHotkeyRegistrationStateAsync();
                return null;
            case "setEditableInputActive":
                window.SetEditableInputActive(parameters["active"]?.GetValue<bool>() ?? false);
                return null;
            case "setTextCompositionActive":
                window.SetTextCompositionActive(parameters["active"]?.GetValue<bool>() ?? false);
                return null;
            case "reportFrontendError":
                Debug.WriteLine($"QuickNote frontend error ({parameters["source"]?.GetValue<string>() ?? "frontend"}): {parameters["message"]?.GetValue<string>() ?? ""}");
                return null;
            case "getCapabilities":
                return Capabilities();
            case "loadAllData":
                return storage.LoadAllData();
            case "getHotkeyRegistrationState":
                return ToHotkeyRegistrationState(hotKeys.GetRegistrationState());
            case "saveNotes":
                storage.SaveNotes(parameters["cards"]?.DeepClone() ?? new JsonArray());
                return null;
            case "saveTodos":
                var todos = parameters["todos"]?.DeepClone() ?? new JsonArray();
                storage.SaveTodos(todos);
                notifications.SyncTodoReminders(storage.LoadTodos(), storage.LoadSettings());
                return null;
            case "saveSettings":
                storage.SaveSettings((parameters["settings"] as JsonObject)?.DeepClone().AsObject() ?? new JsonObject());
                notifications.SyncTodoReminders(storage.LoadTodos(), storage.LoadSettings());
                return null;
            case "showWindow":
                window.ShowWindow();
                return null;
            case "hideWindow":
            case "hidePanelWindow":
                window.HideWindow();
                return null;
            case "toggleWindow":
                window.ToggleWindow();
                return null;
            case "setAlwaysOnTop":
                window.SetAlwaysOnTop(parameters["enabled"]?.GetValue<bool>() ?? true);
                return null;
            case "registerHotkey":
            case "registerGlobalShortcut":
                hotKeys.Register(parameters["shortcut"]?.GetValue<string>() ?? "Shift+Space");
                return null;
            case "unregisterHotkey":
                hotKeys.Unregister();
                return null;
            case "readClipboardText":
                return JsonValue.Create(System.Windows.Clipboard.ContainsText() ? System.Windows.Clipboard.GetText() : "");
            case "writeClipboardText":
                System.Windows.Clipboard.SetText(parameters["text"]?.GetValue<string>() ?? "");
                return null;
            case "sendNotification":
            case "showNotification":
                notifications.Show(
                    parameters["title"]?.GetValue<string>() ?? Branding.DisplayName,
                    parameters["body"]?.GetValue<string>() ?? "",
                    parameters["soundEnabled"]?.GetValue<bool>() ?? true);
                return null;
            case "testReminderNotification":
                await notifications.ScheduleAndConfirmAsync(
                    $"quicknote.test.notification.{Guid.NewGuid():N}",
                    Branding.DisplayName,
                    parameters["language"]?.GetValue<string>() == "zh-CN"
                        ? "这是一条 QuickNote 测试提醒。"
                        : "This is a QuickNote test reminder.",
                    DateTimeOffset.Now.AddSeconds(2),
                    parameters["soundEnabled"]?.GetValue<bool>() ?? true);
                return null;
            case "scheduleNotification":
                ScheduleNotification(parameters);
                return null;
            case "openNotificationSettings":
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("ms-settings:notifications")
                {
                    UseShellExecute = true,
                });
                return null;
            case "openDevTools":
                webView.CoreWebView2.OpenDevToolsWindow();
                return null;
            case "quitApplication":
                window.QuitApplication();
                return null;
            case "openTextColorPanel":
                return null;
            default:
                throw new InvalidOperationException($"Unsupported host bridge method '{method}'.");
        }
    }

    private void ScheduleNotification(JsonObject parameters)
    {
        var id = parameters["id"]?.GetValue<string>() ?? Guid.NewGuid().ToString("N");
        var scheduledAt = ReadNullableLong(parameters["scheduledAt"]) ?? DateTimeOffset.Now.ToUnixTimeMilliseconds();
        notifications.Schedule(
            id,
            parameters["title"]?.GetValue<string>() ?? Branding.DisplayName,
            parameters["body"]?.GetValue<string>() ?? "",
            DateTimeOffset.FromUnixTimeMilliseconds(scheduledAt),
            parameters["soundEnabled"]?.GetValue<bool>() ?? true);
    }

    private static JsonObject Capabilities()
    {
        return new JsonObject
        {
            ["platform"] = "windows",
            ["runtime"] = "wpf-webview2-win32",
            ["capabilities"] = new JsonObject
            {
                ["window.show"] = true,
                ["window.hide"] = true,
                ["window.toggle"] = true,
                ["window.alwaysOnTop"] = true,
                ["notifications.send"] = true,
                ["notifications.schedule"] = true,
                ["notifications.openSettings"] = true,
                ["shortcuts.global"] = true,
                ["settings.persist"] = true,
                ["clipboard.read"] = true,
                ["clipboard.write"] = true,
                ["devtools.open"] = true,
                ["app.quit"] = true,
            },
            ["limitations"] = new JsonArray
            {
                "Topmost windows cannot reliably appear above every fullscreen-exclusive or secure desktop surface on Windows.",
                "Reminder scheduling is app-managed and runs while QuickNote is running; Windows App SDK app notifications are used when a reminder is delivered.",
            },
        };
    }

    private Task DispatchEventAsync(string eventName, JsonNode? detail = null)
    {
        var script = detail is null
            ? $"window.dispatchEvent(new Event({JsonSerializer.Serialize(eventName)}));"
            : $"window.dispatchEvent(new CustomEvent({JsonSerializer.Serialize(eventName)}, {{ detail: {detail.ToJsonString()} }}));";
        return webView.CoreWebView2.ExecuteScriptAsync(script);
    }

    private Task SendResponseAsync(int id, bool ok, JsonNode? payload)
    {
        var response = new JsonObject
        {
            ["id"] = id,
            ["ok"] = ok,
        };

        response[ok ? "result" : "error"] = payload?.DeepClone();
        return webView.CoreWebView2.ExecuteScriptAsync($"window.__quickNoteNativeReceive({response.ToJsonString()});");
    }

    private Task SendResponseAsync(int id, bool ok, string message)
    {
        return SendResponseAsync(id, ok, JsonValue.Create(message));
    }

    private static int? ReadNullableInt(JsonNode? node)
    {
        if (node is null)
        {
            return null;
        }

        try
        {
            return node.GetValue<int>();
        }
        catch
        {
            return null;
        }
    }

    private static long? ReadNullableLong(JsonNode? node)
    {
        if (node is null)
        {
            return null;
        }

        try
        {
            return node.GetValue<long>();
        }
        catch
        {
            return null;
        }
    }

    private static JsonObject ToHotkeyRegistrationState(Native.Win32HotKeyManager.RegistrationState state)
    {
        var payload = new JsonObject
        {
            ["shortcut"] = state.Shortcut,
            ["registration"] = state.Registration,
        };

        if (!string.IsNullOrWhiteSpace(state.Message))
        {
            payload["message"] = state.Message;
        }

        return payload;
    }

    private const string BridgeScript = """
(() => {
  if (window.quickNoteHost) {
    return;
  }

  const inflight = new Map();
  let nextId = 1;

  const sendWithoutReply = (method, params = {}) => {
    chrome.webview.postMessage({ method, params });
  };

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    inflight.set(id, { resolve, reject });
    chrome.webview.postMessage({ id, method, params });
  });

  window.quickNoteHost = {
    platform: "windows",
    getCapabilities: () => send("getCapabilities"),
    loadAllData: () => send("loadAllData"),
    saveNotes: (cards) => send("saveNotes", { cards }),
    saveTodos: (todos) => send("saveTodos", { todos }),
    saveSettings: (settings) => send("saveSettings", { settings }),
    showWindow: () => send("showWindow"),
    hideWindow: () => send("hideWindow"),
    toggleWindow: () => send("toggleWindow"),
    setAlwaysOnTop: (enabled) => send("setAlwaysOnTop", { enabled: Boolean(enabled) }),
    openNotificationSettings: () => send("openNotificationSettings"),
    sendNotification: (request = {}) => send("sendNotification", request),
    showNotification: (request = {}) => send("showNotification", request),
    scheduleNotification: (request = {}) => send("scheduleNotification", request),
    openTextColorPanel: () => Promise.resolve(),
    testReminderNotification: (options = {}) => send("testReminderNotification", options),
    getHotkeyRegistrationState: () => send("getHotkeyRegistrationState"),
    readClipboardText: () => send("readClipboardText"),
    writeClipboardText: (text) => send("writeClipboardText", { text: String(text ?? "") }),
    registerHotkey: (shortcut) => {
      const normalized = typeof shortcut === "object" && shortcut ? shortcut.shortcut : shortcut;
      return send("registerHotkey", { shortcut: String(normalized ?? "") });
    },
    registerGlobalShortcut: (shortcut) => {
      const normalized = typeof shortcut === "object" && shortcut ? shortcut.shortcut : shortcut;
      return send("registerGlobalShortcut", { shortcut: String(normalized ?? "") });
    },
    unregisterHotkey: () => send("unregisterHotkey"),
    setEditableInputActive: (active) => sendWithoutReply("setEditableInputActive", { active: Boolean(active) }),
    setTextCompositionActive: (active) => sendWithoutReply("setTextCompositionActive", { active: Boolean(active) }),
    openDevTools: () => send("openDevTools"),
    quitApplication: () => send("quitApplication"),
    reportFrontendReady: () => sendWithoutReply("frontendReady"),
    reportFrontendError: (message, source = "javascript") => sendWithoutReply("reportFrontendError", { message, source }),
    hidePanelWindow: () => send("hideWindow"),
  };

  window.quickNoteNative = window.quickNoteHost;

  window.addEventListener("error", (event) => {
    window.quickNoteHost.reportFrontendError(event.message || "Unhandled frontend error", event.filename || "window.error");
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message = reason && typeof reason.message === "string" ? reason.message : String(reason || "Unhandled promise rejection");
    window.quickNoteHost.reportFrontendError(message, "unhandledrejection");
  });

  window.__quickNoteNativeReceive = (message) => {
    const record = inflight.get(message.id);
    if (!record) {
      return;
    }

    inflight.delete(message.id);

    if (message.ok) {
      record.resolve(message.result);
    } else {
      record.reject(new Error(message.error || "Unknown QuickNote host bridge error"));
    }
  };
})();
""";
}
