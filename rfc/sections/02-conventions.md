## Conventions and Terminology

**hex**: A single hexagonal cell on the layout. Synonyms: cell, face.

**edge**: A side of a hex. Each interior edge is shared by exactly two
adjacent hexes. Boundary edges belong to only one hex. Synonym: hexside.

**half-edge**: One side of an edge, belonging to a specific hex. Each
interior edge has two half-edges (one for each adjacent hex). Half-edges
are important for directed features like cliffs, where the effect differs
depending on which side you are on. In the addressing notation `A13/NE`,
the half-edge implicitly belongs to hex A13.

**vertex**: A corner point where three hexes meet (or fewer at boundaries).

**face**: Synonym for hex, used when emphasizing the graph-duality
relationship between faces, edges, and vertices.

**flat-top**: A hex orientation where the top and bottom sides are
horizontal (flat edges at 12 o'clock and 6 o'clock). The hex is wider
than it is tall.

**pointy-top**: A hex orientation where vertices point up and down
(vertices at 12 o'clock and 6 o'clock). The hex is taller than it is wide.

**cube coordinates**: A three-integer coordinate system (u, v, w) for hex
grids where u + v + w = 0. This is the canonical mathematical
representation for hex math (distance, neighbors, line drawing, rings).
Two coordinates suffice since the third is determined by the constraint;
the two-component form (q, r) is called **axial coordinates**.

The letters u, v, w are used (rather than x, y, z) to avoid confusion
with screen coordinates or row/column indices.

**user coordinates**: A human-readable labeling scheme for hexes, such as
`"0304"` (column 03, row 04) or `"C4"` (column C, row 4). Defined per map.
User coordinates are the labels that appear in the HexMap file.

**terrain type**: A symbolic identifier for a category of terrain (e.g.,
`forest`, `river`). Defined per map in the terrain vocabulary.

**feature**: An entry in the features list that associates a geometric
selection (hexes, edges, vertices, or a path) with terrain and properties.

**path**: An ordered sequence of connected hexes or edges representing a
linear feature such as a road, railroad, or river.

**directed edge type**: An edge terrain type where the effect is
asymmetric — different depending on which side you approach from (e.g.,
cliff, slope). The referencing hex in the addressing notation indicates
the "active" side. The semantic meaning of "active" (e.g., whether it
is the base or top of a cliff) is determined by the game, not this format.
