# Multi-Geometry Terrain Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement full support for edge, vertex, and path terrain geometries across the editor stack, including data flow, inspector UI, and canvas rendering.

**Architecture:** Extend `MapModel` to handle geometry-scoped terrain keys (e.g., `edge:river`). Introduce `ComputedEdgeState`, `ComputedVertexState`, and `ComputedPathState` evaluated in document order. Update the `Inspector` to group terrain by geometry and trigger geometry-aware paint modes. Enhance `CanvasHost` to render these features in layered passes (hexes -> edges -> paths -> vertices -> labels) and support path painting.

**Tech Stack:** React, Canvas 2D, Hexerei Core (`@hexmap/core`), Vitest.

---

### Task 1: MapModel and Data Flow

**Files:**

- Modify: `packages/canvas/src/types.ts`
- Modify: `packages/canvas/src/model.ts`
- Test: `packages/canvas/src/model.test.ts`

**Step 1: Write the failing test**

```typescript
// in model.test.ts
import { HexMapDocument } from '@hexmap/core';
import { MapModel } from './model.js';

describe('Multi-Geometry MapModel', () => {
  it('loads edge, vertex, and path terrain definitions', () => {
    const yaml = `
hexmap: "1.0"
grid: { columns: 2, rows: 2, hex_top: flat }
terrain:
  edge:
    river: { color: "#0000ff" }
  vertex:
    bridge: { color: "#884400" }
  path:
    road: { color: "#444444" }
`;
    const doc = new HexMapDocument(yaml);
    const model = MapModel.fromDocument(doc);

    expect(model.terrainDefs.get('edge:river')).toBeDefined();
    expect(model.terrainDefs.get('vertex:bridge')).toBeDefined();
    expect(model.terrainDefs.get('path:road')).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test packages/canvas/src/model.test.ts`
Expected: FAIL, cannot find 'edge:river'.

**Step 3: Write minimal implementation**

In `types.ts`, update `TerrainDef` to include `geometry`:

```typescript
export interface TerrainDef {
  geometry: 'hex' | 'edge' | 'vertex' | 'path';
  key: string;
  name: string;
  color: string;
  properties?: Record<string, unknown>;
}
```

In `model.ts`, update `constructor` to load all geometries:

```typescript
// Terrain definitions
this._terrainDefs = new Map();
const terrainVocab = doc.getTerrain();

const geometries = ['hex', 'edge', 'vertex', 'path'] as const;
for (const geo of geometries) {
  const vocab = terrainVocab[geo] ?? {};
  for (const [key, def] of Object.entries(vocab)) {
    this._terrainDefs.set(`${geo}:${key}`, {
      geometry: geo,
      key,
      name: def.name ?? key,
      color: def.style?.color ?? '#888888',
      properties: def.properties,
    });
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test packages/canvas/src/model.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/canvas/src/types.ts packages/canvas/src/model.ts packages/canvas/src/model.test.ts
git commit -m "feat(canvas): load multi-geometry terrain definitions in MapModel"
```

---

### Task 2: Terrain Color Resolution

**Files:**

- Modify: `packages/canvas/src/model.ts`
- Test: `packages/canvas/src/model.test.ts`

**Step 1: Write the failing test**

```typescript
// in model.test.ts
it('resolves terrain colors via scoped keys', () => {
  // Add to previous test
  expect(model.terrainColor('edge:river')).toBe('#0000ff');
  expect(model.terrainColor('river', 'edge')).toBe('#0000ff');
});
```

**Step 2: Run test to verify it fails**

Run: `npm test packages/canvas/src/model.test.ts`
Expected: FAIL, `terrainColor` doesn't support scopes.

**Step 3: Write minimal implementation**

In `model.ts`, update `terrainColor`:

```typescript
  terrainColor(terrainString: string, geometry: 'hex' | 'edge' | 'vertex' | 'path' = 'hex'): string {
    if (!terrainString) return '#555555';
    const parts = terrainString.split(/\s+/);
    const terrain = parts[parts.length - 1];

    // If it's already a scoped key (e.g. edge:river), use it directly
    const scopedKey = terrain.includes(':') ? terrain : `${geometry}:${terrain}`;
    const def = this._terrainDefs.get(scopedKey);
    if (def) return def.color;

    if (terrain === 'unknown') return '#888888';

    let hash = 0;
    for (let i = 0; i < terrain.length; i++) {
      hash = terrain.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 40%, 60%)`;
  }
