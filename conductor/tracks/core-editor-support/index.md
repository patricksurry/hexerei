# HexMap Core: Editor Support Updates

- **Track ID:** `hexmap-core-editor-support`
- **Goal:** Implement the required updates for `@hexmap/core` to support the HexMap Editor as outlined in `docs/hexmap-core-updates.md`.
- **Status:** `completed`

## Navigation
- [Specification](./spec.md)
- [Implementation Plan](./plan.md)

## Success Criteria
- [x] `Area` interface updated in `types.ts` with required fields.
- [x] `HexMesh` stores `Area` objects and supports `updateArea` method.
- [x] `HexMapDocument` includes `setLayout`, `addFeature`, and `toJS` methods.
- [x] Existing tests in `hexmap-core` still pass, and new tests are added for the new functionality.
