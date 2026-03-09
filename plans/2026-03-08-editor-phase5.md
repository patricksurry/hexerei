# Editor Phase 5 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix three confirmed bugs from phase 4 testing and deliver five UX improvements: feature↔CommandBar sync, hex path segment visualization, feature labels on canvas, feature grouping prep, and improved feature introspection.

**Architecture:** Bugs are concentrated in two places — the HexPath parser accepting incomplete input and the `map-model` not handling YAML array/object `at` values. Improvements build on the existing Scene/draw pipeline, adding new render item types without changing data flow.

**Tech Stack:** TypeScript, React, Vitest, Canvas 2D API, `@hexmap/core` (HexPath, Hex math)

---

## Phase 4 Feedback — Deferred Items (design doc)

These were raised but are not in scope for phase 5. Capture here for the next phase:

- **Road/river rendering:** Edge-path and hex-path features need dedicated visual representation (lines on canvas, not hex fills). Requires new geometry types in Scene and draw layers.
- **Shift-click to extend hexpath:** The CommandBar should support extending an existing selection by shift-clicking hexes. Requires a "pending path" concept in App state that appends new hexes to the current command value.
- **Feature grouping:** The feature list will become unmanageable on large maps. Plan: group by terrain type or by explicit group tags. Also explore spatial filter (select a region, see only features active there). Requires significant FeatureStack rework.
- **Feature selection → highlight edge/vertex geometry:** When a feature with an edge- or vertex-type `at` (e.g., rivers, roads by edge) is selected, those geometries should highlight on the map. Currently only hex-type features highlight. Requires passing edge/vertex IDs through the selection/highlight system.

---

## Bug 1: Crash on Partial Edge/Vertex Input

**Files:**
- Modify: `core/src/hexpath/hex-path.ts` (resolveAtom, around line 268)
- Modify: `editor/src/model/hex-path-preview.ts`
- Test: `core/src/hexpath/hex-path.test.ts`

**Root cause:** When the user types `0605.` or `0605/`, `resolveAtom` successfully parses it as a vertex/edge with empty suffix, silently resolving to direction 0. The resulting vertex/edge ID gets returned as a `hexId`. `buildScene` then calls `Hex.hexFromId()` on that ID (which contains `^` or `|` delimiters), which throws. The unhandled error crashes the React render tree → black screen.

**Step 1: Write failing tests in core hex-path tests**

```typescript
// In core/src/hexpath/hex-path.test.ts — add to existing describe block:

it('returns empty for partial vertex input "0605."', () => {
  const result = hp.resolve('0605.');
  expect(result.items).toHaveLength(0);
  expect(result.type).toBe('hex');
});

it('returns empty for partial edge input "0605/"', () => {
  const result = hp.resolve('0605/');
  expect(result.items).toHaveLength(0);
  expect(result.type).toBe('hex');
});
```

**Step 2: Run tests to confirm they fail**

```bash
npx vitest run core/src/hexpath/hex-path.test.ts
```
Expected: FAIL — partial inputs currently resolve to vertex/edge 0.

**Step 3: Fix resolveAtom to return null for incomplete separator**

In `core/src/hexpath/hex-path.ts`, in the CCRR block (around line 284) and the Alpha1 block (around line 253), add null-return guards before calling resolveEdge/resolveVertex:

```typescript
// CCRR block (line ~284):
if (separator === '/') {
  if (!suffix) return null;  // incomplete: "0605/" with nothing after
  return { id: this.resolveEdge(hexId, suffix), type: 'edge' };
}
if (separator === '.') {
  if (!suffix) return null;  // incomplete: "0605." with nothing after
  return { id: this.resolveVertex(hexId, suffix), type: 'vertex' };
}
```

Apply the same guard to the Alpha1 block above it.

**Step 4: Add safety guard in hex-path-preview.ts**

This is a belt-and-suspenders guard so non-hex IDs never reach buildScene even if other partial parse paths exist:

```typescript
// In editor/src/model/hex-path-preview.ts, replace the return in the try block:
return {
  hexIds: result.type === 'hex' ? result.items : [],
  type: result.type
};
```

**Step 5: Run all tests**

```bash
npx vitest run core/src/hexpath/hex-path.test.ts editor/src/model/
```
Expected: all pass.

**Step 6: Commit**

```bash
git add core/src/hexpath/hex-path.ts editor/src/model/hex-path-preview.ts core/src/hexpath/hex-path.test.ts
git commit -m "fix(core): don't resolve incomplete edge/vertex expressions; guard preview hexIds"
```

