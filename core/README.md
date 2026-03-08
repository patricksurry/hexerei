# @hexmap/core

The core logic and reference implementation for the [HexMap format](https://github.com/psurry/hexagons/blob/main/rfc/master.md).

## Key Concepts

Based on the HexMap RFC, this package provides tools for:

- **Hex Math**: Canonical cube coordinates, geometric algorithms (distance, neighbors, line-of-sight), and stagger-aware coordinate mapping (Odd-Q/Even-Q).
- **Topology**: A mesh-based representation of **Hexes**, **Edges**, and **Vertices**.
- **HexPath DSL**: A powerful domain-specific language for selecting and defining collections of map geometry using paths, fills, and set operations.
- **Document Processing**: Robust parsing and manipulation of `.hexmap.yaml` documents.

## Terminology

We strictly adhere to the RFC terminology:
- **Hex**: The primary area/cell.
- **Edge**: The boundary between two hexes.
- **Vertex**: The junction where hexes meet.
- **Layout**: The grid configuration (orientation, stagger, labeling).

## Usage

### Loading and Inspecting a Map

The `HexMapLoader` is the primary entry point for turning a YAML document into a live, topological mesh.

```typescript
import { HexMapLoader } from '@hexmap/core';

const source = `... yaml source ...`;
const mesh = HexMapLoader.load(source);

// Access hexes and their attributes
const hexes = Array.from(mesh.getAllHexes());
const myHex = mesh.getHex("0,0,0");
console.log(myHex.terrain); // e.g. "clear forest" (layered)
```

### HexPath DSL

The `HexPath` class resolves DSL strings into specific geometry identifiers. It is strictly typed based on the first atom encountered.

```typescript
import { HexPath } from '@hexmap/core';

const hp = new HexPath(mesh);

// Hex collection: path from 0101 to 0105
const result = hp.resolve("0101 0105"); 

// Closed loop with fill:
const region = hp.resolve("0101 0501 0505 0105 !");

// Set operations: all clear hexes minus a specific ridge
const clearance = hp.resolve("@all - 0505 0510");
```

### Editing Documents

`HexMapDocument` provides a wrapper around the YAML AST, allowing for programmatic updates while preserving comments and structure.

```typescript
import { HexMapDocument } from '@hexmap/core';

const doc = new HexMapDocument(source);
doc.setMetadata("title", "Updated Title");
const updatedYaml = doc.toString();
```

## RFC Compliance

Current compliance status:
- [x] **Section 4: Data Model** - Full support for Layout and Features.
- [x] **Section 5: Addressing** - Support for XXYY, Alpha1, and Cube formats.
- [x] **Section 6: HexPath DSL** - Full support for operators (`, ; !`), nudges, and modal switches (`+ -`).
- [x] **Section 7: Geometry Reference** - Canonical Edge and Vertex identification.
