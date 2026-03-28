# UX Round 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix visual contrast, edge painting bugs, input field friction, terrain palette UX, and add edge shortest-path support.

**Architecture:** 8 independent tasks grouped into 3 workstreams (Visual Foundation, Edge Painting, Inspector Polish). Each task produces a working commit. Tasks are ordered so that contrast fixes come first (unblocks visual testing), then bug fixes, then features. Terrain palette redesign (Task 3) comes before delete safety (Task 4) so the grid layout is in place before moving the delete button into the edit panel.

**Hygiene:** All tasks must pass `npx vitest run` and `npm run hygiene` before commit.

**Tech Stack:** TypeScript, React, CSS custom properties, Vitest, `@hexmap/core` (HexPath, Hex), `@hexmap/canvas` (MapModel, TerrainDef)

**Design doc:** `editor/docs/plans/2026-03-28-ux-round3-design.md`

---

## File Structure

| File | Action | Tasks |
|------|--------|-------|
| `editor/src/styles/theme-sandtable.css` | Modify | 1 |
| `editor/src/components/Inspector.tsx` | Modify | 2, 3, 4, 6, 7 |
| `editor/src/components/Inspector.css` | Modify | 2, 3, 6, 7 |
| `editor/src/components/Inspector.test.tsx` | Modify | 4 |
| `editor/src/components/TerrainChip.tsx` | Modify | 3 |
| `editor/src/components/TerrainChip.css` | Modify | 3 |
| `editor/src/components/TerrainChip.test.tsx` | Modify | 3 |
| `editor/src/App.tsx` | Modify | 5, 6 |
| `core/src/hexpath/hex-path.ts` | Modify | 5, 8 |
| `core/src/hexpath/hex-path.test.ts` | Modify | 8 |
| `core/src/math/hex-math.ts` | Modify | 8 |
| `core/src/math/hex-math.test.ts` | Modify | 8 |

---

### Task 1: Contrast fix — theme CSS variables

Boost `--text-muted`, `--border-subtle`, `--bg-elevated`, and `--border-focus` to WCAG AA compliant values.

**Files:**
- Modify: `editor/src/styles/theme-sandtable.css:1-40`

- [ ] **Step 1: Update CSS variables**

In `editor/src/styles/theme-sandtable.css`, change these four values:

```css
  --bg-elevated: #1C2333;    /* was #151B23 */
  --border-subtle: #30363D;  /* was #1A2332 */
  --border-focus: #3A4A5A;   /* was #2A3A4A */
  --text-muted: #7D8590;     /* was #484F58 */
```

- [ ] **Step 2: Run tests**

Run: `cd /Users/psurry/hexagons/hexerei && npx vitest run`
Expected: All 405 tests pass (CSS-only change, no logic affected)

- [ ] **Step 3: Visual check**

Run: `cd /Users/psurry/hexagons/hexerei/editor && npx vite --open`
Verify: borders visible, muted text readable, elevated surfaces distinguishable from base.

- [ ] **Step 4: Commit**

```bash
git add editor/src/styles/theme-sandtable.css
git commit -m "fix(editor): boost theme contrast to WCAG AA compliance

Bump --text-muted, --border-subtle, --bg-elevated, --border-focus
to values matching GitHub dark theme for readable UI chrome."
```

---

### Task 2: Input field polish — Enter/Escape keys and consistent sizing

Add keyboard commit/revert to all inspector input fields.

**Files:**
- Modify: `editor/src/components/Inspector.tsx:349-356,390-440`
- Modify: `editor/src/components/Inspector.css`

- [ ] **Step 1: Add a shared onKeyDown handler in Inspector.tsx**

In `Inspector.tsx`, inside the `renderFeature` function (after the `handleFieldBlur` definition around line 356), add:

```typescript
    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.currentTarget.blur(); // triggers onBlur -> handleFieldBlur
      } else if (e.key === 'Escape') {
        e.currentTarget.value = e.currentTarget.defaultValue;
        e.currentTarget.blur();
      }
    };
```

- [ ] **Step 2: Add onKeyDown to all inspector-input fields**

Add `onKeyDown={handleInputKeyDown}` to every `<input>` in the feature properties section. There are 4 inputs:

