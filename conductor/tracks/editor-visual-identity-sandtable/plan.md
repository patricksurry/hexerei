# Implementation Plan: Visual Identity (Sand Table)

## Pass 1: Canvas Atmosphere (The "Hero" Change)
- [ ] Define `CanvasTheme` interface in `editor/src/canvas/draw.ts`.
- [ ] Implement new canvas background (`#080C12`) and teal-tinted grid stroke (`rgba(0, 180, 220, 0.18)`).
- [ ] Adjust hex rendering: fill (0.6 opacity) then re-stroke grid on top.
- [ ] Add `shadowBlur` glow to selection and hover highlights in `drawScene`.
- [ ] Tint hex labels teal with subtle glow.

## Pass 2: UI Chrome & Theming Infrastructure
- [ ] Refactor `editor/src/tokens.css` to separate base layout/typography from theme-specific colors.
- [ ] Create `editor/src/styles/theme-sandtable.css` with the "Sand Table" palette.
- [ ] Create `editor/src/styles/theme-classic.css` (preserving the current muted dark look).
- [ ] Update `App.tsx` and `CanvasHost.tsx` to handle theme selection via CSS classes and `CanvasTheme` objects.

## Pass 3: HUD Panels & Status Bar
- [ ] Update panel headings to use accent-colored text and borders.
- [ ] Apply teal-tinted dividers (`--border-accent`) throughout sidebars.
- [ ] Brighten status bar readouts and promote values to `text-primary`.
- [ ] Enhance command bar with focus-glow and brighter mode badges.

## Pass 4: Interaction Refinements
- [ ] Implement hex-under-cursor hover-glow on canvas.
- [ ] Add subtle glow to terrain color chips in the Feature Stack.
- [ ] Refine vertex and edge highlights (drop black outlines, use glow).
- [ ] Verify E2E visual consistency and performance.
