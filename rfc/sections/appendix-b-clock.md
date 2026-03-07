# Appendix B: Clock Direction System

The clock direction system provides a unified, orientation-independent
way to reference the 12 geometric features around a hex (6 edges and
6 vertices), numbered 1-12 clockwise from 12 o'clock (straight up).

This system is integrated into the primary addressing notation (see [Addressing Notation](#addressing-notation) in Section 5)
using the `hex@hour` syntax.

Edges and vertices alternate around the hex. Which positions are edges
and which are vertices depends on `hex_top`:

## Flat-top (edges at even hours, vertices at odd hours)

```
                  11       12        1
                   ·________________·
                  / (NW v)  (N e)    \
         10     /    (NE v)           \     2
        (NW e) /                       \ (NE e)
              /                         \
          9  ·                           ·  3
        (W v)\                           /(E v)
              \                         /
         8     \                       /     4
        (SW e)  \                     / (SE e)
                 \___________________/
                   ·                 ·
                  7        6         5
               (SW v)   (S e)     (SE v)
```

| Clock | Feature | Compass |
|-------|---------|---------|
| 12 | edge | N |
| 1 | vertex | NE |
| 2 | edge | NE |
| 3 | vertex | E |
| 4 | edge | SE |
| 5 | vertex | SE |
| 6 | edge | S |
| 7 | vertex | SW |
| 8 | edge | SW |
| 9 | vertex | W |
| 10 | edge | NW |
| 11 | vertex | NW |

## Pointy-top (vertices at even hours, edges at odd hours)

| Clock | Feature | Compass |
|-------|---------|---------|
| 12 | vertex | N |
| 1 | edge | NE |
| 2 | vertex | NE |
| 3 | edge | E |
| 4 | vertex | SE |
| 5 | edge | SE |
| 6 | vertex | S |
| 7 | edge | SW |
| 8 | vertex | SW |
| 9 | edge | W |
| 10 | vertex | NW |
| 11 | edge | NW |

The pattern: for flat-top, edges are at even clock positions (12, 2, 4,
6, 8, 10) and vertices at odd (1, 3, 5, 7, 9, 11). For pointy-top,
it's reversed. Mnemonic: **even hours hit flat sides**.

Clock positions are normative for rotation and reflection algorithms
and provide a compact notation for manual authoring.
