# Specification: Editor Phase 1: App Shell & Visual Identity

**Goal:** Build the full editor layout skeleton with static data, establishing visual identity, panel hierarchy, and keyboard navigation.

## Functional Requirements
- **App Shell:** Three-column layout with persistent Command Bar and Status Bar.
- **Feature Stack:** Left panel with mock feature rows (drag handle, color chip, id/terrain label, truncated `at`).
- **Inspector:** Right panel with context-sensitive property display for selections (none, feature).
- **Command Bar:** Top bar for input with mode detection (path, command `>`, search `/`).
- **Status Bar:** Bottom bar showing cursor coordinates, zoom, map title, and dirty/saved indicator.
- **Canvas Area:** A styled placeholder representing the future map renderer.
- **Keyboard Navigation:** Shortcuts for toggling panels (`Cmd+1`, `Cmd+2`) and focusing the command bar (`Cmd+K`).
- **Design Tokens:** CSS custom properties for the "Tactical Blueprint" dark theme.

## Success Criteria (Overall)
- App renders the full three-column layout with all regions.
- Design tokens and typography (JetBrains Mono) are applied consistently.
- Keyboard shortcuts correctly toggle panel visibility and focus.
- Component-level unit tests pass for all major UI pieces.
- Layout is responsive and collapses gracefully at breakpoints.
