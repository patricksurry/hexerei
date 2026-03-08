# Editor Phase 2: Canvas — Load & Render — Implementation Plan

**Goal:** Prove the data pipeline from `.hexmap` YAML through `@hexmap/core` to Canvas 2D pixels, with the hard-to-test UX layer as thin as possible.

**Key design principle:** Maximize the headless, testable surface. The canvas component should be a thin event forwarder and pixel painter. All coordinate math, map loading, scene computation, and hit testing are pure functions testable without a DOM.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  @hexmap/core  (pure math, no DOM)                      │
│                                                         │
│  Existing: Hex.hexToPixel, offsetToCube, cubeToOffset,  │
│            HexMesh, HexMapDocument, hexId/hexFromId      │
│  NEW:      Hex.pixelToHex, Hex.hexCorners               │
│            (+ orientation param on hexToPixel)           │
└────────────────────────┬────────────────────────────────┘
                         │ imports
┌────────────────────────▼────────────────────────────────┐
│  editor/src/model/  (headless, testable, no React)      │
│                                                         │
│  MapModel    — load YAML, derive features, terrain      │
│  Viewport    — pan/zoom transform as plain data         │
│  hitTest     — screen point → hex label (pure fn)       │
│  buildScene  — model + viewport → render list           │
└────────────────────────┬────────────────────────────────┘
                         │ imports
┌────────────────────────▼────────────────────────────────┐
│  editor/src/canvas/  (thin UX layer)                    │
│                                                         │
│  drawScene   — render list → Canvas2D calls             │
│  CanvasHost  — <canvas> element, DOM events, resize     │
│               (only React component in this layer)      │
└─────────────────────────────────────────────────────────┘
```

**World coordinate system:** All world-space calculations use hex size = 1 ("unit hex"). The viewport zoom converts world units to screen pixels. This means `hexToPixel(hex, 1)` gives positions where adjacent flat-top hex centers are 1.5 apart horizontally.

## Acceptance Criteria

- [ ] Battle for Moscow loads from `.hexmap.yaml` and renders on Canvas 2D
- [ ] Hex outlines, terrain fills (from `style.color`), and coordinate labels visible
- [ ] Pan (mouse drag) and zoom (scroll wheel, centered on cursor)
- [ ] Status bar shows hex coordinate under cursor (pixel → hex conversion)
- [ ] Feature Stack populated from real `features` array
- [ ] Inspector shows map metadata when nothing selected
- [ ] All model/viewport/hitTest/scene code has unit tests (no DOM required)
- [ ] Canvas drawing layer is < 100 lines of imperative code
- [ ] `npm test` passes in both `core/` and `editor/`

---

### Task 1: Core Math Additions

**Files:**
- Modify: `core/src/math/hex-math.ts`
- Create: `core/src/math/hex-math.test.ts` (or extend existing)

Add three things to the `Hex` namespace:

**1a. `HexOrientation` type and orientation-aware `hexToPixel`**

```ts
export type HexOrientation = 'flat' | 'pointy';
```

Add optional third parameter to existing `hexToPixel`:
```ts
export function hexToPixel(hex: Cube, size: number, orientation: HexOrientation = 'flat'): Point
```

Flat-top (existing): `x = size * 3/2 * q`, `y = size * (√3/2 * q + √3 * r)`
Pointy-top (new): `x = size * (√3 * q + √3/2 * r)`, `y = size * 3/2 * r`

Default `'flat'` preserves backward compatibility.

**1b. `pixelToHex` — inverse of hexToPixel**

```ts
export function pixelToHex(point: Point, size: number, orientation: HexOrientation = 'flat'): Cube
```

Flat-top: `q = 2/3 * x / size`, `r = (-1/3 * x + √3/3 * y) / size`, then `hexRound`.
Pointy-top: `q = (√3/3 * x - 1/3 * y) / size`, `r = 2/3 * y / size`, then `hexRound`.

**1c. `hexCorners` — 6 vertices of a hex**

```ts
export function hexCorners(center: Point, size: number, orientation: HexOrientation = 'flat'): Point[]
```

Flat-top: corner `i` at angle `60° * i` (starting east).
Pointy-top: corner `i` at angle `60° * i + 30°`.

**Tests:**

- `pixelToHex(hexToPixel(hex, s), s)` round-trips for various hexes and sizes
- `hexCorners` returns 6 points, all at distance `size` from center
- Both orientations tested
- Edge case: `pixelToHex` at hex boundary (between two hexes)

**Commit:** `"Core: add pixelToHex, hexCorners, and orientation support"`

---

### Task 2: Editor ↔ Core Wiring + Map Asset

**Files:**
- Modify: `editor/package.json` (add `@hexmap/core` dependency)
- Modify: `editor/tsconfig.json` (add path alias)
- Modify: `editor/vite.config.ts` (add resolve alias)
- Modify: `editor/vitest.config.ts` (add resolve alias)
- Create: `editor/public/maps/battle-for-moscow.hexmap.yaml` (copy from `maps/definitions/`)

**Step 1: Add workspace dependency**

In `editor/package.json`, add `"@hexmap/core": "*"` to dependencies.

**Step 2: TypeScript path resolution**

In `editor/tsconfig.json`, add:
```json
"paths": {
  "@hexmap/core": ["../core/src/index.ts"]
}
```

**Step 3: Vite + Vitest resolution**

In both `editor/vite.config.ts` and `editor/vitest.config.ts`, add:
```ts
resolve: {
  alias: {
    '@hexmap/core': path.resolve(__dirname, '../core/src/index.ts')
  }
}
```

**Step 4: Copy map asset**

Copy `maps/definitions/battle-for-moscow.hexmap.yaml` to `editor/public/maps/`.

**Step 5: Smoke test**

Create a minimal test that imports from `@hexmap/core` and verifies it resolves:
```ts
import { Hex } from '@hexmap/core';
test('core library resolves', () => {
  const hex = Hex.createHex(0, 0);
  expect(hex.q).toBe(0);
});
```

**Commit:** `"Editor: wire @hexmap/core dependency and add map asset"`

---

### Task 3: MapModel — Headless Map Document

**Files:**
- Create: `editor/src/model/map-model.ts`
- Create: `editor/src/model/map-model.test.ts`

The MapModel is the editor's domain model. It wraps `@hexmap/core` primitives and provides typed access to everything the UI needs. No React dependency.

**Interface:**

```ts
interface GridConfig {
  hexTop: 'flat' | 'pointy';
  columns: number;
  rows: number;
  stagger: Hex.Stagger;
  firstCol: number;
  firstRow: number;
  labelFormat: string;  // "CCRR", "XXXYY", etc.
}

