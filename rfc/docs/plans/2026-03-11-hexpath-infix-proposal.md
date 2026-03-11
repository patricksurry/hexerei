# HexPath Infix Connectors and Keyword Modals Proposal

## Objective

Evolve the HexPath DSL to be more intuitive, readable, and less prone to
"invisible whitespace" errors. The current grammar uses whitespace to imply
connection (shortest-path routing) and `,` for jumps. This proposal inverts
that default: an explicit `-` (or `~`) implies connection, while whitespace
(or `,`) implies a jump.

This change also frees `-` and `+` from their current roles as modal
include/exclude switches, replacing them with the keywords `include` and
`exclude`.

## Revised Grammar Summary

| Element | Syntax | Description |
| :--- | :--- | :--- |
| **Atom** | `a3`, `0105`, `0101/N`, `0101.NE` | Absolute coordinate (hex, edge, or vertex). |
| **Relative Step** | `3n`, `2se`, `3*s` | Relative move from cursor. Resolved like any atom. |
| **Standard Connection** | `a - b` | Shortest path from cursor to `b` using default bias. |
| **Flipped Connection** | `a ~ b` | Shortest path from cursor to `b` using flipped bias. |
| **Jump (Separator)** | `a b` or `a, b` | Ends current segment; `b` starts a new segment. |
| **Include Mode** | `include` | Modal switch: add subsequent items (default). Implies segment boundary. |
| **Exclude Mode** | `exclude` | Modal switch: subtract subsequent items. Implies segment boundary. |
| **Closure** | `close` | Connect back to segment start (default bias). |
| **Flipped Closure** | `~close` | Connect back to segment start (flipped bias). |
| **Fill** | `fill` | Close segment and fill interior (default bias). |
| **Flipped Fill** | `~fill` | Close segment and fill interior (flipped bias). |

### Whitespace and Connectors

Connectors (`-` and `~`) are infix operators. Whitespace is allowed around
connectors and is ignored in that context. Whitespace *between two atoms
without a connector* acts as a separator (jump).

*   `a1-a5` == `a1 - a5` (connected path)
*   `a1 a5` == `a1, a5` (jump — two separate hexes)
*   `a1 - b3 ~ c3 d4` (path `a1` to `b3`, flipped path to `c3`, then jump to `d4`)

### Label Precedence

When `-` appears inside a token that matches a valid coordinate label (e.g. a
hypothetical `board1-a3`), the label interpretation takes precedence. Authors
can disambiguate by adding spaces: `board1 - a3`.

### Relative Steps

Relative steps (`3n`, `2se`, `3*s`) move the cursor and are resolved to
absolute coordinates like any other atom. Their connectivity is determined by
context — a preceding `-` or `~` connects; otherwise they start a new segment:

*   `a1 - 3n` — connected path from `a1`, 3 steps north
*   `a1 3n` — jump: `a1` and the hex 3 steps north are separate items
*   `a1 - 2ne ~ 3s` — path from `a1` 2 steps NE (default bias), then 3 steps S (flipped bias)

## Formal Evaluation Model

A HexPath resolves to a **Geometry Collection**: an ordered list of
**Segments**, each a contiguous sequence of atoms.

### 1. Segments

*   A segment is built by appending atoms to the current active segment.
*   **Connectors** (`-`, `~`) route from the cursor to the next atom and
    append all intermediate atoms (including the destination) to the segment.
*   **Jumps** (whitespace or `,`) terminate the current segment. The next
    atom starts a new segment.
*   Keywords `include`, `exclude`, `close`, `fill` also terminate the
    current segment (see below).

### 2. Include / Exclude

`include` and `exclude` are modal switches that affect how subsequent atoms
are applied to the collection.

*   **`exclude`** marks all subsequent atoms for subtraction. If an excluded
    atom already exists in the collection, the segment containing it is
    **split** at that point.
*   **`include`** (the default) marks subsequent atoms for addition.
*   Both keywords imply a segment boundary — the current segment is closed
    before the mode changes.

**Splitting example:**

```
a1 - a5 exclude a3
```

