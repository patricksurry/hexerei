# Style and Conventions: HexMap RFC

### Documentation Style:
- **Modular Sections**: Individual RFC sections are kept in the `sections/` directory for easier management and versioning.
- **Example Snippets**: Small, reusable examples are located in `examples/snippets/` and included in the RFC using mmark's `{{...}}` syntax.
- **Full Maps**: Complete map examples are in the `examples/` directory and can be used for testing and validation.
- **PDS Comments**: Inline review comments from the primary author (P.D. Surry) are prefixed with `PDS:` and used to record design decisions and open questions.

### Map Data Conventions (YAML/JSON):
- **Snake Case**: Terrain identifiers and map metadata fields follow `snake_case`.
- **Unique IDs**: Features and map identifiers SHOULD be lowercase with hyphens.
- **Coordinate Labels**: Default to `XXYY` (2-digit column, 2-digit row) but are customizable.
- **HexTop**: Either `flat` (flat edge at 12 o'clock) or `pointy` (vertex at 12 o'clock).
- **Stagger**: Either `low` (default, odd-q/odd-r) or `high`.
