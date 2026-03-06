# Hex Grid Detection: Design Alternatives

**Date**: 2026-03-01
**Status**: Draft — awaiting review

## Problem Statement

The hex grid importer pipeline is unreliable. The primary failure modes are
**wrong scale** (harmonic confusion in autocorrelation — detects 2x or 0.5x the
true hex side length) and **wrong orientation** (lattice vector extraction picks
the wrong pair of peaks, confusing flat-top vs pointy-top or getting rotation
wrong). These are fundamental limitations of the frequency-domain approach, not
tuning issues.

PDS: not really, often it seems to choose a scale that's within +/- 20%

The end-to-end goal is: given a scanned wargame map image, detect the hex grid
so we can extract hexagonal patches, classify terrain, and produce a draft
HexMap spec.

## What We've Tried

### Notebook progression (01-10)

| Notebook | Technique | Outcome |
|----------|-----------|---------|
| 01 | Synthetic FFT signatures | Confirmed hex → 6 peaks, square → 4 peaks |
| 02 | FFT noise robustness | Broadband noise OK; terrain regions degrade SNR most |
| 03 | Peak detection (radial/angular profiles) | Harmonic ring confusion at some scales |
| 04 | Autocorrelation | Better than FFT (pixel-space vectors), but still fragile |
| 05 | Preprocessing effects | Gradient magnitude (sigma=1.5) + Hann window wins |
| 06 | Lattice → grid params | Classification works when lattice vectors are correct |
| 07 | Phase recovery (translation) | FFT phase fails; brute-force DT search is reliable |
| 08 | Full pipeline on real images | Works on clean images, fragile on noisy ones |
| 09 | Flashlight RANSAC | Major improvement — local voting handles partial/faint grids |
| 10 | Angles-first (k=6 harmonic) | Promising but not integrated |

### Hough experiment (`notebooks_hough/`)

Hough lines + angle histogram + Gabor filtering. Got the ASL board completely
wrong (169px vs 37.8px ground truth, wrong type, wrong rotation). Abandoned.

### Current pipeline (`src/detect_grid.py`)

Three-phase: flashlight consensus → coarse DT translation search → Nelder-Mead
symmetry optimization (7 params including perspective tilt + focal length).
Flashlight consensus improved robustness significantly, but the core
autocorrelation step within each spotlight still suffers from harmonic confusion
and lattice vector mis-selection.

## Root Cause Analysis

The frequency-domain approach has two inherent fragilities:

1. **Harmonic ambiguity**: Autocorrelation produces peaks at 1x, 2x, 3x... the
   fundamental period. When noise or terrain texture strengthens a harmonic
   relative to the fundamental, the "shortest peak" heuristic picks the wrong
   scale. This is not fixable by tuning thresholds — it's structural.

2. **Lattice vector selection**: Picking two "shortest independent" peaks from
   the autocorrelation requires distinguishing true lattice vectors from noise
   peaks and harmonic artifacts. The independence test (cross-product > 0.34)
   is a heuristic that doesn't exploit the geometric constraint that hex
   lattice vectors must be at ~60 degrees.

Both problems stem from the same design choice: extract parameters from the
frequency/autocorrelation domain, then validate them. The alternative is to
never enter the frequency domain at all.

## Proposed Approaches

### Approach A: "Segment, Then Measure" (Perception-First)

**Core insight**: Humans see grid lines as a distinct visual layer — thin, dark
lines on colored terrain. The current pipeline treats grid lines the same as
terrain boundaries, text edges, etc. If we separate grid lines first, geometry
extraction becomes straightforward.

**Pipeline**:

1. **Grid line segmentation** — Grid lines on wargame maps are typically a
   specific color (black, dark gray, brown) contrasting with terrain fills. Use
   morphological black-hat transform to isolate thin dark structures, or
   color-space thresholding, or adaptive local contrast.

PDS: interesting, could you use a 3d gaussian 'flashlight' in the color cube to look 
for color filters that isolate grid lines?  maybe by checking for very peaked or strong LSD signals?

2. **Line Segment Detection** — Run LSD (Line Segment Detector) on the
   segmented image. LSD gives precise endpoints and angles per segment (unlike
   Hough, which was imprecise).

3. **Angular clustering** — Cluster detected segments by angle. Hex grids
   produce exactly 3 clusters at 60-degree intervals. This directly gives
   orientation and grid type (flat-top vs pointy-top from which angles are
   present).

