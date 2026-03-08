# Orientation Unification Implementation Plan

## Tasks

### 1. Step 1: RFC spec updates
- [ ] Update `rfc/sections/02-conventions.md` (Orientation definitions, valid directions, `~` operator)
- [ ] Update `rfc/sections/04-data-model.md` (Orientation field in layout)
- [ ] Update `rfc/sections/06-hexpath.md` (`~` operator, clock notation, disambiguation, floating anchors, fill, references)
- [ ] Update `rfc/sections/07-geometry.md` (Orientation-based conversion formulas, hexLine nudge)
- [ ] Update `rfc/sections/11-json-schema.md` (Inline schema reference)
- [ ] Update `rfc/sections/appendix-b-clock.md` (Orientation-based clock hours)
- [ ] Update `rfc/README.md`, `rfc/examples/snippets/layout.yaml`, `rfc/examples/minimal.json`

### 2. Step 2: JSON Schema + schema tests (TDD)
- [ ] Update valid tests: `minimal.json`, `snippets.json`, `pointy.json` (new)
- [ ] Update/Add invalid tests: `legacy_layout.json`, `old_hex_top.json` (new), `invalid_enum.yaml`
- [ ] Update `rfc/hexmap.schema.json` (Orientation field)
- [ ] Verify with `python rfc/run_schema_tests.py`

### 3. Step 3: Core hex-math types + offset conversions (TDD)
- [ ] Add tests for Orientation helpers and offset conversions in `core/src/math/hex-math.test.ts`
- [ ] Implement `Orientation` type and helpers (`orientationTop`, `orientationStagger`, `defaultNudge`) in `core/src/math/hex-math.ts`
- [ ] Update `createRectangularGrid`, `offsetToCube`, `cubeToOffset` to accept `Orientation`

### 4. Step 4: Core hexLine nudge (TDD)
- [ ] Add tests for `hexLine` with nudge in `core/src/math/hex-math.test.ts`
- [ ] Implement `nudge` parameter with epsilon bias in `hexLine`

### 5. Step 5: Core HexPath (TDD)
- [ ] Add tests for `~`, direction validation, clock steps, and `*` disambiguation in `core/src/hexpath/hex-path.test.ts`
- [ ] Update `HexPathOptions` and implement `~` prefix recognition in `core/src/hexpath/hex-path.ts`
- [ ] Implement direction validation and clock hour parsing in `core/src/hexpath/hex-path.ts`
- [ ] Update `resolve()` to use `nudge` in `hexLine` calls

### 6. Step 6: Core loader + mesh + document (TDD)
- [ ] Add tests for Orientation loading and backward compat in `core/src/format/loader.test.ts`
- [ ] Implement Orientation parsing and backward compat in `core/src/format/loader.ts`
- [ ] Update `HexMesh` and `MeshMap` to use `Orientation`

### 7. Step 7: Map files migration
- [ ] Migrate `maps/definitions/battle-for-moscow.hexmap.yaml`
- [ ] Migrate `editor/public/maps/battle-for-moscow.hexmap.yaml`
- [ ] Migrate any other map files (e.g., in renderer demo)

### 8. Step 8: Editor updates
- [ ] Update `GridConfig` and model in `editor/src/model/map-model.ts`
- [ ] Update pixel calculations in `scene.ts`, `hit-test.ts`, `CanvasHost.tsx`
- [ ] Update `Inspector.tsx` to show Orientation
- [ ] Update editor model tests

### 9. Step 9: Renderer updates
- [ ] Update orientation parsing and rendering math in `renderer/src/index.ts`
- [ ] Update renderer tests

### 10. Step 10: Cleanup
- [ ] Remove deprecated `Stagger` and `HexOrientation` from public API
- [ ] Update documentation and MEMORY.md

## Execution Strategy
Each step follows a TDD approach: write/update tests first, then implement to make them pass, then commit. I will work through the steps sequentially.
