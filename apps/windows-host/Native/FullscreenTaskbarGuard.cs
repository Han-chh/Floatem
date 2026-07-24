using System.Runtime.InteropServices;
using System.Text;
using System.Windows;
using System.Windows.Interop;

namespace Floatem.Windows.Native;

internal sealed partial class FullscreenTaskbarGuard
{
    private static readonly IntPtr MonitorDefaultToNearest = new(2);
    private const int SwHide = 0;
    private const int SwShow = 5;
    private const uint GwOwner = 4;
    private readonly HashSet<IntPtr> hiddenTaskbars = [];

    public void Update(Window overlayWindow)
    {
        if (!ShouldSuppressTaskbar(overlayWindow))
        {
            Restore();
            return;
        }

        foreach (var taskbarHandle in EnumerateTaskbars())
        {
            if (taskbarHandle == IntPtr.Zero || !IsWindowVisible(taskbarHandle))
            {
                continue;
            }

            ShowWindow(taskbarHandle, SwHide);
            if (!hiddenTaskbars.Contains(taskbarHandle))
            {
                hiddenTaskbars.Add(taskbarHandle);
            }
        }
    }

    public void Restore()
    {
        foreach (var taskbarHandle in hiddenTaskbars.ToArray())
        {
            if (taskbarHandle != IntPtr.Zero)
            {
                ShowWindow(taskbarHandle, SwShow);
            }
        }

        hiddenTaskbars.Clear();
    }

    public bool RestoreUnlessFullscreenPeerExists(Window overlayWindow)
    {
        if (HasFullscreenPeer(overlayWindow))
        {
            return false;
        }

        Restore();
        return true;
    }

    private static bool ShouldSuppressTaskbar(Window overlayWindow)
    {
        if (!overlayWindow.IsVisible || overlayWindow.WindowState == WindowState.Minimized)
        {
            return false;
        }

        return HasFullscreenPeer(overlayWindow);
    }

    private static bool HasFullscreenPeer(Window overlayWindow)
    {
        var overlayHandle = new WindowInteropHelper(overlayWindow).Handle;
        if (overlayHandle == IntPtr.Zero)
        {
            return false;
        }

        var overlayMonitor = MonitorFromWindow(overlayHandle, MonitorDefaultToNearest);
        if (overlayMonitor == IntPtr.Zero || !TryGetMonitorRect(overlayMonitor, out var monitorRect))
        {
            return false;
        }

        var currentProcessId = Environment.ProcessId;
        var hasFullscreenWindow = false;

        EnumWindows((handle, _) =>
        {
            if (handle == overlayHandle || !IsWindowVisible(handle) || IsIconic(handle))
            {
                return true;
            }

            if (GetWindow(handle, GwOwner) != IntPtr.Zero || IsShellWindow(handle))
            {
                return true;
            }

            GetWindowThreadProcessId(handle, out var processId);
            if (processId == (uint)currentProcessId)
            {
                return true;
            }

            var monitor = MonitorFromWindow(handle, MonitorDefaultToNearest);
            if (monitor != overlayMonitor || !TryGetWindowRect(handle, out var windowRect))
            {
                return true;
            }

            if (CoversMonitor(windowRect, monitorRect))
            {
                hasFullscreenWindow = true;
                return false;
            }

            return true;
        }, IntPtr.Zero);

        return hasFullscreenWindow;
    }

    private static IEnumerable<IntPtr> EnumerateTaskbars()
    {
        var primaryTaskbar = FindWindow("Shell_TrayWnd", null);
        if (primaryTaskbar != IntPtr.Zero)
        {
            yield return primaryTaskbar;
        }

        var secondaryTaskbars = new List<IntPtr>();
        EnumWindows((handle, _) =>
        {
            if (GetClassName(handle).Equals("Shell_SecondaryTrayWnd", StringComparison.Ordinal))
            {
                secondaryTaskbars.Add(handle);
            }

            return true;
        }, IntPtr.Zero);

        foreach (var taskbar in secondaryTaskbars)
        {
            yield return taskbar;
        }
    }

    private static bool IsShellWindow(IntPtr handle)
    {
        var className = GetClassName(handle);
        return className.Equals("Shell_TrayWnd", StringComparison.Ordinal)
            || className.Equals("Shell_SecondaryTrayWnd", StringComparison.Ordinal)
            || className.Equals("Progman", StringComparison.Ordinal)
            || className.Equals("WorkerW", StringComparison.Ordinal)
            || className.Equals("Windows.UI.Core.CoreWindow", StringComparison.Ordinal);
    }

    private static bool CoversMonitor(Rectangle windowRect, Rectangle monitorRect)
    {
        const int tolerance = 2;
        return windowRect.Left <= monitorRect.Left + tolerance
            && windowRect.Top <= monitorRect.Top + tolerance
            && windowRect.Right >= monitorRect.Right - tolerance
            && windowRect.Bottom >= monitorRect.Bottom - tolerance;
    }

    private static bool TryGetWindowRect(IntPtr handle, out Rectangle rectangle)
    {
        if (GetWindowRect(handle, out rectangle))
        {
            return true;
        }

        rectangle = default;
        return false;
    }

    private static bool TryGetMonitorRect(IntPtr monitor, out Rectangle rectangle)
    {
        var info = new MonitorInfo
        {
            Size = Marshal.SizeOf<MonitorInfo>(),
        };

        if (GetMonitorInfo(monitor, ref info))
        {
            rectangle = info.Monitor;
            return true;
        }

        rectangle = default;
        return false;
    }

    private static string GetClassName(IntPtr handle)
    {
        var builder = new StringBuilder(256);
        var length = GetClassName(handle, builder, builder.Capacity);
        return length > 0 ? builder.ToString(0, length) : string.Empty;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct Rectangle
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MonitorInfo
    {
        public int Size;
        public Rectangle Monitor;
        public Rectangle WorkArea;
        public uint Flags;
    }

    private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [LibraryImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static partial bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [LibraryImport("user32.dll", EntryPoint = "FindWindowW", StringMarshalling = StringMarshalling.Utf16)]
    private static partial IntPtr FindWindow(string lpClassName, string? lpWindowName);

    [DllImport("user32.dll", EntryPoint = "GetClassNameW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    [LibraryImport("user32.dll", EntryPoint = "GetMonitorInfoW")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static partial bool GetMonitorInfo(IntPtr hMonitor, ref MonitorInfo lpmi);

    [LibraryImport("user32.dll")]
    private static partial IntPtr GetWindow(IntPtr hWnd, uint uCmd);

    [LibraryImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static partial bool GetWindowRect(IntPtr hWnd, out Rectangle lpRect);

    [LibraryImport("user32.dll")]
    private static partial uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [LibraryImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static partial bool IsIconic(IntPtr hWnd);

    [LibraryImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static partial bool IsWindowVisible(IntPtr hWnd);

    [LibraryImport("user32.dll")]
    private static partial IntPtr MonitorFromWindow(IntPtr hwnd, IntPtr dwFlags);

    [LibraryImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static partial bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
