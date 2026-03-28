# HexPath Serialize & Round-Trip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `HexPath.serialize()` and `HexPath.idToAtom()` to the core library, establish a parse-modify-serialize pattern, and eliminate all ad-hoc HexPath string surgery from the editor.

**Architecture:** The `HexPath` class already has `resolve(string) → HexPathResult` (with `items`, `segments`, `type`). We add the inverse: `serialize(segments, type) → string` and a helper `idToAtom(id, type) → string` that converts internal IDs to HexPath atoms. Then refactor all editor code that builds HexPath strings (paint handler, display formatting, selection converters) to use parse→modify→serialize. The preview and canvas rendering are updated to use `segments: string[][]` instead of a flat `segmentPath: string[]`.

**Tech Stack:** TypeScript, Vitest, `@hexmap/core` (HexPath, Hex math), `@hexmap/canvas` (model, scene, selection, preview)

**Design note — segment ID type:** Segments use `string` IDs (not typed `Cube`) because IDs can represent hexes (`"q,r,s"`), edges (`"q1,r1,s1|q2,r2,s2"`), or vertices (`"q1,r1,s1^q2,r2,s2^q3,r3,s3"`) — a union that doesn't map cleanly to `Cube`. A typed ID refactor could follow as a separate effort.

**Deferred items** (not in scope for this plan):
- @all inspector: show "all" as non-editable ID + expanded HexPath in `at` field
- Terrain dropdown: match paint palette rendering (filled hex swatch + label)
- Edge shift-click intermediate computation: currently appends atom without pathfinding between non-adjacent edges
- Build pipeline tooling (jscpd, knip, biome)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `core/src/hexpath/hex-path.ts` | Modify | Add `serialize()` static method and `idToAtom()` instance method |
| `core/src/hexpath/types.ts` | No change | `HexPathResult` already has `segments: string[][]` |
| `core/src/hexpath/hex-path.test.ts` | Modify | Add serialize + round-trip tests |
| `canvas/src/hex-path-preview.ts` | Modify | Return `segments: string[][]` instead of flat `segmentPath` |
| `canvas/src/scene.ts` | Modify | Accept and render `segments: string[][]` as separate polylines |
| `canvas/src/selection.ts` | Modify | Replace `boundaryIdToHexPath` / `vertexIdToHexPath` with `HexPath.idToAtom()` |
| `editor/src/canvas/CanvasHost.tsx` | Modify | Change `segmentPath` prop to `segments` |
| `editor/src/App.tsx` | Modify | Refactor paint handler to parse→modify→serialize; remove `formatHexPathDisplay` |

---

### Task 1: Add `idToAtom()` instance method to HexPath

Converts an internal geometry ID (cube-coord string for hexes, boundary ID for edges, vertex ID for vertices) back to a user-facing HexPath atom string.

**Files:**
- Modify: `core/src/hexpath/hex-path.ts`
- Test: `core/src/hexpath/hex-path.test.ts`

- [ ] **Step 1: Write failing tests for `idToAtom`**

Add to `core/src/hexpath/hex-path.test.ts` after the `segments property` describe block:

