# Windows Host Setup

For a full **Windows developer onboarding** guide (prerequisite versions, troubleshooting, Vite + WebView2 debugging), see [windows-dev-setup.md](./windows-dev-setup.md). Optional read-only checks: `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\setup-dev.ps1`.

## Requirements

- Windows 10 19041 or newer, or Windows 11
- .NET 8 SDK
- Microsoft Edge WebView2 Runtime
- Microsoft Windows App Runtime `1.8.260209` for Windows App SDK app notifications
- Node.js and pnpm for building the shared frontend

### Windows App Runtime

QuickNote uses Windows App SDK app notifications through `AppNotificationManager`. The Windows host project references Windows App SDK `1.8.260209005`, so the matching Windows App Runtime must be installed on development and test machines before system notification delivery can be validated.

Download the official runtime installer from Microsoft:

```powershell
Invoke-WebRequest `
  -Uri "https://aka.ms/windowsappsdk/1.8/1.8.260209005/windowsappruntimeinstall-x64.exe" `
  -OutFile "D:\tmp\WindowsAppRuntimeInstall-x64.exe"
```

Install the runtime MSIX packages from an elevated PowerShell session:

```powershell
Start-Process `
  -FilePath "D:\tmp\WindowsAppRuntimeInstall-x64.exe" `
  -ArgumentList "--msix --force" `
  -Verb RunAs `
  -Wait
```

The installer help and dry-run checks are useful when diagnosing missing runtime registration:

```powershell
D:\tmp\WindowsAppRuntimeInstall-x64.exe --help
D:\tmp\WindowsAppRuntimeInstall-x64.exe --dry-run
```

`--dry-run` may report `Provisioning of WindowsAppSDK packages will be skipped as it requires elevation` when it is not running with administrator rights. In that state, notification COM activation can still fail with `REGDB_E_CLASSNOTREG` even though the installer exits successfully.

For manual inspection or fallback installation, download the matching redistributable ZIP:

```powershell
Invoke-WebRequest `
  -Uri "https://aka.ms/windowsappsdk/1.8/1.8.260209005/Microsoft.WindowsAppRuntime.Redist.1.8.zip" `
  -OutFile "D:\tmp\Microsoft.WindowsAppRuntime.Redist.1.8.260209005.zip"

Expand-Archive `
  -Path "D:\tmp\Microsoft.WindowsAppRuntime.Redist.1.8.260209005.zip" `
  -DestinationPath "D:\tmp\Microsoft.WindowsAppRuntime.Redist.1.8.260209005" `
  -Force
