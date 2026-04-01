# @hexmap/canvas

Framework-agnostic hex map model, scene graph, and interaction layer. Built on
[@hexmap/core](../core), this package provides everything needed to display and
interact with a hex map — without coupling to any rendering framework or UI
toolkit.

## Key Concepts

- **MapModel** — Immutable view-model built from a `HexMapDocument`. Provides
  terrain lookups, feature queries, and grid configuration. Constructed via
  `MapModel.fromDocument(doc)`.
- **Scene** — Render-ready representation of visible hexes, highlights, terrain
  overlays, and labels. Built by `buildScene(model, viewport, options)` which
  handles world-to-screen projection and frustum culling.
- **Viewport** — Camera state (center, zoom, dimensions) with pure functions
  for panning, zooming, and coordinate projection (`worldToScreen`,
  `screenToWorld`).
- **HitTest** — Determines what geometry (hex, edge, or vertex) lies under a
  screen point: `hitTest(screenPoint, viewport, model)`.
- **Selection** — Multi-modal selection state (hex, edge, vertex, or feature)
  with highlight generation for rendering.
- **Commands** — Immutable command/inverse pattern for undoable edits:
  `executeCommand(command, state) → { state, inverse }`.
- **History** — Undo/redo stack built on the command pattern.

## Architecture

```
core (hex math, mesh, HexPath, document format)
 └── canvas (MapModel, Scene, Viewport, HitTest, Selection, Commands)
      └── your app (rendering, UI, framework of choice)
```

Canvas is deliberately framework-agnostic. It produces data structures
(Scene, HitResult, Selection) that any renderer can consume — Canvas2D,
WebGL, SVG, or server-side.

## Usage

### Building a scene for rendering

```typescript
import { HexMapDocument } from '@hexmap/core';
import { MapModel, buildScene, type ViewportState } from '@hexmap/canvas';

const doc = new HexMapDocument(yamlSource);
const model = MapModel.fromDocument(doc);

const viewport: ViewportState = {
  center: { x: 0, y: 0 },
  zoom: 40,
  width: 800,
  height: 600,
};

const scene = buildScene(model, viewport);
// scene.hexagons, scene.highlights, scene.edgeTerrain, etc.
// → feed to your renderer
```

### Hit testing

```typescript
import { hitTest } from '@hexmap/canvas';

const hit = hitTest({ x: 400, y: 300 }, viewport, model);
if (hit.type === 'hex') console.log(hit.hexId, hit.label);
if (hit.type === 'edge') console.log(hit.boundaryId);
```

### Undoable commands

```typescript
import { executeCommand, type MapCommand } from '@hexmap/canvas';

const cmd: MapCommand = {
  type: 'updateFeature',
  index: 0,
  changes: { terrain: 'forest' },
};
const { state: newState, inverse } = executeCommand(cmd, currentState);
// To undo: executeCommand(inverse, newState)
```

## Exported Types

| Type | Description |
|------|-------------|
| `MapModel` | Immutable map view-model |
| `ViewportState` | Camera state |
| `Scene` | Render-ready scene graph |
| `HitResult` | Discriminated union for hit test results |
| `Selection` | Multi-modal selection state |
| `SceneHighlight` | Highlight specification |
| `HighlightStyle` | `'select' \| 'hover' \| 'ghost' \| 'dim'` |
| `MapCommand` | Discriminated union for all edit commands |
| `FeatureItem` | Feature with resolved geometry |
| `GeometryType` | Re-exported from core |