```typescript
describe('idToAtom', () => {
  // hexPath is the shared instance with flat-down, XXYY, first=[1,1]

  it('converts hex cube ID to label', () => {
    const cube = Hex.offsetToCube(1, 1, 'flat-down'); // col=1,row=1 → "0101"
    const id = Hex.hexId(cube);
    expect(hexPath.idToAtom(id, 'hex')).toBe('0101');
  });

  it('converts boundary ID to edge atom', () => {
    const cube = Hex.offsetToCube(1, 1, 'flat-down');
    const neighbor = Hex.hexNeighbor(cube, 1); // SE in flat
    const boundaryId = Hex.getCanonicalBoundaryId(cube, neighbor, 1);
    const atom = hexPath.idToAtom(boundaryId, 'edge');
    // Should be "0101/SE" or equivalent with canonical hex
    expect(atom).toMatch(/^\d{4}\/[A-Z]+$/);
  });

  it('converts vertex ID to vertex atom', () => {
    const cube = Hex.offsetToCube(1, 1, 'flat-down');
    const vertexId = Hex.getCanonicalVertexId(cube, 0, 'flat');
    const atom = hexPath.idToAtom(vertexId, 'vertex');
    expect(atom).toMatch(/^\d{4}\.\d$/);
  });

  it('round-trips hex through resolve and idToAtom', () => {
    const result = hexPath.resolve('0101');
    expect(result.items).toHaveLength(1);
    const atom = hexPath.idToAtom(result.items[0], 'hex');
    expect(atom).toBe('0101');
  });

  it('round-trips edge through resolve and idToAtom', () => {
    const result = hexPath.resolve('0101/SE');
    expect(result.items).toHaveLength(1);
    const atom = hexPath.idToAtom(result.items[0], 'edge');
    expect(atom).toBe('0101/SE');
  });

  it('round-trips vertex through resolve and idToAtom', () => {
    const result = hexPath.resolve('0101.0');
    expect(result.items).toHaveLength(1);
    const atom = hexPath.idToAtom(result.items[0], 'vertex');
    expect(atom).toBe('0101.0');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run core/src/hexpath/hex-path.test.ts`
Expected: FAIL — `hexPath.idToAtom is not a function`

- [ ] **Step 3: Implement `idToAtom`**

Add to `core/src/hexpath/hex-path.ts`, as a public instance method on the `HexPath` class (after `resolve()`):

```typescript
/**
 * Convert an internal geometry ID back to a HexPath atom string.
 *
 * - hex: cube ID "q,r,s" → user label e.g. "0101"
 * - edge: boundary ID "q1,r1,s1|q2,r2,s2" → "label/DIR"
 * - vertex: vertex ID "q1,r1,s1^q2,r2,s2^q3,r3,s3" → "label.corner"
 */
idToAtom(id: string, type: GeometryType): string {
  const { labelFormat, orientation, firstCol, firstRow } = this.options;
  const top = Hex.orientationTop(orientation);

  if (type === 'hex') {
    const cube = Hex.hexFromId(id);
    return Hex.formatHexLabel(cube, labelFormat, orientation, firstCol, firstRow);
  }

  if (type === 'edge') {
    const parsed = Hex.parseBoundaryId(id);
    const label = Hex.formatHexLabel(parsed.hexA, labelFormat, orientation, firstCol, firstRow);
    if (parsed.hexB === null && parsed.direction !== undefined) {
      return `${label}/${Hex.directionName(parsed.direction, top).toUpperCase()}`;
    }
    if (parsed.hexB) {
      for (let d = 0; d < 6; d++) {
        if (Hex.hexId(Hex.hexNeighbor(parsed.hexA, d)) === Hex.hexId(parsed.hexB)) {
          return `${label}/${Hex.directionName(d, top).toUpperCase()}`;
        }
      }
    }
    return label;
  }

  if (type === 'vertex') {
    const parts = Hex.parseVertexId(id);
    const label = Hex.formatHexLabel(parts[0], labelFormat, orientation, firstCol, firstRow);
    const isPointy = top === 'pointy';
    for (let i = 0; i < 6; i++) {
      const n1 = Hex.hexId(Hex.hexNeighbor(parts[0], i));
      const n2 = Hex.hexId(Hex.hexNeighbor(parts[0], (i + 1) % 6));
      const ids = parts.map(Hex.hexId);
      if (ids.includes(n1) && ids.includes(n2)) {
        return `${label}.${(i - (isPointy ? 1 : 0) + 6) % 6}`;
      }
    }
    return label;
  }

  return id; // fallback
}
```

