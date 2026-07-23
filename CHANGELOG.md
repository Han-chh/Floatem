# Changelog

## 1.0.4

- Keep floating cards visible when switching from desktop-pinned mode back to the regular overlay on macOS.
- Add explicit Previous and Next controls that jump between the seven complete interactive-guide workflows.
- Highlight the desktop-pin control with a red circular guide, let users handle launch-at-login directly in its dialog, and clarify how group deletion mode works.
- Bump the macOS app to build 42.

## 1.0.3

- Distinguish Finder and Spotlight opens from macOS Login Item launches so the first direct open presents StickIt immediately while login startup remains silent.
- Consolidate the interactive guide into 7 complete feature workflows while preserving focused, in-place instructions and automatic practice-data cleanup.
- Bump the macOS app to build 34.

## 1.0.2

- Add a bilingual 14-step interactive guide for navigation folding, note and todo workflows, reminders, groups, floating and desktop-pinned cards, settings, and themes.
- Run the guide in an isolated practice sandbox so completing or exiting it never changes existing app data.
- Clarify the navigation-folding help copy and remove duplicate punctuation from the English time-format status.
- Keep direct launches from Finder, Spotlight, or a double-click visible while login-item launches remain in the background.

All notable repository changes are recorded here.

## v0.6.1 - 2026-07-18

- Replace the macOS application icon with the new glass-reflection StickIt artwork.
- Keep both reflection and non-reflection source designs for future branding work.
- Bump the application version to `0.6.1` and macOS build number to `29`.

## Unreleased

- Bump StickIt to v1.0.1 (build 32), add a bilingual launch-at-login explanation prompt, and let users dismiss it once or suppress future prompts.
- Always show the Main Window for first installs and user-initiated launches; keep only an actually enabled Login Item launch silent.
- Prepare v1.0.0 for App Store distribution with an Apple Distribution Release configuration, App Sandbox, and the existing App Group.
- Remove the WidgetKit extension from the product; desktop-pinned Note and Todo cards are provided exclusively by app-owned NSPanel windows.
- Default new installations to launch-at-login off, keep login launches silent, and show the Main Window only for user-initiated launches.
- Restore desktop pinning to app-owned `DesktopCardPanel` windows, persist entity-only typed placement state, recreate panels during silent Login Item startup, and warn when login launch is unavailable.
- Move macOS authoritative data into App Group `group.com.hankch.stickit`, add atomic/idempotent legacy migration, and reduce old `desktop-cards.json` entries to schema-v1 entity-only Widget preferences.
- Keep full editing in floating AppKit/Web cards while sharing their WebKit process pool/data store/bootstrap, loading a dedicated floating Vite entry, and logging active lifecycle counts.
- Restore floating frames with display UUIDs, normalized positions, and shared visible-frame clamping; keep login-item launches silent while preserving user launch, reopen, shortcut, and deep-link behavior.
- Add native XCTest coverage and a macOS desktop-card/manual regression guide.

- Allow each note's rich-text formatting row to collapse into a compact arrow control, with the floating-card toolbar attached directly to the editor field.
- Consolidate floating-note group selection into the group label and place its edited-time label on the same compact metadata row.
- Keep the original desktop-pin entry point and map it to `DesktopCardPanel`.
- Preserve rounded note and todo silhouettes in drag previews and detached floating windows by making their dedicated WebView root surfaces fully transparent.
- Add a user-controlled launch-at-login preference to General Settings, backed by `SMAppService.mainApp` on macOS and the current-user Run key on Windows.

## v0.5.0 - 2026-05-25

Purpose:
- Release macOS floating notes and todos from the mixed floating-card development work while keeping Windows on stable v0.4.5 floating-related behavior.

Contents:
- Added macOS native floating cards for notes and todos, including drag previews, always-on-top card windows, dock-zone feedback, and dock-back lifecycle handling.
- Added shared frontend floating-card views, bridge payloads, state synchronization, and platform feature flags required by the macOS implementation.
- Disabled floating notes and floating todos on Windows in v0.5.0 because the mixed-branch Windows implementation remains unstable.
- Documented the v0.5.0 platform support status and the requirement that future Windows floating support be developed from a clean architecture branch.

## v0.3.0 - 2026-04-06

