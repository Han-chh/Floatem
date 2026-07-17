using System.IO;
using System.Text.Json;

namespace StickIt.Windows;

internal static class Branding
{
    public static string DisplayName { get; } = LoadValue("displayName", "StickIt");
    public static string ProductName { get; } = LoadValue("productName", "StickIt");
    public static string AppUserModelId { get; } = LoadValue("windowsAppUserModelId", "com.stickit.app");

    private static string LoadValue(string propertyName, string fallback)
    {
        var path = Path.Combine(AppContext.BaseDirectory, "branding", "branding.json");
        if (!File.Exists(path))
        {
            return fallback;
        }

        using var document = JsonDocument.Parse(File.ReadAllText(path));
        return document.RootElement.TryGetProperty(propertyName, out var value)
            ? value.GetString() ?? fallback
            : fallback;
    }
}