1. Label input (~line 396):
```tsx
            <input
              type="text"
              className="inspector-input"
              defaultValue={feature.label || ''}
              key={`label-${featureIndex}-${feature.label}`}
              onBlur={(e) => handleFieldBlur('label', e.target.value)}
              onKeyDown={handleInputKeyDown}
            />
```

2. ID input (~line 410):
```tsx
              <input
                type="text"
                className="inspector-input font-mono"
                defaultValue={feature.id || ''}
                key={`id-${featureIndex}-${feature.id}`}
                onBlur={(e) => handleFieldBlur('id', e.target.value)}
                onKeyDown={handleInputKeyDown}
              />
```

3. At input (~line 438):
```tsx
                <input
                  type="text"
                  className="inspector-input font-mono"
                  defaultValue={feature.at}
                  key={`at-${featureIndex}-${feature.at}`}
                  onBlur={(e) => handleFieldBlur('at', e.target.value)}
                  onKeyDown={handleInputKeyDown}
                />
```

4. Also add to any terrain edit form inputs (key rename, name, color) — search for other `<input` elements and add `onKeyDown={handleInputKeyDown}` to each text input.

- [ ] **Step 3: Audit input sizing CSS**

In `Inspector.css`, verify that `.inspector-input` has `flex: 1` and `.inspector-row label` has a consistent `min-width`. Add if missing:

```css
.inspector-row label {
  min-width: 48px;
  flex-shrink: 0;
}

.inspector-input {
  flex: 1;
  min-width: 0;
}
```

Check that no individual input has a competing `width` or `max-width` that would override this.

- [ ] **Step 4: Run tests**

Run: `cd /Users/psurry/hexagons/hexerei && npx vitest run`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add editor/src/components/Inspector.tsx editor/src/components/Inspector.css
git commit -m "feat(editor): Enter commits and Escape reverts in inspector inputs

Add onKeyDown handler to all inspector text inputs. Enter triggers
blur (commits via existing onBlur). Escape resets to defaultValue
and blurs. Audit input sizing for consistent flex layout."
```

---

### Task 3: Terrain palette redesign

Replace single-column terrain list with multi-column grid of larger swatches.

**Files:**
- Modify: `editor/src/components/TerrainChip.tsx`
- Modify: `editor/src/components/TerrainChip.css`
- Modify: `editor/src/components/TerrainChip.test.tsx`
- Modify: `editor/src/components/Inspector.tsx:55-170`
- Modify: `editor/src/components/Inspector.css`

- [ ] **Step 1: Add size prop to TerrainChip**

In `TerrainChip.tsx`, add a `size` prop:

```tsx
interface TerrainChipProps {
  color: string;
  geometry: 'hex' | 'edge' | 'vertex';
  active?: boolean;
  title?: string;
  size?: number;
}

