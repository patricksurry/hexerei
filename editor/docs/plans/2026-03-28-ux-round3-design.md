# UX Round 3 — Design Spec

**Date:** 2026-03-28
**Goal:** Fix visual contrast, edge painting bugs, input friction, terrain palette UX, and add edge shortest-path support.

---

## Workstream A: Visual Foundation

### A1. Dark-on-Black Contrast Fix

**Problem:** `--text-muted` (#484F58) on `--bg-base` (#0A0E14) has ~2.3:1 contrast ratio. WCAG AA requires 4.5:1. Borders (#1A2332) are nearly invisible.

**Changes to `editor/src/styles/theme-sandtable.css`:**

| Variable | Current | Proposed | Rationale |
|----------|---------|----------|-----------|
| `--text-muted` | #484F58 | #7D8590 | ~4.8:1 ratio, WCAG AA compliant |
| `--border-subtle` | #1A2332 | #30363D | Visible separation without being harsh |
| `--bg-elevated` | #151B23 | #1C2333 | Clearer surface elevation |
| `--border-focus` | #2A3A4A | #3A4A5A | Visible focus rings |

Values match GitHub's dark theme — proven palette that maintains the tactical aesthetic.

### A2. Terrain Palette Redesign

**Problem:** Tiny 20px chips in a single-column list. Hard to scan, doesn't show actual paint appearance.

**Design:**
- Replace list layout with CSS Grid: `grid-template-columns: repeat(auto-fill, minmax(56px, 1fr))`
- Each cell: 48px SVG showing a hex with geometry appropriate terrain painted (hex fill or linear path painted, one edge paint, one vertex circle paint), plus terrain key label underneath (10px)
- `TerrainChip` already renders these three shapes at 16px — add a `size` prop (default 16, palette uses 48) that scales the SVG viewBox proportionally
- Single click activates paint mode (same as today)
- Double-click opens edit panel (same as today)
- Active paint terrain gets geometry-colored accent glow: `--accent-hex` for hex tab, `--accent-edge` for edge tab, `--accent-vertex` for vertex tab (matching existing `.terrain-chip-{geo}.active` pattern)
- Grid adapts to panel width (2-4 columns depending on space)
- The X delete button is NOT present in the grid layout (moved to edit panel per A3)

**Files:** `Inspector.tsx` (terrain section rendering), `Inspector.css` (new grid styles), `TerrainChip.tsx` (size prop)

### A3. Terrain Delete Safety

**Problem:** X button on every terrain row is too easy to hit. No protection against deleting terrain types that features reference.

**Design:**
- Remove the X button from the terrain row header
- Add "Delete terrain type" button at bottom of the expanded edit form (red, secondary style)
- Before executing delete, count features referencing this terrain key across all geometry types
- If count > 0, show inline warning: "Used by N features. Deleting will remove terrain from those features." with Confirm/Cancel
- If count === 0, delete immediately (no confirmation needed)
- add close/minimize button to panel to collapse back to terrain chip

**Files:** `Inspector.tsx` (move delete button, add usage check)

---

## Workstream B: Edge Painting & Pathfinding

### B1. Edge Double-Paint Bug

**Problem:** Click to paint an edge adds two edges instead of one. Hit-test preview is correct — the bug is in the paint commit path.

**Investigation findings:**
- `handlePointerUp` fires once per click (verified)
- `handlePaintClick` dispatches one `updateFeature` command
- `idToAtom` produces correct single-atom string
- `resolve(atomId)` should return exactly 1 item
- No React StrictMode double-fire (event handlers exempt)

**Debug approach:**
1. Add temporary logging in `handlePaintClick`: log `feature.at` before resolve, `segments` after modification, serialized output
2. Add round-trip assertion: `resolve(serialize(segments)).items.length` should equal expected count
3. Check if `model.features[targetIndex]` reflects the previous dispatch or stale state
4. Likely fix: the stale closure reads the pre-dispatch `feature.at`, which still has the old value, causing the serialize to produce a string that doesn't include the just-painted atom — then on the next render, the state reconciles oddly

**Expected fix area:** `editor/src/App.tsx` handlePaintClick — may need to use a ref for the latest feature state, or derive the new `at` string without re-reading from `model`.

### B2. Edge Shortest Path

**Problem:** Shift-click should extend edge paths by computing intermediate edges, same as hex paths.

**Algorithm:**
1. Given two boundary IDs (start edge, end edge), extract the "midpoint" of each: for boundary `hexA|hexB`, the midpoint is conceptually between those two hexes
2. Compute hex shortest path between the two midpoint hexes using existing `resolveShortestPath`
3. For each consecutive pair of hexes in the path, compute the shared boundary ID
4. Return the sequence of boundary IDs as the edge path

**Detail — mapping hex path to edge path:**
- For hex path `[h0, h1, h2, h3]`, the edge path is `[boundary(h0,h1), boundary(h1,h2), boundary(h2,h3)]`
- Use `Hex.getCanonicalBoundaryId()` for each pair
- The start and end edges need special handling: the start edge's hexA might not be h0, and the end edge's hexB might not be the last hex

**Simpler approach:** Use the edge graph directly.
- Two edges are neighbors if they share a hex AND are adjacent directions (differ by 1 mod 6) on that hex
- BFS from start edge to end edge in the edge adjacency graph
- This naturally handles edge connectivity without mapping through hex paths
- Support `~` tie-breaking: when BFS finds two equal-length paths, prefer the one that goes "the other way" around

**Edge adjacency definition:** Two edges are adjacent if they share a vertex — i.e., consecutive edges around a hex (directions differ by 1 mod 6) or edges on neighboring hexes that meet at the same vertex. This models the "river-following" pattern where edges form continuous lines along hex boundaries. Example: edges `0101/NE` and `0101/E` are adjacent because they share the vertex between those two directions on hex 0101.

**Recommended:** BFS on the edge "line graph" (graph theory term: edges-as-nodes, adjacent if sharing a vertex). Red Blob Games has no edge pathfinding content — this is standard graph search with hex-specific adjacency. See [Grid Parts](https://www.redblobgames.com/grids/parts/) for the Endpoints relation that maps edges to their bounding vertices.

**Implementation:**
- Add `resolveEdgeShortestPath(startId: string, endId: string, flip: boolean): string[]` to HexPath class
- Edge neighbor generation: for a given boundary ID, find the neighboring edges at each endpoint vertex (the other edges meeting at that vertex, excluding the current edge) — typically 4 neighbors total (2 per vertex)
- BFS from start to end edge using this adjacency
- For `~` tie-breaking: when two shortest paths exist, BFS naturally finds one; flip reverses the preference at the first branch point
- Wire into the resolve parser: when `cursor.type === 'edge'` and connector is `-`, call `resolveEdgeShortestPath` instead of `resolveShortestPath`. The type is already known by the time a connector is processed (set on first atom, line 299)
- The existing resolve infrastructure handles `~` for flip already

**Files:** `core/src/hexpath/hex-path.ts`, `core/src/hexpath/hex-path.test.ts`

---

## Workstream C: Inspector & Input Polish

### C1. Auto-Show Feature Panel During Paint

**Problem:** When painting, inspector stays on map metadata. User can't set name/ID while painting.

**Design:**
- When `paintState` is set with a `targetFeatureIndex`, auto-select that feature in the selection state via `handleSelectFeature([targetFeatureIndex])`
- When a new feature is created by first paint click (targetFeatureIndex is null), the dispatch creates the feature and then `setPaintState` sets `targetFeatureIndex: model.features.length`. On the next render cycle, select the new feature. Note: this uses the same stale-index pattern already in the code (line 322 of App.tsx) — any fix from B1 should be applied here too
- This naturally causes Inspector to render feature properties instead of map metadata
- When paint mode exits (Escape or badge close), keep the feature selected so the user can continue editing properties

**Depends on:** B1 (stale state investigation may change how feature index is tracked after dispatch)

**Files:** `editor/src/App.tsx` (paintState management, selection sync)

### C2. @all HexPath Display Fix

**Problem:** The expanded hex list displays with ragged/misaligned text. Content is correct, formatting is wrong.

**Fix:**
- Change `word-break: break-all` to `overflow-wrap: break-word` in `.inspector-at-readonly`
- Ensure `text-align: left` is explicit
- For large expansions (>200 chars), show a collapsible: first line + "... (N hexes)" with click-to-expand

**Files:** `Inspector.css`, possibly `Inspector.tsx` for collapsible

### C3. Input Field Polish

**Problem:** Enter doesn't commit. Fields may have inconsistent sizing.

**Fix — Enter/Escape key handling:**
- Add `onKeyDown` handler to all `inspector-input` fields
- Enter: call `e.currentTarget.blur()` which triggers the existing `onBlur` handler (commits the change)
- Escape: call `e.currentTarget.blur()` without committing — the `onBlur` handler already compares against the model value, so if we reset the input value first it's a no-op. Simplest approach: set `e.currentTarget.value` back to the `defaultValue` (available via `e.currentTarget.defaultValue`), then blur. This avoids needing a ref.

**Fix — Consistent sizing:**
- Audit all `.inspector-row` instances for consistent flex layout
- Ensure all labels have the same `min-width` (or use a CSS Grid with fixed label column)
- Ensure all inputs use `flex: 1` with no competing width/max-width

**Files:** `Inspector.tsx` (add onKeyDown), `Inspector.css` (audit widths)

---

## Implementation Order

1. **A1: Contrast fix** — unblocks visual review of everything else
2. **C3: Input polish** — quick wins (Enter key, sizing)
3. **B1: Edge double-paint debug** — investigate and fix before building on top
4. **B2: Edge shortest path** — core algorithm with TDD
5. **C1: Paint-mode inspector** — state management
6. **C2: @all display fix** — CSS tweak
7. **A2: Terrain palette redesign** — larger visual change
8. **A3: Terrain delete safety** — completes palette work

---

## Out of Scope

- Vertex shortest path (not requested)
- Build pipeline tooling (jscpd, knip, biome — separate infrastructure)
- NewMapDialog generating boundary+fill instead of individual hexes for @all (separate enhancement)
- Keyboard accessibility for TerrainSelect (noted, separate task)