```

The x64 MSIX packages are under:

```text
D:\tmp\Microsoft.WindowsAppRuntime.Redist.1.8.260209005\MSIX\win10-x64
```

## Dev Run

From the repo root on Windows:

```powershell
pnpm install
pnpm windows:run
```

If PowerShell blocks the `pnpm.ps1` shim because of the local execution policy, use the command shim instead:

```powershell
pnpm.cmd install
pnpm.cmd windows:run
```

`pnpm windows:run` builds `apps/frontend/dist`, then starts:

```powershell
dotnet run --project apps/windows-host/QuickNote.Windows.csproj
```

For a live frontend dev server, run these in separate terminals:

```powershell
pnpm frontend:dev
$env:QUICKNOTE_FRONTEND_URL = "http://127.0.0.1:1420"
dotnet run --project apps/windows-host/QuickNote.Windows.csproj
```

## Build

```powershell
pnpm windows:build
```

The WPF project copies the built frontend from `apps/frontend/dist` into the host output under `web/`.

Useful validation commands:

```powershell
dotnet restore apps/windows-host/QuickNote.Windows.csproj
pnpm build
pnpm exec vitest --config apps/frontend/vite.config.ts --run
dotnet build apps/windows-host/QuickNote.Windows.csproj
pnpm windows:run
```

## Features

- Frontend loading: by default the host maps the built shared frontend folder into WebView2 as `https://quicknote.local/index.html`. This avoids Chromium blocking Vite's module JS/CSS when loaded through `file://`. Set `QUICKNOTE_FRONTEND_URL` to load a Vite dev server.
- Bridge injection: WebView2 injects `window.quickNoteHost` at document start with the same contract as `packages/native-bridge`. The shared bridge intentionally excludes shell-only operations such as drag, minimize, maximize, and close; the Windows host owns those behaviors.
- Window summon/toggle: implemented in WPF and exposed through `quickNoteHost`.
- Window shell: WPF uses the native Windows frame (`WindowStyle=SingleBorderWindow`) so the system titlebar, caption buttons, resize behavior, and red close-button hover treatment remain native.
- Rounded corners: the host requests DWM rounded corners where supported by the Windows desktop compositor.
- Always on top: implemented with WPF `Topmost` plus Win32 `SetWindowPos(HWND_TOPMOST)`. When QuickNote is shown over a same-monitor fullscreen window, the host suppresses Windows taskbar windows while the panel remains visible, returns focus to the current z-order window below the panel when it hides, and only restores taskbar windows once no same-monitor fullscreen peer remains. During editable focus, the host stops the topmost reinforcement timer so it does not periodically cover IME UI. During active text composition, it temporarily lowers the panel out of the topmost band while keeping QuickNote focused, then promotes Chinese IME candidate/composition windows so input UI stays above the note panel.
- Global hotkey: implemented with Win32 `RegisterHotKey`. Default Windows shortcut is `Ctrl+Shift+Space`. A failed shortcut change returns a clear error and the host attempts to restore the previous registration.
- Settings/data: stored as JSON under `%APPDATA%\QuickNote` as `notes.json`, `todos.json`, and `settings.json`.
- Notifications/reminders: app-managed timers display desktop notifications while QuickNote is running. Todo reminders are resynced when todos or settings are saved.
- Clipboard: `quickNoteHost.readClipboardText()` and `quickNoteHost.writeClipboardText()` use the WPF clipboard APIs.
- DevTools: `quickNoteHost.openDevTools()` opens WebView2 devtools.
- Quit: `quickNoteHost.quitApplication()` shuts down the WPF application.

## Verification Notes

Validated on Windows with:

- Node.js `v24.15.0`
- pnpm `10.33.0`
- .NET SDK `8.0.420`
- Microsoft Edge WebView2 Runtime `147.0.3912.72`
- Microsoft Windows App Runtime installer `1.8.260209`

The following automated checks passed:

```powershell
dotnet restore apps/windows-host/QuickNote.Windows.csproj
pnpm build
pnpm exec vitest --config apps/frontend/vite.config.ts --run
dotnet build apps/windows-host/QuickNote.Windows.csproj
pnpm windows:build
```

`pnpm windows:run` was smoke-tested and successfully started the `QuickNote.Windows` process. Full behavioral checks for global hotkey invocation, topmost behavior over specific third-party fullscreen/borderless apps, tray notification display, clipboard prompts, and DevTools interaction still require hands-on validation on the target Windows desktop session.

## Limitations

Windows does not allow an ordinary desktop app to appear above every fullscreen-exclusive, secure desktop, UAC, lock screen, or shell-owned surface. QuickNote uses the strongest normal desktop topmost behavior, which works for regular windows and many borderless fullscreen apps but is not identical to macOS Spaces/fullscreen auxiliary behavior.

Reminder scheduling is currently process-bound. If QuickNote is closed before a reminder fires, the reminder will not fire until durable scheduled notifications are added.

The current notification implementation uses Windows App SDK app notifications through `AppNotificationManager`, so test reminders and delivered reminders use the Windows system notification surface instead of legacy tray balloon tips. Test reminders and scheduled todo reminders use the Windows App SDK reminder scenario with a Dismiss button so Windows treats them as user-visible reminders instead of ordinary toasts; `enableReminderSound` maps to muted app notification audio when disabled. The settings-page test notification uses a unique notification tag and confirms that Windows reports it in Notification Center before returning success; if Windows accepts the `Show` call but drops the notification, the bridge reports a diagnostic error instead of a false success state.

Windows App SDK app notifications are not supported when QuickNote is running elevated as administrator. In that state Windows can accept the `Show` call without displaying a toast, so the app blocks notification delivery and reports a restart-without-admin error before showing a false success state.

The development build is framework-dependent for Windows App SDK, so the target machine must have the Windows App Runtime installed. A portable/self-contained distribution should publish with an explicit Windows runtime identifier such as `win-x64` and enable self-contained Windows App SDK deployment.

Some global shortcuts may be reserved by Windows or another app. Registration fails cleanly in that case and the user should choose another shortcut.
