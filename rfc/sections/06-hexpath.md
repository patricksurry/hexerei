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

PDS: should define relative atoms before we talk about anchors?

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

*   **Space (` `)**: **Shortest Path.** Connects the previous cursor to the next
    atom by drawing a notional straight line between their centers (analogous
    to line-of-sight in wargame terms) and selecting the nearest hex, edge, or
    vertex to that line at each step. When two candidates are equidistant, the
    path bias (see Section 7) resolves the tie deterministically.

*   **Flip operator (`~`)**: A prefix on a destination coordinate that inverts
    the path bias for the arriving segment. The default bias is derived from
    the grid's orientation and segment endpoints (see Section 7). `~` only
    affects the single segment arriving at the prefixed coordinate — it is not
    a modal switch.
    *   Example: `0101 ~0303` arrives with flipped bias; `0101 0303` uses default.
    *   `~` on the first coordinate in an expression has no effect (no incoming segment).
    *   `~` on a non-ambiguous path or singleton has no effect (no tie to resolve).

*   **Comma (`,`)**: **Jump.** Ends the current segment. The next atom adds to
    the collection without a connecting path from the previous cursor.

*   **Semicolon (`;`)**: **Close.** Connects the current cursor back to the
    start of the current segment and ends the segment.
    The closing segment uses the default path bias unless `~` is prefixed
    directly before the `;` (written `~;`), which inverts the bias for that
    closing segment only.

*   **Exclamation (`!`)**: **Close & Fill.** Closes the segment (like `;`) and
    then adds all items contained within the resulting boundary to the collection.
    The fill operation uses the same geometry type as the expression:
    *   A hex path fills with all hexes within the closed boundary.
    *   An edge path fills with all interior edges within the boundary.
    *   A vertex path fills with all interior vertices within the boundary.

*   **Plus (`+`)**: **Include Mode.** (Default) Switches the cursor to add
    subsequent atoms and paths to the collection.

*   **Minus (`-`)**: **Exclude Mode.** Switches the cursor to subtract
    subsequent atoms and paths from the collection.

The `+` and `-` operators are **modal switches**. They affect all following
segments until the mode is changed again.

### Relative Steps and Direction Validation

A relative step moves the cursor by one or more hexes in a compass direction:

*   Single step: `ne`, `sw`, `n` (direction only, count = 1)
*   Counted step: `3ne`, `2s` (count + direction)
*   Disambiguated step: `3*s` (count + `*` + direction)

The `*` form is used when a count+direction could be confused with a
coordinate label (e.g., `3s` might look like an alpha coordinate).

**Direction validity depends on orientation:**

PDS: clarify - compass directions are case insensitive.  also user labels?

*   **Flat-top** (`flat-down`, `flat-up`): Valid directions are `n`, `ne`,
    `se`, `s`, `sw`, `nw`. Using `e` or `w` is a **parse error** — flat-top
    hexes have no neighbor in the pure east/west direction.

*   **Pointy-top** (`pointy-right`, `pointy-left`): Valid directions are
    `e`, `ne`, `nw`, `w`, `sw`, `se`. Using `n` or `s` is a **parse error** —
    pointy-top hexes have no neighbor in the pure north/south direction.

Compound directions (`ne`, `se`, `sw`, `nw`) are always valid for both
orientations but map to different neighbor vectors depending on orientation.

### Example: A Forested Ridge with a Clearing
```yaml
features:
  - at: "0105 1005 - 0505"   # A path of forest hexes, minus one hex
    terrain: forest
```
