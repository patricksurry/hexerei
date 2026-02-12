# The HexMap Format

**hexerei project — format specification draft**
**February 2026, revision 2**

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

However, conversion to/from GeoJSON is straightforward and SHOULD be
supported by implementations. A hex map with a defined geographic projection
can be losslessly converted to GeoJSON feature collections.

---

## 2. Conventions and Terminology

**hex**: A single hexagonal cell on the grid. Synonyms: tile, cell, face.

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

**cube coordinates**: A three-integer coordinate system (x, y, z) for hex
grids where x + y + z = 0. This is the canonical mathematical
representation for hex math (distance, neighbors, line drawing, rings).
Two coordinates suffice since the third is determined by the constraint;
the two-component form (q, r) is called **axial coordinates**.

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
the "source" side.

---

## 3. Format Overview

A HexMap document is a single JSON object (or equivalent YAML document)
with the following top-level structure:

```yaml
hexmap: "1.0"              # format version (REQUIRED)
metadata: { ... }          # map identity and descriptive info
grid: { ... }              # hex geometry and coordinate system
terrain: { ... }           # terrain type vocabulary (hex, edge, vertex)
defaults: { ... }          # default values for hexes, edges
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
| `defaults` | object | no | Default hex/edge properties (Section 4.6). |
| `features` | array | no | Map content (Section 4.7). |
| `extensions` | object | no | Reserved for extensions (Section 8). |

### 4.2 Metadata

The `metadata` object carries descriptive information about the map.
All fields are OPTIONAL.

```yaml
metadata:
  id: battle-for-moscow
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
| `title` | string | Human-readable name. |
| `description` | string | Longer description. |
| `designer` | string | Map or game designer. |
| `publisher` | string | Publisher name. |
| `date` | string | Publication date or year. |
| `source` | object | Provenance information. |

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
  scale:
    meters_per_hex: 16000
  geo:
    anchor: [54.5, 35.0]     # lat, lng of hex 0101 center
    bearing: 0                 # degrees, 0 = north up
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hex_top` | string | YES | `"flat"` or `"pointy"`. |
| `columns` | integer | conditional | Number of columns. REQUIRED for rectangular maps. |
| `rows` | integer | conditional | Number of rows. REQUIRED for rectangular maps. |
| `stagger` | string | no | Which columns (flat) or rows (pointy) are indented. See below. |
| `boundary` | array | no | List of hex IDs for non-rectangular maps. |
| `coordinates` | object | no | User coordinate labeling. See Section 4.4. |
| `scale` | object | no | Physical scale of the map. |
| `scale.meters_per_hex` | number | no | Distance across a hex in meters. |
| `geo` | object | no | Geographic anchoring. See below. |

#### hex_top

Two values: `"flat"` (flat edge at 12 o'clock) or `"pointy"` (vertex at
12 o'clock). These are the standard terms used across the hex grid
literature.

#### stagger

When hex columns (flat-top) or rows (pointy-top) are arranged in a
rectangular grid, alternating columns/rows must be offset. The `stagger`
field specifies which ones are shifted:

| Value | Flat-top meaning | Pointy-top meaning |
|-------|------------------|--------------------|
| `"low"` (default) | First column sits lower | First row sits further right |
| `"high"` | First column sits higher | First row sits further left |

"First" means the column or row with the lowest index (as determined by
the coordinate origin). `"low"` corresponds to Red Blob Games' `odd-q`
(flat-top) or `odd-r` (pointy-top) when coordinates start at 1.

#### geo (geographic anchoring)

The optional `geo` object anchors the hex grid to real-world geography.

| Field | Type | Description |
|-------|------|-------------|
| `anchor` | [number, number] | [latitude, longitude] of a reference hex center. |
| `anchor_hex` | string | Which hex the anchor refers to. Default: first hex. |
| `bearing` | number | Rotation in degrees clockwise from north. Default: 0. |
| `projection` | string | Map projection identifier. Default: `"mercator"`. |

This enables conversion to/from geographic coordinate systems and
overlay on real-world maps. The combination of anchor point, scale,
bearing, and projection fully defines the hex-to-geography mapping.

### 4.4 Coordinate Systems

The HexMap format uses two coordinate representations:

1. **User coordinates** (strings): Human-readable labels like `"0304"` or
   `"C4"`. These appear in the file as hex identifiers in features, edges,
   paths, etc. They MUST be unique within a map.

2. **Cube coordinates** (x, y, z integers): The canonical mathematical
   representation where x + y + z = 0. Implementations SHOULD use cube
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
| `origin` | string | `"top-left"` | Where numbering starts. |
| `first` | [int, int] | `[1, 1]` | Starting [column, row] number. |

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

**Origin** specifies the corner where numbering begins:

| Value | Column numbers increase | Row numbers increase |
|-------|------------------------|---------------------|
| `"top-left"` (default) | left → right | top → bottom |
| `"bottom-left"` | left → right | bottom → top |
| `"top-right"` | right → left | top → bottom |
| `"bottom-right"` | right → left | bottom → top |

Most wargames use `"top-left"` (XXYY with 01,01 in the upper-left).

### 4.5 Terrain Vocabulary

The `terrain` object defines all terrain types used on this map, organized
by the geometry they apply to: hexes, edges, or vertices.

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
    major_river:
      name: "Major River"

  edge:
    river: {}
    cliff:
      directed: true
    wall:
      name: "Stone Wall"
    slope:
      directed: true

  path:
    road: {}
    railroad: {}
    river:
      name: "River"
```