Purpose:
- Replace note-level color picking with reusable group management so notes can be organized, labeled, and filtered from a dedicated control surface.

Contents:
- Upgrade notes persistence from a flat card array to a backward-compatible `cards + groups` document, add note-group CRUD in the store, and keep ungrouped notes on a neutral gray accent by default.
- Add a dedicated groups panel on the Notes page for creating, editing, deleting, recoloring, and checkbox-filtering groups, while reusing the same expanded color-picker module used by the rich-text toolbar.
- Convert the old note color action into a group selector, show the active group name where `Focus card` used to appear, and keep compact-window behavior workable by moving the groups panel below the stack on short heights.
- Refresh unit, integration, and layout coverage for the new grouping flow and bump the repository version to `0.3.0`.

## v0.2.4 - 2026-04-05

Purpose:
- Complete the in-panel Settings experience so it fully controls launch behavior, motion, language, and shortcut management from a polished native-feeling surface.

Contents:
- Keep the Settings close button fixed and accessible while the panel scrolls, let the app window be dragged from inside Settings, remove the old visual-palette block, and tighten the overall responsive layout so controls no longer cover text.
- Expand section-opening controls with `Open last stored section by default`, update hotkey summon behavior so Notes or Todos can be forced on each summon, and add a one-click `Restore defaults` action for the full Settings state.
- Extend page-turn and slide animations to main-surface and Settings transitions, add the new `Lift` transition, retune switch-speed tiers with dedicated icons, and keep particle feedback toggle rendering stable without clipping.
- Replace manual shortcut text editing with a record-in-dialog flow that captures key combos directly, validates modifier requirements, reports success or failure, and preserves the previous shortcut if native registration fails.
- Add complete English and Simplified Chinese localization across the React UI and native macOS shell, including a language switcher with dedicated language icons while keeping the app name `StickIt` unchanged in both languages.
- Bump the repository version to `0.2.4`.

## v0.2.3 - 2026-04-02

Purpose:
- Refine the todo quick-add surface so footer actions align more cleanly and open items read more clearly.

Contents:
- Rename open todos to `undone` and add numbering for only the unfinished items.
- Remove the glossy highlight from completed todo toggles so the done state stays flatter and cleaner.
- Rebuild the todo quick-add footer into a two-row layout with a narrower action column that aligns `cmd+Enter` with the submit button.
- Bump the repository version to `0.2.3`.

## v0.2.2 - 2026-04-02

Purpose:
- Refine the panel interaction model with stronger tab turns, an in-panel settings surface, and cleaner note/todo removal and entry behavior.

Contents:
- Rework the Notes and Todos switcher into a more explicit 3D page-turn transition while preserving the existing slide fallback.
- Restore Settings as a single sliding container mounted inside the main panel shell instead of replacing the full window chrome.
- Tighten note deletion feedback so note-card removal uses a centered burst and faster exit timing aligned with todos.
- Change todo quick-add submission to `Cmd+Enter`, add the shortcut hint above the action button, and inset the footer card so its bottom corners stay visible.
- Bump the repository version to `0.2.2`.

## v0.2.1 - 2026-04-01

Purpose:
- Stabilize the native macOS host startup path and restore the floating panel to the pre-refactor default size.

Contents:
- Rebuild the bundled `WKWebView` entry page into a native-safe inline asset form so the React frontend can boot reliably from the app bundle.
- Fix the inline HTML injection path so minified JavaScript containing `$` replacement tokens is copied into the native bundle without syntax corruption.
- Restore the native floating panel startup size to the same `400 x 680` default used by `v0.1.43`, while still keeping the compact minimum resize bounds.
- Bump the repository version to `0.2.1`.

## v0.2.0 - 2026-03-31

Purpose:
- Replace the unstable Tauri + Rust desktop shell with a pure macOS native AppKit + WKWebView host while preserving the existing StickIt frontend UI and interactions.

