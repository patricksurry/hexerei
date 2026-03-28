# Multi-Geometry Terrain Support — Final Design

**Status:** Approved
**Date:** 2026-03-22

## Problem

The RFC defines three terrain geometry categories (`terrain.hex`, `terrain.edge`, `terrain.vertex`), but the editor currently only loads and displays `terrain.hex`. Paint mode's geometry locking and hit-test infrastructure already support edges and vertices, but there's no way to select an edge/vertex terrain type to paint with. Additionally, hex terrain types can carry a `path: true` property indicating they should render as connected lines between hex centers (roads, railroads) rather than filled hex polygons.

## Current State

### What works

- **Hit-test:** Returns edge hits (`type: 'edge'`, `boundaryId`) and vertex hits (`type: 'vertex'`, `vertexId`) — fully functional
- **Paint mode geometry locking:** First click locks to hex/edge/vertex; subsequent clicks must match — fully functional
- **Inspector selection view:** Shows edge and vertex details when selected in select mode (edge shows hex labels on each side, vertex shows meeting hexes)
- **HexPath `at` expressions:** Already support edge IDs (`0304/1`) and vertex IDs (`0304.1`) — the append-token pipeline works for all geometry types

### What's missing

1. **MapModel terrain loading:** `model.ts` line 72 only reads `terrainVocab.hex`. Ignores `edge` and `vertex`.
2. **Inspector terrain vocabulary UI:** Only shows hex terrain types. No sections for edge/vertex.
3. **Starter palettes:** NewMapDialog's "Standard Wargame" palette only defines hex terrain.
4. **Scene rendering:** Canvas renderer only draws hex terrain fills. No edge/vertex rendering, no path-style line rendering for hex terrain with `path: true`.

## Key Design Decisions

### Paths are hex terrain with a rendering hint

Paths (roads, railroads, trails) are **not** a fourth geometry type. They are hex terrain types with a `path: true` property in the terrain definition. This keeps the data model aligned with the hex grid's graph duality (faces/edges/vertices = hex/edge/vertex).

- The `at` expression is a hex list, resolved via `type: 'hex'`
- Rendering draws connected lines between hex centers within each contiguous segment of the `at` expression
- Connectivity matters: in `"0102, 0202-0204"` with terrain `road(path: true)`, there is no connection between 0102 and 0202 — these are separate segments
- Paint mode uses hex geometry + shift-click-to-extend (existing machinery)

### Terrain keys are geometry-scoped without prefixes

The RFC organizes terrain definitions by geometry (`terrain.hex.river`, `terrain.edge.river`). A terrain key like `river` is unambiguous within its geometry context — the context is always known:

- **In the document:** the `at` expression determines geometry (`0304` = hex, `0304/N` = edge, `0304.N` = vertex)
- **In the UI:** the palette section tells you the geometry
- **In paint mode:** `paintState` carries the geometry
- **At render time:** the feature's resolved type determines rendering

Therefore `MapModel` stores terrain definitions in a geometry-scoped structure (`Map<GeometryType, Map<string, TerrainDef>>`) rather than using prefixed keys. Lookup requires both geometry and key. This mirrors the RFC structure and keeps YAML keys short (`terrain: river`, not `terrain: edge:river`).

## Architecture & Data Flow

### 1. Model & Data Flow (Phase A)

- **Geometry-scoped terrain storage:** `MapModel._terrainDefs` becomes `Map<GeometryType, Map<string, TerrainDef>>` where `GeometryType = 'hex' | 'edge' | 'vertex'`. The loader reads all three sections of the RFC's `terrain` object.
- **`terrainColor(geometry, key)`:** Takes both geometry and key. Existing call sites pass `'hex'` until they gain geometry awareness.
- **Commands:** `MapCommand` will be updated to pass the `geometry` scope where needed.
- **Computed States:** Just as `MapModel` builds `ComputedHexState`, we will introduce `ComputedEdgeState` and `ComputedVertexState`. These will be derived by iterating over the `features` array in document order, ensuring that later features override earlier ones for scalar properties like terrain. Reverse indices (`_edgeToFeatures`, `_vertexToFeatures`) will be built alongside the existing `_hexToFeatures`.
- **Feature resolution:** The feature loop (currently line 100, only handles `result.type === 'hex'`) will be extended to handle `result.type === 'edge'` and `result.type === 'vertex'` from the HexPath resolver.

### 2. Inspector UI (Phase B)

- **Terrain Vocabulary Split:** The Terrain Vocabulary in the Inspector will be split into 3 sections: Hex, Edge, and Vertex. Hex terrain types with `path: true` are shown in the Hex section (possibly with a visual indicator).
- **Addition & Editing:** Each section will have its own "+ Add Terrain Type" button.
- **Paint Mode Trigger:** Clicking a terrain color chip to enter Paint Mode will set both `terrainKey` and `geometry` in the app's `paintState`, ensuring the app restricts hit-tests and applies the correct feature types. The current `paintState` type already has `lockedGeometry` — the new `geometry` field represents the *intended* geometry (from the palette click), while `lockedGeometry` confirms it on first paint click.

### 3. Starter Palettes (Phase C)

- **NewMapDialog Expansion:** We will update the "Standard Wargame" starter palette to include edge terrain (e.g., `river`, `cliff`) and hex path terrain (e.g., `road` with `path: true`, `railroad` with `path: true`).

### 4. Canvas Rendering (Phase D)

- **Layered Passes:** We will use layered rendering passes to draw the map. This ensures visual clarity by drawing all hex fills, then all edges, then all path lines, then all vertex markers, and finally labels. This prevents a hex drawn late in the document order from occluding an edge drawn early.
- **Edge Rendering:** Drawn as a thick line along the hexside. If `onesided: true` (e.g., cliffs), we will add a small marker (like a dot or tick mark) on the side of the referencing ("active") hex.
- **Vertex Rendering:** Drawn as a circle marker at the hex corner.
- **Path Rendering:** For hex terrain with `path: true`, drawn as lines connecting hex centers. Only adjacent hexes within a contiguous segment of the `at` expression are connected — comma-separated groups are independent segments.
- **Path Paint Tool:** Shift-click-to-extend using existing hex paint machinery. Each shift-click appends an adjacent hex to the `at` expression, extending the current segment.
