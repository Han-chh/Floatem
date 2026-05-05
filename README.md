# QuickNote

QuickNote is a cross-platform desktop app with a shared React frontend and isolated native host layers.

- `apps/frontend`: shared React/Vite UI.
- `apps/mac-host`: AppKit/WKWebView host.
- `apps/windows-host`: C# WPF/WebView2 host using Win32 APIs for global hotkeys and topmost behavior.
- `packages/native-bridge`: typed frontend/host bridge contract.
- `packages/branding`: shared app identity metadata.

## Docs

- [Architecture](docs/architecture.md)
- [macOS setup](docs/macos-setup.md)
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
- `pnpm windows:build`: build frontend and Windows host.
