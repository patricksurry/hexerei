# Authoring From Scratch (New Map Flow) Design

**Goal:** Provide a frictionless workflow for users to create a new hex map from a blank slate, define its initial bounds and terrain vocabulary, and paint terrain directly onto the canvas. This replaces the hard-coded loading of "Battle for Moscow" and fixes the "mocked" viewport centering math.

**Architecture:** This flow relies entirely on the existing `MapModel`, `CommandHistory`, and `MapCommand` systems. The UI acts as a smart translation layer that generates standard HexPath (`layout.all` and `features.at`) without altering the underlying file format.

**Tech Stack:** TypeScript, React 18, `@hexmap/core`, `@hexmap/canvas`

---

## 1. The `>new` and `>open` Commands (Map Initialization)

We will introduce a modal dialog triggered by the `>new` command (or Cmd+N) that scaffolds a fresh `HexMapDocument`, as well as an `>open` command to load existing files from disk.

### The `>open` Command
- Adds an `>open` command to the command bar (and standard keyboard shortcut `Cmd+O`).
- Executing this command triggers a native file selection dialog (via a hidden `<input type="file" accept=".yaml,.json">`).
- Once a file is selected, it reads the content using the HTML5 `FileReader` API.
- The content is parsed with `MapModel.load(yamlSource)`, replacing the current `MapModel` and `CommandHistory`.

### UI Component (`NewMapDialog.tsx`)
- **Grid Setup:**
  - Width (cols) number input (default: 10)
  - Height (rows) number input (default: 10)
  - Orientation radio group with visual thumbnails (`flat-down`, `flat-up`, `pointy-right`, `pointy-left`)
  - Origin radio group with visual thumbnails (`top-left`, `bottom-left`, `top-right`, `bottom-right`)
- **Terrain & Base:**
  - Starter Palette dropdown (e.g., "Standard Wargame", "Sci-Fi", "Blank")
  - Base Terrain dropdown (populated by the selected palette, plus "None")

### Generation Logic
When the user clicks "Create", the dialog generates a valid YAML string:
1.  **Bounds (`layout.all`):** Calculates the four corners based on the Origin, Width, Height, and Orientation, and generates a HexPath fill string (e.g., `"0101 - 1001 - 1010 - 0110 fill"`).
2.  **Vocabulary (`terrain.hex`):** Populates the definitions based on the chosen Starter Palette.
3.  **Base Layer:** If a Base Terrain is selected, appends a feature to the end of the `features` list:
    ```yaml
    - at: "@all"
      terrain: [selected-terrain]
    ```

### Integration
- Add `>new` to the `CommandBar` dropdown and `Cmd+N` to `useKeyboardShortcuts`.
- If the app loads without a specific map URL (e.g., just `/`), it shows a "Welcome" screen or immediately opens the `NewMapDialog` instead of hard-loading "Battle for Moscow".
- Generating a new map instantiates a new `MapModel` and `CommandHistory`.

---

## 2. The Inverted Feature Stack

Currently, the `FeatureStack` component renders the first item in the document's feature array (usually the background/base layer) at the visual *top* of the UI list. This is counter-intuitive to standard layer-based design tools.

### Implementation
- Reverse the visual rendering order of the `FeatureStack` list (`editor/src/components/FeatureStack.tsx`).
- The item at `features[features.length - 1]` (the last item drawn on the canvas, i.e., the visual top layer) must appear at the *top* of the UI list.
- The item at `features[0]` (the first item drawn, usually the `@all` background) must appear at the *bottom* of the UI list.
- **Important:** Ensure the underlying data structure and `MapCommand` indices (e.g., `reorderFeature`, `updateFeature`) are not broken by this visual reversal. The index `0` must still refer to the first item in the YAML array.

---

## 3. Paint Mode (HexPath-Native Authoring)

This is the core authoring interaction unlock. Rather than a pixel-brush metaphor, paint mode builds a **HexPath expression** interactively. Each gesture appends tokens to the active feature's `at` field. The HexPath parser handles all path resolution — the editor never duplicates shortest-path logic.

### Activation & UI
- Clicking a terrain chip in the Inspector's "TERRAIN VOCABULARY" list enters paint mode for that terrain type.
- The active terrain chip receives a heavy border/highlight.
- The canvas cursor changes to `crosshair`.
- Pressing `Escape` or clicking the active chip again returns to Select Mode.

### Geometry Type Locking
- The first click sets the geometry type (hex, edge, or vertex) based on what the hit-test returns.
- Subsequent clicks must match the locked type. Mismatched clicks show a brief error hint (e.g., status bar message "Expected edge, got hex") and are ignored.
- Exiting paint mode resets the geometry lock.

### Click Interactions

| Gesture | HexPath Token Appended | Meaning |
|---|---|---|
| **Click** | ` hexId` (or edge/vertex ID) | Jump — adds a discrete atom |
| **Shift-click** | ` - hexId` | Standard connect — shortest path from cursor |

### Post-Selection Modifiers
Applied to the *last* connection in the path, after viewing the rendered result:
- **Flip** — toggles last `-` to `~` or vice versa (key TBD, future)
- **Fill** — appends `fill` to close and flood the boundary (future)
- **Close** — appends `close` to connect back to segment start (future)

### Off-Board Hex Clicking
The existing `hitTest` already detects edges and vertices on the map boundary (adjacent to at least one on-map hex). However, hex centers outside `layout.all` return `{ type: 'none' }`. For paint mode, extend hit-testing to return hex hits for the **one-ring neighbors** of the map boundary — hexes not in `layout.all` but adjacent to at least one hex that is. This enables roads/rivers to extend off the map edge through the correct hexside.

### Canvas Interaction
- **Hover:** When in paint mode, hovering over a valid target highlights it with the color of the active terrain.
- **Click:** Dispatches `updateFeature` to append the atom to the feature's `at` path. If no feature exists for the active terrain, the first click dispatches `addFeature` instead.
- **Command Mechanics:** Each click is one atomic `updateFeature` (or `addFeature`) command — one undo step per click, no batching needed.

### What's NOT in MVP
- Drag-to-paint (brushing)
- Eraser / `exclude` mode
- Fill, close, and flip post-selection modifiers (architecture supports adding them later)

---

## 4. Robust Viewport Auto-Centering

The current `CanvasHost` uses "mocked" math for initial load and `>zoom fit`, hardcoding the center to `0,0` and zoom to `20`. This must be replaced with robust bounding-box math so new maps (of any size) perfectly fill the screen.

### Implementation (`editor/src/canvas/CanvasHost.tsx`)
1.  **`computeWorldBounds`:** Ensure this utility (or a similar one) correctly calculates the absolute `min.x`, `min.y`, `max.x`, and `max.y` coordinates for all hexes in `model.mesh.getAllHexes()`.
2.  **`fitExtent` Logic:**
    - Calculate the width and height of the world bounding box.
    - Calculate the available width and height of the HTML canvas element.
    - Determine the necessary `zoom` scale factor to fit the world box inside the canvas box (adding a ~10% padding margin).
    - Calculate the midpoint of the world bounding box and set it as the viewport `center`.
3.  **Integration:**
    - Call this logic on initial mount (when `model` changes).
    - Call this logic when the user executes the `>zoom fit` command (replacing the mocked `resetZoom()` function).
