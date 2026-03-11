# Editor Phase 5 Review: Current State vs. UX Design

**Date:** 2026-03-09
**Purpose:** Orientation doc for brainstorming next steps after the five initial implementation phases.

---

## What We Built

Five phases of the [UX design](./2026-03-07-editor-ux-design.md) are done. The architecture is solid and the core interaction loop works end-to-end.

### Delivered ✅

| Phase | Goal | Status |
|-------|------|--------|
| 1 — Shell | Layout, panels, visual identity | Done |
| 2 — Render | Battle for Moscow on canvas | Done |
| 3 — Select | Click → highlight → inspect | Done |
| 4 — HexPath | Type → preview → create | Done |
| 5 — Bug fixes & polish | Crash fixes, label improvements, sync | Done |

**Phase 5 specifics (from `tracks/editor-phase-5/spec.md`):**
- **A1.** Partial edge/vertex input crash — fixed (null safety in ID generation)
- **A2.** Hex label scaling — fixed (grows with zoom, positioned top-of-hex)
- **A3.** `bfm.yaml` RFC compliance — updated
- **B1.** Selection→CommandBar sync — clicking hex/edge/vertex/feature populates the bar
- **B2.** Path segment visualization — dashed lines connect hex centers for sequential paths
- **B3.** Feature labels on canvas — non-base feature labels rendered at cluster centroids

### What Works Well

- **Architecture is clean.** Headless model layer (`editor/src/model/`) with full test coverage; canvas is a pure renderer of `Scene` objects.
- **Interaction triangle.** Stack ↔ Canvas ↔ Inspector linking is intuitive. Clicking anywhere keeps the others in sync.
- **Command bar.** HexPath live preview with ghost rendering, syntax highlighting, and auto-population from selection feels solid.
- **Visual identity.** Dark theme and accent-color geometry typing (cyan/magenta/yellow) read well.
- **Orientation-unified core.** Flat-top and pointy-top now handled correctly throughout.

---

## What's Missing vs. the Design

The original Phase 5 goal in the UX design doc was **"Close the read-write loop"** — full feature authoring. The Phase 5 that shipped was scoped to bug fixes and polish. These items from the design remain open:

### Feature Authoring (not started)

| Item | Design Spec | Current State |
|------|-------------|---------------|
| Edit feature in Inspector | Editable terrain dropdown, elevation, label, id, tags | Inspector is read-only |
| Drag-to-reorder | Reorder changes render precedence | Drag handle is visual only, no behavior |
| Delete feature | `Delete` key or context menu | Keyboard shortcut not wired |
| Duplicate feature | `Cmd+D` | Not implemented |
| Undo/Redo | `Cmd+Z` / `Cmd+Shift+Z` | Not implemented |
| Export | `>export json`, `>export yaml` command | Only `>zoom fit` and `>clear` exist |
| Dirty indicator | Status bar shows unsaved state | Hardcoded `false` |

### Inspector Gaps

- **Terrain vocabulary** — Inspector metadata view has a placeholder (`"Terrain vocabulary placeholder (Phase 5)"`)
- **Feature editing** — currently shows ID, label, terrain, and `at` value; elevation, tags, and properties are not displayed
- **Edge/vertex features** — selecting a feature whose `at` is an edge or vertex doesn't highlight those geometries (deferred to C2 in the spec)

### Feature Stack Gaps

- **No `+` button** to create a new feature from the stack (only command bar works)
- **No delete/duplicate actions** in the row (no context menu)
- **`@all` base feature styling** — the base layer shows `(base)` text but no distinct visual pinning

### Keyboard Focus Design Question (still open)

The UX design identified three approaches for key capture. The current implementation is "explicit focus" (Cmd+K or click to use command bar). The hybrid approach — printable chars → command bar, nav keys → canvas — was noted as fitting the "Spatial IDE" metaphor better. This remains unresolved.

### Search Mode

The command bar recognizes `/` prefix (mode badge switches to `SEARCH`) but no search behavior is implemented.

---

## Architecture Notes for Next Work

**Adding undo/redo:** The model is currently rebuilt from YAML strings on each mutation (`MapModel.load(newYaml)`). Undo/redo would need either (a) a YAML snapshot stack or (b) a proper command pattern with inverse operations. The YAML stack is simpler but memory-heavy for large maps.

**Feature editing:** The Inspector needs to become a form. The editing path is:
- Inspector form → mutate `HexMapDocument` → re-serialize to YAML → `MapModel.load()`
- Same pattern already used by command bar `Enter` to create features.

**Drag-to-reorder:** The `FeatureStack` drag handles are visual chrome only. Actual DnD would need `@dnd-kit` or native HTML5 drag, with reorder updating feature array index positions in the document.

**Export:** `HexMapDocument.toString()` already exists. Wiring `>export json` is likely a Blob download.

---

## Open Design Questions

These are worth deliberating before building:

