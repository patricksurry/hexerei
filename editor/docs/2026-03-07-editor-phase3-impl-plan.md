# Editor Phase 3: Selection & Inspection — Implementation Plan

**Goal:** Validate the first interactive feedback loop: click → highlight → inspect. Prove that the stack/canvas/inspector triangle is intuitive and that accent colors distinguish geometry types.

**Key design principle:** Selection is data, not UI state. All selection logic, queries, and computed views live in the headless model layer. React components and the canvas are pure renderers of that data.

## API Design — What Needs to Change

Phase 2 built the rendering pipeline: MapModel → Viewport → Scene → Canvas. Phase 3 adds **interaction** to that pipeline. The critical question is: what API surfaces make selection clean?

### Problem 1: MapModel Doesn't Know Feature → Hex Relationships After Construction

`expandHexes()` is private and only used during construction. The resolved hex sets are discarded — only the final terrain map survives. For Phase 3, we need bidirectional queries:

- "What hexes does feature N cover?" (for highlighting feature geometry on canvas)
- "Which features contribute to hex X?" (for inspector's computed hex view)

**Required MapModel changes:**

```ts
class MapModel {
  // NEW: Feature geometry queries
  hexIdsForFeature(featureIndex: number): string[]
  featuresAtHex(hexId: string): FeatureItem[]

  // NEW: Computed hex state (terrain after all features applied, plus metadata)
  computedHex(hexId: string): ComputedHexState | undefined
}

interface ComputedHexState {
  hexId: string;
  label: string;
  terrain: string;
  terrainColor: string;
  elevation?: number;
  contributingFeatures: FeatureItem[];  // in application order
  neighbors: string[];                  // adjacent hex labels
}
```

**Implementation:** Build two indexes during construction:
- `_featureHexIds: Map<number, string[]>` — feature index → hex IDs (from `expandHexes`)
- `_hexFeatures: Map<string, number[]>` — hex ID → feature indices (reverse index)

The base feature (index -1) implicitly covers all hexes not assigned by other features.

### Problem 2: Scene Has No Concept of Highlights

The `Scene` type currently only has `hexagons: HexRenderItem[]`. For selection, we need a separate highlight layer that renders on top of terrain fills with accent-colored outlines and tinted fills.

**Required Scene changes:**

```ts
interface HighlightItem {
  corners: Point[];       // 6 screen-space points (same as HexRenderItem)
  color: string;          // accent color (hex, edge, or vertex accent)
  style: 'select' | 'hover';  // select = solid outline + fill tint; hover = lighter
}

interface Scene {
  background: string;
  hexagons: HexRenderItem[];
  highlights: HighlightItem[];   // NEW
}
```

`buildScene` gains an optional `highlights` parameter:

```ts
interface SceneHighlight {
  hexIds: string[];
  color: string;
  style: 'select' | 'hover';
}

function buildScene(
  model: MapModel,
  viewport: ViewportState,
  background?: string,
  highlights?: SceneHighlight[]   // NEW
): Scene
```

This keeps the scene builder pure — the caller provides highlight data, the builder resolves it to screen-space geometry.

### Problem 3: Hit Testing Only Supports Hexes

Phase 3 needs edge and vertex hit testing for the full accent-color system. Currently `hexAtScreen` returns a hex label or null.

**Required changes:**

Extend hit testing to return a typed hit result:

```ts
type HitResult =
  | { type: 'hex'; hexId: string; label: string }
  | { type: 'edge'; boundaryId: string; hexIds: [string, string] }
  | { type: 'vertex'; vertexId: string; hexIds: string[] }
  | null;

function hitTest(
  screenPt: Point,
  viewport: ViewportState,
  model: MapModel
): HitResult
```

Logic: find the nearest hex center. Then check if the click point is closer to an edge midpoint or vertex than to the hex center. Use distance thresholds proportional to hex size:
- Within 25% of hex radius from a vertex → vertex hit
- Within 30% of hex radius from an edge midpoint → edge hit
- Otherwise → hex hit

This requires **core additions**:

```ts
// NEW in Hex namespace
function hexEdgeMidpoints(center: Point, size: number, orientation: HexOrientation): Point[]
// Returns 6 midpoints: average of corners[i] and corners[(i+1)%6]
```

`hexCorners` already exists for vertex positions.

### Problem 4: FeatureItem Type Is Duplicated

`FeatureItem` is defined in both `model/map-model.ts` and `types.ts` with slightly different shapes (`tags: string[]` vs `tags?: string[]`). Components import from `types.ts` but receive data from MapModel.

**Fix:** Single source of truth. Define `FeatureItem` in `types.ts`, import it in MapModel. Ensure `tags` is non-optional (`string[]`, defaulting to `[]`).

### Problem 5: FeatureStack Uses Its Own Color Hash

`FeatureStack` has an inline `getTerrainColor()` hash function, but MapModel already has `terrainColor()` which uses the actual terrain definitions. Features should show the real terrain color.

**Fix:** Pass `terrainColorFn: (terrain: string) => string` to FeatureStack, wired from `model.terrainColor`. Remove the inline hash.

### Problem 6: Selection Type Needs a Richer Model

The current `Selection` type in `types.ts` is a discriminated union which is fine, but Phase 3 needs selection state transitions (multi-select, shift-click, cmd-click) and linking logic (click hex → find topmost feature). These should be pure functions, not scattered across React components.

**New module:** `editor/src/model/selection.ts`

```ts
import { Selection } from '../types';
import { MapModel } from './map-model';

// Pure state transitions
function selectHex(hexId: string): Selection
function selectEdge(boundaryId: string): Selection
function selectVertex(vertexId: string): Selection
function selectFeature(index: number, current: Selection, modifier: 'none' | 'shift' | 'cmd'): Selection
function clearSelection(): Selection

// Derived queries
function highlightsForSelection(selection: Selection, model: MapModel): SceneHighlight[]
function topmostFeatureAtHex(hexId: string, model: MapModel): number | null
```

`highlightsForSelection` is the bridge between selection state and the scene:
- `selection.type === 'hex'` → highlight that hex with `accent-hex` color
- `selection.type === 'feature'` → get hexIds from `model.hexIdsForFeature()`, highlight with `accent-hex`
- `selection.type === 'edge'` → highlight adjacent hexes with `accent-edge`

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  @hexmap/core                                           │
│                                                         │
│  NEW: Hex.hexEdgeMidpoints                              │
│  FIX: Hex.getVertexId (canonical vertex IDs)            │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  editor/src/model/  (headless, testable, no React)      │
│                                                         │
│  MapModel    — + hexIdsForFeature, featuresAtHex,       │
│                  computedHex                             │
│  selection   — pure selection state + transitions       │
│  hitTest     — hex/edge/vertex hit detection             │
│  buildScene  — + highlights parameter                   │
│  viewport    — (unchanged)                              │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  editor/src/canvas/                                     │
│                                                         │
│  drawScene   — + highlight rendering (outlines, tints)  │
│  CanvasHost  — + click handler → hitTest → selection    │
└─────────────────────────────────────────────────────────┘
```

## Acceptance Criteria

- [ ] Click hex on canvas → `accent-hex` highlight, Inspector shows computed hex state
- [ ] Click edge on canvas → `accent-edge` highlight, Inspector shows edge attributes
- [ ] Click feature row in stack → feature's hexes highlighted on canvas, Inspector shows feature properties
- [ ] Hover feature row → lighter preview highlight on canvas
- [ ] Multi-select features with Shift+click and Cmd+click
- [ ] Click hex on canvas → FeatureStack highlights topmost contributing feature
- [ ] Arrow keys nudge hex selection to adjacent hex
- [ ] Escape clears selection
- [ ] All selection/query/highlight logic has unit tests (no DOM)
- [ ] `npm test` passes in both `core/` and `editor/`

---

## Tasks

### Task 1: Core — Edge Midpoints + Vertex ID Fix

**Files:**
- Modify: `core/src/math/hex-math.ts`
- Modify: `core/src/math/hex-math.test.ts`

**1a. `hexEdgeMidpoints`**

```ts
export function hexEdgeMidpoints(
  center: Point, size: number, orientation: HexOrientation = 'flat'
): Point[]
```

Returns 6 midpoints. Midpoint `i` is the average of `corners[i]` and `corners[(i+1)%6]`.

Each midpoint corresponds to edge direction `i` (0=E, 1=SE, 2=SW, 3=W, 4=NW, 5=NE for flat-top).

**1b. Canonical vertex IDs**

`getVertexId` is currently a placeholder (`hexId@corner`). Replace with canonical IDs: a vertex is shared by up to 3 hexes. Canonicalize by sorting the IDs of the 3 hexes that share the vertex and joining them.

For flat-top hex, vertex `i` is shared with:
- corner 0: hex, neighbor(0), neighbor(5)
- corner 1: hex, neighbor(0), neighbor(1)
- corner 2: hex, neighbor(1), neighbor(2)
- corner 3: hex, neighbor(2), neighbor(3)
- corner 4: hex, neighbor(3), neighbor(4)
- corner 5: hex, neighbor(4), neighbor(5)

```ts
export function getCanonicalVertexId(hex: Cube, corner: number): string {
  const n1 = hexNeighbor(hex, corner);
  const n2 = hexNeighbor(hex, (corner + 5) % 6);
  const ids = [hexId(hex), hexId(n1), hexId(n2)].sort();
  return ids.join('^');
}
```

**Tests:**
- `hexEdgeMidpoints` returns 6 points, each equidistant from center
- Each midpoint is exactly halfway between its two corners
- `getCanonicalVertexId` is the same regardless of which of the 3 sharing hexes you start from
- Both orientations tested

**Commit:** `"Core: add hexEdgeMidpoints and canonical vertex IDs"`

---

### Task 2: Consolidate FeatureItem Type

**Files:**
- Modify: `editor/src/types.ts`
- Modify: `editor/src/model/map-model.ts`
- Modify: `editor/src/model/map-model.test.ts`

**Step 1:** Make `types.ts` the single source of truth for `FeatureItem`:
- `tags: string[]` (non-optional, always `[]` if absent)
- Add `hexIds: string[]` field (resolved hex IDs for this feature's geometry)

**Step 2:** Remove `FeatureItem` interface from `map-model.ts`. Import from `../types.js`.

**Step 3:** During MapModel construction, populate `hexIds` on each FeatureItem from `expandHexes()`. For the base feature (index -1), `hexIds` is empty (it implicitly covers "everything else").

**Step 4:** Update tests.

**Commit:** `"Editor: consolidate FeatureItem type, add hexIds field"`

---

### Task 3: MapModel — Feature↔Hex Queries

**Files:**
- Modify: `editor/src/model/map-model.ts`
- Modify: `editor/src/model/map-model.test.ts`

**Step 1:** Build reverse index `_hexFeatures: Map<string, number[]>` during construction:
- For each non-base feature, for each hexId in its `hexIds`, append the feature index.

**Step 2:** Add query methods:

```ts
// Hex IDs for a feature (already on FeatureItem.hexIds, but exposes it cleanly)
hexIdsForFeature(featureIndex: number): string[]

// Features affecting a specific hex, in application order (base last)
featuresAtHex(hexId: string): FeatureItem[]

// Full computed state for a hex
computedHex(hexId: string): ComputedHexState | undefined
```

`computedHex` returns:
```ts
interface ComputedHexState {
  hexId: string;
  label: string;
  terrain: string;
  terrainColor: string;
  elevation?: number;
  contributingFeatures: FeatureItem[];
  neighborLabels: string[];
}
```

`neighborLabels` uses `HexMesh.getNeighbors()` → `hexIdToLabel()`.

**Tests:**
- `hexIdsForFeature(forestFeatureIndex)` returns expected hex IDs
- `featuresAtHex(forestHexId)` includes both the forest feature and the base feature
- `computedHex` returns correct terrain, color, neighbors
- Hex with no explicit feature → `featuresAtHex` returns only base feature

**Commit:** `"Editor: add feature↔hex query methods to MapModel"`

---

### Task 4: Selection Model — Pure State + Transitions

**Files:**
- Create: `editor/src/model/selection.ts`
- Create: `editor/src/model/selection.test.ts`
- Modify: `editor/src/types.ts` (extend Selection type if needed)

**Step 1:** Update `Selection` type to include edge and vertex data:

```ts
export type Selection =
  | { type: 'none' }
  | { type: 'hex'; hexId: string; label: string }
  | { type: 'edge'; boundaryId: string }
  | { type: 'vertex'; vertexId: string }
  | { type: 'feature'; indices: number[] };
```

**Step 2:** Pure transition functions in `selection.ts`:

```ts
function selectHex(hexId: string, label: string): Selection
function selectEdge(boundaryId: string): Selection
function selectVertex(vertexId: string): Selection
function selectFeature(
  index: number,
  current: Selection,
  modifier: 'none' | 'shift' | 'cmd'
): Selection
function clearSelection(): Selection
```

`selectFeature` with modifiers:
- `none` → replace selection with `[index]`
- `shift` → range select from current (if current is feature), else single
- `cmd` → toggle index in current selection (add/remove)

**Step 3:** `topmostFeatureAtHex` — given a hex ID, find the last (highest priority) feature that covers it:

```ts
function topmostFeatureAtHex(hexId: string, model: MapModel): number | null
```

This enables the UX: click hex on canvas → highlight the topmost feature in the stack.

**Step 4:** `highlightsForSelection` — pure function that converts selection state to scene highlight data:

```ts
interface SceneHighlight {
  hexIds: string[];
  color: string;
  style: 'select' | 'hover';
}

function highlightsForSelection(
  selection: Selection,
  model: MapModel
): SceneHighlight[]
```

Color mapping:
- `hex` → `accent-hex` (`#00D4FF`)
- `edge` → `accent-edge` (`#FF3DFF`), highlight the two adjacent hexes
- `vertex` → `accent-vertex` (`#FFD600`), highlight the 3 meeting hexes
- `feature` → `accent-hex` (`#00D4FF`), highlight all hexes of selected features

**Step 5:** `highlightsForHover` — same pattern for hover preview:

```ts
function highlightsForHover(
  hoverIndex: number | null,
  model: MapModel
): SceneHighlight[]
```

**Tests:**
- `selectFeature` with `cmd` modifier toggles correctly
- `selectFeature` with `shift` produces range
- `topmostFeatureAtHex` returns the last feature in application order
- `highlightsForSelection` produces correct hex IDs and colors for each selection type
- `clearSelection` returns `{ type: 'none' }`

**Commit:** `"Editor: add headless selection model with transitions and highlight derivation"`

---

### Task 5: Hit Testing — Hex, Edge, and Vertex

**Files:**
- Modify: `editor/src/model/hit-test.ts`
- Modify: `editor/src/model/scene.test.ts` (was the combined hit-test+scene test)
- Create: `editor/src/model/hit-test.test.ts` (separate, focused tests)

**Step 1:** Rename `hexAtScreen` → keep as convenience wrapper, but add `hitTest`:

```ts
type HitResult =
  | { type: 'hex'; hexId: string; label: string }
  | { type: 'edge'; boundaryId: string; hexLabels: [string, string | null] }
  | { type: 'vertex'; vertexId: string }
  | null;

function hitTest(
  screenPt: Point,
  viewport: ViewportState,
  model: MapModel
): HitResult
```

**Step 2:** Implementation:

1. `screenToWorld(screenPt, viewport)` → world point
2. `pixelToHex(worldPt, HEX_SIZE, orientation)` → nearest hex cube
3. Check if hex is in mesh. If not, return null.
4. Compute world-space hex center, edge midpoints, and corners for the nearest hex.
5. Compute distances from the world click point to:
   - Hex center
   - Each of the 6 edge midpoints
   - Each of the 6 corners (vertices)
6. Find the minimum distance. Apply thresholds (as fraction of hex size):
   - Vertex: distance < `HEX_SIZE * 0.25` → vertex hit
   - Edge: distance < `HEX_SIZE * 0.30` → edge hit
   - Otherwise → hex hit

For edge hits, compute boundary ID from the hex and the edge direction.
For vertex hits, compute canonical vertex ID from the hex and corner index.

**Step 3:** Keep `hexAtScreen` as a simple wrapper:

```ts
function hexAtScreen(...): string | null {
  const hit = hitTest(...);
  if (hit?.type === 'hex') return hit.label;
  if (hit) return model.hexIdToLabel(/* nearest hex */);
  return null;
}
```

This preserves the status bar behavior (always shows nearest hex regardless of selection type).

**Tests:**
- Click at hex center → hex hit
- Click near edge midpoint → edge hit with correct boundary ID
- Click near vertex → vertex hit with correct vertex ID
- Click off map → null
- `hexAtScreen` backward compatibility

**Commit:** `"Editor: extend hit testing for hex, edge, and vertex selection"`

---

### Task 6: Scene — Highlight Rendering

**Files:**
- Modify: `editor/src/model/scene.ts`
- Modify: `editor/src/model/scene.test.ts` (or create separate highlight test)
- Modify: `editor/src/canvas/draw.ts`
- Modify: `editor/src/canvas/draw.test.ts`

**6a. `buildScene` gains highlights**

Add `highlights?: SceneHighlight[]` parameter to `buildScene`. For each highlight:
1. Resolve `hexIds` to hex cubes
2. Compute screen-space corners (same transform as hex rendering)
3. Emit `HighlightItem` with corners, color, and style

```ts
interface HighlightItem {
  corners: Point[];
  color: string;
  style: 'select' | 'hover';
}

interface Scene {
  background: string;
  hexagons: HexRenderItem[];
  highlights: HighlightItem[];  // NEW
}
```

**6b. `drawScene` renders highlights**

After drawing hex fills and outlines, draw highlights:

```ts
for (const hl of scene.highlights) {
  ctx.beginPath();
  // ... path from corners
  ctx.closePath();

  if (hl.style === 'select') {
    ctx.fillStyle = `${hl.color}33`;  // 20% alpha tint
    ctx.fill();
    ctx.strokeStyle = hl.color;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {  // hover
    ctx.fillStyle = `${hl.color}1A`;  // 10% alpha tint
    ctx.fill();
  }
}
```

Draw highlights *after* hexes so they layer on top. Draw labels *after* highlights so they remain readable.

**Tests:**
- `buildScene` with highlights → `scene.highlights` has correct count
- Highlight corners are in screen space
- Draw test verifies highlight stroke/fill calls

**Commit:** `"Editor: add highlight layer to Scene and drawScene"`

---

### Task 7: Inspector — Computed Hex View

**Files:**
- Modify: `editor/src/components/Inspector.tsx`
- Modify: `editor/src/components/Inspector.test.tsx`

**Step 1:** Add hex inspection panel. When `selection.type === 'hex'`:

```tsx
const hexState = model.computedHex(selection.hexId);
// Show: label, terrain, terrainColor chip, elevation, contributing features, neighbors
```

Display sections:
- **COORDINATE**: label in monospace
- **TERRAIN**: terrain name + color chip
- **ELEVATION**: if defined
- **CONTRIBUTING FEATURES**: list of features affecting this hex (in application order), each clickable to select that feature
- **NEIGHBORS**: adjacent hex labels in monospace

**Step 2:** Add edge/vertex inspection stubs. When `selection.type === 'edge'`:
- Show boundary ID
- Show the two hexes this edge separates

When `selection.type === 'vertex'`:
- Show vertex ID
- Show the hexes that meet at this vertex

**Step 3:** Inspector needs `model: MapModel` prop (not just individual fields). Currently it receives `features`, `mapTitle`, `mapLayout` separately. Clean this up:

```ts
interface InspectorProps {
  selection: Selection;
  model: MapModel | null;
}
```

The Inspector queries what it needs from the model directly. This eliminates prop drilling and makes Inspector's data needs explicit.

**Tests:**
- Hex selection → shows computed terrain, contributing features
- Feature selection → shows feature properties (existing, verify still works)
- No selection → shows map metadata (existing, wire from model)
- Edge/vertex stubs render without error

**Commit:** `"Editor: wire Inspector to computed hex state from MapModel"`

---

### Task 8: FeatureStack — Real Colors + Hover Linking

**Files:**
- Modify: `editor/src/components/FeatureStack.tsx`
- Modify: `editor/src/components/FeatureStack.test.tsx`

**Step 1:** Replace inline `getTerrainColor` hash with `terrainColorFn` prop:

```ts
interface FeatureStackProps {
  features: FeatureItem[];
  selectedIndices?: number[];
  terrainColor: (terrain: string) => string;  // from model.terrainColor
  onSelect?: (indices: number[], modifier: 'none' | 'shift' | 'cmd') => void;
  onHover?: (index: number | null) => void;
}
```

**Step 2:** Pass modifier info from click events:

```tsx
onClick={(e) => onSelect?.([feature.index],
  e.shiftKey ? 'shift' : e.metaKey ? 'cmd' : 'none'
)}
```

**Step 3:** Highlight the topmost feature when a hex is selected on canvas. This is handled in App.tsx by deriving `selectedIndices` from `selection`:

- If `selection.type === 'hex'` → `topmostFeatureAtHex(selection.hexId, model)`
- If `selection.type === 'feature'` → `selection.indices`

**Tests:**
- Color chip uses provided `terrainColor` function
- Click with modifier calls `onSelect` with correct modifier
- Selected feature has `aria-selected="true"`

**Commit:** `"Editor: wire FeatureStack to real terrain colors and modifier-aware selection"`

---

### Task 9: CanvasHost — Click + Arrow Key Interaction

**Files:**
- Modify: `editor/src/canvas/CanvasHost.tsx`
- Modify: `editor/src/canvas/CanvasHost.css`

**Step 1:** Add `onClick` handler that calls `hitTest` and reports the result:

```ts
interface CanvasHostProps {
  model: MapModel | null;
  onCursorHex?: (label: string | null) => void;
  onZoomChange?: (zoom: number) => void;
  onHitTest?: (result: HitResult) => void;   // NEW
}
```

On mouse up (without drag): call `hitTest(screenPt, viewport, model)` → `onHitTest(result)`.

Distinguish click from drag: if mouse moved less than 3px between down and up, it's a click.

**Step 2:** Add `highlights` prop so App can pass computed highlights:

```ts
interface CanvasHostProps {
  // ...existing
  highlights?: SceneHighlight[];   // NEW
}
```

CanvasHost passes `highlights` through to `buildScene`.

**Step 3:** Arrow key navigation. When canvas has focus and a hex is selected:
- Arrow key → compute neighbor hex in that direction
- Update selection to the neighbor hex
- This needs `onNavigate?: (direction: number) => void` callback

Arrow-to-direction mapping for flat-top hexes:
- Right → direction 0 (E)
- Down-Right → not a single key, skip for now
- Left → direction 3 (W)
- Up → direction 5 (NE) or 4 (NW) — need to decide
- Down → direction 1 (SE) or 2 (SW) — need to decide

Simplify for Phase 3: right/left = E/W, up/down = NE/SW. Feels natural on a flat-top hex grid.

**Step 4:** Canvas gets `tabIndex={0}` for keyboard focus. Style the focus ring to be subtle.

**Commit:** `"Editor: add click and arrow key interaction to CanvasHost"`

---

### Task 10: App Integration — Wire Selection Loop

**Files:**
- Modify: `editor/src/App.tsx`
- Modify: `editor/src/App.test.tsx`

**Step 1:** Import selection functions. Wire the full interaction loop:

```tsx
function App() {
  const [model, setModel] = useState<MapModel | null>(null);
  const [selection, setSelection] = useState<Selection>({ type: 'none' });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  // ... existing state

  // Derived: highlights from selection + hover
  const highlights = useMemo(() => {
    if (!model) return [];
    return [
      ...highlightsForSelection(selection, model),
      ...highlightsForHover(hoverIndex, model),
    ];
  }, [selection, hoverIndex, model]);

  // Derived: which feature indices to highlight in stack
  const stackSelectedIndices = useMemo(() => {
    if (!model) return [];
    if (selection.type === 'feature') return selection.indices;
    if (selection.type === 'hex') {
      const idx = topmostFeatureAtHex(selection.hexId, model);
      return idx !== null ? [idx] : [];
    }
    return [];
  }, [selection, model]);

  // Canvas click → selection
  const handleHit = (result: HitResult) => {
    if (!result) { setSelection(clearSelection()); return; }
    if (result.type === 'hex') setSelection(selectHex(result.hexId, result.label));
    if (result.type === 'edge') setSelection(selectEdge(result.boundaryId));
    if (result.type === 'vertex') setSelection(selectVertex(result.vertexId));
  };

  // Feature stack click → selection
  const handleSelectFeature = (indices: number[], modifier: 'none' | 'shift' | 'cmd') => {
    setSelection(prev => selectFeature(indices[0], prev, modifier));
  };

  // Escape → clear
  // Add 'escape' to keyboard shortcuts
}
```

**Step 2:** Pass `model` to Inspector instead of individual props.

**Step 3:** Wire `highlights` to CanvasHost.

**Step 4:** Add `escape` shortcut to clear selection.

**Step 5:** Arrow key navigation:
```tsx
const handleNavigate = (direction: number) => {
  if (!model || selection.type !== 'hex') return;
  const cube = Hex.hexFromId(selection.hexId);
  const neighbor = Hex.hexNeighbor(cube, direction);
  const neighborId = Hex.hexId(neighbor);
  if (model.mesh.getArea(neighborId)) {
    setSelection(selectHex(neighborId, model.hexIdToLabel(neighborId)));
  }
};
```

**Tests:**
- Mock model + click hex → selection state updates
- Selection state → highlights derived correctly
- Escape clears selection
- Arrow key navigation updates selection to neighbor

**Commit:** `"Editor: wire full selection loop through App"`

---

### Task 11: Polish + Visual Verification

**Step 1:** Verify visual appearance:
- [ ] Click hex → cyan outline + tinted fill
- [ ] Click near edge → magenta highlight on adjacent hexes
- [ ] Click near vertex → gold highlight on meeting hexes
- [ ] Click feature row → feature's hexes highlighted on canvas
- [ ] Hover feature row → lighter preview on canvas
- [ ] Shift+click features → multi-select
- [ ] Cmd+click features → toggle feature in selection
- [ ] Click hex → topmost feature highlighted in stack
- [ ] Inspector shows computed hex state with terrain, features, neighbors
- [ ] Arrow keys navigate between hexes
- [ ] Escape clears everything
- [ ] Canvas has focus ring when focused

**Step 2:** Verify no regressions:
- [ ] Pan (drag) still works
- [ ] Zoom (scroll) still works
- [ ] Status bar cursor still updates
- [ ] Cmd+0 zoom to fit
- [ ] Cmd+1 / Cmd+2 toggle panels
- [ ] Canvas resizes properly

**Commit:** `"Editor: Phase 3 polish and visual verification"`

---

## Summary

| Task | Layer | What | Testable? |
|------|-------|------|-----------|
| 1 | Core | hexEdgeMidpoints, canonical vertex IDs | Yes (pure math) |
| 2 | Types | Consolidate FeatureItem, add hexIds | Type cleanup |
| 3 | Model | MapModel hex↔feature queries, computedHex | Yes (no DOM) |
| 4 | Model | Selection state + transitions + highlight derivation | Yes (pure functions) |
| 5 | Model | Hit testing for hex/edge/vertex | Yes (pure math) |
| 6 | Model+Canvas | Scene highlights, drawScene highlight rendering | Yes (mostly) |
| 7 | UI | Inspector computed hex view | Component test |
| 8 | UI | FeatureStack real colors + modifiers | Component test |
| 9 | Canvas | CanvasHost click + arrow keys | Thin UX |
| 10 | App | Wire full selection loop | Integration |
| 11 | Polish | Visual verification | Manual |

**Headless testable surface:** Tasks 1, 3, 4, 5 — all selection logic, queries, and hit testing.
**Scene pipeline:** Task 6 — highlights flow through the same buildScene → drawScene pipeline.
**Thin UX:** Tasks 7, 8, 9 — components render data, forward events.
**Glue:** Tasks 10, 11 — wiring and polish.

## API Changes Requested

### `@hexmap/core` additions:
- `Hex.hexEdgeMidpoints(center, size, orientation)` → 6 midpoints
- `Hex.getCanonicalVertexId(hex, corner)` → canonical vertex ID from 3 sharing hexes

### `MapModel` additions:
- `hexIdsForFeature(index)` → hex IDs for a feature
- `featuresAtHex(hexId)` → features affecting a hex
- `computedHex(hexId)` → full computed hex state

### `FeatureItem` changes:
- Consolidate to single definition in `types.ts`
- Add `hexIds: string[]` field

### `Selection` changes:
- `hex` variant gains `label` field
- Pure state transition functions in `selection.ts`

### `Scene` changes:
- Add `highlights: HighlightItem[]`
- `buildScene` accepts `highlights?: SceneHighlight[]`

### `Inspector` changes:
- Accept `model: MapModel | null` instead of individual field props

### `FeatureStack` changes:
- Accept `terrainColor` function instead of inline hash
- `onSelect` reports click modifier

## Notes for Phase 4

Phase 3 establishes the **interaction primitives** that Phase 4 (HexPath) builds on:
- `hitTest` provides the screen→hex→model pipeline for auto-generating HexPath from canvas clicks
- `highlightsForSelection` provides the rendering pipeline for HexPath ghost geometry previews
- `selectFeature` provides the state management for "Enter creates new feature from current HexPath"
- The command bar just needs to produce `SceneHighlight[]` from parsed HexPath expressions, and the existing pipeline renders them