interface TerrainDef {
  key: string;
  name: string;
  color: string;
  properties?: Record<string, any>;
}

class MapModel {
  static load(yamlSource: string): MapModel

  // Source data
  get metadata(): Record<string, any>         // title, designer, etc.
  get grid(): GridConfig
  get terrainDefs(): Map<string, TerrainDef>  // terrain key → definition
  get features(): FeatureItem[]               // for Feature Stack (editor types)

  // Computed topology
  get mesh(): HexMesh

  // Coordinate helpers
  labelToHexId(label: string): string | null  // "0507" → cube ID
  hexIdToLabel(id: string): string            // cube ID → "0507"
  terrainColor(terrain: string): string       // → CSS color, with fallback
}
```

**Loading logic:**

1. Parse YAML via `HexMapDocument(source).toJS()`
2. Extract `grid` section → `GridConfig`
3. Extract `terrain` section → `Map<string, TerrainDef>` (hex, edge, path types)
4. Extract `defaults.hex.terrain` → base terrain for all hexes
5. Generate grid via `Hex.createRectangularGrid(cols, rows, stagger, firstCol, firstRow)`
6. Process `features` in order:
   - `hexes: { exclude: [...] }` → remove hexes from valid set
   - `hexes: [...]` / `hex: "..."` → assign terrain to those hexes
   - `hexes: { range: ["start", "end"] }` → expand range, assign terrain
   - `path`, `edges`, `region` → record but don't affect hex terrain (Phase 3+)
7. Build `HexMesh` from remaining valid hexes + terrain map
8. Derive `FeatureItem[]` from raw features:
   - Synthesize a base feature from `defaults.hex.terrain` (isBase: true, at: "@all")
   - Map each raw feature → `FeatureItem` with index, terrain, label, id, tags, at string

**Label parsing (CCRR format):**

```ts
labelToHexId("0507"):
  col = 05, row = 07
  offset = (col - firstCol, row - firstRow) = (4, 6)
  cube = offsetToCube(4, 6, stagger)
  return hexId(cube)
```

**`terrainColor` lookup chain:**
1. Check terrain definition `style.color`
2. Fallback: hash terrain key to hue, return HSL color
3. Unknown terrain: `#555555`

**Tests:**

