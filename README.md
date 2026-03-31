# QuickNote

QuickNote is now a pure macOS native host:

- `AppKit` owns the app lifecycle, menu bar item, Dock presence, window toggling, and global shortcut.
- `WKWebView` loads the existing React/Vite frontend so the notes and todos UI stays visually consistent.
- Frontend state persists to JSON in `~/Library/Application Support/com.quicknote.app/`.

## Project Layout

- `QuickNote.xcodeproj`: native macOS app target.
- `QuickNoteMacOS/`: Swift host, window controller, global hotkey manager, and bridge code.
- `src/`: existing React UI and business logic.
- `scripts/build-web-assets.sh`: copies built Vite assets into the app bundle.

## Run

1. `pnpm install`
2. `pnpm macos:run`

That command builds the frontend, compiles the native app, and opens:

- `build/DerivedData/Build/Products/Debug/QuickNote.app`

## Build Only

- `pnpm build`: build the frontend bundle.
- `pnpm macos:build`: build the frontend and compile the native macOS app.

## Xcode Workflow

If you want to run from Xcode:

1. `pnpm build`
2. Open `QuickNote.xcodeproj`
3. Run the `QuickNote` scheme

The Xcode target copies `dist/` into the bundle during the build, so the frontend bundle must already exist.
