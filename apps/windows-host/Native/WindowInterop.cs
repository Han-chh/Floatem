using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Interop;

namespace QuickNote.Windows.Native;

internal static partial class WindowInterop
{
    private static readonly IntPtr HwndTopmost = new(-1);
    private const int DwmWindowCornerPreference = 33;
    private const int DwmWindowBorderColor = 34;
    private const int DwmWindowCornerPreferenceRound = 2;
    private const uint DwmColorDefault = 0xFFFFFFFF;
    private const uint SwpNoSize = 0x0001;
    private const uint SwpNoMove = 0x0002;
    private const uint SwpShowWindow = 0x0040;

    public static void BringTopmostToFront(Window window)
    {
        var handle = new WindowInteropHelper(window).Handle;
        if (handle == IntPtr.Zero)
        {
            return;
        }

        SetWindowPos(handle, HwndTopmost, 0, 0, 0, 0, SwpNoMove | SwpNoSize | SwpShowWindow);
        SetForegroundWindow(handle);
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