---

## Bug 2: Hex Label Scaling and Position

**Files:**
- Modify: `editor/src/canvas/draw.ts` (drawScene, around line 98)
- Test: `editor/src/canvas/draw.test.ts`

**Root cause (two parts):**
1. Font size is capped at `Math.min(16, ...)` — at high zoom labels stay tiny relative to the hex.
2. Labels are drawn at `hex.center` — they should be near the top of the hex, leaving the center clear for counters.

The `hexScreenRadius` is already correct (screen-space, scales with zoom). We just need to:
- Remove the 16px cap (or raise it significantly)
- Offset the label position toward the top of the hex (approx `center.y - hexScreenRadius * 0.5`)

**Step 1: Write failing test**

```typescript
// In editor/src/canvas/draw.test.ts — add to describe block:

it('should draw labels near the top of the hex, not at center', () => {
  const sceneWithBigHex: Scene = {
    ...mockScene,
    hexagons: [{
      ...mockScene.hexagons[0],
      // corners span 40px radius — well above labelMinZoom=12
      corners: [
        { x: 50, y: 10 }, { x: 90, y: 30 }, { x: 90, y: 70 },
        { x: 50, y: 90 }, { x: 10, y: 70 }, { x: 10, y: 30 }
      ],
      center: { x: 50, y: 50 },
      label: '0101'
    }]
  };
  drawScene(mockCtx, sceneWithBigHex, { labelMinZoom: 12 });
  const calls = (mockCtx.fillText as any).mock.calls;
  expect(calls).toHaveLength(1);
  const [_text, _x, labelY] = calls[0];
  // Label y should be above center (50) by a meaningful amount
  expect(labelY).toBeLessThan(40);
});
```

**Step 2: Run test to confirm it fails**

```bash
npx vitest run editor/src/canvas/draw.test.ts
```

**Step 3: Fix drawScene**

In `editor/src/canvas/draw.ts`, replace the label drawing block:

```typescript
if (showLabels && scene.hexagons.length > 0) {
  const h0 = scene.hexagons[0];
  const hexScreenRadius = Math.sqrt(
    Math.pow(h0.corners[0].x - h0.center.x, 2) +
    Math.pow(h0.corners[0].y - h0.center.y, 2)
  );

  if (hexScreenRadius > labelMinZoom) {
    // Scale font with hex size, no hard cap so labels grow with zoom
    const fontSize = Math.max(8, hexScreenRadius * 0.28);
    ctx.fillStyle = labelColor;
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const hex of scene.hexagons) {
      // Position near top of hex — shift up by ~40% of radius
      const labelY = hex.center.y - hexScreenRadius * 0.40;
      ctx.fillText(hex.label, hex.center.x, labelY);
    }
  }
}
```

**Step 4: Run tests**

```bash
npx vitest run editor/src/canvas/draw.test.ts
```

**Step 5: Commit**

```bash
git add editor/src/canvas/draw.ts editor/src/canvas/draw.test.ts
git commit -m "fix(editor): scale hex labels with zoom and position near top of hex"
```

---

## Bug 3: Array/Object `at` Values Show as 'complex'

**Files:**
- Modify: `editor/src/model/map-model.ts` (constructor, around line 101)
- Test: `editor/src/model/map-model.test.ts`

**Root cause:** `bfm.yaml` uses YAML arrays (`["1702", "2201"]`) and YAML objects (`{ range: [...] }`) for `at` values. The YAML parser produces JS arrays/objects, not strings. `map-model.ts` only handles string `at`, so all non-string values fall through to `'complex'`. This affects the feature label shown in FeatureStack (shows terrain name instead of feature label) and the `at` display in Inspector.

**Array fix:** Join array elements with spaces — `["1702", "2201"]` → `"1702 2201"`. This is valid HexPath that already works.

**Object fix:** Objects with `{ range: [...] }` or similar cannot be easily stringified to valid HexPath yet. Leave as `'complex'` but display it clearly in the UI. Plan HexPath `range:` support as a future task.

**Also fix `isBase` detection:** Currently only `@all` is treated as a base layer. Extend to cover any `@`-keyword feature (`@off_map`, etc.) by checking if `at` starts with `@`.

**Step 1: Write failing tests**

```typescript
// In editor/src/model/map-model.test.ts

it('handles array at values by joining to string', () => {
  const yaml = `