1. **Keyboard focus model.** Always-capture vs. explicit vs. hybrid. Affects: arrow key navigation, hotkey discoverability, and HexPath entry ergonomics.

2. **Feature authoring flow.** Should the Inspector be the primary editing surface (form fields), or should the command bar drive authoring (HexPath + attribute commands)? Or both?

3. **Undo granularity.** Per-keystroke? Per-submit? What constitutes a "unit" of undo for drag-to-reorder?

4. **New feature creation UX.** Command bar `Enter` already creates features. Should clicking an empty hex also offer to create? Should there be a `+` in the stack header?

5. **Multi-map / multi-board.** The design mentions it as a future concern. At what point does the single-file assumption start constraining the architecture?

6. **Feature grouping for larger maps.** The Phase 5 spec deferred C1 (group by terrain or tags). At what feature count does the stack become unworkable without grouping?

---

---

## API Surface Review

A pass through each module looking for leaks, inconsistencies, and dead code.

### `types.ts`

**`FeatureItem.raw?: any`** — a backdoor to the raw document object, present everywhere a feature is passed around. Currently only used in `FeatureStack` (for nothing — the field is never read there). It couples the UI type to the document format and should be removed; any field needed from the raw doc should be promoted to a typed property on `FeatureItem`.

**`HitResult` is nullable vs `Selection` is discriminated** — `HitResult` is `{...} | null` while `Selection` uses `{ type: 'none' }`. Inconsistency between the two nearest types in the codebase. One pattern should win; `{ type: 'none' }` is more typesafe and already the pattern the rest of the code extends.

### `map-model.ts`

**Public constructor takes `any`** — `new MapModel(doc: any, mesh?: HexMesh)` is technically public but the only correct entry point is `MapModel.load(yamlSource)`. The constructor taking a raw `any` doc is an implementation detail leaking out. Should be `private` (use `static load` exclusively), or at minimum accept a typed interface.

**`_yaml = ''` set by assignment after construction** — in the factory, `model._yaml = yamlSource` bypasses the constructor and writes a private field directly. This only works because TypeScript doesn't enforce private at runtime. `toYAML()` silently returns `''` if an instance is constructed directly. The field should be a constructor param or the constructor should be private.

**`metadata: Record<string, any>`** — very loose; exposes raw document fields. A typed `MapMetadata { title?: string; ... }` would be better, even if incomplete initially.

**`hexIdToLabel()` duplicates core logic** — `HexPath` inside `@hexmap/core` already knows how to convert hex IDs to user labels given the same label format. This method reimplements that, and the implementation only handles `CCRR`/`XXYY` formats. Any new label format added to the RFC would require a parallel fix here.

**`hexIdsForFeature(index: number)` takes an index** — inconsistent with `featuresAtHex(hexId)` which takes a string ID. The caller has the feature object; it could take the feature or its `hexIds` directly rather than needing the model to look it up by index.

### `model/index.ts`

**`HEX_SIZE` re-exported publicly** — `hit-test.ts` exports `HEX_SIZE = 1` (an internal world-unit constant), and `model/index.ts` re-exports `*` from `hit-test.ts`, so `HEX_SIZE` becomes part of the model layer's public API. It's an implementation detail of the renderer, not a model concept.

**`hexAtScreen` re-exported publicly** — used only in `CanvasHost` for status bar cursor tracking. It's a canvas-level helper, not a model API. Could be inlined in `CanvasHost` or moved to the canvas layer.

**`selection.ts` and `hex-path-preview.ts` not included** — both modules live in `model/` but aren't re-exported from `model/index.ts`. `App.tsx` imports them directly by path. The export barrel is inconsistent: some model modules are in, some are out. Either export all of them or drop the barrel and import by path everywhere.

### `selection.ts`

**`SceneHighlight` defined here but belongs in `scene.ts`** — `SceneHighlight` is a render-layer type (colors, style variants) that happens to be produced by selection logic. It's imported by both `App.tsx` (to pass as prop) and `scene.ts` (to consume). Its home should be `scene.ts` alongside the other render item types.

**`boundaryIdToHexPath` / `vertexIdToHexPath` parse internal ID formats** — both functions parse the `|` and `^` delimiter formats that are internal to `@hexmap/core`'s ID encoding. The same delimiter knowledge is also duplicated in `scene.ts` (edge and vertex highlight rendering). This logic should live in core as a proper codec, not be re-derived in three places in the editor.

**`directionName()` duplicates core direction names** — direction names (`NE`, `SE`, etc.) are already defined in the RFC and presumably in core. A private function in `selection.ts` that hardcodes them is a maintenance liability.

### `scene.ts`

**`buildScene()` has 5 positional arguments** — started as 3, grew to 5 as Phase 4 and 5 added features. Adding another scene element (e.g., feature geometry highlights) would push it to 6. Should become a params object: `buildScene(model, viewport, options: SceneOptions)`.

