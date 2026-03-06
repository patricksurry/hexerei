# Track Specification: HexMap Renderer: Editor Support & Build

- **Track ID:** `hexmap-renderer-editor-support`

## Objective
Update `@hexmap/renderer` with reactive update capabilities, temporary highlight overlays, and a robust library build system to support the `hexmap-editor`.

## Proposed Changes

### 1. `HexRenderer` Class (`src/index.ts`)
- **`update(mesh: MeshMap): void`**:
  - Re-render grid and labels using the provided `MeshMap` without destroying the SVG.
  - Utilize D3's `.join()` for efficient updates.
- **`highlight(hexIds: string[]): void`**:
  - Add a dedicated `<g id="highlights">` group at a high Z-index (after grid and labels).
  - Draw semi-transparent overlays (e.g., yellow) for the specified hex IDs.
  - Subsequent calls should replace existing highlights.

### 2. Library Build (`package.json`, `vite.config.mts`)
- Configure Vite for **Library Mode**.
- Build an ESM bundle and a UMD/CJS fallback if necessary.
- Externalize `d3` to avoid bundling multiple versions.
- Map `@hexmap/core` as a peer dependency or external reference if it's not being bundled.

### 3. Unit Tests (`src/renderer.test.ts`)
- Add tests to verify:
  - `update()` correctly changes hex colors or positions after a mesh modification.
  - `highlight()` correctly adds and removes SVG elements.

## Dependencies
- `@hexmap/core` (internal)
- `d3` (existing dependency)
- `vite` (existing dev dependency)
