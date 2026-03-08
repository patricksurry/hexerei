# Editor Phase 4: Bug Fixes, UX Polish & HexPath Entry

**Date:** 2026-03-07
**Prerequisite:** Phase 3 (Selection & Inspection)
**Goal:** Fix Phase 3 regressions, polish UX, then validate the "Spatial IDE" premise with live HexPath entry and preview.

Phase 4 is split into three tiers. Tier A fixes correctness bugs that break core functionality. Tier B polishes UX issues reported during Phase 3 review. Tier C implements the new Phase 4 features from the UX design doc (HexPath Entry & Live Preview).

---

## Tier A — Correctness Bugs (Core & Editor)

These are logic errors that produce wrong results. Fix first, as later tiers depend on correct geometry.

### A1. Stagger parity flip in `createRectangularGrid`

**File:** `core/src/math/hex-math.ts` — `createRectangularGrid()`

**Bug:** The function subtracts `firstCol` before calling `offsetToCube`, which changes column parity when `firstCol` is odd. For Battle for Moscow (`firstCol=1`), column 1 becomes offset column 0 (even), flipping the stagger direction.

```ts
// CURRENT (wrong): c-firstCol flips parity when firstCol is odd
hexes.push(offsetToCube(c - firstCol, r - firstRow, stagger));

// FIX: pass actual column values, let offsetToCube handle stagger
// offsetToCube should operate on the raw offset coordinates directly
```

**Fix:** Change `createRectangularGrid` to pass the actual column/row values to `offsetToCube` without normalization. The offset-to-cube conversion formulas in the RFC use the **actual** column value to determine stagger parity, not a zero-based index.

```ts
export function createRectangularGrid(cols: number, rows: number, stagger: Stagger = Stagger.Odd, firstCol: number = 0, firstRow: number = 0): Cube[] {
    const hexes: Cube[] = [];
    for (let c = firstCol; c < firstCol + cols; c++) {
        for (let r = firstRow; r < firstRow + rows; r++) {
            hexes.push(offsetToCube(c, r, stagger));
        }
    }
    return hexes;
}
```

**Note:** This changes the default `firstCol`/`firstRow` from 1 to 0. All callers (currently only `HexMapLoader`) must be audited. The loader already passes explicit values, so defaults changing is safe.

