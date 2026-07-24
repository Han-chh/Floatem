using System.IO;
using System.Windows;
using System.Windows.Interop;
using System.Windows.Threading;
using Microsoft.Web.WebView2.Core;
using Floatem.Windows.Native;

namespace Floatem.Windows;

public partial class MainWindow : Window
{
    private const string FrontendVirtualHost = "floatem.local";
    private const int WmClose = 0x0010;
    private const int WmSysCommand = 0x0112;
    private const int ScClose = 0xF060;
    private readonly AppStorage storage = new();
    private readonly NotificationScheduler notifications;
    private readonly Win32HotKeyManager hotKeys;
    private readonly LaunchAtLoginManager launchAtLogin = new();
    private readonly DispatcherTimer topmostReinforcementTimer;
    private readonly DispatcherTimer imeReinforcementTimer;
    private readonly DispatcherTimer deferredTaskbarRestoreTimer;
    private readonly FullscreenTaskbarGuard taskbarGuard = new();
    private HostBridgeController? bridge;
    private HwndSource? source;
    private IntPtr previousForegroundWindow;
    private bool allowApplicationShutdown;
    private bool alwaysOnTopEnabled = true;
    private bool isEditableInputActive;
    private bool isTextCompositionActive;

    public MainWindow()
    {
        InitializeComponent();
        Title = Branding.DisplayName;

        notifications = new NotificationScheduler(Branding.DisplayName);
        notifications.NotificationInvoked += (_, _) =>
        {
            Dispatcher.Invoke(ShowWindow);
        };
        hotKeys = new Win32HotKeyManager(this);
        hotKeys.HotKeyPressed += (_, shortcut) =>
        {
            ToggleWindow();
            _ = bridge?.EmitShortcutInvokedAsync(shortcut);
        };
        topmostReinforcementTimer = new DispatcherTimer(DispatcherPriority.Background)
        {
            Interval = TimeSpan.FromMilliseconds(350),
        };
        topmostReinforcementTimer.Tick += (_, _) => ReinforceAlwaysOnTop();
        imeReinforcementTimer = new DispatcherTimer(DispatcherPriority.Background)
        {
            Interval = TimeSpan.FromMilliseconds(90),
        };
        imeReinforcementTimer.Tick += (_, _) => ReinforceImeWindows();
        deferredTaskbarRestoreTimer = new DispatcherTimer(DispatcherPriority.Background)
        {
            Interval = TimeSpan.FromMilliseconds(500),
        };
        deferredTaskbarRestoreTimer.Tick += (_, _) => RestoreTaskbarWhenFullscreenPeerEnds();

        Loaded += OnLoaded;
        Activated += (_, _) => UpdateWindowPresentationForCurrentInteraction();
        Deactivated += (_, _) => UpdateWindowPresentationForCurrentInteraction();
        StateChanged += (_, _) => UpdateWindowPresentationForCurrentInteraction();
        IsVisibleChanged += (_, _) => UpdateWindowPresentationForCurrentInteraction();
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
            topmostReinforcementTimer.Stop();
            imeReinforcementTimer.Stop();
            deferredTaskbarRestoreTimer.Stop();
            taskbarGuard.Restore();
        };
    }

    public void ShowWindow()
    {
        var foregroundWindow = WindowInterop.GetForegroundWindowExcluding(this);
        if (foregroundWindow != IntPtr.Zero)
        {
            previousForegroundWindow = foregroundWindow;
        }

        deferredTaskbarRestoreTimer.Stop();
        Show();
        WindowState = WindowState.Normal;
        alwaysOnTopEnabled = true;
        isEditableInputActive = false;
        isTextCompositionActive = false;
        UpdateWindowPresentationForCurrentInteraction();
        Activate();
        WebView.Focus();
        WindowInterop.BringToFront(this, activate: false);
        UpdateWindowPresentationForCurrentInteraction();
        _ = bridge?.EmitPanelWillOpenAsync();
    }

    public void HideWindow()
    {
        var restoreTarget = WindowInterop.GetNextForegroundWindowBelow(this);
        if (restoreTarget == IntPtr.Zero)
        {
            restoreTarget = previousForegroundWindow;
        }

        isEditableInputActive = false;
        isTextCompositionActive = false;
        Hide();
        topmostReinforcementTimer.Stop();
        imeReinforcementTimer.Stop();
        WindowInterop.RestoreForegroundWindow(restoreTarget);
        if (!taskbarGuard.RestoreUnlessFullscreenPeerExists(this))
        {
            deferredTaskbarRestoreTimer.Start();
        }
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
        alwaysOnTopEnabled = enabled;
        UpdateWindowPresentationForCurrentInteraction();
    }

    public void SetEditableInputActive(bool active)
    {
        isEditableInputActive = active;
        if (!active)
        {
            isTextCompositionActive = false;
        }

        UpdateWindowPresentationForCurrentInteraction();
    }

    public void SetTextCompositionActive(bool active)
    {
        isTextCompositionActive = active;
        if (active)
        {
            isEditableInputActive = true;
        }

        UpdateWindowPresentationForCurrentInteraction();
    }

    private void ReinforceAlwaysOnTop()
    {
        if (!ShouldUseTopmostOverlay() || IsTextInputInteractionActive())
        {
            topmostReinforcementTimer.Stop();
            return;
        }

        Topmost = true;
        WindowInterop.SetTopmost(this, enabled: true, activate: false);
    }

    private void UpdateWindowPresentationForCurrentInteraction()
    {
        if (!IsVisible || WindowState == WindowState.Minimized)
        {
            topmostReinforcementTimer.Stop();
            imeReinforcementTimer.Stop();
            taskbarGuard.RestoreUnlessFullscreenPeerExists(this);
            return;
        }

        var shouldUseTopmostOverlay = ShouldUseTopmostOverlay();
        var shouldSoftenTopmostForTextComposition = shouldUseTopmostOverlay && isTextCompositionActive;

        if (shouldSoftenTopmostForTextComposition)
        {
            Topmost = false;
            Activate();
            WebView.Focus();
            WindowInterop.SetTopmost(this, enabled: false, activate: true);
            topmostReinforcementTimer.Stop();
            taskbarGuard.RestoreUnlessFullscreenPeerExists(this);
        }
        else
        {
            Topmost = shouldUseTopmostOverlay;
            WindowInterop.SetTopmost(this, enabled: shouldUseTopmostOverlay, activate: false);
            taskbarGuard.Update(this);

            if (shouldUseTopmostOverlay && !IsTextInputInteractionActive())
            {
                topmostReinforcementTimer.Stop();
                topmostReinforcementTimer.Start();
            }
            else
            {
                topmostReinforcementTimer.Stop();
            }
        }

        if (IsTextInputInteractionActive())
        {
            imeReinforcementTimer.Start();
            ReinforceImeWindows();
        }
        else
        {
            imeReinforcementTimer.Stop();
        }
    }

    private bool ShouldUseTopmostOverlay()
    {
        return alwaysOnTopEnabled
            && IsVisible
            && WindowState != WindowState.Minimized;
    }

    private bool IsTextInputInteractionActive()
    {
        return isEditableInputActive || isTextCompositionActive;
    }

    private void RestoreTaskbarWhenFullscreenPeerEnds()
    {
        if (IsVisible || !taskbarGuard.RestoreUnlessFullscreenPeerExists(this))
        {
            return;
        }

        deferredTaskbarRestoreTimer.Stop();
    }

    private void ReinforceImeWindows()
    {
        if (!IsVisible || WindowState == WindowState.Minimized || (!isEditableInputActive && !isTextCompositionActive))
        {
            return;
        }

        WindowInterop.PromoteImeWindowsAbove(this);
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

        var settings = storage.LoadSettings();
        launchAtLogin.SetEnabled(settings["launchAtLogin"]?.GetValue<bool>() ?? true);

        bridge = new HostBridgeController(this, WebView, storage, hotKeys, notifications, launchAtLogin);
        await bridge.InstallAsync();
        try
        {
            hotKeys.Register(settings["hotkey"]?.GetValue<string>() ?? "Shift+Space");
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
        var devUrl = Environment.GetEnvironmentVariable("FLOATEM_FRONTEND_URL");
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
