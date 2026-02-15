## Geometry Expressions

This section defines the compact expression language used to generate,
combine, and transform collections of map geometry.

### Overview

The `features` list (Section 4.7) allows defining map content by targeting
specific geometry. While explicit lists of coordinates are sufficient for
machine generation, human authoring and complex map logic benefit from a
richer expression language.

Every geometry expression resolves to a **Geometry Collection**:
a set of unique hexes, edges, or vertices.

### Geometry Selectors

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

### Expression Syntax

Expressions are used within selectors to generate or transform collections.

**1. Literals and References**

*   **Literals**: `"0101"` (Hex), `"0101/N"` (Edge), `"0101.N"` (Vertex).
*   **References**: `"@feature-id"` resolves to the geometry collection
    defined by the referenced feature.

**2. Generators**

**`range`** (Hexes): Selects a rectangular span of coordinates.

```yaml
{ range: ["0101", "0505"] }
```

**`path`** (Polymorphic): Selects the shortest path between points.
Returns Hexes, Edges, or Vertices depending on the root selector.

```yaml
{ path: ["start", "end"], nudge: "N", loop: true }
```

**3. Topological Operators**

Operators transform a collection of one type into another or filter it.

| Operator | Input -> Output | Description |
|----------|-----------------|-------------|
| `boundary` | Hex -> Edge | Edges separating the set from the outside. |
| `inside` | Hex -> Edge | Edges strictly interior to the set. |
| `fill` | EdgePath -> Hex | Hexes enclosed by a closed edge loop. |
| `touching` | Any -> Any | Items adjacent to any item in the target. |

### One-Sided Edges

When applying attributes to an `EdgeCollection`, the `side` modifier
controls which side of the edge receives the property.

| Value | Meaning |
|-------|---------|
| `both` (default) | The edge itself (e.g., river). |
| `in` | The side facing the source hexes (e.g., cliff top). |
| `out` | The side facing away from source (e.g., cliff base). |
| `left`/`right` | Relative to path direction. |

This conceptually separates the *geometry* (the edge) from the *semantics*
(the active side).

```yaml
features:
  - edges: { boundary: "@fortress" }
    terrain: wall
    side: out
```
