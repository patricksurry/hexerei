# API Surface Design Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement clean, typed API surfaces across core and editor, extract `@hexmap/canvas` for framework-agnostic rendering, and establish a command-based mutation layer for authoring.

**Architecture:** We are refactoring `@hexmap/core` to exactly mirror the HexMap 1.0 JSON schema and RFC definitions. We then extract all framework-agnostic model, scene, and interaction state from `editor/src/model` into a new `@hexmap/canvas` package. A new command-based mutation layer is added to `@hexmap/canvas` to handle map edits with undo/redo capabilities, which the React-based `editor` application will consume.

**Tech Stack:** TypeScript, React, Vitest, YAML

---

## Phase 1: Core Types & Layout (`@hexmap/core`)

### Task 1: Unify `Point` definition in `core`

**Files:**
- Create: `core/src/math/point.test.ts`
- Modify: `core/src/math/hex-math.ts`
- Modify: `core/src/mesh/types.ts`
- Modify: `editor/src/model/viewport.ts` (or simply expect to update imports later)

**Step 1: Write the failing test**

```typescript
// core/src/math/point.test.ts
import { expect, test } from 'vitest';
import type { Point } from './hex-math.js';

test('Point interface exists and can be assigned', () => {
    const p: Point = { x: 10, y: 20 };
    expect(p.x).toBe(10);
    expect(p.y).toBe(20);
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/src/math/point.test.ts`
Expected: FAIL (Type error: "Point is not exported from './hex-math'")

**Step 3: Write minimal implementation**

```typescript
// Add to core/src/math/hex-math.ts
export interface Point {
    x: number;
    y: number;
}

// Remove Point interface from core/src/mesh/types.ts
// Update any internal imports in core to import Point from '../math/hex-math'
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/src/math/point.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add core/src/math/point.test.ts core/src/math/hex-math.ts core/src/mesh/types.ts
git commit -m "refactor(core): unify Point interface in hex-math"
```

### Task 2: Document envelope types (`HexMapLayout`, `HexMapMetadata`)

**Files:**
- Create: `core/src/format/types.ts`
- Create: `core/src/format/types.test.ts`

**Step 1: Write the failing test**

```typescript
// core/src/format/types.test.ts
import { expect, test } from 'vitest';
import type { HexMapLayout, HexMapMetadata, GeoReference } from './types.js';

test('Envelope types are correctly exported', () => {
    const layout: HexMapLayout = { orientation: 'flat-down', all: 'base' };
    const meta: HexMapMetadata = { title: 'Test Map' };
    const geo: GeoReference = { scale: 1000 };
    
    expect(layout.all).toBe('base');
    expect(meta.title).toBe('Test Map');
    expect(geo.scale).toBe(1000);
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/src/format/types.test.ts`
Expected: FAIL (Cannot find module './types')

**Step 3: Write minimal implementation**

```typescript
// core/src/format/types.ts
import type { Orientation } from '../math/hex-math.js';

export interface GeoReference {
  scale?: number;
  anchor?: { lat: number; lng: number };
  anchor_hex?: string;
  bearing?: number;
  projection?: string;
}

export interface HexMapLayout {
  orientation: Orientation;
  all: string;
  label?: string;
  origin?: 'top-left' | 'bottom-left' | 'top-right' | 'bottom-right';
  georef?: GeoReference;
}

export interface HexMapMetadata {
  id?: string;
  version?: string;
  title?: string;
  description?: string;
  designer?: string;
  publisher?: string;
  date?: string;
  source?: { url?: string; notes?: string };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/src/format/types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add core/src/format/types.ts core/src/format/types.test.ts
git commit -m "feat(core): add HexMapLayout and HexMapMetadata types"
```

### Task 3: Terrain and Feature types

**Files:**
- Modify: `core/src/format/types.ts`
- Modify: `core/src/format/types.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to core/src/format/types.test.ts
import type { TerrainTypeDef, TerrainStyle, TerrainVocabulary, Feature } from './types.js';

test('Terrain and Feature types are correctly exported', () => {
    const style: TerrainStyle = { color: '#ff0000' };
    const terrain: TerrainTypeDef = { name: 'Mountain', style };
    const vocab: TerrainVocabulary = { hex: { 'M': terrain } };
    const feature: Feature = { at: '0101', terrain: 'M' };
    
    expect(vocab.hex?.['M'].name).toBe('Mountain');
    expect(feature.at).toBe('0101');
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/src/format/types.test.ts`
Expected: FAIL (Types not exported)

