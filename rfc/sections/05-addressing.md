## Addressing Notation

HexMap uses a compact notation for referencing hexes, edges, and vertices.
This notation appears in the `features` list and wherever geometry is
referenced.

### Grammar

The addressing notation for atoms follows this grammar (ABNF-style):

```
atom        = hex-ref / edge-ref / vertex-ref / clock-ref / ref-id
hex-ref     = user-coord
edge-ref    = user-coord "/" compass-dir
vertex-ref  = user-coord "." compass-dir
clock-ref   = user-coord "@" hour
ref-id      = "@" identifier
compass-dir = "N" / "NE" / "E" / "SE" / "S" / "SW" / "W" / "NW"
hour        = "1" / "2" / "3" / "4" / "5" / "6" / "7" / "8" / "9" / "10" / "11" / "12"
```

Where `user-coord` is a string matching the label pattern.

The `/` separator marks edge references, the `.` separator marks vertex
references, and the `@` separator marks **clock-based** references (see [Numeric addressing with clock hours](#numeric-addressing-with-clock-hours) below).

### Hexes

A hex is referenced by its user coordinate string, by a reference to
another feature, or using a reserved identifier:

```
0304        # XXYY format
C4          # letter-number format
@moscow     # reference to feature 'moscow'
@all        # reserved: resolves to all hexes in layout.at
```

PDS: should be layout.all?

### Edges

An edge is referenced as `hex/direction` (using cardinal compass directions) or using the
universal clock notation `hex@hour`:

```
0304/N      # north edge of hex 0304 (compass direction)
0304@12     # same edge, using 12-position clock
```

### Vertices

A vertex is referenced as `hex.direction` (using cardinal compass directions) or using the
universal clock notation `hex@hour`:

```
0304.NE     # northeast vertex of hex 0304 (compass direction)
0304@1      # same vertex, using 12-position clock
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

Edge directions: **NE, E, SE, SW, W, NW** (6 edges)
Vertex directions: **N, NE, SE, S, SW, NW** (6 vertices)

### Numeric addressing with clock hours

Edges and vertices can be addressed by their 12-position clock hour position using the `@` separator.
This provides a orientation-independent way to reference geometry.

The cardinal directions N, E, S, W always correspond to the hours 12, 3, 6, 9. 
The compound directions NE, SE, SW, NW correspond to either even or odd hours depending on the hex orientation and whether an edge or vertex is being referenced.

#### Addressing Reference Table

| Clock | 12 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Flat-top** | Edge N | Vert NE | Edge NE | Vert E | Edge SE | Vert SE | Edge S | Vert SW | Edge SW | Vert W | Edge NW | Vert NW |
| **Pointy-top**| Vert N | Edge NE | Vert NE | Edge E | Vert SE | Edge SE | Vert S | Edge SW | Vert SW | Edge W | Vert NW | Edge NW |

So `0304@12` is the North edge of a flat-top hex, and `0304@1` is its North-East vertex.

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
physical edge are equivalent. For onesided features (`onesided: true` in
the terrain vocabulary), the choice of referencing hex carries semantic
meaning (see [Features](#features) in Section 4).