Load the Battle for Moscow YAML (import as fixture string) and verify:
- `metadata.title` === "Battle for Moscow"
- `grid.columns` === 14, `grid.rows` === 11, `grid.hexTop` === 'flat'
- `terrainDefs` has entries for clear, forest, swamp, city, major_city
- `terrainColor('forest')` === '#aaddaa'
- `features` includes base feature (isBase: true) + city features + forest features
- `mesh.getArea(labelToHexId('0507'))` has terrain 'clear' (default)
- `mesh.getArea(labelToHexId('1202'))` has terrain 'major_city' (Moscow)
- Excluded hexes (off_map) are not in mesh: `mesh.getArea(labelToHexId('0211'))` === undefined
- `hexIdToLabel(labelToHexId('0507'))` === '0507' (round-trip)
- Hex count: 14*11 - 7 (excluded) = 147 hexes

**Commit:** `"Editor: add MapModel for headless hexmap document access"`

---

### Task 4: Viewport — Camera Transform

**Files:**
- Create: `editor/src/model/viewport.ts`
- Create: `editor/src/model/viewport.test.ts`

Pure data + pure functions. No classes, no side effects.

**Types:**

```ts
interface ViewportState {
  center: Point;    // world-space point at screen center
  zoom: number;     // screen pixels per world unit
  width: number;    // screen width in pixels
  height: number;   // screen height in pixels
}
```

**Functions:**

```ts
// Coordinate transforms
function screenToWorld(screen: Point, vp: ViewportState): Point
function worldToScreen(world: Point, vp: ViewportState): Point

// State mutations (return new state)
function panBy(vp: ViewportState, screenDelta: Point): ViewportState
function zoomAt(vp: ViewportState, screenPoint: Point, factor: number): ViewportState

// Fit all hexes in view
function fitExtent(
  worldBounds: { min: Point; max: Point },
  width: number,
  height: number,
  padding?: number   // fraction, default 0.08
): ViewportState

// Compute world bounds from a set of hex centers + hex size
function computeWorldBounds(
  hexCenters: Point[],
  hexSize: number,
  orientation: HexOrientation
): { min: Point; max: Point }
```

**Transform math:**

```
screenToWorld: world = (screen - screenCenter) / zoom + center
worldToScreen: screen = (world - center) * zoom + screenCenter
```

Where `screenCenter = { x: width/2, y: height/2 }`.

`zoomAt` preserves the world point under the cursor:
1. Get world point under cursor before zoom
2. Apply new zoom
3. Adjust center so cursor world point stays at same screen position

**Tests:**

- `screenToWorld(worldToScreen(p, vp), vp)` round-trips
- `panBy` moves center by `delta / zoom`
- `zoomAt` at screen center doesn't change center
- `zoomAt` at corner preserves the world point under cursor
- `fitExtent` with known bounds → zoom and center contain all hexes
- `computeWorldBounds` includes hex corners, not just centers

**Commit:** `"Editor: add Viewport transform with pan, zoom, and fit"`

---

### Task 5: HitTest + Scene Builder

**Files:**
- Create: `editor/src/model/hit-test.ts`
- Create: `editor/src/model/hit-test.test.ts`
- Create: `editor/src/model/scene.ts`
- Create: `editor/src/model/scene.test.ts`

**5a. HitTest — screen point to hex label**

```ts
function hexAtScreen(
  screenPt: Point,
  viewport: ViewportState,
  model: MapModel
): string | null    // returns hex label ("0507") or null if off-map
```

Logic:
1. `screenToWorld(screenPt, viewport)` → world point
2. `Hex.pixelToHex(worldPt, HEX_SIZE, orientation)` → cube
3. `model.mesh.getArea(Hex.hexId(cube))` → if exists, return label
4. Else return null

Where `HEX_SIZE = 1` is the world-space constant.

Tests:
- Center of hex at known screen position → returns correct label
- Point outside map → returns null
- Point near hex boundary → returns closest hex

**5b. Scene builder — compute render list**

```ts
interface HexRenderItem {
  hexId: string;
  corners: Point[];    // 6 screen-space points
  center: Point;       // screen-space center
  fill: string;        // terrain CSS color
  label: string;       // coordinate label ("0507")
}

interface Scene {
  background: string;
  hexagons: HexRenderItem[];
}

function buildScene(model: MapModel, viewport: ViewportState): Scene
```

Logic:
1. For each area in `model.mesh.getAllAreas()`:
   a. `Hex.hexToPixel(cube, HEX_SIZE, orientation)` → world center
   b. `worldToScreen(worldCenter, viewport)` → screen center
   c. Frustum cull: skip hexes whose screen center is far outside the viewport
   d. `Hex.hexCorners(worldCenter, HEX_SIZE, orientation)` → world corners → screen corners
   e. `model.terrainColor(area.terrain)` → fill color
   f. `model.hexIdToLabel(area.id)` → label string