hexmap: "1.0"
layout:
  orientation: flat-down
  all: "0101 0201 0301"
features:
  - at: ["0101", "0201"]
    terrain: forest
`;
  const model = MapModel.load(yaml);
  expect(model.features[0].at).toBe('0101 0201');
  expect(model.features[0].hexIds).toHaveLength(2);
});

it('marks @-keyword features as base layer', () => {
  const yaml = `
hexmap: "1.0"
layout:
  orientation: flat-down
  all: "0101 0201"
features:
  - at: "@all"
    terrain: clear
`;
  const model = MapModel.load(yaml);
  expect(model.features[0].isBase).toBe(true);
});
```

**Step 2: Run tests to confirm they fail**

```bash
npx vitest run editor/src/model/map-model.test.ts
```

**Step 3: Fix map-model.ts**

Replace the `at` computation in the feature map (around line 101):

```typescript
// Normalize at: string → as-is, array → joined string, object → 'complex'
function normalizeAt(raw: any): string {
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw.join(' ');
  return 'complex';
}

// And in the feature mapping:
const atStr = normalizeAt(f.at);

const featureItem: FeatureItem = {
  index: idx,
  terrain: f.terrain,
  label: f.label,
  id: f.id,
  tags: Array.isArray(f.tags) ? f.tags : (f.tags ? f.tags.split(/\s+/) : []),
  at: atStr,
  isBase: typeof f.at === 'string' && f.at.startsWith('@'),
  hexIds,
  raw: f
};
```

Place `normalizeAt` as a module-level function just above the class definition.

**Step 4: Run tests**

```bash
npx vitest run editor/src/model/map-model.test.ts
```

**Step 5: Commit**

```bash
git add editor/src/model/map-model.ts editor/src/model/map-model.test.ts
git commit -m "fix(editor): handle array at values in map-model; broaden isBase detection"
```

---

## Feature 1: Feature Selection ↔ CommandBar Sync

**Files:**
- Modify: `editor/src/App.tsx`
- Test: `editor/src/App.test.tsx`

**Goal:** Selecting a feature in FeatureStack populates the CommandBar with the feature's `at` expression (so the user can see and edit it). Clicking an edge or vertex populates the CommandBar with the appropriate HexPath notation.

**CommandBar population rules:**
| Selection type | CommandBar value |
|---|---|
| hex | `"0605"` (existing behavior) |
| feature | `feature.at` (e.g. `"0101 0201"`) |
| edge | `"0605/N"` (hex label + `/` + direction name) |
| vertex | `"0605.0"` (hex label + `.` + corner index) |

**Edge/vertex → CommandBar:** Requires resolving the boundaryId/vertexId back to a human-readable HexPath token. Add a helper `boundaryIdToHexPath(boundaryId, model)` and `vertexIdToHexPath(vertexId, model)` in `selection.ts`.

**Step 1: Write failing test**

```typescript
// In editor/src/App.test.tsx — add test for feature selection populating command bar
// (use React Testing Library render + userEvent if available, otherwise skip to integration)
// For now: unit test the helpers in selection.ts

// In editor/src/model/selection.test.ts (new file):
import { boundaryIdToHexPath } from './selection.js';
import { MapModel } from './map-model.js';

const YAML = `
hexmap: "1.0"
layout:
  orientation: flat-down
  all: "0101 0201"
`;
it('boundaryIdToHexPath returns label/direction for a shared edge', () => {
  const model = MapModel.load(YAML);
  // 0101 and 0201 are adjacent; find their boundary ID
  const { Hex } = await import('@hexmap/core');
  const c1 = Hex.offsetToCube(1, 1, 'flat-down');
  const c2 = Hex.offsetToCube(2, 1, 'flat-down');
  const bid = Hex.getCanonicalBoundaryId(c1, c2, 0);
  const result = boundaryIdToHexPath(bid, model);
  expect(result).toMatch(/^\d{4}\/\w+$/);  // e.g. "0101/NE"
});
```

**Step 2: Add `boundaryIdToHexPath` and `vertexIdToHexPath` to selection.ts**

