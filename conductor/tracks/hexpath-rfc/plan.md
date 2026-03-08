# HexPath RFC Implementation Plan

## Objective
Implement a fully compliant HexPath DSL parser and resolver in `core/src/hexpath/hex-path.ts` and `core/src/hexpath/types.ts` along with exhaustive testing.

## Task Breakdown

### 1. Types and Interfaces
- [ ] Refactor `HexPathResult` to correctly reflect Hex, Edge, or Vertex geometry collections (removing the outdated "flat list with next/prev links" since it should be an ordered collection based on the operators used).
- [ ] Define internal state types for parsing (e.g. `Cursor`, `ParseMode`).

### 2. HexPath Parser Enhancements
- [ ] **Type Inference:** Add strict checking for the first absolute atom. If the atom is a Hex (e.g. `0101`), Edge (`0101/N`), or Vertex (`0101.N`), lock the parser type. Prevent mixing.
- [ ] **Modal Switches:** Implement `+` (Include) and `-` (Exclude) operators. Keep track of current mode in the parser state.
- [ ] **Floating Anchors:** Add a queue for relative steps that apply retroactively when the first absolute atom is parsed.

### 3. HexPath Connectivity and Operators
- [ ] **Space (` `) - Shortest Path:** Ensure path connection between the last cursor and the next atom is geometrically shortest, respecting any current nudge.
- [ ] **Comma (`,`) - Jump:** Implement segment breaking (the previous behavior is close but requires ensuring it works with the new collection types).
- [ ] **Nudges (`>[dir]`):** Implement parsing of nudges (cardinal and integer hours) and apply directional biases to shortest path tie-breaking and line-drawing. Implement implicit nudges towards equal coordinates.
- [ ] **Semicolon (`;`) - Close:** Draw shortest path back to the start of the current segment.
- [ ] **Exclamation (`!`) - Close & Fill:** Close the path and compute interior items. Implement `fill` logic for Hexes, Edges, and Vertices.

### 4. Grammar Support
- [ ] **Hex Notation:** `0101`, `XXYY`, `A1`.
- [ ] **Edge Notation:** `hex/direction` (e.g. `/N`, `/NE`), `hex@hour`.
- [ ] **Vertex Notation:** `hex.direction` (e.g. `.N`, `.NE`), `hex@hour`.
- [ ] **References:** `@all`, `@regionId`.

### 5. Testing
- [ ] Expand `hex-path.test.ts` to cover:
    - Mixed type validation errors.
    - Floating anchors resolving correctly.
    - Nudge directional biases.
    - Additive/subtractive modes.
    - Interior filling for each geometry type.
    - Notation formats (Edge/Vertex/Hex/Regions).

## Execution Strategy
I will execute these tasks sequentially, using test-driven development where appropriate.
