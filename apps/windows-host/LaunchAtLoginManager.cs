using Microsoft.Win32;

namespace Floatem.Windows;

internal sealed class LaunchAtLoginManager
{
    private const string RunKeyPath = @"Software\Microsoft\Windows\CurrentVersion\Run";
    private const string ValueName = "Floatem";

    public void SetEnabled(bool enabled)
    {
        using var runKey = Registry.CurrentUser.CreateSubKey(RunKeyPath, writable: true)
            ?? throw new InvalidOperationException("Floatem could not open the Windows startup registry key.");

        if (!enabled)
        {
            runKey.DeleteValue(ValueName, throwOnMissingValue: false);
            return;
        }

        var executablePath = Environment.ProcessPath;
        if (string.IsNullOrWhiteSpace(executablePath))
        {
            throw new InvalidOperationException("Floatem could not determine its executable path for startup registration.");
        }

        runKey.SetValue(ValueName, $"\"{executablePath}\"", RegistryValueKind.String);
    }
}
