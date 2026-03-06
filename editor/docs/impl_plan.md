# HexMap Editor: Implementation Plan

## Phase 1: Scaffolding (Day 1)
1. **Init Vite:** Create React + TS project in `hexmap-editor/`.
2. **Workspace Setup:** Configure `package.json` to link `@hexmap/core` and `@hexmap/renderer`.
3. **Basic Shell:** Main Viewport + Sidebar containers.
4. **Shell Test:** Render a "Hello HexMap" message.

## Phase 2: Document State (Day 2)
1. **Store:** Simple `HexMapDocument` state (wrapper for YAML document).
2. **YAML Editor:** A toggleable code editor component (e.g. `monaco-editor` or `react-simple-code-editor`).
3. **Sync Logic:** Ensure UI changes update YAML and vice versa.

## Phase 3: The Viewport (Day 3)
1. **Integration:** Hook up `@hexmap/renderer` to the SVG container.
2. **Dynamic Rendering:** Re-render the map when `HexMapDocument` changes.
3. **Highlight Layer:** Add a separate layer for drawing "Focused HexPaths".

## Phase 4: The Sidebar (Day 4)
1. **Accordion Sections:** 
    - **Metadata:** Simple inputs.
    - **Layout:** Controls for `hex_top`, `stagger`, `at`.
    - **Terrain:** Vocabulary manager (add/edit/remove).
    - **Features:** A scrollable list of feature cards.
2. **Input Components:** Specialized text inputs for HexPaths that trigger "Focus Path" state.

## Phase 5: Interactivity (Day 5)
1. **Live Validation:** Show real-time errors in `at` inputs via `HexPath.resolve()`.
2. **Dragging:** Support reordering features (precedence).
3. **Download:** Implement export to `.hexmap.yaml`.

## Phase 6: Polishing (Day 6)
1. **Zoom/Pan:** Proper navigation controls for the map.
2. **Tooltips:** Show metadata/terrain info on hex hover.
3. **Responsive Design:** Ensure Sidebar/Viewport work on different screen sizes.
