## HexPath DSL

HexPath is a domain-specific language (DSL) for concisely defining collections
of hexes, edges, or vertices. It is the primary mechanism for specifying
geometry in the HexMap format via the `at` key.

### Type Inference and Homogeneity

The collection type (Hex, Edge, or Vertex) is strictly inferred from the first
absolute atom (or reference) encountered in the expression. All subsequent atoms,
steps, and paths in that expression MUST resolve to the same geometry type.

*   `at: "0101 0105"` is a **Hex** collection.
*   `at: "0101/N 0105/N"` is an **Edge** collection.
*   `at: "0101.NE 0105.NE"` is a **Vertex** collection.

Mixed types in a single expression are a validation error. There is no implicit
conversion between types (e.g., using hex coordinates to select edges).

### Atoms (Coordinates & References)

An expression MUST contain at least one absolute atom or a reference. This
atom acts as the "Type Anchor" for the entire expression.

*   **Floating Anchor Resolution**: Relative steps can appear anywhere, including
    before the first absolute atom (e.g., `1n 0101`). If an expression starts with
    relative steps, they are tracked as offsets from a virtual origin until the
    first absolute atom is encountered. At that point, all preceding steps are
    retroactively resolved relative to that anchor's coordinate.
*   **Multiple Anchors**: If multiple absolute atoms appear, each one resets the
    cursor to that absolute position. All atoms MUST still resolve to the same
    geometry type (Hex, Edge, or Vertex).

### Connectivity & Operators

*   **Space (` `)**: **Shortest Path.** Connects the previous cursor to the next
    atom using the geometric shortest path.
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

### Example: A Forested Ridge with a Clearing
```yaml
features:
  - at: "0105 1005 - 0505"   # A path of forest hexes, minus one hex
    terrain: forest
```
