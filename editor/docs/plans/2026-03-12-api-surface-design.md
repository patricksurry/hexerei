# API Surface Design: Core / Canvas / Editor Integration

**Date:** 2026-03-12
**Status:** Approved
**Prerequisite for:** Phase 6A (Authoring UX)

---

## Motivation

The Phase 5 review identified 19 API issues across the core/editor boundary. Before building the authoring workflow (Phase 6A-D), we need clean, typed API surfaces so that mutations, undo/redo, and Inspector editing have a solid foundation. The goal is also to extract a reusable `@hexmap/canvas` package that game developers can consume independently of the editor's React UI.

### Principles

- **SOLID / DRY** -- no duplicated logic between packages, single responsibility per module
- **RFC-aligned types** -- core types mirror the HexMap 1.0 schema exactly
- **No legacy** -- remove dead code, unused props, untyped backdoors
- **Extractable** -- the model/scene/interaction layer is framework-agnostic

---

## Architecture After This Work

```
@hexmap/core       -->  data model, hex math, YAML format, HexPath
@hexmap/canvas     -->  map model, scene graph, viewport, interaction, commands
editor/            -->  React UI, Canvas2D draw code, component chrome
```

`@hexmap/renderer` (D3/SVG standalone) is unchanged and out of scope.

---

## Section 1: Core Types (RFC-Aligned)

New typed interfaces in `@hexmap/core`, mirroring the JSON schema and RFC Section 4.

### Document envelope types

```typescript
interface HexMapLayout {
  orientation: Hex.Orientation;
  all: string;
  label?: string;
  origin?: 'top-left' | 'bottom-left' | 'top-right' | 'bottom-right';
  georef?: GeoReference;
}

interface GeoReference {
  scale?: number;
  anchor?: { lat: number; lng: number };
  anchor_hex?: string;
  bearing?: number;
  projection?: string;
}

interface HexMapMetadata {
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

### Terrain types

```typescript
interface TerrainTypeDef {
  name?: string;
  type?: 'base' | 'modifier';
  onesided?: boolean;
  style?: TerrainStyle;
  properties?: Record<string, unknown>;
}

interface TerrainStyle {
  color?: string;
  pattern?: string;
  stroke?: string;
  stroke_width?: number;
}