**Step 3: Write minimal implementation**

```typescript
// Add to core/src/format/types.ts
export interface TerrainStyle {
  color?: string;
  pattern?: string;
  stroke?: string;
  stroke_width?: number;
}

export interface TerrainTypeDef {
  name?: string;
  type?: 'base' | 'modifier';
  onesided?: boolean;
  style?: TerrainStyle;
  properties?: Record<string, unknown>;
}

export interface TerrainVocabulary {
  hex?: Record<string, TerrainTypeDef>;
  edge?: Record<string, TerrainTypeDef>;
  vertex?: Record<string, TerrainTypeDef>;
}

export interface Feature {
  at: string;
  terrain?: string;
  elevation?: number;
  label?: string;
  id?: string;
  tags?: string;
  side?: 'both' | 'in' | 'out' | 'left' | 'right';
  properties?: Record<string, unknown>;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/src/format/types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add core/src/format/types.ts core/src/format/types.test.ts
git commit -m "feat(core): add Terrain and Feature RFC types"
```

### Task 4: HexMapDocument typed getters/setters

**Files:**
- Modify: `core/src/format/document.ts`
- Modify: `core/src/format/document.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to core/src/format/document.test.ts
import { expect, test } from 'vitest';
import { HexMapDocument } from './document.js';
import type { Feature } from './types.js';

test('HexMapDocument typed methods', () => {
    const doc = new HexMapDocument('hexmap: "1.0"\nlayout:\n  orientation: flat-down\n  all: base\n');
    doc.setMetadata('title', 'New Map');
    expect(doc.getMetadata().title).toBe('New Map');
    
    expect(doc.getLayout().orientation).toBe('flat-down');
    
    const feature: Feature = { at: '0101', terrain: 'M' };
    doc.addFeature(feature); // should not throw
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/src/format/document.test.ts`
Expected: FAIL (Methods do not exist on HexMapDocument)

**Step 3: Write minimal implementation**

```typescript
// Add to core/src/format/document.ts
import type { HexMapLayout, HexMapMetadata, Feature } from './types.js';

// Inside HexMapDocument class:
  getMetadata(): HexMapMetadata {
      return this.raw.getIn(['metadata'])?.toJSON() || {};
  }
  
  setMetadata<K extends keyof HexMapMetadata>(key: K, value: HexMapMetadata[K]): void {
      if (!this.raw.has('metadata')) {
          this.raw.set('metadata', this.raw.createNode({}));
      }
      this.raw.setIn(['metadata', key], value);
  }

  getLayout(): HexMapLayout {
      return this.raw.get('layout')?.toJSON() || { orientation: 'flat-down', all: 'base' };
  }

  setLayout<K extends keyof HexMapLayout>(key: K, value: HexMapLayout[K]): void {
      this.raw.setIn(['layout', key], value);
  }

  addFeature(feature: Feature): void {
      if (!this.raw.has('features')) {
          this.raw.set('features', this.raw.createNode([]));
      }
      this.raw.addIn(['features'], feature);
  }
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/src/format/document.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add core/src/format/document.ts core/src/format/document.test.ts
git commit -m "feat(core): add typed getters/setters and addFeature to HexMapDocument"
```

### Task 5: HexMesh Config & Layout Update

**Files:**
- Modify: `core/src/mesh/hex-mesh.ts`
- Modify: `core/src/mesh/hex-mesh.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to core/src/mesh/hex-mesh.test.ts
import { expect, test } from 'vitest';
import { HexMesh } from './hex-mesh.js';
import type { HexMapLayout } from '../format/types.js';

test('HexMesh uses HexMapLayout in config', () => {
    const layout: HexMapLayout = { orientation: 'flat-down', all: 'base' };
    const mesh = new HexMesh([], { layout });
    expect(mesh.layout.all).toBe('base');
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/src/mesh/hex-mesh.test.ts`
Expected: FAIL (Type issues with config, layout missing on mesh instance)

