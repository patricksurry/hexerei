# HexPath DSL Specification

HexPath is a domain-specific language (DSL) for concisely defining collections of hexes, edges, or vertices. It is designed for manual entry and intent-based mapping.

## 1. Atoms (Coordinates & References)

*   **Hex**: `[column][row]` (e.g., `a13`).
*   **Edge**: `[hex]/[dir]` (e.g., `a13/n`).
*   **Vertex**: `[hex].[vdir]` (e.g., `a13.ne`).
*   **Reference**: `@[id]` (e.g., `@moscow`). Refers to the first element of a previously defined collection.
*   **Escaped Coords**: `'[string]'`. Use single quotes to escape coordinates that start with digits or conflict with direction keys (e.g., `'1234'`, `'1n'`).

## 2. Relative Steps

Steps move the "cursor" from the current position.
*   **Syntax**: `[count][dir]`
*   **Examples**: `3n` (3 steps North), `1sw` (1 step South-West), `ne` (shorthand for `1ne`).
*   **Start-of-Path Logic**: If a path starts with a relative step followed by an absolute atom (e.g., `1n a13`), the first item in the collection is the location calculated relative to that atom. This allows for clean description of offboard entry points.

## 3. Connectivity & Operators

*   **Space (` `)**: **Shortest Path.** Connects the previous cursor to the next atom using the geometric shortest path.
*   **Nudge (`>[dir]`)**: Breaks ties in shortest paths.
    *   Example: `a1 >ne c3`. Prefer the shortest path that "leans" toward the North-East.
*   **Comma (`,`)**: **Jump.** Ends the current segment. The next atom adds to the collection without a connecting path from the previous cursor.
*   **Semicolon (`;`)**: **Close.** Connects the current cursor back to the start of the current segment and ends the segment.
*   **Exclamation (`!`)**: **Close & Fill.** Closes the segment (like `;`) and then adds all items contained within the resulting boundary to the collection.

## 4. Direction Keys

*   **Edges/Steps**: `n`, `ne`, `se`, `s`, `sw`, `nw`.
*   **Vertices**: `n`, `ne`, `se`, `s`, `sw`, `nw`.

## 5. Structural Rules

*   **Type Inference**: The collection type (Hex, Edge, or Vertex) is inferred from the first absolute atom encountered.
*   **Order Preservation**: The resulting collection is an ordered list of IDs, preserving the sequence defined by the path.
*   **Geometric Logic**: Connectivity logic is purely geometric and ignores terrain or game-specific rules.

## 6. Examples

### Mountain Ridge (Hexes)
`"a1 3ne 2se, d10 4s"`

### Perimeter (Edges)
`"b5/n 2ne 2se 2s 2sw 2nw ;"`

### Lake (Filled Hexes)
`"b10 2n 2ne 2s 2sw !"`

### Ambiguous Path with Nudge
`"a1 >ne c3"`
