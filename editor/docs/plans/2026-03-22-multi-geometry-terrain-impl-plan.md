# Multi-Geometry Terrain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Extend the editor to load, display, paint, and render edge and vertex terrain types from the RFC's `terrain.edge` and `terrain.vertex` vocabulary sections, and support hex terrain with `path: true` rendering.

**Architecture:** The model layer gains geometry-scoped terrain storage (`Map<GeometryType, Map<string, TerrainDef>>`) and per-geometry reverse indices. The Inspector splits its terrain vocabulary UI into three sections (Hex, Edge, Vertex). The scene builder and renderer gain dedicated edge/vertex/path rendering passes. Paint mode gains a `geometry` field set from the palette, constraining hit-test acceptance.

**Tech Stack:** TypeScript, React, Vitest, @hexmap/core (HexPath, HexMapDocument), @hexmap/canvas (MapModel, Scene, Commands)

**Design doc:** `editor/docs/plans/2026-03-22-multi-geometry-terrain-design.md`

---

## File Structure

### Files to modify

| File | Responsibility | Changes |
|------|---------------|---------|
| `canvas/src/model.ts` | MapModel, TerrainDef, terrain loading, feature resolution | Geometry-scoped `_terrainDefs`, new `_edgeToFeatures`/`_vertexToFeatures` reverse indices, add `type`/`onesided` to TerrainDef, extend `terrainColor()` signature, extend feature resolution to handle edge/vertex results |
| `canvas/src/types.ts` | FeatureItem, HitResult, Selection | Add `geometryType`, `edgeIds`, `vertexIds` to FeatureItem |
| `canvas/src/scene.ts` | Scene builder | Add `EdgeTerrainRenderItem`, `VertexTerrainRenderItem`, `PathTerrainRenderItem` to Scene; build them from model's edge/vertex/path features |
| `editor/src/canvas/draw.ts` | Canvas 2D drawing | Add draw passes for edge terrain lines, vertex terrain markers, path terrain lines |
| `editor/src/components/Inspector.tsx` | Terrain vocabulary UI, paint activation | Split terrain list into 3 geometry sections, pass geometry to paint activation |
| `editor/src/components/NewMapDialog.tsx` | Starter palette, YAML generation | Add edge terrain (river, cliff) and hex path terrain (road) to Standard Wargame palette |
| `editor/src/App.tsx` | Paint state, paint click handler | Add `geometry` field to `paintState`, use it to constrain paint hits and set feature terrain lookup |
| `editor/src/canvas/CanvasHost.tsx` | Paint hover preview | Extend ghost highlight to show edge/vertex hover in paint mode |

### Test files to modify

| File | Changes |
|------|---------|
| `canvas/src/model.test.ts` | Tests for geometry-scoped terrain loading, edge/vertex feature resolution, `terrainColor` with geometry param |
| `editor/src/components/Inspector.test.tsx` | Tests for 3-section terrain UI, per-geometry add/delete/paint-activate |
| `editor/src/components/NewMapDialog.test.tsx` | Tests for edge/path terrain in generated YAML |
| `editor/src/App.test.tsx` | Tests for geometry-aware paint state |

---

## Task 1: Extend TerrainDef and geometry-scoped terrain storage in MapModel

**Files:**
- Modify: `canvas/src/model.ts:13-18` (TerrainDef interface)
- Modify: `canvas/src/model.ts:30-80` (MapModel constructor, _terrainDefs)
- Modify: `canvas/src/model.ts:166-168` (terrainDefs getter)
- Modify: `canvas/src/model.ts:219-236` (terrainColor method)
- Test: `canvas/src/model.test.ts`

### Steps

- [x] **Step 1: Write failing tests for geometry-scoped terrain loading**
- [x] **Step 2: Run tests to verify they fail**
- [x] **Step 3: Update TerrainDef interface and MapModel implementation**
- [x] **Step 4: Fix existing terrainColor call sites to pass 'hex'**
- [x] **Step 5: Fix existing terrainDefs call sites**
- [x] **Step 6: Run tests to verify they pass**
- [x] **Step 7: Run full test suite to check for regressions**
- [x] **Step 8: Commit**

---

## Task 2: Extend FeatureItem to track geometry type and edge/vertex IDs

