# Plan: Core Package Cleanup & Optimization

## Objective
Refactor the `core` package to eliminate redundancy, improve its API for `editor` and `renderer`, and adhere to DRY and SOLID principles. 

## Key Files & Context
- `core/src/index.ts`: The main entry point for the package.
- `core/src/format/loader.ts`: Currently redundant with `editor/src/model/map-model.ts`.
- `core/src/hexpath/hex-path.ts`: Powerful but currently unused/underused.
- `core/src/math/hex-math.ts`: Core math functions, contains some duplication.
- `editor/src/model/map-model.ts`: Primary consumer that currently duplicates many `core` responsibilities.
- `renderer/src/index.ts`: Secondary consumer with some duplicated logic.

## Proposed Changes

### 1. Consolidate Loading & Mesh Building
- **Action**: Move the robust YAML parsing and `HexMesh` construction logic from `editor/src/model/map-model.ts` to `core/src/format/loader.ts`.
- **Details**:
    - Update `HexMapLoader.load(source: string): HexMesh` to handle full document processing, including features, exclusions, and basic terrain assignments.
    - Support both "grid" and "layout" keys for backward compatibility.
    - Ensure `HexMesh` stores the necessary metadata (stagger, firstCol, firstRow) for coordinate mapping.

### 2. Unify Coordinate & Path Resolution (`HexPath`)
- **Action**: Enhance `HexPath` to be the primary resolver for all coordinate-related strings.
- **Details**:
    - Support "range" expansion (e.g., `0101..0105` or similar) in the DSL to replace the manual rectangle logic in `editor`.
    - Integrate `HexPath` into `HexMapLoader` to process the `at`, `hex`, and `hexes` fields.
    - Move `labelToHexId` and `hexIdToLabel` logic from `editor` and `renderer` into a dedicated `CoordinateSystem` class or as robust helpers in `core/src/math/hex-math.ts` or `core/src/mesh/hex-mesh.ts`.

### 3. SOLID Refactoring
- **Single Responsibility**: Separate YAML processing into `HexMapDocument` (raw YAML manipulation) and `HexMapLoader` (domain object building).
- **Interface Segregation**: Ensure `MeshMap` interface accurately reflects what `renderer` and `HexPath` need.
- **DRY**: Create a single `getLabel(id: string, config: MeshConfig): string` helper in `core` to replace duplicate logic in `editor` and `renderer`.

### 4. Cleanup & Documentation
- **Action**: Delete `core/API.md` and create a high-quality `core/README.md`.
- **Details**:
    - `README.md` should cover the Core Concepts (Areas, Boundaries, Junctions), usage of `HexMapLoader`, and the `HexPath` DSL.
    - Audit `core/src/index.ts` to ensure only intended public APIs are exported.
    - Clean up `core/src/math/hex-math.ts` by removing redundant functions (e.g., `getVertexId` calling `getCanonicalVertexId`).

### 5. Update Consumers
- **Action**: Update `editor/src/model/map-model.ts` to use the new `HexMapLoader`.
- **Action**: Update `renderer/src/index.ts` to use the new coordinate helpers from `core`.

## Verification & Testing
1. **Unit Tests**:
    - Update and run `core` tests (`npm test` in `core`).
    - Add new tests for `HexPath` range expansion and `HexMapLoader` full document loading.
2. **Integration Tests**:
    - Run `editor` tests (`npm test` in `editor`) to ensure `MapModel` refactor didn't break functionality.
    - Run `renderer` tests.
3. **Manual Verification**:
    - Open the `editor` in a browser and load a map to verify it still renders correctly.

## Alternatives Considered
- **Keep `MapModel` as is**: Rejected because it makes `core` feel like a secondary helper instead of the source of truth for map logic.
- **Move all state to `core`**: Rejected for now; `editor` needs some UI-specific state (like `TerrainDef` colors) that doesn't strictly belong in `core` yet, though it could be migrated later.