Contents:
- Remove the Tauri/Rust host layer and rebuild the desktop runtime around a native AppKit application, a single owned floating panel, and a thin `WKWebView` JavaScript bridge.
- Keep the existing React notes and todos UI, state model, motion, styling, and interaction patterns while swapping Tauri API calls for native bridge methods plus browser-safe fallbacks.
- Add a native menu bar item, Dock-preserving application lifecycle, Carbon-based global shortcut registration, and best-effort always-on-top/full-screen auxiliary window behavior on the main thread.
- Add a real Xcode project, Swift host sources, native app version metadata, and new `pnpm macos:build` / `pnpm macos:run` workflows.
- Bump the repository version to `0.2.0`.

## v0.1.43 - 2026-03-28

Purpose:
- Align dragged note and todo previews with the mouse position instead of letting the overlay sit visibly below the cursor.

Contents:
- Rework the shared drag-overlay centering modifier to subtract the floating panel container offset introduced by the macOS-style shell layout.
- Keep the overlay centering logic shared between Notes and Todos so both modules use the same corrected pointer anchor.
- Expand the unit coverage for `centerOverlayToCursor` with a nested-container regression case matching the floating panel environment.

## v0.1.42 - 2026-03-28

Purpose:
- Bring the floating close button much closer to the native macOS red stoplight appearance.

Contents:
- Reduce the shared close control to a near-native stoplight size and remove the oversized glossy treatment from the previous iteration.
- Simplify the red fill, border, and inner highlight so the resting state reads like a native macOS traffic-light dot.
- Hide the `X` glyph by default and reveal it only on hover or keyboard focus to better match native macOS window-control behavior.

## v0.1.41 - 2026-03-28

Purpose:
- Refine the floating window close control so it feels more polished and premium without losing the macOS stoplight cue.

Contents:
- Restyle the shared `WindowCloseButton` with a richer lacquered red gradient, inner highlight ring, and a softer outer glow.
- Tighten the close glyph styling so the `X` reads more crisply at rest and becomes clearer on hover.
- Add a stronger focus-visible treatment so keyboard focus on the close control is easier to track.

## v0.1.40 - 2026-03-28

Purpose:
- Separate the three note action buttons cleanly and make the color palette expand safely for future color growth.

Contents:
- Remove the action-row sizing rule that let tooltips and the palette widen button wrappers and force the color, fold, and delete buttons into each other.
- Shift the note action strip slightly left and lock each action onto a fixed 28px track so the three controls stay visually separated.
- Rebuild the color palette as a left-expanding, multi-row grid that sizes from the number of available colors while staying inside the card and viewport.

## v0.1.39 - 2026-03-28

Purpose:
- Even out the three note action buttons and shrink the color picker so it fits cleanly above the card without getting blocked.

Contents:
- Change the note action strip to a fixed three-column grid so the color, fold, and delete controls sit at equal spacing.
- Shift the color control slightly left as part of the new equal-spacing action layout.
- Reduce the color picker panel width, padding, and color-swatch size so the popup displays more cleanly in compact window widths.

## v0.1.38 - 2026-03-28

Purpose:
- Align the note color control cleanly with the other action buttons and stop the color palette from being clipped or covered.

Contents:
- Restyle the note color control to use the same compact icon-button geometry as fold and delete so all three actions share the same baseline and height.
- Add a tooltip to the color control for consistency with the other action buttons.
- Open the color palette upward and raise the active card above its neighbors while the palette is visible so the color picker is no longer blocked.

## v0.1.37 - 2026-03-28

Purpose:
- Free up the full note-title row by moving the color control down into the compact action strip.

Contents:
- Remove the note color button from the title row so the title field can use the full card width.
- Place the color control alongside fold and delete in the metadata action row.
- Re-anchor the color palette popover under the lower action button so color changes still work in the tighter header layout.

## v0.1.36 - 2026-03-28

Purpose:
- Restore the note title width after the metadata alignment change accidentally pushed the title field too far to the right.

Contents:
- Move the note metadata row fully out of the two-column title grid so the left chip stack no longer widens the color-button column.
- Let the note title field use the full intended content width again while keeping `Focus card`, edit time, fold, and delete on the compact row below.

## v0.1.35 - 2026-03-28

Purpose:
- Fix the drag runtime error in Notes and Todos so card reordering works reliably inside the Tauri WebView.

Contents:
- Remove the drag overlay modifier's hard dependency on global `TouchEvent`, `MouseEvent`, and `PointerEvent` constructors.
- Switch drag coordinate extraction to safe shape-based event detection so dragging works in environments where those constructors are unavailable.
- Add unit coverage for pointer-like events, touch-like events, and the no-coordinate fallback path.

