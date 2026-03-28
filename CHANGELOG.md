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