2. Return `Scene` with background `var(--bg-base)` and all visible hex items

Tests:
- Build scene from MapModel + viewport → correct number of hexes
- Hex corners are in screen space (affected by zoom)
- Frustum culling excludes off-screen hexes
- Terrain colors match model definitions
- Labels are correct CCRR format

**Commit:** `"Editor: add hitTest and scene builder (headless)"`

---

### Task 6: Canvas Drawing

**Files:**
- Create: `editor/src/canvas/draw.ts`
- Create: `editor/src/canvas/draw.test.ts`

A single function that takes a Scene and paints it onto a Canvas 2D context.

```ts
function drawScene(ctx: CanvasRenderingContext2D, scene: Scene, options?: {
  showLabels?: boolean;
  labelMinZoom?: number;    // don't draw labels below this zoom
}): void
```

Implementation (target: < 80 lines):

1. Clear canvas with `scene.background`
2. For each hex in `scene.hexagons`:
   a. `beginPath()`, `moveTo(corners[0])`, `lineTo(corners[1..5])`, `closePath()`
   b. `fillStyle = hex.fill`, `fill()`
   c. `strokeStyle = '#2A2A2A'` (border-subtle token), `lineWidth = 1`, `stroke()`
3. If labels enabled and zoom sufficient:
   a. For each hex: `fillText(hex.label, center.x, center.y)` in muted color, small monospace

Tests:
- Use a mock/spy `CanvasRenderingContext2D` (or `OffscreenCanvas` if available in jsdom)
- Verify `beginPath`/`moveTo`/`lineTo` call count matches hex count * 7 (move + 5 lines)
- Verify `fillStyle` is set to terrain colors
- Labels drawn when zoom > threshold, skipped when below

**Commit:** `"Editor: add Canvas 2D drawScene function"`

---

### Task 7: CanvasHost Component (Thin UX Layer)

**Files:**
- Create: `editor/src/canvas/CanvasHost.tsx`
- Create: `editor/src/canvas/CanvasHost.css`
- Create: `editor/src/canvas/CanvasHost.test.tsx`
- Delete: `editor/src/components/CanvasPlaceholder.tsx` (replaced)
- Delete: `editor/src/components/CanvasPlaceholder.css`
- Delete: `editor/src/components/CanvasPlaceholder.test.tsx`

This is the **only hard-to-test component**. Keep it minimal.

**Props:**

```ts
interface CanvasHostProps {
  model: MapModel | null;
  onCursorHex?: (label: string | null) => void;  // status bar cursor
}
```

**Implementation:**

```tsx
function CanvasHost({ model, onCursorHex }: CanvasHostProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewport, setViewport] = useState<ViewportState | null>(null);

  // Resize: update viewport dimensions, fit on first load
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setViewport(vp => {
        if (!vp && model) return fitExtent(computeWorldBounds(...), width, height);
        return vp ? { ...vp, width, height } : null;
      });
    });
    if (canvasRef.current) observer.observe(canvasRef.current.parentElement!);
    return () => observer.disconnect();
  }, [model]);

  // Draw: rebuild scene and paint
  useEffect(() => {
    if (!model || !viewport || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    canvasRef.current.width = viewport.width;
    canvasRef.current.height = viewport.height;
    const scene = buildScene(model, viewport);
    drawScene(ctx, scene);
  }, [model, viewport]);

  // Mouse handlers: drag → pan, wheel → zoom, move → cursor
  // (event handler functions that call setViewport with pure transforms)

  return <canvas ref={canvasRef} className="canvas-host" ... />;
}
```

**Mouse interaction:**
- `onMouseDown` → record drag start, set dragging flag
- `onMouseMove` → if dragging: `setViewport(vp => panBy(vp, delta))`. If not: `onCursorHex(hexAtScreen(pt, viewport, model))`
- `onMouseUp` → clear dragging
- `onWheel` → `setViewport(vp => zoomAt(vp, pt, factor))` where factor = `e.deltaY > 0 ? 0.9 : 1.1`

**Tests:**
- Renders a `<canvas>` element
- When model is null, shows nothing (or placeholder text)
- (Integration test) When given a model, canvas has non-zero dimensions

**Commit:** `"Editor: add CanvasHost component replacing CanvasPlaceholder"`

---

