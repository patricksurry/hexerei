# Implementation Plan: Approach A — "Segment, Then Measure"

**Date**: 2026-03-01
**Parent**: `2026-03-01-hex-grid-detection-design.md`
**Goal**: Build a new grid detection pipeline that segments grid lines from
terrain first, then extracts geometry from the clean line signal. Produce
per-image HTML diagnostic reports and a batch summary across the test
collection.

## Architecture Overview

```
Input Image
    |
    v
[Step 1] Color-Space Flashlight Search
    |  Try many color filters (3D Gaussians in Lab/HSV)
    |  Score each by LSD line quality (length, count, angular peakiness)
    |  Output: best color filter + segmented grid-line mask
    |
    v
[Step 2] Line Segment Detection (LSD)
    |  Run on segmented mask
    |  Output: list of (x1,y1,x2,y2,angle,length) segments
    |
    v
[Step 3] Angular Clustering → Orientation
    |  Cluster segments by angle
    |  Look for 3 families at 60° intervals (hex) or 2 at 90° (square)
    |  Output: grid type, rotation angle, per-family segment lists
    |
    v
[Step 4] Parallel Line Spacing → Scale
    |  Within each family, measure perpendicular distances between lines
    |  Median spacing = apothem; side = apothem / (√3/2)
    |  Cross-validate: all 3 families should agree
    |  Output: side length estimate, per-family spacing histograms
    |
    v
[Step 5] Translation via DT Scoring
    |  Generate candidate grids at detected (scale, rotation)
    |  Sweep translation over one unit cell
    |  Score against edge distance transform
    |  Output: origin (tx, ty)
    |
    v
[Step 6] Joint Refinement (Nelder-Mead)
    |  Fine-tune (scale, rotation, tx, ty) jointly
    |  Optionally add tilt_x, tilt_y for deformation
    |  Output: final grid parameters
    |
    v
[Step 7] Diagnostic Report Generation
    |  HTML report with images and metrics from every step
    |  Output: per-image HTML file + summary JSON
    |
    v
[Step 8] Batch Runner + Summary
    Run all test images, produce index page with pass/fail table
```

## Detailed Step Descriptions

### Step 1: Color-Space Flashlight Search

This is the key novel idea: instead of hard-coding "grid lines are dark,"
search color space for the filter that best isolates grid lines.

**Algorithm**:

1. Convert image to Lab color space (perceptually uniform — better than
   RGB for "similar color" reasoning; also try HSV as alternative).

2. Sample N candidate color filters. Each filter is a 3D Gaussian in
   Lab space, parameterized by (L_center, a_center, b_center, sigma).
   Sampling strategy:
   - **Seed from image**: k-means on pixel colors (k=8-12) gives cluster
     centers. Use each center as a Gaussian center.
   - **Sigma sweep**: try sigma = 10, 20, 40 in Lab units for each center.
   - **Dark bias**: also always try (L < 30, any a,b) since grid lines are
     often near-black.
   - Total: ~40-50 candidate filters.

3. For each candidate filter:
   a. Compute per-pixel response: `mask = exp(-d²/2σ²)` where d is
      Euclidean distance in Lab from pixel color to filter center.
   b. Threshold to binary (Otsu on the response image).
   c. Morphological cleanup (thin, close small gaps).
   d. Run LSD on the binary mask.
   e. **Score** the LSD output by a "hex-grid-ness" metric:
      - Total length of detected segments (longer = more lines found)
      - Angular peakiness: compute angle histogram of segments (weighted
        by length). A good grid filter produces 3 sharp peaks at 60°
        intervals. Measure this as the k=3 Fourier harmonic magnitude
        of the angle histogram (or k=6 for the full 360° histogram).
      - Combined score = total_length * angular_peakiness

4. Select the filter with the highest combined score. If the best score
   is below a minimum threshold, fall back to grayscale Canny (the grid
   lines may not be color-separable).

**Diagnostic output**:
- Grid of top-5 candidate filters showing: color swatch, binary mask,
  LSD overlay, score components
