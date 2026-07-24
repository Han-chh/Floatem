using System.Runtime.InteropServices;
using System.Text;
using System.Windows;
using System.Windows.Interop;

namespace Floatem.Windows.Native;

internal static partial class WindowInterop
{
    private static readonly IntPtr HwndTopmost = new(-1);
    private static readonly IntPtr HwndNotTopmost = new(-2);
    private const int DwmWindowCornerPreference = 33;
    private const int DwmWindowBorderColor = 34;
    private const int DwmWindowCornerPreferenceRound = 2;
    private const uint GwHwndNext = 2;
    private const uint GwOwner = 4;
    private const uint DwmColorDefault = 0xFFFFFFFF;
    private const uint SwpNoSize = 0x0001;
    private const uint SwpNoMove = 0x0002;
    private const uint SwpNoActivate = 0x0010;
    private const uint SwpShowWindow = 0x0040;

    public static void BringToFront(Window window, bool activate)
    {
        var handle = new WindowInteropHelper(window).Handle;
        if (handle == IntPtr.Zero)
        {
            return;
        }

        var flags = SwpNoMove | SwpNoSize | SwpShowWindow;
        if (!activate)
        {
            flags |= SwpNoActivate;
        }

        SetWindowPos(handle, HwndTopmost, 0, 0, 0, 0, flags);
        if (activate)
        {
            SetForegroundWindow(handle);
        }
    }

    public static IntPtr GetForegroundWindowExcluding(Window window)
    {
        var foregroundHandle = GetForegroundWindow();
        var ownerHandle = new WindowInteropHelper(window).Handle;
        if (!IsCandidateForegroundWindow(foregroundHandle, ownerHandle, requireUnownedWindow: false))
        {
            return IntPtr.Zero;
        }

        return foregroundHandle;
    }

    public static IntPtr GetNextForegroundWindowBelow(Window window)
    {
        var ownerHandle = new WindowInteropHelper(window).Handle;
        if (ownerHandle == IntPtr.Zero)
        {
            return IntPtr.Zero;
        }

        var firstEligibleWindow = IntPtr.Zero;
        var currentHandle = GetWindow(ownerHandle, GwHwndNext);
        var ownerRectAvailable = TryGetWindowRect(ownerHandle, out var ownerRect);

        while (currentHandle != IntPtr.Zero)
        {
            if (IsCandidateForegroundWindow(currentHandle, ownerHandle, requireUnownedWindow: true)
                && TryGetWindowRect(currentHandle, out var currentRect)
                && HasUsableBounds(currentRect))
            {
                if (firstEligibleWindow == IntPtr.Zero)
                {
                    firstEligibleWindow = currentHandle;
                }

                if (!ownerRectAvailable || RectanglesIntersect(ownerRect, currentRect))
                {
                    return currentHandle;
                }
            }

            currentHandle = GetWindow(currentHandle, GwHwndNext);
        }

        return firstEligibleWindow;
    }

    public static void RestoreForegroundWindow(IntPtr handle)
    {
        if (handle == IntPtr.Zero || !IsWindowVisible(handle))
        {
            return;
        }

        SetForegroundWindow(handle);
    }

    private static bool IsCandidateForegroundWindow(IntPtr handle, IntPtr ownerHandle, bool requireUnownedWindow)
    {
        if (handle == IntPtr.Zero || handle == ownerHandle || !IsWindowVisible(handle) || IsIconic(handle))
        {
            return false;
        }

        if (requireUnownedWindow && GetWindow(handle, GwOwner) != IntPtr.Zero)
        {
            return false;
        }

        GetWindowThreadProcessId(handle, out var processId);
        if (processId == Environment.ProcessId)
        {
            return false;
        }

        return !LooksLikeShellWindow(handle) && !LooksLikeImeWindow(handle);
    }

    private static bool LooksLikeShellWindow(IntPtr handle)
    {
        var className = GetClassName(handle);
        return className.Equals("Shell_TrayWnd", StringComparison.Ordinal)
            || className.Equals("Shell_SecondaryTrayWnd", StringComparison.Ordinal)
            || className.Equals("Progman", StringComparison.Ordinal)
            || className.Equals("WorkerW", StringComparison.Ordinal)
            || className.Equals("Windows.UI.Core.CoreWindow", StringComparison.Ordinal);
    }

