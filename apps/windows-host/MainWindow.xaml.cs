using System.IO;
using System.Windows;
using System.Windows.Interop;
using Microsoft.Web.WebView2.Core;
using QuickNote.Windows.Native;

namespace QuickNote.Windows;

public partial class MainWindow : Window
{
    private const string FrontendVirtualHost = "quicknote.local";
    private const int WmClose = 0x0010;
    private const int WmSysCommand = 0x0112;
    private const int ScClose = 0xF060;
    private readonly AppStorage storage = new();
    private readonly NotificationScheduler notifications;
    private readonly Win32HotKeyManager hotKeys;
    private HostBridgeController? bridge;
    private HwndSource? source;
    private bool allowApplicationShutdown;

    public MainWindow()
    {
        InitializeComponent();
        Title = Branding.DisplayName;

        notifications = new NotificationScheduler(Branding.DisplayName);
        hotKeys = new Win32HotKeyManager(this);
        hotKeys.HotKeyPressed += (_, shortcut) =>
        {
            ToggleWindow();
            _ = bridge?.EmitShortcutInvokedAsync(shortcut);
        };

        Loaded += OnLoaded;
        Closing += (_, e) =>
        {
            if (allowApplicationShutdown)
            {
                return;
            }

            e.Cancel = true;
            HideWindow();
        };
        Closed += (_, _) =>
        {
            if (source is not null)
            {
                source.RemoveHook(WndProc);
                source = null;
            }
            hotKeys.Dispose();
            notifications.Dispose();
        };
    }

    public void ShowWindow()
    {
        Show();
        WindowState = WindowState.Normal;
        Topmost = true;
        Activate();
        WindowInterop.BringTopmostToFront(this);
        _ = bridge?.EmitPanelWillOpenAsync();
    }

    public void HideWindow()
    {
        Hide();
    }

    public void ToggleWindow()
    {
        // Match macOS panel toggle: use visibility, not IsActive (hotkey must hide when focus is elsewhere).
        if (IsVisible && WindowState != WindowState.Minimized)
        {
            HideWindow();
        }
        else
        {
            ShowWindow();
        }
    }

    public void SetAlwaysOnTop(bool enabled)
    {
        Topmost = enabled;
        if (enabled)
        {
            WindowInterop.BringTopmostToFront(this);
        }
    }

    public void MinimizeWindow()
    {
        WindowState = WindowState.Minimized;
    }

    public void MaximizeWindow()
    {
        WindowState = WindowState == WindowState.Maximized
            ? WindowState.Normal
            : WindowState.Maximized;
    }

    public void CloseWindow()
    {
        HideWindow();
    }

    public void QuitApplication()
    {
        allowApplicationShutdown = true;
        System.Windows.Application.Current.Shutdown();
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        await WebView.EnsureCoreWebView2Async();
        WebView.CoreWebView2.Settings.AreDevToolsEnabled = true;
        WebView.CoreWebView2.Settings.IsStatusBarEnabled = false;
        WebView.DefaultBackgroundColor = System.Drawing.Color.Transparent;

        bridge = new HostBridgeController(this, WebView, storage, hotKeys, notifications);
        await bridge.InstallAsync();
        try
        {
            hotKeys.Register(storage.LoadSettings()["hotkey"]?.GetValue<string>() ?? "Ctrl+Shift+Space");
        }
        catch (InvalidOperationException)
        {
            // Same as startup: shortcut may be unavailable; UI can surface feedback when the user changes it.
        }
        notifications.SyncTodoReminders(storage.LoadTodos(), storage.LoadSettings());

        WebView.Source = ResolveFrontendUri(WebView.CoreWebView2);
        ShowWindow();
    }

    private void OnSourceInitialized(object? sender, EventArgs e)
    {
        WindowInterop.ApplyNativeWindowShell(this);

        source = HwndSource.FromHwnd(new WindowInteropHelper(this).Handle);
        source?.AddHook(WndProc);
    }

    private IntPtr WndProc(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
    {
        if (allowApplicationShutdown)
        {
            return IntPtr.Zero;
        }

        if (msg == WmClose)
        {
            HideWindow();
            handled = true;
            return IntPtr.Zero;
        }

        if (msg == WmSysCommand && (wParam.ToInt32() & 0xFFF0) == ScClose)
        {
            HideWindow();
            handled = true;
            return IntPtr.Zero;
        }

        return IntPtr.Zero;
    }

    private static Uri ResolveFrontendUri(CoreWebView2 coreWebView2)
    {
        var devUrl = Environment.GetEnvironmentVariable("QUICKNOTE_FRONTEND_URL");
        if (!string.IsNullOrWhiteSpace(devUrl))
        {
            return new Uri(devUrl);
        }

        var outputIndex = Path.Combine(AppContext.BaseDirectory, "web", "index.html");
        if (File.Exists(outputIndex))
        {
            return MapFrontendFolder(coreWebView2, Path.GetDirectoryName(outputIndex)!);
        }

        var repoIndex = FindRepoFile("apps", "frontend", "dist", "index.html");
        if (repoIndex is not null)
        {
            return MapFrontendFolder(coreWebView2, Path.GetDirectoryName(repoIndex)!);
        }

        return new Uri("about:blank");
    }

    private static Uri MapFrontendFolder(CoreWebView2 coreWebView2, string frontendFolder)
    {
        coreWebView2.SetVirtualHostNameToFolderMapping(
            FrontendVirtualHost,
            frontendFolder,
            CoreWebView2HostResourceAccessKind.Allow);

        return new Uri($"https://{FrontendVirtualHost}/index.html");
    }

    private static string? FindRepoFile(params string[] parts)
    {
        var cursor = new DirectoryInfo(AppContext.BaseDirectory);
        while (cursor is not null)
        {
            var candidate = Path.Combine(new[] { cursor.FullName }.Concat(parts).ToArray());
            if (File.Exists(candidate))
            {
                return candidate;
            }

            cursor = cursor.Parent;
        }

        return null;
    }
}
