# RFC: hexmap-core API Specification

**Status**: Draft
**Date**: February 2026

## 1. Goal

The `hexmap-core` library provides the computational backbone for the **hexerei** ecosystem. It must provide a language-agnostic, consistent API for:
1.  **Ingestion**: Building and modifying map data.
2.  **Topology**: Navigating the grid and calculating relationships.
3.  **Rendering**: Projecting coordinates to 2D space.
4.  **Serialization**: Translating between in-memory structures and the HexMap format.

This RFC defines the abstract interfaces and data models that implementations (Python, TypeScript, Rust, etc.) SHOULD follow.

---

## 2. Core Data Model

The API treats the map as a **Dual Planar Graph**.

- **Area (Face)**: A hex cell.
- **Boundary (Edge)**: The shared side between two hexes.
- **Junction (Vertex)**: The point where three hexes meet.

### 2.1 Coordinate Systems
Implementations MUST support:
- **Cube (u, v, w)**: Canonical for math.
- **Axial (q, r)**: Compact 2D representation.
- **User (String)**: Human-readable ID (e.g., "0304").

---

## 3. API Surfaces

### 3.1 Surface: Map Topology (`IMapMesh`)
Focused on navigation and graph properties.

```typescript
interface IMapMesh {
  // --- Element Access ---
  getArea(id: string | Coordinate): Area;
  getBoundary(id: string): Boundary;
  getJunction(id: string): Junction;

  // --- Adjacency ---
  getNeighbors(area: Area): Area[];
  getBoundaries(area: Area): Boundary[];
  getJunctions(area: Area): Junction[];

  // --- Traversal ---
  getPath(start: Area, end: Area, costFn: PathCostFn): Area[];
  getReachable(start: Area, limit: number, costFn: PathCostFn): Set<Area>;

  // --- Geometry ---
  getDistance(a: Area, b: Area): number;
  getLine(a: Area, b: Area): Area[];
}
```

### 3.2 Surface: Ingestion & Modification (`IMapBuilder`)
Focused on programmatically creating or updating a map (used by `hexmap-importer` and editors).

```typescript
interface IMapBuilder {
  setGrid(config: GridConfig): void;
  defineTerrain(type: string, category: 'hex' | 'edge' | 'vertex', props: object): void;
  
  // High-level feature application
  applyFeature(feature: FeatureDescriptor): void;
  
  // Low-level overrides
  setTerrain(element: ElementRef, terrainType: string): void;
  setProperty(element: ElementRef, key: string, value: any): void;
  
  // Validation
  validate(): ValidationReport;
}
```

### 3.3 Surface: Projection & Rendering (`ICamera`)
Focused on mapping grid coordinates to screen/canvas space.

```typescript
interface ICamera {
  // Math: Hex -> Screen
  project(coord: Coordinate): Point;
  unproject(point: Point): Coordinate;
  
  // Math: Element Bounds
  getAreaPolygon(area: Area): Point[];
  getBoundarySegment(boundary: Boundary): [Point, Point];
  
  // Visibility
  getVisibleAreas(viewport: Rect): Area[];
}
```

### 3.4 Surface: Persistence (`IMapIO`)
Handling the HexMap format.

```typescript
interface IMapIO {
  load(data: string | object): IMapMesh;
  dump(mesh: IMapMesh, format: 'json' | 'yaml'): string;
}
```

---

## 4. Consumer Requirements

### 4.1 `hexmap-importer` (Python)
- Needs `IMapBuilder` to translate CV detections into a structured map.
- Needs `IMapIO` to save the result.
- Needs `ICamera` to project detected image coordinates back into the hex grid (calibration).

### 4.2 `hexmap-renderer` (TypeScript)
- Needs `ICamera` for all drawing logic.
- Needs `IMapMesh` to find which edges have rivers/roads to draw them as connected paths.
- Needs properties to determine colors/icons.

### 4.3 Game Engine
- Needs `IMapMesh` for movement range and LOS.
- Needs a "State Layer" that wraps `IMapMesh` to store dynamic unit positions without modifying the static map data.

---

## 5. Implementation Patterns

### 5.1 Language-Agnostic Types
To ensure portability, use standard primitives:
- **Coordinate**: `[u, v, w]` integer array.
- **Point**: `{ x: number, y: number }`.
- **Properties**: Map/Dictionary of string to any.

### 5.2 Lazy Evaluation
Map meshes SHOULD be lazily evaluated where possible. For regular grids, `getNeighbors` shouldn't require a lookup table; it should use coordinate math.

### 5.3 Extension Hooks
Implementations should allow attaching "Mixins" or "Services" for specialized math (e.g., Line of Sight, Influence Maps).
