# Authoring Fixes, Missing Tests, and Label Format Selector

**Parent plan:** [2026-03-21-authoring-impl-plan.md](./2026-03-21-authoring-impl-plan.md)
**Date:** 2026-03-22

## Context

A thorough review of the authoring-from-scratch implementation identified bugs, missing tests, and an incomplete `formatHexLabel` function. This document specifies fixes and adds a label format selector to NewMapDialog and Inspector.

---

## 1. Bug Fixes

### 1.1 Paint hover doesn't re-render

**File:** `editor/src/canvas/CanvasHost.tsx`

**Problem:** `handlePointerMove` only calls `render()` during drag. In paint mode, the ghost terrain preview highlight never appears because mouse movement without dragging doesn't trigger a re-render.

**Fix:** In `handlePointerMove`, when `paintTerrainKey` is truthy and not dragging, update `lastMouse.current` with the current screen position and call `requestAnimationFrame(render)`.

### 1.2 Off-board hex hits leak into selection mode

**File:** `canvas/src/hit-test.ts`

**Problem:** Off-board hex hits (one-ring neighbors of the map boundary) are returned in all modes, not just paint mode. In select mode this lets users "select" non-existent hexes.

**Fix:** Add an `options?: { includeOffBoard?: boolean }` parameter to `hitTest`. Default `false`. Only check boundary neighbors when `includeOffBoard` is `true`. Update CanvasHost to pass `{ includeOffBoard: true }` only when `paintTerrainKey` is set.

### 1.3 NewMapDialog: malformed empty features YAML

**File:** `editor/src/components/NewMapDialog.tsx`

**Problem:** When no base terrain is selected, generates `features:\n  []\n` which is malformed YAML.

**Fix:** When `baseTerrain === 'none'`, emit `features: []\n` on one line.

### 1.4 NewMapDialog: identical terrain colors

**File:** `editor/src/components/NewMapDialog.tsx`

**Problem:** All "Standard Wargame" terrain types get `#cccccc`. Visually indistinguishable.

**Fix:** Define a color map for the Standard Wargame palette:
- clear: `#d4c87a` (tan/wheat)
- forest: `#2d6a1e` (dark green)
- rough: `#8b7355` (brown)
- urban: `#888888` (gray)
- water: `#4a8fc7` (blue)
- mountain: `#6b4226` (dark brown)

---

## 2. `formatHexLabel` — Multi-Format Support

**File:** `core/src/math/hex-math.ts`

**Current state:** Accepts `labelFormat` parameter but ignores it. Always returns `XXYY`.

### Supported formats

| Format | Example | Column | Separator | Row |
|--------|---------|--------|-----------|-----|
| `XXYY` | `0304` | 2-digit zero-padded | none | 2-digit zero-padded |
| `XX.YY` | `03.04` | 2-digit zero-padded | `.` | 2-digit zero-padded |
| `AYY` | `C04` | uppercase letter A=1 (or A=0) | none | 2-digit zero-padded |

### Signature

```typescript
export function formatHexLabel(
  hex: Cube,
  labelFormat: string,
  orientation: Orientation,
  firstCol: number = 1,
  firstRow: number = 1,
): string
```

### Logic

1. Convert cube → offset via `cubeToOffset(hex, orientation)`
2. Add `firstCol`/`firstRow` to get user-space column/row
3. Format according to `labelFormat`:
   - `XXYY`: `${col.padStart(2,'0')}${row.padStart(2,'0')}`
   - `XX.YY`: `${col.padStart(2,'0')}.${row.padStart(2,'0')}`
   - `AYY`: `${String.fromCharCode(64 + col)}${row.padStart(2,'0')}` (A=1)

### parseHexLabel (new)

Add a reverse function for completeness:

```typescript
export function parseHexLabel(
  label: string,
  labelFormat: string,
  orientation: Orientation,
  firstCol: number = 1,
  firstRow: number = 1,
): Cube
```

This is needed by the HexPath parser to interpret labels in any format. Currently the parser likely assumes XXYY — wire it up or note as future work depending on parser structure.

---

## 3. Label Format Selector — NewMapDialog

**File:** `editor/src/components/NewMapDialog.tsx`

### New UI elements

- **Label Format** dropdown: `XXYY`, `XX.YY`, `AYY` (default: `XXYY`)
- **First Column** number input (default: 1, min: 0)
- **First Row** number input (default: 1, min: 0)

### YAML generation changes

- Use `formatHexLabel` from `@hexmap/core` instead of local `formatHex`
- Pass selected `labelFormat`, `firstCol`, `firstRow` to corner label calculation
- Emit `label`, `first` fields in the YAML `coordinates` section:

```yaml
layout:
  hex_top: flat
  coordinates:
    label: XX.YY
    first: [1, 1]
  all: "01.01 - 10.01 - 10.10 - 01.10 fill"
```

---

## 4. Label Format Selector — Inspector

**File:** `editor/src/components/Inspector.tsx`

### Changes

- Replace the raw text `<input>` for label format with a `<select>` dropdown offering the same three formats: `XXYY`, `XX.YY`, `AYY`
- On change, dispatch `setLayout` command with `key: 'label'`
- This is display-only for now — does not rewrite existing `at` expressions in features
- Future: lossless HexPath ↔ cube coord round-trip enables safe relabeling

---

## 5. Missing Tests

### Phase 3 gaps

- **App:** `>open` command triggers file input click

### Phase 4 gaps

- **Inspector:** terrain chip click calls `onPaintActivate`, active chip styling
- **CanvasHost:** cursor changes to crosshair in paint mode, paint click fires instead of selection
- **App:** paint mode activation via terrain chip, Escape exits paint mode
- **StatusBar:** paint mode indicator displays terrain name + color + escape hint
- **hit-test:** off-board with `includeOffBoard: false` returns `none`, `includeOffBoard: true` returns hit with `offBoard: true`

### New tests for this work

- **formatHexLabel:** all three formats, with various `first` offsets
- **parseHexLabel:** round-trip with `formatHexLabel` for all formats
- **NewMapDialog:** YAML generation uses correct label format and `first` values, distinct terrain colors
- **Inspector:** label format dropdown dispatches `setLayout`

---

## Out of Scope

- Lossless HexPath ↔ cube coord round-trip (standalone future exercise)
- Rewriting `at` expressions when label format changes on existing maps
- Label formats beyond `XXYY`, `XX.YY`, `AYY`
- Origin/first UI in Inspector (Inspector only gets label format dropdown for now)
