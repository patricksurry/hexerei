# Unify Orientation: Replace hex_top + stagger with single `orientation` key

> **Plan location:** Save this plan to `rfc/docs/plans/2026-03-08-orientation-unification.md` before execution.

## Context

The HexMap format currently uses two independent keys (`hex_top` and `stagger`) to describe hex grid orientation. These aren't truly independent — stagger's meaning changes depending on hex_top, and together they produce exactly 4 configurations. Additionally, through discussion we discovered that stagger and path nudge are the same binary parity choice at different scales: stagger is the grid-level nudge, and nudge is the segment-level stagger.

This plan unifies:
1. `hex_top` + `stagger` → single `orientation` key with 4 values
2. `>[dir]` nudge operator → `~` binary flip derived from orientation
3. `hexLine` tie-breaking → deterministic bias from orientation (reversal-symmetric)
4. Direction validity, relative step syntax, fill semantics, and reference semantics

### New `orientation` values

Named by the position of the first staggered neighbor relative to origin:

| New value | Old hex_top + stagger | Old Stagger enum | Description |
|-----------|----------------------|-----------------|-------------|
| `flat-down` | flat + low | Stagger.Odd | Flat-top, odd cols shifted down. Most common wargame layout. |
| `flat-up` | flat + high | Stagger.Even | Flat-top, odd cols shifted up. Battle for Moscow uses this. |
| `pointy-right` | pointy + low | Stagger.Odd | Pointy-top, odd rows shifted right. |
| `pointy-left` | pointy + high | Stagger.Even | Pointy-top, odd rows shifted left. |

### New `~` nudge operator

Replaces `>[dir]`. A prefix on a destination coordinate that flips the default nudge for the arriving path segment. Default nudge is derived from orientation and applied as an epsilon bias on interpolated points (reversal-symmetric).

### Direction validity rules

Cardinal directions are constrained by orientation and geometry type:

**Flat-top** (`flat-down` / `flat-up`):
- Valid cardinal directions: **N, S** (plus compound: NE, SE, SW, NW) — 6 total
- **E and W are invalid** (no flat-top neighbor in pure E/W direction)
- Hex edges are at even clock hours: @12=N, @2=NE, @4=SE, @6=S, @8=SW, @10=NW
- Hex vertices are at odd clock hours: @1, @3, @5, @7, @9, @11

**Pointy-top** (`pointy-right` / `pointy-left`):
- Valid cardinal directions: **E, W** (plus compound: NE, SE, SW, NW) — 6 total
- **N and S are invalid** (no pointy-top neighbor in pure N/S direction)
- Hex edges are at odd clock hours: @1=NE, @3=E, @5=SE, @7=SW, @9=W, @11=NW
- Hex vertices are at even clock hours: @2, @4, @6, @8, @10, @12

Compound directions (NE/SE/SW/NW) are always valid but map to odd or even clock positions depending on orientation and geometry type (edge vs vertex).

**Invalid directions are a parse error** — using E/W on a flat-top map or N/S on a pointy-top map MUST produce a validation error.

### Relative step syntax

A relative step is written as one of:
- A single direction: `n`, `ne`, `se`, `s`, `sw`, `nw` (6 legal for given orientation)
- A clock hour: `@1` through `@12` (6 legal for given geometry type)
- A count + direction suffix: `3s`, `2ne`
- A count + clock suffix: `3@6`, `2@2`

Only 6 of the 12 clock hours are valid for a given geometry type (edges at even/odd hours for flat/pointy). Invalid clock hours are a parse error.

**Disambiguation:** In rare cases a count+direction like `3s` could be ambiguous with a coordinate label. Use `3*s` as an explicit relative step synonym: the `*` marks it unambiguously as a step.

### Floating anchor clarification

A HexPath segment MUST contain at least one explicit absolute anchor (coordinate or `@name` reference). The anchor defines:
1. The geometry type of the segment (hex, edge, or vertex)
2. How to interpret any leading relative steps

Leading relative steps are resolved retroactively when the first anchor is encountered. This is primarily for offboard references where absolute coordinates are awkward (e.g., a river entering the map from outside). Typically just a single relative step (e.g., `1n 0101` — "one hex north of 0101, then path to 0101").

