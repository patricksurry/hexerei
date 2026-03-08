# Editor Phase 4 Implementation Plan

## Tasks

### 1. Tier A: Core Correctness
- [ ] **A1. Stagger Parity**: Fix `createRectangularGrid`, `HexPath.resolveAtom`, and `MapModel.hexIdToLabel` to use raw column/row values.
- [ ] **A2. Edge Direction**: Fix off-by-one error in `hitTest()` direction mapping.
- [ ] **A3. Vertex Canonical ID**: Fix off-by-one error in `getCanonicalVertexId()` neighbor selection.
- [ ] **A4. Format Compatibility**: Add `grid:` fallback support to `HexMapLoader`.
- [ ] **A6. HexPath Orientation**: Add `orientation` option to `HexPath` and use it in `isPointInPolygon`.
- [ ] **A7. Direction Comments**: Update documentation in `hex-math.ts`.
- [ ] **A5. Feature Mapping**: Restore `featuresAtHex` and `hexIdsForFeature` in `MapModel`.

### 2. Tier B: UX Polish
- [ ] **B1. Contrast**: Update colors and font sizes in `draw.ts` and CSS files.
- [ ] **B2. Scalable Labels**: Implement zoom-dependent font scaling in `draw.ts`.
- [ ] **B3. Zoom/Scroll**: Implement normalized wheel handling and zoom bounds in `CanvasHost.tsx`.
- [ ] **B5. Off-board Guard**: Add map bounds check to `hitTest()`.
- [ ] **B6. Inspector CSS**: Add missing styles to `Inspector.css`.
- [ ] **B7. Navigation Callback**: Refactor `CanvasHost` arrow key handling.
- [ ] **B8. Feature Stack**: Improve `@all` display and color chip styling.
- [ ] **B9. HiDPI Support**: Implement `devicePixelRatio` scaling in `CanvasHost.tsx`.
- [ ] **B4. Geometry Highlights**: Implement specific edge/vertex render items and drawing logic.

### 3. Tier C: Spatial IDE Features
- [ ] **C1. Live Parsing**: Implement real-time HexPath parsing in the command bar.
- [ ] **C2. Ghost Geometry**: Add ghost render items to `Scene` and draw them on canvas.
- [ ] **C3. Syntax Highlighting**: Implement input overlay for token coloring in `CommandBar.tsx`.
- [ ] **C4. Inline Errors**: Display parse error messages in the command bar UI.
- [ ] **C5. Feature Creation**: Connect Enter key in command bar to feature creation logic.
- [ ] **C6. Selection Auto-fill**: Auto-populate command bar from canvas selections.
- [ ] **C7. Command Mode**: Implement `>` prefix and initial set of editor commands.

## Execution Strategy
I will work through the tiers in order, ensuring each group of fixes is verified by tests before proceeding to the next. Tier A is the highest priority as it ensures the geometric foundation is sound.
