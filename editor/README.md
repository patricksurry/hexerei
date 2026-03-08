# HexMap Editor

The HexMap Editor is a powerful design tool built for wargamers, hobbyists, and developers who need to create precise, rule-compliant hexagonal maps. Unlike traditional image editors, it operates as a **Spatial IDE**: you can define map features by simply typing coordinates or "painting" with a domain-specific language, seeing immediate visual results. Whether you are recreating a classic board game map or designing a new tactical scenario, the editor provides the precision and automation needed to handle complex grid topologies effortlessly.

---

## Getting Started (Users)

1. **Launch the Editor**: Follow the developer instructions below to start the local server.
2. **Explore the Map**: Use your **Mouse Wheel** or **Trackpad** to zoom in and out. **Click and Drag** the canvas to pan around.
3. **Select Items**: Click on any **Hex**, **Edge**, or **Vertex** to see its details in the Inspector on the right.
4. **Use the Command Bar**: Press `Cmd+K` (or `Ctrl+K`) to focus the Command Bar at the top. 
   - **Type Coordinates**: Enter `0101` or `A1` to highlight a hex.
   - **Define Paths**: Type `0101 0105` to see a path.
   - **Fill Regions**: Type `0101 0301 0303 0103 !` to define and fill a 3x3 square.
5. **Manage Features**: View and toggle the map's layers in the **Feature Stack** on the left.

---

## Getting Started (Developers)

### Prerequisites
- Node.js (v18+)
- npm

### Installation
From the root of the monorepo:
```bash
npm install
```

### Development
Start the Vite development server:
```bash
npm run dev -w editor
```
The editor will be available at `http://localhost:5173`.

### Testing
Run the test suite:
```bash
npm test -w editor
```

## Architectural Overview

The editor is designed as a high-performance, reactive spatial environment. It uses a decoupled architecture where the mathematical model, visual scene, and UI state are clearly separated.

### Core Model (`/src/model/`)
- **`MapModel`**: The primary source of truth. It wraps the `@hexmap/core` mesh and provides high-level queries for features, terrain, and labels.
- **`Scene`**: A render-ready representation of the map. The `buildScene` function performs **frustum culling** and transforms world coordinates to screen space based on the current viewport.
- **`Viewport`**: Manages the camera state (zoom, center). Contains pure mathematical functions for coordinate projection and camera manipulation.
- **`HitTest`**: Precise geometric hit-testing for Hexes, Edges, and Vertices using screen-space distances and thresholds.
- **`Selection`**: Manages the multi-modal selection state (Hex, Edge, Vertex, or Feature) and generates visual highlights.

### Canvas Rendering (`/src/canvas/`)
- **`CanvasHost`**: A React component that manages the HTML5 Canvas element, handles input events (mouse, wheel, keyboard), and orchestrates the render loop.
- **`draw.ts`**: Pure, side-effect-free functions that paint the `Scene` onto a `CanvasRenderingContext2D`. It handles high-DPI scaling, dashed "ghost" geometry, and scalable labels.

### UI Components (`/src/components/`)
- **`CommandBar`**: The primary input for the "Spatial IDE". Supports live HexPath parsing, syntax highlighting, and command execution (e.g., `>zoom fit`).
- **`FeatureStack`**: A list-based view of the map features, supporting layering and visibility toggles.
- **`Inspector`**: Detailed properties and topological info for the current selection.

## Key Features

- **Live HexPath Entry**: Type RFC-compliant expressions into the command bar to see real-time "ghost" previews on the canvas.
- **Topological Selection**: Select not just hexes, but the edges and vertices between them with canonical ID resolution.
- **Stagger-Aware Logic**: Full support for "low" (Odd-Q) and "high" (Even-Q) stagger configurations.
- **Command Mode**: Use the `>` prefix for quick actions like `>zoom fit` or `>clear`.

## Tech Stack
- **React**: UI orchestration.
- **TypeScript**: Type safety and domain modeling.
- **Vite**: Build tool and dev server.
- **Vitest**: Unit and integration testing.
- **Canvas API**: High-performance map rendering.
