# Required Updates for @hexmap/core and @hexmap/renderer

To support the HexMap Editor, the following modifications are needed in the core and renderer packages.

## @hexmap/core

### 1. types.ts
- Expand `Area` interface to include `terrain: string`, `props: Record<string, any>`, `label?: string`, and `elevation?: number`.
- Update `MeshMap` to return this expanded `Area` type.

### 2. document.ts
- Add `setLayout(key: string, value: any)` method.
- Add `addFeature(feature: any)` method.
- Add `toObject()` or `toJS()` method to get a plain POJO of the document.

### 3. hex-mesh.ts
- Update `HexMesh` to store `Area` objects instead of just IDs.
- Add `updateArea(id: string, attrs: Partial<Area>)` for real-time mesh updates.

## @hexmap/renderer

### 1. Reactivity
- Add an `update(mesh: MeshMap)` method to `HexRenderer` to allow re-rendering without full SVG destruction.

### 2. Highlights
- Add a dedicated `<g id="highlights">` group.
- Add a `highlight(hexIds: string[])` method to draw a temporary overlay (e.g., yellow semi-transparent fill) for the currently focused HexPath in the editor.
