# Authoring From Scratch — Implementation Plan

**Design:** [2026-03-21-authoring-from-scratch.md](./2026-03-21-authoring-from-scratch.md)

## Phase Order & Dependencies

```
Phase 1: Viewport Auto-Centering (Section 4)  ─── foundational, new maps need this
Phase 2: Inverted Feature Stack (Section 2)    ─── independent, small
Phase 3: New/Open Commands (Section 1)         ─── depends on Phase 1 for fit-to-extent
Phase 4: Paint Mode (Section 3)                ─── depends on Phases 1-3 being stable
```

Phases 1 and 2 can be done in parallel. Phase 3 needs Phase 1. Phase 4 needs all others.

---

## Phase 1: Robust Viewport Auto-Centering

Replaces the mocked `resetZoom()` (hardcoded zoom=20, center=0,0) with real bounding-box math.

### Task 1.1: Implement `fitExtent` in CanvasHost

**File:** `editor/src/canvas/CanvasHost.tsx`

`computeWorldBounds` already exists in `canvas/src/viewport.ts` and is imported but only used in `centerOnHexes`. Write a `fitExtent` helper (private to CanvasHost or in viewport.ts) that:

1. Gets all hex centers from `model.mesh.getAllHexes()` → pixel centers via `Hex.hexToPixel`
2. Calls `computeWorldBounds(centers, HEX_SIZE, orientation)` to get world AABB
3. Calculates zoom: `Math.min(canvasWidth / (worldWidth * 1.1), canvasHeight / (worldHeight * 1.1))` (10% padding)
4. Calculates center: midpoint of the AABB
5. Updates `viewportRef.current` with new center and zoom, calls `onZoomChange` and `render()`

### Task 1.2: Replace `resetZoom` with `fitExtent`

**File:** `editor/src/canvas/CanvasHost.tsx`

- Replace the mocked `resetZoom` implementation (currently just `onZoomChange(20)`) to call `fitExtent`
- `CanvasHostRef.resetZoom` signature stays the same — callers don't change

### Task 1.3: Call `fitExtent` on model change

**File:** `editor/src/canvas/CanvasHost.tsx`

- On initial mount and when the `model` prop changes, call `fitExtent` to auto-center
- This replaces the hardcoded `center: { x: 0, y: 0 }, zoom: 20` in the initial viewport state (lines 49-69)

### Task 1.4: Tests

**File:** `editor/src/canvas/CanvasHost.test.tsx`

- Test that `resetZoom` computes correct zoom for a known map size
- Test that an empty map (no hexes) doesn't crash (degenerate bounds)
- Test that zoom fit respects aspect ratio (wide map vs tall map)

---

## Phase 2: Inverted Feature Stack

Visual-only change — data indices stay the same.

### Task 2.1: Reverse visual order

**File:** `editor/src/components/FeatureStack.tsx`

Currently `visibleFeatures` is rendered in array order. Reverse the visual rendering:

```typescript
const displayFeatures = [...visibleFeatures].reverse();
```

Render `displayFeatures` but use each item's `feature.index` (the original data index) for all callbacks (`onSelect`, key prop, etc.). This preserves the data↔command contract.

### Task 2.2: Update tests

**File:** `editor/src/components/FeatureStack.test.tsx`

- Verify first rendered `<li>` corresponds to the last feature in the array
- Verify click on the top visual item dispatches `onSelect` with the correct (last) data index

---

## Phase 3: New Map / Open File Commands

### Task 3.1: Add `>new` and `>open` to CommandBar

**File:** `editor/src/components/CommandBar.tsx`

Add to the `COMMANDS` array:
```typescript
{ label: 'new', description: 'Create new map' },
{ label: 'open', description: 'Open map file' },
```

### Task 3.2: `>open` command handler

**File:** `editor/src/App.tsx`

Add `else if (cmd === 'open')` branch in `handleCommandSubmit`:
1. Programmatically click a hidden `<input type="file" accept=".yaml,.yml,.json">` element
2. On file selection, read with `FileReader.readAsText()`
3. Parse with `MapModel.load(text)`
4. Replace `historyRef.current` with a new `CommandHistory({ document, model })`
5. Bump `historyVersion`, clear selection

