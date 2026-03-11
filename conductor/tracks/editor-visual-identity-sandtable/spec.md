# Specification: Visual Identity (Sand Table)

## Goal
Transform the editor's visual identity from a "muted dark IDE" to a "tactical holographic sand table." This is a high-fidelity aesthetic overhaul focusing on luminosity, depth, and additive color.

## Key Attributes
1. **Luminous Grid**: Hex outlines should feel like a holographic projection (teal/cyan hairlines) rather than gray borders.
2. **Depth & Glow**: Use dark navy backgrounds with subtle gradients and "bloom" effects (canvas `shadowBlur`) for selections and highlights.
3. **Additive Color**: Colors should feel like light sources. Terrain tints the hex but the grid remains visible on top.
4. **Instrument Panel Chrome**: Side panels and bars should feel like HUD readouts (high contrast, accent-colored section markers, fine teal-tinted ruling lines).
5. **Themable Architecture**: Refactor CSS tokens and canvas rendering to support easy theme swapping (e.g., "Sand Table" vs "Classic").

## Technical Requirements
- Refactor `tokens.css` into `base.css` and `theme-sandtable.css`.
- Implement a `CanvasTheme` interface in the renderer.
- Update `drawScene` to support `shadowBlur`, `lineDash`, and layered rendering (fill then re-stroke).
- Enhance `CanvasHost.tsx` to resolve theme tokens efficiently.
