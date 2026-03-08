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
the grid's **orientation**.

Let (col, row) be the parsed column and row indices from the user
coordinates.

**Orientation: flat-down (Odd-Q):**
```
u = col
w = row - floor(col / 2)
v = -u - w
```

**Orientation: flat-up (Even-Q):**
```
u = col
w = row - ceil(col / 2)
v = -u - w
```

**Orientation: pointy-right (Odd-R):**
```
u = col - floor(row / 2)
w = row
v = -u - w
```

**Orientation: pointy-left (Even-R):**
```
u = col - ceil(row / 2)
w = row
v = -u - w
```

### Shortest Paths and Nudging

The `hexLine` algorithm calculates the shortest path between two hexes using linear interpolation in cube coordinates. To ensure deterministic results and enable tie-breaking, an epsilon bias (nudge) is applied to each interpolated point before rounding to the nearest hex.

```
biased_u = lerp_u + (eps * nudge)
biased_v = lerp_v - (eps * nudge)
biased_w = lerp_w
```

*   **Default Nudge**: Derived from the orientation. For `flat-down` and `pointy-right`, the default nudge is `+1`. For `flat-up` and `pointy-left`, it is `-1`.
*   **Flip Operator (`~`)**: Flips the sign of the nudge for a specific path segment.
*   **Reversal Symmetry**: The algorithm ensures that `hexLine(A, B, nudge) == reverse(hexLine(B, A, nudge))`.

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
