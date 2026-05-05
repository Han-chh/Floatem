# Windows Host Setup

For a full **Windows developer onboarding** guide (prerequisite versions, troubleshooting, Vite + WebView2 debugging), see [windows-dev-setup.md](./windows-dev-setup.md). Optional read-only checks: `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\setup-dev.ps1`.

## Requirements

- Windows 10 19041 or newer, or Windows 11
- .NET 8 SDK
- Microsoft Edge WebView2 Runtime
- Node.js and pnpm for building the shared frontend

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
- Window shell: WPF `WindowChrome` removes the default outer frame while preserving native resize hit testing and caption drag/snap behavior; the host titlebar owns drag, minimize, maximize, and close.
- Rounded corners: the host requests DWM rounded corners where supported by the Windows desktop compositor.
- Always on top: implemented with WPF `Topmost` plus Win32 `SetWindowPos(HWND_TOPMOST)`.
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

Reminder scheduling is currently process-bound. If QuickNote is closed before a reminder fires, the reminder will not fire until durable packaged notifications are added. The intended production path is MSIX packaging with Windows App SDK toast identity and activation.

The current notification implementation uses `NotifyIcon.ShowBalloonTip`, not Windows App SDK toast activation. This keeps the WPF/WebView2/Win32 host simple, but it does not provide durable background delivery, click activation routing, or full toast identity behavior. `enableReminderSound` is accepted by the bridge for contract compatibility, but balloon notification sound behavior is ultimately controlled by Windows.

Some global shortcuts may be reserved by Windows or another app. Registration fails cleanly in that case and the user should choose another shortcut.
