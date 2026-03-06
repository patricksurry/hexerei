# HexMap Editor: Design Specification

## 1. Goal
A simple, web-based tool for authoring and validating HexMap documents. 
The editor emphasizes **text-first authoring** with **live visual feedback** for HexPath expressions.

## 2. Key Architecture
- **Framework:** React + TypeScript (Vite).
- **Core Engine:** `@hexmap/core` (YAML parsing, HexPath resolution, hex math).
- **Rendering:** `@hexmap/renderer` (D3/SVG-based visualization).
- **State Management:** A central `HexMapDocument` object that stays in sync with a raw YAML view and a structured Sidebar.

## 3. UI/UX Design

### 3.1. Main Layout
- **Header:** Title, "New", "Open", "Download" buttons. Validation status indicator.
- **Sidebar (Left, ~300px):** Accordion sections mapping to the RFC structure:
    - **Metadata:** Title, Description, Designer, etc.
    - **Layout:** `hex_top`, `stagger`, and the `at` map boundary.
    - **Terrain:** A list of defined terrain types with color pickers.
    - **Features:** A list of feature cards. Each card has:
        - `at`: HexPath input.
        - `terrain`: Selection from defined types.
        - `label`/`elevation`/`tags`: Scalar inputs.
- **Viewport (Center/Right):** The interactive SVG map.
- **YAML Panel (Optional Toggle):** A side-by-side view showing the raw YAML content.

### 3.2. Interactive HexPath Feedback
- When any `at` field is focused or changed:
    1. Resolve the `HexPath` string using `HexPath.resolve()`.
    2. If valid: The `HexRenderer` shows an **Active Highlight** overlay on the corresponding hexes/edges/vertices.
    3. If invalid: The input box shows a red "Error" border and tooltip.

### 3.3. Feature Precedence (Layers)
- The Features list in the Sidebar is **ordered**. 
- Precedence is top-to-bottom (the last feature in the list "wins" on scalar overrides).
- Support for dragging features to reorder them.

## 4. Technical Constraints
- **Client-Side Only:** No backend required. Use File System Access API or simple "Download" for saving.
- **Local Linking:** Direct dependency on `hexmap-core` and `hexmap-renderer` via Workspace/Vite.
- **Strict RFC Adherence:** The UI should only expose fields defined in the RFC.

## 5. Visual Inspiration
- **Red Blob Games:** Clean, math-driven UI.
- **Tiled Map Editor:** Familiar sidebar panels for wargame designers.
- **VS Code YAML Preview:** The "side-by-side" live editing feel.