## v0.1.34 - 2026-03-28

Purpose:
- Align the note metadata chips with the note color control so the compact header reads on a cleaner left edge.

Contents:
- Move the `Focus card` and edit-time chips out from under the title field and align them with the note color button.
- Keep fold and delete actions on the right side of the same metadata row without expanding the compact Notes card header.

## v0.1.33 - 2026-03-28

Purpose:
- Push the stoplight close cross much further so it reads darker, larger, and more obvious.

Contents:
- Increase the close-button `X` icon size and stroke weight again.
- Shift the icon color toward a darker near-black red-brown and raise its baseline opacity so it stays easier to read even before hover.

## v0.1.32 - 2026-03-28

Purpose:
- Make the close-button cross read more clearly inside the macOS-style stoplight.

Contents:
- Increase the stoplight `X` icon size and stroke weight so it appears bolder and more legible on hover.

## v0.1.31 - 2026-03-28

Purpose:
- Move the macOS close control into the shell chrome so the title and tab card return to their previous height while the outer top band becomes taller.

Contents:
- Pull the red macOS-style hide button out of the title card and place it in a dedicated shell-top strip above the main panel header.
- Restore the main title-and-tab card spacing to its previous compact height instead of stretching it to fit the close control.
- Apply the same shell-top hide button treatment to the settings view so the close control stays in the outer chrome rather than inside the content header.

## v0.1.30 - 2026-03-28

Purpose:
- Make the frameless panel draggable from most non-interactive surfaces and add a macOS-style close control that hides the app instead of quitting it.

Contents:
- Move window dragging to the full shell content layer and exclude note cards, todo cards, and settings cards with `data-no-window-drag` so editing and sorting keep working.
- Add a shared macOS-style red close button to the top chrome of the main panel and settings view, and increase top header height to create a clearer draggable title bar.
- Introduce a `hide_panel_window` Rust command plus frontend bridge so the close button hides the panel while persisting its current position, matching the shortcut behavior.

## v0.1.29 - 2026-03-28

Purpose:
- Restore actual drag permission for the frameless window so header dragging works instead of failing silently.

Contents:
- Add `core:window:allow-start-dragging` to the main capability so frontend `startDragging()` requests are permitted by Tauri.
- Replace the silent drag-start catch with a visible warning to make future window-drag failures diagnosable during development.

## v0.1.28 - 2026-03-28

Purpose:
- Restore draggable frameless-window behavior and make the panel reopen at the same saved position while showing automatically on launch.

Contents:
- Add explicit Tauri window dragging from the Notes/Todos header and the Settings header so the frameless panel can be repositioned again.
- Refactor the Rust window logic so startup and hotkey-based showing both restore the saved `panelPosition` before focusing the window.
- Show the panel automatically during app setup instead of waiting for the first shortcut press, while keeping shortcut toggling intact.

## v0.1.27 - 2026-03-28

Purpose:
- Push the rounded shell toward a richer, higher-contrast multicolor gradient treatment without adding any visible outer border.

Contents:
- Expand the shell background from a mostly warm gradient into a stronger orange, gold, blue, jade, and plum blend with more obvious internal contrast.
- Add extra interior reflective highlight bands so the shell reads glossier and more dimensional inside the rounded body.
- Enrich the panel’s ambient glow field with additional gold and plum color pockets to give the frame more color depth around the content.

## v0.1.26 - 2026-03-28

Purpose:
- Make the compact note edit-time label read more clearly by restoring the relative-time suffix.

Contents:
- Append `ago` to the shortened note edit-time labels so chips read like `<1min ago`, `2min ago`, `1h ago`, and `1d ago`.

## v0.1.25 - 2026-03-28

Purpose:
- Tighten the Notes card layout and strengthen the rounded shell’s internal color contrast without bringing back any outer border.

Contents:
- Stack the `Focus card` and compact edit-time chips vertically, move fold/delete to the same top row on the right, and shorten note edit labels to forms like `<1min` and `2min`.
- Compress note title, toolbar, editor padding, and inter-card spacing so Notes cards feel closer to the compact Todo density while keeping the editor as the main content area.
- Stop hiding the note edit-time chip at narrow widths so card metadata remains visible in compact window sizes.
- Deepen the shell’s internal warm/cool gradient contrast and add a transparent reflective highlight texture fully inside the rounded window body.

