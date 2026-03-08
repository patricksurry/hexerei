# Editor Phase 4 Specification

## Goals
1. Fix logic errors in coordinate math and hit testing.
2. Improve UI/UX with better contrast, scalable labels, and smoother zoom.
3. Validate "Spatial IDE" concept with real-time HexPath entry and preview.

## Core Correctness (Tier A)
- **A1. Stagger Parity**: Pass raw column/row values to `offsetToCube` without normalization to avoid stagger flip when `firstCol` is odd.
- **A2. Edge Direction**: Fix off-by-one error in edge hit testing (midpoint `i` corresponds to hex direction `(i+1)%6`).
- **A3. Vertex Canonical ID**: Fix vertex sharing logic (corner `i` shared with neighbors `i` and `(i+1)%6`).
- **A4. Format Compatibility**: Support both `grid:` and `layout:` keys in `HexMapLoader`.
- **A5. Feature Mapping**: Restore `featuresAtHex` and `hexIdsForFeature` in `MapModel`.
- **A6. HexPath Orientation**: Pass `'flat' | 'pointy'` instead of `Stagger` enum to `hexToPixel` in `HexPath`.
- **A7. Direction Comments**: Correct the direction index documentation in `hex-math.ts`.

## UX Polish (Tier B)
- **B1. Contrast**: Improve visibility of canvas labels and small UI text.
- **B2. Scalable Labels**: Labels on canvas should scale with zoom level (8px to 16px).
- **B3. Zoom/Scroll**: Normalize trackpad/mouse sensitivity and add zoom bounds.
- **B4. Geometry Highlights**: Select an edge/vertex by drawing the actual line/point rather than highlighting adjacent hexes.
- **B5. Off-board Guard**: Prevent vertex/edge selection when clicking outside the map.
- **B6. Inspector CSS**: Add missing styles for lists, neighbor grids, and clickable items.
- **B7. Navigation Callback**: Replace the arrow key `NAV` hack with a formal `onNavigate` prop in `CanvasHost`.
- **B8. Feature Stack**: Improve `@all` display and add borders to color chips.
- **B9. HiDPI Support**: Account for `devicePixelRatio` in canvas rendering.

## Spatial IDE Features (Tier C)
- **C1. Live Parsing**: Real-time HexPath parsing in the command bar.
- **C2. Ghost Geometry**: Render previewed HexPaths as dashed outlines on the canvas.
- **C3. Syntax Highlighting**: Color-code tokens in the command bar input.
- **C4. Inline Errors**: Display parse errors directly in the command bar.
- **C5. Feature Creation**: Pressing Enter in command bar creates a new map feature.
- **C6. Selection Auto-fill**: Canvas selections auto-populate the command bar.
- **C7. Command Mode**: Implement `>` prefix for editor commands (e.g., `>zoom fit`).