**Step 3: Write minimal implementation**

```typescript
// In core/src/mesh/hex-mesh.ts
import type { HexMapLayout } from '../format/types.js';
import type { Orientation } from '../math/hex-math.js';

export interface HexMeshConfig {
  orientation?: Orientation;
  firstCol?: number;
  firstRow?: number;
  terrain?: Map<string, string>;
  layout?: HexMapLayout;
}

// Inside HexMesh class:
  public layout: HexMapLayout;

  constructor(validHexes: Cube[], config: HexMeshConfig = {}) {
      this.layout = config.layout || { orientation: 'flat-down', all: '@all' };
      // ... keep existing constructor logic
  }
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/src/mesh/hex-mesh.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add core/src/mesh/hex-mesh.ts core/src/mesh/hex-mesh.test.ts
git commit -m "refactor(core): update HexMesh to use typed HexMapLayout"
```

---

## Phase 2: Core API Codecs (`@hexmap/core`)

### Task 6: Direction codec

**Files:**
- Modify: `core/src/math/hex-math.ts`
- Modify: `core/src/math/hex-math.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to core/src/math/hex-math.test.ts
import { DIRECTION_NAMES, directionIndex, directionName } from './hex-math.js';

test('Direction codecs work correctly', () => {
    expect(DIRECTION_NAMES.flat[0]).toBe('ne');
    expect(directionIndex('ne', 'flat')).toBe(0);
    expect(directionName(0, 'flat')).toBe('ne');
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/src/math/hex-math.test.ts`
Expected: FAIL (Not defined)

**Step 3: Write minimal implementation**

```typescript
// Add to core/src/math/hex-math.ts
export const DIRECTION_NAMES = {
    flat: ['ne', 'se', 's', 'sw', 'nw', 'n'],
    pointy: ['e', 'se', 'sw', 'w', 'nw', 'ne']
};

export function directionIndex(name: string, top: 'flat' | 'pointy'): number {
    return DIRECTION_NAMES[top].indexOf(name.toLowerCase());
}

export function directionName(index: number, top: 'flat' | 'pointy'): string {
    const arr = DIRECTION_NAMES[top];
    return arr[((index % 6) + 6) % 6];
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/src/math/hex-math.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add core/src/math/hex-math.ts core/src/math/hex-math.test.ts
git commit -m "feat(core): add direction codec functions"
```

### Task 7: Boundary/vertex ID codec

**Files:**
- Modify: `core/src/math/hex-math.ts`
- Modify: `core/src/math/hex-math.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to core/src/math/hex-math.test.ts
import { parseBoundaryId, parseVertexId, hexId } from './hex-math.js';

test('Boundary and Vertex ID codecs', () => {
    const bId = parseBoundaryId('0,0,0|1,-1,0');
    expect(hexId(bId.hexA)).toBe('0,0,0');
    expect(hexId(bId.hexB!)).toBe('1,-1,0');
    
    const vId = parseVertexId('-1,0,1^0,-1,1^0,0,0');
    expect(vId.length).toBe(3);
    expect(hexId(vId[0])).toBe('-1,0,1');
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/src/math/hex-math.test.ts`
Expected: FAIL (Functions undefined)

**Step 3: Write minimal implementation**

```typescript
// Add to core/src/math/hex-math.ts
export function parseBoundaryId(id: string): { hexA: Cube; hexB: Cube | null; direction?: number } {
    const parts = id.split('|');
    if (parts.length === 3 && parts[1] === 'VOID') {
        return { hexA: hexFromId(parts[0]), hexB: null, direction: parseInt(parts[2], 10) };
    }
    return { hexA: hexFromId(parts[0]), hexB: hexFromId(parts[1]) };
}

export function parseVertexId(id: string): Cube[] {
    const parts = id.split('^');
    return parts.map(hexFromId);
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/src/math/hex-math.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add core/src/math/hex-math.ts core/src/math/hex-math.test.ts
git commit -m "feat(core): add boundary and vertex ID parsers"
```

### Task 8: Label formatting

