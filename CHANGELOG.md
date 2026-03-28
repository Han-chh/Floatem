# Changelog

All notable repository changes are recorded here.

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
