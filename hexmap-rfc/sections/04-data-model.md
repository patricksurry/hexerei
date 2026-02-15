## Data Model

### Document Envelope

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hexmap` | string | YES | Format version. MUST be `"1.0"` for this spec. |
| `metadata` | object | no | Descriptive metadata (Section 4.2). |
| `grid` | object | YES | Grid geometry and coordinates (Section 4.3). |
| `terrain` | object | no | Terrain type definitions (Section 4.5). |
| `defaults` | object | no | Default hex/edge/vertex properties (Section 4.6). |
| `features` | array | no | Map content (Section 4.7). |
| `extensions` | object | no | Reserved for extensions (Section 8). |

### Metadata

The `metadata` object carries descriptive information about the map.
All fields are OPTIONAL.

{{../examples/snippets/metadata.yaml}}

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Machine-readable identifier. SHOULD be lowercase with hyphens. |
| `version` | string | Version of this map definition (for errata, revisions). |
| `title` | string | Human-readable name. |
| `description` | string | Longer description. |
| `designer` | string | Map or game designer. |
| `publisher` | string | Publisher name. |
| `date` | string | Publication date or year. |
| `source` | object | Provenance information. |

PDS: why is source a nested object, what is notes v description?
check pyproject metadata to see if any other obvious optional fields like license, keywords?

The `version` field tracks revisions of the map data itself (not the
format version, which is in the top-level `hexmap` field). Use semantic
versioning or simple incrementing numbers.

Implementations MUST preserve unrecognized fields in `metadata` and pass
them through unchanged.

### Grid Geometry

The `grid` object defines the hex grid's physical geometry and shape.
It is REQUIRED.

{{../examples/snippets/grid.yaml}}

PDS: what about stagger taking values like "<" and ">"?  Where "<" means that the first
row(column) is offset towards increasing column(row) indices, and ">" vice versa.
Is that problematic for YAML?  It's visually 'readable' and is clear about how
indices increasing LR/TB vs RL/BT would work.

PDS: alternative, use offset: indent vs hanging or some variation, since that's
a familiar concept for first line of text vs next

PDS: we need to explain a bit about how row, col relates to p, q (are they the same?)
and u,v,w in an informal way (maybe a diagram) early on, and then refer to details later.

PDS: for labeling, might there also be schemes that label along two of the u/v/w axes
rather than just rows/columns?  Maybe labeling scheme based on axis letters (repeated
if padded) with lower case meaning numeric and upper meaning letters?   e.g. Prrr
would use P as letters, 3-digit r as number?


| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hex_top` | string | YES | `"flat"` or `"pointy"`. |
| `columns` | integer | YES | Number of columns. |
| `rows` | integer | YES | Number of rows. |
| `stagger` | string | no | `"low"` or `"high"`. Default: `"low"`. See below. |
| `boundary` | array | no | Hex IDs of valid hexes for non-rectangular maps. |
| `coordinates` | object | no | User coordinate labeling. See Section 4.4. |
| `geo` | object | no | Geographic scale and anchoring. See below. |

The `columns` and `rows` fields are always REQUIRED. They define the
bounding rectangle and coordinate space for the map. For non-rectangular
maps, all hexes within the bounding rectangle exist by default (if a
default terrain is set in Section 4.6). The optional `boundary` field
restricts which hexes are valid — hexes outside the boundary but within
the bounding rectangle do not exist. If `boundary` is absent and no
default terrain is set, only hexes explicitly mentioned in features exist.

#### hex_top

