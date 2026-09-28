# macOS desktop-card migration and regression guide

This guide applies to the current desktop-card implementation. It documents an active compatibility path, not a current WidgetKit extension: Floatem ships no WidgetKit target.

## Migration

Schema version 1 moves authoritative macOS data from:

```text
~/Library/Application Support/com.floatem.app/
```

to the App Group container:

```text
group.com.hankch.floatem/SharedData/
```

Only missing destination files are migrated. JSON is validated before an atomic write; repeated runs are idempotent; failures leave the old files intact. `desktop-cards.json` is retained in the legacy directory. Its unique Note/Todo references, and any references from the short-lived Widget pin flow, are converted to typed `desktop-panel-states.json` records. Full Note/Todo payloads are not copied. Current content is always loaded from the authoritative data files.

Desktop pinning uses `DesktopCardPanel`. Floatem restores these panels during both ordinary and silent Login Item launches, clamps them to current displays, and removes state for deleted entities. The restored Web payload is resized to the final resolved native frame before the panel is shown, so compact Todo cards retain every action control. Floatem must remain running for its desktop panels to exist.

## Manual regression checklist

1. Ordinary Finder, Spotlight, or App Store launch shows the Main Window; Floatem remains absent from the Dock.
2. Login Item launch initializes silently, restores desktop-pinned cards, and does not show or focus the Main Window.
3. Pin a Note to the desktop and verify it becomes a desktop-level editable panel.
4. Pin a Todo to the desktop and verify it remains editable.
5. Disable Open Floatem at login, pin a card, and verify the background-running warning appears.
6. Delete an entity referenced by a desktop panel and verify it is not recreated on the next launch.
7. Place a floating card on a second display, disconnect it, and reopen the card on-screen.
8. Change resolution/scaling and verify restored cards remain in `visibleFrame`.
9. Switch Spaces and verify floating editing behavior.
10. Enter a full-screen application and verify configured overlay behavior.
11. Edit with a Chinese IME, including composition candidate windows.
12. Drag out and dock back the same card 20 times; inspect WebKit active counts for zero growth.
13. Open 10 floating cards simultaneously; verify shared-process diagnostics and editing isolation.
14. Restart Floatem and verify shared data plus desktop/floating frame restoration; the pin, group, reminder, and close controls must remain fully visible and usable.
15. Restart macOS with Open Floatem at login enabled; verify desktop panels return while the Main Window stays hidden.
16. Pin a Todo and verify only the circular pin indicator turns black; the outer rounded button keeps its normal border and background.

The former WidgetKit extension is no longer shipped. Desktop pinning is implemented only with app-owned `DesktopCardPanel` windows.
