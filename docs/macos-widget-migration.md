# macOS Widget migration and regression guide

## Migration

Schema version 1 moves authoritative macOS data from:

```text
~/Library/Application Support/com.stickit.app/
```

to the App Group container:

```text
group.com.stickit.app/SharedData/
```

Only missing destination files are migrated. JSON is validated before an atomic write; repeated runs are idempotent; failures leave the old files intact. `desktop-cards.json` is retained in the legacy directory and reduced to unique Note/Todo entity references in `desktop-widget-preferences.json`. Full payloads and desktop frames are not copied. `legacy-data-migration.json` and `desktop-pin-migration.json` record schema version 1 completion.

The old DesktopCardPanel path is migration-only and is never restored at launch. macOS owns Widget position, family, restart restoration, and lifecycle.

## Manual regression checklist

1. Ordinary Finder/Dock/Spotlight launch shows the Main Window.
2. Login Item launch initializes silently without focus or Main Window.
3. Clicking a Note Widget opens only its Floating Editing Card.
4. Clicking a Todo Widget opens only its Floating Editing Card.
5. Toggle a Todo directly in its Widget and verify app data/timeline refresh.
6. Delete an entity referenced by a Widget and verify the unavailable-content placeholder.
7. Place a floating card on a second display, disconnect it, and reopen the card on-screen.
8. Change resolution/scaling and verify restored cards remain in `visibleFrame`.
9. Switch Spaces and verify floating editing behavior.
10. Enter a full-screen application and verify configured overlay behavior.
11. Edit with a Chinese IME, including composition candidate windows.
12. Drag out and dock back the same card 20 times; inspect WebKit active counts for zero growth.
13. Open 10 floating cards simultaneously; verify shared-process diagnostics and editing isolation.
14. Restart StickIt and verify shared data plus floating frame restoration.
15. Restart macOS and verify the system restores Widgets without StickIt creating desktop panels.

WidgetKit provides no public API for an app to silently add, place, resize, or remove a desktop Widget. The first pin request therefore guides the user to macOS Widget Gallery; clearing the StickIt association does not remove a Widget already placed by the user.
