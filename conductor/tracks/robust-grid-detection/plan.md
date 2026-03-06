# Objective: Robust Hex Grid Recognition Pipeline (Flashlight + Symmetry Optimization)

Implement the newly designed "Flashlight + Structural Symmetry" grid detection pipeline. This plan focuses on the code structure, the Command Line Interface (CLI) design, robust diagnostic reporting (HTML), and a comprehensive testing strategy.

# Key Files & Context
- **Implementation Script**: `hexmap-importer/src/detect_grid.py` (will be updated to use the new robust pipeline).
- **Core Modules**:
  - `hexmap-importer/src/flashlight.py`: Spotlight sampling and local $(s, \alpha)$ consensus.
  - `hexmap-importer/src/symmetry_optimizer.py`: The novel structural symmetry evaluation and grid refinement.
  - `hexmap-importer/src/grid_model.py`: Enhancements for boundary reflection and hex mask generation.
  - `hexmap-importer/src/diagnostics.py` (New): HTML report generation, metrics tracking, and chart plotting.
- **Design Document**: `conductor/tracks/robust-grid-detection/design.md`

# Implementation Steps

## 1. CLI Design (`src/detect_grid.py`)
The main entry point will be enhanced to provide clear control over the pipeline and robust diagnostic output.

**Arguments:**
- `image_path` (Required): Path to the input map image.
- `--output-dir` (Optional): Directory for final output (default: `./output/`).
- `--fast` (Optional Flag): Skip the fine symmetry optimization and just output the consensus flashlight estimate.
- `--samples` (Optional): Number of random spotlights to use in Phase 1 (default: 30).
- `--debug-dir` (Optional): Directory to emit detailed HTML diagnostics, metrics, and step-by-step images (e.g., `./diagnostics/`).

## 2. Robust Diagnostic Output (HTML Report)
When `--debug-dir` is provided, the pipeline will generate a structured HTML page containing:
- **Phase 1 (Spotlights)**: Image showing spotlight locations/radii overlaid on the map. Histograms of local SNR values.
- **Phase 2 (Consensus)**: Scatter plot of $(s, \alpha)$ votes colored by SNR. Summary metrics of the chosen consensus cluster.
- **Phase 3 (Optimization)**: Heatmap/Landscape of the structural symmetry score around the consensus point. Visuals showing "edge" vs "center" patch extraction.
- **Phase 4 (Pruning)**: Hex density map showing which regions were kept vs. pruned.
This ensures we can visually and quantitatively diagnose exactly where the pipeline succeeds or breaks.

## 3. Code Structure & Modules
1.  **`flashlight.py`**: Handles reflection padding, random placement, 2D FFT/Autocorrelation, and SNR-weighted clustering.
2.  **`symmetry_optimizer.py`**: Creates masks for expected "edge" vs "center" regions, evaluates the structural symmetry score (variance/intensity differences), and runs bounded optimization.
3.  **`grid_model.py`**: Coordinate transformations handling partial edge hexes.
4.  **`diagnostics.py`**: Encapsulates matplotlib plotting and HTML file generation so the core logic remains clean.

## 4. Testing Strategy
**Test Categories:**
1.  **Clean Baseline**: `tests/asl_02.png` (Verify perfect extraction, zero tilt, precise side length).
2.  **Skewed Photo**: `tests/the-russian-campaign.jpeg` (Verify handling of minor perspective and uneven lighting).
3.  **Cluttered/Partial Grid**: `tests/battle-for-moscow-map-full.jpg` (Verify density-based pruning on borders/legends).

**Testing Workflow:**
- Implement modules sequentially, running against the test suite with `--debug-dir` active.
- Review the generated HTML report to ensure signal-to-noise metrics are functioning as expected before moving to the next phase.