- Bar chart of all candidates ranked by score
- Final selected mask overlaid on original image

**Reusable code**: None from existing codebase — this is new.

**Estimated effort**: This is the most novel and complex step. ~200 lines.

### Step 2: Line Segment Detection (LSD)

**Algorithm**:

1. Run OpenCV's `cv2.createLineSegmentDetector()` on the segmented mask
   from step 1 (or on gradient magnitude of the mask).
2. Filter segments by minimum length (e.g., > 15px or > 1% of image
   min dimension).
3. Store as array of (x1, y1, x2, y2, angle, length) tuples.

**Diagnostic output**:
- All detected segments drawn on image, color-coded by angle
- Segment count + total length statistics
- Length histogram

**Reusable code**: LSD is built into OpenCV. Minimal new code.

**Estimated effort**: ~30 lines.

### Step 3: Angular Clustering → Orientation

**Algorithm**:

1. Compute angle of each segment (mod 180° since lines have no
   direction). Weight by segment length.

2. Build length-weighted angle histogram (1° bins, 180 bins).

3. **Hex triplet search**: for each candidate alpha in [0°, 60°), compute
   score = hist[alpha] + hist[alpha+60] + hist[alpha+120]. The alpha
   that maximizes this score is the grid rotation. (Same idea as the
   Hough notebook, but on much cleaner LSD data from segmented lines.)

4. **Grid type classification**:
   - If triplet score >> doublet score (best at 90° intervals), it's hex.
   - If doublet score >> triplet, it's square.
   - For hex: check which triplet angle is closest to 0° or 90° to
     distinguish flat-top (one family near 0°) vs pointy-top (one family
     near 90°).

5. Extract the three (or two) angular families. Assign each segment to
   its nearest family (within ±10° tolerance).

**Diagnostic output**:
- Angle histogram with triplet peaks marked
- Segments colored by family assignment (3 colors for hex)
- Triplet score vs alpha plot
- Flat-top vs pointy-top decision rationale

**Reusable code**: The triplet search is similar to `notebooks_hough/01`
but will work much better because the input segments are cleaner.

**Estimated effort**: ~80 lines.

### Step 4: Parallel Line Spacing → Scale

**Algorithm**:

For each of the 3 angular families:

1. Project all segment midpoints onto the axis perpendicular to the
   family angle. This collapses parallel lines onto a 1D number line.

2. The projected positions form clusters (one cluster per grid line).
   The spacing between adjacent clusters = apothem (perpendicular
   distance between parallel grid lines).

3. Find spacings: sort projected positions, compute consecutive
   differences, take the median of the dominant spacing mode.
   - Use a 1D histogram of consecutive differences to find the mode.
   - Or: compute the autocorrelation of the 1D projection positions to
     find the fundamental period (1D autocorrelation is much simpler and
     more robust than 2D).

4. Convert: side_length = apothem / (sqrt(3) / 2).

5. **Cross-validation**: all 3 families should give the same side length
   within ~5%. Report per-family estimates and agreement metric.

**Diagnostic output**:
- Per-family: 1D projection plot showing segment positions + spacing
- Per-family: spacing histogram with detected mode
- Cross-family comparison: 3 estimates + mean + std
- Agreement metric (std / mean)

**Reusable code**: Some overlap with existing `hex_grid_sample_points`
concepts but this is a different approach. Mostly new code.

**Estimated effort**: ~100 lines.

### Step 5: Translation via DT Scoring

**Algorithm**:

1. Compute Canny edges on the segmented mask (or the original image).
2. Build distance transform.
3. Generate candidate grids at the detected (side, rotation, grid_type).
4. Sweep (tx, ty) over one unit cell with 20x20 resolution.
5. Score each using existing `score_grid_dt()` or the point-sampling
   approach from `hex_grid_sample_points()`.
6. Select the (tx, ty) with lowest score.

**Diagnostic output**:
- Translation score heatmap (tx, ty)
- Best translation overlaid on image (green grid on original)

**Reusable code**: `score_grid_dt()`, `hex_grid_sample_points()` from
`grid_utils.py`. This step is essentially the same as the existing
Phase 2.5 in `detect_grid.py`.

