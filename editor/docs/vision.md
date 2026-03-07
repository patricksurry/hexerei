# Hexerei Editor: Vision Statement

The Hexerei Editor is a "Cartographer’s Workbench"—a professional UI for the rapid digitization, authoring, and refinement of hex-based map data. It bridges the gap between raw physical map scans and formal `.hexmap` files, elevating the **HexPath DSL** from a storage format to a first-class interactive tool.

## 1. Core Philosophy: The "Spatial IDE"

The editor is not a painting tool; it is a **Spatial IDE**. 
* **Declarative over Destructive:** Every action on the map—drawing a ridge, defining a forest, or setting an objective—is recorded as a `feature` in the ordered HexMap stack. 
* **The DSL as Source of Truth:** Changes in the UI are reflected immediately in the HexPath string, and manual edits to the HexPath string are instantly rendered on the canvas.
* **Non-Destructive Calibration:** The relationship between a background map scan and the logical hex grid is a live "lens" that can be adjusted without losing work.

## 2. Primary UI Components

### A. The "Omni-Path" Command Bar (HexPath CLI)
A prominent, keyboard-first command bar (inspired by **Raycast** and **VS Code’s Command Palette**) handles the heavy lifting of map definition.
* **Live Preview:** As you type `a1 3ne 2s`, the map shows "ghost" hexes for the path.
* **Auto-Generation:** Selecting a sequence of hexes on the map automatically populates the bar with the shortest-path HexPath string.
* **Syntax Highlighting:** Visual distinction for coordinates, relative steps, and operators (`!`, `>`, `+`).

### B. The Feature Stack (Ordered Layers)
The map is a stack of ordered `features`, mirroring the RFC’s override logic.
* **Layer-Based Priority:** Later features override earlier ones (e.g., a "Forest" base layer followed by a "Clear" clearing).
* **Drag-and-Drop Reordering:** Change map rendering and logic by reordering the feature stack.
* **Geometric Targeting:** Hovering over a feature in the list highlights its specific HexPath geometry on the canvas.

### C. The Calibration "Lens" (Grid Alignment)
The "roundtrip" begins with a map scan. The editor provides high-precision tools for grid alignment.
* **Three-Point Calibration:** Use three mouse clicks to solve for `scale`, `bearing`, and `stagger`.
* **Grid Snapping:** The logical hex grid "snaps" to visual centers detected by the internal Hough-transform-based computer vision engine.

## 3. HexPath as a First-Class Citizen

The editor makes the geometric power of HexPath intuitive through visual metaphors:
* **The "Nudge" Interaction:** When a shortest path between two points is ambiguous, the UI shows dotted alternatives. The user "pulls" the path in a direction, and the editor automatically inserts the `>dir` nudge operator.
* **The "Fill" Gesture (`!`):** Defining a perimeter visually "floods" the interior when the fill operator is applied.
* **Path Composition:** Visual "addition" and "subtraction" of hex collections using the `+` and `-` HexPath operators.

## 4. Visual Aesthetic: "The Tactical Blueprint"

The UI should lean into a **Technical/Military Cartography** aesthetic to differentiate from generic game editors.
* **Palette:** Dark mode base (`#1A1A1A`) with "Tactical Neon" accents (Cyan for hexes, Magenta for edges, Yellow for vertices).
* **High Contrast Map-Over-Scan:** The background scan is desaturated and translucent, allowing the high-vibrancy digitized abstraction to pop.
* **Typography:** Clean, monospaced typography (JetBrains Mono) for DSL entry and technical metadata.

## 5. Reference Examples

* **Linear’s Command Menu:** For the fast, keyboard-driven authoring experience.
* **Figma’s Layer Sidebar:** For managing the ordered feature stack.
* **Stripe’s Workbench:** For the "Roundtrip" feeling—editing raw JSON/YAML alongside a live visual preview.
* **Rive’s State Machine UI:** For handling the relationship between terrain types and geometric attributes.

## 6. The "Roundtrip" Workflow

1. **Ingest:** Drag-and-drop a map scan (JPG/PNG).
2. **Calibrate:** Align the grid using visual snapping.
3. **Annotate:** Define the map extent and base terrain using the HexPath CLI (e.g., `at: "@all" terrain: "sea"`).
4. **Digitize:** Use the mouse to trace rivers (Edge features) and ridges, with the UI generating HexPath code in real-time.
5. **Verify:** Toggle "Scan View" vs. "HexMap View" to ensure the abstraction captures the map's intent.
6. **Commit:** Export the validated `.hexmap` file for use in renderers or game engines.