interface TerrainVocabulary {
  hex?: Record<string, TerrainTypeDef>;
  edge?: Record<string, TerrainTypeDef>;
  vertex?: Record<string, TerrainTypeDef>;
}
```

### Feature type

```typescript
interface Feature {
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

### HexMapDocument typed methods

```typescript
class HexMapDocument {
  addFeature(feature: Feature): void;
  getMetadata(): HexMapMetadata;
  setMetadata<K extends keyof HexMapMetadata>(key: K, value: HexMapMetadata[K]): void;
  getLayout(): HexMapLayout;
  setLayout<K extends keyof HexMapLayout>(key: K, value: HexMapLayout[K]): void;
}
```

### Point unification

The three identical `Point` definitions (in `hex-math.ts`, `mesh/types.ts`, and editor `viewport.ts`) are unified to a single definition in `hex-math.ts`. Other modules import it.

---

## Section 2: Core API Cleanup

### 2a. HexMesh -- typed layout

```typescript
interface HexMeshConfig {
  orientation?: Hex.Orientation;
  firstCol?: number;
  firstRow?: number;
  terrain?: Map<string, string>;
  layout: HexMapLayout;
}

class HexMesh implements MeshMap {
  constructor(validHexes: Cube[], config?: HexMeshConfig);
  get layout(): HexMapLayout;
}
```

`MeshMap.layout` also becomes `HexMapLayout`.

### 2b. Direction codec

```typescript
// In Hex namespace
const DIRECTION_NAMES: { flat: string[]; pointy: string[] };
function directionIndex(name: string, top: HexOrientation): number;
function directionName(index: number, top: HexOrientation): string;
```

Replaces private `directionName()` in editor's `selection.ts` and shares logic with `HexPath.parseDirection()`.

### 2c. Boundary/vertex ID codec

```typescript
// In Hex namespace
function parseBoundaryId(id: string): { hexA: Cube; hexB: Cube | null; direction?: number };
function parseVertexId(id: string): Cube[];
```

Eliminates `|` and `^` delimiter parsing in three editor locations.

### 2d. Label formatting

```typescript
// In Hex namespace
function formatHexLabel(hex: Cube, labelFormat: string, orientation: Orientation): string;
```

Eliminates `MapModel.hexIdToLabel()`.

### 2e. Edge/vertex geometry

```typescript
// In Hex namespace
function edgeEndpoints(hex: Cube, direction: number, size: number, orientation: HexOrientation): [Point, Point];
function vertexPoint(hex: Cube, corner: number, size: number, orientation: HexOrientation): Point;
```

Eliminates inline edge corner formulas in editor's `scene.ts`.

### 2f. Export cleanup

- Remove `PathItem` from public exports (internal to HexPath)
- Unify `Point` to single definition
- Add `exports` field to `package.json`

---

## Section 3: The `@hexmap/canvas` Package

### Package scope

Owns the map model, scene graph, viewport, interaction logic, and command/mutation layer. Framework-agnostic. Usable by anyone building a hex-map frontend (game, viewer, editor).

### What moves from `editor/src/model/`

| Current file | New home | Notes |
|---|---|---|
| `map-model.ts` | `canvas/src/model.ts` | Cleaner types, private constructor |
| `viewport.ts` | `canvas/src/viewport.ts` | Unchanged |
| `scene.ts` | `canvas/src/scene.ts` | Params-object API, SceneHighlight moves here |
| `hit-test.ts` | `canvas/src/hit-test.ts` | HEX_SIZE stays internal |
| `selection.ts` | `canvas/src/selection.ts` | SceneHighlight moves out |
| `hex-path-preview.ts` | `canvas/src/hex-path-preview.ts` | Unchanged |
| `types.ts` | `canvas/src/types.ts` | FeatureItem, Selection, HitResult cleaned up |

### What stays in `editor/`

| File | Reason |
|---|---|
| `canvas/draw.ts` | Canvas2D-specific rendering |
| `canvas/CanvasHost.tsx` | React component |
| All React components | UI framework layer |

### Key API changes

**buildScene() -- params object:**

```typescript
interface SceneOptions {
  background?: string;
  highlights?: SceneHighlight[];
  segmentPath?: string[];
}

function buildScene(model: MapModel, viewport: ViewportState, options?: SceneOptions): Scene;
```

**HitResult -- discriminated union:**

```typescript
type HitResult =
  | { type: 'none' }
  | { type: 'hex'; hexId: string; label: string }
  | { type: 'edge'; boundaryId: string; hexLabels: [string, string | null] }
  | { type: 'vertex'; vertexId: string };
```

**FeatureItem -- typed, no raw backdoor:**

```typescript
interface FeatureItem {
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
```

**MapModel -- private constructor, typed getters:**

```typescript
class MapModel {
  private constructor(doc: HexMapDocument, mesh: HexMesh);
  static load(yamlSource: string): MapModel;
  get metadata(): HexMapMetadata;
  get features(): readonly FeatureItem[];
  // hexIdToLabel() removed -- use Hex.formatHexLabel()
  // hexIdsForFeature(index) removed -- use feature.hexIds
}
```

---

## Section 4: Command-Based Mutation Layer

Lives in `@hexmap/canvas`. Provides the mutation API for authoring.

### Command types

```typescript
type MapCommand =
  | { type: 'addFeature'; feature: Feature }
  | { type: 'deleteFeature'; index: number }
  | { type: 'updateFeature'; index: number; changes: Partial<Feature> }
  | { type: 'reorderFeature'; fromIndex: number; toIndex: number }
  | { type: 'setMetadata'; key: keyof HexMapMetadata; value: unknown }
  ;
```

### Executor

```typescript
interface MapState {
  document: HexMapDocument;
  model: MapModel;
}

interface CommandResult {
  state: MapState;
  inverse: MapCommand;
}

function executeCommand(command: MapCommand, state: MapState): CommandResult;
```

The executor clones the document, applies the mutation, records the inverse, and rebuilds MapModel.

### Command history (undo/redo)

```typescript
class CommandHistory {
  constructor(initialState: MapState);
  execute(command: MapCommand): MapState;
  undo(): MapState | null;
  redo(): MapState | null;
  get canUndo(): boolean;
  get canRedo(): boolean;
  get isDirty(): boolean;
  get currentState(): MapState;
  markSaved(): void;
}
```

---

## Section 5: Editor Integration

### App.tsx state management

App owns a `CommandHistory` instance. All mutations go through `history.execute(command)`. Components receive a `dispatch` function.

### Component prop changes

**CanvasHost:**
- Define explicit `CanvasHostProps` interface
- `onNavigate(direction: number)` becomes `onNavigate(direction: string)` using semantic compass names

**Inspector / FeatureStack:**
- Gain `dispatch: (command: MapCommand) => void` prop for authoring operations

**StatusBar:**
- `dirty` comes from `history.isDirty` (was hardcoded `false`)

### Keyboard shortcuts

- Add `'escape'` to the `isInput` guard in `useKeyboardShortcuts` so Escape-while-in-command-bar is handled exclusively by CommandBar

---

## Section 6: Dead Code Removal

### Removed

| Item | Location | Reason |
|---|---|---|
| `FeatureItem.raw?: any` | types.ts | Untyped backdoor, never read |
| `DrawOptions.showLabels` | draw.ts | Never passed |
| `CommandBar.onFocus/onBlur` | CommandBar.tsx | Never passed by App |
| `hexAtScreen()` | hit-test.ts | Inline in CanvasHost |
| `HEX_SIZE` (public export) | model/index.ts | Internal constant |
| `MapModel.hexIdToLabel()` | map-model.ts | Replaced by core |
| `MapModel.hexIdsForFeature()` | map-model.ts | Redundant |
| `directionName()` | selection.ts | Replaced by core |
| `PathItem` export | core/hexpath/types.ts | Internal type |
| Drag handle visual | FeatureStack.tsx | No behavior; suppress until DnD implemented |

### Moved

| Item | From | To | Reason |
|---|---|---|---|
| `SceneHighlight` | selection.ts | scene.ts | Render-layer type |
| `Point` | 3 definitions | Single in hex-math.ts | DRY |
| Boundary/vertex ID parsing | selection.ts | Core codecs | Single source of truth |
| Edge geometry math | scene.ts | Core functions | DRY |
| Layout config extraction | MapModel + HexMapLoader | Shared via typed HexMapLayout | Currently duplicated |

### Unified

| Item | Before | After |
|---|---|---|
| `HitResult` | `{...} \| null` | Discriminated union |
| `labelMinZoom` | Two code paths | Single default |
| Barrel exports | 4/6 model files | Complete barrel |
| `MapModel` constructor | Public, `any` | Private, typed |
| `buildScene()` | 5 positional args | Params object |
| `onNavigate` | Raw direction int | Semantic string |

### Out of scope

| Item | Reason |
|---|---|
| `@hexmap/renderer` (D3/SVG) | Separate package, not on authoring path |
| `HexPathOptions.context` | Correct design for @region refs, not yet implemented |
| `Vertex` interface | Useful for future consumers |
| `TerrainTypeDef.type` -> `modifier` | RFC change; defer to avoid format migration |