**Estimated effort**: ~40 lines (mostly reuse).

### Step 6: Joint Refinement

**Algorithm**:

1. Starting from (side, rotation, tx, ty) from steps 3-5, run
   Nelder-Mead optimization on the DT scoring objective.

2. Parameters: [tx, ty, rotation, side] (4 params).

3. Optionally extend to [tx, ty, rotation, side, tilt_x, tilt_y] for
   perspective deformation (6 params). Only enable this if the 4-param
   fit has high residual, suggesting deformation.

4. Use existing `symmetry_optimizer.py` infrastructure (or simplified
   version — the homography model may be overkill for most maps).

**On deformation** (responding to PDS comment): Yes, a final optimization
step is needed. Even with perfect local estimates, the global grid fit
benefits from joint optimization because:
- Small systematic biases in angle/scale accumulate across the grid
- Perspective distortion (photographed maps) affects scale/angle
  differently across the image
- The DT scoring naturally handles this by evaluating global fit

The 4-param refinement should handle most cases. The 6-param
(with tilt) version is insurance for photographed maps.

**Diagnostic output**:
- Before/after parameter comparison table
- Score improvement (initial vs final)
- Grid overlay: before (yellow) and after (green) refinement
- Residual map (per-grid-point DT value, visualized as heatmap —
  shows where fit is good vs where deformation causes mismatch)

**Reusable code**: `symmetry_optimizer.py` (adapt or simplify).

**Estimated effort**: ~60 lines.

### Step 7: Diagnostic Report Generation

Extend the existing `DiagnosticReport` class to support richer output:

**Additions needed**:
- Support for side-by-side image comparisons
- Support for data tables (not just text + single image)
- Collapsible sections (for detailed per-family data)
- Summary metrics box at top of report
- Consistent color scheme and layout

**Report structure per image**:

```
[Summary Box]
  Grid type: hex_flat | Side: 37.8px | Rotation: 0.3° | Confidence: HIGH

[1. Input & Color Flashlight]
  Original image | Top-5 color filters grid | Selected mask

[2. Line Segments]
  All segments color-coded by angle | Length histogram | Angle histogram

[3. Angular Clustering]
  Triplet score plot | Family assignments | Type classification

[4. Scale Extraction]
  Per-family spacing | Cross-validation | Side length estimate

[5. Translation]
  DT heatmap | Best origin overlay

[6. Refinement]
  Before/after overlay | Residual heatmap | Parameter table

[7. Final Result]
  Full grid overlay on original | Sample hex patches extracted
```

**Estimated effort**: ~150 lines (report template + plotting helpers).

### Step 8: Batch Runner + Summary

**Script**: `run_test_suite.py`

```
python run_test_suite.py --test-dir tests/ --output-dir output/reports/
```

**Behavior**:
1. Scan test directory for images.
2. Run pipeline on each image.
3. Generate per-image HTML report.
4. Generate summary `index.html` with:
   - Table of all images: thumbnail, detected params, confidence, pass/fail
   - Links to individual reports
   - Aggregate statistics (pass rate, mean error where ground truth known)

**Ground truth file**: `tests/ground_truth.json`
```json
{
  "asl_02.png": {"type": "hex_flat", "side": 37.8, "rotation": 0},
  "battle-for-moscow-map-full.jpg": {"type": "hex_flat", "side": 50}
}
```
(Partial ground truth is fine — images without entries just don't get
error metrics.)

**Estimated effort**: ~80 lines.

## Test Images