    public static void SetTopmost(Window window, bool enabled, bool activate)
    {
        var handle = new WindowInteropHelper(window).Handle;
        if (handle == IntPtr.Zero)
        {
            return;
        }

        var flags = SwpNoMove | SwpNoSize | SwpShowWindow;
        if (!activate)
        {
            flags |= SwpNoActivate;
        }

        SetWindowPos(handle, enabled ? HwndTopmost : HwndNotTopmost, 0, 0, 0, 0, flags);
        if (activate)
        {
            SetForegroundWindow(handle);
        }
    }

    public static void ApplyNativeWindowShell(Window window)
    {
        var handle = new WindowInteropHelper(window).Handle;
        if (handle == IntPtr.Zero)
        {
            return;
        }

        var cornerPreference = DwmWindowCornerPreferenceRound;
        _ = DwmSetWindowAttribute(
            handle,
            DwmWindowCornerPreference,
            ref cornerPreference,
            Marshal.SizeOf<int>());

        var borderColor = DwmColorDefault;
        _ = DwmSetWindowAttribute(
            handle,
            DwmWindowBorderColor,
            ref borderColor,
            Marshal.SizeOf<uint>());
    }

    public static void PromoteImeWindowsAbove(Window window)
    {
        var ownerHandle = new WindowInteropHelper(window).Handle;
        if (ownerHandle == IntPtr.Zero)
        {
            return;
        }

        EnumWindows((handle, _) =>
        {
            if (handle == ownerHandle || !IsWindowVisible(handle))
            {
                return true;
            }

            if (!LooksLikeImeWindow(handle))
            {
                return true;
            }

            SetWindowPos(handle, HwndTopmost, 0, 0, 0, 0, SwpNoMove | SwpNoSize | SwpNoActivate | SwpShowWindow);
            return true;
        }, IntPtr.Zero);
    }

    private static bool LooksLikeImeWindow(IntPtr handle)
    {
        var className = GetClassName(handle);
        if (className.Contains("IME", StringComparison.OrdinalIgnoreCase)
            || className.Contains("Candidate", StringComparison.OrdinalIgnoreCase)
            || className.Contains("Cicero", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        GetWindowThreadProcessId(handle, out var processId);
        try
        {
            using var process = System.Diagnostics.Process.GetProcessById((int)processId);
            var processName = process.ProcessName;
            return processName.Contains("TextInputHost", StringComparison.OrdinalIgnoreCase)
                || processName.Contains("ChsIME", StringComparison.OrdinalIgnoreCase)
                || processName.Contains("MicrosoftIME", StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return false;
        }
    }

    private static string GetClassName(IntPtr handle)
    {
        var builder = new StringBuilder(256);
        var length = GetClassName(handle, builder, builder.Capacity);
        return length > 0 ? builder.ToString(0, length) : string.Empty;
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

    private static bool HasUsableBounds(Rectangle rectangle)
    {
        return rectangle.Right > rectangle.Left && rectangle.Bottom > rectangle.Top;
    }

    private static bool RectanglesIntersect(Rectangle first, Rectangle second)
    {
        return first.Left < second.Right
            && first.Right > second.Left
            && first.Top < second.Bottom
            && first.Bottom > second.Top;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct Rectangle
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [LibraryImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static partial bool SetWindowPos(
        IntPtr hWnd,
        IntPtr hWndInsertAfter,
        int x,
        int y,
        int cx,
        int cy,
        uint uFlags);

    [LibraryImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static partial bool SetForegroundWindow(IntPtr hWnd);

    [LibraryImport("user32.dll")]
    private static partial IntPtr GetForegroundWindow();

    [LibraryImport("user32.dll")]
    private static partial IntPtr GetWindow(IntPtr hWnd, uint uCmd);

    [LibraryImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static partial bool GetWindowRect(IntPtr hWnd, out Rectangle lpRect);

    private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [LibraryImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static partial bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [LibraryImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static partial bool IsWindowVisible(IntPtr hWnd);

    [LibraryImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static partial bool IsIconic(IntPtr hWnd);

    [DllImport("user32.dll", EntryPoint = "GetClassNameW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    [LibraryImport("user32.dll")]
    private static partial uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [LibraryImport("dwmapi.dll")]
    private static partial int DwmSetWindowAttribute(
        IntPtr hwnd,
        int dwAttribute,
        ref int pvAttribute,
        int cbAttribute);

    [LibraryImport("dwmapi.dll")]
    private static partial int DwmSetWindowAttribute(
        IntPtr hwnd,
        int dwAttribute,
        ref uint pvAttribute,
        int cbAttribute);
}