#### Type identifiers

Type identifiers MUST be lowercase ASCII with underscores for word
separation (e.g., `light_woods`, `major_river`).

When `name` is omitted, it defaults to the identifier converted from
snake_case to Title Case: `light_woods` → "Light Woods",
`major_river` → "Major River".

#### Terrain type definition object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | no | Human-readable display name. Auto-generated from identifier if omitted. |
| `directed` | boolean | no | Edge types only. If true, the feature is asymmetric (e.g., cliff). Default: false. |
| `style` | object | no | Display hints (color, pattern, etc). See below. |
| `properties` | object | no | Arbitrary additional properties. |

The `style` object carries optional rendering hints:

| Field | Type | Description |
|-------|------|-------------|
| `color` | string | Suggested fill color (CSS hex, e.g. `"#2d5a1e"`). |
| `pattern` | string | Suggested fill pattern name. |
| `stroke` | string | Suggested line color for edges/paths. |
| `stroke_width` | number | Suggested line width for edges/paths. |

Style is purely advisory. Renderers MAY ignore it entirely.

#### Geometry subsections

The three subsections — `hex`, `edge`, `path` — scope terrain identifiers
to their geometry. The same identifier MAY appear in multiple subsections
(e.g., `river` as both an edge type and a path type). This supports the
real-world fact that a river may be represented as hex-filling terrain,
as edge features, or as a connected path, depending on scale and game
design.

A `vertex` subsection MAY also be included for games that annotate
vertices (bridges, crossroads). It follows the same structure as `edge`.

**The format does not define a fixed set of terrain types.** Each map
declares its own vocabulary. This is intentional: terrain types are
game-specific, not universal. A format that baked in "forest" and "swamp"
would fail for science fiction, naval, or abstract games.

However, Appendix A provides a recommended conventional vocabulary for
common hex wargames as a non-normative interoperability aid.

### 4.6 Defaults

The `defaults` object specifies property values applied to every hex (and
optionally edge/vertex) that does not have an explicit value set in the
features list.

```yaml
defaults:
  hex:
    terrain: clear
    elevation: 0
```