export const TerrainChip = ({ color, geometry, active, title, size = 16 }: TerrainChipProps) => {
  const content = (() => {
    switch (geometry) {
      case 'hex':
        return <polygon points="8,1 15,5 15,11 8,15 1,11 1,5" />;
      case 'edge':
        return (
          <>
            <line x1="2" y1="8" x2="14" y2="8" strokeWidth="2.5" />
            <line x1="4" y1="6" x2="4" y2="10" strokeWidth="1" />
            <line x1="12" y1="6" x2="12" y2="10" strokeWidth="1" />
          </>
        );
      case 'vertex':
        return <circle cx="8" cy="8" r="5" />;
    }
  })();

  return (
    <div
      className={`terrain-chip terrain-chip-${geometry} ${active ? 'active' : ''}`}
      title={title}
      style={{ width: size + 4, height: size + 4 }}
    >
      <svg viewBox="0 0 16 16" width={size} height={size}>
        <g fill={geometry === 'edge' ? 'none' : color} stroke={geometry === 'edge' ? color : 'none'}>
          {content}
        </g>
      </svg>
    </div>
  );
};
```

- [ ] **Step 2: Update TerrainChip.css for dynamic sizing**

Replace fixed width/height with defaults that can be overridden:

```css
.terrain-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 150ms ease;
  flex-shrink: 0;
}
```

Remove the fixed `width: 20px; height: 20px;` — now set via inline style from the `size` prop.

- [ ] **Step 3: Update TerrainChip tests**

In `TerrainChip.test.tsx`, add a test for the size prop:

```tsx
test('renders at custom size', () => {
  render(<TerrainChip color="#ff0000" geometry="hex" size={48} />);
  const svg = document.querySelector('svg');
  expect(svg?.getAttribute('width')).toBe('48');
  expect(svg?.getAttribute('height')).toBe('48');
});
```

- [ ] **Step 4: Refactor terrain section to grid layout**

In `Inspector.tsx`, in `renderTerrainSection`, replace the terrain list rendering. The current pattern iterates over terrain entries and renders each as a row with chip + label + name + delete button. Replace with a grid of larger chips.

**Important:** The wrapper `<div key={key}>` must use `display: contents` so the edit form can participate in the parent grid's column spanning:

```tsx
      <div className="terrain-grid">
        {Array.from(defs.entries()).map(([key, def]) => {
          const isPaintActive = paintTerrainKey === key && paintGeometry === geometry;
          const isExpanded = expandedTerrain?.key === key && expandedTerrain?.geometry === geometry;

          return (
            <div key={key} style={{ display: 'contents' }}>
              <div
                className={`terrain-grid-cell ${isPaintActive ? 'paint-active' : ''}`}
                onClick={() => onPaintActivate?.(isPaintActive ? null : key, geometry)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setExpandedTerrain(isExpanded ? null : { key, geometry });
                }}
                title={isPaintActive ? 'Click to exit paint mode' : `${key}${def.name !== key ? ` (${def.name})` : ''} — click to paint, double-click to edit`}
              >
                <TerrainChip
                  color={def.color}
                  geometry={geometry}
                  active={isPaintActive}
                  size={48}
                />
                <span className="terrain-grid-label">{key}</span>
              </div>
              {isExpanded && (
                <div className="terrain-edit-form terrain-edit-form-grid">
                  {/* ... existing edit form content (key/name/color inputs) ... */}
                </div>
              )}
            </div>
          );
        })}
      </div>
```

The `display: contents` on the wrapper makes its children direct grid participants, so `.terrain-edit-form-grid { grid-column: 1 / -1 }` works correctly to span all columns.

- [ ] **Step 5: Add grid CSS**

In `Inspector.css`, add:

```css
.terrain-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
  gap: var(--space-sm);
  padding: var(--space-sm) 0;
}

.terrain-grid-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-sm);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 150ms ease;
}

.terrain-grid-cell:hover {
  background: rgba(255, 255, 255, 0.04);
}

.terrain-grid-cell.paint-active {
  background: rgba(0, 212, 255, 0.08);
}

.terrain-grid-label {
  font-size: 10px;
  color: var(--text-secondary);
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.terrain-edit-form-grid {
  grid-column: 1 / -1;
}
```

- [ ] **Step 6: Run tests and hygiene**

Run: `cd /Users/psurry/hexagons/hexerei && npx vitest run && npm run hygiene`
Expected: All pass. Fix any test that relied on the old terrain row layout (query selectors may need updating).

- [ ] **Step 7: Commit**

```bash
git add editor/src/components/TerrainChip.tsx editor/src/components/TerrainChip.css editor/src/components/TerrainChip.test.tsx editor/src/components/Inspector.tsx editor/src/components/Inspector.css
git commit -m "feat(editor): terrain palette grid with larger swatches

Replace single-column terrain list with multi-column CSS Grid.
Terrain chips render at 48px with labels underneath. Add size
prop to TerrainChip component."
```

---

### Task 4: Terrain delete safety

Move delete button into edit panel. Warn when terrain is in use. Now that the grid layout from Task 3 is in place, we modify the edit form directly.

**Files:**
- Modify: `editor/src/components/Inspector.tsx`
- Modify: `editor/src/components/Inspector.css`
- Modify: `editor/src/components/Inspector.test.tsx`

- [ ] **Step 1: Remove the X button from the terrain grid cell**

In `Inspector.tsx`, find the delete button (the `btn-danger-icon` with aria-label "Delete terrain") and remove it entirely. After Task 3 it may already be absent from the grid cells — verify and remove if still present.

- [ ] **Step 2: Add a usage count helper**

Before `renderTerrainSection`, add a helper function:

```typescript
  const terrainUsageCount = (key: string, geometry: 'hex' | 'edge' | 'vertex'): number => {
    if (!model) return 0;
    return model.features.filter(
      (f) => f.geometryType === geometry && f.terrain === key
    ).length;
  };
```

- [ ] **Step 3: Add delete button and close button inside the expanded edit form**

Find the end of the expanded terrain edit form (the closing `</div>` of `className="terrain-edit-form"`). Before that closing tag, add:

```tsx
                  <div className="terrain-edit-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => setExpandedTerrain(null)}
                    >
                      Close
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => {
                        const count = terrainUsageCount(key, geometry);
                        if (count > 0) {
                          if (!window.confirm(
                            `"${key}" is used by ${count} feature${count !== 1 ? 's' : ''}. ` +
                            `Deleting will remove terrain from those features. Continue?`
                          )) return;
                        }
                        dispatch?.({
                          type: 'deleteTerrainType',
                          geometry,
                          key,
                        });
                        setExpandedTerrain(null);
                      }}
                    >
                      Delete terrain
                    </button>
                  </div>
