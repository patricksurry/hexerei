# Multi-Geometry Terrain Support — Final Design

**Status:** Approved
**Date:** 2026-03-22

## Problem

The RFC defines four terrain geometry categories (`terrain.hex`, `terrain.edge`, `terrain.vertex`, `terrain.path`), but the editor currently only loads and displays `terrain.hex`. Paint mode's geometry locking and hit-test infrastructure already support edges and vertices, but there's no way to select an edge/vertex/path terrain type to paint with.

## Current State

### What works

- **Hit-test:** Returns edge hits (`type: 'edge'`, `boundaryId`) and vertex hits (`type: 'vertex'`, `vertexId`) — fully functional
- **Paint mode geometry locking:** First click locks to hex/edge/vertex; subsequent clicks must match — fully functional
- **Inspector selection view:** Shows edge and vertex details when selected in select mode (edge shows hex labels on each side, vertex shows meeting hexes)
- **HexPath `at` expressions:** Already support edge IDs (`0304/1`) and vertex IDs (`0304.1`) — the append-token pipeline works for all geometry types

### What's missing

1. **MapModel terrain loading:** `model.ts` line 72 only reads `terrainVocab.hex`. Ignores `edge`, `vertex`, `path`.
2. **Inspector terrain vocabulary UI:** Only shows hex terrain types. No sections for edge/vertex/path.
3. **Starter palettes:** NewMapDialog's "Standard Wargame" palette only defines hex terrain.
4. **Scene rendering:** Canvas renderer only draws hex terrain fills. No edge/vertex/path rendering.
5. **`terrain.path` semantics:** Paths are through-hex linear features (roads, railroads). These use hex center paths but render as lines between hex centers. Different from edge terrain which sits on hexsides.

## Architecture & Data Flow

### 1. Model & Data Flow (Phase A)

- **Scoped Terrain Identifiers:** `MapModel` will store terrain definitions using scoped keys (e.g., `edge:river`, `hex:clear`) to safely support identical names across geometries, honoring the RFC's geometry-scoped terrain assumption.
- **Commands:** `MapCommand` will be updated to pass the `geometry` scope where needed.
- **Computed States:** Just as `MapModel` builds `ComputedHexState`, we will introduce computed states for edges (`ComputedEdgeState`), vertices (`ComputedVertexState`), and paths (`ComputedPathState`). These will be derived by iterating over the `features` array in document order, ensuring that later features override earlier ones for scalar properties like terrain.

### 2. Inspector UI (Phase B)

- **Terrain Vocabulary Split:** The Terrain Vocabulary in the Inspector will be split into 4 distinct sections: Hex, Edge, Vertex, and Path.
- **Addition & Editing:** Each section will have its own "+ Add Terrain Type" button.
- **Paint Mode Trigger:** Clicking a terrain color chip to enter Paint Mode will set both `terrainKey` and `geometry` in the app's `paintState`, ensuring the app restricts hit-tests and applies the correct feature types.

### 3. Starter Palettes (Phase C)

- **NewMapDialog Expansion:** We will update the "Standard Wargame" starter palette to include edge terrain (e.g., `river`, `cliff`) and path terrain (e.g., `road`, `railroad`).

### 4. Canvas Rendering (Phase D)

- **Layered Passes:** We will use layered rendering passes to draw the map. This ensures visual clarity by drawing all hexes, then all edges, then all paths, then all vertices, and finally labels. This prevents a hex drawn late in the document order from occluding an edge drawn early.
- **Edge Rendering:** Drawn as a thick line along the hexside. If `directed: true` (e.g., cliffs), we will add a small marker (like a dot or tick mark) on the side of the referencing ("active") hex.
- **Vertex Rendering:** Drawn as a circle marker at the hex corner.
- **Path Rendering:** Drawn as lines connecting the centers of the hex array sequence.
- **Path Paint Tool:** We will use the existing shift-click machinery to extend a path. A singleton path (one hex) is structurally a no-op but acts as the starting point. Shift-clicking adjacent hexes appends to the continuous `path` array in that single feature.