Two values: `"flat"` (flat edge at 12 o'clock) or `"pointy"` (vertex at
12 o'clock). These are the standard terms used across the hex grid
literature.

#### stagger

When hex columns (flat-top) or rows (pointy-top) are arranged in a
rectangular grid, alternating columns/rows must be offset. The `stagger`
field specifies which ones are shifted.

| Value | Flat-top meaning | Pointy-top meaning |
|-------|------------------|--------------------|
| `"low"` (default) | Odd columns sit lower | Odd rows sit further right |
| `"high"` | Odd columns sit higher | Odd rows sit further left |

"Odd" columns/rows are those whose index (after applying `first`) is odd:
columns 1, 3, 5, ... when `first` starts at 1. `"low"` corresponds to
Red Blob Games' "odd-q" (flat-top) or "odd-r" (pointy-top).

The following diagrams show the vertical offset of hex centers for flat-top
grids. Each label shows the hex user coordinate (XXYY format, first: [1,1]):

```
stagger: low                     stagger: high
(odd columns sit lower)          (odd columns sit higher)

   c1     c2     c3                c1     c2     c3

         0201                    0101          0301
  0101          0301                    0201
         0202                    0102          0302
  0102          0302                    0202
         0203                    0103          0303
  0103          0303                    0203
```

For pointy-top grids, the pattern is analogous but applied to rows
instead of columns, with the offset being horizontal rather than vertical.

#### geo (geographic anchoring and scale)

The optional `geo` object provides physical scale and anchors the hex
grid to real-world geography.

| Field | Type | Description |
|-------|------|-------------|
| `scale` | number | Meters across a hex (center to center of opposite edges). |
| `anchor` | [number, number] | [latitude, longitude] of a reference hex center. |
| `anchor_hex` | string | Which hex the anchor refers to. Default: first hex. |
| `bearing` | number | Rotation in degrees clockwise from north. Default: 0. |
| `projection` | string | Map projection identifier. Default: `"mercator"`. |

PDS: for anchor lng,lat is more typical no? or make it an object with latitude, longitude, hex for clarity

PDS: is bearing the angle between top and the compass north on the map, or the bearing of up? should we rename eg. top_bearing for clarity?

Only `scale` is needed for maps that specify physical size without geographic
positioning. The full combination of anchor, scale, bearing, and projection
defines the hex-to-geography mapping for real-world overlay.

### Coordinate Systems

The HexMap format uses two coordinate representations:

1. **User coordinates** (strings): Human-readable labels like `"0304"` or
   `"C4"`. These appear in the file as hex identifiers in features, edges,
   paths, etc. They MUST be unique within a map.

2. **Cube coordinates** (u, v, w integers): The canonical mathematical
   representation where u + v + w = 0. Implementations SHOULD use cube
   coordinates internally for hex math (distance, neighbors, rings, line
   drawing). Cube coordinates do not appear in the file.

The mapping between user coordinates and cube coordinates is determined
by the grid geometry (hex_top, stagger) and the coordinate label format.

#### User coordinate label format

The `coordinates` object defines the labeling scheme:

```yaml
coordinates:
  label: XXYY
  origin: top-left
  first: [1, 1]
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `label` | string | `"XXYY"` | Label pattern (see below). |
| `origin` | string | `"top-left"` | Corner where numbering starts (visual direction). |
| `first` | [int, int] | `[1, 1]` | Starting [column, row] number at the origin. |

**`origin`** specifies the visual corner of the map where the lowest-
numbered hex appears — it controls the *direction* numbers increase.
**`first`** specifies what number to assign that corner hex — it controls
the *starting value*. Together: `origin: top-left` with `first: [1, 1]`
means hex (1,1) is at the top-left, columns increase rightward, rows
increase downward. Changing `first: [0, 0]` makes that same corner hex
(0,0) instead, but doesn't change the visual layout.

**Label patterns** use `X` for column digits, `Y` for row digits, and
`A` for column letters. The number of repeated characters indicates
zero-padded width. Any other characters are literal punctuation.

| Pattern | Example | Description |
|---------|---------|-------------|
| `XXYY` | `"0304"` | 2-digit column + 2-digit row (most common) |
| `XXXYY` | `"00304"` | 3-digit column + 2-digit row |
| `AYY` | `"C04"` | Letter column + 2-digit row |
| `AY` | `"C4"` | Letter column + unpadded row |
| `(X,Y)` | `"(3,4)"` | Parenthesized, comma-separated |
| `XX.YY` | `"03.04"` | Dot-separated |

These patterns cover the most common wargame labeling schemes. The set is
intentionally minimal for v1.0. Future versions may add support for more
complex schemes (e.g., board-prefixed notation like `"3-1204"` for
geomorphic multi-board maps). For unusual labeling needs, the `properties`
field on features can carry alternative identifiers.

**Origin** specifies the corner where numbering begins:

| Value | Column numbers increase | Row numbers increase |
|-------|------------------------|---------------------|
| `"top-left"` (default) | left to right | top to bottom |
| `"bottom-left"` | left to right | bottom to top |
| `"top-right"` | right to left | top to bottom |
| `"bottom-right"` | right to left | bottom to top |

Most wargames use `"top-left"` (XXYY with 01,01 in the upper-left).

### Terrain Vocabulary

The `terrain` object defines all terrain types used on this map, organized
by the geometry they apply to: hexes, edges, vertices, or paths.

PDS: solve for 'mutually exclusive' terrain, for ease of stencilling layers
and overriding.  could use simple primary/secondary switch, or support
sets (lists?) of terrains that are mutually exclusive.  could support
optional constraints on terrain (requires, implies, excludes each listing names)
which would allow richer validation but maybe that's overkill/or an extension?

{{../examples/snippets/terrain.yaml}}

PDS: should include properties and display examples

#### Type identifiers

Type identifiers MUST be lowercase ASCII with underscores for word
separation (e.g., `light_woods`, `major_river`).

When `name` is omitted, it defaults to the identifier converted from
snake_case to Title Case: `light_woods` -> "Light Woods",
`major_river` -> "Major River".

#### Terrain type definition object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | no | Human-readable display name. Auto-generated from identifier if omitted. |
| `directed` | boolean | no | Edge types only. If true, the feature is asymmetric (e.g., cliff). Default: false. Vertex types are never directed. |
| `style` | object | no | Display hints (color, pattern, etc). See below. |
| `properties` | object | no | Arbitrary additional properties for game-specific semantics. |

PDS: is 'directed' the right word here?  it's normally about which hex side rather than
which vertex end which is what directed implies.  perhaps onesided, or sides=one|both?

The `properties` field on terrain type definitions is intended for
gameplay-relevant data that the format itself does not interpret: movement
costs, combat modifiers, line-of-sight effects, etc. The format carries
this data opaquely. Example:

```yaml
terrain:
  hex:
    forest:
      properties:
        movement_cost: 2
        defense_modifier: +1
        blocks_los: true
```

The `style` object carries optional rendering hints:

| Field | Type | Description |
|-------|------|-------------|
| `color` | string | Suggested fill color (CSS hex, e.g. `"#2d5a1e"`). |
| `pattern` | string | Suggested fill pattern name. |
| `stroke` | string | Suggested line color for edges/paths. |
| `stroke_width` | number | Suggested line width for edges/paths. |

Style is purely advisory. Renderers MAY ignore it entirely.

#### Geometry subsections

The four subsections — `hex`, `edge`, `vertex`, `path` — scope terrain
identifiers to their geometry. The same identifier MAY appear in multiple
subsections (e.g., `river` as both an edge type and a path type).

**When to use each subsection:**

- **`hex`**: The feature fills an entire hex. Use for terrain that
  occupies the cell: forests, cities, swamps, open water. At operational
  scale, a wide river may be hex-filling terrain.

- **`edge`**: The feature is a property of a hexside. Use for linear
  features that form boundaries between hexes: rivers at tactical scale,
  cliffs, walls, hedges. Edge features carry game-mechanical meaning
  (cost to cross, line-of-sight effects).

- **`vertex`**: The feature sits at a hex corner. Use for point features
  where three hexes meet: bridges, fords, crossroads, hilltop
  observation points. Vertex terrain types are never directed.

- **`path`**: The feature is a connected linear route spanning multiple
  hexes or edges. Use for the continuous course of a named feature:
  roads, railroads, rivers. Path features often duplicate edge features
  (e.g., individual river hexsides as `edge` terrain for game mechanics,
  plus the full river course as a `path` for display and identification).

PDS: do we really need path as a separate thing?  use case is when
two hex-pathed rivers run parallel in adjacent hexes.  but couldn't
that just be two separate path-like regions? from a game perspective
it usually only matters that a hex contains a river or not, the connectivity
is a rendering concern which could be inferred from the region structure perhaps?

A feature like "river" may reasonably appear in all three of `hex`,
`edge`, and `path` depending on game scale and design. This is
intentional — the format does not prescribe which representation to use.

PDS: but hex:river, edge:river no implied relationship?

**The format does not define a fixed set of terrain types.** Each map
declares its own vocabulary. This is intentional: terrain types are
game-specific, not universal. A format that baked in "forest" and "swamp"
would fail for science fiction, naval, or abstract games.

However, Appendix A provides a recommended conventional vocabulary for
common hex wargames as a non-normative interoperability aid.

### Defaults

The `defaults` object specifies property values applied to every hex,
edge, or vertex that does not have an explicit value set in the
features list.

{{../examples/snippets/defaults.yaml}}

PDS: elevation might be a bad example since it should probably default to 0 globally

| Field | Type | Description |
|-------|------|-------------|
| `hex` | object | Default properties for all hexes. |
| `hex.terrain` | string | Default hex terrain type. |
| `hex.elevation` | integer | Default elevation level. |
| `edge` | object | Default properties for all edges (uncommon). |
| `vertex` | object | Default properties for all vertices (uncommon). |

Each property defaults independently. Setting `defaults.hex.terrain`
does not imply a default elevation; if `defaults.hex.elevation` is
also desired, it must be set explicitly. Similarly, a hex that appears
in the features list with only `terrain` set still inherits the default
`elevation` (if one is defined).

PDS: default elevation to zero

If `defaults.hex.terrain` is specified, all hexes within the grid bounds
(constrained by `boundary` if present) are assumed to exist with that
terrain. If no default terrain is specified, only hexes explicitly
mentioned in features exist. This provides a natural way to define
non-rectangular maps: omit the default terrain and enumerate only the
valid hexes in features.

### Features

The `features` list is the heart of the document. It is an ordered list
of feature entries, each associating a **Geometry Collection** (a set of
hexes, edges, or vertices) with terrain and properties.

Each feature entry MUST specify a **Selector** (defining the geometry)
and MAY specify **Attributes** (properties to apply).

#### Geometry Selectors

A feature defines its target geometry using one of the following root keys.
The value can be a simple list of coordinates (implicit union) or a
structured geometry expression.

| Key | Collection Type | Description |
|-----|-----------------|-------------|
| `hexes` | `HexCollection` | Set of hexes. |
| `edges` | `EdgeCollection` | Set of edges. |
| `vertices` | `VertexCollection` | Set of vertices. |

**Implicit Union:** If the value is a list, it represents the union of
all elements in the list.

**Set Operations:** A feature can explicitly define set operations:
```yaml
hexes:
  include: <expression>   # Base set (default if explicit keys omitted)
  exclude: <expression>   # Subtracted from the base set
  intersect: <expression> # Intersection with the base set
```

#### Geometry Expressions

See **Section 6: Geometry Expressions** for details on advanced selectors,
set operations (`include`, `exclude`), generators (`range`, `path`), and
topological operators (`boundary`, `inside`).

#### One-Sided Edges

See **Section 6: Geometry Expressions** for details on the `side` modifier.


#### Feature attributes

| Field | Type | Description |
|-------|------|-------------|
| `terrain` | string | Terrain type from the appropriate vocabulary subsection. |
| `elevation` | integer | Elevation level. Primarily used for hexes, but MAY also appear on edge or vertex features for games that require it (e.g., wall heights, bridge elevations). |
| `label` | string | Display name or label text. |
| `id` | string | Unique identifier for this feature (for cross-referencing). |
| `tags` | array of strings | Semantic tags (e.g., `"victory"`, `"fortified"`). |
| `properties` | object | Arbitrary key-value data. |

#### Feature ordering and precedence

Features are applied in document order. When multiple features affect
the same hex, edge, or vertex, **later entries override earlier ones**
for scalar attributes (`terrain`, `elevation`, `label`). Array attributes
(`tags`) are merged (union). Object attributes (`properties`) are merged
with later keys overriding.

This enables a layered authoring style: set broad defaults first, then
override specific areas:

```yaml
features:
  # Base terrain: everything is clear (or use defaults section)
  - hexes: ["0301", "0302", "0303", "0304", "0305",
            "0401", "0402", "0403", "0404", "0405"]
    terrain: forest

  # Override: one hex in the forest is actually a town
  - hex: "0403"
    terrain: town
    label: "Waldstadt"
```

**Round-trip considerations.** The format does not mandate round-trip
fidelity: an implementation that reads and writes a HexMap document MAY
produce a structurally different file (e.g., flattened features, reordered
entries) as long as the effective result is identical. Two documents are
semantically equivalent if, after applying defaults and feature
precedence, every hex, edge, and vertex has the same terrain, elevation,
tags, and properties. Implementations that need to preserve authoring
structure SHOULD treat the features list as opaque and pass it through.

#### Hex features

```yaml
features:
  - hex: "0507"
    terrain: major_city
    label: "Moscow"
    elevation: 1
    tags: [victory]
    properties:
      victory_points: 3

  - hexes: ["0302", "0303", "0402"]
    terrain: forest
```

#### Edge features

Edges are referenced using the addressing notation `hex/direction`
(see Section 5):

```yaml
features:
  - edges: ["0304/N", "0304/NE", "0404/N"]
    terrain: river

  - edge: "0503/SE"
    terrain: cliff    # directed: 0503 is the "active" side
```

For directed edge types (where `directed: true` in the terrain
vocabulary), the hex in the address indicates the "active" side.
The format does not prescribe the semantic meaning of "active" — that
is determined by the game. For example, a game might define `cliff`
such that the active side is the base (climbing up costs extra) or the
top (falling risk). The format provides the mechanism for asymmetric
annotation; the game provides the interpretation.

Both half-edges of an interior edge can be independently annotated.
If an edge has annotations from both adjacent hexes, both are valid
and coexist. This allows asymmetric features: e.g., a cliff that is
also a river.

#### Through-hex paths

A path that passes through hex centers, crossing the edge between each
consecutive pair. Used for roads, railroads, and any feature that
traverses hexes.

```yaml
features:
  - path: ["0104", "0204", "0304", "0404", "0504"]
    terrain: road
    id: moscow-highway
    label: "Moscow Highway"
```

Consecutive hexes in a path MUST be adjacent (sharing an edge). A path
with non-adjacent consecutive hexes is a validation error. The edges
crossed by the path are implicit — derived from the relative positions
of consecutive hexes.

A shorthand for straight-line paths between two hexes is deferred to the
geometry expression language (Appendix C, future).

PDS: is the consecutive hex/edge requirement in paths actually necessary?
does something break if we allow paths with gaps?  brainstorm as part of Appendix C.

#### Along-edge paths

A path that follows hex edges. Used for rivers, walls, and other
features that live on hexsides.

```yaml
features:
  - edge_path: ["0306/NE", "0306/N", "0206/NE", "0206/N"]
    terrain: river
    id: nara-river
    label: "Nara River"
```

Consecutive edges in an edge path MUST share a vertex (i.e., the path
must be connected). A disconnected sequence is a validation error. To
represent a feature with gaps, use separate edge_path entries.

#### Regions

A named group of hexes. Regions can set terrain and tags on all
member hexes.

```yaml
features:
  - region:
      id: soviet-fortifications
      hexes: ["0805", "0905", "1005", "1105"]
    tags: [fortified]
    label: "Soviet Fortification Line"

  - region:
      id: german-entry-west
      hexes: ["0101", "0102", "0103", "0104", "0105"]
    tags: [entry]
    label: "German Entry Area"
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `region.id` | string | no | Unique identifier for this region. |
| `region.hexes` | array | YES | List of hex user coordinates in this region. |

A shorthand for regions defined by a boundary (fill-from-edge) is
deferred to the geometry expression language (Appendix C, future).

#### Recommended tags

Tags are freeform strings. The following are RECOMMENDED for conventional
use:

| Tag | Meaning |
|-----|---------|
| `victory` | Victory hex / objective. |
| `fortified` | Fortification or prepared defense. |
| `supply` | Supply source. |
| `entry` | Map entry hex for reinforcements. |
| `exit` | Map exit hex. |
