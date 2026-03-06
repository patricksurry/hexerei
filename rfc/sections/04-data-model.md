## Data Model

### Document Envelope

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hexmap` | string | YES | Format version. MUST be `"1.0"` for this spec. |
| `metadata` | object | no | Descriptive metadata (Section 4.2). |
| `layout` | object | YES | Grid geometry and coordinates (Section 4.3). |
| `terrain` | object | no | Terrain type definitions (Section 4.5). |
| `features` | array | no | Map content (Section 4.7). |
| `extensions` | object | no | Reserved for extensions (Section 8). |

### Metadata

The `metadata` object carries descriptive information about the map.
All fields are OPTIONAL.

<{{../examples/snippets/metadata.yaml}}

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

The `version` field tracks revisions of the map data itself (not the
format version, which is in the top-level `hexmap` field). Use semantic
versioning or simple incrementing numbers.

Implementations MUST preserve unrecognized fields in `metadata` and pass
them through unchanged.

### Layout Geometry

The `layout` object defines the hex layout's visual arrangement and logical extent.
It is REQUIRED.

<{{../examples/snippets/layout.yaml}}

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hex_top` | string | YES | `"flat"` or `"pointy"`. |
| `at` | string | YES | HexPath defining the valid hexes in the map. |
| `stagger` | string | no | `"low"` or `"high"`. Default: `"low"`. See below. |
| `label` | string | no | Label pattern (e.g., `"XXYY"`). Default: `"auto"`. |
| `origin` | string | no | Visual corner where numbers start. Default: `"top-left"`. |
| `geo` | object | no | Geographic scale and anchoring. See below. |

#### layout.all (The Map Extent)

The `at` field defines the map's physical extent using the HexPath DSL. 
This mandatory field determines which hexes exist in the coordinate space.
Any hex not included in this collection is considered "off-map" and cannot
contain features.

Implementations MUST calculate the logical bounding box of the map by
analyzing the set of hexes defined here. 

For standard rectangular maps, the boundary is defined by the four corner
hexes and the fill operator (`!`):
*   `"0101 1001 1010 0110 !"` (10x10 rectangle)

For irregular maps (e.g., staggering offsets on the bottom edge), a
directional nudge can be used to control the inclusion of specific hexes:
*   `"A1 A10 >N K10 K1 !"` (Staggered bottom edge)

#### hex_top