```

- [ ] **Step 4: Add CSS for the action row**

In `Inspector.css`, add:

```css
.terrain-edit-actions {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid var(--border-subtle);
}
```

- [ ] **Step 5: Update tests**

In `Inspector.test.tsx`, find any test that clicks the terrain delete button (aria-label "Delete terrain") and update it to:
1. First double-click the terrain grid cell to expand the edit form
2. Then find and click the "Delete terrain" button inside the form

- [ ] **Step 6: Run tests and hygiene**

Run: `cd /Users/psurry/hexagons/hexerei && npx vitest run && npm run hygiene`
Expected: All pass

- [ ] **Step 7: Commit**

```bash
git add editor/src/components/Inspector.tsx editor/src/components/Inspector.css editor/src/components/Inspector.test.tsx
git commit -m "feat(editor): move terrain delete to edit panel with usage warning

Remove X button from terrain grid. Add Delete button inside
the expanded edit form with usage count check and confirm dialog.
Add Close button to collapse back to chip view."
```

---

### Task 5: Debug and fix edge double-paint bug

**Note:** This is an investigative task. The root cause is not yet confirmed — the steps below are a structured debugging approach. The fix may require iteration beyond these scripted steps.

Investigate why clicking to paint an edge adds two edges instead of one.

**Files:**
- Modify: `editor/src/App.tsx:277-325`
- Test: manual testing in browser

- [ ] **Step 1: Add diagnostic logging**

In `handlePaintClick` (App.tsx ~line 277), add temporary console.log calls:

```typescript
  const handlePaintClick = (hit: HitResult, shiftKey: boolean) => {
    if (!paintState || !model || hit.type === 'none') return;
    if (hit.type !== paintState.geometry) return;

    const hp = getHexPath();
    if (!hp) return;

    let atomId = '';
    if (hit.type === 'hex') {
      if (!model.mesh.getHex(hit.hexId)) return;
      atomId = hp.idToAtom(hit.hexId, 'hex');
    } else if (hit.type === 'edge') {
      atomId = hp.idToAtom(hit.boundaryId, 'edge');
    } else if (hit.type === 'vertex') {
      atomId = hp.idToAtom(hit.vertexId, 'vertex');
    }
    if (!atomId) return;

    console.log('[paint] atomId:', atomId, 'hit:', hit.type);

    const targetIndex = paintState.targetFeatureIndex;

    if (targetIndex !== null) {
      const feature = model.features[targetIndex];
      console.log('[paint] before:', feature.at);

      const existing = feature.at ? hp.resolve(feature.at) : { segments: [], type: hit.type };
      const segments = [...(existing.segments ?? [])];
      console.log('[paint] existing segments:', segments.length, 'items:', existing.items?.length);

      if (shiftKey && segments.length > 0) {
        const lastSegment = segments[segments.length - 1];
        const newAtomResult = hp.resolve(atomId);
        const newId = newAtomResult.items[0];
        lastSegment.push(newId);
      } else {
        const newAtomResult = hp.resolve(atomId);
        console.log('[paint] newAtom items:', newAtomResult.items.length, newAtomResult.items);
        segments.push(newAtomResult.items.map((id) => id));
      }

      const newAt = hp.serialize(segments, hit.type);
      console.log('[paint] after:', newAt);

      // Round-trip check
      const roundTrip = hp.resolve(newAt);
      console.log('[paint] round-trip items:', roundTrip.items.length, 'segments:', roundTrip.segments?.length);

      dispatch({ type: 'updateFeature', index: targetIndex, changes: { at: newAt } });
      setCommandValue(newAt);
    } else {
      dispatch({ type: 'addFeature', feature: { at: atomId, terrain: paintState.terrainKey } });
      setPaintState({ ...paintState, targetFeatureIndex: model.features.length });
      setCommandValue(atomId);
    }
  };
