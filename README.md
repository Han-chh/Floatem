# Floatem

> Current release: **Floatem 1.1.0 (macOS build 68)**. This release adds a Dock-free menu-bar workflow, state-aware recovery and quit controls, safer global-shortcut Agent lifecycle handling, and rich-text-preserving Note copy and paste. The Windows host remains a developer-preview target rather than part of the current Mac App Store release.

Floatem is a lightweight, local-first desktop notes and todos app designed to capture and organize thoughts without interrupting the current workflow. The macOS app can be summoned with a global shortcut, float editable cards above other work, and pin app-owned cards at the desktop level.

“Don't lose thoughts. Float'em.”

## Product capabilities

- Rich-text notes and dated todos with local groups, filters, colors, reminders, reordering, and bulk Todo actions.
- Rich-text Note copy and paste that preserves supported bold, italic, underline, and text-color formatting without inheriting the active toolbar style.
- A global shortcut and a persistent, bilingual menu-bar menu for showing or hiding Floatem, reloading and revealing the interface, and quitting the app.
- A Dock-free macOS accessory-app workflow, plus a compact in-app right-click menu for quitting from the Main Window or a floating card.
- Editable floating Note/Todo cards on macOS, including resize, always-on-top behavior, and drag-back.
- Desktop-pinned macOS cards restored from local state when Floatem is running; enabling **Open Floatem at login** restores them after login without opening the Main Window.
- English and Simplified Chinese UI, six themes, motion controls, time-zone/time-format controls, and reminder sound settings.
- Bilingual, version-independent help aligned with current behavior, plus a seven-workflow action-driven interactive guide. Each step advances only after its instructed action; there are no manual previous/next controls. On a fresh installation, Floatem highlights the upper-right help entry once and asks the user to open the guide.
- A ServiceManagement-managed Release shortcut Agent that validates its registered installation, repairs stale registrations, reports conflicts, and releases the shortcut when the containing app is removed. Debug uses an isolated process-local `Option+Shift+Space` shortcut with no background Agent.
- Local persistence only. macOS data is stored in the Floatem App Group container; the app has no account or cloud-sync feature.

## Repository status

Floatem uses a shared React frontend with isolated native host layers:

- `apps/frontend`: shared React/Vite UI.
- `apps/mac-host`: AppKit/WKWebView host.
- `apps/windows-host`: C# WPF/WebView2 developer-preview host using Win32 APIs for global hotkeys and topmost behavior.
- `packages/native-bridge`: typed frontend/host bridge contract.
- `packages/branding`: shared app identity metadata.

## Docs

- [v1.1.0 release state and release notes](docs/releases/v1.1.0.md)
- [v1.1.0 manual release checklist](docs/releases/v1.1.0-manual-test-checklist.md)
- [Architecture](docs/architecture.md)
- [Historical macOS prelaunch plan and current completion status](docs/four-day-prelaunch-plan.md)
- [macOS setup](docs/macos-setup.md)
- [macOS desktop-card migration and regression guide](docs/macos-widget-migration.md)
- [Platform support](docs/platform-support.md)
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
- **Desktop-pinned Card**: an app-owned `DesktopCardPanel` placed near the desktop window level and restored from typed entity/placement state.

Desktop-pinned cards require Floatem to remain running. Enabling **Open Floatem at login** lets the silent Login Item launch recreate them after a Mac restart without opening the Main Window.

## Release artifacts

Build outputs under `build/` and Xcode archives under `~/Library/Developer/Xcode/Archives/` are intentionally not tracked by Git. A fresh clone or a moved working directory must regenerate them; see [macOS setup](docs/macos-setup.md).