**Also affects:**
- `HexPath.resolveAtom()` — same subtraction pattern: `col - (this.options.firstCol || 1)`. Same fix: pass `col` and `row` directly (the firstCol/firstRow values come from the map's `coordinates.first` and represent the actual column/row numbers, not an offset to subtract).
- `MapModel.hexIdToLabel()` — uses `cubeToOffset` + adds `firstCol` back. If `offsetToCube` now uses raw values, `cubeToOffset` will return raw values, and `hexIdToLabel` should NOT add `firstCol`/`firstRow` again.

**Tests:**
- Battle for Moscow: hex 0101 (col=1, row=1) should render at the correct stagger position
- With `stagger: high, firstCol: 1`: column 1 (odd) should be shifted up, column 2 (even) should be shifted down
- Round-trip: `cubeToOffset(offsetToCube(c, r, s), s)` should return `{x: c, y: r}` for all valid values

**Commit:** `"fix: correct stagger parity in createRectangularGrid and HexPath"`

---

### A2. Edge direction off-by-one in hit testing

**File:** `editor/src/model/hit-test.ts` — `hitTest()`

**Bug:** Edge midpoint index `i` (between corners `i` and `i+1`) aligns with hex direction `(i+1) % 6`, not direction `i`. The code uses `minEdgeIdx` directly as the direction to find the neighbor.

For flat-top hexes, corner positions at angle `60*i` degrees:
- Corner 0 = E (0°), Corner 1 = SE (60°), ..., Corner 5 = NE (300°)
- Edge midpoint 0 = between corners 0,1 = ESE direction
- Hex direction 0 = NE, direction 1 = SE (the neighbor to the SE)

Edge midpoint 0 (ESE) corresponds to direction 1 (SE neighbor), not direction 0 (NE neighbor).

```ts
// CURRENT (wrong):
const neighbor = Hex.hexNeighbor(cube, minEdgeIdx);

// FIX:
const neighbor = Hex.hexNeighbor(cube, (minEdgeIdx + 1) % 6);
```

Also fix the `getCanonicalBoundaryId` call to pass the corrected direction:
```ts
boundaryId: Hex.getCanonicalBoundaryId(cube, hasNeighbor ? neighbor : null, (minEdgeIdx + 1) % 6)
```

**Tests:**
- Click the midpoint between two known hexes → edge selection reports both correct hexes
- Click each edge of hex 0,0,0 → verify the correct neighbor for each edge direction
- Selecting same edge from either side → same canonical boundary ID

**Commit:** `"fix: correct edge direction mapping in hit test"`

---

### A3. Vertex canonical ID off-by-one

**File:** `core/src/math/hex-math.ts` — `getCanonicalVertexId()`

**Bug:** A vertex at corner `i` of a hex is shared with the neighbors at directions `i` and `(i+1) % 6`. The code uses `(corner + 5) % 6` instead of `(corner + 1) % 6`, which picks the wrong third hex.

This means:
1. The vertex ID is not canonical (selecting the same vertex from different hexes gives different IDs)
2. The Inspector shows wrong "meeting hexes"

```ts
// CURRENT (wrong):
const n2 = hexNeighbor(hex, (corner + 5) % 6);

// FIX:
const n2 = hexNeighbor(hex, (corner + 1) % 6);
```

**Verification:** For hex (0,0,0) corner 0:
- n1 = neighbor at direction 0 = (1,-1,0)
- n2 should = neighbor at direction 1 = (1,0,-1) [shares the east vertex]
- All three hexes meeting at that vertex: (0,0,0), (1,-1,0), (1,0,-1) ✓

**Tests:**
- `getCanonicalVertexId(hexA, cornerI)` equals the canonical ID computed from the two sharing neighbors
- Round-trip from all three sharing hexes → same ID

**Commit:** `"fix: correct vertex canonical ID neighbor calculation"`

---

### A4. Map format compatibility (`grid:` → `layout:`)

**Files:** `core/src/format/loader.ts`, `core/src/format/document.ts`

**Bug:** `HexMapLoader.load()` requires a `layout:` section with `layout.all` defining the map extent. But `battle-for-moscow.hexmap.yaml` uses the older `grid:` key. The `HexMapDocument.toJS()` doesn't migrate `grid` to `layout`.

**Fix options (pick one):**
1. **Migrate the map file** to use `layout:` with an `all:` HexPath (e.g., `"0101 13ne 10se 13sw ;"`). Simple but requires updating all map files.
2. **Add fallback in loader** to accept `grid:` and synthesize the extent from `columns`/`rows`. More robust.
3. **Add migration in `HexMapDocument.toJS()`** that maps `grid` → `layout` properties.

**Recommended:** Option 2 — the loader should handle both. When `layout:` is missing but `grid:` is present, synthesize `all` from `grid.columns`/`grid.rows` using `createRectangularGrid`.

```ts
// In HexMapLoader.load():
const layout = json.layout ?? json.grid;
if (!layout) throw new Error("Missing mandatory 'layout' or 'grid' section");

// If 'all' is missing but columns/rows present, synthesize extent
if (!layout.all && layout.columns && layout.rows) {
    // Generate hex list from rectangular grid
    const validHexes = Hex.createRectangularGrid(
        layout.columns, layout.rows, stagger, firstCol, firstRow
    );
    // ... proceed with validHexes directly
}
```

**Also:** `MapModel` constructor already has `doc.layout ?? doc.grid` (line 40), so it's partially handled there. Make the loader match.

**Tests:**
- Load `battle-for-moscow.hexmap.yaml` (uses `grid:`) → succeeds
- Load a map with `layout: { all: "..." }` → succeeds
- Load a map with neither → throws clear error

**Commit:** `"fix: loader accepts both grid: and layout: map format"`

---

### A5. Missing `featuresAtHex` and `hexIdsForFeature` on MapModel

**File:** `editor/src/model/map-model.ts`

**Bug:** The refactored `MapModel` dropped these two methods that `selection.ts` calls:
- `featuresAtHex(hexId)` — needed by `topmostFeatureAtHex()` for canvas→stack linking
- `hexIdsForFeature(index)` — needed by `highlightsForSelection()` and `highlightsForHover()`

Both depend on feature `hexIds` being populated, which are currently empty (`hexIds: []`).

**Fix:**
1. Populate `hexIds` on each `FeatureItem` during construction by resolving `feature.at` via `HexPath`
2. Build a reverse index `hexId → FeatureItem[]` for `featuresAtHex`
3. Implement both methods

```ts
// In constructor, after mesh is built:
const meshHexPath = new HexPath(this._mesh, { labelFormat, stagger, firstCol, firstRow });
this._features = (doc.features || []).map((f: any, idx: number) => {
    let hexIds: string[] = [];
    if (f.at) {
        try {
            const result = meshHexPath.resolve(f.at);
            hexIds = result.items;
        } catch (e) { /* skip unresolvable */ }
    }
    return { index: idx, terrain: f.terrain, ..., hexIds, raw: f };
});

// Build reverse index
this._hexToFeatures = new Map<string, FeatureItem[]>();
for (const f of this._features) {
    for (const hid of f.hexIds) {
        if (!this._hexToFeatures.has(hid)) this._hexToFeatures.set(hid, []);
        this._hexToFeatures.get(hid)!.push(f);
    }
}

hexIdsForFeature(index: number): string[] {
    return this._features[index]?.hexIds ?? [];
}

featuresAtHex(hexId: string): FeatureItem[] {
    return this._hexToFeatures.get(hexId) ?? [];
}
```

**Also fix:** `computedHex().contributingFeatures` — currently hardcoded to `[]`. Should use `this.featuresAtHex(hexId)`.

**Tests:**
- `hexIdsForFeature(forestIndex)` → returns correct hex IDs
- `featuresAtHex(forestHex)` → includes forest feature
- Feature hover in stack → canvas highlights correct hexes
- Canvas hex click → Inspector shows contributing features

**Commit:** `"fix: restore feature↔hex mapping in MapModel"`

---

### A6. HexPath `isPointInPolygon` type mismatch

**File:** `core/src/hexpath/hex-path.ts` — `isPointInPolygon()`

**Bug:** Passes `stagger` (a `Stagger` enum = `1` or `-1`) as the `orientation` parameter of `hexToPixel`, which expects `'flat' | 'pointy'`. TypeScript doesn't catch this because `Stagger` is a numeric enum and the overloaded signature isn't strict enough.

```ts
// CURRENT (wrong):
const stagger = this.options.stagger ?? Hex.Stagger.Odd;
const pixI = Hex.hexToPixel(vi, 10, stagger); // stagger is 1/-1, not 'flat'/'pointy'

// FIX:
const pixI = Hex.hexToPixel(vi, 10, 'flat'); // or pass orientation from options
```

**Impact:** The fill (`!` operator) produces incorrect interior detection. Since `hexToPixel` with an invalid orientation falls through to the `else` (pointy-top) branch, fill results will be wrong for flat-top maps.

**Fix:** HexPath should accept an `orientation` option, defaulting to `'flat'`. Pass it to `hexToPixel`.

**Tests:**
- `HexPath.resolve("0101 3ne 3se 3sw !")` → interior hexes correctly identified
- Same test with pointy-top orientation

**Commit:** `"fix: correct orientation parameter in HexPath fill"`

---

### A7. DIRECTIONS comment inaccuracy

**File:** `core/src/math/hex-math.ts` — comments on lines 6-8

**Bug:** The comments say "0=NE, 1=E, 2=SE" but the actual vectors show direction 1 is `(1,0,-1)` which is SE, not E. For flat-top hexes, there is no pure E direction. Similarly, direction 4 `(-1,0,1)` is NW, not W.

**Fix:** Update comments to match reality:
```ts
// Directions: 0=NE, 1=SE, 2=S, 3=SW, 4=NW, 5=N (Flat-top, clockwise from NE)
```

Also update `parseDirection` in HexPath to remove misleading `'e'` and `'w'` mappings, or document them clearly as aliases for SE/NW respectively.

**Commit:** `"docs: fix direction index comments in hex-math"`

---

## Tier B — UX Polish

### B1. Text contrast and readability

**Files:** `editor/src/canvas/draw.ts`, various CSS files

**Problems:**
- Canvas hex labels use `#555555` on `#141414` background = ~2.5:1 contrast ratio (fails WCAG AA)
- Inspector heading font size is 10px — too small for readability
- Feature Stack `feature-at` is 10px in `text-muted` — barely visible

**Fixes:**
- Canvas label color: use `#888888` (`text-secondary`) instead of `#555555` (`text-muted`) — 4.1:1 ratio
- Inspector headings: increase to 11px
- Feature Stack `feature-at`: increase to `var(--font-size-xs)` (11px) and use `text-secondary`
- Consider a minimum font size of 11px for all UI text

**Commit:** `"style: improve text contrast and minimum font sizes"`

---

### B2. Scalable canvas hex labels

**File:** `editor/src/canvas/draw.ts` — label drawing section

**Bug:** Labels are drawn at fixed `10px monospace` regardless of zoom. They should scale with the hex size to maintain the "real map" feel.

**Fix:** Calculate font size from hex screen-space radius:
```ts
const hexScreenRadius = Math.sqrt(
    Math.pow(h0.corners[0].x - h0.center.x, 2) +
    Math.pow(h0.corners[0].y - h0.center.y, 2)
);
const fontSize = Math.max(8, Math.min(16, hexScreenRadius * 0.45));
ctx.font = `${fontSize}px monospace`;
```

This scales linearly with zoom, clamped between 8px and 16px. The `labelMinZoom` threshold should also be adjusted — labels should hide when hexes are too small (radius < ~12px), not at a fixed pixel cutoff.

**Commit:** `"style: scale canvas labels with zoom level"`

---

### B3. Scroll/zoom sensitivity and bounds

**File:** `editor/src/canvas/CanvasHost.tsx` — `handleWheel`

**Problems:**
1. No `deltaMode` handling — trackpad (pixel deltas) and mouse wheel (line deltas) behave very differently
2. No zoom bounds — can zoom to infinity or to zero
3. Fixed 0.9/1.1 factor per event feels too sensitive on trackpads

**Fix:**
```ts
const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault(); // prevent page scroll
    if (!viewport) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    // Normalize delta across input devices
    let delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 40;  // line mode → pixel approximation
    if (e.deltaMode === 2) delta *= 800; // page mode → pixel approximation

    // Smooth zoom factor (smaller changes for smoother feel)
    const factor = Math.pow(0.998, delta); // ~0.9 per 50px of scroll

    setViewport(vp => {
        if (!vp) return null;
        const newVp = zoomAt(vp, pt, factor);
        // Clamp zoom between 10% and 2000% of fit zoom
        const minZoom = fitZoom * 0.1;
        const maxZoom = fitZoom * 20;
        if (newVp.zoom < minZoom || newVp.zoom > maxZoom) return vp;
        onZoomChange?.(Math.round((newVp.zoom / fitZoom) * 100));
        return newVp;
    });
}, [viewport, onZoomChange, fitZoom]);
```

**Commit:** `"fix: normalize scroll sensitivity and add zoom bounds"`

---

### B4. Edge/vertex geometry highlighting

**Files:** `editor/src/model/scene.ts`, `editor/src/canvas/draw.ts`, `editor/src/model/selection.ts`

**Problem:** Edge and vertex selections highlight adjacent hexes, not the actual geometric element. The user expectation (and UX design doc) is that selecting an edge highlights the edge line, and selecting a vertex highlights the vertex point.

**Fix — Scene types:**
```ts
export interface EdgeRenderItem {
    boundaryId: string;
    p1: Point;  // screen-space endpoints of the shared edge
    p2: Point;
    color: string;
}

export interface VertexRenderItem {
    vertexId: string;
    point: Point;  // screen-space vertex position
    color: string;
}

export interface Scene {
    background: string;
    hexagons: HexRenderItem[];
    highlights: HighlightRenderItem[];  // hex fills (keep for feature highlights)
    edgeHighlights: EdgeRenderItem[];
    vertexHighlights: VertexRenderItem[];
}
```

**Fix — `highlightsForSelection`:** For edge/vertex selections, return geometry-specific items instead of hex fills:

```ts
case 'edge':
    // Parse boundary ID to get the two hex cubes
    // Compute the shared edge segment (two corner positions)
    // Return an EdgeRenderItem
case 'vertex':
    // Parse vertex ID to get the three hex cubes
    // Compute the vertex position (average of meeting corners)
    // Return a VertexRenderItem
```

**Fix — `drawScene`:** Add drawing for edge and vertex highlights:
```ts
// Edge highlights: thick colored line
for (const edge of scene.edgeHighlights) {
    ctx.beginPath();
    ctx.moveTo(edge.p1.x, edge.p1.y);
    ctx.lineTo(edge.p2.x, edge.p2.y);
    ctx.strokeStyle = edge.color;
    ctx.lineWidth = 3;
    ctx.stroke();
}

// Vertex highlights: colored dot
for (const vtx of scene.vertexHighlights) {
    ctx.beginPath();
    ctx.arc(vtx.point.x, vtx.point.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = vtx.color;
    ctx.fill();
}
```

**Note:** The two adjacent hexes can still get a subtle tint for context, but the primary visual should be the edge line or vertex dot.

**Commit:** `"feat: render edge and vertex selection as geometry, not hex fills"`

---

### B5. Off-board hit test guarding

**File:** `editor/src/model/hit-test.ts` — `hitTest()`

**Bug:** Vertex and edge hit detection runs before the on-map hex check. Clicking off-board near a map edge returns vertex/edge selections for hexes that don't exist on the map.

**Fix:** After computing the nearest hex, check if it's on the map before checking vertex/edge distances:

```ts
const area = model.mesh.getHex(id);
if (!area) return null;  // Off-map: no hit

// Now check vertex/edge/hex thresholds...
```

Alternatively, only return vertex/edge hits if at least one of the participating hexes is on the map.

**Commit:** `"fix: guard off-board vertex/edge hits"`

---

### B6. Missing CSS classes in Inspector

**File:** `editor/src/components/Inspector.css`

**Bug:** Inspector.tsx references 5 CSS classes that don't exist:
- `.text-xs` — used for boundary/junction IDs
- `.clickable` — used for contributing feature list items
- `.inspector-list` — wrapper for feature/hex lists
- `.inspector-list-item` — individual list items
- `.neighbor-grid` — neighbor hex label grid

**Fix:** Add the missing CSS:
```css
.text-xs {
    font-size: 10px;
}

.clickable {
    cursor: pointer;
}
.clickable:hover {
    color: var(--accent-hex);
}

.inspector-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
}

.inspector-list-item {
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    padding: var(--space-xs) 0;
}

.neighbor-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-xs);
    font-size: var(--font-size-sm);
}
```

**Commit:** `"style: add missing Inspector CSS classes"`

---

### B7. Arrow key navigation cleanup

**File:** `editor/src/canvas/CanvasHost.tsx` — `handleKeyDown`

**Bug:** Arrow keys emit fake `HitResult` objects with `hexId: 'NAV'` and the direction encoded in `label`. App.tsx has to special-case this hack. This is fragile and conflates navigation with hit testing.

**Fix:** Add a dedicated `onNavigate?: (direction: number) => void` callback to `CanvasHostProps`:

```ts
// CanvasHost:
onNavigate?.(directionForKey[e.key]);

// App.tsx:
<CanvasHost
    onNavigate={handleNavigate}
    ...
/>
```

Remove the `NAV` hack from both `CanvasHost` and `App`.

**Commit:** `"refactor: replace arrow key NAV hack with dedicated callback"`

---

### B8. Feature Stack `off_map` display and color chip visibility

**File:** `editor/src/components/FeatureStack.tsx`

**Problems:**
1. The first feature shows as "off_map" with empty `at` — confusing. This is the `@all` base feature with `terrain: off_map`. Should display distinctively.
2. Color chips have no border, making dark-colored chips invisible against the dark background.

**Fixes:**
- Add a `1px solid #444` border to `.feature-color-chip`
- Display the `@all` / base feature with its actual `at` value and indicate it's the base terrain
- If `feature.at === '@all'` or terrain is a base terrain like `off_map`, mark `isBase: true` in the model and use the existing `[data-base="true"]` CSS styling to pin it at the bottom

**Commit:** `"style: improve feature stack color chips and base feature display"`

---

### B9. HiDPI / Retina canvas rendering

**File:** `editor/src/canvas/CanvasHost.tsx`

**Bug:** The canvas doesn't account for `devicePixelRatio`, so it renders blurry on Retina displays (the TODO comment on line 93 acknowledges this).

**Fix:**
```ts
const dpr = window.devicePixelRatio || 1;
canvasRef.current.width = viewport.width * dpr;
canvasRef.current.height = viewport.height * dpr;
ctx.scale(dpr, dpr);
// CSS size stays at viewport.width × viewport.height
```

**Commit:** `"fix: support HiDPI canvas rendering"`

---

## Tier C — HexPath Entry & Live Preview (New Phase 4 Features)

These are the features described in the UX design doc Phase 4 section. They depend on Tier A/B being complete (particularly A1-A6 for correct geometry and A5 for feature↔hex mapping).

### C1. Command bar HexPath parsing

**Files:** `editor/src/components/CommandBar.tsx`, new `editor/src/model/hex-path-preview.ts`

**Design:** When the user types into the command bar (no prefix), parse the input as a HexPath expression in real-time using `@hexmap/core`'s `HexPath.resolve()`.

**Implementation:**
1. Create `hex-path-preview.ts` with a `parseCommandInput(input: string, model: MapModel)` function
2. Returns `{ hexIds: string[], type: GeometryType, error?: { message: string, offset: number } }`
3. Debounce parsing (100ms) to avoid thrashing on fast typing
4. Pass the parsed result up via `onPreview?: (result: HexPathPreview | null) => void` callback

**State flow:**
```
CommandBar onChange → parseCommandInput → App state update → highlights + ghost geometry
```

**Error handling:** Wrap `HexPath.resolve()` in try/catch. On error, extract useful position info if possible and return it for inline error display.

**Commit:** `"feat: real-time HexPath parsing in command bar"`

---

### C2. Ghost geometry on canvas

**Files:** `editor/src/canvas/draw.ts`, `editor/src/model/scene.ts`

**Design:** HexPath preview results render as dashed accent outlines on the canvas — distinct from selection highlights (solid) and terrain fills.

**Implementation:**
Add a `ghostHexagons: GhostRenderItem[]` array to `Scene`:
```ts
export interface GhostRenderItem {
    hexId: string;
    corners: Point[];
    type: GeometryType;  // determines accent color
}
```

Drawing (after hex fills, before labels):
```ts
for (const ghost of scene.ghostHexagons) {
    ctx.beginPath();
    // ... path from corners
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = accentColorForType(ghost.type);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    // Light fill tint
    ctx.fillStyle = `${accentColorForType(ghost.type)}11`;
    ctx.fill();
}
```

**App wiring:** `App.tsx` passes `ghostHexIds` from the command bar preview to `CanvasHost`, which passes them through `buildScene` to the Scene object.

**Commit:** `"feat: render HexPath ghost geometry on canvas"`

---

### C3. Command bar syntax highlighting

**File:** `editor/src/components/CommandBar.tsx`

**Design:** Color-code different HexPath tokens in the input:
- Coordinates (e.g., `0101`, `A3`): `accent-hex` cyan
- Directions (e.g., `3ne`, `se`): white/primary
- Operators (`+`, `-`, `,`, `;`, `!`): `text-secondary`
- Errors: red underline

**Implementation:** Overlay a `<div>` with syntax-highlighted spans on top of the `<input>`, using the same font/positioning. The input is transparent text, the overlay is non-interactive (`pointer-events: none`).

This is a standard technique used by code editors. The tokenizer from `HexPath.tokenize()` (currently private) should be exposed or reimplemented for the editor.

**Alternative:** Use a `contentEditable` div instead of `<input>` for direct inline coloring. More complex but avoids the overlay alignment issues.

**Commit:** `"feat: HexPath syntax highlighting in command bar"`

---

### C4. Inline parse errors

**File:** `editor/src/components/CommandBar.tsx`

**Design:** When `HexPath.resolve()` throws, show a red underline on the problematic token and a tooltip with the error message.

**Implementation:**
- Parse errors should include a character offset (requires enhancing `HexPath` to report error positions)
- The command bar renders a small error indicator below the input
- A tooltip on hover shows the full error message
- Keep it simple: a single error line below the input, e.g., `"Invalid coordinate: '99ZZ' at position 5"`

**Commit:** `"feat: inline HexPath parse error display"`

---

### C5. Enter creates feature

**Files:** `editor/src/components/CommandBar.tsx`, `App.tsx`

**Design:** Pressing Enter in the command bar with a valid HexPath expression creates a new feature with that `at` value.

**Implementation:**
1. On Enter: if current input parses successfully, emit `onCreateFeature?: (at: string) => void`
2. App.tsx handles this by creating a new `FeatureItem` with `at: input, terrain: 'unknown'`
3. The new feature is added to the model's feature list
4. The feature is auto-selected in the stack
5. The command bar clears
6. Inspector shows the new feature for attribute editing (Phase 5 will make this editable)

**Note:** Full feature editing is Phase 5. Phase 4 just creates the feature with a terrain placeholder. The user can see it appear in the stack and on the canvas.

**Commit:** `"feat: Enter in command bar creates feature from HexPath"`

---

### C6. Auto-generation from canvas selection

**Files:** `App.tsx`, `editor/src/model/hex-path-preview.ts`

**Design:** When hexes are selected on the canvas, auto-populate the command bar with a HexPath expression that selects those hexes.

**Implementation (basic):**
- Single hex: show the label (e.g., `0507`)
- For Phase 4, just show the single hex label. Multi-hex path generation (convex hull, path tracing) is a Phase 5+ optimization.

**State flow:**
```
Canvas click → selection update → if hex selected, set commandValue to label
```

**Commit:** `"feat: auto-populate command bar from canvas hex selection"`

---

### C7. Command mode (`>` prefix)

**Files:** `editor/src/components/CommandBar.tsx`, new `editor/src/model/commands.ts`

**Design:** Typing `>` switches to command mode. A filtered list of commands appears.

**Initial commands:**
- `>zoom fit` — reset zoom to fit
- `>toggle stack` — toggle left panel
- `>toggle inspector` — toggle right panel

**Implementation:**
```ts
interface Command {
    id: string;
    label: string;
    description: string;
    action: () => void;
}
```

When input starts with `>`, show a dropdown with filtered commands. Enter executes the selected command.

**Commit:** `"feat: command mode with > prefix in command bar"`

---

## Task Ordering and Dependencies

```
Tier A (correctness):
  A1 (stagger) ─────┐
  A2 (edge dir) ─────┤
  A3 (vertex ID) ────┤── all independent, can parallelize
  A4 (format compat) ┤
  A6 (HexPath fill) ─┤
  A7 (comments) ──────┘
  A5 (feature mapping) ── depends on A4 (loader must work first)

Tier B (UX polish):
  B1 (contrast) ─────┐
  B2 (scale labels) ──┤
  B3 (scroll) ────────┤── all independent
  B5 (off-board) ─────┤── depends on A2 (correct edge direction)
  B6 (CSS) ───────────┤
  B7 (arrow keys) ────┤
  B8 (feature stack) ─┤
  B9 (HiDPI) ─────────┘
  B4 (geometry hl) ── depends on A2, A3 (correct edge/vertex IDs)

Tier C (new features):
  C1 (parsing) ── depends on A1, A5, A6 (correct geometry + working features)
  C2 (ghost) ── depends on C1
  C3 (syntax hl) ── depends on C1
  C4 (parse errors) ── depends on C1
  C5 (enter create) ── depends on C1
  C6 (auto-gen) ── independent of C1
  C7 (command mode) ── independent of C1
```

**Recommended execution order:**
1. A1 + A2 + A3 + A4 + A6 + A7 (parallel core fixes)
2. A5 (feature mapping, needs A4)
3. B1-B3 + B5-B9 (parallel UX fixes)
4. B4 (geometry highlighting, needs A2+A3)
5. C1 (HexPath parsing foundation)
6. C2 + C3 + C4 + C5 + C6 + C7 (parallel feature work)

---

## Testing Strategy

- **Core fixes (A1-A3, A6-A7):** Unit tests in `core/src/math/hex-math.test.ts`
- **Loader fix (A4):** Integration test loading both `grid:` and `layout:` format maps
- **Feature mapping (A5):** Unit tests on `MapModel.hexIdsForFeature` / `featuresAtHex`
- **Hit test fixes (A2, B5):** Unit tests with known hex geometries
- **UI changes (B1-B9, C1-C7):** Manual smoke testing + existing component tests
- **HexPath preview (C1):** Unit tests on `parseCommandInput`

## Risk Notes

- **A1 (stagger)** is the highest-risk fix — it changes how all offset↔cube conversions work. Must verify with Battle for Moscow visually after the fix.
- **B4 (geometry highlighting)** requires computing edge/vertex screen positions, which introduces new coordinate math that needs careful verification.
- **C3 (syntax highlighting)** has known complexity around overlay alignment. Consider the contentEditable alternative if alignment proves fragile.