```typescript
// In editor/src/model/selection.ts

export function boundaryIdToHexPath(boundaryId: string, model: MapModel): string {
  const parts = boundaryId.split('|');
  const h1 = Hex.hexFromId(parts[0]);
  const label1 = model.hexIdToLabel(parts[0]);
  const orientation = model.grid.orientation;
  const top = Hex.orientationTop(orientation);

  if (parts[1]?.startsWith('VOID')) {
    const dir = parseInt(parts[1].split('/')[1]);
    return `${label1}/${directionName(dir, top)}`;
  }
  // Find direction from h1 to h2
  const h2 = Hex.hexFromId(parts[1]);
  for (let d = 0; d < 6; d++) {
    if (Hex.hexId(Hex.hexNeighbor(h1, d)) === Hex.hexId(h2)) {
      return `${label1}/${directionName(d, top)}`;
    }
  }
  return label1; // fallback
}

export function vertexIdToHexPath(vertexId: string, model: MapModel): string {
  const ids = vertexId.split('^');
  const h1 = Hex.hexFromId(ids[0]);
  const label1 = model.hexIdToLabel(ids[0]);
  // Find which corner of h1 this vertex is
  for (let i = 0; i < 6; i++) {
    const n1 = Hex.hexId(Hex.hexNeighbor(h1, i));
    const n2 = Hex.hexId(Hex.hexNeighbor(h1, (i + 1) % 6));
    if ((ids.includes(n1) && ids.includes(n2))) {
      return `${label1}.${i}`;
    }
  }
  return label1;
}

// Helper — orientation-aware direction name
function directionName(dir: number, top: 'flat' | 'pointy'): string {
  const flatNames = ['NE', 'SE', 'S', 'SW', 'NW', 'N'];
  const pointyNames = ['E', 'NE', 'NW', 'W', 'SW', 'SE'];
  return top === 'flat' ? flatNames[dir] : pointyNames[dir];
}
```

**Step 3: Wire up in App.tsx**

```typescript
// In handleHit, replace the edge/vertex TODO comments:
if (result.type === 'edge') {
  setSelection(selectEdge(result.boundaryId, result.hexLabels));
  if (model) setCommandValue(boundaryIdToHexPath(result.boundaryId, model));
}
if (result.type === 'vertex') {
  setSelection(selectVertex(result.vertexId));
  if (model) setCommandValue(vertexIdToHexPath(result.vertexId, model));
}

// In handleSelectFeature:
const handleSelectFeature = (indices: number[], modifier: 'none' | 'shift' | 'cmd' = 'none') => {
  setSelection(prev => selectFeature(indices[0], prev, modifier));
  if (modifier === 'none' && indices.length === 1 && model) {
    const feature = model.features[indices[0]];
    if (feature) setCommandValue(feature.at);
  }
};
```

**Step 4: Run tests**

```bash
npx vitest run editor/src/model/
```

**Step 5: Commit**

```bash
git add editor/src/model/selection.ts editor/src/App.tsx
git commit -m "feat(editor): sync feature/edge/vertex selection to CommandBar"
```

---

## Feature 2: Hex Path Segment Visualization

**Files:**
- Modify: `editor/src/model/hex-path-preview.ts`
- Modify: `editor/src/model/scene.ts` (Scene type + buildScene)
- Modify: `editor/src/canvas/draw.ts` (drawScene)
- Modify: `editor/src/App.tsx` (pass segment path to scene)
- Test: `editor/src/model/hex-path-preview.test.ts`

**Goal:** When the CommandBar contains a hex path expression that resolves to multiple hexes in sequence (e.g., a road `"0101 0201 0301"`), draw a thin dashed line connecting their centers in path order. This makes roads and other linear features legible even before feature rendering is complete.

**Design:** Add `segmentPath: string[]` to `HexPathPreview` — the ordered hex IDs as returned by `HexPath.resolve()`. The existing `Set<string>` in `resolve()` preserves JS insertion order, so `result.items` is already path-ordered. Pass this through to the scene as a new `pathLines` render item type.

Only draw segment lines when `preview.type === 'hex'` and `segmentPath.length > 1`. Skip for fill-operator results or single hexes.

**Step 1: Write failing test**

```typescript
// In editor/src/model/hex-path-preview.test.ts — add:
it('returns segmentPath in path order for a sequential hex path', () => {
  // ... setup model with hexes 0101, 0201, 0301 ...
  const preview = parseHexPathInput('0101 0201 0301', model);
  expect(preview.segmentPath).toEqual([
    /* cube IDs in order */
    expect.stringMatching(/\d+,\d+,\d+/),
    expect.stringMatching(/\d+,\d+,\d+/),
    expect.stringMatching(/\d+,\d+,\d+/),
  ]);
  expect(preview.segmentPath[0]).not.toEqual(preview.segmentPath[1]);
});
```

