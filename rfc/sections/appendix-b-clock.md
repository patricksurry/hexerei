# Appendix B: Clock Direction System

The clock direction system provides a unified, orientation-independent
way to reference the 12 geometric features around a hex (6 edges and
6 vertices), numbered 1-12 clockwise from 12 o'clock (straight up).

This system is integrated into the primary addressing notation (Section 5)
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

| Clock | Feature | Compass | Index |
|-------|---------|---------|-------|
| 12 | edge | N | /1 |
| 1 | vertex | NE | .1 |
| 2 | edge | NE | /2 |
| 3 | vertex | E | .2 |
| 4 | edge | SE | /3 |
| 5 | vertex | SE | .3 |
| 6 | edge | S | /4 |
| 7 | vertex | SW | .4 |
| 8 | edge | SW | /5 |
| 9 | vertex | W | .5 |
| 10 | edge | NW | /6 |
| 11 | vertex | NW | .6 |

## Pointy-top (vertices at even hours, edges at odd hours)

| Clock | Feature | Compass | Index |
|-------|---------|---------|-------|
| 12 | vertex | N | .1 |
| 1 | edge | NE | /1 |
| 2 | vertex | NE | .2 |
| 3 | edge | E | /2 |
| 4 | vertex | SE | .3 |
| 5 | edge | SE | /3 |
| 6 | vertex | S | .4 |
| 7 | edge | SW | /4 |
| 8 | vertex | SW | .5 |
| 9 | edge | W | /5 |
| 10 | vertex | NW | .6 |
| 11 | edge | NW | /6 |

The pattern: for flat-top, edges are at even clock positions (12, 2, 4,
6, 8, 10) and vertices at odd (1, 3, 5, 7, 9, 11). For pointy-top,
it's reversed. Mnemonic: **even hours hit flat sides**.

Clock positions are normative for rotation and reflection algorithms
and provide a compact notation for manual authoring.
