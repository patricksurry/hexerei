# HexMap Renderer: Editor Support & Build

- **Track ID:** `hexmap-renderer-editor-support`
- **Goal:** Update `@hexmap/renderer` with reactivity, highlights, and a proper library build.
- **Status:** `completed`

## Navigation
- [Specification](./spec.md)
- [Implementation Plan](./plan.md)

## Success Criteria
- [x] `HexRenderer.update(mesh: MeshMap)` implemented for efficient re-rendering.
- [x] `HexRenderer.highlight(hexIds: string[])` implemented with a dedicated SVG group.
- [x] Library build script (`npm run build`) added and producing a valid ESM bundle.
- [x] Unit tests for reactivity and highlights added and passing.