| Field | Type | Description |
|-------|------|-------------|
| `hex` | object | Default properties for all hexes. |
| `hex.terrain` | string | Default hex terrain type. |
| `hex.elevation` | integer | Default elevation level. |
| `edge` | object | Default properties for all edges (rare). |

If `defaults.hex.terrain` is specified, hexes not mentioned in the
features list are assumed to exist (within the grid bounds) with that
terrain. If no default terrain is specified, only hexes explicitly
mentioned in features exist.

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

#### Feature attributes

| Field | Type | Description |
|-------|------|-------------|
| `terrain` | string | Terrain type from the appropriate vocabulary subsection. |
| `elevation` | integer | Elevation level (hex features only). |
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
    terrain: cliff    # directed: the cliff base is on the 0503 side
```

For directed edge types (where `directed: true` in the terrain
vocabulary), the hex in the address indicates the "source" side.
For a cliff, the referencing hex is at the base; the adjacent hex
is at the top. For a slope, the referencing hex is the lower side.

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

The edges crossed by the path are implicit — derived from the relative
positions of consecutive hexes. Implementations compute these during
parsing.

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

Each edge in the sequence SHOULD share a vertex with the next edge
(i.e., the path should be connected).

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

### 5.1 Hexes

A hex is referenced by its user coordinate string:

```
0304        # XXYY format
C4          # letter-number format
```

### 5.2 Edges

An edge is referenced as `hex/direction`, where the hex is a user
coordinate and the direction identifies which edge:

```
0304/N      # north edge of hex 0304 (compass direction)
0304/1      # same edge (clockwise index, see Appendix B)
```

The `/` separator distinguishes edge references from hex references.

**Compass directions for edges:**

Flat-top (`hex_top: flat`):

```
          N
    NW _______ NE
      /       \
     /         \
     \         /
      \_______/
    SW         SE
          S
```

Edge directions: **N, NE, SE, S, SW, NW**

Pointy-top (`hex_top: pointy`):

```
        /\
    NW /  \ NE
      /    \
   W |      | E
      \    /
    SW \  / SE
        \/
```

Edge directions: **NE, E, SE, SW, W, NW**

### 5.3 Vertices

A vertex is referenced as `hex.direction`, where the dot separator
distinguishes vertex references from edge references:

```
0304.E      # east vertex of hex 0304 (compass direction)
0304.2      # same vertex (clockwise index, see Appendix B)
```

**Compass directions for vertices:**

Flat-top vertices: **NE, E, SE, SW, W, NW**

```
     NW _______ NE
       /       \
   W  |         |  E
       \_______/
     SW         SE
```

Pointy-top vertices: **N, NE, SE, S, SW, NW**

```
         N
        /\
       /  \
   NW /    \ NE
      \    /
       \  /
    SW  \/  SE
         S