**Edge and vertex highlight geometry duplicates core math** — the edge corner index formula (`edgeStart = orientation === 'flat' ? (dir + 5) % 6 : (dir + 4) % 6`) and the vertex corner-finding loop are both re-derived from hex geometry instead of calling core functions. Same logic is also needed in `selection.ts`.

**`HEX_SIZE` imported from `hit-test.ts`** — the constant lives in the wrong module (see above). `scene.ts` importing it from `hit-test.ts` creates an awkward cross-dependency within the model layer.

### `draw.ts`

**`DrawOptions.showLabels` is dead** — `CanvasHost` never passes `showLabels`, so the branch is always true. Either document the intent or remove the option.

**`labelMinZoom` applied inconsistently** — for hex coordinate labels, `labelMinZoom` comes from destructuring with a default of `12`. For feature labels, it's `options.labelMinZoom ?? 12`. These should be the same code path.

### `CanvasHost.tsx`

**`onNavigate(direction: number)` uses raw orientation-dependent direction integers** — `App.tsx` hardcodes `ArrowRight → 1 (SE)`, `ArrowLeft → 4 (NW)` etc., which are flat-top direction indices. For a pointy-top map these are wrong. The semantic intention (`moveRight`, `moveUp`, etc.) should be expressed, with direction→hex translation happening in the model layer with access to orientation.

### `CommandBar.tsx`

**`onFocus` and `onBlur` props are dead** — accepted in the interface, wired to the input element, but never passed by `App.tsx`. Either use them (e.g., for the hybrid keyboard focus design) or remove them.

### `useKeyboardShortcuts.ts`

**Escape overlap between global handler and CommandBar** — the global shortcuts map includes `'escape': () => setSelection(clearSelection())`. The CommandBar also handles `Escape` in its own `onKeyDown` to clear the input and blur. When the command bar is focused, both fire (the global handler via the capture listener, the CommandBar handler via bubbling). Effect: Escape clears both the selection and the command bar. This may be intentional but isn't explicit. The `isInput` guard only passes through `'k'`; `escape` should probably be added there too, delegating Escape-in-input entirely to the CommandBar.

### `FeatureStack.tsx`

**Drag handle is visual-only** — `⋮⋮` renders as static text with no `draggable` attribute or event handlers. It implies affordance that doesn't exist. Should either be implemented or visually suppressed until drag-to-reorder is built.

---

### API Issues Summary

| Module | Issue | Severity |
|--------|-------|----------|
| `types.ts` | `FeatureItem.raw?: any` — untyped backdoor | High |
| `types.ts` | `HitResult` nullable vs `Selection` discriminated union | Medium |
| `map-model.ts` | Public constructor takes `any`; `toYAML()` returns `''` if used directly | High |
| `map-model.ts` | `metadata: Record<string, any>` — too loose | Low |
| `map-model.ts` | `hexIdToLabel()` duplicates core label logic | Medium |
| `map-model.ts` | `hexIdsForFeature(index)` takes index not feature | Low |
| `model/index.ts` | `HEX_SIZE` and `hexAtScreen` leaked into public model API | Medium |
| `model/index.ts` | `selection.ts` / `hex-path-preview.ts` excluded from barrel | Low |
| `selection.ts` | `SceneHighlight` belongs in `scene.ts` | Low |
| `selection.ts` | Boundary/vertex ID parsing duplicated from core internals | Medium |
| `selection.ts` | `directionName()` duplicates core direction names | Low |
| `scene.ts` | `buildScene()` 5 positional args — should be params object | Medium |
| `scene.ts` | Edge/vertex geometry math duplicated from core | Medium |
| `draw.ts` | `showLabels` option is dead code | Low |
| `draw.ts` | `labelMinZoom` applied inconsistently | Low |
| `CanvasHost.tsx` | `onNavigate(direction: number)` — raw orientation-dependent ints | Medium |
| `CommandBar.tsx` | `onFocus`/`onBlur` props unused in App | Low |
| `useKeyboardShortcuts.ts` | Escape fires both global + CommandBar handler | Medium |
| `FeatureStack.tsx` | Drag handle is visual-only, no behavior | Low |

---

## Suggested Next Steps (to discuss)

**Short path — close the authoring loop:**
- Inspector editing (terrain, label, elevation, id, tags) — unlocks real map authoring
- Delete + duplicate (`Delete`, `Cmd+D`) — basic editorial ops
- Dirty state + export — completes the save cycle
- Undo/redo — essential safety net before serious authoring

**Medium path — UX polish and discoverability:**
- Keyboard focus design (resolve hybrid approach)
- Feature stack context menu (delete, duplicate, go-to-geometry)
- Search mode implementation (`/terrain:forest`, `/label:Moscow`)
- Edge/vertex feature geometry highlighting (C2 from Phase 5 spec)

**Longer path — scale and workflow:**
- Feature grouping in stack (terrain/tag groups, collapsible)
- Multi-feature editing in Inspector (batch terrain change)
- HexPath authoring ergonomics (tab completion, direction hints)
- Load/save UI (file picker, recent maps)
