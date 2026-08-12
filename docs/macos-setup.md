# macOS Host Setup

Current release identity:

```text
Version: 1.0.9
Build: 50
Bundle ID: com.hankch.floatem
App Group: group.com.hankch.floatem
Team: 85923Q9JUG
```

## Requirements

- macOS with Xcode command line tools
- Node.js and pnpm

## Run

From the repo root:

```bash
pnpm install
pnpm macos:run
```

This builds the shared frontend from `apps/frontend`, compiles `apps/mac-host/Floatem.xcodeproj`, and opens:

```text
build/DerivedData/Build/Products/Debug/Floatem.app
```

## Build Only

```bash
pnpm macos:build
```

The Xcode build phase calls `scripts/build-web-assets.sh`, which rebuilds the frontend when needed and copies a WKWebView-safe bundle into the app resources under `web/`.

## Xcode Workflow

```bash
pnpm frontend:build
open apps/mac-host/Floatem.xcodeproj
```

Then run the `Floatem` scheme.

## Native Capabilities

- AppKit owns app lifecycle, menu bar item, status menu, window levels, and overlay behavior.
- Carbon hotkeys provide the global shortcut.
- UserNotifications schedules test notifications and todo reminders.
- WKWebView injects the shared `floatemHost` bridge into the React frontend.
- `DesktopCardPanel` provides app-owned desktop-pinned cards. Floatem must stay running; the Login Item silently recreates saved panels after login.

## Signing and App Group

The `Floatem` target requires App Group:

```text
group.com.hankch.floatem
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

## v1.0.8 Archive and export

The verified v1.0.8 workflow is:

```bash
pnpm install
pnpm test -- --run
pnpm macos:test

xcodebuild archive \
  -project apps/mac-host/Floatem.xcodeproj \
  -scheme Floatem \
  -configuration Release \
  -destination 'generic/platform=macOS' \
  -archivePath "$HOME/Library/Developer/Xcode/Archives/<date>/Floatem 1.0.8 (49).xcarchive" \
  -allowProvisioningUpdates

xcodebuild -exportArchive \
  -archivePath "$HOME/Library/Developer/Xcode/Archives/<date>/Floatem 1.0.8 (49).xcarchive" \
  -exportPath build/AppStoreExport/Floatem-1.0.8-49 \
  -exportOptionsPlist apps/mac-host/ExportOptions.plist \
  -allowProvisioningUpdates
```

The export must report an Apple Distribution certificate and `Mac Team Store Provisioning Profile: com.hankch.floatem`, with App Group `group.com.hankch.floatem`. `ITSAppUsesNonExemptEncryption` is `false`.

The archive and exported `.pkg` are local artifacts: `build/` is ignored by Git and `~/Library/Developer/Xcode/Archives/` is outside the repository. Moving or recloning the working directory does not move either artifact.