Resolves `a1-a5` → `[a1, a2, a3, a4, a5]`, then removes `a3`, splitting
into two segments: `[a1, a2]` and `[a4, a5]`.

**Multi-exclude example:**

```
a1 - a5 exclude a2, a4
```

Removes both `a2` and `a4`, producing three segments:
`[a1]`, `[a3]`, `[a5]`.

**Re-include example:**

```
a1 - a5 exclude a3 include b1 - b3
```

Builds path `a1-a5`, removes `a3` (splitting), then switches back to
include mode and adds path `b1-b3` as a new segment.

### 3. Close and Fill

*   **`close`** connects the cursor back to the current segment's anchor
    (its first atom) and ends the segment. `~close` uses flipped bias for
    the closing path.
*   **`fill`** does the same as `close`, then adds all interior atoms of
    the active geometry type within the closed boundary (typically in
    scanline order). `~fill` uses flipped bias for the closing path.

### 4. Order Preservation

The resolution process preserves the order of atoms as defined by path
segments, minus any atoms removed by `exclude`.

---

## Required Updates

### 1. Specification

**File:** `rfc/sections/06-hexpath.md`
*   Rewrite the "Connectivity and Operators" section to document infix
    connectors, the new separator semantics, and the `include`/`exclude`
    keywords.
*   Insert the Formal Evaluation Model.
*   Update all examples to use the new syntax.

### 2. HexPath Parser

**File:** `core/src/hexpath/hex-path.ts`
*   **Tokenizer**:
    *   Treat `-` and `~` as discrete infix connector tokens.
    *   Handle keywords: `include`, `exclude`, `fill`, `close`.
    *   Handle `~close` and `~fill` as single tokens.
    *   Treat `,` and whitespace (between atoms) as segment separators.
    *   Labels containing `-` take precedence over the connector
        interpretation (longest-match rule).
*   **Parser Logic**:
    *   Maintain a `pendingConnector` state (`None`, `Standard`, `Flipped`).
    *   When an atom is encountered:
        *   If `pendingConnector` is set, route from cursor to the new atom
            using the specified bias. Append the path to the current segment.
        *   If `pendingConnector` is `None` and a current segment exists,
            this is a jump — close the current segment and start a new one.
    *   When `close` or `fill` is encountered:
        *   Route back to the segment anchor using the bias from the token
            (`~fill`/`~close` → flipped).
    *   When `include` or `exclude` is encountered:
        *   Close the current segment, switch modal state.
    *   Implement segment-splitting logic for `exclude` to update
        `pathOrder` correctly when removing atoms from existing segments.

### 3. HexPath Tests

**File:** `core/src/hexpath/hex-path.test.ts`
*   Migrate all test cases to the new syntax.
*   Add specific tests for:
    *   `~close`, `~fill`
    *   `include` / `exclude` keywords and segment splitting
    *   Multi-exclude splitting
    *   Whitespace flexibility: `a1-a2` vs `a1 - a2`
    *   Relative steps with connectors: `a1 - 3n`, `a1 3n`
    *   Label-vs-connector precedence

### 4. Existing Maps and Examples

**Files:** `maps/definitions/*.yaml`, `editor/public/maps/*.yaml`, `rfc/examples/snippets/*.yaml`

Bulk migrate `at:` strings. Conversion patterns:

| Old syntax | New syntax |
| :--- | :--- |
| `"0101 0105"` (path) | `"0101 - 0105"` |
| `"0101 0401 0411 0111 !"` | `"0101 - 0401 - 0411 - 0111 fill"` |
| `"1420 1820 1823 1423 ! - 1621 1622"` | `"1420 - 1820 - 1823 - 1423 fill exclude 1621, 1622"` |
| `"0105 1005 - 0505"` (path minus hex) | `"0105 - 1005 exclude 0505"` |

### 5. Editor / UI Logic

**Files:** `editor/src/model/hex-path-preview.ts`
*   Update serialization logic to emit `-` for connected path segments.
*   Update any UI that displays or edits HexPath expressions.