```

_Note: Update calls inside `model.ts` to `this.terrainColor(terrain, 'hex')` where needed._

**Step 4: Run test to verify it passes**

Run: `npm test packages/canvas/src/model.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/canvas/src/model.ts packages/canvas/src/model.test.ts
git commit -m "feat(canvas): scoped terrain color resolution"
```

---

### Task 3: Inspector UI Terrain Sections

**Files:**

- Modify: `editor/src/components/Inspector.tsx`

**Step 1: Write the minimal implementation**

In `Inspector.tsx`, split the "TERRAIN VOCABULARY" rendering into sections.

1. Get geometries: `const geometries = ['hex', 'edge', 'vertex', 'path'] as const;`
2. Map over them to render 4 `<ul>` blocks, each with its own header.
3. Filter `model.terrainDefs` by `geometry`:
   `const defs = Array.from(model.terrainDefs.entries()).filter(([_, d]) => d.geometry === geo);`
4. Update "+ Add Terrain Type" to take `geo` as an argument.
5. In `setTerrainType` commands inside the `geo` loop, use `geometry: geo` instead of `'hex'`.
6. For the "Feature Properties" view, the `Terrain` select dropdown should show all terrain definitions, perhaps with their scope prefixed or grouped by `geometry`.

**Step 2: Run dev/test to verify**

Run: `npm test editor/src/components/Inspector.test.tsx`
Verify UI updates visually.

**Step 3: Commit**

```bash
git add editor/src/components/Inspector.tsx
git commit -m "feat(editor): group Inspector terrain vocab by geometry"
```

---

### Task 4: Paint Mode Setup

**Files:**

- Modify: `editor/src/App.tsx`
- Modify: `editor/src/components/Inspector.tsx`
- Modify: `editor/src/components/StatusBar.tsx`

**Step 1: Write the minimal implementation**

In `App.tsx`:
Change `paintState` to include `geometry: 'hex' | 'edge' | 'vertex' | 'path'`.

```typescript
const [paintState, setPaintState] = useState<{
  terrainKey: string; // no prefix
  geometry: 'hex' | 'edge' | 'vertex' | 'path';
  lockedGeometry: 'hex' | 'edge' | 'vertex' | 'path' | null;
  targetFeatureIndex: number | null;
} | null>(null);
```

Update `handlePaintClick` to verify `hit.type === paintState.geometry` before applying (paths map to hex hits).
For paths, append to `path:` feature arrays.

In `Inspector.tsx`:
Update `onPaintActivate?: (key: string | null, geometry: string | null) => void;`
Pass `def.key` and `def.geometry` when clicking chips.

In `StatusBar.tsx`:
Update props to take `paintGeometry`. Display it alongside `paintTerrainKey`.

**Step 2: Run test to verify**

Run: `npm test editor`

**Step 3: Commit**

```bash
git add editor/src/App.tsx editor/src/components/Inspector.tsx editor/src/components/StatusBar.tsx
git commit -m "feat(editor): geometry-aware paint mode"
```

---

### Task 5: Starter Palettes

**Files:**

- Modify: `editor/src/components/NewMapDialog.tsx`

**Step 1: Write the minimal implementation**

In `NewMapDialog.tsx`, extend `PALETTES['standard']`:
Add:
`edge: ['river', 'cliff']`
`path: ['road']`

Update the YAML generation logic to output `edge` and `path` sections.

**Step 2: Run test to verify**

Run: `npm test editor/src/components/NewMapDialog.test.tsx`

**Step 3: Commit**

```bash
git add editor/src/components/NewMapDialog.tsx
git commit -m "feat(editor): multi-geometry starter palette"
```

---

### Task 6: Canvas Rendering Data Prep

**Files:**

- Modify: `packages/canvas/src/scene.ts`
- Modify: `packages/canvas/src/types.ts`

**Step 1: Write the minimal implementation**

In `types.ts` or `scene.ts`, introduce types for rendering edge, path, and vertex visuals.
In `scene.ts` `buildScene()`, iterate `model.features`:

- If `f.hexIds` is present and `geometry` is `hex`, do the normal fill.
- If `edge` references exist in `f`, compute coordinates and store line segments.
- If `vertex` references exist in `f`, compute coordinates and store points.
- If `path` (hex sequence) exists in `f`, compute centers and store connected line segments.

Group these into separate render lists inside `Scene`:

```typescript
export interface Scene {
  hexes: HexGraphic[];
  edges: LineGraphic[];
  paths: LineGraphic[];
  vertices: PointGraphic[];
  labels: LabelGraphic[];
}
```

**Step 2: Run test to verify**

Run: `npm test packages/canvas/src/scene.test.ts`

**Step 3: Commit**

```bash
git add packages/canvas/src/scene.ts packages/canvas/src/types.ts
git commit -m "feat(canvas): pre-compute multi-geometry scene layers"
```

---

### Task 7: Layered Rendering

**Files:**

- Modify: `editor/src/canvas/draw.ts`

**Step 1: Write the minimal implementation**

In `drawScene()`, render the lists in Z-order:

1. `scene.hexes.forEach(drawHexFill)`
2. `scene.edges.forEach(drawThickLine)` (Add tick marks for directed edges)
3. `scene.paths.forEach(drawPathLine)`
4. `scene.vertices.forEach(drawCircle)`
5. `scene.labels.forEach(drawLabel)`

**Step 2: Run test to verify**

Run: `npm test editor/src/canvas/draw.test.ts`

**Step 3: Commit**

```bash
git add editor/src/canvas/draw.ts
git commit -m "feat(editor): render multi-geometry layers in canvas"
```