## v0.1.24 - 2026-03-28

Purpose:
- Strip the last visible shell halo around the rounded window and clean up the top edge.

Contents:
- Disable the native window shadow and remove the shell’s outer drop shadow so the rounded body no longer reads like it has an external border.
- Move shell grain and notebook accents further inward so decoration starts inside the body instead of at the top and bottom edges.
- Pull the panel’s ambient color glows off the window perimeter and deepen the inner warm edge transition inside the shell.

## v0.1.23 - 2026-03-28

Purpose:
- Eliminate the last transparent shell gutters and make the inner edge treatment read more deliberately inside the rounded window.

Contents:
- Move shell padding from the outer rounded window to a full-height inner content wrapper so the visible window body reaches the true window bounds.
- Strengthen the shell’s internal warm gradient and inset shading so the inner edge transition is more obvious without reading as an outer border.
- Keep the notebook ruling and binding accents inside the rounded shell instead of leaving transparent margin around the window.

## v0.1.22 - 2026-03-28

Purpose:
- Remove the remaining border-like shell marks outside the rounded window and move notebook decoration fully inside the panel shape.

Contents:
- Soften the outer shell shadow and remove edge-adjacent decorative texture that could read like an extra border.
- Rebuild the notebook embellishment so the ruling lines, binding line, and page-hole accents sit well inside the rounded rectangle instead of near the outer edge.

## v0.1.21 - 2026-03-28

Purpose:
- Turn the floating panel into a visibly rounded macOS-style window and add notebook-like texture to the shell padding.

Contents:
- Enable transparent macOS window rendering so the app can present real rounded outer corners instead of a full rectangular frame.
- Move the root webview backgrounds to transparent and let the rounded `window-shell` own the visible window shape and shadow.
- Add a subtle ruled-paper and binding-line texture treatment inside the shell padding to make the outer margin feel more like a paper notebook.
- Slightly increase shell padding so the new textured edge reads as intentional space rather than accidental gutter.

## v0.1.20 - 2026-03-28

Purpose:
- Fix the completed todo text color so it actually switches away from the active black text tone.

Contents:
- Replace the overlapping black-and-gray text utility combination with a single conditional text color branch for completed todos.

## v0.1.19 - 2026-03-28

Purpose:
- Make completed todo text read as clearly grey instead of staying too close to the active text color.

Contents:
- Shift completed todo body text to a stronger neutral grey while keeping the rest of the finished-card treatment intact.

## v0.1.18 - 2026-03-28

Purpose:
- Simplify the completed todo treatment into a cleaner greyed card with a single lighter strike line.

Contents:
- Remove the multi-line scribble and pencil-pass effect from completed todos.
- Replace it with one shallow horizontal strike that spans the card more quietly.
- Push the completed card surface, border, text, and secondary controls further toward a grey transparent finish while keeping the completion button green.

## v0.1.17 - 2026-03-28

Purpose:
- Make completed todos read as intentionally finished cards instead of lightly struck text rows.

Contents:
- Turn the completed-state check button into a clear green confirmation control.
- Replace the old mid-text strike with full-card pencil scribble overlays that cut across the whole todo card.
- Shift completed todo cards to a greyer, more transparent surface treatment and mute secondary controls so the finished state reads at a glance.
- Keep the rest of the compact todo row layout intact while updating the completed visual hierarchy.

## v0.1.16 - 2026-03-28

Purpose:
- Change the default panel shortcut from Fn+Space to Cmd+Shift+Space.

Contents:
- Switch the frontend and persisted settings defaults to Cmd+Shift+Space.
- Migrate previous default shortcuts Alt+Space and Fn+Space to Cmd+Shift+Space on load.
- Keep manual Fn+Space support intact by separating the Fn-specific macOS monitor path from the new default fallback logic.
- Update the settings UI copy and settings-store coverage to reflect the new default shortcut.

## v0.1.15 - 2026-03-28

Purpose:
- Change the default panel shortcut to Fn+Space without breaking macOS hotkey registration.

