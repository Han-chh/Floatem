# Floatem host lifecycle and recovery evaluation

## What build 1.0.12 (65) records

The macOS host writes a separate JSON session file for every launch and an append-only lifecycle event stream. The files live in the existing App Group container:

`~/Library/Group Containers/group.com.hankch.floatem/SharedData/`

- `lifecycle-sessions/<session-id>.json` records the app version/build, executable path, PID, start time, last heartbeat, latest sleep/wake event, and graceful-exit state.
- `lifecycle-events.jsonl` records `launch`, `willSleep`, `didWake`, `recoveredAfterWake`, `gracefulTermination`, and `previousSessionEndedUnexpectedly` events. Each event includes the PID, session ID, version/build, and executable path.

The heartbeat is persisted every 30 seconds while the host run loop is active. `applicationWillTerminate` records the only exit reason that the app can observe reliably: `applicationWillTerminate`.

If a later Floatem launch finds an older session with no graceful-exit record and its recorded PID no longer exists, it marks that session as `previousSessionEndedUnexpectedly`. This is evidence of an ungraceful host disappearance, not proof of whether the cause was Jetsam, `SIGKILL`, a crash, a forced quit, or a macOS service-policy decision. Those causes require the corresponding system diagnostic/crash report.

## Current launch-at-login behavior

`LaunchAtLoginManager` uses `SMAppService.mainApp`. It asks macOS to launch the main app at user login. It does not supervise the process and does not restart it after the process exits. It therefore cannot make the global shortcut available after the host process has been terminated.

## Implemented recovery architecture

Build 1.0.12 (65) implements a bundled, user-approved ServiceManagement LaunchAgent rather than writing an unmanaged plist into `~/Library/LaunchAgents`.

1. The helper is registered through `SMAppService.agent(plistName:)`. It includes a stable label, `KeepAlive`, bounded launchd throttling, and an in-bundle executable.
2. The helper is the sole Carbon global-shortcut owner. The main app only sends it saved shortcut changes over XPC and no longer registers that shortcut itself.
3. The host keeps one XPC connection to the Agent and exports a minimal panel-toggle callback on that connection. When the shortcut is pressed, the Agent invokes that callback; it does not create a second, dynamically registered global Mach service.
4. If no live host callback exists, the Agent launches its containing `Floatem.app` with a dedicated agent-hotkey argument. That launch context presents the panel immediately, then re-establishes the persistent XPC callback.
5. The helper's `KeepAlive` policy protects the shortcut owner itself. Before sleep, it records whether a connected Floatem host was visible or hidden. After wake, it leaves a live host untouched; if macOS removed a host that was running before sleep, it restores the host and its recorded visibility. A fully quit host is not relaunched merely because the Mac woke. The recovered host persists a `recoveredAfterWake` event and reconnects its normal services.

This design preserves shortcut availability even after the main host has disappeared. Only the ServiceManagement-managed Agent owns the named global Mach service; the host has scoped lookup access to it. The temporary Mach entitlement must be reviewed for App Store distribution before release.

## Why a raw LaunchAgent is not recommended

Creating or editing `~/Library/LaunchAgents/*.plist` directly bypasses ServiceManagement's user-visible registration and lifecycle. It is harder to uninstall correctly, less suitable for a sandboxed/App Store distribution, and should not be used as the default product path. It is useful only for a developer-only experiment outside the shipping app.

## Required test isolation

The Debug configuration uses its own ServiceManagement label and Mach service, `com.hankch.floatem.debug.hotkey-agent`. Release continues to use `com.hankch.floatem.hotkey-agent`. Both use `Shift+Space`, so only one agent can own the shortcut at a time; disable the other background item before a simultaneous comparison.

The Debug artifact intentionally still shares the production bundle identifier and App Group because the available development signing profile only authorizes those identifiers. Its notes/settings data therefore is not isolated; use test data or reset the test state before comparison. The shortcut and recovery agents are isolated.

Quick acceptance: quit the Debug host, press `Shift+Space`, and confirm it reopens from the Debug app path. For sleep/wake testing, first hide the Debug host, sleep and wake the Mac, and confirm it stays hidden. Repeat with the panel visible and confirm it stays visible. A fully quit Debug host must remain quit after wake; pressing `Shift+Space` is then the explicit action that reopens it.