```

- [ ] **Step 2: Reproduce in browser**

Run: `cd /Users/psurry/hexagons/hexerei/editor && npx vite --open`
1. Create a new 5x5 map
2. Add an edge terrain type
3. Select the edge terrain, click to paint
4. Click on edges and watch the console output
5. Record: does `[paint] newAtom items` show more than 1? Does `[paint] after` show more atoms than expected? Does `[paint] round-trip items` differ from expected count?

- [ ] **Step 3: Fix the bug based on findings**

**Most likely causes and fixes:**

**(a) If `newAtomResult.items` has >1 item:** The `resolve(atomId)` call is producing extra items. This means `idToAtom` is producing a string that parses as multiple atoms. Fix: ensure `idToAtom` for edges produces a single well-formed `"XXYY/DIR"` atom.

**(b) If round-trip produces more items than segments suggest:** The `serialize` output, when re-resolved, produces extra items. This is a round-trip bug in serialize/resolve. Fix in `hex-path.ts`.

**(c) If `feature.at` before resolve already has more atoms than expected (stale state):** The `model` reference captures a stale state. Fix: read from the history object directly instead of the `model` in the closure.

Apply the fix based on what the logs reveal.

- [ ] **Step 4: Remove diagnostic logging**

Remove all `console.log('[paint]')` lines added in step 1.

- [ ] **Step 5: Run tests**

Run: `cd /Users/psurry/hexagons/hexerei && npx vitest run`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add editor/src/App.tsx
git commit -m "fix(editor): resolve edge double-paint bug

[describe actual root cause and fix based on investigation]"
```

---

### Task 6: Auto-show feature panel during paint

When painting, auto-select the target feature so the inspector shows feature properties.

**Files:**
- Modify: `editor/src/App.tsx:277-325,540-580`

- [ ] **Step 1: Find the handleSelectFeature function**

In `App.tsx`, locate `handleSelectFeature`. It likely calls `setSelection` with a feature selection. Note its signature.

- [ ] **Step 2: Auto-select on existing feature paint**

In `handlePaintClick`, after the `dispatch({ type: 'updateFeature' ...})` call (~line 317), add:

```typescript
      dispatch({ type: 'updateFeature', index: targetIndex, changes: { at: newAt } });
      setCommandValue(newAt);
      // Auto-select the painted feature so inspector shows its properties
      handleSelectFeature([targetIndex]);
```

- [ ] **Step 3: Auto-select on new feature creation**

In the `else` branch (~line 319-324), after creating the new feature:

```typescript
      dispatch({ type: 'addFeature', feature: { at: atomId, terrain: paintState.terrainKey } });
      const newIndex = model.features.length;
      setPaintState({ ...paintState, targetFeatureIndex: newIndex });
      setCommandValue(atomId);
      // Auto-select the new feature
      handleSelectFeature([newIndex]);
```

Note: this uses the same `model.features.length` pattern already in the code. Any stale-state fix from Task 5 should be applied here too.

- [ ] **Step 4: Run tests**

Run: `cd /Users/psurry/hexagons/hexerei && npx vitest run`
Expected: All pass

- [ ] **Step 5: Manual test**

1. Create a new map, add terrain
2. Click a terrain chip to enter paint mode
3. Verify: inspector switches to show feature properties of the feature being painted
4. Click to paint several hexes — inspector stays on the feature
5. Press Escape to exit paint mode — feature stays selected

- [ ] **Step 6: Commit**

```bash
git add editor/src/App.tsx
git commit -m "feat(editor): auto-show feature properties during paint mode

Select the target feature when painting so the inspector shows
feature properties instead of map metadata."
```

---

### Task 7: Fix @all HexPath display formatting

