# API Boundary Review & Cleanup Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean API boundaries between core/canvas/editor, fix all TS errors, write README for canvas.

**Architecture:** Three-layer stack where each layer only depends downward:
- `@hexmap/core` — pure logic: hex math, mesh topology, HexPath DSL, document format. Zero DOM/UI deps.
- `@hexmap/canvas` — framework-agnostic map model + scene graph: viewport, hit-testing, scene building, commands, selection. Depends only on core. No React, no DOM rendering.
- `editor` — React app: Canvas2D rendering, theme, components. Depends on both core and canvas.

---

## Current TS Errors (42 total)

| Category | Count | Fix Strategy |
|----------|-------|-------------|
| TS2307: Cannot find module `@hexmap/canvas` | 13 | tsconfig path mapping (editor-only, not a code bug) |
| TS7006: Implicit `any` parameter | 16 | Add explicit type annotations |
| TS2554: Wrong argument count (`formatId`) | 5 | Remove unused second arg from `formatId` calls |
| TS6133: Unused variable | 3 | Remove `_vp`, `labelMinZoom`, `_terrainKeys` |
| TS2322: Type mismatch (loader.ts ParsedLayout) | 1 | Default orientation in loader |
| TS2322: Type mismatch (command.ts Feature key) | 1 | Type assertion for indexed access |
| TS2345: `string | undefined` to `string` (model.test) | 2 | Non-null assertion in test |
| TS2459: Import of non-exported `SceneHighlight` | 1 | Fix import path in scene.test.ts |
| TS2578: Unused `@ts-expect-error` | 1 | Remove directive |

---

## Task 1: Fix core TS errors

**Files:**
- Modify: `core/src/hexpath/hex-path.ts`
- Modify: `core/src/format/loader.ts`

- [ ] **Step 1: Remove extra arg from `formatId` calls**

`formatId` takes 1 argument but is called with 2 at lines 193, 286, 316, 321, 335. Remove the second `cursor.type` argument from all 5 call sites.

- [ ] **Step 2: Fix loader.ts orientation type**

In `ParsedLayout`, orientation is `string | undefined`. When constructing the HexMesh options, validate and default:
```typescript
const orientation = (layout.orientation ?? 'flat-down') as Orientation;
```

- [ ] **Step 3: Run `npx tsc --noEmit -p core/tsconfig.json` — expect 0 errors**

- [ ] **Step 4: Run tests, commit**

---

## Task 2: Fix canvas TS errors

**Files:**
- Modify: `canvas/src/command.ts`
- Modify: `canvas/src/model.test.ts`
- Modify: `canvas/src/scene.test.ts`

- [ ] **Step 1: Fix command.ts Feature key indexing**

Line 55: Add type assertion for the indexed access:
```typescript
(previousValues as Record<string, unknown>)[key] = current[key];
```

- [ ] **Step 2: Fix model.test.ts string | undefined**

Lines 286, 295: Add non-null assertion `!` on the values that are known to be defined in test fixtures.

- [ ] **Step 3: Fix scene.test.ts import**

Change `import { buildScene, type SceneHighlight } from './scene.js'` to import `SceneHighlight` from `./types.js` (or from the package index since it's re-exported).

- [ ] **Step 4: Run `npx tsc --noEmit -p canvas/tsconfig.json` — expect 0 errors (excluding core pass-through)**

- [ ] **Step 5: Run tests, commit**

---

## Task 3: Fix editor TS errors

**Files:**
- Modify: `editor/src/App.tsx`
- Modify: `editor/src/components/Inspector.tsx`
- Modify: `editor/src/components/Inspector.test.tsx`
- Modify: `editor/src/canvas/draw.ts`
- Modify: `editor/src/canvas/CanvasHost.tsx`
- Modify: `editor/src/utils/filter-features.ts`
- Modify: `editor/tsconfig.json` (if needed for path mapping)

- [ ] **Step 1: Fix module resolution for `@hexmap/canvas`**

Check `editor/tsconfig.json` paths — canvas may need a `paths` entry or the `references` config may be incomplete. This is likely a build config issue.

- [ ] **Step 2: Fix implicit `any` parameters**

Add explicit types to all 16 implicit `any` parameters:
- `App.tsx`: lines 233, 234, 264, 265, 269, 273, 274, 418, 488 — these are `.map`/`.filter` callbacks on arrays. Add types matching the array element type.
- `Inspector.tsx`: lines 66, 610, 623, 684, 774 — same pattern.
- `filter-features.ts`: lines 23, 39

- [ ] **Step 3: Remove unused variables**

- `draw.ts:67`: Remove `labelMinZoom` destructuring (now unused since label rendering uses hexScreenRadius threshold)
- `CanvasHost.tsx:387`: Remove `_vp` variable
- `Inspector.tsx:416`: Remove `_terrainKeys`

- [ ] **Step 4: Remove unused `@ts-expect-error`**

`Inspector.test.tsx:454`: Remove the directive since the error it suppressed no longer exists.

- [ ] **Step 5: Run full test suite + `npx tsc --noEmit`, commit**

---

## Task 4: Write canvas/README.md

**Files:**
- Create: `canvas/README.md`

- [ ] **Step 1: Write README**

```markdown
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
  handles world→screen projection and frustum culling.
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
```

- [ ] **Step 2: Commit**

---

## Task 5: Update core/README.md and editor/README.md

**Files:**
- Modify: `core/README.md` — add architecture layer diagram, dependency note
- Modify: `editor/README.md` — fix outdated section references (`/src/model/` → `@hexmap/canvas`)

- [ ] **Step 1: Add architecture section to core README**

Add after the Key Concepts section:
```markdown
## Architecture

`@hexmap/core` is the foundation layer with zero DOM or framework dependencies.

```
@hexmap/core  ← you are here (pure logic, no DOM)
 └── @hexmap/canvas (model, scene, interaction — framework-agnostic)
      └── apps (editor, game engines, analysis tools)
```

### Dependencies

- `yaml` — YAML parsing for `.hexmap.yaml` documents
- No DOM, no framework, no rendering dependencies
```

- [ ] **Step 2: Fix editor README outdated references**

The "Core Model" section references `/src/model/` but MapModel, Scene, Viewport, HitTest, and Selection are all in `@hexmap/canvas`. Update to reflect the actual architecture:
- MapModel, Scene, Viewport, HitTest, Selection → from `@hexmap/canvas`
- draw.ts, resolve-theme.ts, CanvasHost → editor-specific Canvas2D rendering

- [ ] **Step 3: Commit**

---

## API Boundary Assessment (informational, no code changes)

### Things correctly placed:
- **Core**: Hex math, mesh topology, HexPath DSL, document format — all pure logic, no rendering
- **Canvas**: MapModel (view-model), scene building, hit-testing, viewport math, commands — framework-agnostic
- **Editor**: Canvas2D rendering (draw.ts), React components, theming — app-specific

### Things to watch (not blocking, but for future consideration):
- `editor/src/canvas/draw.ts` is Canvas2D-specific rendering. If we wanted WebGL or SVG renderers, they'd need their own `draw`. The Scene abstraction in canvas is the right boundary for this.
- `canvas/src/constants.ts` exports `ACCENT_HEX`, `ACCENT_EDGE`, `ACCENT_VERTEX` which are styling concerns. These are reasonable defaults but could be considered editor-specific. Current placement is acceptable.
- `editor` imports from both `@hexmap/core` and `@hexmap/canvas`. Most core imports are for `Hex.*` math utilities in components. This is fine — canvas doesn't need to re-export all of core.
