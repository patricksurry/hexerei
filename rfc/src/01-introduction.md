## Introduction

Hex layouts have been used in wargames since 1961 (Avalon Hill's *Gettysburg*
second edition). Despite six decades of use, no standard interchange format
exists for hex map data. Maps are stored in proprietary tool-specific formats
(Worldographer XML, VASSAL modules), as images with no semantic data, or as
ad-hoc CSV/JSON with no schema.

The HexMap format fills this gap. Its design goals are:

1. **Human-readable and hand-editable.** A designer should be able to author
   a map in a text editor without specialized tooling. YAML is the primary 
   authoring format, chosen for its readability and support for comments.

2. **Machine-validatable.** A JSON Schema enables automated validation in
   any language with a JSON Schema library.

3. **Language-neutral.** The format is defined in terms of JSON data types
   and is trivially consumable from Python, JavaScript/TypeScript, and any
   language with a JSON parser.

4. **Game-neutral.** The format describes map *structure* (where terrain is,
   what edges have rivers) but does not prescribe game *mechanics* (movement
   costs, combat modifiers). Terrain types are an extensible vocabulary
   defined per map, not a fixed enum.

5. **Graph-duality aware.** Hex layouts have a natural planar graph structure
   where faces (hexes), edges (hexsides), and vertices each carry game-
   relevant information. Rivers run along edges, roads pass through hex
   centers, bridges sit at vertices. The format treats all three as first-
   class citizens.

### Relationship to GeoJSON

HexMap is not a profile of GeoJSON. While GeoJSON is excellent for geographic
data, it is poorly suited to hex maps: it requires 6-vertex polygons per hex
(verbose), has no concept of adjacency or edges, and its coordinate system
is lat/lng. HexMap uses a purpose-built coordinate system with compact hex
addressing.

Conversion from HexMap to GeoJSON is straightforward and SHOULD be supported
by implementations. A hex map with a defined geographic projection can be
losslessly converted to a GeoJSON feature collection.

Conversion from GeoJSON to HexMap is not generally lossless and requires
heuristics (identifying the hex layout, snapping features to hexes, etc.).
Implementations MAY support this as an import/digitization aid.
