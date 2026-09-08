# Floatem host lifecycle and recovery evaluation

## What build 1.0.11 (62) records

The macOS host writes a separate JSON session file for every launch and an append-only lifecycle event stream. The files live in the existing App Group container:

`~/Library/Group Containers/group.com.hankch.floatem/SharedData/`

- `lifecycle-sessions/<session-id>.json` records the app version/build, executable path, PID, start time, last heartbeat, latest sleep/wake event, and graceful-exit state.
- `lifecycle-events.jsonl` records `launch`, `willSleep`, `didWake`, `gracefulTermination`, and `previousSessionEndedUnexpectedly` events. Each event includes the PID, session ID, version/build, and executable path.

The heartbeat is persisted every 30 seconds while the host run loop is active. `applicationWillTerminate` records the only exit reason that the app can observe reliably: `applicationWillTerminate`.

If a later Floatem launch finds an older session with no graceful-exit record and its recorded PID no longer exists, it marks that session as `previousSessionEndedUnexpectedly`. This is evidence of an ungraceful host disappearance, not proof of whether the cause was Jetsam, `SIGKILL`, a crash, a forced quit, or a macOS service-policy decision. Those causes require the corresponding system diagnostic/crash report.

## Current launch-at-login behavior

`LaunchAtLoginManager` uses `SMAppService.mainApp`. It asks macOS to launch the main app at user login. It does not supervise the process and does not restart it after the process exits. It therefore cannot make the global shortcut available after the host process has been terminated.

## Implemented recovery architecture

Build 1.0.11 (62) implements a bundled, user-approved ServiceManagement LaunchAgent rather than writing an unmanaged plist into `~/Library/LaunchAgents`.

1. The helper is registered through `SMAppService.agent(plistName:)`. It includes a stable label, `KeepAlive`, bounded launchd throttling, and an in-bundle executable.
2. The helper is the sole Carbon global-shortcut owner. The main app only sends it saved shortcut changes over XPC and no longer registers that shortcut itself.
3. The host keeps one XPC connection to the Agent and exports a minimal panel-toggle callback on that connection. When the shortcut is pressed, the Agent invokes that callback; it does not create a second, dynamically registered global Mach service.
4. If no live host callback exists, the Agent launches its containing `Floatem.app` with a dedicated agent-hotkey argument. That launch context presents the panel immediately, then re-establishes the persistent XPC callback.
5. The helper's `KeepAlive` policy protects the shortcut owner itself. The main host may still be terminated by macOS, but this no longer removes the ability to use the shortcut.

This design preserves shortcut availability even after the main host has disappeared. Only the ServiceManagement-managed Agent owns the named global Mach service; the host has scoped lookup access to it. The temporary Mach entitlement must be reviewed for App Store distribution before release.

## Why a raw LaunchAgent is not recommended

Creating or editing `~/Library/LaunchAgents/*.plist` directly bypasses ServiceManagement's user-visible registration and lifecycle. It is harder to uninstall correctly, less suitable for a sandboxed/App Store distribution, and should not be used as the default product path. It is useful only for a developer-only experiment outside the shipping app.

## Required test isolation

The existing old and debug artifacts currently share `com.hankch.floatem`, `group.com.hankch.floatem`, and `Shift+Space`. They are not independent test instances: the shortcut can be owned by only one process and their persisted data is shared. To verify that an old instance dies while a debug instance remains usable, use one of these setups:

- Run the old and debug builds sequentially, not concurrently; or
- Give the debug configuration its own bundle identifier, App Group, and test-only shortcut before running them together.

The second option is required for a simultaneous survival comparison.
