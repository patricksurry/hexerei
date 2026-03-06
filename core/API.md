# Gameplay API Specification - Abstract Map Topology

## Overview
This specification defines a grid-agnostic API for interacting with "Area Maps" (Hex, Square, Risk-style irregular polygons). 

## Core Concepts

The map consists of:
1.  **Areas (Faces)**: The playable cells.
2.  **Boundaries (Edges)**: The line segment separating two Areas.
3.  **Junctions (Vertices)**: The point where Boundaries meet.

## Interface: `MeshMap`

```typescript
interface MeshMap {
  // Lookups
  getArea(id: string): Area | undefined;
  getBoundary(id: string): Boundary | undefined;
  getJunction(id: string): Junction | undefined;

  // Navigation
  getNeighbors(area: Area): Area[];
  getBoundaryLoop(area: Area): Boundary[];
}
```

## HexPath DSL Implementation

`HexPath` resolves a concise domain-specific language into a structured set of map elements.

```typescript
interface HexPathResult {
  type: 'hex' | 'edge' | 'vertex';
  segments: string[][]; // Connected sequences of IDs (ordered)
  filled: string[];     // Additional interior IDs (unordered)
}
```

### Connectivity Guarantees
- Adjacent elements in a `segment` are geometric neighbors.
- If a path is closed using `;` or `!`, the first and last elements of that segment will be neighbors.
- Elements in `filled` are typically contained within the boundary defined by the segments.

### Usage
```typescript
const hp = new HexPath(mesh);
const result = hp.resolve("0101 0105, 0202 !");
// result.segments[0] = ["0,0,0", "0,1,-1", ..., "0,4,-4"]
// result.segments[1] = ["1,1,-2", ..., "1,1,-2"] (Closed)
// result.filled = [...]
```

## Data Structures

```typescript
interface Area {
  id: string;        // Canonical ID
  center: Point;     // Coordinate for rendering
  terrain: string;
}

interface Boundary {
  id: string;        // "A|B" or "A/dir"
  areas: [Area, Area | null]; // Primal graph connection
}

interface Junction {
  id: string;        // "A.dir"
  areas: Area[];     // Areas meeting at this point
}
```