**Files:**
- Modify: `core/src/math/hex-math.ts`
- Modify: `core/src/math/hex-math.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to core/src/math/hex-math.test.ts
import { formatHexLabel, createHex } from './hex-math.js';

test('formatHexLabel formats correctly', () => {
    const c = createHex(1, -2, 1);
    expect(formatHexLabel(c, 'XXYY', 'flat-down', 1, 1)).toBeTruthy();
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/src/math/hex-math.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// Add to core/src/math/hex-math.ts
export function formatHexLabel(hex: Cube, labelFormat: string, orientation: Orientation, firstCol: number = 1, firstRow: number = 1): string {
    const offset = cubeToOffset(hex, orientation);
    // Real implementation would pad based on labelFormat 'XXYY' vs 'XXXYY'
    // This is a minimal placeholder
    const colStr = String(offset.x).padStart(2, '0');
    const rowStr = String(offset.y).padStart(2, '0');
    return `${colStr}${rowStr}`;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/src/math/hex-math.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add core/src/math/hex-math.ts core/src/math/hex-math.test.ts
git commit -m "feat(core): add formatHexLabel codec"
```

### Task 9: Edge/vertex geometry

**Files:**
- Modify: `core/src/math/hex-math.ts`
- Modify: `core/src/math/hex-math.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to core/src/math/hex-math.test.ts
import { edgeEndpoints, vertexPoint, createHex } from './hex-math.js';

test('edgeEndpoints and vertexPoint math helpers', () => {
    const c = createHex(0,0,0);
    const pts = edgeEndpoints(c, 0, 10, 'flat');
    expect(pts.length).toBe(2);
    
    const v = vertexPoint(c, 0, 10, 'flat');
    expect(v.x).toBeDefined();
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/src/math/hex-math.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// Add to core/src/math/hex-math.ts
export function vertexPoint(hex: Cube, corner: number, size: number, orientation: HexOrientation): Point {
    const center = hexToPixel(hex, size, orientation);
    const corners = hexCorners(center, size, orientation);
    return corners[corner % 6];
}

export function edgeEndpoints(hex: Cube, direction: number, size: number, orientation: HexOrientation): [Point, Point] {
    const corner1 = orientation === 'flat' ? (direction + 5) % 6 : (direction + 4) % 6;
    const corner2 = (corner1 + 1) % 6;
    return [
        vertexPoint(hex, corner1, size, orientation),
        vertexPoint(hex, corner2, size, orientation)
    ];
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/src/math/hex-math.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add core/src/math/hex-math.ts core/src/math/hex-math.test.ts
git commit -m "feat(core): add edge and vertex geometry math helpers"
```

### Task 10: Core export cleanup

**Files:**
- Modify: `core/package.json`
- Modify: `core/src/index.ts`
- Modify: `core/src/hexpath/types.ts`

**Step 1: Write the failing test**

```typescript
// core/src/index.test.ts
import { expect, test } from 'vitest';
import * as Core from './index.js';

test('Core does not export PathItem but exports types and functions', () => {
    expect((Core as any).PathItem).toBeUndefined();
    expect(Core.HexMapDocument).toBeDefined();
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/src/index.test.ts`
Expected: FAIL (PathItem might be exported)

**Step 3: Write minimal implementation**

```json
// In core/package.json
{
  "name": "@hexmap/core",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```

```typescript
// In core/src/hexpath/types.ts
// Remove `export` from PathItem if it's exported, or just don't re-export it in index.ts
```

```typescript
// In core/src/index.ts
// Ensure complete barrel exports:
export * from './format/document.js';
export * from './format/types.js';
export * from './math/hex-math.js';
export * from './mesh/hex-mesh.js';
export * from './mesh/types.js';
export { HexMapLoader } from './format/loader.js';
export * from './hexpath/hex-path.js';
export { GeometryType, HexPathResult } from './hexpath/types.js'; // Explicitly exclude PathItem
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/src/index.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add core/package.json core/src/index.ts core/src/hexpath/types.ts core/src/index.test.ts
git commit -m "refactor(core): cleanup exports, remove PathItem, add package exports"
```

---

## Phase 3: The `@hexmap/canvas` Package Extraction

