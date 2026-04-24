using System.Text.Json.Nodes;
using System.Windows;
using System.Windows.Forms;

namespace QuickNote.Windows;

internal sealed class NotificationScheduler : IDisposable
{
    private readonly NotifyIcon notifyIcon;
    private readonly Dictionary<string, System.Threading.Timer> timers = new();
    private readonly object gate = new();

    public NotificationScheduler(string appName)
    {
        notifyIcon = new NotifyIcon
        {
            Text = appName,
            Visible = true,
            Icon = System.Drawing.SystemIcons.Application,
        };
    }

    public void Show(string title, string body, bool soundEnabled)
    {
        System.Windows.Application.Current.Dispatcher.Invoke(() =>
        {
            notifyIcon.ShowBalloonTip(6000, title, body, ToolTipIcon.None);
        });
    }

    public void Schedule(string id, string title, string body, DateTimeOffset scheduledAt, bool soundEnabled)
    {
        Cancel(id);
        var delay = scheduledAt - DateTimeOffset.Now;
        if (delay <= TimeSpan.Zero)
        {
            Show(title, body, soundEnabled);
            return;
        }

        var timer = new System.Threading.Timer(
            _ =>
            {
                Cancel(id);
                Show(title, body, soundEnabled);
            },
            null,
            delay,
            Timeout.InfiniteTimeSpan);

        lock (gate)
        {
            timers[id] = timer;
        }
    }

    public void SyncTodoReminders(JsonArray todos, JsonObject settings)
    {
        lock (gate)
        {
            foreach (var timer in timers.Values)
            {
                timer.Dispose();
            }

            timers.Clear();
        }

        var soundEnabled = settings["enableReminderSound"]?.GetValue<bool>() ?? true;
        foreach (var todo in todos.OfType<JsonObject>())
        {
            var id = todo["id"]?.GetValue<string>();
            var text = todo["text"]?.GetValue<string>();
            var done = todo["done"]?.GetValue<bool>() ?? false;
            var reminderAt = ReadNullableLong(todo["reminderAt"]);

            if (string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(text) || done || reminderAt is null)
            {
                continue;
            }

            var fireDate = DateTimeOffset.FromUnixTimeMilliseconds(reminderAt.Value);
            Schedule($"quicknote.todo.reminder.{id}", "Todo reminder", text, fireDate, soundEnabled);
        }
    }

    public void Cancel(string id)
    {
        System.Threading.Timer? timer = null;
        lock (gate)
        {
            if (timers.Remove(id, out var removedTimer))
            {
                timer = removedTimer;
            }
        }

        if (timer is not null)
        {
            timer.Dispose();
        }
    }

    public void Dispose()
    {
        lock (gate)
        {
            foreach (var timer in timers.Values)
            {
                timer.Dispose();
            }

            timers.Clear();
        }

        notifyIcon.Dispose();
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
}