**Files:**
- Modify: `canvas/src/types.ts:8-20` (FeatureItem interface)
- Modify: `canvas/src/model.ts:93-131` (feature resolution loop)
- Test: `canvas/src/model.test.ts`

### Steps

- [x] **Step 1: Write failing tests for edge/vertex feature resolution**
- [x] **Step 2: Run tests to verify they fail**
- [x] **Step 3: Add fields to FeatureItem**
- [x] **Step 4: Update feature resolution in MapModel constructor**
- [x] **Step 5: Run tests to verify they pass**
- [x] **Step 6: Run full test suite**
- [x] **Step 7: Commit**

---

## Task 3: Edge/vertex/path terrain rendering in Scene and Draw

**Files:**
- Modify: `canvas/src/scene.ts:50-68` (Scene interface, new render item types)
- Modify: `canvas/src/scene.ts:70-238` (buildScene function)
- Modify: `editor/src/canvas/draw.ts:21-240` (drawScene function)
- Test: `canvas/src/scene.test.ts` (create if needed, or add to model.test.ts)

### Steps

- [x] **Step 1: Write failing tests for scene building with edge/vertex/path terrain**
- [x] **Step 2: Run tests to verify they fail**
- [x] **Step 3: Add new render item types and extend Scene interface**
- [x] **Step 4: Build edge/vertex/path terrain items in buildScene**
- [x] **Step 5: Add draw passes in drawScene**
- [x] **Step 6: Run tests to verify they pass**
- [x] **Step 7: Run full test suite**
- [x] **Step 8: Commit**

---

## Task 4: Split Inspector terrain vocabulary into 3 geometry sections

**Files:**
- Modify: `editor/src/components/Inspector.tsx:126-288` (terrain vocabulary section)
- Test: `editor/src/components/Inspector.test.tsx`

### Steps

- [x] **Step 1: Write failing tests for geometry-sectioned terrain UI**
- [x] **Step 2: Run tests to verify they fail**
- [x] **Step 3: Refactor Inspector terrain section into a reusable helper**
- [x] **Step 4: Update feature terrain dropdown to show geometry-appropriate terrain keys**
- [x] **Step 5: Run tests to verify they pass**
- [x] **Step 6: Run full test suite**
- [x] **Step 7: Commit**

---

## Task 5: Geometry-aware paint state and click handler

**Files:**
- Modify: `editor/src/App.tsx:52-55` (paintState type)
- Modify: `editor/src/App.tsx:260-308` (handlePaintClick)
- Modify: `editor/src/App.tsx:516` (onPaintActivate callback)
- Modify: `editor/src/canvas/CanvasHost.tsx:78-83` (paint hover preview)
- Test: `editor/src/App.test.tsx`

### Steps

- [x] **Step 1: Write failing tests for geometry-aware paint state**
- [x] **Step 2: Update paintState type**
- [x] **Step 3: Update onPaintActivate callback**
- [x] **Step 4: Update handlePaintClick to use geometry from paintState**
- [x] **Step 5: Update terrainColor call in App.tsx**
- [x] **Step 6: Update CanvasHost paint hover preview**
- [x] **Step 7: Run tests to verify they pass**
- [x] **Step 8: Commit**

---

## Task 6: Expand starter palettes with edge and path terrain

**Files:**
- Modify: `editor/src/components/NewMapDialog.tsx:10-37` (TERRAIN_COLORS, PALETTES)
- Modify: `editor/src/components/NewMapDialog.tsx:99-106` (YAML generation)
- Test: `editor/src/components/NewMapDialog.test.tsx`

### Steps

- [x] **Step 1: Write failing tests for expanded palette**
- [x] **Step 2: Run tests to verify they fail**
- [x] **Step 3: Add edge and path terrain to palette definitions and YAML generation**
- [x] **Step 4: Run tests to verify they pass**
- [x] **Step 5: Run full test suite**
- [x] **Step 6: Commit**

---

## Task 7: Integration test — full round-trip

**Files:**
- Test: `canvas/src/model.test.ts` (add integration test)

### Steps

- [x] **Step 1: Write integration test**
- [x] **Step 2: Run the integration test**
- [x] **Step 3: Run full test suite**
- [x] **Step 4: Commit**
