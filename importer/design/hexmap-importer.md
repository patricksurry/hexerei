# Hex Map Importer Design

## Goal
Create a tool that takes a high-resolution top-down hex map image (e.g., ASL board, wargame map) and outputs a valid `HexMap` YAML file, including:
1.  **Grid Geometry**: Orientation, layout, and coordinate system.
2.  **Terrain**: Per-hex terrain types (forest, city, clear).
3.  **Features**: Roads, rivers, and labels.

## Architecture

The pipeline consists of three main stages:

```mermaid
graph TD
    Img[Map Image] --> CV[Stage 1: Grid Detection (CV)]
    CV --> Grid[Grid Props & Hex Centers]
    CV --> Tiles[Normalized Hex Tiles]
    
    Grid --> Schema[Stage 3: Schema Generation]
    Tiles --> Cluster[Stage 2a: Clustering]
    Cluster --> Exemplars[Tile Exemplars]
    Exemplars --> VLM[Stage 2b: VLM Classification]
    VLM --> Terrain[Terrain Definitions]
    
    Terrain --> Schema
    Schema --> YAML[HexMap YAML]
```

## Stage 1: Grid Detection (Adaptive CV)

We use a robust computer vision pipeline to extract the grid, handling rotation and noise.

**1. Edge Detection (Canny)**
*   Convert image to grayscale and apply Gaussian Blur.
*   Use Canny Edge Detection to find all sharp gradients (borders, but also text, terrain texture).

**2. Adaptive Angle Filtering**
*   **Hough Transform**: Detect line segments in the edge map.
*   **Rotation Inference**: Compute a histogram of line angles modulo 60°. The peak indicates the map's global rotation (e.g., 0.5°).
*   **Filtering**: Discard all edges *not* aligned with the grid (relative 0°, 60°, 120°). This removes "organic" noise like river banks or forest textures.

**3. Contour Detection**
*   **Reconstruction**: Draw the kept lines onto a blank mask.
*   **Morphology**: Dilate and Close the lines to connect gaps (dashed lines become solid).
*   **Contour Finding**: Identify closed loops.
*   **Shape Filtering**: Keep contours that look like hexes (correct area, convex solidity > 0.9). These are "Candidate Hexes".

**4. Grid Fitting (RANSAC)**
*   **Coordinate Discovery**: The candidates give us a sparse set of centers $(x, y)$.
*   **Lattice Model**: We fit a linear model mapping integer grid coordinates $(q, r)$ to pixel $(x, y)$.
*   **Robustness**: Use **RANSAC** (Random Sample Consensus) to ignore outliers (e.g., a "hex" found in a circular building).
*   **Extrapolation**: Use the fitted model to generate the location of *every* hex on the board, ensuring perfect alignment even where lines are missing.

**Output:** `grid_config.json` (origin, scale, dimensions) and a directory of `tile_{q}_{r}.png`.

## Stage 2: Terrain & Feature Classification (Hybrid ML/LLM)

Instead of sending 1000 tiles to an LLM (slow/expensive), we cluster them first.

### 2a. Clustering (Unsupervised Learning)
1.  **Feature Vectorization**: Compute a feature vector for each tile.
    *   *Simple*: Color histogram (good for ASL - distinctly colored terrain).
    *   *Advanced*: CNN embedding (ResNet/CLIP) to capture texture/pattern.
2.  **Clustering**: Use DBSCAN or K-Means to group similar tiles.
    *   *Goal*: Group all "open ground" together, all "woods" together, etc.
    *   *Outlier Detection*: Tiles with unique features (roads, labels, units) will ideally fall into smaller clusters or stand alone.
3.  **Selection**: Pick 1-3 **Exemplars** (representative images) from each cluster.

### 2b. Classification (VLM / User Loop)
1.  **Prompting**: Send the Exemplars to a VLM (Gemini Pro Vision / GPT-4o).
    *   *Prompt*: "Here are samples of hex tiles from a wargame. Describe the dominant terrain (Clear, Woods, City, Swamp) and any features (Roads, Rivers, Text)."
2.  **Label Propagation**: Apply the VLM's label to the entire cluster.
3.  **Refinement**:
    *   For "mixed" clusters (e.g., "Woods + Road"), identifying the road geometry is harder.
    *   *Path Tracing*: Use standard image processing on "Road" clusters to detect lines connecting hex edges.

## Stage 3: Schema Generation

Combine the Grid Model and Terrain Data into the target format.

1.  **Coordinate Mapping**: Convert the discovered $(col, row)$ grid to the target coordinate system (e.g., "Battle for Moscow" uses odd-q or similar).
    *   *OCR Verification*: Use OCR on the cropped tiles to read the printed label (e.g., "A5") and verify the grid alignment.
2.  **Terrain Mapping**:
    *   Map VLM labels ("Dense Trees") to Schema types (`forest`).
    *   Define `terrain.hex` styles (color fills) based on the average color of the cluster.
3.  **Edge/Path Construction**:
    *   If a tile has "Road entering N, exiting S", generate a `path` entry.
    *   Connect adjacent path segments into continuous `features`.
4.  **YAML Serialization**: Produce the final `.hexmap.yaml`.

## Prototype Plan

1.  **Script 1 (`detect_grid.py`)**:
    *   Input: `asl_02.gif` (or user path)
    *   Output: `grid.json`, overlay image (debug), `tiles/` folder.
    *   *Tech*: Python, OpenCV, NumPy.

2.  **Script 2 (`cluster_tiles.py`)**:
    *   Input: `tiles/`
    *   Output: `clusters.json` (map of tile_id -> cluster_id), `exemplars/` folder.
    *   *Tech*: Scikit-learn (KMeans/DBSCAN), Histograms.

3.  **Manual/LLM Labeling**:
    *   We will simulate the VLM step by manually inspecting the `exemplars/` and creating a mapping `cluster_id -> terrain_type`.

4.  **Script 3 (`generate_yaml.py`)**:
    *   Input: `grid.json`, `clusters.json`, `labels.yaml`
    *   Output: `asl_02.hexmap.yaml`.

## Challenges & Mitigations

*   **Grid Drift**: Paper maps / scans have warp.
    *   *Mitigation*: Use local homography or a deformable grid mesh instead of a strict affine transform if needed. For now, assume digital-native or high-quality flat scans.
*   **Perspective Skew**:
    *   *Mitigation*: User must provide a "flat" image. Future: 4-point perspective transform tool UI.
*   **Ambiguous Terrain**: "Brush" vs "Woods" might look similar.
    *   *Mitigation*: The goal is a *first pass*. Exact fidelity can be fixed by the user in the text file.