Contents:
- Switch the frontend and persisted settings defaults from Alt+Space to Fn+Space.
- Add a macOS-specific global key monitor for Fn+Space because the Tauri global-shortcut parser does not support the Fn modifier directly.
- Migrate previously saved default Alt+Space settings to Fn+Space on load so existing installs move to the new default automatically.
- Update the settings UI copy and settings store coverage to reflect the new default shortcut.

## v0.1.14 - 2026-03-28

Purpose:
- Tighten Todo rows into a single action line, center drag previews on the cursor, and push delete shatter effects further toward a true card-break look.

Contents:
- Rebuild todo rows so text, reminder control, and delete action stay on one compact line with no second-row button wrap.
- Replace the todo add-plus affordance with a return-style submit button that greys out when the input is empty.
- Add a shared drag-overlay modifier so note and todo previews keep their center aligned to the pointer through the full drag.
- Increase rose-tone particle count, saturation, shard sharpness, burst spread, and animation duration to make card deletion feel more like a visible shatter.

## v0.1.13 - 2026-03-28

Purpose:
- Extend delete and drag feedback across full cards while making Todos denser and the completion affordance easier to spot.

Contents:
- Trigger delete shatter bursts from the full note or todo card bounds instead of only from the delete button.
- Expand rose-tone delete particles into multi-point card-wide bursts for a clearer whole-card breakup effect.
- Tighten todo row padding and spacing again, and strengthen the completion button with a brighter halo and richer surface texture.
- Render note and todo drag previews at the source card width so the preview stays aligned with the cursor throughout the drag.

## v0.1.12 - 2026-03-28

Purpose:
- Compress the Todo list further, replace the reminder picker with a richer dropdown editor, and make completion and deletion feedback more pronounced.

Contents:
- Reduce todo row padding, control sizes, and spacing so more tasks fit on screen without losing clarity.
- Replace the native reminder picker with a custom dropdown panel that supports date, hour, minute, and quick preset selection.
- Turn completed todos into a greyer, penciled-over state with a stronger strike animation across the task text.
- Amplify rose-tone delete bursts so note and todo removal feels more visible and energetic.

## v0.1.11 - 2026-03-28

Purpose:
- Rework Todos into a tighter, more efficient row-style list while keeping drag feedback and completion behavior visually clear.

Contents:
- Convert todos from tall stacked cards into compact horizontal rows with smaller controls and less vertical chrome.
- Replace the always-visible reminder input with a clock trigger that opens the native date-time picker and only shows reminder text after selection.
- Add live drag sorting for open todos with a drag overlay preview, while pinning completed todos to the bottom and making them non-draggable.
- Move restored todos back to the end of the open section, strengthen the completion strike effect, and extend store and layout tests around the new behavior.

## v0.1.0 - 2026-03-28

Purpose:
- Establish the initial StickIt desktop scaffold and baseline version tag.

Contents:
- Initialize the Tauri 2 + React 18 + TypeScript project structure.
- Add the first runnable Notes/Todos application skeleton.
- Implement JSON persistence, hotkey-based window toggle, and core tests.

## v0.1.1 - 2026-03-28

Purpose:
- Refine the floating panel experience, improve visual hierarchy, and clean repository tracking so Git records only meaningful project changes.

Contents:
- Keep the app hidden on startup and rely on the global shortcut to reveal the panel.
- Upgrade the panel shell, card layout, color contrast, and typography for a richer macOS-style presentation.
- Improve narrow-window layout behavior so widget labels and controls stop getting squeezed.
- Add motion-driven button feedback, animated transitions, and particle effects for add/remove interactions.
- Ignore package caches and local build artifacts, and remove the tracked pnpm cache from the repository index.
- Establish a workflow where each requested code change ends with a Git commit and a matching changelog entry.

## v0.1.2 - 2026-03-28

Purpose:
- Remove the app-level transparent edge treatment and return the floating panel to a solid, borderless window shell.

Contents:
- Disable the transparent Tauri window mode and remove the macOS private transparent-window setting.
- Remove the outer application border so the content fills the full window surface.
- Switch the root surface back to an opaque background to avoid any visible transparent edge.

## v0.1.3 - 2026-03-28