```

### 5.4 Edge and vertex equivalence

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

### 5.5 Numeric addressing

As an alternative to compass directions, edges and vertices can be
addressed by clockwise index starting from 12 o'clock:

| Index | Flat-top edge | Flat-top vertex | Pointy-top edge | Pointy-top vertex |
|-------|---------------|-----------------|-----------------|-------------------|
| 1 | N | NE | NE | N |
| 2 | NE | E | E | NE |
| 3 | SE | SE | SE | SE |
| 4 | S | SW | SW | S |
| 5 | SW | W | W | SW |
| 6 | NW | NW | NW | NW |

So `0304/1` is the first edge clockwise from 12 o'clock, and `0304.1`
is the first vertex. Both compass and numeric forms are valid. See
Appendix B for the full clock direction system.

---

## 6. Hex Geometry Reference

This section defines the mathematical relationships between coordinate
systems. It is normative: implementations MUST use these conversions.

### 6.1 Cube coordinates

Cube coordinates (x, y, z) satisfy the constraint **x + y + z = 0**.
This constraint means any hex can be identified by two coordinates; the
third is derived. The three axes are symmetric, which simplifies
algorithms for distance, neighbors, rings, and line drawing.

Axial coordinates (q, r) are a two-component shorthand:
```
q = x
r = z
y = -q - r
```

### 6.2 Offset to cube conversion

User coordinates are parsed into (col, row) integers via the label
pattern, then converted to cube coordinates. The conversion depends on
hex_top and stagger.

Let (col, row) be the parsed column and row, adjusted so the grid-origin
hex is (0, 0).

**Flat-top, stagger: low (first column is lower):**
```
x = col
z = row - floor(col / 2)
y = -x - z
```

**Flat-top, stagger: high (first column is higher):**
```
x = col
z = row - ceil(col / 2)
y = -x - z
```

**Pointy-top, stagger: low (first row is further right):**
```
x = col - floor(row / 2)
z = row
y = -x - z
```

**Pointy-top, stagger: high (first row is further left):**
```
x = col - ceil(row / 2)
z = row
y = -x - z
```

### 6.3 Neighbor directions in cube coordinates

The six neighbors of hex (x, y, z) and their edge directions:

**Flat-top:**

| Edge | Δx | Δy | Δz |
|------|----|----|-----|
| N    |  0 | +1 | -1 |
| NE   | +1 |  0 | -1 |
| SE   | +1 | -1 |  0 |
| S    |  0 | -1 | +1 |
| SW   | -1 |  0 | +1 |
| NW   | -1 | +1 |  0 |

**Pointy-top:**

| Edge | Δx | Δy | Δz |
|------|----|----|-----|
| NE   | +1 |  0 | -1 |
| E    | +1 | -1 |  0 |
| SE   |  0 | -1 | +1 |
| SW   | -1 |  0 | +1 |
| W    | -1 | +1 |  0 |
| NW   |  0 | +1 | -1 |

### 6.4 Hex distance

The distance between two hexes in cube coordinates is:

```
distance = max(|x1-x2|, |y1-y2|, |z1-z2|)
```

Or equivalently:

```
distance = (|x1-x2| + |y1-y2| + |z1-z2|) / 2
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

The `properties` field on feature entries is the primary mechanism for
per-element extension data. Unrecognized properties MUST be preserved
and passed through.

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
  title: "Battle for Moscow"
  designer: "Frank Chadwick"

grid:
  hex_top: flat
  columns: 22
  rows: 15
  stagger: low
  scale:
    meters_per_hex: 16000
  coordinates:
    label: XXYY
    origin: top-left
    first: [1, 1]

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
  scale:
    meters_per_hex: 250

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

  # Slope hexsides around the hill (directed: 0403 is the high side)
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

  # Road through the valley
  - path: ["0104", "0204", "0304", "0404", "0504", "0604"]
    terrain: road
    id: main-road
```

---

## 10. JSON Schema

The normative JSON Schema for the HexMap format is maintained as a
separate file: `hexmap.schema.json`. A summary of the schema structure:

```
HexMapDocument
├── hexmap: string (enum: "1.0")
├── metadata: MetadataObject
├── grid: GridObject (required)
│   ├── hex_top: enum [flat, pointy]
│   ├── columns, rows: integer
│   ├── stagger: enum [low, high]
│   ├── boundary: array of strings
│   ├── coordinates: CoordinatesObject
│   ├── scale: ScaleObject
│   └── geo: GeoObject
├── terrain: TerrainVocabulary
│   ├── hex: map<string, TerrainTypeDef>
│   ├── edge: map<string, TerrainTypeDef>
│   ├── vertex: map<string, TerrainTypeDef>
│   └── path: map<string, TerrainTypeDef>
├── defaults: DefaultsObject
│   ├── hex: { terrain, elevation }
│   └── edge: { ... }
├── features: array of FeatureEntry
│   └── FeatureEntry: one-of
│       ├── HexFeature: { hex | hexes, terrain, elevation, ... }
│       ├── EdgeFeature: { edge | edges, terrain, ... }
│       ├── VertexFeature: { vertex | vertices, terrain, ... }
│       ├── PathFeature: { path | edge_path, terrain, ... }
│       └── RegionFeature: { region, tags, ... }
└── extensions: object
```

The full JSON Schema is defined in a companion document.

---

## 11. Test Cases

The following real wargame maps are identified as test cases for format
validation. Each exercises different aspects of the format:

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

**Complexity:** Medium. Tests elevation, directed edges, multi-board.

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

The clock direction system provides a unified, orientation-independent
way to reference the 12 geometric features around a hex (6 edges and
6 vertices), numbered 1-12 clockwise from 12 o'clock (straight up).

Edges and vertices alternate around the hex. Which positions are edges
and which are vertices depends on `hex_top`:

### Flat-top (edges at even hours, vertices at odd hours)

```
         12 (N edge)
    11 .___________. 1
  (NW  /           \  (NE
  edge)/    hex     \  edge)
 10 .|      center   |. 2