Also add the import for `GeometryType` at the top of the file if not already imported (it should already be imported from `./types.js`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run core/src/hexpath/hex-path.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add core/src/hexpath/hex-path.ts core/src/hexpath/hex-path.test.ts
git commit -m "feat(core): add HexPath.idToAtom() for ID-to-atom conversion"
```

---

### Task 2: Add `serialize()` static method to HexPath

Converts structured segments back to a canonical HexPath string.

**Files:**
- Modify: `core/src/hexpath/hex-path.ts`
- Test: `core/src/hexpath/hex-path.test.ts`

- [ ] **Step 1: Write failing tests for `serialize`**

Add to `core/src/hexpath/hex-path.test.ts`:

```typescript
describe('serialize', () => {
  it('serializes a single hex atom', () => {
    const result = hexPath.resolve('0101');
    const output = hexPath.serialize(result.segments!, result.type);
    expect(output).toBe('0101');
  });

  it('serializes disconnected hex atoms with comma separator', () => {
    // Two separate singleton segments
    const result = hexPath.resolve('0101, 0301');
    const output = hexPath.serialize(result.segments!, result.type);
    expect(output).toBe('0101, 0301');
  });

  it('serializes a connected hex path with dash connector', () => {
    const result = hexPath.resolve('0101 - 0103');
    const output = hexPath.serialize(result.segments!, result.type);
    // Connected segment: atoms joined with " - "
    const re = hexPath.resolve(output);
    expect(re.items.sort()).toEqual(result.items.sort());
    expect(re.segments).toEqual(result.segments);
  });

  it('serializes mixed segments (connected + disconnected)', () => {
    const result = hexPath.resolve('0101 - 0103, 0501');
    const output = hexPath.serialize(result.segments!, result.type);
    const re = hexPath.resolve(output);
    expect(re.items.sort()).toEqual(result.items.sort());
    expect(re.segments!.length).toBe(result.segments!.length);
  });

  it('serializes edge atoms', () => {
    const result = hexPath.resolve('0101/SE');
    const output = hexPath.serialize(result.segments!, result.type);
    expect(output).toBe('0101/SE');
  });

  it('serializes multiple edge atoms', () => {
    const result = hexPath.resolve('0101/SE, 0201/NE');
    const output = hexPath.serialize(result.segments!, result.type);
    const re = hexPath.resolve(output);
    expect(re.items.sort()).toEqual(result.items.sort());
  });

  it('serializes vertex atoms', () => {
    const result = hexPath.resolve('0101.0');
    const output = hexPath.serialize(result.segments!, result.type);
    expect(output).toBe('0101.0');
  });

  it('returns empty string for empty segments', () => {
    expect(hexPath.serialize([], 'hex')).toBe('');
  });
});

describe('serialize/resolve round-trip', () => {
  const cases = [
    '0101',
    '0101, 0201, 0301',
    '0101 - 0201 - 0301',
    '0101 - 0301, 0501',
    '0101/SE, 0201/NE',
    '0101.0, 0201.3',
  ];

  for (const input of cases) {
    it(\`round-trips: \${input}\`, () => {
      const result = hexPath.resolve(input);
      const output = hexPath.serialize(result.segments!, result.type);
      const result2 = hexPath.resolve(output);
      expect(result2.items.sort()).toEqual(result.items.sort());
      expect(result2.segments!.length).toEqual(result.segments!.length);
    });
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run core/src/hexpath/hex-path.test.ts`
Expected: FAIL — `hexPath.serialize is not a function`

- [ ] **Step 3: Implement `serialize`**

Add to `core/src/hexpath/hex-path.ts` as a public instance method after `idToAtom`:

```typescript
/**
 * Serialize structured segments back to a canonical HexPath string.
 *
 * Within a segment, consecutive IDs are joined with ` - ` (connected path).
 * Segments are separated with `, ` (disconnected).
 * Singleton segments are rendered as bare atoms.
 *
 * Design pattern: all HexPath mutations MUST go through
 *   resolve(string) → modify segments → serialize(segments)
 * Never build HexPath strings via concatenation.
 */
serialize(segments: string[][], type: GeometryType): string {
  if (segments.length === 0) return '';

  const serializedSegments = segments.map((segment) => {
    return segment.map((id) => this.idToAtom(id, type)).join(' - ');
  });

  return serializedSegments.join(', ');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run core/src/hexpath/hex-path.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add core/src/hexpath/hex-path.ts core/src/hexpath/hex-path.test.ts
git commit -m "feat(core): add HexPath.serialize() for segments-to-string conversion"
```

---

### Task 3: Migrate `boundaryIdToHexPath` and `vertexIdToHexPath` to use `idToAtom`

**Files:**
- Modify: `canvas/src/selection.ts`
- Test: `canvas/src/selection.test.ts` (existing tests should still pass)

- [ ] **Step 1: Run existing selection tests to establish baseline**

Run: `npx vitest run canvas/src/selection.test.ts`
Expected: PASS

- [ ] **Step 2: Refactor `boundaryIdToHexPath` and `vertexIdToHexPath`**

In `canvas/src/selection.ts`, replace the implementations with thin wrappers around `HexPath.idToAtom()`:

```typescript
import { Hex, HexPath } from '@hexmap/core';
// ... existing imports ...

export function boundaryIdToHexPath(boundaryId: string, model: MapModel): string {
  const hp = new HexPath(model.mesh, {
    labelFormat: model.grid.labelFormat,
    orientation: model.grid.orientation,
    firstCol: model.grid.firstCol,
    firstRow: model.grid.firstRow,
  });
  return hp.idToAtom(boundaryId, 'edge');
}

export function vertexIdToHexPath(vertexId: string, model: MapModel): string {
  const hp = new HexPath(model.mesh, {
    labelFormat: model.grid.labelFormat,
    orientation: model.grid.orientation,
    firstCol: model.grid.firstCol,
    firstRow: model.grid.firstRow,
  });
  return hp.idToAtom(vertexId, 'vertex');
}
```

Note: Creating a HexPath instance per call is fine for click handlers (not hot path). If perf matters later, the model can cache one.

- [ ] **Step 3: Run all tests to verify nothing broke**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add canvas/src/selection.ts
git commit -m "refactor(canvas): migrate ID-to-HexPath functions to use HexPath.idToAtom()"
```

---

### Task 4: Update `HexPathPreview` to return `segments: string[][]`

**Files:**
- Modify: `canvas/src/hex-path-preview.ts`
- Test: existing tests via `npx vitest run`

- [ ] **Step 1: Change `HexPathPreview` interface and `parseHexPathInput`**

In `canvas/src/hex-path-preview.ts`:

```typescript
export interface HexPathPreview {
  hexIds: string[];
  segments?: string[][]; // connected segments for polyline rendering
  type: GeometryType;
  error?: {
    message: string;
    offset: number;
  };
}

export function parseHexPathInput(input: string, model: MapModel): HexPathPreview {
  if (!input.trim()) {
    return { hexIds: [], segments: [], type: 'hex' };
  }

  const hexPath = new HexPath(model.mesh, {
    labelFormat: model.grid.labelFormat,
    orientation: model.grid.orientation,
    firstCol: model.grid.firstCol,
    firstRow: model.grid.firstRow,
  });

  if (/[./]$/.test(input.trim())) {
    return {
      hexIds: [],
      segments: [],
      type: 'hex',
      error: {
        message: `Incomplete expression: '${input.trim()}'`,
        offset: input.trim().length - 1,
      },
    };
  }

  try {
    const result = hexPath.resolve(input);
    return {
      hexIds: result.type === 'hex' ? result.items : [],
      segments: result.segments ?? [],
      type: result.type,
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Invalid expression';
    return {
      hexIds: [],
      segments: [],
      type: 'hex',
      error: { message, offset: 0 },
    };
  }
}
```

- [ ] **Step 2: Run tests to check nothing broke**

Run: `npx vitest run`
Expected: May fail in CanvasHost (uses old `segmentPath` prop) — that's expected, fixed in Task 5.

- [ ] **Step 3: Commit**

```bash
git add canvas/src/hex-path-preview.ts
git commit -m "refactor(canvas): change HexPathPreview to use segments instead of flat segmentPath"
```

---

### Task 5: Update CanvasHost and buildScene for multi-segment rendering

**Files:**
- Modify: `editor/src/canvas/CanvasHost.tsx`
- Modify: `canvas/src/scene.ts`

- [ ] **Step 1: Update `CanvasHostProps` and wiring**

In `editor/src/canvas/CanvasHost.tsx`, change the prop from `segmentPath` to `segments`:

```typescript
// In CanvasHostProps:
segments?: string[][];   // was: segmentPath?: string[];
```

Update the destructuring in the component (around line 48):
```typescript
segments,   // was: segmentPath,
```

Update the `buildScene` call (around line 142):
```typescript
const scene = buildScene(model, vp, {
  background: theme.background,
  highlights: sceneHighlights,
  segments,   // was: segmentPath,
});
```

Update the `useEffect` dependency (around line 197):
```typescript
}, [model, highlights, segments, paintTerrainKey, paintTerrainColor]);
// was: segmentPath
```

- [ ] **Step 2: Update `SceneOptions` and `buildScene` in scene.ts**

In `canvas/src/scene.ts`, change `SceneOptions`:

```typescript
export interface SceneOptions {
  background?: string;
  highlights?: SceneHighlight[];
  segments?: string[][];   // was: segmentPath?: string[];
}
```

Replace the existing `segmentPath` rendering block (around lines 224-232) with:

```typescript
// Segment path lines (preview / feature selection)
const pathLines: PathLineRenderItem[] = [];
const previewSegments = segments ?? [];
for (const segment of previewSegments) {
  if (segment.length < 2) continue; // skip singletons
  const points = segment.map((hexId) => {
    const cube = Hex.hexFromId(hexId);
    const world = Hex.hexToPixel(cube, HEX_SIZE, orientation);
    return worldToScreen(world, viewport);
  });
  pathLines.push({ points, color: ACCENT_HEX });
}
```

Also update the destructuring of `options` at the top of `buildScene` to use `segments` instead of `segmentPath`.

- [ ] **Step 3: Update App.tsx to pass `segments` prop**

In `editor/src/App.tsx`, change the CanvasHost prop (around line 532):

```typescript
segments={preview?.segments ?? []}
// was: segmentPath={preview?.segmentPath ?? []}
```

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add editor/src/canvas/CanvasHost.tsx canvas/src/scene.ts editor/src/App.tsx
git commit -m "refactor: update preview rendering to use multi-segment polylines"
```

---

### Task 6: Refactor paint handler to use parse→modify→serialize

This is the key refactor: replace ad-hoc string concatenation with the proper pattern.

**Files:**
- Modify: `editor/src/App.tsx`

- [ ] **Step 1: Add a `getHexPathInstance` helper**

Near the top of the `App` component (after model is available), add:

```typescript
const getHexPath = useCallback(() => {
  if (!model) return null;
  return new HexPath(model.mesh, {
    labelFormat: model.grid.labelFormat,
    orientation: model.grid.orientation,
    firstCol: model.grid.firstCol,
    firstRow: model.grid.firstRow,
  });
}, [model]);
```

Add the import for `HexPath` from `@hexmap/core` at the top of the file.

- [ ] **Step 2: Refactor `handlePaintClick`**

Replace the existing `handlePaintClick` (around lines 270-307) with:

```typescript
const handlePaintClick = (hit: HitResult, shiftKey: boolean) => {
  if (!paintState || !model || hit.type === 'none') return;
  if (hit.type !== paintState.geometry) return;

  const hp = getHexPath();
  if (!hp) return;

  // Convert hit to atom string
  let atomId = '';
  if (hit.type === 'hex') {
    if (!model.mesh.getHex(hit.hexId)) return;
    atomId = hp.idToAtom(hit.hexId, 'hex');
  } else if (hit.type === 'edge') {
    atomId = hp.idToAtom(hit.boundaryId, 'edge');
  } else if (hit.type === 'vertex') {
    atomId = hp.idToAtom(hit.vertexId, 'vertex');
  }
  if (!atomId) return;

  const targetIndex = paintState.targetFeatureIndex;

  if (targetIndex !== null) {
    const feature = model.features[targetIndex];
    // Parse existing expression into segments
    const existing = feature.at ? hp.resolve(feature.at) : { segments: [], type: hit.type };
    const segments = [...(existing.segments ?? [])];

    if (shiftKey && segments.length > 0) {
      // Extend last segment (connected path)
      const lastSegment = segments[segments.length - 1];
      const newAtomResult = hp.resolve(atomId);
      const newId = newAtomResult.items[0];
      lastSegment.push(newId);
    } else {
      // New disconnected atom (singleton segment)
      const newAtomResult = hp.resolve(atomId);
      segments.push(newAtomResult.items.map((id) => id));
    }

    const newAt = hp.serialize(segments, hit.type);
    dispatch({ type: 'updateFeature', index: targetIndex, changes: { at: newAt } });
    setCommandValue(newAt);
  } else {
    // New paint session — create new feature
    dispatch({ type: 'addFeature', feature: { at: atomId, terrain: paintState.terrainKey } });
    setPaintState({ ...paintState, targetFeatureIndex: model.features.length });
    setCommandValue(atomId);
  }
};
```

**Key changes:**
- No string concatenation — uses `hp.resolve()` to parse existing `at`, modifies `segments`, then `hp.serialize()` to produce canonical output.
- Shift-click extends the last segment (connected path) instead of inserting `-` subtraction operator.
- No shift = new singleton segment (comma-separated).
- `setCommandValue(newAt)` uses the serialized output directly — no `formatHexPathDisplay`.

- [ ] **Step 3: Remove `formatHexPathDisplay`**

Delete the function definition (around line 42-43):
```typescript
// DELETE this:
const formatHexPathDisplay = (at: string): string =>
  at.replace(/\s+(?=[A-Za-z0-9@])/g, ', ').replace(/,\s*-/g, ' -');
```

Replace all remaining calls to `formatHexPathDisplay(x)` with just `x`. There should be one remaining call at line 471:
```typescript
// Change from:
if (feature) setCommandValue(formatHexPathDisplay(feature.at));
// To:
if (feature) setCommandValue(feature.at);
```

The `at` field already stores canonical HexPath (after this refactor, all mutations produce canonical output via serialize). No display transformation needed.

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add editor/src/App.tsx
git commit -m "refactor(editor): replace HexPath string surgery with parse-modify-serialize pattern"
```

---

### Task 7: Fix feature label priority

**Files:**
- Modify: `editor/src/components/FeatureStack.tsx`
- Test: `editor/src/components/FeatureStack.test.tsx` (if exists, else manual verification)

- [ ] **Step 1: Write test for label priority**

If `FeatureStack.test.tsx` exists, add a test. Otherwise, verify manually that a feature with `id: "river"` and `terrain: "water"` shows "river" not "water" in the stack.

- [ ] **Step 2: Change label priority**

In `editor/src/components/FeatureStack.tsx` (around line 53), change:

```typescript
// From:
const label =
  feature.label ||
  feature.terrain ||
  feature.id ||
  `Feature ${feature.index}`;

// To:
const label =
  feature.label ||
  feature.id ||
  feature.terrain ||
  `Feature ${feature.index}`;
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add editor/src/components/FeatureStack.tsx
git commit -m "fix(editor): prioritize feature id over terrain name in feature stack label"
```

---

### Task 8: Handle @all segments (empty segments → show all hexes with no path lines)

The `resolve('@all')` currently returns `segments: []` (empty array). This is correct — `@all` is a keyword expansion, not a path. With the new segment-based rendering, this means no dotted lines are drawn for `@all` features, which is the desired behavior.

**Files:**
- Test: `core/src/hexpath/hex-path.test.ts`

- [ ] **Step 1: Add a test confirming @all produces empty segments**

```typescript
it('@all produces empty segments (no path lines)', () => {
  const result = hexPath.resolve('@all');
  expect(result.segments).toEqual([]);
  expect(result.items.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run core/src/hexpath/hex-path.test.ts`
Expected: PASS (already works)

- [ ] **Step 3: Commit**

```bash
git add core/src/hexpath/hex-path.test.ts
git commit -m "test(core): confirm @all produces empty segments for correct rendering"
```

---

### Task 9: Add segment-aware tests for fill operations

Verify that `fill` operations produce a closed boundary loop segment + interior singletons (not a path through every hex). This test documents the current behavior. If fill doesn't currently split boundary from interior in segments, we document it as a known gap.

**Files:**
- Test: `core/src/hexpath/hex-path.test.ts`

- [ ] **Step 1: Write test for fill segment behavior**

```typescript
describe('fill segments', () => {
  it('fill produces a boundary segment', () => {
    // Small rectangle: 0101 - 0301 - 0303 - 0103 fill
    const result = hexPath.resolve('0101 - 0301 - 0303 - 0103 fill');
    expect(result.segments).toBeDefined();
    // The boundary path should be a single segment (closed loop)
    expect(result.segments!.length).toBe(1);
    // The segment should include the boundary hexes
    const boundarySegment = result.segments![0];
    expect(boundarySegment.length).toBeGreaterThan(0);
    // Interior hexes are in items but NOT in any segment
    const segmentIds = new Set(boundarySegment);
    const interiorOnly = result.items.filter((id) => !segmentIds.has(id));
    // For a small rectangle, there should be some interior hexes
    // (depends on grid size — this is a characterization test)
  });
});
```

- [ ] **Step 2: Run the test and observe actual behavior**

Run: `npx vitest run core/src/hexpath/hex-path.test.ts`

Examine the actual output. The current `handleCloseOrFill` calls `flushSegment()` which flushes the boundary path as a single segment. Interior hexes from `this.fill()` are added to `items` but NOT to any segment. **This is already the correct behavior**: the boundary is a segment, interior is items-only.

Adjust test assertions to match actual behavior if needed.

- [ ] **Step 3: Commit**

```bash
git add core/src/hexpath/hex-path.test.ts
git commit -m "test(core): characterize fill segment behavior (boundary loop + interior items)"
```

---

### Task 10: Document the parse-modify-serialize pattern

**Files:**
- Modify: `core/src/hexpath/hex-path.ts` (JSDoc on serialize method)
- Modify: `AGENTS.md` (add pattern reference)

- [ ] **Step 1: Add pattern comment to HexPath class**

Add a block comment above the `serialize` method (or at the class level) documenting the pattern:

```typescript
/**
 * === HexPath Mutation Pattern ===
 *
 * All code that builds or modifies HexPath strings MUST use:
 *   1. resolve(string) → HexPathResult { items, segments, type }
 *   2. Modify the segments array (append, remove, reorder)
 *   3. serialize(segments, type) → canonical string
 *
 * NEVER build HexPath strings via string concatenation or regex.
 */
```

- [ ] **Step 2: Add a note to AGENTS.md**

Under the Core Methodologies section or a new "Design Patterns" section, add:

```markdown
## HexPath Mutation Pattern
All HexPath string construction must use `resolve() → modify segments → serialize()`.
See `core/src/hexpath/hex-path.ts` for the API and JSDoc.
```

- [ ] **Step 3: Commit**

```bash
git add core/src/hexpath/hex-path.ts AGENTS.md
git commit -m "docs: document parse-modify-serialize pattern for HexPath"
```

---

## Summary

After all tasks:

1. `HexPath.idToAtom(id, type)` converts internal IDs → HexPath atoms
2. `HexPath.serialize(segments, type)` converts segments → canonical HexPath string
3. Round-trip is tested: `serialize(resolve(s).segments, type)` ≈ `s`
4. Paint handler uses parse→modify→serialize (no string concat)
5. `formatHexPathDisplay` is deleted
6. Preview/canvas rendering uses `segments: string[][]` (multi-polyline, skip singletons)
7. `boundaryIdToHexPath` and `vertexIdToHexPath` delegate to `idToAtom`
8. Feature label priority fixed: id before terrain
9. `@all` and `fill` segment behavior is tested and documented
10. Pattern documented in code comments and AGENTS.md

**Design pattern documented in code:**
```
resolve(string) → HexPathResult { items, segments, type }
                     ↓ modify segments ↓
serialize(segments, type) → string
```
**Never build HexPath strings by concatenation.**