Two values: `"flat"` (flat edge at 12 o'clock) or `"pointy"` (vertex at
12 o'clock).

#### stagger

When hex columns (flat-top) or rows (pointy-top) are arranged in a
rectangular layout, alternating columns/rows must be offset.

| Value | Flat-top meaning | Pointy-top meaning |
|-------|------------------|--------------------|
| `"low"` (default) | Odd columns sit lower | Odd rows sit further right |
| `"high"` | Odd columns sit higher | Odd rows sit further left |

"Odd" columns/rows are those whose index (after applying `first`) is odd.
`"low"` corresponds to Red Blob Games' "odd-q" (flat-top) or "odd-r"
(pointy-top).

#### geo (geographic anchoring and scale)

The optional `geo` object provides physical scale and anchors the hex
layout to real-world geography.

| Field | Type | Description |
|-------|------|-------------|
| `scale` | number | Meters across a hex (center to center of opposite edges). |
| `anchor` | object | `{ lat: number, lng: number }` of a reference hex center. |
| `anchor_hex` | string | Which hex the anchor refers to. Default: first hex. |
| `bearing` | number | Rotation in degrees clockwise from north. Default: 0. |
| `projection` | string | Map projection identifier. Default: `"mercator"`. |

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
by the layout geometry (`hex_top`, `stagger`, `label`, `origin`).

#### User coordinate labeling

The `label` and `origin` fields define how human-readable coordinates
map to numeric layout indices.

**Label patterns** use `X` for column digits, `Y` for row digits, and
`A` for column letters. The number of repeated characters indicates
zero-padded width. Any other characters are literal punctuation.

| Pattern | Example | Description |
|---------|---------|-------------|
| `XXYY` | `"0304"` | 2-digit column + 2-digit row (most common). |
| `XXXYY` | `"00304"` | 3-digit column + 2-digit row. |
| `AYY` | `"C04"` | Letter column + 2-digit row. |
| `AY` | `"C4"` | Letter column + unpadded row. |
| `(X,Y)` | `"(3,4)"` | Parenthesized, comma-separated. |
| `XX.YY` | `"03.04"` | Dot-separated. |
| `auto` | — | **(Default)** Inferred from the first coordinate in `layout.all`. |

The numbers parsed from the labels are used as **literal numeric indices** 
for the geometric conversions in Section 7. There is no implicit 
translation; if a map uses labels `1010` through `2020`, the internal 
column and row indices for those hexes are `10` through `20`.

**Origin** specifies the visual corner where coordinate numbering begins:

| Value | Column numbers increase | Row numbers increase |
|-------|------------------------|---------------------|
| `"top-left"` (default) | left to right | top to bottom |
| `"bottom-left"` | left to right | bottom to top |
| `"top-right"` | right to left | top to bottom |
| `"bottom-right"` | right to left | bottom to top |

Most wargames use `"top-left"` (XXYY with 01,01 in the upper-left).

### Terrain Vocabulary

The `terrain` object defines all terrain types used on this map, organized
by the geometry they apply to: hexes, edges, or vertices.

<{{../examples/snippets/terrain.yaml}}

#### Terrain type definition object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | no | Human-readable display name. |
| `type` | string | no | Either `"base"` or `"modifier"`. Default: `"base"`. |
| `onesided` | boolean | no | Edge types only. Feature is asymmetric (e.g., cliff). |
| `style` | object | no | Display hints (color, pattern, etc). |
| `properties` | object | no | Arbitrary game-specific metadata. |

#### Default values and the @all identifier

The HexMap format applies a minimal default state to the map extent:
no terrain, 0 elevation, and no tags or properties.

The reserved identifier **`@all`** always resolves to the full collection
of hexes defined in `layout.all`. 

To set global defaults (e.g., "the whole map is clear terrain"), designers 
should use a **Base Feature** as the first entry in the `features` list:

```yaml
features:
  # Base Layer: everything is clear terrain
  - at: "@all"
    terrain: clear
```

### Features

The `features` list is the heart of the document. It is an ordered list
of feature entries, each associating a **Geometry Collection** (a set of
hexes, edges, or vertices) with terrain and properties.

Each feature entry MUST specify a **Selector** (defining the geometry)
and MAY specify **Attributes** (properties to apply).

#### Geometry Selector

A feature defines its target geometry using the `at` key. The value is a
**HexPath** string (Section 6).

| Key | Collection Type | Description |
|-----|-----------------|-------------|
| `at` | `Collection` | Set of hexes, edges, or vertices. |

The geometry type (Hex, Edge, or Vertex) is inferred from the first absolute
atom in the HexPath string. All atoms in a single expression MUST resolve
to the same type. Any subtraction or complex set logic is handled within the
HexPath string using the `+` and `-` operators (Section 6).

#### Feature attributes

All attribute fields are OPTIONAL.

| Field | Type | Description |
|-------|------|-------------|
| `terrain` | string | One or more space-separated terrain types. |
| `elevation` | integer | Elevation level. |
| `label` | string | Display name or label text. |
| `id` | string | Unique identifier for this feature (for cross-referencing). |
| `tags` | string | One or more space-separated semantic tags (e.g., `"victory supply"`). |
| `properties` | object | Arbitrary key-value data. |

#### Feature ordering and precedence

Features are applied in document order. When multiple features affect
the same hex, edge, or vertex, **later entries override earlier ones**
for scalar attributes (`elevation`, `label`). 

For **terrain** and **tags** (space-separated strings), the engine calculates
the effective value by concatenating later strings with earlier ones. 
For terrain, the last defined "base" type in the final string determines the
primary rendering and mechanics.

Object attributes (`properties`) are merged with later keys overriding.

This enables a layered authoring style: set broad defaults first, then
override specific areas:

```yaml
features:
  # Base terrain: everything is forest (reference to layout.all)
  - at: "@all"
    terrain: forest

  # Override: a forest clearing
  - at: "0403"
    terrain: clear
    label: "Waldstadt"
```

#### Hex features

```yaml
features:
  - id: moscow
    at: "0507"
    terrain: major_city
    label: "Moscow"
    elevation: 1
    tags: "victory"
    properties:
      victory_points: 3

  - at: "0302, 0303, 0402" # Three specific hexes
    terrain: "forest"
```

#### Edge features

Edges are referenced using the HexPath notation `hex/direction` or `hex@hour`:

```yaml
features:
  - at: "0304/N 0304/NE 0404/N" # A path of three edges
    terrain: river

  - at: "0503/SE"
    terrain: cliff    # onesided: 0503 is the "active" side
```

#### Vertex features

Vertices are referenced using the HexPath notation `hex.direction` or `hex@hour`:

```yaml
features:
  - at: "0503.NE"
    terrain: tower
```

#### Regions

A region is simply a feature with an `id` and a `hexes` collection. Other
features can refer to this region by ID using the `@` prefix in a HexPath.

```yaml
features:
  - id: soviet-fortifications
    at: "0805 1105" # Path from 0805 to 1105
    tags: "fortified"
    label: "Soviet Fortification Line"

  - id: german-entry-west
    at: "0101 0105" # Path from 0101 to 0105
    tags: "entry"
    label: "German Entry Area"
```

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
