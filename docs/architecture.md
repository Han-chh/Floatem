# StickIt Cross-Platform Architecture

StickIt is split into a shared React frontend and isolated native host layers.

## Directory Layout

- `apps/frontend`: shared React/Vite UI, stores, hooks, tests, and layout specs.
- `apps/mac-host`: AppKit/WKWebView host and Xcode project.
- `apps/windows-host`: C# WPF/WebView2 host with Win32 interop.
- `packages/native-bridge`: TypeScript bridge contract shared by frontend and host implementers.
- `packages/branding`: shared app identity metadata and TypeScript branding constants.
- `docs`: architecture and platform run/build guides.
- `scripts`: repo-level build helpers for packaging the frontend into native hosts.

## Boundary

The frontend talks only to `window.stickItHost`, typed by `HostBridge` in `packages/native-bridge`.
Native implementations own platform behavior:

- rounded native window shape, shadow, title/drag region, resize hit testing, and window controls
- window show, hide, toggle, minimize, maximize, close, and always-on-top policy
- global shortcut registration
- notification delivery and reminder scheduling
- native settings persistence
- clipboard access
- devtools and app lifecycle commands

`apps/frontend/src/lib/nativeBridge.ts` provides a browser fallback so the UI can run in Vite without a native host. The old `window.stickItNative` name is kept as a compatibility alias only; new host integrations should expose `window.stickItHost`.

## macOS Host

The macOS host remains AppKit + WKWebView. `WebViewController` injects `stickItHost` and dispatches bridge requests to `MainWindowController`, `AppStorage`, `GlobalHotKeyManager`, and `NotificationManager`.

`MainWindowController` creates the AppKit shell as the visible app window: a titled, resizable `NSPanel` with native traffic-light controls, AppKit shadow, AppKit resize handling, and movable title/background regions. `WebViewController` is only the interior content view and no longer clips or rounds the outer window surface.

macOS uses AppKit window levels and collection behaviors such as `canJoinAllSpaces` and `fullScreenAuxiliary` for overlay behavior.

The macOS product has three deliberately separate surfaces:

1. **Main Window** — AppKit `NSPanel` containing the full React application.
2. **Floating Editing Card** — a borderless AppKit `NSPanel` containing the lightweight `floating.html` entry. It keeps full editing, formatting, clipboard, IME, resize, drag-back, always-on-top, and cross-Space behavior.
3. **Desktop Widget** — the `StickItWidgets` WidgetKit extension. It reads App Group snapshots, is positioned/restored by macOS, and opens the matching Floating Editing Card through `stickit://open?kind=…&id=…&mode=floating`.

Desktop presentation no longer creates or restores a desktop-level `NSPanel`. The compatibility bridge method `setFloatingCardDesktopPinned` maps to an entity-only Widget request. WidgetKit does not expose a public API for silently placing a Widget, so the frontend explains the system Widget Gallery step.

### Shared data and migration

The authoritative macOS data lives in App Group `group.com.stickit.app`, under `SharedData/`. The main app and Widget extension share `notes.json`, `todos.json`, settings, Widget preferences, and typed floating-window state. On first use, `LegacyDataMigrator` atomically copies missing valid JSON from `~/Library/Application Support/com.stickit.app/`; source files remain untouched. Legacy `desktop-cards.json` records are reduced to unique `kind + entityID` preferences (schema version 1), with payload and absolute desktop frame discarded.

### WebKit and window lifecycle

Floating WebViews use a single `WKProcessPool`, `WKWebsiteDataStore`, shared bootstrap `WKUserScript`, and a dedicated Vite entry. Closing removes delegates, scripts, message handlers, and view hierarchy before the panel/controller is released. Diagnostics log created, destroyed, and active WebView counts. WebView reuse is intentionally not implemented because editor selection, undo, IME, and entity isolation are safer with on-demand instances.

Floating window state records display UUID, previous visible frame, normalized position, size, and schema version. The shared placement resolver prefers the original display, otherwise selects the largest frame intersection or primary display, then clamps and shrinks against the current `visibleFrame`. The same clamper is used for the main window.

### Launch behavior

`SMAppService.mainApp` login launches initialize services without showing or activating the Main Window. Finder/Dock/Spotlight launches show on the first actual app activation, reopen always shows, and Widget/deep-link launches open only the target Floating Editing Card. Because `SMAppService.mainApp` does not expose a launch-reason API, managed builds can use `--stickit-login-item`; the normal fallback is activation-state based and contains no timing delay.

## Windows Host

The Windows host is C# WPF + WebView2. This keeps the shared frontend intact while giving the host direct access to native Win32 APIs.

- `MainWindow.xaml` uses the native Windows frame with `WindowStyle=SingleBorderWindow`, preserving the system titlebar, caption buttons, resize behavior, and standard close-button hover treatment.
- The WPF host keeps window shell actions outside the shared frontend bridge; minimize, maximize, close, resize, and titlebar drag are owned by the native Windows frame.
- `Win32HotKeyManager` uses `RegisterHotKey`.
- `WindowInterop` uses `SetWindowPos(HWND_TOPMOST)`, foreground activation, DWM window-corner attributes, and IME-window promotion.
- `NotificationScheduler` uses an app-managed timer scheduler and Windows desktop notification surface while StickIt is running.
- `AppStorage` stores the same logical JSON data under `%APPDATA%\StickIt`.

Windows cannot guarantee that a normal desktop topmost window appears above every fullscreen-exclusive game, secure desktop, or shell-owned surface. The host implements the strongest reliable topmost behavior for regular desktop and borderless/fullscreen app scenarios.

## Branding

`packages/branding/branding.json` is the shared source of truth for display name, product name, bundle/app identifiers, and icon asset references. Platform packaging still requires platform-specific icon formats:

- macOS: `apps/mac-host/StickItMacOS/Resources/AppIcon.icns`
- Windows: `apps/windows-host/Assets/AppIcon.ico`

The Windows host copies `branding.json` into output and reads it at runtime. The frontend imports `stickItBranding` for app name display.
