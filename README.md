# StickIt

StickIt is a cross-platform desktop app with a shared React frontend and isolated native host layers.

- `apps/frontend`: shared React/Vite UI.
- `apps/mac-host`: AppKit/WKWebView host.
- `apps/mac-host/StickItWidgets`: macOS 14+ WidgetKit extension for desktop and Notification Center display.
- `apps/windows-host`: C# WPF/WebView2 host using Win32 APIs for global hotkeys and topmost behavior.
- `packages/native-bridge`: typed frontend/host bridge contract.
- `packages/branding`: shared app identity metadata.

## Docs

- [Architecture](docs/architecture.md)
- [Four-day macOS prelaunch plan](docs/four-day-prelaunch-plan.md)
- [macOS setup](docs/macos-setup.md)
- [macOS Widget migration and regression guide](docs/macos-widget-migration.md)
- [Windows setup (host features)](docs/windows-setup.md)
- [Windows dev environment](docs/windows-dev-setup.md)

## Run Frontend Only

```bash
pnpm install
pnpm dev
```

## Run macOS

1. `pnpm install`
2. `pnpm macos:run`

## Run Windows

On Windows:

```powershell
pnpm install
pnpm windows:run
```

## Build

- `pnpm build`: build the shared frontend.
- `pnpm macos:build`: build frontend and macOS host.
- `pnpm macos:test`: run the macOS XCTest suite.
- `pnpm windows:build`: build frontend and Windows host.

## macOS surfaces

- **Main Window**: browsing, settings, global shortcut entry, and card drag-out.
- **Floating Editing Card**: AppKit `NSPanel` + lightweight Web UI for full Note/Todo editing, resize, IME, clipboard, formatting, and drag-back.
- **Desktop Widget**: WidgetKit-owned read/quick-action surface. Clicking it opens the matching Floating Editing Card.

macOS controls Widget placement and lifecycle. StickIt can remember the requested entity and guide the user to Widget Gallery, but cannot silently add a Widget to the desktop.
