## Geometry Expressions (HexPath DSL)

HexPath is a domain-specific language (DSL) for concisely defining collections
of hexes, edges, or vertices. It is the primary mechanism for specifying
geometry in the HexMap format.

### Atoms (Coordinates & References)

*   **Hex**: `[column][row]` (e.g., `0105`, `A12`).
*   **Edge**: `[hex]/[dir]` (e.g., `0105/N`).
*   **Vertex**: `[hex].[vdir]` (e.g., `0105.NE`).
*   **Reference**: `@[id]` (e.g., `@moscow`). Refers to the geometry collection
    defined by a previously named feature or region.
*   **Escaped Coords**: `'[string]'`. Use single quotes to escape coordinates
    that start with digits or conflict with direction keys (e.g., `'1234'`, `'1n'`).

### Relative Steps

Steps move the "cursor" from the current position.
*   **Syntax**: `[count][dir]`
*   **Examples**: `3n` (3 steps North), `1sw` (1 step South-West), `ne` (shorthand for `1ne`).
*   **Start-of-Path Logic**: If a path starts with a relative step followed by
    an absolute atom (e.g., `1n 1701`), the first item in the collection is the
    location calculated relative to that atom. This is useful for describing
    off-board entry points.

### Connectivity & Operators

*   **Space (` `)**: **Shortest Path.** Connects the previous cursor to the next
    atom using the geometric shortest path. If multiple shortest paths exist,
    the implementation uses a standard tie-breaking rule (nudge).
*   **Nudge (`>[dir]`)**: Breaks ties in shortest paths or forces a specific
    directional bias.
    *   Example: `a1 >ne c3`. Prefer the shortest path that "leans" toward the
        North-East.
*   **Comma (`,`)**: **Jump.** Ends the current segment. The next atom adds to
    the collection without a connecting path from the previous cursor.
*   **Semicolon (`;`)**: **Close.** Connects the current cursor back to the
    start of the current segment and ends the segment.
*   **Exclamation (`!`)**: **Close & Fill.** Closes the segment (like `;`) and
    then adds all items contained within the resulting boundary to the collection.
*   **Plus (`+`)**: **Include Mode.** (Default) Switches the cursor to add
    subsequent atoms and paths to the collection.
*   **Minus (`-`)**: **Exclude Mode.** Switches the cursor to subtract
    subsequent atoms and paths from the collection.

The `+` and `-` operators are **modal switches**. They affect all following
segments until the mode is changed again.

### Type Inference

The collection type (Hex, Edge, or Vertex) is inferred from the first absolute
atom encountered in the expression. All subsequent atoms and paths in that
expression must resolve to the same type.

### Example: A Forested Ridge with a Clearing
```yaml
features:
  - hexes: "0105 1005 - 0505"   # A path of forest, minus one hex
    terrain: forest
```
