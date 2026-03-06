# Track Specification: HexMap Core: Editor Support Updates

- **Track ID:** `hexmap-core-editor-support`

## Objective
Update `@hexmap/core` with essential types and methods to support the `hexmap-editor` package, specifically enabling dynamic map updates and structured document manipulation.

## Proposed Changes

### 1. `types.ts`
- **Area Interface:** Define a dedicated `Area` interface:
  ```typescript
  export interface Area {
      id: string;
      terrain: string;
      props: Record<string, any>;
      label?: string;
      elevation?: number;
  }
  ```
- **MeshMap Interface:** Update `getArea` and `getAllAreas` to return the `Area` interface.

### 2. `hex-mesh.ts`
- **Storage:** Update internal `_areas` to store `Area` objects instead of just string IDs. A `Map<string, Area>` is recommended.
- **`updateArea(id: string, attrs: Partial<Area>): void`:** Add method to partially update attributes of an existing area.

### 3. `document.ts`
- **`setLayout(key: string, value: any): void`:** Set specific layout metadata.
- **`addFeature(feature: any): void`:** Add a new feature entry to the document.
- **`toJS(): any`:** Provide a way to retrieve a plain JavaScript object representing the document (using `this.doc.toJS()`).

## Dependencies
- `@hexmap/core` (internal)
- `yaml` (existing dependency in `hexmap-core`)