Add the hidden file input element to the JSX (ref-based, no visible UI).

### Task 3.3: Keyboard shortcuts for new/open

**File:** `editor/src/App.tsx`

Add to the `shortcuts` object:
```typescript
'mod+n': () => handleCommandSubmit('>new'),
'mod+o': () => handleCommandSubmit('>open'),
```

Note: `Mod+N` and `Mod+O` are browser defaults (new window, open file). The shortcuts hook uses `e.preventDefault()` so this should override them, but needs testing.

### Task 3.4: `NewMapDialog` component

**File:** `editor/src/components/NewMapDialog.tsx` (new file)

Modal dialog with:
- **Inputs:** Width (default 10), Height (default 10), Orientation (radio: `flat-down`/`flat-up`/`pointy-right`/`pointy-left`), Origin (radio: `top-left`/`bottom-left`/`top-right`/`bottom-right`)
- **Starter palette:** Dropdown with predefined terrain sets. Start with just two: "Standard Wargame" (clear, forest, rough, urban, water, mountain) and "Blank" (empty vocabulary)
- **Base terrain:** Dropdown populated from selected palette, plus "None"
- **Create button:** Generates YAML and calls `onCreateMap(yaml: string)` callback

### Task 3.5: YAML generation logic

**File:** `editor/src/components/NewMapDialog.tsx`

The `generateMapYaml` function:
1. Calculate corner hex labels from (width, height, origin, orientation) — need to use `Hex.formatHexLabel` with the chosen coordinate system
2. Build `layout.all` as a HexPath fill: `"corner1 - corner2 - corner3 - corner4 fill"`
3. Build `terrain.hex` from the selected palette definitions
4. If base terrain selected, add a feature: `{ at: "@all", terrain: baseTerrain }`
5. Serialize to YAML string (can use `js-yaml` or template literal for this simple structure)

### Task 3.6: Wire `>new` command and dialog state

**File:** `editor/src/App.tsx`

- Add `showNewMapDialog` state
- `>new` command sets `showNewMapDialog = true`
- Dialog's `onCreateMap` callback: `MapModel.load(yaml)` → new `CommandHistory` → bump version, close dialog
- Dialog's `onCancel` callback: close dialog

### Task 3.7: Replace hardcoded initial load

**File:** `editor/src/App.tsx`

- Remove the `useEffect` that fetches `battle-for-moscow.hexmap.yaml`
- On initial load with no map: show `NewMapDialog` (or a welcome screen with "New Map" / "Open File" buttons)
- The `>zoom fit` / `fitExtent` from Phase 1 handles centering the new map automatically

### Task 3.8: Tests

**Files:** `editor/src/components/NewMapDialog.test.tsx`, `editor/src/App.test.tsx`

- NewMapDialog: test YAML generation for various (width, height, orientation, origin) combos
- NewMapDialog: test palette → base terrain dropdown population
- App: test `>open` command triggers file input
- App: test `>new` command opens dialog
- App: test initial load shows dialog instead of fetching hardcoded map

---

## Phase 4: Paint Mode

### Task 4.1: Paint mode state

**File:** `editor/src/App.tsx`

Add state:
```typescript
const [paintState, setPaintState] = useState<{
  terrainKey: string;
  lockedGeometry: 'hex' | 'edge' | 'vertex' | null;
  targetFeatureIndex: number | null;  // index of feature being painted into
} | null>(null);
```

`null` = select mode. Non-null = paint mode active.

### Task 4.2: Terrain chip activation in Inspector

**File:** `editor/src/components/Inspector.tsx`

- Accept new props: `paintTerrainKey: string | null`, `onPaintActivate: (key: string | null) => void`
- Add a click handler on each terrain color chip (the small colored square, not the expand toggle):
  - If `paintTerrainKey === key`: call `onPaintActivate(null)` (deactivate)
  - Else: call `onPaintActivate(key)` (activate)
