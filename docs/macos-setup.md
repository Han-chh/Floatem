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

This builds the shared frontend from `apps/frontend`, compiles `apps/mac-host/QuickNote.xcodeproj`, and opens:

```text
build/DerivedData/Build/Products/Debug/QuickNote.app
```

## Build Only

```bash
pnpm macos:build
```

The Xcode build phase calls `scripts/build-web-assets.sh`, which rebuilds the frontend when needed and copies a WKWebView-safe bundle into the app resources under `web/`.

## Xcode Workflow

```bash
pnpm frontend:build
open apps/mac-host/QuickNote.xcodeproj
```

Then run the `QuickNote` scheme.

## Native Capabilities

- AppKit owns app lifecycle, menu bar item, status menu, window levels, and overlay behavior.
- Carbon hotkeys provide the global shortcut.
- UserNotifications schedules test notifications and todo reminders.
- WKWebView injects the shared `quickNoteHost` bridge into the React frontend.
