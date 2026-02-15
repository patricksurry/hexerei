## Hex Geometry Reference

This section defines the mathematical relationships between coordinate
systems. It is normative: implementations MUST use these conversions.

### Cube coordinates

Cube coordinates (u, v, w) satisfy the constraint **u + v + w = 0**.
This constraint means any hex can be identified by two coordinates; the
third is derived. The three axes are symmetric, which simplifies
algorithms for distance, neighbors, rings, and line drawing.

Axial coordinates (q, r) are a two-component shorthand:
```
q = u
r = w
v = -q - r
```

### Offset to cube conversion

User coordinates are parsed into (col, row) integers via the label
pattern, then converted to cube coordinates. The conversion depends on
hex_top and stagger.

Let (col, row) be the parsed column and row, adjusted so the grid-origin
hex is (0, 0). (The `origin` field controls which visual corner maps to
the lowest-numbered hex; the `first` field provides the starting number.
The conversion below assumes col and row have been zero-indexed by
subtracting `first`. The origin direction is handled separately as a
reflection — for `"bottom-left"` or `"bottom-right"`, negate the row
axis; for `"top-right"` or `"bottom-right"`, negate the column axis.)

**Flat-top, stagger: low (odd columns sit lower):**
```
u = col
w = row - floor(col / 2)
v = -u - w
```

**Flat-top, stagger: high (odd columns sit higher):**
```
u = col
w = row - ceil(col / 2)
v = -u - w
```

**Pointy-top, stagger: low (odd rows sit further right):**
```
u = col - floor(row / 2)
w = row
v = -u - w
```

**Pointy-top, stagger: high (odd rows sit further left):**
```
u = col - ceil(row / 2)
w = row
v = -u - w
```

PDS: can't we combine the two pairs of equations by introducing a stagger=0/1 parameter?

### Neighbor directions in cube coordinates

The six neighbors of hex (u, v, w) and their edge directions:

**Flat-top:**

| Edge | Delta u | Delta v | Delta w |
|------|---------|---------|---------|
| N    |  0 | +1 | -1 |
| NE   | +1 |  0 | -1 |
| SE   | +1 | -1 |  0 |
| S    |  0 | -1 | +1 |
| SW   | -1 |  0 | +1 |
| NW   | -1 | +1 |  0 |

**Pointy-top:**

| Edge | Delta u | Delta v | Delta w |
|------|---------|---------|---------|
| NE   | +1 |  0 | -1 |
| E    | +1 | -1 |  0 |
| SE   |  0 | -1 | +1 |
| SW   | -1 |  0 | +1 |
| W    | -1 | +1 |  0 |
| NW   |  0 | +1 | -1 |

### Hex distance

The distance between two hexes in cube coordinates is:

```
distance = max(|u1-u2|, |v1-v2|, |w1-w2|)
```

Or equivalently:

```
distance = (|u1-u2| + |v1-v2| + |w1-w2|) / 2
```