(W   |               | (E
vert)|               | vert)
  9  |               |  3
(NW  \             /  (SE
 edge) \_________/   edge)
     8 .           . 4
       7     6     5
           (S edge)
```

| Position | Feature | Compass label |
|----------|---------|---------------|
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
| 12 | edge | N |

So `/12` = N edge, `.1` = NE vertex, `/2` = NE edge, etc.

### Pointy-top (vertices at even hours, edges at odd hours)

| Position | Feature | Compass label |
|----------|---------|---------------|
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
| 12 | vertex | N |

The pattern: for flat-top, edges are at even clock positions (12, 2, 4,
6, 8, 10) and vertices at odd (1, 3, 5, 7, 9, 11). For pointy-top,
it's reversed.

The mnemonic: **even hours hit flat sides**. A flat-top hex has flat
edges at the even positions. A pointy-top hex has flat... well, all edges
are flat, but the "primary axis" edges (E/W for pointy-top) are at the
even 3 and 9 o'clock positions.

This system is informative — compass directions remain the primary
addressing mechanism. But clock positions are useful for algorithms and
for compact notation in geometry expressions (Appendix C).

---

## Appendix C: Geometry Expressions (Future)

This appendix sketches a compact expression language for specifying
geometric selections. This is **not part of the v1.0 format** but is
recorded here as a design direction for future versions.

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

2. **Terrain stacking.** Can a hex have multiple terrain types? (e.g.,
   forest + hill, or road passing through a town). Current model: a
   hex has one `terrain` type plus `elevation` plus `tags`. The layered
   features model allows later entries to override, but not stack.
   Should `terrain` be an array? Or is elevation + tags + properties
   sufficient to capture stacking?

3. **Road junctions.** Some roads fork inside a hex (entering via one
   edge, exiting via two). The path model assumes linear sequences.
   Solutions: allow branching paths, or decompose into multiple paths
   sharing a waypoint.

4. **Partial hexes.** Real maps have partial hexes at boundaries. Should
   these be explicitly marked, or inferred from the boundary?

5. **River/road intersection semantics.** When a road path crosses a
   river edge, is there an implicit bridge? Or must bridges be
   explicitly annotated as vertex features?

6. **Stagger naming.** Is `"low"` / `"high"` intuitive enough? Other
   candidates: `"indent-first"` / `"indent-second"`, or describe the
   visual pattern with a small diagram in the spec.

7. **Coordinate label patterns.** The `XXYY` / `AY` pattern system is
   simple but limited. Does it cover all real-world wargame labeling
   schemes? What about systems like "hex 3-1204" (board 3, hex 1204)?

8. **Compact edge notation.** Rivers with many edges are still verbose
   even with `edge_path`. The geometry expression language (Appendix C)
   addresses this for v2.

9. **Feature ordering guarantees.** The spec says "later entries override."
   Should implementations also support explicit priority/z-order for
   cases where document order isn't the desired precedence?
