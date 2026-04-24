using System.IO;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace QuickNote.Windows;

internal sealed class AppStorage
{
    private readonly string dataDirectory = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "QuickNote");

    private readonly JsonSerializerOptions jsonOptions = new() { WriteIndented = true };

    public JsonObject LoadAllData()
    {
        return new JsonObject
        {
            ["notes"] = ReadJson("notes.json") ?? new JsonArray(),
            ["todos"] = ReadJson("todos.json") ?? new JsonArray(),
            ["settings"] = LoadSettings(),
        };
    }

    public JsonObject LoadSettings()
    {
        var settings = DefaultSettings();
        if (ReadJson("settings.json") is JsonObject saved)
        {
            foreach (var pair in saved)
            {
                settings[pair.Key] = pair.Value?.DeepClone();
            }
        }

        settings["hotkey"] = NormalizeShortcut(settings["hotkey"]?.GetValue<string>() ?? "Ctrl+Shift+Space");
        SaveJson("settings.json", settings);
        return settings;
    }

    public void SaveNotes(JsonNode notes)
    {
        SaveJson("notes.json", notes);
    }

    public JsonArray LoadTodos()
    {
        return ReadJson("todos.json") as JsonArray ?? new JsonArray();
    }

    public void SaveTodos(JsonNode todos)
    {
        SaveJson("todos.json", todos);
    }

    public void SaveSettings(JsonObject settings)
    {
        var merged = DefaultSettings();
        foreach (var pair in settings)
        {
            merged[pair.Key] = pair.Value?.DeepClone();
        }

        merged["hotkey"] = NormalizeShortcut(merged["hotkey"]?.GetValue<string>() ?? "Ctrl+Shift+Space");
        SaveJson("settings.json", merged);
    }

    public static string NormalizeShortcut(string shortcut)
    {
        if (string.IsNullOrWhiteSpace(shortcut))
        {
            return "Ctrl+Shift+Space";
        }

        var tokens = shortcut
            .Split('+', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(token => token.Equals("cmd", StringComparison.OrdinalIgnoreCase) ||
                token.Equals("command", StringComparison.OrdinalIgnoreCase)
                    ? "Ctrl"
                    : token)
            .ToArray();

        return tokens.Length == 0 ? "Ctrl+Shift+Space" : string.Join("+", tokens);
    }

    private JsonNode? ReadJson(string fileName)
    {
        var path = Path.Combine(dataDirectory, fileName);
        return File.Exists(path) ? JsonNode.Parse(File.ReadAllText(path)) : null;
    }

    private void SaveJson(string fileName, JsonNode node)
    {
        Directory.CreateDirectory(dataDirectory);
        File.WriteAllText(Path.Combine(dataDirectory, fileName), node.ToJsonString(jsonOptions));
    }

    private static JsonObject DefaultSettings()
    {
        return new JsonObject
        {
            ["hotkey"] = "Ctrl+Shift+Space",
            ["language"] = "en",
            ["panelPosition"] = null,
            ["activeTab"] = "notes",
            ["lastActiveTab"] = "notes",
            ["defaultOpenSection"] = "last",
            ["transitionStyle"] = "page",
            ["animationSpeed"] = "mediate",
            ["enableParticles"] = true,
            ["enableReminderSound"] = true,
        };
    }
}
