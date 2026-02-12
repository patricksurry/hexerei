# The HexMap Format

**hexerei project — format specification draft**
**February 2026**

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
   - 4.6 [Hexes](#46-hexes)
   - 4.7 [Edges](#47-edges)
   - 4.8 [Vertices](#48-vertices)
   - 4.9 [Paths](#49-paths)
   - 4.10 [Regions](#410-regions)
5. [Hex Geometry Reference](#5-hex-geometry-reference)
6. [Serialization](#6-serialization)
7. [Extensibility](#7-extensibility)
8. [Examples](#8-examples)
9. [JSON Schema](#9-json-schema)
10. [Test Cases](#10-test-cases)
11. [Security Considerations](#11-security-considerations)
12. [References](#12-references)

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

**hex**: A single hexagonal cell on the grid. Synonyms: tile, cell, space.

**edge**: A side of a hex shared with an adjacent hex (or the map boundary).
Each interior edge is shared by exactly two hexes. Synonyms: hexside.

PDS: should support half-edge to allows for things like cliffs which are
on one side of an edge

**vertex**: A corner point where three hexes (or fewer at boundaries) meet.

**face**: Synonym for hex, used when emphasizing the graph-duality
relationship between faces, edges, and vertices.

**flat-top**: A hex orientation where the top and bottom sides are horizontal
(flat). The hex is wider than it is tall.

**pointy-top**: A hex orientation where vertices point up and down. The hex
is taller than it is wide.

**axial coordinates**: A two-integer coordinate system (q, r) for hex grids,
as described by Red Blob Games. This is the internal coordinate system.

PDS: is this a subset of the u,v,w symmetric system?  (which I like better for reasoning/algs internally).   i've never loved q,r labels (is that col, row, or row,col),
whereas x,y or even u,v seems more natural for labeling a grid in cols/rows

**user coordinates**: A human-readable labeling scheme for hexes, such as
"0304" (column 03, row 04) or "C4" (column C, row 4). Defined per map.

**terrain type**: A symbolic identifier for a category of terrain (e.g.,
`forest`, `city`). Defined per map in the terrain vocabulary.

**path**: An ordered sequence of connected hexes or edges representing a
linear feature such as a road, railroad, or river.

---

## 3. Format Overview

A HexMap document is a single JSON object (or equivalent YAML document)
with the following top-level structure:

```yaml
hexmap: "1.0"              # format version (REQUIRED)
metadata: { ... }          # map identity and descriptive info
grid: { ... }              # hex geometry and coordinate system

terrain: { ... }           # terrain type vocabulary
edge_types: { ... }        # edge feature type vocabulary
vertex_types: { ... }      # vertex feature type vocabulary
path_types: { ... }        # path type vocabulary

defaults: { ... }          # default values for hexes
hexes: { ... }             # per-hex data, keyed by user coordinate
edges: [ ... ]             # edge annotations
vertices: [ ... ]          # vertex annotations
paths: [ ... ]             # linear features (roads, rivers, etc.)
regions: { ... }           # named groups of hexes
extensions: { ... }        # implementation-specific extensions
```

PDS: extension - how to support geomorphic maps, like tiles
or reconfigurable map boards like ASL etc

Only `hexmap` and `grid` are REQUIRED. All other sections are OPTIONAL
and default to empty.

---

## 4. Data Model

### 4.1 Document Envelope

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hexmap` | string | YES | Format version. MUST be `"1.0"` for this spec. |
| `metadata` | object | no | Descriptive metadata (Section 4.2). |
| `grid` | object | YES | Grid geometry and coordinates (Section 4.3). |
| `terrain` | object | no | Terrain type definitions (Section 4.5). |
| `edge_types` | object | no | Edge type definitions (Section 4.5). |
| `vertex_types` | object | no | Vertex type definitions (Section 4.5). |
| `path_types` | object | no | Path type definitions (Section 4.5). |
| `defaults` | object | no | Default hex properties (Section 4.6). |
| `hexes` | object | no | Per-hex data (Section 4.6). |
| `edges` | array | no | Edge annotations (Section 4.7). |
| `vertices` | array | no | Vertex annotations (Section 4.8). |
| `paths` | array | no | Path features (Section 4.9). |
| `regions` | object | no | Named hex groups (Section 4.10). |
| `extensions` | object | no | Reserved for extensions (Section 7). |

### 4.2 Metadata

The `metadata` object carries descriptive information. All fields are
OPTIONAL.

```yaml
metadata:
  id: battle-for-moscow
  title: "Battle for Moscow"
  description: "The German advance on Moscow, Oct-Dec 1941"
  designer: "Frank Chadwick"
  publisher: "GDW"
  date: "1986"
  scale:
    meters_per_hex: 16000
    label: "16 km/hex"
  source:
    url: "https://grognard.com/bfm/game.html"
    notes: "Freely available introductory wargame"    
```

PDS: maybe scale moves to grid, or introduce a 
section describing how the map relates to the real world
(some anchor to lat/lng, scale, map projection, historical time period).
perhaps map features like cities could also be anchored to world lat/lng?

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Machine-readable identifier. SHOULD be lowercase with hyphens. |
| `title` | string | Human-readable name. |
| `description` | string | Longer description. |
| `designer` | string | Map or game designer. |
| `publisher` | string | Publisher name. |
| `date` | string | Publication date or year. |
| `scale` | object | Physical scale. |
| `scale.meters_per_hex` | number | Distance across a hex in meters. |
| `scale.label` | string | Human-readable scale label. |
| `source` | object | Provenance information. |

Implementations MUST preserve unrecognized fields in `metadata` and pass
them through unchanged.

### 4.3 Grid Geometry

The `grid` object defines the hex grid's geometry and shape. It is REQUIRED.

```yaml
grid:
  orientation: flat-top
  shape: rectangle
  columns: 22
  rows: 15
  offset: odd-q
  coordinates:
    format: "{col:02d}{row:02d}"
    first_column: 1
    first_row: 1
```

PDS:  
don't love orientation, what about hex_top: point[y] | flat | vertex | edge

odd-q and odd-r are un-intuitive.  words like zigzag or nudge vibe.  is it
better to describe odd/even (what is happening to them) or whether the first
bumps left/right/up/down?  ideas?

don't like coordinates section. should support LR/RL/TB/BT for indexing
origin.  some css-style thing where you can anchor the top | bottom  and left | right,
and indexing starts from there.  how does it work if the map is irregular, always a bounding rectangle with excluded hexes?

also seems odd to have format specified as a python format string.
given limited choices is a date-format style thing more intuitive?  
allow for punctuation in labels, e.g. "(3,4)"

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `orientation` | string | YES | `"flat-top"` or `"pointy-top"`. |
| `shape` | string | no | `"rectangle"` (default) or `"irregular"`. |
| `columns` | integer | conditional | Number of columns. REQUIRED if shape is `"rectangle"`. |
| `rows` | integer | conditional | Number of rows. REQUIRED if shape is `"rectangle"`. |
| `offset` | string | no | Offset scheme. See below. Default: `"odd-q"` for flat-top, `"odd-r"` for pointy-top. |
| `boundary` | array | conditional | List of hex IDs forming the map boundary. REQUIRED if shape is `"irregular"`. |
| `coordinates` | object | no | User coordinate labeling. See Section 4.4. |

#### Offset schemes

Hex grids arranged in rectangular maps require offset coordinates. The
offset determines which columns (flat-top) or rows (pointy-top) are
shifted:

| Scheme | Orientation | Shifted |
|--------|-------------|---------|
| `odd-q` | flat-top | Odd columns shifted down |
| `even-q` | flat-top | Even columns shifted down |
| `odd-r` | pointy-top | Odd rows shifted right |
| `even-r` | pointy-top | Even rows shifted right |

These follow the conventions established by Red Blob Games.

### 4.4 Coordinate Systems

The HexMap format uses three coordinate representations:

1. **User coordinates** (strings): Human-readable labels like `"0304"` or
   `"C4"`. These are the keys used in the `hexes` object and in edge/path
   references. They MUST be unique within a map.

2. **Offset coordinates** (col, row integers): The underlying grid position.
   The mapping from offset to user coordinates is defined by the
   `coordinates` object.

3. **Axial/cube coordinates** (q, r): The canonical mathematical
   representation. Implementations SHOULD use axial coordinates internally
   for hex math. The conversion from offset to axial depends on the
   offset scheme and is well-defined (see Section 5).

do we really need #2 other than as an intermediate step from 1 <> 3 ?

#### User coordinate format

The `coordinates` object defines how offset (col, row) maps to user-visible
string labels:

```yaml
coordinates:
  format: "{col:02d}{row:02d}"    # → "0304"
  first_column: 1                  # offset col 0 maps to display column 1
  first_row: 1                     # offset row 0 maps to display row 1
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `format` | string | `"{col:02d}{row:02d}"` | Python-style format string. Supported variables: `col` (integer), `row` (integer), `col_alpha` (A-Z letter). |
| `first_column` | integer | 1 | Display column number for offset column 0. |
| `first_row` | integer | 1 | Display row number for offset row 0. |

**Examples of common wargame coordinate schemes:**

| Convention | Format string | Example |
|-----------|--------------|---------|
| XXYY (most common) | `"{col:02d}{row:02d}"` | `"0304"` |
| XXXYYY (large maps) | `"{col:03d}{row:03d}"` | `"003004"` |
| Letter-number | `"{col_alpha}{row:02d}"` | `"C04"` |
| Letter-number compact | `"{col_alpha}{row}"` | `"C4"` |

When `format` is omitted, the default `"{col:02d}{row:02d}"` (XXYY) is
used, which matches the most common wargame convention.

### 4.5 Terrain Vocabulary

The `terrain`, `edge_types`, `vertex_types`, and `path_types` objects
define the vocabularies of feature types used on this map. Each is a
dictionary mapping a type identifier (string) to a definition object.

Type identifiers MUST be lowercase ASCII, using underscores for word
separation (e.g., `light_woods`, `major_river`).

PDS: don't like separate terrain/path/edge/vertex sections.
put everything in terrain, with subsections for hex/edge/vertex.  
plus halfedge section or optional flag on edge terrain types to indicate 
full or half?

PDS: color seems like a display concern, equally could have texture or
other drawing properties.  but good to have standard name for rendering?
 there would also be semantic concerns
like defense/attack modifier, movement eligibility.

PDS: name could default to tag snake case => capitalized?

```yaml
terrain:
  clear:
    name: "Clear"
    color: "#d4c878"
  forest:
    name: "Forest"
    color: "#2d5a1e"
  swamp:
    name: "Swamp"
    color: "#6b8e6b"
  city:
    name: "City"
    color: "#888888"
  major_city:
    name: "Major City"
    color: "#666666"

edge_types:
  river:
    name: "River"
    color: "#4488cc"
  major_river:
    name: "Major River"
    color: "#2266aa"
  cliff:
    name: "Cliff"
  impassable:
    name: "Impassable"

path_types:
  road:
    name: "Road"
    color: "#8b6914"
  railroad:
    name: "Railroad"
    color: "#333333"
  river:
    name: "River"
    color: "#4488cc"
```

Each type definition object has these fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | YES | Human-readable display name. |
| `color` | string | no | Suggested display color (CSS hex). |
| `properties` | object | no | Arbitrary additional properties. |

The `terrain` vocabulary defines hex (face) terrain types. The `edge_types`
vocabulary defines features that appear on individual hexsides. The
`path_types` vocabulary defines linear features that span multiple hexes
or edges.

**The format does not define a fixed set of terrain types.** Each map
declares its own vocabulary. This is intentional: terrain types are
game-specific, not universal. A format that baked in "forest" and "swamp"
would fail for science fiction, naval, or abstract games.

However, Section 8 provides a recommended conventional vocabulary for
common WWII-era hex wargames, as a non-normative aid to interoperability.

PDS: that's nice, esp for things like rendering

### 4.6 Hexes

PDS: don't like having separate sections for each geometry type.
could do full geo-json style thing with explicit geometry type constructions
but seems overkill and not human readable.

what about a mini language like where we create list
of geometries, which can be optionally labeled.
each geometry is a collection of hexes, vertices, edges or half-edges.
geometries have have attributes like terrain or other properties
each hex has a coordinate label like A13.  
each vertex has a label inferred from a hex name, a dot, and a clockwise 1-based index
or a compass direction (depending on pointy/flat hex-top), like A13.3 or A13.SW
each edge has a label from a hex name, a slash, and a clockwise 1-based index
or compass direction like A13/3 or A13/E

list of hexes: A13, A25, B16
path of hexes: "A13 - A17" (only valid if unique shortest path)
loop of hexes: "A13 - A17 - C17 - C13 -"
region of hexes: "A13 - A17 - C17 - C13 -*" (or something...)
path of edges A13.N - A17.N 

needs more thought, but seems like simple operators could build complex
regions, like a union of regions (comma?), intersection, difference,
and conversion, e.g. "/ hex-region" gives edges within the region,
". hex-region" gives vertices.  
need a way to get boundary of region as half-edges (half-edge v edge needs thought)

maybe also a way to nudge path start/end to tie-break when there are two shortest-paths

should introduce a clock direction system, e.g. direction vectors 1...12 
where 12 is up, and either odd or even respectively correspond to vertices and edge midpoints.  e.g. A13@12 might be a way to nudge upward from hex center??



The `hexes` object is a dictionary keyed by user coordinate strings.
Each value is a hex data object describing that hex's properties.

```yaml
defaults:
  terrain: clear
  elevation: 0

hexes:
  "0304":
    terrain: forest
  "0507":
    terrain: major_city
    label: "Moscow"
    elevation: 1
    tags: [victory]
    properties:
      victory_points: 3
  "0812":
    terrain: city
    label: "Tula"
    tags: [victory]
```

#### Defaults

PDS: should this have hex/edge/vertex keys, not just for hexes?

The `defaults` object specifies property values applied to every hex that
does not explicitly override them. This dramatically reduces file size:
a map where 80% of hexes are clear terrain needs only list the 20% that
differ.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `terrain` | string | (none) | Default terrain type. |
| `elevation` | integer | `0` | Default elevation level. |

If `defaults.terrain` is specified, hexes not listed in the `hexes` object
are assumed to exist (within the grid bounds) with that terrain. If
`defaults.terrain` is not specified, only hexes explicitly listed exist.

#### Hex data object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `terrain` | string | no | Terrain type identifier from `terrain` vocabulary. |
| `elevation` | integer | no | Elevation level. |
| `label` | string | no | Display name (e.g., city name). |
| `tags` | array of strings | no | Semantic tags (e.g., `"victory"`, `"fortified"`, `"supply_source"`). |
| `properties` | object | no | Arbitrary key-value properties. |

Tags are freeform strings. The following tags are RECOMMENDED for
conventional use:

| Tag | Meaning |
|-----|---------|
| `victory` | Victory hex / objective. |
| `fortified` | Fortification or prepared defense. |
| `supply` | Supply source. |
| `entry` | Map entry hex for reinforcements. |
| `exit` | Map exit hex. |

### 4.7 Edges

Edges (hexsides) are specified as an array of edge annotation objects.
Each annotation identifies an edge by a hex coordinate and a direction,
and assigns a type from the `edge_types` vocabulary.

```yaml
edges:
  - hex: "0304"
    side: N
    type: river

  - hex: "0305"
    side: NE
    type: cliff
    properties:
      height: 2
```

#### Edge addressing

An edge is identified by a hex and a direction from that hex's center to
the midpoint of the edge:

**Flat-top hex edge directions:**

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

Flat-top edges: `N`, `NE`, `SE`, `S`, `SW`, `NW`

PDS: or equivalently  /1 /2, .../6

**Pointy-top hex edge directions:**

```
         /  \
    NW /      \ NE
     |          |
   W |          | E
     |          |
    SW \      / SE
         \  /
```

Pointy-top edges: `NE`, `E`, `SE`, `SW`, `W`, `NW`

#### Edge equivalence

Each interior edge is shared by two hexes. The edge identified as
`hex: "0304", side: NE` is the *same physical edge* as the corresponding
side of the adjacent hex. Implementations MUST treat these as equivalent.

A conforming document SHOULD reference each edge from only one hex (to
avoid contradictory duplicate entries). If duplicates occur, they MUST
agree on type and properties; if they disagree, the document is invalid.

PDS: i think half-edges are OK.  we need rules for how multiple entries
take precedence, e.g. might be easier to declare a large region of
desert, and then set specific hexes as oasis later, rather than 
disallow redefinition?  

#### Edge annotation object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hex` | string | YES | User coordinate of the hex. |
| `side` | string | YES | Edge direction (see above). |
| `type` | string | YES | Edge type from `edge_types` vocabulary. |
| `properties` | object | no | Arbitrary key-value properties. |

### 4.8 Vertices

Vertices are the corner points where hexes meet. In most wargames, vertices
carry no game data. Some games use vertices for bridge placement, crossroad
markers, or point features.

Vertex annotations follow the same pattern as edges:

```yaml
vertices:
  - hex: "0304"
    corner: E
    type: bridge
    properties:
      carries: road
```

#### Vertex addressing

A vertex is identified by a hex and a direction from the hex's center to
the vertex:

**Flat-top hex vertex directions:**

 vertices for a flat-top hex. The corners of a flat-top hex are at
the left and right points and the four corners of the top and bottom flat
edges:

```
     NW _______ NE
       /       \
   W  |         |  E
       \_______/
     SW         SE
```

Flat-top vertices: `NE`, `E`, `SE`, `SW`, `W`, `NW`
Or equivalently '.1, .2, .3, ...'

**Pointy-top hex vertex directions:**

PDS: this diagram is missing the flat top/bottom

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

Pointy-top vertices: `N`, `NE`, `SE`, `S`, `SW`, `NW`

#### Vertex equivalence

Each interior vertex is shared by three hexes. As with edges,
implementations MUST treat equivalent vertex references as identical.
A document SHOULD reference each vertex from only one hex.

PDS: is it important to have unique references?

#### Vertex annotation object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hex` | string | YES | User coordinate of the hex. |
| `corner` | string | YES | Vertex direction (see above). |
| `type` | string | YES | Vertex type from `vertex_types` vocabulary. |
| `properties` | object | no | Arbitrary key-value properties. |

### 4.9 Paths

Paths represent linear features that span multiple hexes: roads, railroads,
rivers, etc. A path has a type (from the `path_types` vocabulary) and a
geometry.

Two path geometries are defined:

1. **Through-hex paths** (`geometry: "hexes"`): The path passes through the
   centers of the listed hexes, crossing the edge between each consecutive
   pair. Used for roads, railroads, and trails.

2. **Along-edge paths** (`geometry: "edges"`): The path follows a sequence
   of hex edges. Used for rivers, walls, and other features that live on
   hexsides.

```yaml
paths:
  # A road passing through hex centers
  - id: moscow-highway
    type: road
    geometry: hexes
    waypoints: ["0104", "0204", "0304", "0404", "0504"]

  # A railroad
  - id: southern-rail
    type: railroad
    geometry: hexes
    waypoints: ["0507", "0508", "0608", "0708"]

  # A river following hex edges
  - id: nara-river
    type: river
    geometry: edges
    edges:
      - { hex: "0306", side: NE }
      - { hex: "0306", side: N }
      - { hex: "0206", side: NE }
      - { hex: "0206", side: N }
```

#### Path object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | no | Unique identifier for this path. |
| `type` | string | YES | Path type from `path_types` vocabulary. |
| `geometry` | string | YES | `"hexes"` or `"edges"`. |
| `waypoints` | array of strings | conditional | Ordered hex coordinates. REQUIRED when geometry is `"hexes"`. |
| `edges` | array of edge refs | conditional | Ordered edge references. REQUIRED when geometry is `"edges"`. |
| `label` | string | no | Display name for this path. |
| `properties` | object | no | Arbitrary key-value properties. |

#### Interaction between paths and edges

When a through-hex path (geometry `"hexes"`) crosses a hexside, the
crossing is implicit in the sequence of waypoints. Implementations can
derive which edge is crossed from the relative positions of consecutive
hexes.

When an along-edge path (geometry `"edges"`) overlaps with individual
edge annotations (Section 4.7), the path's type takes precedence for
path-related semantics, but individual edge annotations are preserved.
For example, a river might appear both as a path (capturing its
connected course) and as individual edge annotations (marking each
hexside for rules lookup). These are complementary, not contradictory.

### 4.10 Regions

Regions are named groups of hexes. They serve multiple purposes: defining
terrain regions compactly, marking scenario-specific zones, identifying
map sections, etc.

```yaml
regions:
  fortification_line:
    hexes: ["0503", "0504", "0505", "0604", "0605"]
    tags: [fortified]
    label: "Soviet Fortification Line"

  german_entry:
    hexes: ["0101", "0102", "0103", "0104", "0105"]
    tags: [entry]
    label: "German Entry Area"

  map_west:
    description: "Western half of the map"
    hexes: ["0101", "0102", "..."]   # hex list or range
```

#### Region object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hexes` | array of strings | YES | List of hex user coordinates in this region. |
| `tags` | array of strings | no | Tags applied to all hexes in the region. |
| `label` | string | no | Display name. |
| `description` | string | no | Description of this region. |
| `properties` | object | no | Arbitrary key-value properties. |

When a region assigns `tags`, those tags are merged with any tags on
individual hexes in the `hexes` section. Region tags do not override
per-hex tags; they are additive.

---

## 5. Hex Geometry Reference

This section defines the mathematical relationships between coordinate
systems. It is normative: implementations MUST use these conversions.

### 5.1 Offset to axial conversion

The conversion depends on the offset scheme. Let (col, row) be offset
coordinates and (q, r) be axial coordinates.

**odd-q (flat-top, odd columns shifted):**
```
q = col
r = row - floor(col / 2)
```

**even-q (flat-top, even columns shifted):**
```
q = col
r = row - ceil(col / 2)
```

**odd-r (pointy-top, odd rows shifted):**
```
q = col - floor(row / 2)
r = row
```

**even-r (pointy-top, even rows shifted):**
```
q = col - ceil(row / 2)
r = row
```

### 5.2 Axial to cube conversion

Cube coordinates (x, y, z) satisfy x + y + z = 0:
```
x = q
z = r
y = -x - z
```

### 5.3 Neighbor directions

For axial coordinates, the six neighbors of hex (q, r) are:

**Flat-top:**

| Direction | Δq | Δr | Edge label |
|-----------|----|----|------------|
| East      | +1 |  0 | — |
| NE        |  0 | -1 | — |
| NW        | -1 | -1 | — |
| West      | -1 |  0 | — |
| SW        |  0 | +1 | — |
| SE        | +1 | +1 | — |

Note: "East" and "West" are listed for the axial neighbor relationship.
The edge direction labels used in Section 4.7 correspond to the direction
from hex center to edge midpoint, which for flat-top hexes are: N, NE,
SE, S, SW, NW.

The mapping between neighbor direction and edge label depends on
orientation and is provided by the reference implementation.

### 5.4 Edge and vertex coordinate derivation

An edge can be uniquely identified in axial coordinates as a pair
(hex, direction) or equivalently as a pair of adjacent hex coordinates.
Implementations SHOULD normalize edge references to a canonical form
(e.g., the hex with the smaller (q, r) in lexicographic order paired
with the appropriate direction).

A vertex can be uniquely identified as a triple of hex coordinates
or as (hex, vertex_direction). Implementations SHOULD normalize vertex
references similarly.

---

## 6. Serialization

### 6.1 JSON (canonical)

The canonical serialization is JSON (RFC 8259). A HexMap JSON file:

- MUST be valid JSON.
- MUST be encoded as UTF-8.
- SHOULD use the file extension `.hexmap.json`.
- SHOULD use the media type `application/vnd.hexerei.hexmap+json`.

### 6.2 YAML (authoring format)

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

### 6.3 Validation

Implementations SHOULD validate documents against the JSON Schema defined
in Section 9. Validation MUST be performed against the JSON representation
(converting from YAML first if necessary).

---

## 7. Extensibility

### 7.1 The `extensions` object

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

### 7.2 The `properties` objects

The `properties` field on hexes, edges, vertices, paths, and regions is
the primary mechanism for per-element extension data. Like `extensions`,
unrecognized properties MUST be preserved and passed through.

### 7.3 Forward compatibility

Consumers that encounter unrecognized top-level keys SHOULD ignore them
(not reject the document). This allows future versions of the format to
add new sections without breaking older parsers.

---

## 8. Examples

### 8.1 Minimal map

The smallest valid HexMap document:

```json
{
  "hexmap": "1.0",
  "grid": {
    "orientation": "flat-top",
    "columns": 3,
    "rows": 3
  }
}
```

This defines a 3x3 flat-top hex grid with no terrain data. All hexes
exist but have no assigned terrain or features.

### 8.2 Small scenario map (YAML)

A fragment inspired by Battle for Moscow, demonstrating most features:

```yaml
hexmap: "1.0"

metadata:
  id: battle-for-moscow
  title: "Battle for Moscow"
  designer: "Frank Chadwick"
  scale:
    meters_per_hex: 16000

grid:
  orientation: flat-top
  shape: rectangle
  columns: 22
  rows: 15
  offset: odd-q
  coordinates:
    format: "{col:02d}{row:02d}"
    first_column: 1
    first_row: 1

terrain:
  clear:
    name: "Clear"
    color: "#d4c878"
  forest:
    name: "Forest"
    color: "#2d5a1e"
  swamp:
    name: "Swamp"
    color: "#8fae8f"
  city:
    name: "City"
    color: "#999999"
  major_city:
    name: "Major City"
    color: "#777777"

edge_types:
  river:
    name: "River"
    color: "#4488cc"

path_types:
  road:
    name: "Road"
    color: "#8b6914"
  railroad:
    name: "Railroad"
    color: "#333333"

defaults:
  terrain: clear
  elevation: 0

hexes:
  # Forests (subset for illustration)
  "0302": { terrain: forest }
  "0303": { terrain: forest }
  "0402": { terrain: forest }

  # Cities
  "0912": { terrain: city, label: "Kaluga" }
  "1205": { terrain: city, label: "Tula", tags: [victory] }

  # Major cities
  "1808": { terrain: major_city, label: "Moscow", tags: [victory] }

edges:
  # Oka River (fragment)
  - { hex: "0910", side: NE, type: river }
  - { hex: "0910", side: N,  type: river }
  - { hex: "0810", side: NE, type: river }

paths:
  - id: moscow-highway
    type: road
    geometry: hexes
    waypoints: ["1508", "1608", "1708", "1808"]

  - id: tula-rail
    type: railroad
    geometry: hexes
    waypoints: ["1205", "1306", "1407", "1508", "1608"]

regions:
  soviet_fortifications:
    hexes: ["0805", "0905", "1005", "1105"]
    tags: [fortified]
    label: "Soviet Fortification Line"

  german_entry_west:
    hexes: ["0101", "0102", "0103", "0104", "0105", "0106",
            "0107", "0108", "0109", "0110", "0111", "0112"]
    tags: [entry]
    label: "German Entry (West Edge)"
```

### 8.3 Tactical-scale map fragment (YAML)

A fragment showing Panzer Blitz-style tactical features with elevation
and denser terrain:

```yaml
hexmap: "1.0"

metadata:
  id: tactical-demo
  title: "Tactical Demo - Hill 231"
  scale:
    meters_per_hex: 250

grid:
  orientation: flat-top
  columns: 10
  rows: 8
  offset: odd-q

terrain:
  clear:     { name: "Clear" }
  woods:     { name: "Woods" }
  town:      { name: "Town" }
  rough:     { name: "Rough" }

edge_types:
  slope:     { name: "Slope" }
  stream:    { name: "Stream" }
  wall:      { name: "Stone Wall" }

path_types:
  road:      { name: "Road" }

defaults:
  terrain: clear
  elevation: 0

hexes:
  "0303": { terrain: woods, elevation: 1 }
  "0304": { terrain: woods, elevation: 1 }
  "0403": { terrain: rough, elevation: 2, label: "Hill 231" }
  "0404": { terrain: rough, elevation: 1 }
  "0504": { terrain: town, label: "Bergdorf" }

edges:
  # Slope hexsides around the hill
  - { hex: "0403", side: N,  type: slope }
  - { hex: "0403", side: NE, type: slope }
  - { hex: "0403", side: SE, type: slope }
  - { hex: "0403", side: S,  type: slope }
  - { hex: "0403", side: SW, type: slope }
  - { hex: "0403", side: NW, type: slope }

  # Stream south of town
  - { hex: "0505", side: SW, type: stream }
  - { hex: "0505", side: S,  type: stream }
  - { hex: "0605", side: SW, type: stream }

  # Stone walls around town
  - { hex: "0504", side: NW, type: wall }
  - { hex: "0504", side: NE, type: wall }

paths:
  - id: main-road
    type: road
    geometry: hexes
    waypoints: ["0104", "0204", "0304", "0404", "0504", "0604"]
```

---

## 9. JSON Schema

The normative JSON Schema for the HexMap format is maintained as a separate
file: `hexmap.schema.json`. A summary of the schema structure:

```
HexMapDocument
├── hexmap: string (enum: "1.0")
├── metadata: MetadataObject
├── grid: GridObject (required)
│   ├── orientation: enum [flat-top, pointy-top]
│   ├── shape: enum [rectangle, irregular]
│   ├── columns, rows: integer
│   ├── offset: enum [odd-q, even-q, odd-r, even-r]
│   ├── boundary: array of strings
│   └── coordinates: CoordinatesObject
├── terrain: map<string, TerrainType>
├── edge_types: map<string, FeatureType>
├── vertex_types: map<string, FeatureType>
├── path_types: map<string, FeatureType>
├── defaults: DefaultsObject
├── hexes: map<string, HexObject>
├── edges: array of EdgeAnnotation
├── vertices: array of VertexAnnotation
├── paths: array of PathObject
├── regions: map<string, RegionObject>
└── extensions: object
```

The full JSON Schema is defined in a companion document.

---

## 10. Test Cases

The following real wargame maps are identified as test cases for format
validation. Each exercises different aspects of the format:

### 10.1 Battle for Moscow (Frank Chadwick / GDW, 1986)

**Exercises:** Basic operational map, XXYY coordinates, terrain (clear,
forest, swamp, city, major city), rivers on edges, roads and railroads
as paths, fortification regions, victory hexes.

**Scale:** 16 km/hex, 22x15 grid, flat-top.

**Complexity:** Low. Ideal first complete encoding.

### 10.2 Panzer Blitz / Panzer Leader (Avalon Hill, 1970/1974)

**Exercises:** Tactical scale, elevation levels (0-2), slope hexsides,
woods/town/rough terrain, roads, streams on edges. Geomorphic map
boards (multiple boards arranged to form different scenarios).

**Scale:** 250m/hex, 4 boards of ~16x10 each, flat-top.

**Complexity:** Medium. Tests elevation and slope edge features.

### 10.3 Advanced Squad Leader boards (MMP)

**Exercises:** Maximum terrain complexity. Multi-story buildings (stone
vs wood), orchards, grain fields, brush, gullies, bridges, fords,
walls, hedges, bocage, railroad embankments. Elevation 0-3+. Line of
sight rules that depend on terrain height and type.

**Scale:** 40m/hex, various board sizes, pointy-top (unusual).

**Complexity:** High. Stress test for terrain vocabulary and edge types.

### 10.4 The Russian Campaign (Jedko/AH, 1974)

**Exercises:** Large operational map, multiple terrain types, weather
zones, sea hexes, straits, Axis/Allied controlled areas, complex rail
network, major river (Dnepr) as connected edge path.

**Scale:** ~50 km/hex, large map (~34x22), flat-top.

**Complexity:** Medium-high. Tests large maps and long river paths.

### 10.5 Drive on Metz (SPI, 1980)

**Exercises:** Mid-complexity operational map, fortification hexes,
river crossings, bridge hexes, road network, urban terrain.

**Scale:** ~2 km/hex.

**Complexity:** Medium.

### 10.6 Hold the Line (Worthington, 2008)

**Exercises:** AWI-era map, simpler terrain vocabulary, elevation
(hills), woods, towns, stone walls on edges, river/creek crossings.
Geomorphic boards.

**Scale:** Abstract/tactical.

**Complexity:** Low-medium. Good test of edge features (walls).

### 10.7 Synthetic / procedural test maps

**Exercises:** Programmatic generation. A 5x5 minimal map for unit
testing. A large 100x100 map for performance testing. Maps with
irregular boundaries. Maps with every feature type.

---

## 11. Security Considerations

HexMap documents are data files with no executable content. Parsers
SHOULD NOT evaluate any string field as code. Standard JSON/YAML parsing
security considerations apply: parsers SHOULD reject excessively large
documents, deeply nested structures, and (for YAML) MUST disable
arbitrary object instantiation (i.e., use safe loading).

File paths and URLs in `metadata.source` are informational and MUST NOT
be automatically fetched or executed.

---

## 12. References

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

### Edge types

| Identifier | Name | Typical games |
|------------|------|---------------|
| `river` | River | Most |
| `major_river` | Major / Wide River | Operational+ |
| `stream` | Stream / Creek | Tactical |
| `cliff` | Cliff / Escarpment | Many |
| `slope` | Slope / Elevation Change | Tactical |
| `wall` | Wall (stone, etc.) | Tactical |
| `hedge` | Hedge | Tactical |
| `bocage` | Bocage (edge) | Normandy |
| `impassable` | Impassable Hexside | Various |

### Path types

| Identifier | Name | Typical games |
|------------|------|---------------|
| `road` | Road (primary) | Most |
| `secondary_road` | Secondary Road / Track | Many |
| `trail` | Trail | Tactical |
| `railroad` | Railroad | Operational+ |
| `river` | River (as path) | Most |

---

## Appendix B: Open Questions

Issues to resolve in future revisions:

1. **Hex range notation.** For large regions, listing every hex coordinate
   is verbose. Should the format support range expressions like
   `"0301..0305"` (column 03, rows 01-05) or rectangle fills?

2. **Multi-board maps.** Geomorphic systems (Panzer Blitz, ASL) use
   multiple interchangeable map boards. Should the format support
   board references and composition?

3. **Partial hexes.** Real maps have partial hexes at boundaries. Should
   these be explicitly marked?

4. **Road junctions within hexes.** Some roads fork inside a hex
   (entering via one edge, exiting via two). The current path model
   doesn't cleanly capture this. Solutions: allow branching paths,
   or decompose into multiple paths sharing a waypoint.

5. **Terrain stacking.** Can a hex have multiple terrain types? (e.g.,
   forest + hill, or road passing through a town). Current model: a
   hex has one `terrain` type plus `elevation` plus `tags`. Should
   terrain be an array?

6. **Geographic projection.** When a hex map represents real geography,
   how is the mapping from hex coordinates to lat/lng defined?
   A `projection` field in `grid` could carry this.

7. **Compact notation for edges.** Long rivers require many edge entries.
   The `paths` mechanism with `geometry: "edges"` helps, but is still
   verbose. Consider a compact edge-path notation.
