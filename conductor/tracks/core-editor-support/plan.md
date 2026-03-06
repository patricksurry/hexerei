# Implementation Plan: HexMap Core: Editor Support Updates

- **Track ID:** `hexmap-core-editor-support`

## Phase 1: Core Type Updates
- [x] Task 1.1: Define `Area` interface and update `MeshMap` in `hexmap-core/src/types.ts`.
- [x] Task 1.2: Fix any resulting compilation errors in other core files (e.g. `hex-mesh.ts`).

## Phase 2: HexMesh Refinement
- [x] Task 2.1: Transition `HexMesh` to use `Map<string, Area>` for storage instead of `Set<string>`.
- [x] Task 2.2: Implement `updateArea(id: string, attrs: Partial<Area>)` in `HexMesh`.
- [x] Task 2.3: Add unit tests for `HexMesh` updates in `hexmap-core/src/hex-mesh.test.ts`.

## Phase 3: Document Manipulation
- [x] Task 3.1: Implement `setLayout(key: string, value: any)` in `HexMapDocument`.
- [x] Task 3.2: Implement `addFeature(feature: any)` in `HexMapDocument`.
- [x] Task 3.3: Implement `toJS()` in `HexMapDocument`.
- [x] Task 3.4: Add unit tests for document manipulation in `hexmap-core/src/document.test.ts`.

## Finalization
- [x] Task 4.1: Ensure all tests pass.
- [x] Task 4.2: Update `docs/hexmap-core-updates.md` to reflect completion (or move to completed status if applicable).
