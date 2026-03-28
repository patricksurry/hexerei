## Hex Geometry Reference

This section defines the mathematical relationships between coordinate
systems. It is normative: implementations MUST use these conversions.

### Cube coordinates

Cube coordinates `(q, r, s)` satisfy the constraint **q + r + s = 0**.
This means any hex can be identified by two coordinates; the third is
derived (`s = −q − r`). The three axes are symmetric, which simplifies
algorithms for distance, neighbors, rings, and line drawing. The
two-component **axial** form `(q, r)` omits `s` since it is always derived.

*Note: Some literature uses `{u, v, w}` notation where `u = q`, `v = s`,
`w = r`. The two systems are equivalent; this spec uses `{q, r, s}`
to match standard hex-grid implementations.*

### Offset to cube conversion

User coordinates are parsed into (col, row) integers via the label
pattern, then converted to cube coordinates. The conversion depends on
the grid's **orientation**.

Let `(col, row)` be the parsed column and row indices from the user
coordinates. These values are relative to the `origin` specified in the 
`layout`.

Implementations MUST transform these into a standard **top-left** reference 
frame before performing cube coordinate conversion. If the map's `origin` 
is not `top-left`, the indices are reflected:

*   **`bottom-left`**: `row' = (min_row + max_row) - row`
*   **`top-right`**: `col' = (min_col + max_col) - col`
*   **`bottom-right`**: Both reflections apply.

Where `min_col`, `max_col`, `min_row`, and `max_row` are the logical bounds 
of the map as defined in `layout.all`. If the `origin` is `top-left`, then 
`col' = col` and `row' = row`.

The resulting `(col', row')` are then used in the following conversion 
formulas:

**Orientation: flat-down (Odd-Q):**
```
q = col'
r = row' - floor(col' / 2)
s = -q - r
```

**Orientation: flat-up (Even-Q):**
```
q = col'
r = row' - ceil(col' / 2)
s = -q - r
```

**Orientation: pointy-right (Odd-R):**
```
q = col' - floor(row' / 2)
r = row'
s = -q - r
```

**Orientation: pointy-left (Even-R):**
```
q = col' - ceil(row' / 2)
r = row'
s = -q - r
```
```
q = col
r = row - floor(col / 2)
s = -q - r
```

**Orientation: flat-up (Even-Q):**
```
q = col
r = row - ceil(col / 2)
s = -q - r
```

**Orientation: pointy-right (Odd-R):**
```
q = col - floor(row / 2)
r = row
s = -q - r
```

**Orientation: pointy-left (Even-R):**
```
q = col - ceil(row / 2)
r = row
s = -q - r
```

### Shortest Paths

The `hexLine` algorithm calculates the shortest path between two hexes using
linear interpolation in cube coordinates. When an interpolated point is
equidistant from two candidate hexes, an epsilon bias resolves the tie
deterministically. The bias is designed so that paths along a constant
user-coordinate axis (same row for flat-top, same column for pointy-top)
always resolve to the axis-preserving hex.

```
effective_sign = base_sign × parity_sign × flip

biased_q = lerp_q + (1 · eps · effective_sign)
biased_s = lerp_s + (2 · eps · effective_sign)
biased_r = lerp_r − (3 · eps · effective_sign)
```

Where `eps = 1e-6`. The multipliers `(+1, +2, −3)` sum to zero, preserving
`q + r + s = 0`, and are all distinct, ensuring unambiguous rounding in every
tie case.

**Orientation base sign:**

| Orientation | Base sign |
|-------------|-----------|
| `flat-down`    | +1 |
| `flat-up`      | −1 |
| `pointy-right` | +1 |
| `pointy-left`  | −1 |

**Parity sign:** A per-segment correction that makes the "follows
user-coordinate axis" property hold for all start positions:

*   Flat-top: `parity_sign = (min(a.q, b.q) % 2 == 1) ? +1 : −1`
*   Pointy-top: `parity_sign = (min(a.r, b.r) % 2 == 1) ? +1 : −1`

**Flip operator (`~`):** Sets `flip = −1` for the arriving segment (default
`flip = +1`). See Section 6.

**Reversal symmetry:** Because `min(a, b)` is symmetric in its arguments,
`hexLine(A, B) == reverse(hexLine(B, A))` for any bias.

### Neighbor directions in cube coordinates

The six neighbors of hex (q, r, s) and their edge directions:

**Flat-top:**

| Edge | Δq | Δr | Δs |
|------|----|----|-----|
| N    |  0 | -1 | +1 |
| NE   | +1 | -1 |  0 |
| SE   | +1 |  0 | -1 |
| S    |  0 | +1 | -1 |
| SW   | -1 | +1 |  0 |
| NW   | -1 |  0 | +1 |

**Pointy-top:**

| Edge | Δq | Δr | Δs |
|------|----|----|-----|
| NE   | +1 | -1 |  0 |
| E    | +1 |  0 | -1 |
| SE   |  0 | +1 | -1 |
| SW   | -1 | +1 |  0 |
| W    | -1 |  0 | +1 |
| NW   |  0 | -1 | +1 |

### Hex distance

The distance between two hexes in cube coordinates is:

```
distance = max(|q1-q2|, |r1-r2|, |s1-s2|)
```

Or equivalently:

```
distance = (|q1-q2| + |r1-r2| + |s1-s2|) / 2
```