### Fill (`!`) clarification

For hex geometry: `!` fills with all hexes inside the closed boundary.
For edge geometry: `!` adds all individual edges of the corresponding type within the closed cycle boundary (all edges that lie inside the polygon formed by the cycle).
For vertex geometry: `!` adds all individual vertices within the closed cycle boundary.

### Reference (`@name`) clarification

`@name` includes (or excludes, if in `-` mode) the full resolved geometry of the referenced feature — all items of the referenced feature's geometry type. By definition, a feature's `at` expression resolves to a single geometry type, so `@name` is type-safe. References can determine the type of the including expression if they appear first:

```yaml
features:
  - id: border
    at: "0101/N 0501/N"    # edge collection
  - at: "@border 0601/N"   # @border determines type = edge
    terrain: river
```

---

## Execution Order (TDD)

Each step: write/update tests first, then implement to make them pass, then commit.

### Step 1: RFC spec updates

Update the normative spec documents. No code changes yet.

**Files:**
- `rfc/sections/02-conventions.md` — Replace `flat-top`/`pointy-top`/`stagger` terminology with `orientation` definitions and the 4 values. Define valid/invalid cardinal directions per orientation. Add `~` operator definition.
- `rfc/sections/04-data-model.md` — Replace `hex_top` + `stagger` fields with single `orientation` field in the layout table. Rewrite the stagger/hex_top sections as the orientation section with 4-value explanation and ASCII diagrams. Document that `orientation` determines both grid layout and default path nudge.
- `rfc/sections/06-hexpath.md` — Major updates:
  - Replace `>[dir]` nudge with `~` operator (per-segment prefix on destination coordinate, flips default nudge, reversal-symmetric)
  - Add direction validity rules: only 6 of 8 compass directions valid per orientation; invalid directions are parse errors
  - Add clock notation for relative steps (@1...@12, count+@hour)
  - Add `*` disambiguation syntax for relative steps (e.g., `3*s`)
  - Clarify floating anchor rules: segment MUST have at least one absolute anchor
  - Clarify fill (`!`) semantics for edge and vertex types (adds singletons within cycle)
  - Clarify `@name` reference semantics: includes full resolved geometry of referenced feature, type-safe
- `rfc/sections/07-geometry.md` — Rewrite the 4 offset-to-cube conversion formulas using orientation value names. Add hexLine nudge specification (epsilon-bias on interpolated points, direction from orientation, reversal symmetry).
- `rfc/sections/11-json-schema.md` — Update the inline schema reference.
- `rfc/sections/appendix-b-clock.md` — Replace `hex_top` references with orientation values. Clarify which clock hours are valid for edges vs vertices per orientation.
- `rfc/README.md` — Update quick-start examples and any layout snippets.
- `rfc/examples/snippets/layout.yaml` — Update to use `orientation: flat-down`.
- `rfc/examples/minimal.json` — Update to use `orientation`.

**Commit:** `"spec: unify orientation, replace nudge with ~, clarify directions and fill"`

### Step 2: JSON Schema + schema tests (TDD)

**Tests first:**
- `rfc/tests/samples/valid/minimal.json` — Change `hex_top: flat` → `orientation: flat-down`
- `rfc/tests/samples/valid/snippets.json` — Change `hex_top`/`stagger` → `orientation: flat-down`
- `rfc/tests/samples/invalid/legacy_layout.json` — Keep as invalid (still uses old `hexes` key)
- Add new invalid test: `rfc/tests/samples/invalid/old_hex_top.json` — Document using `hex_top` (should fail under new schema)
- `rfc/tests/schema_tests/invalid_enum.yaml` — Update to test invalid `orientation` value (e.g., `orientation: sideways`)
- Add new valid test: `rfc/tests/samples/valid/pointy.json` — Test `orientation: pointy-right`

**Then schema:**
- `rfc/hexmap.schema.json` — Remove `hex_top` (required) and `stagger` (optional) from layout properties. Add `orientation` as required enum: `["flat-down", "flat-up", "pointy-right", "pointy-left"]`. Keep `all` as required. Update `required` array.

**Verify:** Run `python rfc/run_schema_tests.py` — all valid pass, all invalid fail.

**Commit:** `"spec: update JSON schema and tests for orientation field"`

