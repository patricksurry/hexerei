# Orientation Unification Specification

## Context

The HexMap format currently uses two independent keys (`hex_top` and `stagger`) to describe hex grid orientation. These aren't truly independent — stagger's meaning changes depending on hex_top, and together they produce exactly 4 configurations. Additionally, stagger and path nudge are the same binary parity choice at different scales: stagger is the grid-level nudge, and nudge is the segment-level stagger.

This specification unifies:
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