| Image | Size | Expected Type | Notes |
|-------|------|--------------|-------|
| asl_02.png | 266KB | hex_flat, s~37.8, rot~0 | Clean, high-contrast baseline |
| battle-for-moscow-map-full.jpg | 2.8MB | hex_flat, s~50 | Large, colored terrain |
| the-russian-campaign.jpeg | 323KB | hex_pointy | Noisy photograph, small hexes |
| arnhem_NE.jpg | 1.8MB | hex (flat?) | Large map corner, perspective |
| arnhem_NW.jpg | 1.6MB | hex (flat?) | Large map corner |
| arnhem_SE.jpg | 2.0MB | hex (flat?) | Large map corner |
| arnhem_SW.jpg | 1.8MB | hex (flat?) | Large map corner |
| Arnhem.jpg | 17MB | hex (flat?) | Full huge map — may need downscaling |
| antietam.jpeg | 335KB | hex_flat | Historical, moderate contrast |
| napoleon_at_waterloo.jpeg | 776KB | hex_flat | Historical, varied terrain |

## File Structure

New files to create:

```
hexmap-importer/
  src/
    color_flashlight.py     # Step 1: color-space search
    segment_pipeline.py     # Steps 1-6: full pipeline orchestration
    line_clustering.py      # Steps 2-4: LSD + angular clustering + spacing
    report.py               # Step 7: enhanced diagnostic report (replaces diagnostics.py)
  run_test_suite.py         # Step 8: batch runner
  tests/
    ground_truth.json       # Known correct parameters
```

Existing files to reuse (not modify):
```
  src/
    grid_utils.py           # score_grid_dt, hex_grid_sample_points, overlay_grid, GridParams
    grid_model.py           # GridModel, project_grid_lines (for refinement step)
```

## Implementation Order

Each step is independently testable and produces diagnostic output.
Implement in order, running on the test collection after each step to
see what works and what needs adjustment.

### Phase 1: Skeleton + Report Infrastructure
1. Create `report.py` with enhanced `DiagnosticReport` class
2. Create `run_test_suite.py` that loads images and generates stub reports
3. Create `ground_truth.json` with known values
4. **Checkpoint**: batch runner produces empty HTML reports for all images

### Phase 2: Color Flashlight (Step 1)
5. Implement `color_flashlight.py` with the search algorithm
6. Add diagnostic section to report (top-5 filters, selected mask)
7. **Checkpoint**: run on all images, visually inspect segmentation quality.
   This is the most important checkpoint — if segmentation doesn't work,
   we need to iterate here before proceeding.

### Phase 3: Lines + Angles + Scale (Steps 2-4)
8. Implement LSD wrapper + angular clustering in `line_clustering.py`
9. Implement parallel line spacing measurement
10. Add diagnostic sections (segments, angle histogram, spacing)
11. **Checkpoint**: run on all images, check angle and scale estimates
    against ground truth. We should have correct type and orientation
    for most images, and scale within ~10%.

### Phase 4: Translation + Refinement (Steps 5-6)
12. Implement translation sweep (reuse `score_grid_dt`)
13. Implement Nelder-Mead refinement (adapt from `symmetry_optimizer.py`)
14. Add diagnostic sections (DT heatmap, overlay, residuals)
15. **Checkpoint**: full pipeline end-to-end on all images. Grid overlays
    should visually align with actual grid lines.

### Phase 5: Polish + Summary
16. Add summary index page to batch runner
17. Add confidence metrics and pass/fail logic
18. Final run on all images, document results

## Key Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Color flashlight can't separate grid from terrain on some maps | Medium | Fall back to grayscale gradient magnitude (existing approach); the diagnostic report will show when this happens |
| LSD produces too many fragments on noisy maps | Medium | Filter by minimum length; the angular clustering step is robust to noise segments (they vote randomly) |
| Parallel line spacing has multiple modes (e.g., every-other-line) | Low | Use median of dominant mode; cross-validate across 3 families |
| Scale error > 10% on difficult maps | Medium | The refinement step (Nelder-Mead) corrects moderate errors; diagnostic residual map shows where fit is poor |
| Very large images (Arnhem 17MB) too slow | Low | Downsample for steps 1-4, full-res only for step 5-6; existing pipeline already does this |

## Dependencies

Python packages (all already in the project's venv):
- numpy, scipy (core math)
- opencv-python (LSD, morphology, Canny, DT, image I/O)
- matplotlib (plotting for reports)
- scikit-learn (k-means for color clustering in step 1)
- scikit-image (peak_local_max, possibly)

No new dependencies required.
