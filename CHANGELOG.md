# Changelog

All notable repository changes are recorded here.

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
- Establish the initial QuickNote desktop scaffold and baseline version tag.

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
- Add a standalone design-preview route at `?preview=figma-notes-home` without changing the production QuickNote flow.
- Build an icon-rich Notes home board with tokens, components, responsive frames, textures, and a clickable prototype section.
- Add local SVG icon components to model the intended Lucide-style action language across tabs, hero actions, note cards, and settings.
- Export review screenshots locally because a real Figma MCP workspace is still unavailable in this environment.

## v0.1.5 - 2026-03-28

Purpose:
- Apply the approved icon-rich Notes Home design language to the production QuickNote interface.

Contents:
- Migrate the main panel shell and segmented tabs to the higher-contrast, texture-light, icon-first visual system.
- Restyle Notes, Todos, and Settings with richer chips, stronger accent colors, upgraded action buttons, and more expressive cards.
- Promote the preview icon set into a shared app icon library and update the default note color palette to the brighter scheme.
- Keep existing store and interaction behavior intact while re-running unit, integration, build, and responsive layout coverage.

## v0.1.6 - 2026-03-28

Purpose:
- Expand the working space of the main panel and turn settings into a full-page destination with real motion and behavior controls.

Contents:
- Remove the QuickNote intro copy from the main shell so Notes and Todos get more vertical space.
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
