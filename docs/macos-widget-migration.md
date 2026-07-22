# macOS desktop-card migration and regression guide

## Migration

Schema version 1 moves authoritative macOS data from:

```text
~/Library/Application Support/com.stickit.app/
```

to the App Group container:

```text
group.com.stickit.app/SharedData/
```

Only missing destination files are migrated. JSON is validated before an atomic write; repeated runs are idempotent; failures leave the old files intact. `desktop-cards.json` is retained in the legacy directory. Its unique Note/Todo references, and any references from the short-lived Widget pin flow, are converted to typed `desktop-panel-states.json` records. Full Note/Todo payloads are not copied. Current content is always loaded from the authoritative data files.

Desktop pinning uses `DesktopCardPanel`. StickIt restores these panels during both ordinary and silent Login Item launches, clamps them to current displays, and removes state for deleted entities. StickIt must remain running for its desktop panels to exist.

## Manual regression checklist

1. Ordinary Finder/Dock/Spotlight launch shows the Main Window.
2. Login Item launch initializes silently, restores desktop-pinned cards, and does not show or focus the Main Window.
3. Pin a Note to the desktop and verify it becomes a desktop-level editable panel.
4. Pin a Todo to the desktop and verify it remains editable.
5. Disable Open StickIt at login, pin a card, and verify the background-running warning appears.
6. Delete an entity referenced by a desktop panel and verify it is not recreated on the next launch.
7. Place a floating card on a second display, disconnect it, and reopen the card on-screen.
8. Change resolution/scaling and verify restored cards remain in `visibleFrame`.
9. Switch Spaces and verify floating editing behavior.
10. Enter a full-screen application and verify configured overlay behavior.
11. Edit with a Chinese IME, including composition candidate windows.
12. Drag out and dock back the same card 20 times; inspect WebKit active counts for zero growth.
13. Open 10 floating cards simultaneously; verify shared-process diagnostics and editing isolation.
14. Restart StickIt and verify shared data plus desktop/floating frame restoration.
15. Restart macOS with Open StickIt at login enabled; verify desktop panels return while the Main Window stays hidden.

The former WidgetKit extension is no longer shipped. Desktop pinning is implemented only with app-owned `DesktopCardPanel` windows.
