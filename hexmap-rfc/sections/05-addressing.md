## Addressing Notation

HexMap uses a compact notation for referencing hexes, edges, and vertices.
This notation appears in the `features` list and wherever geometry is
referenced.

### Grammar

The addressing notation for atoms follows this grammar (ABNF-style):

```
atom        = hex-ref / edge-ref / vertex-ref / ref-id
hex-ref     = user-coord
edge-ref    = user-coord "/" direction
vertex-ref  = user-coord "." direction
ref-id      = "@" identifier
direction   = compass-dir / index
compass-dir = "N" / "NE" / "E" / "SE" / "S" / "SW" / "W" / "NW"
index       = "1" / "2" / "3" / "4" / "5" / "6"
```

Where `user-coord` is a string matching the label pattern defined in
`grid.coordinates` (e.g., `"0304"` for XXYY).

The `/` separator marks edge references. The `.` separator marks vertex
references. Indices 1-6 are clockwise from 12 o'clock (see Section 5.5).

### Hexes

A hex is referenced by its user coordinate string or by a reference to
another feature:

```
0304        # XXYY format
C4          # letter-number format
@moscow     # reference to feature 'moscow'
```

### Edges

An edge is referenced as `hex/direction`:

```
0304/N      # north edge of hex 0304 (compass direction)
0304/1      # same edge, by clockwise index
```

### Vertices

A vertex is referenced as `hex.direction`:

```
0304.NE     # northeast vertex of hex 0304 (compass direction)
0304.1      # same vertex, by clockwise index
```

### Edge and vertex directions

The compass directions available for edges and vertices depend on
`hex_top`. The following diagrams show both on the same hex shape.
Edges are labeled along the sides; vertices are labeled at the corners:

**Flat-top** (`hex_top: flat`):

```
               NW (v)    N (e)    NE (v)
                  · _____________ ·
                  /               \
      NW (e)    /                  \    NE (e)
               /                    \
          W (v)·                    · E (v)
               \                    /
      SW (e)    \                  /    SE (e)
                 \               /
                  · ____________·
               SW (v)    S (e)    SE (v)
```

Edge directions: **N, NE, SE, S, SW, NW** (6 edges)
Vertex directions: **NE, E, SE, SW, W, NW** (6 vertices)

**Pointy-top** (`hex_top: pointy`):

```
                       N (v)
                        /\
                       /  \
            NW (e)   /     \   NE (e)
                    /        \
           NW (v) ·           · NE (v)
                  |            |
            W (e) |            | E (e)
                  |            |
           SW (v) ·           · SE (v)
                    \        /
            SW (e)   \     /   SE (e)
                      \   /
                       \/
                       S (v)
```

PDS: diagram is too squashed horizontally

Edge directions: **NE, E, SE, SW, W, NW** (6 edges)
Vertex directions: **N, NE, SE, S, SW, NW** (6 vertices)

### Numeric addressing with clock hours

PDS: except they're not actually addressed with the clock hour,
or also allow a syntax like hex@hour?

Edges and vertices can also be addressed by clockwise index (1-6). The
following tables show the mapping, including the corresponding clock
hour position from the 12-position clock system (Appendix B):

**Flat-top:**

| Index | Edge | Clock | | Index | Vertex | Clock |
|-------|------|-------|-|-------|--------|-------|
| 1 | N | 12 | | 1 | NE | 1 |
| 2 | NE | 2 | | 2 | E | 3 |
| 3 | SE | 4 | | 3 | SE | 5 |
| 4 | S | 6 | | 4 | SW | 7 |
| 5 | SW | 8 | | 5 | W | 9 |
| 6 | NW | 10 | | 6 | NW | 11 |

**Pointy-top:**

| Index | Edge | Clock | | Index | Vertex | Clock |
|-------|------|-------|-|-------|--------|-------|
| 1 | NE | 1 | | 1 | N | 12 |
| 2 | E | 3 | | 2 | NE | 2 |
| 3 | SE | 5 | | 3 | SE | 4 |
| 4 | SW | 7 | | 4 | S | 6 |
| 5 | W | 9 | | 5 | SW | 8 |
| 6 | NW | 11 | | 6 | NW | 10 |

So `0304/1` is the first edge clockwise from 12 o'clock, and `0304.1`
is the first vertex. Both compass and numeric forms are valid.

### Edge and vertex equivalence

Each interior edge is shared by two hexes, so the same physical edge can
be referenced from either side. For example, if hex `0305` is directly
north of hex `0304` (flat-top), then `0304/N` and `0305/S` refer to the
same edge.

Similarly, each interior vertex is shared by three hexes and can be
referenced from any of them.

Implementations MUST treat equivalent references as identical. A document
MAY reference the same edge or vertex from different hexes in different
feature entries. For undirected features, all references to the same
physical edge are equivalent. For directed features (`directed: true` in
the terrain vocabulary), the choice of referencing hex carries semantic
meaning (Section 4.7, Edge features).
