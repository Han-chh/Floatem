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

## Signing and App Group

The `StickIt` target requires App Group:

```text
group.com.stickit.app
```

Debug builds use the local Apple Development team. Release builds use automatic App Store signing with the Apple Distribution team. Both configurations enable App Sandbox, Hardened Runtime, and the shared App Group above.

Release archives are intended for App Store Connect/TestFlight distribution. Direct-download distribution would require a separate Developer ID and notarization configuration.

Xcode automatically development-signs the Release archive, then uses the Apple Distribution certificate and `apps/mac-host/ExportOptions.plist` to re-sign the exported App Store package after the App Store Connect app record and Mac App Store provisioning profile exist.

Shared data resolves to the App Group container's `SharedData/` directory. The repository commands use `CODE_SIGNING_ALLOWED=NO` for compilation and unit tests; a runnable or archived Release still needs valid App Group provisioning through Xcode.

## Tests

```bash
pnpm test
pnpm macos:test
```

The Xcode suite avoids initializing production services or touching the real App Group when hosted by XCTest.
