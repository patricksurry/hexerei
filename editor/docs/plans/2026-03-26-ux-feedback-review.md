# UX Feedback Review & HexPath Refactor Plan — 2026-03-26

PDS: To avoid future vibe-code collapse, should we incorporate jscpd and knip in the build pipeline?
And potentially switch to biome from eslint/prettier?


## Overview

User testing surfaced six issues, most traceable to one root cause: **HexPath strings are the source of truth but are mutated via ad-hoc string concatenation rather than a proper parse→modify→serialize cycle.** This plan addresses the root cause first, then fixes each symptom.

---

## Part A: HexPath Serialize — Foundational Refactor

### Problem

There is no `HexPath.serialize()`. Every place that builds or modifies a HexPath string does raw string surgery:

| Location | What it does | Problem |
|---|---|---|
| `App.tsx:297` | Paint accumulation: `feature.at + " " + token` | No separators, no grammar awareness |
| `App.tsx:42` | Display formatting: regex comma insertion | Breaks on `-` operators, produces `0703/SE -, 0903/SE` |
| `NewMapDialog.tsx:79` | Rectangle: template literal `${c1} - ${c2} - ... fill` | One-off, can't reuse |
| `selection.ts:22,46` | ID→atom: `boundaryIdToHexPath`, `vertexIdToHexPath` | Fine as atomic converters, but callers concat results unsafely |

### Design

**Core principle:** HexPath strings are the *serialization format*. All mutations go through **parse → modify structured data → serialize**. No string surgery anywhere in the editor.

#### Data model

```typescript
// A Segment is a connected chain of geometry elements.
// Within a segment, consecutive items are neighbors (rendered with `-` in HexPath).
// Single-element segments represent standalone atoms (rendered as bare atoms).
interface HexPathSegments {
  type: GeometryType;
  segments: string[][]; // each inner array is a connected chain of IDs
}
```

#### New API: `HexPath.serialize()`

```typescript
// core/src/hexpath/hex-path.ts

/**
 * Serialize structured segments back to a canonical HexPath string.
 *
 * Rules:
 * - Items within a segment joined with ` - ` (connected path)
 * - Segments separated with `, ` (discontinuous)
 * - Singleton segments rendered as bare atoms (no `-`)
 * - IDs converted to user-facing labels using the same format options
 *
 * Round-trip guarantee: serialize(resolve(s).segments) ≈ s
 * (modulo whitespace normalization and path expansion)
 */
static serialize(
  segments: string[][],
  type: GeometryType,
  options: { labelFormat, orientation, firstCol, firstRow }
): string
```

The serialize function needs to convert internal IDs (cube coords like `0,0,0`) back to user-facing labels (`0101`). For edges/vertices, it needs to convert boundary/vertex IDs back to HexPath notation (`0703/SE`, `0703.2`).

PDS: if internal IDs are cube coords, why don't we use a cubecoord type instead of string for segments??   This applies throughout this doc.

#### New API: `HexPath.idToAtom()`

```typescript
/**
 * Convert an internal geometry ID to a HexPath atom string.
 * - Hex: cube ID → label (e.g., "0,0,0" → "0101")
 * - Edge: boundary ID → "label/dir" (e.g., "0,0,0|1,0,-1" → "0101/SE")
 * - Vertex: vertex ID → "label.corner" (e.g., "0,0,0^1,-1,0^1,0,-1" → "0101.0")
 */
idToAtom(id: string, type: GeometryType): string
```

This replaces `boundaryIdToHexPath()` and `vertexIdToHexPath()` from `selection.ts` — those become thin wrappers or are inlined.

#### Round-trip testing

```typescript
describe('HexPath serialize/resolve round-trip', () => {
  const cases = [
    '0101',                           // singleton hex
    '0101, 0201, 0301',               // disconnected hexes
    '0101 - 0201 - 0301',             // connected path
    '0101 - 0301, 0501 - 0601',       // mixed segments
    '0101/SE, 0201/NE',               // edge atoms
    '0101.0, 0201.3',                 // vertex atoms
    '0101 - 0201 - 0301 - 0101 fill', // fill (special case)
  ];

  for (const input of cases) {
    it(`round-trips: ${input}`, () => {
      const result = hexPath.resolve(input);
      const output = HexPath.serialize(result.segments, result.type, opts);
      const result2 = hexPath.resolve(output);
      expect(result2.items).toEqual(result.items);
      expect(result2.segments).toEqual(result.segments);
    });
  }
});
```

### Design Pattern (document in code)