### Step 3: Core hex-math types + offset conversions (TDD)

**Tests first** (`core/src/math/hex-math.test.ts`):
- Add `describe('Orientation helpers')`:
  - `orientationTop('flat-down')` returns `'flat'`, etc. for all 4 values
  - `orientationStagger('flat-down')` returns `Stagger.Odd`, etc. for all 4 values
  - `defaultNudge('flat-down')` returns expected sign for all 4
- Update `describe('createRectangularGrid stagger parity')` — use `Orientation` values
- Update round-trip offset tests to accept `Orientation`
- Add offset conversion tests for all 4 orientations

**Then implement** (`core/src/math/hex-math.ts`):
- Add `Orientation` string union type:
  ```ts
  export type Orientation = 'flat-down' | 'flat-up' | 'pointy-right' | 'pointy-left';
  ```
- Add helper functions:
  ```ts
  export function orientationTop(o: Orientation): HexOrientation
  export function orientationStagger(o: Orientation): Stagger
  export function defaultNudge(o: Orientation): 1 | -1
  ```
- Keep `Stagger` enum and `HexOrientation` type as internal implementation details
- Update `createRectangularGrid`, `offsetToCube`, `cubeToOffset` to accept `Orientation | Stagger` (overloaded for migration)

**Verify:** `npx vitest run` in `core/`

**Commit:** `"feat(core): add Orientation type with helper decomposers"`

### Step 4: Core hexLine nudge (TDD)

**Tests first** (`core/src/math/hex-math.test.ts`):
- Add `describe('hexLine with nudge')`:
  - Reversal symmetry: `hexLine(a, b, nudge)` produces same set as `hexLine(b, a, nudge)`
  - `nudge = 1` vs `nudge = -1` on a known ambiguous diagonal path produces different intermediate hexes
  - Non-ambiguous path (same axis) gives same result regardless of nudge
  - All ambiguous points resolve consistently (no floating-point instability)

**Then implement** (`core/src/math/hex-math.ts`):
- Add `nudge` parameter to `hexLine`:
  ```ts
  export function hexLine(a: Cube, b: Cube, nudge: 1 | -1 = 1): Cube[]
  ```
- Apply epsilon bias to each interpolated point before rounding:
  ```ts
  const eps = 1e-6;
  const biased = { q: frac.q + eps * nudge, r: frac.r - eps * nudge, s: frac.s };
  result.push(hexRound(biased));
  ```

**Verify:** Tests pass, reversal symmetry holds.

**Commit:** `"feat(core): add nudge parameter to hexLine with orientation-derived default"`

### Step 5: Core HexPath — orientation, ~, direction validation (TDD)

**Tests first** (`core/src/hexpath/hex-path.test.ts`):
- Update existing tests to use `orientation` in options instead of separate `stagger`/`hexTop`
- Add `describe('~ nudge operator')`:
  - `"a1 ~d1"` resolves differently than `"a1 d1"` on ambiguous paths
  - `"a1 ~d1"` resolves same hexes as `"d1 ~a1"` (reversal symmetry with flipped nudge)
  - `"~a1 d1"` — `~` on first coordinate has no effect
  - Non-ambiguous paths: `~` has no effect
- Add `describe('direction validation')`:
  - Flat-top: `"0101 1e"` throws (E invalid for flat-top)
  - Flat-top: `"0101 1w"` throws (W invalid for flat-top)
  - Flat-top: `"0101 1n"` succeeds (N valid for flat-top)
  - Pointy-top: `"a1 1n"` throws (N invalid for pointy-top)
  - Pointy-top: `"a1 1e"` succeeds (E valid for pointy-top)
- Add `describe('clock notation for relative steps')`:
  - `"0101 1@2"` — one step at 2 o'clock direction
  - `"0101 3@6"` — three steps at 6 o'clock
  - Invalid clock for geometry type throws
- Add `describe('* step disambiguation')`:
  - `"3*s"` parsed as 3 steps south, not as a coordinate

