# Plan: Editor Phase 3 - Selection & Inspection

This plan implements interactive selection and inspection features for the HexMap editor.

## Goal
Validate the first interactive feedback loop: click → highlight → inspect. Prove that the stack/canvas/inspector triangle is intuitive and that accent colors distinguish geometry types.

## Status
- [x] Phase 1: Core API & Type Consolidation
- [x] Phase 2: MapModel & Selection Logic
- [x] Phase 3: Hit Testing & Scene Highlights
- [x] Phase 4: UI Integration (Inspector & FeatureStack)
- [x] Phase 5: Interaction Wiring (App & CanvasHost)
- [x] Phase 6: Polish & Verification

## Tasks

### Phase 1: Core API & Type Consolidation
- [x] **Task 1.1**: Add `hexEdgeMidpoints` and canonical vertex ID logic to `@hexmap/core`.
  - [x] Modify `core/src/math/hex-math.ts`.
  - [x] Update `core/src/math/hex-math.test.ts`.
- [x] **Task 1.2**: Consolidate `FeatureItem` type in `editor/src/types.ts`.
  - [x] Single source of truth in `types.ts`.
  - [x] Add `hexIds: string[]` to `FeatureItem`.
  - [x] Update `MapModel` to populate `hexIds` during construction.

### Phase 2: MapModel & Selection Logic
- [x] **Task 2.1**: Implement reverse index `_hexFeatures` in `MapModel`.
- [x] **Task 2.2**: Add `hexIdsForFeature`, `featuresAtHex`, and `computedHex` to `MapModel`.
- [x] **xTask 2.3**: Create headless selection model in `editor/src/model/selection.ts`.
  - [x] Transitions for hex, feature, edge, and vertex selection.
  - [x] Highlight derivation logic for `Scene`.

### Phase 3: Hit Testing & Scene Highlights
- [x] **Task 3.1**: Extend `hitTest` to support edges and vertices with threshold logic.
- [x] **Task 3.2**: Add `highlights` layer to `Scene` and `buildScene`.
- [x] **Task 3.3**: Implement highlight rendering in `editor/src/canvas/draw.ts`.

### Phase 4: UI Integration (Inspector & FeatureStack)
- [x] **Task 4.1**: Wire `Inspector` to use `MapModel.computedHex` for hex inspection.
- [x] **Task 4.2**: Update `FeatureStack` to use real terrain colors and modifier-aware selection.

### Phase 5: Interaction Wiring (App & CanvasHost)
- [x] **Task 5.1**: Add click and arrow-key navigation to `CanvasHost`.
- [x] **Task 5.2**: Wire the selection loop in `App.tsx` (App → Selection → Highlights → Canvas).

### Phase 6: Polish & Verification
- [x] **Task 6.1**: Visual verification of all selection types and accent colors.
- [x] **Task 6.2**: Ensure no regressions in panning, zooming, and resizing.
- [x] **Task 6.3**: Verify all tests pass in `core/` and `editor/`.