**Step 2: Run test to confirm it fails**

```bash
npx vitest run editor/src/model/hex-path-preview.test.ts
```

**Step 3: Extend HexPathPreview and parseHexPathInput**

```typescript
// In editor/src/model/hex-path-preview.ts:
export interface HexPathPreview {
  hexIds: string[];
  segmentPath: string[];   // ordered hex IDs for drawing center-to-center line
  type: GeometryType;
  error?: { message: string; offset: number };
}

// In parseHexPathInput, update the success return:
return {
  hexIds: result.type === 'hex' ? result.items : [],
  segmentPath: result.type === 'hex' ? result.items : [],
  type: result.type
};

// And the error return:
return {
  hexIds: [],
  segmentPath: [],
  type: 'hex',
  error: { message: e.message || 'Invalid expression', offset: 0 }
};
```

**Step 4: Add PathLine to Scene**

```typescript
// In editor/src/model/scene.ts:
export interface PathLineRenderItem {
  points: Point[];   // screen-space centers in path order
  color: string;
}

export interface Scene {
  background: string;
  hexagons: HexRenderItem[];
  highlights: HighlightRenderItem[];
  edgeHighlights: EdgeHighlightRenderItem[];
  vertexHighlights: VertexHighlightRenderItem[];
  pathLines: PathLineRenderItem[];   // NEW
}
```

**Step 5: Pass segmentPath into buildScene**

Update `buildScene` signature and App.tsx call:

```typescript
// buildScene signature:
export function buildScene(
  model: MapModel,
  viewport: ViewportState,
  background: string = '#141414',
  highlights: SceneHighlight[] = [],
  segmentPath: string[] = []    // NEW
): Scene

// At end of buildScene, before return:
const pathLines: PathLineRenderItem[] = [];
if (segmentPath.length > 1) {
  const points = segmentPath.map(hexId => {
    const cube = Hex.hexFromId(hexId);
    const world = Hex.hexToPixel(cube, HEX_SIZE, orientation);
    return worldToScreen(world, viewport);
  });
  pathLines.push({ points, color: '#00D4FF' });
}

return { background, hexagons, highlights: highlightItems, edgeHighlights, vertexHighlights, pathLines };
```

**Step 6: Draw path lines in drawScene**

```typescript
// In editor/src/canvas/draw.ts, after edgeHighlights block:
for (const line of scene.pathLines) {
  if (line.points.length < 2) continue;
  ctx.beginPath();
  ctx.moveTo(line.points[0].x, line.points[0].y);
  for (let i = 1; i < line.points.length; i++) {
    ctx.lineTo(line.points[i].x, line.points[i].y);
  }
  ctx.strokeStyle = line.color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
}
```

**Step 7: Wire up in App.tsx**

```typescript
// Pass preview?.segmentPath to CanvasHost → buildScene
// In CanvasHost or directly in buildScene call, add:
segmentPath={preview?.segmentPath ?? []}
```

Trace the prop from App.tsx → CanvasHost → buildScene as needed. Check `CanvasHost.tsx` for how it currently calls `buildScene` and add the `segmentPath` prop there.

**Step 8: Run all tests**

```bash
npx vitest run editor/src/model/ editor/src/canvas/
```

**Step 9: Commit**

```bash
git add editor/src/model/hex-path-preview.ts editor/src/model/scene.ts editor/src/canvas/draw.ts editor/src/App.tsx
git commit -m "feat(editor): draw dashed path line connecting hex centers in preview"
```

---

## Feature 3: Feature Labels on Canvas

**Files:**
- Modify: `editor/src/model/scene.ts`
- Modify: `editor/src/canvas/draw.ts`
- Modify: `editor/src/canvas/CanvasHost.tsx`
- Test: `editor/src/model/scene.test.ts`

**Goal:** Features with an explicit `label` field (cities, rivers, fortification lines) show their label text on the map near the centroid of their hex cluster. Start simple: compute the screen-space centroid of all hexes in the feature, draw text. Only render at a minimum zoom threshold (same as hex labels). Font slightly smaller than hex labels; white with dark outline for legibility.

**Which features?** Only non-base features with `feature.label` set. Skip base layer (`isBase`) and unlabeled features.

**Centroid:** Average of `hexToPixel` positions for the feature's hexIds. If a feature has 0 hexIds (e.g., an edge-type `at`), skip it for now.

