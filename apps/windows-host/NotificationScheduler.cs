using System.Text.Json.Nodes;
using System.Diagnostics;
using System.Security.Principal;
using Microsoft.Windows.AppNotifications;
using Microsoft.Windows.AppNotifications.Builder;

namespace QuickNote.Windows;

internal sealed class NotificationScheduler : IDisposable
{
    private readonly Dictionary<string, System.Threading.Timer> timers = new();
    private readonly object gate = new();
    private readonly string appName;
    private AppNotificationManager? notificationManager;
    private bool isNotificationEventAttached;
    private bool isRegistered;
    private Exception? registrationError;
    private bool registrationAttempted;

    public event EventHandler? NotificationInvoked;

    public NotificationScheduler(string appName)
    {
        this.appName = appName;
    }

    public void Show(string title, string body, bool soundEnabled)
    {
        ShowCore(title, body, soundEnabled, tag: null, group: null, useReminderScenario: false);
    }

    public async Task ShowAndConfirmAsync(string title, string body, bool soundEnabled, string tag, string group)
    {
        var manager = ShowCore(title, body, soundEnabled, tag, group, useReminderScenario: true);
        await ConfirmNotificationDeliveredAsync(manager, tag, group);
    }

    private AppNotificationManager ShowCore(
        string title,
        string body,
        bool soundEnabled,
        string? tag,
        string? group,
        bool useReminderScenario)
    {
        EnsureProcessCanShowAppNotifications();
        var manager = EnsureNotificationManager();

        var setting = manager.Setting;
        if (setting != AppNotificationSetting.Enabled)
        {
            throw new InvalidOperationException($"Windows app notifications are not enabled for QuickNote ({setting}).");
        }

        var builder = new AppNotificationBuilder()
            .AddArgument("source", "quicknote")
            .AddText(title);

        if (!string.IsNullOrWhiteSpace(body))
        {
            builder.AddText(body);
        }

        if (!soundEnabled)
        {
            builder.MuteAudio();
        }
        else if (useReminderScenario)
        {
            builder.SetAudioEvent(AppNotificationSoundEvent.Reminder);
        }

        if (useReminderScenario)
        {
            builder
                .SetScenario(AppNotificationScenario.Reminder)
                .AddButton(new AppNotificationButton("Dismiss")
                    .AddArgument("action", "dismiss"));
        }

        if (!string.IsNullOrWhiteSpace(tag))
        {
            builder.SetTag(tag);
        }

        if (!string.IsNullOrWhiteSpace(group))
        {
            builder.SetGroup(group);
        }

        var notification = builder.BuildNotification();
        notification.SuppressDisplay = false;
        notification.Priority = AppNotificationPriority.High;

        manager.Show(notification);
        return manager;
    }

    private AppNotificationManager EnsureNotificationManager()
    {
        if (notificationManager is not null && isRegistered)
        {
            return notificationManager;
        }

        if (registrationError is not null)
        {
            throw new InvalidOperationException(
                $"QuickNote could not register Windows app notifications: {registrationError.Message}",
                registrationError);
        }

        if (registrationAttempted)
        {
            throw new InvalidOperationException("QuickNote could not register Windows app notifications.");
        }

        registrationAttempted = true;

        try
        {
            var manager = AppNotificationManager.Default;
            notificationManager = manager;
            manager.NotificationInvoked += OnNotificationInvoked;
            isNotificationEventAttached = true;
            manager.Register();
            isRegistered = true;

            return manager;
        }
        catch (Exception error)
        {
            if (isNotificationEventAttached && notificationManager is not null)
            {
                notificationManager.NotificationInvoked -= OnNotificationInvoked;
            }

            isNotificationEventAttached = false;
            isRegistered = false;
            notificationManager = null;
            registrationError = error;

            throw new InvalidOperationException(
                $"QuickNote could not register Windows app notifications: {error.Message}",
                error);
        }
    }

    public void Schedule(string id, string title, string body, DateTimeOffset scheduledAt, bool soundEnabled)
    {
        _ = ScheduleCore(id, title, body, scheduledAt, soundEnabled, reportDeliveryErrors: false);
    }

    public Task ScheduleAndConfirmAsync(string id, string title, string body, DateTimeOffset scheduledAt, bool soundEnabled)
    {
        return ScheduleCore(id, title, body, scheduledAt, soundEnabled, reportDeliveryErrors: true);
    }

    private Task ScheduleCore(string id, string title, string body, DateTimeOffset scheduledAt, bool soundEnabled, bool reportDeliveryErrors)
    {
        Cancel(id);
        var delay = scheduledAt - DateTimeOffset.Now;
        if (delay <= TimeSpan.Zero)
        {
            Show(title, body, soundEnabled);
            return Task.CompletedTask;
        }

        var completion = reportDeliveryErrors
            ? new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously)
            : null;

        var timer = new System.Threading.Timer(
            _ =>
            {
                Cancel(id);
                try
                {
                    if (completion is not null)
                    {
                        var tag = $"quicknote.test.{Guid.NewGuid():N}";
                        ShowAndConfirmAsync(title, body, soundEnabled, tag, "quicknote.test").GetAwaiter().GetResult();
                    }
                    else
                    {
                        ShowCore(title, body, soundEnabled, tag: null, group: null, useReminderScenario: true);
                    }
                    completion?.TrySetResult();
                }
                catch (Exception error)
                {
                    Debug.WriteLine($"QuickNote failed to show scheduled notification '{id}': {error.Message}");
                    completion?.TrySetException(error);
                }
            },
            null,
            delay,
            Timeout.InfiniteTimeSpan);

        lock (gate)
        {
            timers[id] = timer;
        }

        return completion?.Task ?? Task.CompletedTask;
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

        if (isRegistered && notificationManager is not null)
        {
            notificationManager.Unregister();
            isRegistered = false;
        }

        if (isNotificationEventAttached && notificationManager is not null)
        {
            notificationManager.NotificationInvoked -= OnNotificationInvoked;
            isNotificationEventAttached = false;
        }
    }

    private void OnNotificationInvoked(AppNotificationManager sender, AppNotificationActivatedEventArgs args)
    {
        NotificationInvoked?.Invoke(this, EventArgs.Empty);
    }

    private void EnsureProcessCanShowAppNotifications()
    {
        if (!IsProcessElevated())
        {
            return;
        }

        throw new InvalidOperationException(
            $"Windows app notifications are not supported while {appName} is running as administrator. Restart {appName} without elevated/admin privileges and try again.");
    }

    private static bool IsProcessElevated()
    {
        using var identity = WindowsIdentity.GetCurrent();
        var principal = new WindowsPrincipal(identity);
        return principal.IsInRole(WindowsBuiltInRole.Administrator);
    }

    private async Task ConfirmNotificationDeliveredAsync(AppNotificationManager manager, string tag, string group)
    {
        for (var attempt = 0; attempt < 10; attempt++)
        {
            var deliveredNotifications = await manager.GetAllAsync();
            if (deliveredNotifications.Any((notification) => notification.Tag == tag && notification.Group == group))
            {
                return;
            }

            await Task.Delay(200);
        }

        throw new InvalidOperationException(
            "Windows accepted the QuickNote notification request, but the notification did not appear in Notification Center. Check Windows notification settings, Focus Assist/Do Not Disturb, and whether banner notifications are disabled for QuickNote.");
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
