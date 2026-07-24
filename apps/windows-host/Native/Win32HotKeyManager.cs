using System.Diagnostics;
using System.Runtime.InteropServices;
using System.ComponentModel;
using System.Windows;
using System.Windows.Input;
using System.Windows.Interop;

namespace Floatem.Windows.Native;

internal sealed partial class Win32HotKeyManager : IDisposable
{
    internal readonly record struct RegistrationState(string Shortcut, string Registration, string? Message = null);

    private const int HotKeyId = 0x514E;
    private const int WmHotKey = 0x0312;
    private readonly Window window;
    private HwndSource? source;
    private string registeredShortcut = "Shift+Space";
    private RegistrationState registrationState = new("Shift+Space", "unsupported", null);

    public event EventHandler<string>? HotKeyPressed;
    public event EventHandler<RegistrationState>? RegistrationStateChanged;

    public Win32HotKeyManager(Window window)
    {
        this.window = window;
        window.SourceInitialized += (_, _) =>
        {
            source = HwndSource.FromHwnd(new WindowInteropHelper(window).Handle);
            source?.AddHook(WndProc);
            try
            {
                Register(registeredShortcut);
            }
            catch (InvalidOperationException ex)
            {
                // Reserved or taken by another app — do not crash startup; user can pick another shortcut in Settings.
                Debug.WriteLine($"Floatem: initial global hotkey not registered: {ex.Message}");
            }
        };
    }

    public void Register(string shortcut)
    {
        var nextShortcut = AppStorage.NormalizeShortcut(shortcut);
        if (source is null)
        {
            registeredShortcut = nextShortcut;
            registrationState = new(nextShortcut, "unsupported", null);
            return;
        }

        var previousShortcut = registeredShortcut;
        var parsed = HotKeyParser.Parse(nextShortcut);
        Unregister();
        if (!RegisterHotKey(source.Handle, HotKeyId, parsed.Modifiers, parsed.VirtualKey))
        {
            var error = Marshal.GetLastWin32Error();
            var message =
                $"Windows could not register global shortcut '{nextShortcut}'. The shortcut may be reserved or already in use. Win32 error {error}: {new Win32Exception(error).Message}";
            if (!TryRestorePreviousShortcut(previousShortcut))
            {
                registrationState = new(nextShortcut, "conflict", message);
                RegistrationStateChanged?.Invoke(this, registrationState);
            }
            throw new InvalidOperationException(message);
        }

        registeredShortcut = nextShortcut;
        registrationState = new(nextShortcut, "registered", null);
        RegistrationStateChanged?.Invoke(this, registrationState);
    }

    public void Unregister()
    {
        if (source is not null)
        {
            UnregisterHotKey(source.Handle, HotKeyId);
        }
    }

    public void Dispose()
    {
        Unregister();
        source?.RemoveHook(WndProc);
    }

    public RegistrationState GetRegistrationState()
    {
        return registrationState;
    }

    private IntPtr WndProc(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
    {
        if (msg == WmHotKey && wParam.ToInt32() == HotKeyId)
        {
            handled = true;
            HotKeyPressed?.Invoke(this, registeredShortcut);
        }

        return IntPtr.Zero;
    }

    private bool TryRestorePreviousShortcut(string previousShortcut)
    {
        if (source is null || string.IsNullOrWhiteSpace(previousShortcut))
        {
            return false;
        }

        try
        {
            var parsed = HotKeyParser.Parse(previousShortcut);
            if (RegisterHotKey(source.Handle, HotKeyId, parsed.Modifiers, parsed.VirtualKey))
            {
                registeredShortcut = previousShortcut;
                registrationState = new(previousShortcut, "registered", null);
                RegistrationStateChanged?.Invoke(this, registrationState);
                return true;
            }
        }
        catch
        {
            // The original registration is best-effort after a failed shortcut change.
        }

        return false;
    }

    [LibraryImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static partial bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);

    [LibraryImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static partial bool UnregisterHotKey(IntPtr hWnd, int id);

    private readonly record struct ParsedHotKey(uint Modifiers, uint VirtualKey);

    private static class HotKeyParser
    {
        private const uint ModAlt = 0x0001;
        private const uint ModControl = 0x0002;
        private const uint ModShift = 0x0004;
        private const uint ModWin = 0x0008;

        public static ParsedHotKey Parse(string shortcut)
        {
            var modifiers = 0u;
            uint? key = null;

            foreach (var rawToken in shortcut.Split('+', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                var token = rawToken.ToLowerInvariant();
                switch (token)
                {
                    case "ctrl":
                    case "control":
                    case "cmd":
                    case "command":
                        modifiers |= ModControl;
                        break;
                    case "shift":
                        modifiers |= ModShift;
                        break;
                    case "alt":
                    case "option":
                        modifiers |= ModAlt;
                        break;
                    case "win":
                    case "windows":
                        modifiers |= ModWin;
                        break;
                    default:
                        key = KeyInterop.VirtualKeyFromKey(ParseKey(token)) is var vk && vk > 0
                            ? (uint)vk
                            : throw new InvalidOperationException($"Unsupported global shortcut key '{rawToken}'.");
                        break;
                }
            }

            if (modifiers == 0 || key is null)
            {
                throw new InvalidOperationException($"Unsupported global shortcut '{shortcut}'.");
            }

            return new ParsedHotKey(modifiers, key.Value);
        }

        private static Key ParseKey(string token)
        {
            if (token == "space")
            {
                return Key.Space;
            }

            if (token.Length == 1 && token[0] >= 'a' && token[0] <= 'z')
            {
                return Enum.Parse<Key>(token.ToUpperInvariant());
            }

            if (token.Length == 1 && token[0] >= '0' && token[0] <= '9')
            {
                return Enum.Parse<Key>($"D{token}");
            }

            return Enum.Parse<Key>(token, ignoreCase: true);
        }
    }
}
