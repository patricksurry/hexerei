# Design: Flashlight + Structural Symmetry Grid Detection Pipeline

## 1. Overview
The proposed pipeline transitions from a global, "whole-image" projection approach to a **multi-patch local consensus** approach. This handles cases where central grid patterns are obscured, missing, or distorted by perspective. Furthermore, we replace traditional distance-transform line fitting with a novel **Symmetry-Based Structural Optimization**, taking advantage of the fact that a well-fitted grid will partition the image into highly self-similar hex patches.

## 2. Core Algorithm

### Phase 1: Preprocessing & Spotlight Sampling (Flashlight)
- **Image Ingestion**: Load the original image and apply a contrast-preserving conversion to grayscale (e.g., CLAHE) to handle uneven lighting and faded prints.
- **Noise Filtering**: Apply a bandpass or high-frequency filter (either spatially or in the FFT domain) to remove broad shading variations and high-frequency noise like text, leaving only the structural line data.
- **Spotlight Setup**:
  - We assume "sanity bounds" for wargame maps: the longest dimension will contain between 10 and 100 hexes. This defines our expected scale range.
  - We apply a Gaussian spotlight (weighted mask) at $N$ random positions distributed uniformly across the image.
  - To handle samples near the image edges or corners, we apply **reflection padding** to the image boundary before applying the spotlight.

### Phase 2: Local Analysis
- **Feature Extraction**: Each spotlighted patch undergoes 2D Autocorrelation/FFT to extract the two fundamental lattice vectors. This yields both the local orientation ($\alpha$) and scale ($s$). Note: Flat-top vs Pointy-top topologies are intrinsically defined by $\alpha$ (a 30-degree phase shift).
- **Consensus**: We use SNR-weighted clustering to find the dominant $(s, \alpha)$ that appears across most patches.
- **Grid Bounding**: Patches that yield no dominant lattice (e.g., solid color oceans or margins) are recorded. This lack of signal naturally maps out the contiguous boundary of the grid.

### Phase 3: Novel Structural Symmetry Optimization
- **Initialization**: We use the consensus $(s, \alpha)$ and local lattice vectors to seed a physical grid model. We assume standard linear perspective (ignoring extreme wide-angle radial distortion, expecting a reasonable quality scan/photo).
- **The Optimization Function**:
  - Given a proposed grid alignment (Scale, Rotation, Translation X/Y, Tilt X/Y), we mathematically partition the image into hexagonal (or circular) patches.
  - For partial hexes at the image edges, we use reflection padding to create complete patches.
  - **The Metric**: A perfectly aligned grid implies that, on average across the whole map, the patches exhibit a characteristic symmetry: a relatively homogeneous central region and high-contrast edges at the perimeter.
  - The optimization function maximizes the structural consistency across all valid patches. Specifically, it maximizes the variance/contrast between the expected "edge" pixels and the expected "center" pixels.
- **Benefit**: This avoids the local-minima traps of fitting lines to a distance-transform image, as it evaluates the structural reality of the hexes themselves.

### Phase 4: Adaptive Grid Reconstruction
- **Boundary Pruning**: We combine the SNR map from Phase 1 with the structural consistency scores from Phase 3 to mask out hexes that fall outside the map boundary (e.g., legends, cartouches, borders).
- **Output**: Generate a JSON/YAML spec with the refined grid parameters and the list of "active" hexes.