**Step 1: Write failing test**

```typescript
// In editor/src/model/scene.test.ts — add:
it('buildScene includes feature label at centroid when feature has label', () => {
  // Use MOCK_YAML with a labeled feature
  const yaml = `
hexmap: "1.0"
layout:
  orientation: flat-down
  all: "0101 0201"
terrain:
  hex:
    city: { style: { color: "#888" } }
features:
  - at: "@all"
    terrain: clear
  - at: "0101"
    terrain: city
    label: "Smolensk"
`;
  const m = MapModel.load(yaml);
  const scene = buildScene(m, vp);
  expect(scene.featureLabels).toHaveLength(1);
  expect(scene.featureLabels[0].text).toBe('Smolensk');
});
```

**Step 2: Run test to confirm failure**

```bash
npx vitest run editor/src/model/scene.test.ts
```

**Step 3: Add FeatureLabelRenderItem to scene.ts**

```typescript
export interface FeatureLabelRenderItem {
  text: string;
  point: Point;    // screen-space centroid
}

// Add to Scene interface:
featureLabels: FeatureLabelRenderItem[];
```

**Step 4: Compute feature labels in buildScene**

```typescript
// At the end of buildScene, after pathLines:
const featureLabels: FeatureLabelRenderItem[] = [];
for (const feature of model.features) {
  if (!feature.label || feature.isBase || feature.hexIds.length === 0) continue;

  // Average screen-space center of all feature hexes
  let sumX = 0, sumY = 0, count = 0;
  for (const hexId of feature.hexIds) {
    const cube = Hex.hexFromId(hexId);
    const world = Hex.hexToPixel(cube, HEX_SIZE, orientation);
    const screen = worldToScreen(world, viewport);
    sumX += screen.x; sumY += screen.y; count++;
  }
  if (count > 0) {
    featureLabels.push({ text: feature.label, point: { x: sumX / count, y: sumY / count } });
  }
}
```

**Step 5: Draw feature labels in draw.ts**

```typescript
// In drawScene, after hex labels block:
if (scene.featureLabels.length > 0 && scene.hexagons.length > 0) {
  const h0 = scene.hexagons[0];
  const hexScreenRadius = Math.sqrt(
    Math.pow(h0.corners[0].x - h0.center.x, 2) +
    Math.pow(h0.corners[0].y - h0.center.y, 2)
  );
  if (hexScreenRadius > (options.labelMinZoom ?? 12)) {
    const fontSize = Math.max(7, hexScreenRadius * 0.22);
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const fl of scene.featureLabels) {
      // Dark outline for legibility on any terrain
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 3;
      ctx.strokeText(fl.text, fl.point.x, fl.point.y);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(fl.text, fl.point.x, fl.point.y);
    }
  }
}
```

**Step 6: Run all tests**

```bash
npx vitest run editor/src/model/scene.test.ts editor/src/canvas/draw.test.ts
```

**Step 7: Commit**

```bash
git add editor/src/model/scene.ts editor/src/canvas/draw.ts
git commit -m "feat(editor): render feature labels at hex cluster centroid"
```

---

## Final Verification

**Step 1: Run full test suite**

```bash
npx vitest run
```
Expected: all tests pass.

**Step 2: Manual smoke test checklist**

Load Battle for Moscow (`bfm.yaml`):
- [ ] Type `2703.` — no crash, no preview highlight
- [ ] Type `2703/` — no crash, no preview highlight
- [ ] Type `2703/N` — edge preview highlights correctly
- [ ] Zoom in: hex labels grow with zoom and sit near top of hex
- [ ] Feature Stack: cities show `"2703 2201"` in the `at` subtitle (not `complex`)
- [ ] Click a city in FeatureStack: CommandBar populates with its `at` expression
- [ ] Click a hex on canvas: CommandBar populates with `"2703"`
- [ ] Click an edge on canvas: CommandBar populates with `"2703/N"` (or similar)
- [ ] Type a path `"2703 2201 1804"`: dashed line connects the three hex centers
- [ ] City labels (Smolensk, Moscow etc.) appear on the map near their hexes at mid/high zoom

**Step 3: Commit any final fixes, then tag**

```bash
git tag editor-phase5
```

---

**Plan complete and saved to `plans/2026-03-08-editor-phase5.md`.**

**Two execution options:**

**1. Subagent-Driven (this session)** — dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** — open a new session with `executing-plans`, batch execution with checkpoints

Which approach?
