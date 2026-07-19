# macOS Host Setup

## Requirements

- macOS with Xcode command line tools
- Node.js and pnpm

## Run

From the repo root:

```bash
pnpm install
pnpm macos:run
```

This builds the shared frontend from `apps/frontend`, compiles `apps/mac-host/StickIt.xcodeproj`, and opens:

```text
build/DerivedData/Build/Products/Debug/StickIt.app
```

## Build Only

```bash
pnpm macos:build
```

The Xcode build phase calls `scripts/build-web-assets.sh`, which rebuilds the frontend when needed and copies a WKWebView-safe bundle into the app resources under `web/`.

## Xcode Workflow

```bash
pnpm frontend:build
open apps/mac-host/StickIt.xcodeproj
```

Then run the `StickIt` scheme.

## Native Capabilities

- AppKit owns app lifecycle, menu bar item, status menu, window levels, and overlay behavior.
- Carbon hotkeys provide the global shortcut.
- UserNotifications schedules test notifications and todo reminders.
- WKWebView injects the shared `stickItHost` bridge into the React frontend.
- `DesktopCardPanel` provides app-owned desktop-pinned cards. StickIt must stay running; the Login Item silently recreates saved panels after login.
- WidgetKit and AppIntents provide Note/Todo desktop Widgets and Todo completion toggles.

## Signing and App Group

The `StickIt` and `StickItWidgets` targets both require App Group:

```text
group.com.stickit.app
```

Select a development team that owns `com.stickit.app` and `com.stickit.app.widgets`, then enable the same App Group for both identifiers in Apple Developer/Xcode. The extension is embedded at `StickIt.app/Contents/PlugIns/StickItWidgets.appex`. Hardened Runtime remains enabled.

Shared data resolves to the App Group container's `SharedData/` directory. The repository commands use `CODE_SIGNING_ALLOWED=NO` so compilation and tests work before provisioning is installed; a runnable/archive Widget still needs valid App Group signing through Xcode or an appropriately provisioned release pipeline.

## Tests

```bash
pnpm test
pnpm macos:test
```

The Xcode suite avoids initializing production services or touching the real App Group when hosted by XCTest.
