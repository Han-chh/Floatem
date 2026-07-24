using System.Text.Json;
using System.Text.Json.Nodes;
using System.Diagnostics;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;

namespace Floatem.Windows;

internal sealed class HostBridgeController
{
    private readonly MainWindow window;
    private readonly WebView2 webView;
    private readonly AppStorage storage;
    private readonly Native.Win32HotKeyManager hotKeys;
    private readonly NotificationScheduler notifications;
    private readonly LaunchAtLoginManager launchAtLogin;

    public HostBridgeController(
        MainWindow window,
        WebView2 webView,
        AppStorage storage,
        Native.Win32HotKeyManager hotKeys,
        NotificationScheduler notifications,
        LaunchAtLoginManager launchAtLogin)
    {
        this.window = window;
        this.webView = webView;
        this.storage = storage;
        this.hotKeys = hotKeys;
        this.notifications = notifications;
        this.launchAtLogin = launchAtLogin;
        this.hotKeys.RegistrationStateChanged += (_, state) => _ = EmitHotkeyRegistrationStateAsync(state);
    }

    public async Task InstallAsync()
    {
        await webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(BridgeScript);
        webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;
    }

    public Task EmitPanelWillOpenAsync()
    {
        return DispatchEventAsync("floatem:panel-will-open");
    }

    public Task EmitShortcutInvokedAsync(string shortcut)
    {
        var detail = new JsonObject { ["shortcut"] = shortcut };
        return DispatchEventAsync("floatem:shortcut-invoked", detail);
    }