**Then implement** (`core/src/hexpath/hex-path.ts`):
- Update `HexPathOptions`: replace `stagger` + `hexTop` with `orientation: Orientation`
- Update `tokenize()`: recognize `~` as prefix on following coordinate token
- Update `resolve()`: flip nudge sign for `~`-prefixed destinations in `hexLine` calls
- Update `parseDirection()`: validate direction against orientation, throw on invalid (E/W for flat, N/S for pointy)
- Add clock hour parsing: `@N` maps to direction index, validate against geometry type
- Add `*` prefix recognition for explicit relative steps
- Update `isPointInPolygon` to use `orientationTop(orientation)` instead of raw stagger
- Pass `defaultNudge(orientation)` to all `hexLine` calls

**Verify:** All HexPath tests pass.

**Commit:** `"feat(core): implement ~, direction validation, clock steps in HexPath"`

### Step 6: Core loader + mesh + document (TDD)

**Tests first** (`core/src/format/loader.test.ts`):
- Update existing loader test to use `orientation: flat-up` instead of `hex_top: flat, stagger: high`
- Add test loading with `orientation: flat-down` (default case)
- Add backward-compat test: document with old `hex_top` + `stagger` keys still loads correctly

**Then implement:**
- `core/src/format/loader.ts` — Parse `layout.orientation` (falling back to `hex_top` + `stagger` for backward compat). Pass `Orientation` through to HexMesh and HexPath.
- `core/src/mesh/hex-mesh.ts` — Replace `_stagger: Stagger` with `_orientation: Orientation`. Update constructor config type. Add `orientation` getter. Keep `stagger` getter as computed from orientation (backward compat).
- `core/src/mesh/types.ts` — Update `MeshMap` interface if it exposes stagger.
- `core/src/index.ts` — Ensure `Orientation` type is exported.

**Verify:** Loader tests pass. Existing mesh tests pass.

**Commit:** `"feat(core): update loader and mesh to use Orientation"`

### Step 7: Map files

- `maps/definitions/battle-for-moscow.hexmap.yaml` — Replace `hex_top: flat` + `stagger: high` with `orientation: flat-up`
- `editor/public/maps/battle-for-moscow.hexmap.yaml` — Same change. Also migrate `grid:` → `layout:` if not yet done.
- `renderer/demo/public/battle-for-moscow.hexmap.yaml` — Same change (if exists)

**Commit:** `"chore: migrate map files to orientation field"`

### Step 8: Editor updates

