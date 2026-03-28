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
    This is particularly important for off-board path entry (e.g., a river 
    entering at a specific hexside), where absolute off-board coordinates are 
    unnatural.

*   **Multiple Anchors**: If multiple absolute atoms appear, each one resets the
    cursor to that absolute position. All atoms MUST still resolve to the same
    geometry type (Hex, Edge, or Vertex).

### Connectivity and Operators

Connectors (`-` and `~`) are infix operators. Whitespace is allowed around connectors and is ignored in that context. Whitespace *between two atoms without a connector* acts as a separator (jump).

*   **Standard Connection (`-`)**: Shortest path from the previous cursor to the next atom using the default path bias.
*   **Flipped Connection (`~`)**: Shortest path from the previous cursor to the next atom using the flipped path bias.
*   **Jump (Whitespace or `,`)**: Ends the current segment. The next atom starts a new segment without a connecting path.
*   **Include Mode (`include`)**: Modal switch. Adds subsequent items to the collection (default). Implies a segment boundary.
*   **Exclude Mode (`exclude`)**: Modal switch. Subtracts subsequent items from the collection. Implies a segment boundary.
*   **Closure (`close` / `~close`)**: Connects the cursor back to the start of the current segment and ends the segment. `~close` uses the flipped path bias.
*   **Fill (`fill` / `~fill`)**: Closes the segment and adds all items contained within the resulting boundary to the collection using the **even-odd rule**. `~fill` uses the flipped path bias.

**Label Precedence:**
When `-` appears inside a token that matches a valid coordinate label (e.g., `board1-a3`), the label interpretation takes precedence. Authors can disambiguate by adding spaces: `board1 - a3`.

### Formal Evaluation Model

A HexPath resolves to a **Geometry Collection**: an ordered list of **Segments**, each a contiguous sequence of atoms.

#### Segments

*   A segment is built by appending atoms to the current active segment.
*   **Connectors** (`-`, `~`) route from the cursor to the next atom and append all intermediate atoms (including the destination) to the segment.
*   **Jumps** (whitespace or `,`) terminate the current segment. The next atom starts a new segment.
*   Keywords `include`, `exclude`, `close`, `fill` also terminate the current segment.

#### Include / Exclude

`include` and `exclude` are modal switches that affect how subsequent atoms are applied to the collection.

*   **`exclude`** marks all subsequent atoms for subtraction. If an excluded atom already exists in the collection, the segment containing it is **split** at that point.
*   **`include`** (the default) marks subsequent atoms for addition.
*   Both keywords imply a segment boundary — the current segment is closed before the mode changes.

#### Close and Fill

*   **`close`** connects the cursor back to the current segment's anchor (its first atom) and ends the segment. `~close` uses flipped bias for the closing path.
*   **`fill`** does the same as `close`, then adds all interior atoms of the active geometry type within the closed boundary using the **even-odd rule**. `~fill` uses the flipped path bias for the closing path.

#### Order Preservation

The resolution process preserves the order of atoms as defined by path segments, minus any atoms removed by `exclude`.

### Relative Steps and Direction Validation

A relative step moves the cursor by one or more hexes in a compass direction:

*   Single step: `ne`, `sw`, `n` (direction only, count = 1)
*   Counted step: `3ne`, `2s` (count + direction)
*   Disambiguated step: `3*s` (count + `*` + direction)

The `*` form is used when a count+direction could be confused with a
coordinate label (e.g., `3s` might look like an alpha coordinate).

Relative steps move the cursor and are resolved to absolute coordinates. Their connectivity is determined by context — a preceding `-` or `~` connects; otherwise they start a new segment:

*   `a1 - 3n` — connected path from `a1`, 3 steps north
*   `a1 3n` — jump: `a1` and the hex 3 steps north are separate items

**Direction validity depends on orientation:**

*   **Flat-top** (`flat-down`, `flat-up`): Valid directions are `n`, `ne`, `se`, `s`, `sw`, `nw`. Using `e` or `w` is a **parse error**.
*   **Pointy-top** (`pointy-right`, `pointy-left`): Valid directions are `e`, `ne`, `nw`, `w`, `sw`, `se`. Using `n` or `s` is a **parse error**.

### Example: A Forested Ridge with a Clearing
```yaml
features:
  - at: "0105 - 1005 exclude 0505"   # A path of forest hexes, minus one hex
    terrain: forest
```
