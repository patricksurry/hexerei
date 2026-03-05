## Test Cases

The following real wargame maps are identified as test cases for format
validation. Each exercises different aspects of the format. Reference
encodings will be maintained in the `tests/` directory.

**Acceptance criteria** for each test case: the reference HexMap file
must (a) validate against the JSON Schema, (b) round-trip through a
JSON<->YAML conversion with semantic equivalence, and (c) produce the
correct graph structure (hex count, edge adjacencies, path connectivity).

### Battle for Moscow (Frank Chadwick / GDW, 1986)

**Exercises:** Basic operational map, XXYY coordinates, terrain (clear,
forest, swamp, city, major city), rivers on edges, roads and railroads
as paths, fortification regions, victory hexes.

**Scale:** 16 km/hex, 14x11 grid, flat-top.

**Complexity:** Low. Complete implementation.

### Panzer Blitz / Panzer Leader (Avalon Hill, 1970/1974)

**Exercises:** Tactical scale, elevation levels (0-2), slope hexsides
(directed edges), woods/town/rough terrain, roads, streams on edges.
Geomorphic map boards (multiple boards per scenario).

**Scale:** 250m/hex, 4 boards of ~16x10 each, flat-top.

**Complexity:** Medium. Tests elevation, directed edges.
Multi-board composition deferred to v2 (see Appendix D, Q1).

### Advanced Squad Leader boards (MMP)

**Exercises:** Maximum terrain complexity. Multi-story buildings (stone
vs wood), orchards, grain fields, brush, gullies, bridges, fords,
walls, hedges, bocage, railroad embankments. Elevation 0-3+.

**Scale:** 40m/hex, various board sizes, pointy-top (unusual).

**Complexity:** High. Stress test for terrain vocabulary and edge types.

### The Russian Campaign (Jedko/AH, 1974)

**Exercises:** Large operational map, weather zones, major rivers,
complex rail network.

**Scale:** ~55 km/hex, 43x32 grid, flat-top, stagger: high.

**Complexity:** Medium-high. Complete implementation.
*Note: Uses numeric identifiers internally due to non-standard
A-QQ column labeling.*

### Drive on Metz (SPI, 1980)

**Exercises:** Mid-complexity operational map, fortification hexes,
river crossings, bridge vertices, road network, urban terrain.

**Scale:** ~2 km/hex.

**Complexity:** Medium.

### Hold the Line (Worthington, 2008)

**Exercises:** AWI-era map, simpler terrain vocabulary, elevation
(hills), woods, towns, stone walls on edges. Geomorphic boards.

**Scale:** Abstract/tactical.

**Complexity:** Low-medium. Good test of edge features (walls).

### Synthetic / procedural test maps

**Exercises:** Programmatic generation. A 5x5 minimal map for unit
testing. A large 100x100 map for performance. Irregular boundaries.
Maps with every feature type.