**Files:**
- `editor/src/model/map-model.ts` — Update `GridConfig` interface: replace `hexTop` + `stagger` with `orientation: Orientation`. Add computed getters `hexTop` and `stagger` that derive from orientation. Update constructor. Update `hexIdToLabel`.
- `editor/src/model/scene.ts` — Use `orientationTop(model.grid.orientation)` for pixel calculations.
- `editor/src/model/hit-test.ts` — Same pattern.
- `editor/src/canvas/CanvasHost.tsx` — Same pattern.
- `editor/src/components/Inspector.tsx` — Replace separate "Hex Top" and "Stagger" rows with single "Orientation" row showing the value directly (e.g., "flat-up").
- `editor/src/App.tsx` — No changes needed (doesn't reference orientation directly).

**Tests:** Update any editor model tests that reference `hexTop` or `stagger` in GridConfig.

**Commit:** `"feat(editor): update editor to use unified Orientation"`

### Step 9: Renderer updates

- `renderer/src/index.ts` — Replace stagger parsing from `layout.stagger` with orientation parsing from `layout.orientation`. Derive stagger and hexTop from orientation for rendering math. Add backward compat for old format.
- `renderer/src/renderer.test.ts` — Update any tests that reference stagger/hex_top.

**Commit:** `"feat(renderer): update renderer to use Orientation"`

### Step 10: Cleanup

- Remove deprecated `Stagger` enum export from public API (keep as internal type used by math functions)
- Remove deprecated `HexOrientation` export from public API (keep as internal)
- Update `core/README.md` if it documents the old API
- Update `editor/docs/2026-03-07-editor-phase4-impl-plan.md` — references to stagger bug fixes are now obsolete (fixed as part of this work)
- Update MEMORY.md

**Commit:** `"chore: remove deprecated Stagger/HexOrientation from public API"`

---

## Key Design Decisions

1. **`Orientation` is a string union, not an enum** — string literals are simpler, serialize naturally to JSON/YAML, no import needed at call sites.

2. **`Stagger` and `HexOrientation` stay as internal types** — the math functions (`hexToPixel`, `offsetToCube`) still need to branch on flat/pointy and odd/even. The helper functions `orientationTop()` and `orientationStagger()` bridge the gap.

3. **Backward compatibility in loader** — the loader accepts old `hex_top` + `stagger` and converts to `Orientation` internally. This lets existing map files work during migration.

4. **Nudge epsilon on interpolated points** — not on endpoints. This ensures `hexLine(a, b) == hexLine(b, a)` (reversal symmetry). The epsilon is `1e-6` biasing `q` positive and `r` negative (or opposite), determined by orientation.

5. **`~` is per-segment, not modal** — unlike `+`/`-` which are modal switches, `~` only affects the segment arriving at the prefixed coordinate. This is more explicit and prevents accidental flips.

6. **`~` on first coordinate has no effect** — no incoming segment to flip. Not an error, just a no-op.

7. **Direction validation is strict** — E/W are invalid for flat-top, N/S are invalid for pointy-top. Using an invalid direction is a parse error, not a silent mapping.

8. **Clock notation is type-aware** — for flat-top: even hours = edges, odd hours = vertices. For pointy-top: reversed. Invalid clock hours for the current geometry type are parse errors.

9. **`*` for step disambiguation** — `3*s` is unambiguously "3 steps south". Used only when a count+direction could be confused with a coordinate label.

10. **`@name` references are type-safe** — they include/exclude the full resolved geometry of the named feature. The reference's type must match (or establish) the expression's type.

11. **Fill for edges/vertices** — `!` adds singleton items (individual edges or vertices) that fall within the closed cycle boundary, not hex fills.

---

## Verification

After all steps complete:

1. **Schema tests:** `cd rfc && python run_schema_tests.py` — all pass
2. **Core tests:** `cd core && npx vitest run` — all pass
3. **Editor tests:** `cd editor && npx vitest run` — all pass
4. **Renderer tests:** `cd renderer && npx vitest run` — all pass
5. **Visual check:** Run editor, load Battle for Moscow — stagger renders correctly as flat-up
6. **Nudge check:** In core tests, verify ambiguous `hexLine` paths produce different results with flipped nudge, and same results regardless of direction
7. **Direction validation:** Verify flat-top maps reject E/W directions, pointy-top reject N/S

## Files Modified (complete list)

### RFC (9 files)
- `rfc/sections/02-conventions.md`
- `rfc/sections/04-data-model.md`
- `rfc/sections/06-hexpath.md`
- `rfc/sections/07-geometry.md`
- `rfc/sections/11-json-schema.md`
- `rfc/sections/appendix-b-clock.md`
- `rfc/README.md`
- `rfc/examples/snippets/layout.yaml`
- `rfc/examples/minimal.json`

### Schema + tests (7 files)
- `rfc/hexmap.schema.json`
- `rfc/tests/samples/valid/minimal.json`
- `rfc/tests/samples/valid/snippets.json`
- `rfc/tests/samples/valid/pointy.json` (new)
- `rfc/tests/samples/invalid/old_hex_top.json` (new)
- `rfc/tests/schema_tests/invalid_enum.yaml`
- `rfc/run_schema_tests.py` (no changes expected, but verify)

### Core (8 files)
- `core/src/math/hex-math.ts`
- `core/src/math/hex-math.test.ts`
- `core/src/hexpath/hex-path.ts`
- `core/src/hexpath/hex-path.test.ts`
- `core/src/format/loader.ts`
- `core/src/format/loader.test.ts`
- `core/src/mesh/hex-mesh.ts`
- `core/src/index.ts`

### Editor (6+ files)
- `editor/src/model/map-model.ts`
- `editor/src/model/scene.ts`
- `editor/src/model/hit-test.ts`
- `editor/src/canvas/CanvasHost.tsx`
- `editor/src/components/Inspector.tsx`
- `editor/public/maps/battle-for-moscow.hexmap.yaml`

### Renderer (2 files)
- `renderer/src/index.ts`
- `renderer/src/renderer.test.ts`

### Map files (2 files)
- `maps/definitions/battle-for-moscow.hexmap.yaml`
- `editor/public/maps/battle-for-moscow.hexmap.yaml`
