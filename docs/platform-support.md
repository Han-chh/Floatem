# Floatem Platform Support

Status for **Floatem v1.0.8**:

| Feature | macOS v1.0.8 | Windows developer preview | Browser preview |
| --- | --- | --- | --- |
| Notes, rich-text editing, groups, colors, filters | Supported | Supported | UI/fallback storage only |
| Todos, dates, groups, filters | Supported | Supported | UI/fallback storage only |
| Native reminders/notifications | Supported | Supported while the host is running | Not supported |
| Global shortcut | Supported; default `Shift+Space` | Supported; default `Ctrl+Shift+Space` | Not supported |
| Floating Note/Todo editing cards | Supported | Not supported | Not supported |
| Desktop-pinned cards and login restoration | Supported | Not supported | Not supported |
| Launch at login | Supported through `SMAppService.mainApp` | Supported through the current-user Run key | Not supported |
| Bilingual help and interactive guide | Supported | Supported for shared/frontend flows | Supported for shared/frontend flows |
| App Store Connect/TestFlight distribution | Current production target | Not applicable | Not applicable |

The Windows host intentionally disables native floating Note/Todo cards because its previous composition path was not stable enough. It retains the regular Notes, Todos, settings, reminders, global shortcut, local persistence, and native-window experience. Windows v1.0.8 is a developer-preview code target and has not been packaged as a formal v1.0.8 store release.

Floatem cannot appear above the macOS secure desktop or every Windows exclusive-fullscreen/secure surface. Desktop-pinned cards are Floatem-owned windows, not WidgetKit widgets, and exist only while Floatem is running.