    public Task EmitHotkeyRegistrationStateAsync(Native.Win32HotKeyManager.RegistrationState? state = null)
    {
        return DispatchEventAsync("floatem:hotkey-registration-state", ToHotkeyRegistrationState(state ?? hotKeys.GetRegistrationState()));
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
                Debug.WriteLine($"Floatem frontend error ({parameters["source"]?.GetValue<string>() ?? "frontend"}): {parameters["message"]?.GetValue<string>() ?? ""}");
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
                var settings = (parameters["settings"] as JsonObject)?.DeepClone().AsObject() ?? new JsonObject();
                var launchAtLoginEnabled = settings["launchAtLogin"]?.GetValue<bool>()
                    ?? storage.LoadSettings()["launchAtLogin"]?.GetValue<bool>()
                    ?? true;
                launchAtLogin.SetEnabled(launchAtLoginEnabled);
                settings["launchAtLogin"] = launchAtLoginEnabled;
                storage.SaveSettings(settings);
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
                    $"floatem.test.notification.{Guid.NewGuid():N}",
                    Branding.DisplayName,
                    parameters["language"]?.GetValue<string>() == "zh-CN"
                        ? "这是一条 Floatem 测试提醒。"
                        : "This is a Floatem test reminder.",
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
            case "checkNotificationPermission":
                return new JsonObject { ["allowed"] = notifications.NotificationsEnabled() };
            case "openDevTools":
                webView.CoreWebView2.OpenDevToolsWindow();
                return null;
            case "quitApplication":
                window.QuitApplication();
                return null;
            case "openTextColorPanel":
                return null;
            case "pickScreenColor":
                return await PickScreenColorAsync();
            default:
                throw new InvalidOperationException($"Unsupported host bridge method '{method}'.");
        }
    }

    private Task<JsonNode?> PickScreenColorAsync()
    {
        var completion = new TaskCompletionSource<JsonNode?>();
        var picker = ScreenColorPickerForm.Create();

        if (picker is null)
        {
            completion.SetResult(null);
            return completion.Task;
        }

        void Complete(System.Drawing.Color? color)
        {
            if (completion.Task.IsCompleted)
            {
                return;
            }

            completion.SetResult(color is null
                ? null
                : new JsonObject
                {
                    ["sRGBHex"] = $"#{color.Value.R:X2}{color.Value.G:X2}{color.Value.B:X2}",
                });
            picker.Close();
        }

        picker.ColorPicked += (_, color) => Complete(color);
        picker.PickCanceled += (_, _) => Complete(null);
        picker.FormClosed += (_, _) =>
        {
            if (!completion.Task.IsCompleted)
            {
                completion.SetResult(null);
            }

            picker.Dispose();
        };

        picker.Show();
        picker.Activate();

        return completion.Task;
    }

    private sealed class ScreenColorPickerForm : System.Windows.Forms.Form
    {
        private const int MagnifierSampleRadius = 5;
        private const int MagnifierCellSize = 8;
        private const int PreviewWidth = 166;
        private const int PreviewHeight = 150;
        private readonly System.Drawing.Bitmap screenshot;
        private readonly System.Drawing.Rectangle virtualScreenBounds;
        private System.Drawing.Point cursorPosition;

        private ScreenColorPickerForm(System.Drawing.Bitmap screenshot, System.Drawing.Rectangle virtualScreenBounds)
        {
            this.screenshot = screenshot;
            this.virtualScreenBounds = virtualScreenBounds;
            cursorPosition = System.Windows.Forms.Cursor.Position;

            AutoScaleMode = System.Windows.Forms.AutoScaleMode.None;
            BackColor = System.Drawing.Color.Black;
            Bounds = virtualScreenBounds;
            Cursor = System.Windows.Forms.Cursors.Cross;
            DoubleBuffered = true;
            FormBorderStyle = System.Windows.Forms.FormBorderStyle.None;
            KeyPreview = true;
            ShowInTaskbar = false;
            StartPosition = System.Windows.Forms.FormStartPosition.Manual;
            TopMost = true;
        }

        public event EventHandler<System.Drawing.Color?>? ColorPicked;
        public event EventHandler? PickCanceled;

        public static ScreenColorPickerForm? Create()
        {
            var bounds = System.Windows.Forms.SystemInformation.VirtualScreen;
            if (bounds.Width <= 0 || bounds.Height <= 0)
            {
                return null;
            }

            try
            {
                var screenshot = new System.Drawing.Bitmap(bounds.Width, bounds.Height, System.Drawing.Imaging.PixelFormat.Format32bppArgb);
                using var graphics = System.Drawing.Graphics.FromImage(screenshot);
                graphics.CopyFromScreen(bounds.Left, bounds.Top, 0, 0, bounds.Size, System.Drawing.CopyPixelOperation.SourceCopy);
                return new ScreenColorPickerForm(screenshot, bounds);
            }
            catch
            {
                return null;
            }
        }

        protected override void OnPaint(System.Windows.Forms.PaintEventArgs e)
        {
            base.OnPaint(e);
            e.Graphics.DrawImageUnscaled(screenshot, 0, 0);
            DrawCursorGuide(e.Graphics);
            DrawColorPreview(e.Graphics);
        }

        protected override void OnMouseMove(System.Windows.Forms.MouseEventArgs e)
        {
            base.OnMouseMove(e);
            cursorPosition = System.Windows.Forms.Cursor.Position;
            Invalidate();
        }

        protected override void OnMouseDown(System.Windows.Forms.MouseEventArgs e)
        {
            base.OnMouseDown(e);

            if (e.Button == System.Windows.Forms.MouseButtons.Right)
            {
                PickCanceled?.Invoke(this, EventArgs.Empty);
                return;
            }

            if (e.Button != System.Windows.Forms.MouseButtons.Left)
            {
                return;
            }

            ColorPicked?.Invoke(this, ReadScreenshotPixel(System.Windows.Forms.Cursor.Position));
        }

        protected override void OnKeyDown(System.Windows.Forms.KeyEventArgs e)
        {
            base.OnKeyDown(e);

            if (e.KeyCode == System.Windows.Forms.Keys.Escape)
            {
                PickCanceled?.Invoke(this, EventArgs.Empty);
            }
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                screenshot.Dispose();
            }

            base.Dispose(disposing);
        }

        private System.Drawing.Color? ReadScreenshotPixel(System.Drawing.Point screenPoint)
        {
            var x = screenPoint.X - virtualScreenBounds.Left;
            var y = screenPoint.Y - virtualScreenBounds.Top;

            if (x < 0 || y < 0 || x >= screenshot.Width || y >= screenshot.Height)
            {
                return null;
            }

            return screenshot.GetPixel(x, y);
        }

        private System.Drawing.Color? ReadScreenshotPixel(int screenshotX, int screenshotY)
        {
            if (screenshotX < 0 || screenshotY < 0 || screenshotX >= screenshot.Width || screenshotY >= screenshot.Height)
            {
                return null;
            }

            return screenshot.GetPixel(screenshotX, screenshotY);
        }

        private string CurrentHexColor(System.Drawing.Color color)
        {
            return $"#{color.R:X2}{color.G:X2}{color.B:X2}";
        }

        private void DrawCursorGuide(System.Drawing.Graphics graphics)
        {
            var x = cursorPosition.X - virtualScreenBounds.Left;
            var y = cursorPosition.Y - virtualScreenBounds.Top;

            if (x < 0 || y < 0 || x >= screenshot.Width || y >= screenshot.Height)
            {
                return;
            }

            using var darkPen = new System.Drawing.Pen(System.Drawing.Color.FromArgb(180, 0, 0, 0), 1);
            using var lightPen = new System.Drawing.Pen(System.Drawing.Color.FromArgb(220, 255, 255, 255), 1);
            graphics.DrawLine(darkPen, x - 18, y, x - 6, y);
            graphics.DrawLine(darkPen, x + 6, y, x + 18, y);
            graphics.DrawLine(darkPen, x, y - 18, x, y - 6);
            graphics.DrawLine(darkPen, x, y + 6, x, y + 18);
            graphics.DrawLine(lightPen, x - 17, y + 1, x - 7, y + 1);
            graphics.DrawLine(lightPen, x + 7, y + 1, x + 17, y + 1);
            graphics.DrawLine(lightPen, x + 1, y - 17, x + 1, y - 7);
            graphics.DrawLine(lightPen, x + 1, y + 7, x + 1, y + 17);
        }

        private void DrawColorPreview(System.Drawing.Graphics graphics)
        {
            var x = cursorPosition.X - virtualScreenBounds.Left;
            var y = cursorPosition.Y - virtualScreenBounds.Top;
            var color = ReadScreenshotPixel(x, y);

            if (color is null)
            {
                return;
            }

            graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;

            var previewX = x + 22;
            var previewY = y + 22;
            if (previewX + PreviewWidth > ClientSize.Width - 8)
            {
                previewX = x - PreviewWidth - 22;
            }

            if (previewY + PreviewHeight > ClientSize.Height - 8)
            {
                previewY = y - PreviewHeight - 22;
            }

            previewX = Math.Max(8, Math.Min(previewX, ClientSize.Width - PreviewWidth - 8));
            previewY = Math.Max(8, Math.Min(previewY, ClientSize.Height - PreviewHeight - 8));

            var previewBounds = new System.Drawing.Rectangle(previewX, previewY, PreviewWidth, PreviewHeight);
            using var shadowBrush = new System.Drawing.SolidBrush(System.Drawing.Color.FromArgb(72, 30, 25, 21));
            using var panelBrush = new System.Drawing.SolidBrush(System.Drawing.Color.FromArgb(245, 255, 252, 248));
            using var panelPen = new System.Drawing.Pen(System.Drawing.Color.FromArgb(220, 213, 198, 180), 1);
            using var textBrush = new System.Drawing.SolidBrush(System.Drawing.Color.FromArgb(255, 30, 25, 21));
            using var mutedBrush = new System.Drawing.SolidBrush(System.Drawing.Color.FromArgb(255, 94, 85, 77));
            using var textFont = new System.Drawing.Font("Segoe UI", 9.5f, System.Drawing.FontStyle.Bold);
            using var metaFont = new System.Drawing.Font("Segoe UI", 8.2f, System.Drawing.FontStyle.Regular);

            FillRoundedRectangle(graphics, shadowBrush, new System.Drawing.Rectangle(previewBounds.X + 2, previewBounds.Y + 4, previewBounds.Width, previewBounds.Height), 18);
            FillRoundedRectangle(graphics, panelBrush, previewBounds, 18);
            DrawRoundedRectangle(graphics, panelPen, previewBounds, 18);

            var swatchBounds = new System.Drawing.Rectangle(previewX + 14, previewY + 14, 34, 34);
            using (var swatchBrush = new System.Drawing.SolidBrush(color.Value))
            using (var swatchPen = new System.Drawing.Pen(System.Drawing.Color.FromArgb(230, 255, 255, 255), 2))
            {
                FillRoundedRectangle(graphics, swatchBrush, swatchBounds, 10);
                DrawRoundedRectangle(graphics, swatchPen, swatchBounds, 10);
            }

            graphics.DrawString(CurrentHexColor(color.Value), textFont, textBrush, previewX + 58, previewY + 15);
            graphics.DrawString("Click to pick", metaFont, mutedBrush, previewX + 58, previewY + 33);
            DrawMagnifier(graphics, x, y, previewX + 14, previewY + 60);
        }

        private void DrawMagnifier(System.Drawing.Graphics graphics, int centerX, int centerY, int left, int top)
        {
            var cells = MagnifierSampleRadius * 2 + 1;
            var size = cells * MagnifierCellSize;
            var bounds = new System.Drawing.Rectangle(left, top, size, size);

            using var borderPen = new System.Drawing.Pen(System.Drawing.Color.FromArgb(190, 30, 25, 21), 1);
            using var centerPen = new System.Drawing.Pen(System.Drawing.Color.FromArgb(235, 255, 255, 255), 2);
            using var centerDarkPen = new System.Drawing.Pen(System.Drawing.Color.FromArgb(180, 30, 25, 21), 1);

            for (var sampleY = -MagnifierSampleRadius; sampleY <= MagnifierSampleRadius; sampleY++)
            {
                for (var sampleX = -MagnifierSampleRadius; sampleX <= MagnifierSampleRadius; sampleX++)
                {
                    var color = ReadScreenshotPixel(centerX + sampleX, centerY + sampleY) ?? System.Drawing.Color.Transparent;
                    using var brush = new System.Drawing.SolidBrush(color);
                    graphics.FillRectangle(
                        brush,
                        left + (sampleX + MagnifierSampleRadius) * MagnifierCellSize,
                        top + (sampleY + MagnifierSampleRadius) * MagnifierCellSize,
                        MagnifierCellSize,
                        MagnifierCellSize);
                }
            }

            graphics.DrawRectangle(borderPen, bounds);
            var centerLeft = left + MagnifierSampleRadius * MagnifierCellSize;
            var centerTop = top + MagnifierSampleRadius * MagnifierCellSize;
            graphics.DrawRectangle(centerDarkPen, centerLeft, centerTop, MagnifierCellSize, MagnifierCellSize);
            graphics.DrawRectangle(centerPen, centerLeft + 1, centerTop + 1, MagnifierCellSize - 2, MagnifierCellSize - 2);
        }

        private static void FillRoundedRectangle(
            System.Drawing.Graphics graphics,
            System.Drawing.Brush brush,
            System.Drawing.Rectangle bounds,
            int radius)
        {
            using var path = CreateRoundedRectanglePath(bounds, radius);
            graphics.FillPath(brush, path);
        }

        private static void DrawRoundedRectangle(
            System.Drawing.Graphics graphics,
            System.Drawing.Pen pen,
            System.Drawing.Rectangle bounds,
            int radius)
        {
            using var path = CreateRoundedRectanglePath(bounds, radius);
            graphics.DrawPath(pen, path);
        }

        private static System.Drawing.Drawing2D.GraphicsPath CreateRoundedRectanglePath(System.Drawing.Rectangle bounds, int radius)
        {
            var diameter = radius * 2;
            var path = new System.Drawing.Drawing2D.GraphicsPath();
            path.AddArc(bounds.Left, bounds.Top, diameter, diameter, 180, 90);
            path.AddArc(bounds.Right - diameter, bounds.Top, diameter, diameter, 270, 90);
            path.AddArc(bounds.Right - diameter, bounds.Bottom - diameter, diameter, diameter, 0, 90);
            path.AddArc(bounds.Left, bounds.Bottom - diameter, diameter, diameter, 90, 90);
            path.CloseFigure();
            return path;
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
                "Reminder scheduling is app-managed and runs while Floatem is running; Windows App SDK app notifications are used when a reminder is delivered.",
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
        return webView.CoreWebView2.ExecuteScriptAsync($"window.__floatemNativeReceive({response.ToJsonString()});");
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
  if (window.floatemHost) {
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

  window.floatemHost = {
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
    checkNotificationPermission: (options = {}) => send("checkNotificationPermission", options),
    sendNotification: (request = {}) => send("sendNotification", request),
    showNotification: (request = {}) => send("showNotification", request),
    scheduleNotification: (request = {}) => send("scheduleNotification", request),
    openTextColorPanel: () => Promise.resolve(),
    pickScreenColor: () => send("pickScreenColor"),
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

  window.floatemNative = window.floatemHost;

  window.addEventListener("error", (event) => {
    window.floatemHost.reportFrontendError(event.message || "Unhandled frontend error", event.filename || "window.error");
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message = reason && typeof reason.message === "string" ? reason.message : String(reason || "Unhandled promise rejection");
    window.floatemHost.reportFrontendError(message, "unhandledrejection");
  });

  window.__floatemNativeReceive = (message) => {
    const record = inflight.get(message.id);
    if (!record) {
      return;
    }

    inflight.delete(message.id);

    if (message.ok) {
      record.resolve(message.result);
    } else {
      record.reject(new Error(message.error || "Unknown Floatem host bridge error"));
    }
  };
})();
""";
}
