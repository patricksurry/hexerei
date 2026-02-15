## JSON Schema

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