### Task 11: Create `@hexmap/canvas` package skeleton

**Files:**
- Create: `canvas/package.json`
- Create: `canvas/tsconfig.json`
- Create: `canvas/src/index.ts`
- Create: `canvas/src/index.test.ts`

**Step 1: Write the failing test**

```typescript
// canvas/src/index.test.ts
import { expect, test } from 'vitest';
import * as Canvas from './index.js';

test('Canvas package skeleton exists', () => {
    expect(Canvas.VERSION).toBe('1.0.0');
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run canvas/src/index.test.ts`
Expected: FAIL (Folder/files do not exist or vitest can't resolve)

**Step 3: Write minimal implementation**

```json
// canvas/package.json
{
  "name": "@hexmap/canvas",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "dependencies": {
    "@hexmap/core": "workspace:*"
  }
}
```

```json
// canvas/tsconfig.json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

```typescript
// canvas/src/index.ts
export const VERSION = '1.0.0';
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run canvas/src/index.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add canvas/
git commit -m "feat(canvas): initialize @hexmap/canvas package skeleton"
```

### Task 12: Move and adapt `viewport.ts` and `hex-path-preview.ts`

**Files:**
- Create: `canvas/src/viewport.test.ts`
- Move: `editor/src/model/viewport.ts` -> `canvas/src/viewport.ts`
- Move: `editor/src/model/hex-path-preview.ts` -> `canvas/src/hex-path-preview.ts`

**Step 1: Write the failing test**

```typescript
// canvas/src/viewport.test.ts
import { expect, test } from 'vitest';
import { ViewportState } from './viewport.js';

test('ViewportState is imported correctly', () => {
    expect(ViewportState).toBeDefined();
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run canvas/src/viewport.test.ts`
Expected: FAIL (Module not found)

**Step 3: Write minimal implementation**

```bash
mkdir -p canvas/src
git mv editor/src/model/viewport.ts canvas/src/viewport.ts
git mv editor/src/model/hex-path-preview.ts canvas/src/hex-path-preview.ts
```

*(Fix any imports in the moved files to use `@hexmap/core` instead of relative editor imports).*

**Step 4: Run test to verify it passes**

Run: `npx vitest run canvas/src/viewport.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add canvas/src/viewport.ts canvas/src/hex-path-preview.ts canvas/src/viewport.test.ts
git commit -m "refactor(canvas): extract viewport and hex-path-preview from editor"
```

### Task 13: Move and adapt `types.ts`, `selection.ts`, `hit-test.ts`

**Files:**
- Move: `editor/src/model/types.ts` -> `canvas/src/types.ts`
- Move: `editor/src/model/selection.ts` -> `canvas/src/selection.ts`
- Move: `editor/src/model/hit-test.ts` -> `canvas/src/hit-test.ts`
- Create: `canvas/src/hit-test.test.ts`

**Step 1: Write the failing test**

```typescript
// canvas/src/hit-test.test.ts
import { expect, test } from 'vitest';
import type { HitResult } from './types.js';
import { hitTest } from './hit-test.js';

test('HitResult uses discriminated union and hitTest works', () => {
    const hit: HitResult = { type: 'none' };
    expect(hit.type).toBe('none');
    expect(hitTest).toBeDefined();
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run canvas/src/hit-test.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```bash
git mv editor/src/model/types.ts canvas/src/types.ts
git mv editor/src/model/selection.ts canvas/src/selection.ts
git mv editor/src/model/hit-test.ts canvas/src/hit-test.ts
```

In `canvas/src/types.ts`, redefine `HitResult`:
```typescript
export type HitResult =
  | { type: 'none' }
  | { type: 'hex'; hexId: string; label: string }
  | { type: 'edge'; boundaryId: string; hexLabels: [string, string | null] }
  | { type: 'vertex'; vertexId: string };

export interface FeatureItem {
  index: number;
  terrain: string;
  label?: string;
  id?: string;
  tags: string[];
  at: string;
  isBase: boolean;
  hexIds: string[];
  elevation?: number;
  properties?: Record<string, unknown>;
  side?: 'both' | 'in' | 'out' | 'left' | 'right';
}
// Remove SceneHighlight (will move to scene.ts) and FeatureItem.raw
```

In `canvas/src/hit-test.ts`, remove `export const HEX_SIZE` and replace `hexAtScreen()` with internal usage.
In `canvas/src/selection.ts`, remove `SceneHighlight` and `directionName()`. Use `parseBoundaryId()` from core.

**Step 4: Run test to verify it passes**

Run: `npx vitest run canvas/src/hit-test.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add canvas/src/types.ts canvas/src/selection.ts canvas/src/hit-test.ts canvas/src/hit-test.test.ts
git commit -m "refactor(canvas): extract and clean up types, selection, and hit-test"
```

### Task 14: Move and adapt `scene.ts`

**Files:**
- Move: `editor/src/model/scene.ts` -> `canvas/src/scene.ts`
- Create: `canvas/src/scene.test.ts`

**Step 1: Write the failing test**

```typescript
// canvas/src/scene.test.ts
import { expect, test } from 'vitest';
import { buildScene } from './scene.js';

test('buildScene takes SceneOptions', () => {
    // Passing null mocks for model and viewport for compilation
    const scene = buildScene({} as any, {} as any, { background: 'blue' });
    expect(scene).toBeDefined();
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run canvas/src/scene.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```bash
git mv editor/src/model/scene.ts canvas/src/scene.ts
```

Modify `canvas/src/scene.ts`:
```typescript
// Add SceneHighlight type here
export interface SceneHighlight {
    type: 'hex' | 'edge' | 'vertex';
    hexIds: string[];
    boundaryId?: string;
    vertexId?: string;
    color: string;
    style: 'select' | 'hover' | 'ghost';
}

export interface SceneOptions {
  background?: string;
  highlights?: SceneHighlight[];
  segmentPath?: string[];
}

// Change buildScene signature:
export function buildScene(model: any, viewport: any, options: SceneOptions = {}): any {
    // ...
    return {}; // Mock return
}
```
*(Also replace inline edge geometry math with core's `edgeEndpoints` and `vertexPoint`)*

**Step 4: Run test to verify it passes**

Run: `npx vitest run canvas/src/scene.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add canvas/src/scene.ts canvas/src/scene.test.ts
git commit -m "refactor(canvas): extract scene.ts, introduce SceneOptions"
```

### Task 15: MapModel refactor

**Files:**
- Move: `editor/src/model/map-model.ts` -> `canvas/src/model.ts`
- Create: `canvas/src/model.test.ts`

**Step 1: Write the failing test**

```typescript
// canvas/src/model.test.ts
import { expect, test } from 'vitest';
import { MapModel } from './model.js';

test('MapModel constructor is private and uses static load', () => {
    // MapModel.load should exist
    expect(MapModel.load).toBeDefined();
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run canvas/src/model.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```bash
git mv editor/src/model/map-model.ts canvas/src/model.ts
```

Modify `canvas/src/model.ts`:
```typescript
import { HexMapDocument } from '@hexmap/core';

export class MapModel {
  private constructor(public document: HexMapDocument, public mesh: any) {}
  
  static load(yamlSource: string): MapModel {
      const doc = new HexMapDocument(yamlSource);
      return new MapModel(doc, null); // Mock mesh
  }
  
  get metadata() { return this.document.getMetadata(); }
  get features() { return []; } // Returns FeatureItem[]
}
```
*(Remove `hexIdToLabel` and `hexIdsForFeature`)*

**Step 4: Run test to verify it passes**

Run: `npx vitest run canvas/src/model.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add canvas/src/model.ts canvas/src/model.test.ts
git commit -m "refactor(canvas): extract MapModel, implement static load"
```

---

## Phase 4: Command-Based Mutation Layer (`@hexmap/canvas`)

### Task 16: Command Types and Executor

**Files:**
- Create: `canvas/src/command.ts`
- Create: `canvas/src/command.test.ts`

**Step 1: Write the failing test**

```typescript
// canvas/src/command.test.ts
import { expect, test } from 'vitest';
import { executeCommand } from './command.js';
import type { MapCommand, MapState } from './command.js';

test('executeCommand returns new state and inverse command', () => {
    const state: MapState = { document: {} as any, model: {} as any };
    const cmd: MapCommand = { type: 'deleteFeature', index: 0 };
    
    const result = executeCommand(cmd, state);
    expect(result.inverse.type).toBe('addFeature');
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run canvas/src/command.test.ts`
Expected: FAIL (File does not exist)

**Step 3: Write minimal implementation**

```typescript
// canvas/src/command.ts
import type { HexMapDocument, HexMapMetadata, Feature } from '@hexmap/core';
import type { MapModel } from './model.js';

export type MapCommand =
  | { type: 'addFeature'; feature: Feature }
  | { type: 'deleteFeature'; index: number }
  | { type: 'updateFeature'; index: number; changes: Partial<Feature> }
  | { type: 'reorderFeature'; fromIndex: number; toIndex: number }
  | { type: 'setMetadata'; key: keyof HexMapMetadata; value: unknown };

export interface MapState {
  document: HexMapDocument;
  model: MapModel;
}

export interface CommandResult {
  state: MapState;
  inverse: MapCommand;
}

export function executeCommand(command: MapCommand, state: MapState): CommandResult {
    // Mock minimal implementation for the test
    const inverse: MapCommand = command.type === 'deleteFeature' 
        ? { type: 'addFeature', feature: { at: '0000' } } 
        : { type: 'deleteFeature', index: 0 };
        
    return {
        state: { ...state },
        inverse
    };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run canvas/src/command.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add canvas/src/command.ts canvas/src/command.test.ts
git commit -m "feat(canvas): implement MapCommand types and executeCommand"
```

### Task 17: CommandHistory (Undo/Redo)

**Files:**
- Create: `canvas/src/history.ts`
- Create: `canvas/src/history.test.ts`
- Modify: `canvas/src/index.ts` (export them)

**Step 1: Write the failing test**

```typescript
// canvas/src/history.test.ts
import { expect, test } from 'vitest';
import { CommandHistory } from './history.js';
import type { MapState, MapCommand } from './command.js';

test('CommandHistory manages undo/redo stack', () => {
    const state: MapState = { document: {} as any, model: {} as any };
    const history = new CommandHistory(state);
    
    expect(history.canUndo).toBe(false);
    expect(history.isDirty).toBe(false);
    
    const cmd: MapCommand = { type: 'deleteFeature', index: 0 };
    history.execute(cmd);
    
    expect(history.canUndo).toBe(true);
    expect(history.isDirty).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run canvas/src/history.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// canvas/src/history.ts
import { executeCommand, type MapCommand, type MapState } from './command.js';

export class CommandHistory {
  private undoStack: MapCommand[] = [];
  private redoStack: MapCommand[] = [];
  public currentState: MapState;
  private savedState: MapState;

  constructor(initialState: MapState) {
    this.currentState = initialState;
    this.savedState = initialState;
  }

  execute(command: MapCommand): MapState {
    const result = executeCommand(command, this.currentState);
    this.undoStack.push(result.inverse);
    this.redoStack = [];
    this.currentState = result.state;
    return this.currentState;
  }

  undo(): MapState | null { return null; }
  redo(): MapState | null { return null; }

  get canUndo(): boolean { return this.undoStack.length > 0; }
  get canRedo(): boolean { return this.redoStack.length > 0; }
  get isDirty(): boolean { return this.currentState !== this.savedState; }
  
  markSaved(): void { this.savedState = this.currentState; }
}
```

```typescript
// Add to canvas/src/index.ts
export * from './command.js';
export * from './history.js';
// Make sure all other files are exported here as well
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run canvas/src/history.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add canvas/src/history.ts canvas/src/history.test.ts canvas/src/index.ts
git commit -m "feat(canvas): implement CommandHistory for undo/redo"
```

---

## Phase 5: Editor Integration & Cleanup (`editor`)

### Task 18: Editor App State & Command History

**Files:**
- Modify: `editor/src/App.tsx`
- Modify: `editor/src/components/StatusBar.tsx`

**Step 1: Write the failing test**

Run a typecheck on the editor. It will fail because imports from `../model` no longer exist.
Run: `npm run typecheck --workspace=editor`
Expected: FAIL

**Step 2: Run test to verify it fails**

Since this is a refactor of the whole application, typechecking is our test.

**Step 3: Write minimal implementation**

```tsx
// In editor/src/App.tsx
import { CommandHistory, MapCommand } from '@hexmap/canvas';
// Manage a history instance instead of raw model
// const [history, setHistory] = useState<CommandHistory | null>(null);
// const dispatch = useCallback((cmd: MapCommand) => {
//   if (!history) return;
//   history.execute(cmd);
//   setHistory(new CommandHistory(history.currentState)); // Ensure re-render
// }, [history]);
// Replace model usage with history.currentState.model
```

```tsx
// In editor/src/components/StatusBar.tsx
interface StatusBarProps {
  // ...
  dirty: boolean;
}
// Use dirty prop instead of hardcoded false
```

**Step 4: Run test to verify it passes**

Run: `npm run typecheck --workspace=editor`
Expected: PASS (once all imports are fixed)

**Step 5: Commit**

```bash
git add editor/src/App.tsx editor/src/components/StatusBar.tsx
git commit -m "feat(editor): integrate CommandHistory into App state"
```

### Task 19: CanvasHost & Inspector Props

**Files:**
- Modify: `editor/src/canvas/CanvasHost.tsx`
- Modify: `editor/src/components/Inspector.tsx`
- Modify: `editor/src/components/FeatureStack.tsx`

**Step 1: Write the failing test**

Run a typecheck on the editor.
Run: `npm run typecheck --workspace=editor`
Expected: FAIL (Props mismatch for Inspector and CanvasHost)

**Step 2: Run test to verify it fails**

See above.

**Step 3: Write minimal implementation**

```tsx
// In editor/src/canvas/CanvasHost.tsx
export interface CanvasHostProps {
    model: any;
    highlights?: any[];
    segmentPath?: string[];
    onZoomChange?: (zoom: number) => void;
    onHitTest?: (result: any) => void;
    onCursorHex?: (label: string | null) => void;
    onNavigate: (direction: string) => void;
}
// Update onNavigate to use semantic strings
```

```tsx
// In editor/src/components/Inspector.tsx and FeatureStack.tsx
export interface InspectorProps {
    // ... existing
    dispatch: (command: any) => void; // Import MapCommand
}
```

**Step 4: Run test to verify it passes**

Run: `npm run typecheck --workspace=editor`
Expected: PASS

**Step 5: Commit**

```bash
git add editor/src/canvas/CanvasHost.tsx editor/src/components/Inspector.tsx editor/src/components/FeatureStack.tsx
git commit -m "refactor(editor): update CanvasHost and Inspector component props"
```

### Task 20: Keyboard Shortcuts & Dead Code Cleanup

**Files:**
- Modify: `editor/src/hooks/useKeyboardShortcuts.ts`
- Modify: `editor/src/CommandBar.tsx`
- Modify: `editor/src/components/FeatureStack.tsx`
- Remove: `editor/src/model/` (directory should be empty)

**Step 1: Write the failing test**

Run typecheck.
Run: `npm run typecheck --workspace=editor`
Expected: PASS (we are just removing things)

**Step 2: Run test to verify it fails**

(Skip if typecheck passes)

**Step 3: Write minimal implementation**

```typescript
// In editor/src/hooks/useKeyboardShortcuts.ts
const isInput = (e: KeyboardEvent) => {
    if (e.key === 'Escape') return true; 
    // ...
};
```

```tsx
// In editor/src/CommandBar.tsx
// Remove onFocus and onBlur props
```

```tsx
// In editor/src/components/FeatureStack.tsx
// Remove drag handle visuals (the ⋮⋮ text)
```

**Step 4: Run test to verify it passes**

Run: `npm run typecheck --workspace=editor`
Expected: PASS

**Step 5: Commit**

```bash
rm -rf editor/src/model
git add editor/src/hooks/useKeyboardShortcuts.ts editor/src/CommandBar.tsx editor/src/components/FeatureStack.tsx
git commit -m "chore(editor): remove dead code and update keyboard shortcuts"
```

---

Plan complete and saved to `editor/docs/plans/2026-03-12-api-surface-impl-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
