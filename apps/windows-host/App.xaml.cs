using System.Runtime.InteropServices;

namespace QuickNote.Windows;

public partial class App : System.Windows.Application
{
    protected override void OnStartup(System.Windows.StartupEventArgs e)
    {
        _ = SetCurrentProcessExplicitAppUserModelID(Branding.AppUserModelId);
        base.OnStartup(e);
    }

    [DllImport("shell32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern int SetCurrentProcessExplicitAppUserModelID(string appId);
}
