# The HexMap Format

**hexerei project — format specification draft**
**February 2026, revision 3**

## Status of This Document

This is an early draft of the HexMap interchange format, written in the style
of an IETF RFC for precision and clarity. It is not an Internet Standard.
The key words "MUST", "SHOULD", "MAY", and "OPTIONAL" are used as described
in RFC 2119.

---

## Abstract

This document defines HexMap, a format for representing hexagonal grid maps
used in wargames and similar board games. The format captures grid geometry,
terrain, edge features, paths, and metadata in a human-readable structure
with a formal schema for validation. It is designed for interchange between
map editors, game engines, renderers, and AI systems.

The canonical serialization is JSON. YAML is defined as an equivalent
authoring-friendly serialization. A JSON Schema is provided for validation
in both cases.

PDS: should yaml be the canonical version to encourage hand-authoring?
---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Conventions and Terminology](#2-conventions-and-terminology)
3. [Format Overview](#3-format-overview)
4. [Data Model](#4-data-model)
   - 4.1 [Document Envelope](#41-document-envelope)
   - 4.2 [Metadata](#42-metadata)
   - 4.3 [Grid Geometry](#43-grid-geometry)
   - 4.4 [Coordinate Systems](#44-coordinate-systems)
   - 4.5 [Terrain Vocabulary](#45-terrain-vocabulary)
   - 4.6 [Defaults](#46-defaults)
   - 4.7 [Features](#47-features)
5. [Addressing Notation](#5-addressing-notation)
6. [Hex Geometry Reference](#6-hex-geometry-reference)
7. [Serialization](#7-serialization)
8. [Extensibility](#8-extensibility)
9. [Examples](#9-examples)
10. [JSON Schema](#10-json-schema)
11. [Test Cases](#11-test-cases)
12. [Security Considerations](#12-security-considerations)
13. [References](#13-references)
Appendix A: [Conventional Terrain Vocabulary](#appendix-a-conventional-terrain-vocabulary-non-normative)
Appendix B: [Clock Direction System](#appendix-b-clock-direction-system)
Appendix C: [Geometry Expressions](#appendix-c-geometry-expressions-future)
Appendix D: [Open Questions](#appendix-d-open-questions)

---

## 1. Introduction

Hex grids have been used in wargames since 1961 (Avalon Hill's *Gettysburg*
second edition). Despite six decades of use, no standard interchange format
exists for hex map data. Maps are stored in proprietary tool-specific formats
(Worldographer XML, VASSAL modules), as images with no semantic data, or as
ad-hoc CSV/JSON with no schema.

The HexMap format fills this gap. Its design goals are:

1. **Human-readable and hand-editable.** A designer should be able to author
   a small map in a text editor without tooling.

2. **Machine-validatable.** A JSON Schema enables automated validation in
   any language with a JSON Schema library.

3. **Language-neutral.** The format is defined in terms of JSON data types
   and is trivially consumable from Python, JavaScript/TypeScript, and any
   language with a JSON parser.

4. **Game-neutral.** The format describes map *structure* (where terrain is,
   what edges have rivers) but does not prescribe game *mechanics* (movement
   costs, combat modifiers). Terrain types are an extensible vocabulary
   defined per map, not a fixed enum.

5. **Graph-duality aware.** Hex grids have a natural planar graph structure
   where faces (hexes), edges (hexsides), and vertices each carry game-
   relevant information. Rivers run along edges, roads pass through hex
   centers, bridges sit at vertices. The format treats all three as first-
   class citizens.

### 1.1 Relationship to GeoJSON

HexMap is not a profile of GeoJSON. While GeoJSON is excellent for geographic
data, it is poorly suited to hex maps: it requires 6-vertex polygons per hex
(verbose), has no concept of adjacency or edges, and its coordinate system
is lat/lng. HexMap uses a purpose-built coordinate system with compact hex
addressing.

Conversion from HexMap to GeoJSON is straightforward and SHOULD be supported
by implementations. A hex map with a defined geographic projection can be
losslessly converted to a GeoJSON feature collection.

Conversion from GeoJSON to HexMap is not generally lossless and requires
heuristics (identifying the hex grid, snapping features to hexes, etc.).
Implementations MAY support this as an import/digitization aid.

---

## 2. Conventions and Terminology

**hex**: A single hexagonal cell on the grid. Synonyms: cell, face.

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

---

## 3. Format Overview

A HexMap document is a single JSON object (or equivalent YAML document)
with the following top-level structure:

```yaml
hexmap: "1.0"              # format version (REQUIRED)
metadata: { ... }          # map identity and descriptive info
grid: { ... }              # hex geometry and coordinate system
terrain: { ... }           # terrain type vocabulary (hex, edge, vertex)
defaults: { ... }          # default values for hexes, edges, vertices
features: [ ... ]          # the map content: terrain, paths, regions
extensions: { ... }        # implementation-specific extensions
```

Only `hexmap` and `grid` are REQUIRED. All other sections are OPTIONAL
and default to empty.

The design is intentionally flat at the top level: six sections, each
with a clear role. The `features` list is the heart of the document —
it carries all map content as an ordered sequence of feature entries.

---

## 4. Data Model

### 4.1 Document Envelope

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hexmap` | string | YES | Format version. MUST be `"1.0"` for this spec. |
| `metadata` | object | no | Descriptive metadata (Section 4.2). |
| `grid` | object | YES | Grid geometry and coordinates (Section 4.3). |
| `terrain` | object | no | Terrain type definitions (Section 4.5). |
| `defaults` | object | no | Default hex/edge/vertex properties (Section 4.6). |
| `features` | array | no | Map content (Section 4.7). |
| `extensions` | object | no | Reserved for extensions (Section 8). |

### 4.2 Metadata

The `metadata` object carries descriptive information about the map.
All fields are OPTIONAL.

```yaml
metadata:
  id: battle-for-moscow
  version: "1.0"
  title: "Battle for Moscow"
  description: "The German advance on Moscow, Oct-Dec 1941"
  designer: "Frank Chadwick"
  publisher: "GDW"
  date: "1986"
  source:
    url: "https://grognard.com/bfm/game.html"
    notes: "Freely available introductory wargame"
```

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

### 4.3 Grid Geometry

The `grid` object defines the hex grid's physical geometry and shape.
It is REQUIRED.

```yaml
grid:
  hex_top: flat
  columns: 22
  rows: 15
  stagger: low
  coordinates:
    label: XXYY
    origin: top-left
    first: [1, 1]
  geo:
    scale: 16000              # meters per hex
    anchor: [54.5, 35.0]      # lat, lng of hex 0101 center
    bearing: 0                 # degrees, 0 = north up
    projection: mercator
```

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

### 4.4 Coordinate Systems

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

### 4.5 Terrain Vocabulary

The `terrain` object defines all terrain types used on this map, organized
by the geometry they apply to: hexes, edges, vertices, or paths.

PDS: solve for 'mutually exclusive' terrain, for ease of stencilling layers
and overriding.  could use simple primary/secondary switch, or support
sets (lists?) of terrains that are mutually exclusive.  could support
optional constraints on terrain (requires, implies, excludes each listing names) 
which would allow richer validation but maybe that's overkill/or an extension?

```yaml
terrain:
  hex:
    clear:
      name: "Clear"
    forest: {}
    swamp: {}
    city: {}
    major_city:
      name: "Major City"

  edge:
    river: {}
    cliff:
      directed: true
    wall:
      name: "Stone Wall"
    slope:
      directed: true

  vertex:
    bridge: {}
    crossroads: {}
    ford: {}

  path:
    road: {}
    railroad: {}
    river:
      name: "River"
```

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

### 4.6 Defaults

The `defaults` object specifies property values applied to every hex,
edge, or vertex that does not have an explicit value set in the
features list.

```yaml
defaults:
  hex:
    terrain: clear
    elevation: 0
  edge: {}
  vertex: {}
```

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

### 4.7 Features

The `features` array is the heart of the document. It is an ordered list
of feature entries, each associating a geometric selection with terrain
and properties.

Each feature entry has a **selector** (which geometry it applies to) and
**attributes** (what properties to set). The selector is indicated by one
of the following keys:

| Selector key | Geometry | Value type | Description |
|-------------|----------|------------|-------------|
| `hex` | single hex | string | One hex by user coordinate. |
| `hexes` | multiple hexes | array of strings | Multiple hexes by user coordinate. |
| `edge` | single edge | string | One edge in `hex/direction` notation. |
| `edges` | multiple edges | array of strings | Multiple edges. |
| `vertex` | single vertex | string | One vertex in `hex.direction` notation. |
| `vertices` | multiple vertices | array of strings | Multiple vertices. |
| `path` | hex path | array of strings | Ordered hex sequence (through-hex path). |
| `edge_path` | edge path | array of strings | Ordered edge sequence (along-edge path). |
| `region` | hex region | object | Named region of hexes. |

Exactly one selector key MUST be present per feature entry. The remaining
fields are attributes applied to the selected geometry.

PDS: "... by user coordinate" - should support backward references 
to features by id; brainstorm as part of appendix C

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

---

## 5. Addressing Notation

HexMap uses a compact notation for referencing hexes, edges, and vertices.
This notation appears in the `features` list and wherever geometry is
referenced.

### 5.1 Grammar

The addressing notation follows this grammar (ABNF-style):

```
hex-ref     = user-coord
edge-ref    = user-coord "/" direction
vertex-ref  = user-coord "." direction
direction   = compass-dir / index
compass-dir = "N" / "NE" / "E" / "SE" / "S" / "SW" / "W" / "NW"
index       = "1" / "2" / "3" / "4" / "5" / "6"
```

PDS: user-coord | identifier (maybe identifier needs a prefix to avoid name clash?)

Where `user-coord` is a string matching the label pattern defined in
`grid.coordinates` (e.g., `"0304"` for XXYY).

The `/` separator marks edge references. The `.` separator marks vertex
references. Indices 1-6 are clockwise from 12 o'clock (see Section 5.5).

### 5.2 Hexes

A hex is referenced by its user coordinate string:

```
0304        # XXYY format
C4          # letter-number format
```

### 5.3 Edges

An edge is referenced as `hex/direction`:

```
0304/N      # north edge of hex 0304 (compass direction)
0304/1      # same edge, by clockwise index
```

### 5.4 Vertices

A vertex is referenced as `hex.direction`:

```
0304.NE     # northeast vertex of hex 0304 (compass direction)
0304.1      # same vertex, by clockwise index
```

### 5.5 Edge and vertex directions

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

### 5.6 Numeric addressing with clock hours

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

### 5.7 Edge and vertex equivalence

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

---

## 6. Hex Geometry Reference

This section defines the mathematical relationships between coordinate
systems. It is normative: implementations MUST use these conversions.

### 6.1 Cube coordinates

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

### 6.2 Offset to cube conversion

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

### 6.3 Neighbor directions in cube coordinates

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

### 6.4 Hex distance

The distance between two hexes in cube coordinates is:

```
distance = max(|u1-u2|, |v1-v2|, |w1-w2|)
```

Or equivalently:

```
distance = (|u1-u2| + |v1-v2| + |w1-w2|) / 2
```

---

## 7. Serialization

### 7.1 JSON (canonical)

The canonical serialization is JSON (RFC 8259). A HexMap JSON file:

- MUST be valid JSON.
- MUST be encoded as UTF-8.
- SHOULD use the file extension `.hexmap.json`.
- SHOULD use the media type `application/vnd.hexerei.hexmap+json`.

### 7.2 YAML (authoring format)

YAML (version 1.2) is an equivalent serialization, recommended for
hand-authored maps. A HexMap YAML file:

- MUST produce a JSON-compatible data structure when parsed.
  (YAML 1.2 is a superset of JSON; this is always true for documents
  that avoid YAML-specific types like timestamps or binary.)
- SHOULD use the file extension `.hexmap.yaml` or `.hexmap.yml`.
- SHOULD use the media type `application/vnd.hexerei.hexmap+yaml`.
- MAY contain comments (a key advantage over JSON for authoring).

A HexMap YAML document, when converted to JSON, MUST validate against
the same JSON Schema as a native JSON document.

### 7.3 Validation

Implementations SHOULD validate documents against the JSON Schema defined
in Section 10. Validation MUST be performed against the JSON representation
(converting from YAML first if necessary).

### 7.4 Round-trip fidelity

The format does not require byte-for-byte round-trip fidelity. An
implementation that reads and re-serializes a HexMap document MAY produce
different JSON/YAML (different whitespace, key ordering, feature
grouping) as long as the semantic content is preserved. See Section 4.7
for the definition of semantic equivalence.

---

## 8. Extensibility

### 8.1 The `extensions` object

The top-level `extensions` object is reserved for implementation-specific
or game-specific data that falls outside this specification. Producers
MAY include arbitrary data here. Consumers MUST ignore extensions they
do not recognize.

```yaml
extensions:
  hexerei_renderer:
    style: "classic-wargame"
    hex_size_px: 48
  my_game_engine:
    fog_of_war: true
    turn_limit: 12
```

### 8.2 The `properties` objects

The `properties` field on terrain type definitions and on feature entries
is the primary mechanism for per-element extension data. Unrecognized
properties MUST be preserved and passed through.

### 8.3 Forward compatibility

Consumers that encounter unrecognized top-level keys SHOULD ignore them
(not reject the document). This allows future versions of the format to
add new sections without breaking older parsers.

---

## 9. Examples

### 9.1 Minimal map

The smallest valid HexMap document:

```json
{
  "hexmap": "1.0",
  "grid": {
    "hex_top": "flat",
    "columns": 3,
    "rows": 3
  }
}
```

This defines a 3x3 flat-top hex grid with no terrain data.

### 9.2 Small scenario map (YAML)

A fragment inspired by Battle for Moscow, demonstrating most features:

```yaml
hexmap: "1.0"

metadata:
  id: battle-for-moscow
  version: "1.0"
  title: "Battle for Moscow"
  designer: "Frank Chadwick"

grid:
  hex_top: flat
  columns: 22
  rows: 15
  stagger: low
  coordinates:
    label: XXYY
    origin: top-left
    first: [1, 1]
  geo:
    scale: 16000

terrain:
  hex:
    clear: {}
    forest: {}
    swamp: {}
    city: {}
    major_city: {}

  edge:
    river: {}

  path:
    road: {}
    railroad: {}

defaults:
  hex:
    terrain: clear
    elevation: 0

features:
  # === Terrain ===

  - hexes: ["0302", "0303", "0402"]
    terrain: forest

  - hex: "0912"
    terrain: city
    label: "Kaluga"

  - hex: "1205"
    terrain: city
    label: "Tula"
    tags: [victory]

  - hex: "1808"
    terrain: major_city
    label: "Moscow"
    tags: [victory]
    properties:
      victory_points: 3

  # === Rivers ===

  - edges: ["0910/NE", "0910/N", "0810/NE"]
    terrain: river

  # === Roads and Railroads ===

  - path: ["1508", "1608", "1708", "1808"]
    terrain: road
    id: moscow-highway
    label: "Moscow Highway"

  - path: ["1205", "1306", "1407", "1508", "1608"]
    terrain: railroad
    id: tula-rail

  # === Regions ===

  - region:
      id: soviet-fortifications
      hexes: ["0805", "0905", "1005", "1105"]
    tags: [fortified]
    label: "Soviet Fortification Line"

  - region:
      id: german-entry-west
      hexes: ["0101", "0102", "0103", "0104", "0105",
              "0106", "0107", "0108", "0109", "0110"]
    tags: [entry]
    label: "German Entry (West Edge)"
```

### 9.3 Tactical-scale map fragment (YAML)

Panzer Blitz-style tactical features with elevation and slopes:

```yaml
hexmap: "1.0"

metadata:
  id: tactical-demo
  title: "Tactical Demo - Hill 231"

grid:
  hex_top: flat
  columns: 10
  rows: 8
  geo:
    scale: 250

terrain:
  hex:
    clear: {}
    woods: {}
    town: {}
    rough: {}
  edge:
    slope:
      directed: true
    stream: {}
    wall:
      name: "Stone Wall"
  vertex:
    bridge: {}
  path:
    road: {}

defaults:
  hex:
    terrain: clear
    elevation: 0

features:
  # Wooded hills
  - hexes: ["0303", "0304"]
    terrain: woods
    elevation: 1

  # The hilltop
  - hex: "0403"
    terrain: rough
    elevation: 2
    label: "Hill 231"

  - hex: "0404"
    terrain: rough
    elevation: 1

  # Town
  - hex: "0504"
    terrain: town
    label: "Bergdorf"

  # Slope hexsides around the hill (directed: 0403 is the "active" side)
  - edges: ["0403/N", "0403/NE", "0403/SE",
            "0403/S", "0403/SW", "0403/NW"]
    terrain: slope

  # Stream south of town
  - edge_path: ["0505/SW", "0505/S", "0605/SW"]
    terrain: stream
    label: "Bergbach"

  # Stone walls around town
  - edges: ["0504/NW", "0504/NE"]
    terrain: wall

  # Bridge over the stream
  - vertex: "0505.SW"
    terrain: bridge
    label: "Stone Bridge"

  # Road through the valley
  - path: ["0104", "0204", "0304", "0404", "0504", "0604"]
    terrain: road
    id: main-road
```

---

## 10. JSON Schema

The normative JSON Schema for the HexMap format is maintained as a
separate file: `hexmap.schema.json`. Below is a detailed outline of the
schema structure and key constraints.

```
HexMapDocument
├── hexmap: string (const: "1.0") [REQUIRED]
├── metadata: MetadataObject
│   ├── id: string (pattern: "^[a-z][a-z0-9-]*$")
│   ├── version: string
│   ├── title, description, designer, publisher, date: string
│   └── source: { url: string (format: uri), notes: string }
├── grid: GridObject [REQUIRED]
│   ├── hex_top: enum ["flat", "pointy"] [REQUIRED]
│   ├── columns: integer (minimum: 1) [REQUIRED]
│   ├── rows: integer (minimum: 1) [REQUIRED]
│   ├── stagger: enum ["low", "high"]
│   ├── boundary: array of string (minItems: 1)
│   ├── coordinates: CoordinatesObject
│   │   ├── label: string (default: "XXYY")
│   │   ├── origin: enum ["top-left", "bottom-left",
│   │   │                  "top-right", "bottom-right"]
│   │   └── first: array [integer, integer] (default: [1, 1])
│   └── geo: GeoObject
│       ├── scale: number (exclusiveMinimum: 0)
│       ├── anchor: array [number, number]
│       ├── anchor_hex: string
│       ├── bearing: number (minimum: 0, exclusiveMaximum: 360)
│       └── projection: string (default: "mercator")
├── terrain: TerrainVocabulary
│   ├── hex: map<string, TerrainTypeDef>
│   ├── edge: map<string, TerrainTypeDef>
│   ├── vertex: map<string, TerrainTypeDef>
│   └── path: map<string, TerrainTypeDef>
│   where TerrainTypeDef:
│       ├── name: string
│       ├── directed: boolean (only for edge subsection)
│       ├── style: { color, pattern, stroke, stroke_width }
│       └── properties: object
├── defaults: DefaultsObject
│   ├── hex: { terrain: string, elevation: integer, ... }
│   ├── edge: { terrain: string, ... }
│   └── vertex: { terrain: string, ... }
├── features: array of FeatureEntry
│   └── FeatureEntry: oneOf
│       ├── HexFeature: { hex: string | hexes: [string], ... }
│       ├── EdgeFeature: { edge: string | edges: [string], ... }
│       ├── VertexFeature: { vertex: string | vertices: [string], ... }
│       ├── PathFeature: { path: [string] | edge_path: [string], ... }
│       └── RegionFeature: { region: { id, hexes }, ... }
│   common attributes:
│       ├── terrain: string
│       ├── elevation: integer
│       ├── label: string
│       ├── id: string
│       ├── tags: array of string
│       └── properties: object
└── extensions: object (additionalProperties: true)
```

**Key constraints:**

- Terrain type identifiers MUST match the pattern `^[a-z][a-z0-9_]*$`.
- Feature `terrain` values MUST reference a type defined in the
  appropriate terrain vocabulary subsection.
- Edge references MUST match the pattern
  `^.+/(N|NE|E|SE|S|SW|W|NW|[1-6])$`.
- Vertex references MUST match the pattern
  `^.+\.(N|NE|E|SE|S|SW|W|NW|[1-6])$`.
- Path arrays MUST have at least 2 elements.
- Region `hexes` arrays MUST have at least 1 element.

The JSON Schema file is the authoritative reference for validation
details including all required/optional field distinctions, type
constraints, and enum values.

---

## 11. Test Cases

The following real wargame maps are identified as test cases for format
validation. Each exercises different aspects of the format. Reference
encodings will be maintained in the `tests/` directory.

**Acceptance criteria** for each test case: the reference HexMap file
must (a) validate against the JSON Schema, (b) round-trip through a
JSON<->YAML conversion with semantic equivalence, and (c) produce the
correct graph structure (hex count, edge adjacencies, path connectivity).

### 11.1 Battle for Moscow (Frank Chadwick / GDW, 1986)

**Exercises:** Basic operational map, XXYY coordinates, terrain (clear,
forest, swamp, city, major city), rivers on edges, roads and railroads
as paths, fortification regions, victory hexes.

**Scale:** 16 km/hex, 22x15 grid, flat-top.

**Complexity:** Low. Ideal first complete encoding.

### 11.2 Panzer Blitz / Panzer Leader (Avalon Hill, 1970/1974)

**Exercises:** Tactical scale, elevation levels (0-2), slope hexsides
(directed edges), woods/town/rough terrain, roads, streams on edges.
Geomorphic map boards (multiple boards per scenario).

**Scale:** 250m/hex, 4 boards of ~16x10 each, flat-top.

**Complexity:** Medium. Tests elevation, directed edges.
Multi-board composition deferred to v2 (see Appendix D, Q1).

### 11.3 Advanced Squad Leader boards (MMP)

**Exercises:** Maximum terrain complexity. Multi-story buildings (stone
vs wood), orchards, grain fields, brush, gullies, bridges, fords,
walls, hedges, bocage, railroad embankments. Elevation 0-3+.

**Scale:** 40m/hex, various board sizes, pointy-top (unusual).

**Complexity:** High. Stress test for terrain vocabulary and edge types.

### 11.4 The Russian Campaign (Jedko/AH, 1974)

**Exercises:** Large operational map, weather zones, sea hexes, straits,
complex rail network, Dnepr River as long connected edge path.

**Scale:** ~50 km/hex, large map (~34x22), flat-top.

**Complexity:** Medium-high. Tests large maps and long paths.

### 11.5 Drive on Metz (SPI, 1980)

**Exercises:** Mid-complexity operational map, fortification hexes,
river crossings, bridge vertices, road network, urban terrain.

**Scale:** ~2 km/hex.

**Complexity:** Medium.

### 11.6 Hold the Line (Worthington, 2008)

**Exercises:** AWI-era map, simpler terrain vocabulary, elevation
(hills), woods, towns, stone walls on edges. Geomorphic boards.

**Scale:** Abstract/tactical.

**Complexity:** Low-medium. Good test of edge features (walls).

### 11.7 Synthetic / procedural test maps

**Exercises:** Programmatic generation. A 5x5 minimal map for unit
testing. A large 100x100 map for performance. Irregular boundaries.
Maps with every feature type.

---

## 12. Security Considerations

HexMap documents are data files with no executable content. Parsers
SHOULD NOT evaluate any string field as code. Standard JSON/YAML parsing
security considerations apply: parsers SHOULD reject excessively large
documents, deeply nested structures, and (for YAML) MUST disable
arbitrary object instantiation (i.e., use safe loading).

File paths and URLs in `metadata.source` are informational and MUST NOT
be automatically fetched or executed.

---

## 13. References

### Normative

- RFC 8259: The JavaScript Object Notation (JSON) Data Interchange Format
- RFC 2119: Key words for use in RFCs to Indicate Requirement Levels
- YAML 1.2 Specification: https://yaml.org/spec/1.2.2/
- JSON Schema (2020-12): https://json-schema.org/specification

### Informative

- Red Blob Games, Hexagonal Grids:
  https://www.redblobgames.com/grids/hexagons/
- Amit Patel, "Implementation of Hex Grids" (coordinate systems, offset
  schemes, conversions)
- VASSAL Engine Terrain Recording:
  https://vassalengine.org/wiki/Terrain_Recording
- Worldographer file format:
  https://worldographer.com/instructions/file-format/
- LaTeX wargame package:
  https://vladar.bearblog.dev/latex-wargame-package/

---

## Appendix A: Conventional Terrain Vocabulary (Non-Normative)

For WWII-era hex wargames, the following terrain type identifiers are
RECOMMENDED as a starting point for interoperability. Maps are not
required to use these exact identifiers.

### Hex terrain types

| Identifier | Name | Typical games |
|------------|------|---------------|
| `clear` | Clear / Open | All |
| `forest` | Forest / Woods | All |
| `light_woods` | Light Woods / Orchard | Tactical |
| `rough` | Rough / Broken | Many |
| `swamp` | Swamp / Marsh | Many |
| `mountain` | Mountain | Operational+ |
| `desert` | Desert | North Africa |
| `city` | City / Town | All |
| `major_city` | Major City | Operational+ |
| `village` | Village | Tactical |
| `water` | Water / Lake | Many |
| `ocean` | Ocean / Sea | Naval, coastal |
| `farmland` | Farmland / Fields | Tactical |
| `bocage` | Bocage | Normandy |
| `major_river` | Major River (hex-filling) | Operational+ |

### Edge terrain types

| Identifier | Name | Directed? | Typical games |
|------------|------|-----------|---------------|
| `river` | River | no | Most |
| `major_river` | Major / Wide River | no | Operational+ |
| `stream` | Stream / Creek | no | Tactical |
| `cliff` | Cliff / Escarpment | **yes** | Many |
| `slope` | Slope / Elevation Change | **yes** | Tactical |
| `wall` | Wall (stone, etc.) | no | Tactical |
| `hedge` | Hedge | no | Tactical |
| `bocage` | Bocage (edge) | no | Normandy |
| `ford` | Ford | no | Many |
| `impassable` | Impassable Hexside | no | Various |

### Vertex terrain types

| Identifier | Name | Typical games |
|------------|------|---------------|
| `bridge` | Bridge | Many |
| `ford` | Ford | Many |
| `crossroads` | Crossroads | Tactical |

### Path terrain types

| Identifier | Name | Typical games |
|------------|------|---------------|
| `road` | Road (primary) | Most |
| `secondary_road` | Secondary Road / Track | Many |
| `trail` | Trail | Tactical |
| `railroad` | Railroad | Operational+ |
| `river` | River (connected course) | Most |

---

## Appendix B: Clock Direction System

PDS: we should make more of this. "secret weapon" for making the format machine-friendly?
Perhaps MUST support for implementations, even if the user-facing docs emphasize compass directions. It makes rotation and reflection algorithms much easier to write.  how
to clarify indexed (1-6) vs hours (1-12)?


The clock direction system provides a unified, orientation-independent
way to reference the 12 geometric features around a hex (6 edges and
6 vertices), numbered 1-12 clockwise from 12 o'clock (straight up).

Edges and vertices alternate around the hex. Which positions are edges
and which are vertices depends on `hex_top`:

### Flat-top (edges at even hours, vertices at odd hours)

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

PDS: can we add a pointy version side-by-side with above?  also the NW/N/NE labels should be outside not inside

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

### Pointy-top (vertices at even hours, edges at odd hours)

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

This system is informative — compass directions remain the primary
addressing mechanism. But clock positions are useful for algorithms and
for compact notation in geometry expressions (Appendix C).

---

## Appendix C: Geometry Expressions (Future)

**This appendix is NOT part of the v1.0 format.** It sketches a design
direction for a compact expression language in future versions. Nothing
in this appendix is normative or implemented. It is preserved here to
record design thinking and invite feedback.

PDS: feels like there's a happy median where we extend the current
structured features using arrays, nested arrays etc.  maybe that looks a bit
like more like geojson tho i don't know that we need all the formalism of rings and holes etc?

don't implement full Boolean set operations, that's more a geometry engine.
rely on stencilling layers, e.g. set all as swamp, then reset a hex as island

each feature resolves to a HexCollection, EdgeCollection or VertexCollection
for hex paths we want connectivity info, but that could be an edge collection.

implicit conversion, e.g. HexCollection can be converted to all edges it contains
(excluding half edge boundary?) so hex path => interior edges for river/road crossings

or maybe need explicit conversion like inf/sup?

operators:
  border(collection) returns the subset of collection which have neighbors not in collection
  filled(collection) returns superset of collection adding items within the the boundary 
    of adjacent neighbors (e.g. for vertices within the edge boundary)

boundary (sided?)
within/inside
span/incident/closure = boundary + within

  hexes => having_all(edges)
  hexes => having_any(edges)


  path: [start, end], closed?, nudge?
features: 
  - { hex: a23, id: moscow }
  - { hex: [ #moscow, #leningrad, z13 ], id: cities }
  - { hex: #some-edges }
  - { hexes: }
  - { hexpath: [ b13, '...', e13] } # resolves to edge collection, equiv to edges: hexes: [ ... ]
  hexes: 

Gemini ideas:

```
features:
  - hexes: 
      rect: ["0101", "1010"] # Selects a bounding box
      exclude: ["0505"]      # Set subtraction
    terrain: forest
    
  - edge_path:
      from: "0101"
      to: "0501"
      nudge: "N"             # Resolves the "tie-break" shortest path problem
    terrain: road

# Selects all edges that form the perimeter of a hex-set
- edges:
    boundary_of: 
      region: "soviet-fortifications"
    side: "internal"  # Targets the half-edges belonging to the hexes inside
  terrain: wall    

features:
  - region:
      id: soviet-fortifications
      # Instead of listing every hex, define a span
      span: ["0805..1105"]  # or explicit operator ["0805", "...", "1105"] ?
    tags: [fortified]
    label: "Soviet Fortification Line"

# this seems a bit forced
features:
  - edge_path:
      # Trace defines the "river bed" by listing the hexes it flows between
      trace: ["0910", "1010", "1009", "1109"]
      # 'side' resolves which specific hexside is used when moving between hexes
      mode: "between" 
    terrain: river
    label: "Nara River"

features:
  - edges:
      boundary_of: { hex: "0403" }
      # 'directed: true' in your terrain vocabulary (Section 4.5) 
      # is satisfied here by the selector implicitly targeting the half-edges of 0403.
    terrain: slope   

- path:
    from: "0101"
    to: "0505"
    nudge: "NE" # Prefers the most North-Eastern route if multiple exist
  terrain: railroad     

features:
  - id: "soviet_zone"
    hexes: { rect: ["1010", "2020"] }
    # This entry just defines a region, no terrain yet
    
  - name: "Fortified Line"
    edges: { boundary_of: { ref: "soviet_zone" } }
    terrain: trench
```

### Motivation

Hand-authoring large maps requires compact ways to specify collections
of hexes, edges, and vertices. Listing every hex in a forest or every
edge in a river is tedious and error-prone.

### Proposed notation

**Hex list:**
```
A13, A25, B16
```

**Hex path (shortest path between two hexes):**
```
A13 - A17
```
Valid only when there is a unique shortest path between the endpoints.

**Hex loop (closed path):**
```
A13 - A17 - C17 - C13 -
```
Trailing `-` closes the loop back to the first hex.

**Hex region (filled area from boundary path):**
```
A13 - A17 - C17 - C13 -*
```
`-*` means "close the loop and fill the interior."

**Edge path:**
```
A13/N - A17/N
```
Connected sequence of edges.

**Set operations:**
```
region1, region2          # union
region1 & region2         # intersection
region1 - region2         # difference
```

**Geometry conversion:**
```
/forest-region            # edges within a hex region
.forest-region            # vertices within a hex region
|forest-region            # boundary edges of a hex region
```

### Half-edge boundaries

The boundary of a hex region naturally produces half-edges (each boundary
edge belongs to a hex inside the region). The `|` operator could return
these as directed edge references, useful for marking the boundary of a
terrain region automatically.

### Open questions

- Tie-breaking when multiple shortest paths exist (nudge direction?)
- How to specify non-convex regions
- Whether expressions can reference named features by id
- Performance implications for very large selections

---

## Appendix D: Open Questions

Issues to resolve in future revisions:

1. **Multi-board / geomorphic maps.** Panzer Blitz and ASL use
   interchangeable map boards composed into different configurations per
   scenario. The format needs a way to define individual boards and
   compose them — including rotation and offset of coordinates. This
   could be a `boards` section that lists sub-maps with transforms, or
   a composition document that references separate HexMap files.
   **v1.0 encodes single boards only.** Multi-board composition is
   deferred to a future version. The `tile` terminology is reserved
   for this use.

PDS: we should solve in v1.  Most of the map setup (metadata, terrain, grid) would be shared,
perhaps just allow a list of mapboard: { id: defaults: features: extensions: }  ?

2. **Terrain stacking.** Can a hex have multiple terrain types? (e.g.,
   forest + hill, or road passing through a town). Current model: a
   hex has one `terrain` type plus `elevation` plus `tags`. The layered
   features model allows later entries to override, but not stack.
   Should `terrain` be an array? Or is elevation + tags + properties
   sufficient to capture stacking?

PDS: perhaps distinguish a set of base terrains that are mutually 
exclusive (last one applied wins) from 'modifier' terrains which 
can stack.  e.g. one of forrest, swamp or plains; but several of road, river, fort?

3. **Road junctions.** Some roads fork inside a hex (entering via one
   edge, exiting via two). The path model assumes linear sequences.
   Solutions: allow branching paths, or decompose into multiple paths
   sharing a waypoint.
PDS: decomposition seems fine 

4. **Partial hexes.** Real maps have partial hexes at boundaries. Should
   these be explicitly marked, or inferred from the boundary?
PDS: seems more like a rendering concern, unless they have different play 
mechanics?  ie. are they regular hexes that are just clipped at the boundary,
are the excluded from the map (invalid) or somehow special?

5. **River/road intersection semantics.** When a road path crosses a
   river edge, is there an implicit bridge? Or must bridges be
   explicitly annotated as vertex features?
PDS: typically a road would be thru hexes, and river along edges,
with bridge as edge terrain.  we shouldn't build any semantics for 
how terrains interact.

6. **Stagger naming.** Is `"low"` / `"high"` intuitive enough? Other
   candidates: `"indent-first"` / `"indent-second"`, or describe the
   visual pattern with a small diagram in the spec. (Diagrams are now
   included in Section 4.3; the naming question remains open.)
PDS: ya, i don't think it's intuitive, which should brainstorm alternatives

7. **Coordinate label patterns.** The `XXYY` / `AY` pattern system is
   simple but limited. Does it cover all real-world wargame labeling
   schemes? What about systems like "hex 3-1204" (board 3, hex 1204)?
   Multi-board notation is deferred to v2.
PDS: let's collect a set of real-world examples and review.  i 
think there might also be different alpha counting schems, 
e.g. A .. Z, AA, BB, CC, ... vs A .. Z, AA, AB, AC ...  
eg. excel style base-26 vs repeating A .., AA ..., AAA ...
in general could use an invertible u/v/w <=> label function but don't really want that complexity 

8. **Compact edge notation.** Rivers with many edges are still verbose
   even with `edge_path`. The geometry expression language (Appendix C)
   addresses this for v2.
PDS: yes we should solve for a version of appendix C

9. **Feature ordering guarantees.** The spec says "later entries override."
   Should implementations also support explicit priority/z-order for
   cases where document order isn't the desired precedence?
PDS: worth exploring, but maybe back-references and labeled feature groups would be enough?
seems like there is lots of prior art for how to do stuff like that in other structured doc types