### Task 8: App Integration — Wire Real Data

**Files:**
- Modify: `editor/src/App.tsx`
- Modify: `editor/src/App.test.tsx`
- Create: `editor/src/model/index.ts` (barrel export)

**Step 1: Load map on startup**

```tsx
function App() {
  const [model, setModel] = useState<MapModel | null>(null);
  const [cursorHex, setCursorHex] = useState<string | null>(null);

  useEffect(() => {
    fetch('/maps/battle-for-moscow.hexmap.yaml')
      .then(r => r.text())
      .then(yaml => setModel(MapModel.load(yaml)));
  }, []);

  // ... rest of state (panels, selection, command bar)
}
```

**Step 2: Wire Feature Stack to real features**

Replace `MOCK_FEATURES` with `model?.features ?? []`.

**Step 3: Wire Inspector to real metadata**

Pass `mapTitle={model?.metadata?.title}` and `mapLayout` from `model?.grid`.

**Step 4: Wire StatusBar to cursor hex**

Pass `cursor={cursorHex ?? '----'}` and `mapTitle={model?.metadata?.title}`.

**Step 5: Wire CanvasHost**

Replace `<CanvasPlaceholder />` with:
```tsx
<CanvasHost model={model} onCursorHex={setCursorHex} />
```

**Step 6: Update tests**

- Mock `fetch` to return the Battle for Moscow YAML
- Verify Feature Stack shows real feature count
- Verify StatusBar shows real map title
- Verify canvas element exists

**Commit:** `"Editor: wire real hexmap data through MapModel to all components"`

---

### Task 9: Polish + Zoom to Fit

**Files:**
- Modify: `editor/src/canvas/CanvasHost.tsx` (zoom-to-fit on load)
- Modify: `editor/src/components/StatusBar.tsx` (zoom display from viewport)
- Modify: `editor/src/App.tsx` (Cmd+0 → zoom to fit)

**Step 1: Zoom to fit on initial load**

When map loads and canvas gets its first resize, call `fitExtent` to set initial viewport.

**Step 2: Live zoom in status bar**

Pass actual zoom level from CanvasHost to App → StatusBar. Display as percentage of fit zoom (100% = all hexes visible).

**Step 3: Cmd+0 shortcut**

Add `mod+0` to keyboard shortcuts → reset viewport to `fitExtent`.

**Step 4: Visual verification**

```bash
cd editor && npm run dev
```

Verify:
- [ ] Battle for Moscow renders with colored terrain hexes
- [ ] Coordinate labels visible on hexes (at sufficient zoom)
- [ ] Mouse drag pans the map
- [ ] Scroll wheel zooms centered on cursor
- [ ] Status bar shows hex under cursor
- [ ] Feature Stack shows real features from the map
- [ ] Inspector shows "Battle for Moscow" metadata
- [ ] Cmd+0 resets zoom to fit
- [ ] Cmd+1 / Cmd+2 still toggle panels
- [ ] Canvas resizes when panels collapse/expand

**Commit:** `"Editor: polish zoom-to-fit, status bar, and Cmd+0 shortcut"`

---

## Summary

| Task | Layer | What | Testable? |
|------|-------|------|-----------|
| 1 | Core | pixelToHex, hexCorners, orientation | Yes (pure math) |
| 2 | Build | Workspace wiring, map asset | Smoke test |
| 3 | Model | MapModel: load YAML, features, terrain | Yes (no DOM) |
| 4 | Model | Viewport: transform, pan, zoom, fit | Yes (pure math) |
| 5 | Model | HitTest + Scene builder | Yes (no DOM) |
| 6 | Canvas | drawScene function | Yes (mock ctx) |
| 7 | Canvas | CanvasHost React component | Thin (< 100 LOC logic) |
| 8 | App | Wire real data, replace mocks | Integration test |
| 9 | Polish | Zoom to fit, status bar, Cmd+0 | Visual verification |

**Headless testable surface:** Tasks 1, 3, 4, 5 — the vast majority of logic.
**Thin UX layer:** Tasks 6, 7 — canvas drawing + event forwarding.
**Glue:** Tasks 2, 8, 9 — wiring and polish.

## Core API Notes (for Phase 3)

The current `HexMapLoader` in core is a rough draft — it loses the features array, terrain vocabulary, and metadata. The editor's `MapModel` bypasses it entirely, using lower-level core primitives (`HexMapDocument`, `HexMesh`, `Hex.*` math) directly. If other consumers need the same structured access, the `MapModel` pattern could be promoted to core in a future refactor.