Purpose:
- Rebuild the panel layout system so every core surface remains readable and space-efficient from 300px to 560px wide.

Contents:
- Add container-query based layout rules for panel, module, and card surfaces.
- Rework the panel header, notes module, todos module, and settings overlay to stack and wrap instead of squeezing text.
- Convert note titles and quick-add input to auto-resizing textareas so long content stays visible while editing.
- Add Playwright responsive layout coverage across compact, regular, wide, and expanded viewports using system Chrome.
- Keep existing interaction tests green while adding real-browser assertions for horizontal overflow and clipped controls.

## v0.1.4 - 2026-03-28

Purpose:
- Add a reviewable, Figma-style Notes home preview so the next visual direction can be inspected before applying it to the main app shell.

Contents:
- Add a standalone design-preview route at `?preview=figma-notes-home` without changing the production StickIt flow.
- Build an icon-rich Notes home board with tokens, components, responsive frames, textures, and a clickable prototype section.
- Add local SVG icon components to model the intended Lucide-style action language across tabs, hero actions, note cards, and settings.
- Export review screenshots locally because a real Figma MCP workspace is still unavailable in this environment.

## v0.1.5 - 2026-03-28

Purpose:
- Apply the approved icon-rich Notes Home design language to the production StickIt interface.

Contents:
- Migrate the main panel shell and segmented tabs to the higher-contrast, texture-light, icon-first visual system.
- Restyle Notes, Todos, and Settings with richer chips, stronger accent colors, upgraded action buttons, and more expressive cards.
- Promote the preview icon set into a shared app icon library and update the default note color palette to the brighter scheme.
- Keep existing store and interaction behavior intact while re-running unit, integration, build, and responsive layout coverage.

## v0.1.6 - 2026-03-28

Purpose:
- Expand the working space of the main panel and turn settings into a full-page destination with real motion and behavior controls.

Contents:
- Remove the StickIt intro copy from the main shell so Notes and Todos get more vertical space.
- Replace the old settings overlay with a full-window settings view that includes product introduction and broader option controls.
- Add persisted settings for transition style, transition speed, and particle effects, and wire them into the live app.
- Speed up Notes/Todos switching and add an optional page-turn transition style as the default behavior.

## v0.1.7 - 2026-03-28

Purpose:
- Push Notes and Todos to a content-first layout by removing the oversized top hero blocks and moving compact controls to the bottom.

Contents:
- Rebuild the Notes page so the main area is the card stack, with only a short bottom control bar and a circular plus button.
- Rebuild the Todos page so the task list owns the window body, with the quick-add input and circular plus button compressed into the bottom bar.
- Slightly increase the default Tauri window size so more content fits before scrolling.

## v0.1.8 - 2026-03-28

Purpose:
- Make Notes feel more like a true stack of independent cards while simplifying card controls and giving the editor more visual priority.

Contents:
- Restyle each note card as a more independent rounded rectangle with stronger shadow, subtle texture, and clearer card separation.
- Remove the dedicated Move button and switch note dragging to the card surface itself, while keeping live drag feedback.
- Compress the note toolbar into smaller icon-only controls, remove the brush action, and expose functions through hover tooltips.
- Expand the note editor area so the body content reads as the primary surface, and increase the default window height again to show more cards.

## v0.1.9 - 2026-03-28

Purpose:
- Deepen the note-card interaction polish with faster tool hints, stronger card decoration, and richer drag feedback.

Contents:
- Replace the Clear toolbar icon so it no longer duplicates the card-delete icon, and switch toolbar help to fast custom hover tooltips.
- Move Fold and Delete into the same metadata row as the card chips to free more vertical space for editing.
- Add larger circular color decoration, tape-like accents, and stronger card styling so notes feel closer to lively sticky cards.
- Add a drag overlay preview while leaving a transparent placeholder frame in the original slot during note dragging.

## v0.1.10 - 2026-03-28

Purpose:
- Further tighten the Note card header and editing controls so each card spends less space on chrome and more on content.

Contents:
- Reduce note title field height, title font size, chip spacing, and card action button size.
- Compress the note toolbar container and icon buttons so formatting controls occupy less vertical space.
- Slightly reduce the editor surface padding and minimum height while preserving it as the primary editable area.