4. **Scale from parallel line spacing** — Within each angular cluster, measure
   perpendicular distances between parallel lines. The median gives the
   apothem. Side = apothem / (sqrt(3)/2).

5. **Geometric cross-validation** — All 3 families must agree on scale within
   tolerance. Disagreement flags problems.

PDS: do we need a final optimization step to handle deformation?  even if we have good
local estimates of scale and orientation, the global grid fit might be off due to accumulated error

**Strengths**:
- Mimics human perception — directly addresses "easy for humans" observation
- Angles and scale come from independent measurements (no harmonic confusion)
- Every step is directly visualizable and interpretable
- Prior art: [CMU Deformed Lattice Detection](http://vision.cse.psu.edu/publications/pdfs/2009park1.pdf) (Park, Liu) takes a similar bottom-up approach

**Weaknesses**:
- Depends on grid lines being visually distinct from terrain (usually true for
  wargame maps but not always — faded scans, colored grid lines)
- LSD may fragment lines in noisy images
- Needs additional work for the segmentation step

---

### Approach B: "Sweep and Score" (Direct Optimization) — RECOMMENDED

**Core insight**: The distance-transform scoring already works reliably for
translation search (notebook 07's key finding). The frequency domain fails at
scale and rotation. So don't use the frequency domain — just try many candidate
grids and pick the one that best fits the image edges.

**Pipeline**:

1. **Preprocessing** — Canny edges + distance transform (proven reliable).

2. **Rotation sweep** — Score candidate grids at many rotations: 0.5-degree
   steps over 30 degrees (hex has 60-degree symmetry), so 60 evaluations. Fix
   scale to a reasonable initial guess. Plot rotation vs score — should show a
   clear minimum.

3. **Scale sweep** — At the best rotation, sweep scale from 10px to 200px in
   ~100 steps. Plot scale vs score — should show a clear minimum at the true
   side length.

4. **Joint refinement** — Top candidates from the coarse sweep feed into
   Nelder-Mead for precise (scale, rotation, translation) optimization.

5. **Grid type classification** — Run for flat-top hex, pointy-top hex, and
   square. Compare final scores. Best score wins.

**Computational cost**: ~60 rotations x 100 scales x 2 types x 2 (flat/pointy)
= ~12,000 evaluations. At ~1ms each (using existing `score_grid_dt` with
point-sampling) = ~12 seconds. Coarse-to-fine can reduce this to ~1-2 seconds.

**Strengths**:
- Eliminates the root cause — no frequency domain, no harmonic confusion
- Self-contained — no API dependencies, no segmentation heuristics to tune
- Best diagnostics story — the score landscape is a 2D heatmap (rotation x
  scale) that immediately reveals whether there's a clear winner or ambiguity
- Builds on the most proven component (DT scoring from notebook 07)
- Naturally answers "is it hex?" — compare flat-top vs pointy-top vs square
  best scores
- Computational cost is very manageable

**Weaknesses**:
- Needs reasonable parameter bounds (10-200px covers all known wargame maps)
- Score landscape may have local minima from terrain edges aligning with
  candidate grid lines (but visualization makes this visible)
- Slower than a frequency approach when it works (seconds vs milliseconds),
  but reliability >> speed here

**Enhancement**: Combine with Approach A's grid-line segmentation as optional
preprocessing. If grid lines can be segmented, the distance transform becomes
cleaner (only grid edges, not terrain edges), making the sweep faster and
more accurate.

---

### Approach C: "VLM Bootstrap + Classical Refinement" (Hybrid AI)

**Core insight**: A vision-language model can do what a human does — look at the
map and estimate grid parameters to ballpark accuracy. Use that as
initialization, then refine classically.

**Pipeline**:

1. **VLM estimation** — Send image to Claude (vision) with a structured prompt:
   "This is a wargame hex map. Estimate: flat-top or pointy-top? Approximate
   hex side length in pixels? Grid rotation in degrees?" The model gives a
   rough but usually correct-ballpark answer.

2. **Constrained search** — Use VLM estimates to narrow the DT sweep to a small
   window (scale +/- 30%, rotation +/- 10 degrees).

3. **Nelder-Mead refinement** — From the best DT search result.

4. **Confidence check** — If classical refinement diverges far from VLM
   estimate, flag disagreement for human review.

**Strengths**:
- Directly leverages the "easy for humans" observation
- Provides excellent initialization that avoids harmonics/orientation traps
- Graceful degradation: if VLM is wrong, constrained search still explores
  a neighborhood

**Weaknesses**:
- API dependency and cost (~$0.01-0.05 per image)
- Adds latency (~2-5s for VLM call)
- VLM may hallucinate specific pixel measurements (but only needs ballpark)
- Harder to make fully offline/reproducible
- May feel like a hack compared to a principled solution

---

## Recommendation: Approach B, enhanced with elements of A

Approach B ("Sweep and Score") is the strongest foundation because it:

1. **Eliminates the root cause** of current failures (no frequency domain)
2. **Reuses the one proven component** (DT scoring)
3. **Produces the best diagnostics** (score landscape heatmaps)
4. **Is self-contained** (no external dependencies)
5. **Naturally handles grid type classification**

The enhancement from Approach A (grid-line segmentation as preprocessing)
improves the signal quality fed into the DT scoring but isn't strictly required.

Approach C (VLM bootstrap) could be added later as an optional fast-path or
validation check, but shouldn't be the foundation.

## Diagnostic Pipeline

Regardless of which approach is chosen, the pipeline should produce a structured
HTML diagnostic report at every stage. This is essential for understanding
failure modes and building confidence in results.

### Proposed diagnostic sections:

1. **Input & Preprocessing**
   - Original image
   - Grayscale conversion
   - Edge detection result (Canny)
   - Distance transform visualization
   - Optional: grid line segmentation result (if using Approach A enhancement)

2. **Rotation Analysis**
   - Plot: score vs rotation angle (expect 3 minima at 60-degree intervals for hex)
   - Annotated: detected best angle, confidence (depth of minimum vs background)
   - Signal quality metric: min_score / median_score ratio

3. **Scale Analysis**
   - Plot: score vs side length (at best rotation)
   - Annotated: detected scale, any secondary minima (may indicate harmonics)
   - Signal quality metric: primary peak prominence

4. **2D Score Landscape**
   - Heatmap: (rotation, scale) with score as color
   - Should show a clear "island" at the correct parameters
   - Visual indicator of search path if using optimization

5. **Grid Type Comparison**
   - Table: flat-top hex / pointy-top hex / square, each with best score
   - Confidence: score ratio between best and second-best type

6. **Translation & Refinement**
   - Translation sweep heatmap (tx, ty) at detected (scale, rotation)
   - Before/after Nelder-Mead refinement comparison

7. **Final Result**
   - Detected grid overlaid on original image
   - Per-hex-cell extraction preview (sample of extracted patches)
   - Summary metrics: grid type, side length, rotation, origin, confidence

### Confidence metrics at each stage:

| Metric | Definition | Good | Suspect |
|--------|-----------|------|---------|
| Rotation clarity | min_score / median_score | < 0.7 | > 0.9 |
| Scale clarity | peak prominence in score-vs-scale | > 0.3 | < 0.1 |
| Type confidence | best_type_score / 2nd_type_score | < 0.8 | > 0.95 |
| Alignment quality | mean DT at grid points | < 3px | > 8px |
| Symmetry score | std of scores across 3 line families | < 0.1 | > 0.3 |

## Test Plan

Run on all existing test images and verify:

| Image | Expected | Current result | Target |
|-------|----------|----------------|--------|
| asl_02.png | flat-top, s~37.8px, rot~0 | ~41px (9% err) | < 3% err |
| battle-for-moscow | flat-top, s~50px | varies | < 5% err |
| russian-campaign | pointy-top | noisy | correct type + < 5% |
| arnhem | large, perspective | varies | correct type + < 10% |
| antietam | historical | varies | correct type + < 10% |
| napoleon_at_waterloo | historical | varies | correct type + < 10% |

## Open Questions

1. **Parameter bounds**: Is 10-200px side length sufficient for all target maps?
   Are there maps with very small or very large hexes?

2. **Perspective handling**: The current pipeline has tilt/focal parameters.
   Should the sweep approach also handle perspective, or treat it as a
   refinement-only concern?

3. **Speed requirements**: Is ~2-5 seconds per image acceptable? Could go
   faster with coarse-to-fine, slower if we need finer resolution.

4. **Grid line segmentation**: Worth investing in as preprocessing (Approach A
   enhancement), or is raw Canny sufficient for the DT?

5. **Integration with downstream**: How does grid detection hand off to patch
   extraction and terrain classification? Should they share the diagnostic
   report?