```
┌─────────────┐     resolve()      ┌──────────────────┐
│  HexPath     │ ──────────────►   │  HexPathResult    │
│  string      │                   │  .items: string[] │
│  (feature.at)│ ◄──────────────   │  .segments: [][]  │
└─────────────┘    serialize()     │  .type            │
                                   └──────────────────┘
                                          │
                                   modify segments
                                   (append, remove, etc.)
                                          │
                                          ▼
                                   serialize() back
```

**Rule: Never build HexPath strings by concatenation. Always serialize from structured data.**

---

## Part B: Symptom Fixes

### Issue 1: Segment path rendering connects ALL hexes

**Root cause:** `parseHexPathInput` returns `result.path` (flat traversal order) as `segmentPath`. For `@all` + fill, this is every hex in snake order.

**Fix:**
- Change `HexPathPreview` interface: `segmentPath?: string[]` → `segments?: string[][]`
- Use `result.segments` from the resolve
- Update `CanvasHost` props and `buildScene` to accept `segments: string[][]`
- Render each segment as a separate polyline; skip segments of length ≤ 1
- **Open question**: For fill operations, should we show the boundary outline, the defining path, or nothing? (See Q3 below)

**Files:** `canvas/src/hex-path-preview.ts`, `editor/src/canvas/CanvasHost.tsx`, `canvas/src/scene.ts`

### Issue 2: Feature stack ordering

**Current behavior:** Newest at top, @all at bottom (standard layer-panel convention).

**Open question:** Is this the desired order? (See Q1 below)

PDS: OK, sounds reasonable if this is normal layer convention.

### Issue 3: Edge painting produces malformed HexPath

**Root cause:** String concatenation + broken regex formatting.

**Fix:** After Part A is in place, the paint handler becomes:
1. Parse current `feature.at` → segments
2. Append new atom to segments (new singleton segment, or extend last segment if shift-click)
3. Serialize back to string
4. No `formatHexPathDisplay` needed — serialize produces canonical format

**Files:** `editor/src/App.tsx` (handlePaintClick, remove formatHexPathDisplay)

### Issue 4: Edge path doesn't render intermediate segments

**Root cause:** Shift-click currently means subtraction (`- atom`), not path extension.

PDS: what?? shift-click already extends hex path ("a2 - a6" means connected segment, not subtraction).  same should be true for edges.

**Open question:** Should shift-click mean "extend path" for edges? (See Q2 below)

**If yes:** On shift-click, compute intermediate edges between last-painted edge and clicked edge, append as connected segment. This requires a shortest-edge-path function (may already exist or be derivable from hex neighbor traversal).

### Issue 5: @all expansion not visible in inspector

**Finding:** Inspector shows `at` field with `@all` text. This is correct — `@all` is a keyword, not an expandable macro.

PDS: but @all is essentially a reserved ID that has an underlying hexpath definition.  when you select it, 'all' should be the ID (non-editable) in feature properties, and at should show the current hexpath string.  side note: the feature properties / terrain currently shows a non-styled(?) dropdown with terrain name, but it should use the same rendering for dropdown items (filled hex plus label) that we use in the terrain paint palette.

**Possible enhancement:** Show hex count next to `@all` (e.g., `@all (100 hexes)`). Low priority.

PDS: having a geometry atom count under the at field could be a nice hint.

### Issue 6: Feature label shows terrain instead of id

**Root cause:** Label priority is `label || terrain || id || fallback`.

**Fix:** Change to `label || id || terrain || fallback`.

**File:** `editor/src/components/FeatureStack.tsx:53-57`

---

## Open Questions

**Q1: Feature stack order** — Newest at top, @all at bottom is standard layer convention. Is this what you want, or should @all be at top?

PDS: ok, if that's standard leave as is.

**Q2: Shift-click for edge painting** — Should it mean "extend connected path" (computing intermediates) or "subtract"? Or both (shift=extend, alt=subtract)?

PDS: extend, like hexes.  subtract is an edge case, we can decide later. 

**Q3: Fill boundary rendering** — When selecting a filled feature, the dotted line should show: (a) boundary outline only, (b) nothing, or (c) the defining path segments (the rectangle corners + fill keyword)?

PDS: exactly based on the hexpath nested list of geo elements.  for fill you should end up with a closed loop that's a single segment for the outside, and the interior is just a list of singletons (not connected)

---

## Implementation Order

1. **HexPath.serialize() + idToAtom()** — foundational, with round-trip tests
2. **Refactor paint handler** — use parse→modify→serialize instead of string concat
3. **Remove formatHexPathDisplay** — serialize produces canonical format
4. **Segment-aware preview rendering** — multi-segment polylines in CanvasHost/scene
5. **Feature label priority** — trivial one-liner
6. **Edge path extension** (if Q2 confirmed) — compute intermediate edges on shift-click
7. **Document the pattern** — comment in HexPath class + AGENTS.md or similar