- Style the active chip with a heavy border/ring highlight
- Keep the existing expand/collapse on the row header — the chip click is a separate target

### Task 4.3: Paint mode escape handling

**File:** `editor/src/App.tsx`

Update the existing `Escape` shortcut:
- If `paintState` is non-null, clear it (exit paint mode) instead of clearing selection/command
- Paint mode exit takes priority

### Task 4.4: Extend hit-test for off-board hexes

**File:** `canvas/src/hit-test.ts`

Currently line 88-100 returns `{ type: 'none' }` for hex centers not in `model.mesh`. Add a paint-mode-aware path:

- After the existing `isCenterOnMap` check, if the hex is NOT on the map, check if any of its 6 neighbors ARE on the map
- If so, return `{ type: 'hex', hexId, label }` with a flag like `offBoard: true`
- This requires either a new `hitTestPaint` function or an options parameter `{ includeOffBoard: boolean }`
- Update `HitResult` type to include optional `offBoard` flag

### Task 4.5: Canvas interaction for paint mode

**File:** `editor/src/canvas/CanvasHost.tsx`

Accept new props: `paintTerrainKey: string | null`, `paintTerrainColor: string | null`

**Cursor:** When `paintTerrainKey` is set, use `cursor: 'crosshair'` instead of `'grab'`/`'grabbing'`.

**Hover highlight:** When in paint mode and cursor is over a valid hex/edge/vertex, add a highlight to `buildScene` using the terrain color (semi-transparent fill).

**Click behavior:** When in paint mode, don't send normal selection hits. Instead call a new callback `onPaintClick(hit: HitResult, shiftKey: boolean)`.

### Task 4.6: Paint click handler in App

**File:** `editor/src/App.tsx`

New `handlePaintClick(hit: HitResult, shiftKey: boolean)` function:

1. **Geometry lock check:** If `paintState.lockedGeometry` is set and `hit.type` doesn't match → show status bar error hint, return
2. **First click:** If `lockedGeometry` is null, set it to `hit.type`
3. **Build token:**
   - Plain click: just the atom ID (hex label, edge ID, or vertex ID)
   - Shift-click: `- ${atomId}` (standard connect)
4. **Find or create feature:**
   - If `paintState.targetFeatureIndex` is not null, use it
   - Otherwise, search features array for last feature with matching `terrain` key
   - If found, set `targetFeatureIndex` and use `updateFeature`
   - If not found, dispatch `addFeature` with `{ at: atomId, terrain: paintState.terrainKey }`, then track the new index
5. **Dispatch:** `updateFeature` with `{ index, changes: { at: existingAt + ' ' + token } }`

### Task 4.7: Status bar paint mode indicator

**File:** `editor/src/components/StatusBar.tsx`

When `paintTerrainKey` is set, show a paint mode indicator: terrain name + color chip + "(Esc to exit)". This is also where geometry type mismatch errors appear briefly.

### Task 4.8: Tests

**Files:** Various test files

- **hit-test.test.ts:** Test off-board hex detection (one-ring neighbor returns hit with `offBoard: true`)
- **App.test.tsx:** Test paint mode activation via terrain chip, test Escape exits paint mode, test click dispatches `updateFeature` with correct `at` append
- **Inspector.test.tsx:** Test terrain chip click calls `onPaintActivate`, test active chip styling
- **CanvasHost.test.tsx:** Test cursor changes to crosshair in paint mode, test paint click callback fires instead of selection

---

## Summary

| Phase | Tasks | Key Files | Est. Complexity |
|-------|-------|-----------|-----------------|
| 1. Viewport | 4 | CanvasHost.tsx, viewport.ts | Low |
| 2. Feature Stack | 2 | FeatureStack.tsx | Low |
| 3. New/Open | 8 | App.tsx, NewMapDialog.tsx, CommandBar.tsx | Medium |
| 4. Paint Mode | 8 | App.tsx, Inspector.tsx, CanvasHost.tsx, hit-test.ts, StatusBar.tsx | Medium-High |

Total: 22 tasks across 4 phases.
