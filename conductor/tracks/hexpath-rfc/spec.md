# HexPath RFC Implementation Specification

This specification aligns the `HexPath` DSL resolver in `@hexmap/core` with Section 6 of the HexMap format RFC.

## Scope

The primary output of the `HexPath` resolver will be an object containing the inferred geometry type and a set of resulting identifiers.

```typescript
export type GeometryType = 'hex' | 'edge' | 'vertex';

export interface HexPathResult {
  type: GeometryType;
  items: Set<string>; // Or string array
}
```

### 1. Lexical Analysis
The parser must correctly tokenize a HexPath string. 
Tokens include:
- Absolute Atoms: `0101`, `A1`, `0101/N`, `0101@12`
- Relative Steps: `1n`, `2se`
- Operators: `,` `;` `!` `+` `-` ` ` (implicit space for shortest path)
- Nudges: `>N`, `>2`

### 2. State Machine
The parser maintains state during resolution:
- **`currentType`**: `Hex | Edge | Vertex | null`
- **`mode`**: `Include (+)` or `Exclude (-)`
- **`cursor`**: The current physical location (for paths).
- **`segmentStart`**: The anchor of the current segment (used for `;` and `!`).
- **`floatingSteps`**: Queue of steps to apply once an absolute anchor is found.
- **`nudge`**: The current directional bias.

### 3. Execution Rules
1. **Atoms**: An absolute atom sets the `cursor` and `segmentStart`. If `floatingSteps` exist, they are resolved backwards to determine the starting position of the line. The evaluated atoms are added/removed from the result set based on `mode`.
2. **Shortest Path**: When consecutive atoms or steps are parsed, the parser generates a line from `cursor` to the new atom using `Hex.hexLine()`. The line's inclusion is modified by `mode`.
3. **Nudges**: Nudges affect line generation tie-breaking.
4. **Jump (`,`)**: Clears the `segmentStart` and `cursor`. The next atom will begin a new segment.
5. **Close (`;`)**: Generates a shortest path from `cursor` back to `segmentStart`.
6. **Fill (`!`)**: Generates a close path, then identifies all interior items of `currentType` bounded by the segment, and adds/removes them according to `mode`.

### 4. Geometry Conversions
- `core/src/math/hex-math.ts` will provide robust parsing for coordinates (e.g. converting `0101` and `A1` to Cube coordinates based on a provided layout config).
- Edge references (`/N`, `@12`) and Vertex references (`.NE`, `@1`) will be correctly parsed into their canonical `Boundary` or `Junction` IDs.