Fix the ragged text display in the inspector for @all features.

**Files:**
- Modify: `editor/src/components/Inspector.css:247-255`
- Modify: `editor/src/components/Inspector.tsx:432` (optional collapsible)

- [ ] **Step 1: Fix CSS word breaking**

In `Inspector.css`, change `.inspector-at-readonly`:

```css
.inspector-at-readonly {
  display: block;
  overflow-wrap: break-word;
  word-break: normal;
  text-align: left;
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  max-height: 80px;
  overflow-y: auto;
}
```

Key changes: `word-break: break-all` → `word-break: normal` + `overflow-wrap: break-word`. Added explicit `text-align: left`.

- [ ] **Step 2: Add collapsible for large expansions (optional)**

In `Inspector.tsx`, around line 432 where `expandedAt` is displayed, add a collapsible if atom count is large:

```tsx
              {isAllFeature ? (
                atomCount !== null && atomCount > 20 ? (
                  <details className="inspector-at-details">
                    <summary className="font-mono inspector-at-readonly">
                      @all ({atomCount} {feature.geometryType === 'hex'
                        ? 'hexes' : feature.geometryType === 'edge'
                        ? 'edges' : 'vertices'})
                    </summary>
                    <span className="font-mono inspector-at-readonly">{expandedAt}</span>
                  </details>
                ) : (
                  <span className="font-mono inspector-at-readonly">{expandedAt}</span>
                )
              ) : (
```

- [ ] **Step 3: Style the details element**

In `Inspector.css`, add:

```css
.inspector-at-details summary {
  cursor: pointer;
  user-select: none;
}

.inspector-at-details summary:hover {
  color: var(--accent-hex);
}
```

- [ ] **Step 4: Run tests**

Run: `cd /Users/psurry/hexagons/hexerei && npx vitest run`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add editor/src/components/Inspector.tsx editor/src/components/Inspector.css
git commit -m "fix(editor): fix @all HexPath display formatting

Use overflow-wrap instead of word-break for cleaner line breaks.
Add collapsible summary for large @all expansions (>20 atoms)."
```

---

### Task 8: Edge shortest path

Implement BFS-based shortest path along hex edges for the `-` connector in HexPath.

**Files:**
- Modify: `core/src/math/hex-math.ts`
- Modify: `core/src/math/hex-math.test.ts`
- Modify: `core/src/hexpath/hex-path.ts:327-331,557-600`
- Modify: `core/src/hexpath/hex-path.test.ts`

- [ ] **Step 1: Write edge neighbor function tests**

In `core/src/math/hex-math.test.ts`, add:

```typescript
describe('getEdgeNeighbors', () => {
  test('edge has 4 neighbors (2 per endpoint vertex)', () => {
    // Edge between hex(0,0,0) and hex(1,-1,0) — direction 0 from origin
    const origin: Hex.Cube = { q: 0, r: 0, s: 0 };
    const neighbor = Hex.hexNeighbor(origin, 0);
    const edgeId = Hex.getCanonicalBoundaryId(origin, neighbor, 0);
    const neighbors = Hex.getEdgeNeighbors(edgeId);
    expect(neighbors.length).toBe(4);
    // All neighbors should be valid boundary IDs
    neighbors.forEach((n) => expect(n).toMatch(/\|/));
    // No neighbor should be the edge itself
    expect(neighbors).not.toContain(edgeId);
  });

  test('edge neighbors are distinct', () => {
    const origin: Hex.Cube = { q: 0, r: 0, s: 0 };
    const neighbor = Hex.hexNeighbor(origin, 0);
    const edgeId = Hex.getCanonicalBoundaryId(origin, neighbor, 0);
    const neighbors = Hex.getEdgeNeighbors(edgeId);
    expect(new Set(neighbors).size).toBe(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/psurry/hexagons/hexerei && npx vitest run core/src/math/hex-math.test.ts`
Expected: FAIL — `getEdgeNeighbors` not defined

- [ ] **Step 3: Implement getEdgeNeighbors**

In `core/src/math/hex-math.ts`, add:

```typescript
/**
 * Get the 4 neighboring edges of a given edge (edges sharing a vertex).
 * Each edge endpoint is a vertex where 3 edges meet; the 2 other edges
 * at each vertex are neighbors. Returns canonical boundary IDs.
 */
export function getEdgeNeighbors(boundaryId: string): string[] {
  const parsed = parseBoundaryId(boundaryId);
  if (!parsed.hexB) return []; // map-edge boundary, no neighbors

  const { hexA, hexB } = parsed;

  // Find the direction index from hexA to hexB
  let dirFromA = -1;
  for (let d = 0; d < 6; d++) {
    if (hexId(hexNeighbor(hexA, d)) === hexId(hexB)) {
      dirFromA = d;
      break;
    }
  }
  if (dirFromA === -1) return [];

  // The two vertices of this edge are at corners dirFromA and (dirFromA+1)%6 of hexA.
  // At each vertex, 3 edges meet. We want the other 2 at each vertex.
  const neighbors: string[] = [];

  // Vertex 1: corner dirFromA of hexA — shared by edges in directions (dirFromA-1) and dirFromA
  const prevDir = ((dirFromA - 1) + 6) % 6;
  const prevNeighbor = hexNeighbor(hexA, prevDir);
  neighbors.push(getCanonicalBoundaryId(hexA, prevNeighbor, prevDir));
  // The third edge at this vertex: from hexB in direction (dirFromA+2) relative to hexA
  // which is direction (dirFromA-1) from hexB's perspective...
  // Simpler: the third edge at vertex1 connects hexB to hexNeighbor(hexA, prevDir)
  neighbors.push(getCanonicalBoundaryId(hexB, prevNeighbor));

  // Vertex 2: corner (dirFromA+1)%6 of hexA — shared by edges in directions dirFromA and (dirFromA+1)
  const nextDir = (dirFromA + 1) % 6;
  const nextNeighbor = hexNeighbor(hexA, nextDir);
  neighbors.push(getCanonicalBoundaryId(hexA, nextNeighbor, nextDir));
  // Third edge at vertex2: connects hexB to hexNeighbor(hexA, nextDir)
  neighbors.push(getCanonicalBoundaryId(hexB, nextNeighbor));

  return neighbors;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/psurry/hexagons/hexerei && npx vitest run core/src/math/hex-math.test.ts`
Expected: PASS

- [ ] **Step 5: Write edge shortest path tests**

In `core/src/hexpath/hex-path.test.ts`, add:

```typescript
describe('edge shortest path', () => {
  test('adjacent edges connected with -', () => {
    // Two edges sharing a vertex should produce a direct connection
    const result = hexPath.resolve('0101/NE - 0101/E');
    expect(result.type).toBe('edge');
    expect(result.items.length).toBe(2);
    expect(result.segments?.length).toBe(1);
    expect(result.segments![0].length).toBe(2);
  });

  test('distant edges produce shortest path', () => {
    // Edges 2 steps apart should produce intermediate edges
    const result = hexPath.resolve('0101/NE - 0101/SW');
    expect(result.type).toBe('edge');
    // NE to SW are opposite edges — path goes around one side (3 edges total)
    expect(result.items.length).toBe(3);
    expect(result.segments?.length).toBe(1);
  });

  test('~ produces alternate path for ties', () => {
    // When two equal-length paths exist, ~ picks the other
    const result1 = hexPath.resolve('0101/NE - 0101/SW');
    const result2 = hexPath.resolve('0101/NE ~ 0101/SW');
    expect(result1.items.length).toBe(result2.items.length);
    // The paths should be different
    expect(result1.items).not.toEqual(result2.items);
  });

  test('single edge atom resolves normally', () => {
    const result = hexPath.resolve('0101/NE');
    expect(result.type).toBe('edge');
    expect(result.items.length).toBe(1);
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `cd /Users/psurry/hexagons/hexerei && npx vitest run core/src/hexpath/hex-path.test.ts`
Expected: FAIL — edge shortest path not implemented (the `-` connector currently calls `resolveShortestPath` which operates on hex cubes, not edge IDs)

- [ ] **Step 7: Implement resolveEdgeShortestPath**

In `core/src/hexpath/hex-path.ts`, add a new method:

```typescript
  /**
   * BFS shortest path between two edges in the edge adjacency graph.
   * Two edges are adjacent if they share a vertex.
   * Returns the sequence of boundary IDs from start to end (inclusive).
   */
  private resolveEdgeShortestPath(startId: string, endId: string, flip: boolean = false): string[] {
    if (startId === endId) return [startId];

    // BFS with safety limit (edge graph is infinite on an unbounded hex grid)
    const MAX_VISITED = 1000;
    const queue: string[][] = [[startId]];
    const visited = new Set<string>([startId]);
    let paths: string[][] = [];

    while (queue.length > 0 && visited.size < MAX_VISITED) {
      const path = queue.shift()!;
      const current = path[path.length - 1];

      const neighbors = Hex.getEdgeNeighbors(current);
      for (const neighbor of neighbors) {
        if (visited.has(neighbor)) continue;

        const newPath = [...path, neighbor];
        if (neighbor === endId) {
          paths.push(newPath);
          // Continue BFS at this depth to find all shortest paths
          // but don't go deeper
          if (paths.length >= 2) break;
          continue;
        }

        // Only continue if we haven't found a path yet
        // (BFS guarantees first found = shortest)
        if (paths.length === 0) {
          visited.add(neighbor);
          queue.push(newPath);
        }
      }

      if (paths.length >= 2) break;
    }

    if (paths.length === 0) return [startId]; // unreachable

    // flip selects the alternate path when ties exist
    return flip && paths.length > 1 ? paths[1] : paths[0];
  }
```

- [ ] **Step 8: Wire into the resolve parser**

In `hex-path.ts`, in the resolve method, find the connector handling (~line 327-331):

```typescript
        if (cursor.lastHex && cursor.pendingConnector !== 'none') {
          const flip = cursor.pendingConnector === 'flipped';
          const pathBetween = this.resolveShortestPath(cursor.lastHex, cube, flip);
          applyIds(pathBetween.slice(1).map((c) => this.formatId(c, cursor.type)));
```

Change to:

```typescript
        if (cursor.lastHex && cursor.pendingConnector !== 'none') {
          const flip = cursor.pendingConnector === 'flipped';
          if (cursor.type === 'edge' && cursor.currentSegment.length > 0) {
            // Edge path: BFS on edge adjacency graph
            const lastEdgeId = cursor.currentSegment[cursor.currentSegment.length - 1];
            const edgePath = this.resolveEdgeShortestPath(lastEdgeId, id, flip);
            applyIds(edgePath.slice(1)); // skip first (already in segment)
          } else {
            // Hex/vertex path: existing shortest path on hex grid
            const pathBetween = this.resolveShortestPath(cursor.lastHex, cube, flip);
            applyIds(pathBetween.slice(1).map((c) => this.formatId(c, cursor.type)));
          }
```

- [ ] **Step 9: Run tests, hygiene, and mutation testing**

Run: `cd /Users/psurry/hexagons/hexerei && npx vitest run core/src/hexpath/hex-path.test.ts`
Expected: PASS

Run: `cd /Users/psurry/hexagons/hexerei && npx vitest run && npm run hygiene`
Expected: All pass

Run: `cd /Users/psurry/hexagons/hexerei && npm run test:mutation`
Expected: Core math changes (getEdgeNeighbors) have adequate mutation coverage per AGENTS.md mandate.

- [ ] **Step 10: Commit**

```bash
git add core/src/math/hex-math.ts core/src/math/hex-math.test.ts core/src/hexpath/hex-path.ts core/src/hexpath/hex-path.test.ts
git commit -m "feat(core): edge shortest path via BFS on edge adjacency graph

Add getEdgeNeighbors() to hex-math (edges sharing a vertex).
Add resolveEdgeShortestPath() BFS to HexPath class. Wire into
resolve parser so '-' connector computes intermediate edges.
Support '~' for alternate path on ties."
```

---

## Summary

After all 8 tasks:

1. Theme contrast boosted to WCAG AA compliance
2. Inspector inputs respond to Enter (commit) and Escape (revert)
3. Terrain palette uses multi-column grid with 48px swatches and labels underneath
4. Terrain delete moved to edit panel with usage warning and close button
5. Edge double-paint bug investigated and fixed
6. Inspector auto-shows feature properties during paint mode
7. @all HexPath display uses clean word-wrapping with collapsible for large maps
8. Edge shortest path (`-` connector) works via BFS on edge adjacency graph with `~` tie-breaking
