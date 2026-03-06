# %% [markdown]
# # 01 — Hough Angle Histogram → Hex Grid Detection
#
# **Approach:** Use the Hough transform's angular distribution to find the
# three dominant edge angles (with 120° spacing) that define a hex grid.
# Then use 1D FFT along those three projections to estimate scale, and
# directional Gabor filters to isolate the grid signal.
#
# **Pipeline:**
# 1. Edge-preserving blur (bilateral filter) + Canny edges
# 2. Hough line detection → angle histogram
# 3. Find dominant hex triplet: α maximizing hist[α] + hist[α+60] + hist[α+120]
# 4. 1D projection FFT along each of the 3 directions → line spacing (= apothem)
# 5. Gabor directional filtering → clean grid-only edge map
# 6. Distance transform + translation search
# 7. Optional Nelder-Mead refinement
# 8. Grid overlay visualization

# %%
import sys
sys.path.insert(0, '../src')

import numpy as np
import cv2
import matplotlib.pyplot as plt
from scipy.signal import find_peaks
from scipy.ndimage import gaussian_gradient_magnitude
from scipy.optimize import minimize
from grid_utils import GridParams, score_grid_dt, overlay_grid, make_hex_grid

%matplotlib inline
plt.rcParams['figure.dpi'] = 120

# %% [markdown]
# ## Step 1: Load and preprocess

# %%
IMG_PATH = '../tests/asl_02.png'  # Ground truth: flat-top hex, s ≈ 37.8px, rot ≈ 0°

MAX_DIM = 1200

img_color = cv2.imread(IMG_PATH)
assert img_color is not None, f"Cannot load {IMG_PATH}"
img_gray = cv2.cvtColor(img_color, cv2.COLOR_BGR2GRAY)

h, w = img_gray.shape
scale_factor = 1.0
if max(h, w) > MAX_DIM:
    scale_factor = MAX_DIM / max(h, w)
    work_gray = cv2.resize(img_gray, (int(w * scale_factor), int(h * scale_factor)))
else:
    work_gray = img_gray.copy()

wh, ww = work_gray.shape
print(f"Image: {IMG_PATH} ({w}x{h}), working at {ww}x{wh} (scale={scale_factor:.3f})")

# Edge-preserving blur (bilateral filter preserves edges, smooths flat regions)
blurred = cv2.bilateralFilter(work_gray, d=9, sigmaColor=75, sigmaSpace=75)

# Canny edges on the blurred image
edges = cv2.Canny(blurred, 50, 150)

fig, axes = plt.subplots(1, 3, figsize=(15, 4))
axes[0].imshow(work_gray, cmap='gray')
axes[0].set_title('Grayscale')
axes[1].imshow(blurred, cmap='gray')
axes[1].set_title('Bilateral Filtered')
axes[2].imshow(edges, cmap='gray')
axes[2].set_title('Canny Edges')
for ax in axes:
    ax.axis('off')
plt.tight_layout()

# %% [markdown]
# ## Step 2: Hough line detection → angle histogram

# %%
def hough_angle_histogram(edges, min_line_length=20, max_line_gap=3,
                          threshold=30, n_bins=180):
    """
    Run HoughLinesP and build a weighted angle histogram.
    
    Lines are weighted by their length so that long grid edges
    contribute more than short noise fragments.
    
    Returns:
        angles: bin centers in degrees [0, 180)
        hist: length-weighted histogram
        lines: raw Hough line segments
    """
    lines = cv2.HoughLinesP(edges, rho=1, theta=np.pi/180,
                            threshold=threshold,
                            minLineLength=min_line_length,
                            maxLineGap=max_line_gap)
    
    if lines is None:
        return np.linspace(0, 180, n_bins, endpoint=False), np.zeros(n_bins), None
    
    angles_raw = []
    lengths = []
    for line in lines:
        x1, y1, x2, y2 = line[0]
        angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
        # Map to [0, 180) — lines have no intrinsic direction
        angle = angle % 180
        length = np.hypot(x2 - x1, y2 - y1)
        angles_raw.append(angle)
        lengths.append(length)
    
    angles_raw = np.array(angles_raw)
    lengths = np.array(lengths)
    
    # Build length-weighted histogram
    bin_edges = np.linspace(0, 180, n_bins + 1)
    hist, _ = np.histogram(angles_raw, bins=bin_edges, weights=lengths)
    bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2
    
    # Smooth with circular convolution (wrap-around)
    kernel = np.ones(5) / 5
    hist_padded = np.concatenate([hist[-2:], hist, hist[:2]])
    hist_smooth = np.convolve(hist_padded, kernel, mode='same')[2:-2]
    
    return bin_centers, hist_smooth, lines


# Estimate minimum line length from image size (≈ 1/50 of smaller dimension)
min_len = max(15, min(ww, wh) // 50)
print(f"Hough min_line_length = {min_len}px")

angles, hist, lines = hough_angle_histogram(edges, min_line_length=min_len)
n_lines = len(lines) if lines is not None else 0
print(f"Detected {n_lines} line segments")

fig, ax = plt.subplots(1, 1, figsize=(12, 3))
ax.bar(angles, hist, width=1.0, color='steelblue', alpha=0.7)
ax.set_xlabel('Angle (degrees)')
ax.set_ylabel('Weighted count (by line length)')
ax.set_title(f'Hough Line Angle Histogram ({n_lines} segments)')
ax.set_xlim(0, 180)
plt.tight_layout()

# %% [markdown]
# ## Step 3: Find dominant hex angle triplet
#
# Search for the angle α (in 0°–60°) that maximizes
# `hist[α] + hist[α + 60°] + hist[α + 120°]`.
# This exploits the fact that hex grids have three families of parallel
# edges at exactly 120° spacing.

# %%
def find_hex_triplet(angles, hist):
    """
    Find the angle alpha (0-60°) maximizing hist[alpha] + hist[alpha+60] + hist[alpha+120].
    
    Returns:
        alpha: dominant angle in degrees
        score: the triplet sum score
        triplet_angles: the three angles [alpha, alpha+60, alpha+120]
    """
    n_bins = len(angles)
    bin_width = 180.0 / n_bins  # degrees per bin
    
    best_alpha = 0
    best_score = -1
    
    # Search alpha in [0°, 60°) — the full period due to 3-fold symmetry
    for i in range(n_bins):
        a = angles[i]
        if a >= 60:
            break
        
        # Find bins closest to a, a+60, a+120
        i1 = i
        i2 = int(round((a + 60) / bin_width)) % n_bins
        i3 = int(round((a + 120) / bin_width)) % n_bins
        
        score = hist[i1] + hist[i2] + hist[i3]
        
        if score > best_score:
            best_score = score
            best_alpha = a
    
    triplet = [best_alpha, best_alpha + 60, best_alpha + 120]
    return best_alpha, best_score, triplet


alpha, score, triplet = find_hex_triplet(angles, hist)
print(f"Dominant hex angle: α = {alpha:.1f}°")
print(f"Triplet: {triplet[0]:.1f}°, {triplet[1]:.1f}°, {triplet[2]:.1f}°")
print(f"Triplet score: {score:.0f}")

# Visualize triplet on the histogram
fig, ax = plt.subplots(1, 1, figsize=(12, 3))
ax.bar(angles, hist, width=1.0, color='steelblue', alpha=0.5, label='Histogram')
for i, ta in enumerate(triplet):
    ax.axvline(ta, color='red', linewidth=2, linestyle='--',
               label=f'α+{i*60}° = {ta:.1f}°' if ta < 180 else None)
ax.set_xlabel('Angle (degrees)')
ax.set_ylabel('Weighted count')
ax.set_title(f'Hex Triplet Detection: α = {alpha:.1f}°')
ax.set_xlim(0, 180)
ax.legend()
plt.tight_layout()

# %% [markdown]
# ## Step 4: 1D projection FFT → scale estimation
#
# For each of the 3 angles, project the edge image **perpendicular** to that
# direction (i.e., sum along the line direction). The resulting 1D signal has
# a dominant period = perpendicular line spacing = `sqrt(3)/2 * side` (the apothem).

# %%
def projection_1d(edge_img, angle_deg):
    """
    Project edge image perpendicular to the given angle.
    
    Rotates the image so that lines at `angle_deg` become vertical,
    then sums each column to get a 1D profile.
    
    Returns:
        profile: 1D projection (column sums)
    """
    # Rotate so that lines at angle_deg become vertical
    # To make lines at angle θ vertical, rotate by (90° - θ)
    rot_angle = 90 - angle_deg
    h, w = edge_img.shape
    center = (w / 2, h / 2)
    M = cv2.getRotationMatrix2D(center, rot_angle, 1.0)
    
    # Compute new bounding box
    cos_a = abs(M[0, 0])
    sin_a = abs(M[0, 1])
    new_w = int(h * sin_a + w * cos_a)
    new_h = int(h * cos_a + w * sin_a)
    M[0, 2] += (new_w - w) / 2
    M[1, 2] += (new_h - h) / 2
    
    rotated = cv2.warpAffine(edge_img, M, (new_w, new_h))
    
    # Sum columns
    profile = np.sum(rotated.astype(float), axis=0)
    return profile


def estimate_period_fft(profile, min_period=10, max_period=150):
    """
    Estimate the dominant period in a 1D profile using FFT.
    
    Returns:
        period: dominant period in pixels
        all_peaks: list of (period, magnitude) tuples sorted by magnitude
    """
    # Remove DC
    profile = profile - np.mean(profile)
    
    # Window
    window = np.hanning(len(profile))
    profile = profile * window
    
    # FFT
    fft = np.fft.rfft(profile)
    freqs = np.fft.rfftfreq(len(profile))
    magnitudes = np.abs(fft)
    
    # Find peaks in valid frequency range
    valid = (freqs > 1/max_period) & (freqs < 1/min_period) & (freqs > 0)
    if not np.any(valid):
        return None, []
    
    # Find peaks in magnitude spectrum
    mag_valid = magnitudes.copy()
    mag_valid[~valid] = 0
    
    peak_indices, properties = find_peaks(mag_valid, height=0, distance=3)
    
    if len(peak_indices) == 0:
        # Fallback: just use argmax
        idx = np.argmax(mag_valid)
        return 1.0 / freqs[idx] if freqs[idx] > 0 else None, []
    
    # Sort by magnitude
    peak_mags = magnitudes[peak_indices]
    order = np.argsort(-peak_mags)
    peak_indices = peak_indices[order]
    
    all_peaks = [(1.0 / freqs[idx], magnitudes[idx]) for idx in peak_indices if freqs[idx] > 0]
    
    best_idx = peak_indices[0]
    best_period = 1.0 / freqs[best_idx] if freqs[best_idx] > 0 else None
    
    return best_period, all_peaks


# Estimate periods along all 3 directions
fig, axes = plt.subplots(3, 2, figsize=(14, 9))

periods = []
for i, angle in enumerate(triplet):
    profile = projection_1d(edges, angle)
    period, all_peaks = estimate_period_fft(profile)
    
    if period is not None:
        periods.append(period)
        print(f"  Angle {angle:.1f}°: period = {period:.1f}px" +
              (f" (top-3: {', '.join(f'{p:.1f}' for p, _ in all_peaks[:3])})" if all_peaks else ""))
    
    # Plot profile
    axes[i, 0].plot(profile, color='steelblue', linewidth=0.5)
    axes[i, 0].set_title(f'Projection ⊥ {angle:.1f}°' + (f' — period={period:.1f}px' if period else ''))
    axes[i, 0].set_xlabel('Position (pixels)')
    
    # Plot FFT magnitude
    profile_centered = profile - np.mean(profile)
    fft_mag = np.abs(np.fft.rfft(profile_centered * np.hanning(len(profile_centered))))
    freqs = np.fft.rfftfreq(len(profile_centered))
    valid = freqs > 0
    axes[i, 1].plot(1.0/freqs[valid], fft_mag[valid], color='coral', linewidth=0.5)
    if period:
        axes[i, 1].axvline(period, color='red', linewidth=2, linestyle='--', alpha=0.7)
    axes[i, 1].set_xlim(5, 100)
    axes[i, 1].set_title(f'1D FFT — dominant period')
    axes[i, 1].set_xlabel('Period (pixels)')

plt.tight_layout()

# Compute scale from median period
# Period = line spacing = sqrt(3)/2 * side  (apothem)
if periods:
    median_period = np.median(periods)
    side_est = median_period / (np.sqrt(3) / 2)
    print(f"\nMedian line spacing (apothem): {median_period:.1f}px")
    print(f"Estimated side length: {side_est:.1f}px")
    print(f"  (working resolution — full-res = {side_est/scale_factor:.1f}px)")
else:
    print("WARNING: Could not estimate any periods!")
    side_est = 25.0  # fallback

# %% [markdown]
# ## Step 5: Gabor directional filtering
#
# Apply oriented Gabor filters at the three detected angles to create a
# "grid-only" response image that suppresses non-grid edges.

# %%
def gabor_grid_filter(gray_img, triplet_angles, wavelength, sigma_factor=0.4):
    """
    Apply Gabor filters at the 3 hex grid angles and combine responses.
    
    Parameters
    ----------
    gray_img : grayscale image
    triplet_angles : list of 3 angles in degrees
    wavelength : expected line spacing in pixels (= apothem)
    sigma_factor : sigma relative to wavelength
    
    Returns
    -------
    combined : combined Gabor response (grid-enhanced image)
    individual : list of 3 individual filter responses
    """
    sigma = wavelength * sigma_factor
    ksize = int(6 * sigma) | 1  # ensure odd
    ksize = max(ksize, 5)
    
    combined = np.zeros_like(gray_img, dtype=np.float64)
    individual = []
    
    for angle_deg in triplet_angles:
        # Gabor theta is the orientation of the normal to the lines
        # cv2 Gabor theta: angle of the sinusoidal carrier
        # We want to detect lines AT angle_deg, so the Gabor normal is at angle_deg + 90°
        theta = np.radians(angle_deg + 90)
        
        kernel = cv2.getGaborKernel(
            ksize=(ksize, ksize),
            sigma=sigma,
            theta=theta,
            lambd=wavelength,
            gamma=0.5,  # spatial aspect ratio
            psi=0       # phase offset
        )
        
        response = cv2.filter2D(gray_img, cv2.CV_64F, kernel)
        response = np.abs(response)  # rectify
        individual.append(response)
        combined += response
    
    return combined, individual


gabor_combined, gabor_individual = gabor_grid_filter(
    blurred, triplet, median_period
)

# Normalize for display
gabor_norm = (gabor_combined / gabor_combined.max() * 255).astype(np.uint8)

fig, axes = plt.subplots(1, 4, figsize=(16, 4))
axes[0].imshow(edges, cmap='gray')
axes[0].set_title('Raw Canny Edges')
for i, (resp, angle) in enumerate(zip(gabor_individual, triplet)):
    r_norm = (resp / resp.max() * 255).astype(np.uint8)
    axes[i + 1].imshow(r_norm, cmap='hot')
    axes[i + 1].set_title(f'Gabor @ {angle:.1f}°')
for ax in axes:
    ax.axis('off')
plt.suptitle('Directional Gabor Filter Responses')
plt.tight_layout()

fig, axes = plt.subplots(1, 2, figsize=(14, 5))
axes[0].imshow(edges, cmap='gray')
axes[0].set_title('Raw Canny Edges')
axes[1].imshow(gabor_norm, cmap='hot')
axes[1].set_title('Combined Gabor Response (grid-enhanced)')
for ax in axes:
    ax.axis('off')
plt.tight_layout()

# %% [markdown]
# ## Step 6: Translation search via distance transform
#
# Use the Gabor-enhanced image to create a cleaner edge map,
# then build a distance transform and search for the best grid phase.

# %%
# Binarize the Gabor-enhanced image to get "grid edges"
gabor_thresh = cv2.threshold(gabor_norm, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]

# Also create edge map from the Gabor response
gabor_edges = cv2.Canny(gabor_norm, 30, 100)

# Use original edges for DT (more precise localization)
# but could also use gabor_edges for a cleaner signal
dt_input = edges  
dt_inv = cv2.bitwise_not(dt_input)
dt_map = cv2.distanceTransform(dt_inv, cv2.DIST_L2, 5)

fig, axes = plt.subplots(1, 3, figsize=(15, 4))
axes[0].imshow(gabor_edges, cmap='gray')
axes[0].set_title('Gabor-Enhanced Edges')
axes[1].imshow(dt_map, cmap='inferno')
axes[1].set_title('Distance Transform')
axes[2].imshow(work_gray, cmap='gray')
axes[2].set_title('Original')
for ax in axes:
    ax.axis('off')
plt.tight_layout()

# %%
# Grid rotation from the Hough triplet
# alpha is the first angle of the triplet; for flat-top hex, edge angle 0° = horizontal
# Grid rotation = alpha (how far the first edge family deviates from 0°)
# Normalize to [-30, 30] range
grid_rot = alpha
if grid_rot > 30:
    grid_rot -= 60

print(f"Grid rotation: {grid_rot:.1f}°")
print(f"Side length (working): {side_est:.1f}px")

# Determine flat-top vs pointy-top from the angle
# Flat-top: one edge family near 0° (horizontal)
# Pointy-top: one edge family near 90° (vertical)
min_angle_from_horiz = min(abs(a % 180) for a in triplet)
min_angle_from_vert = min(abs((a - 90) % 180) for a in triplet)
flat_top = min_angle_from_horiz < min_angle_from_vert
grid_type = 'hex_flat' if flat_top else 'hex_pointy'
print(f"Grid type: {grid_type}")

# %%
# Translation search
if flat_top:
    dx = 1.5 * side_est
    dy = np.sqrt(3) * side_est
else:
    dx = np.sqrt(3) * side_est
    dy = 1.5 * side_est

best_score = np.inf
best_origin = (0.0, 0.0)
n_steps = 20

print(f"Searching {n_steps}² = {n_steps**2} phase offsets...")
print(f"  dx={dx:.1f}, dy={dy:.1f}")

for oy_frac in np.linspace(0, 1, n_steps, endpoint=False):
    for ox_frac in np.linspace(0, 1, n_steps, endpoint=False):
        ox = ox_frac * dx
        oy = oy_frac * dy
        sc = score_grid_dt(dt_map, side_est, grid_rot, (ox, oy), flat_top, spacing=3.0)
        if sc < best_score:
            best_score = sc
            best_origin = (ox, oy)

print(f"Best origin: ({best_origin[0]:.1f}, {best_origin[1]:.1f}), score={best_score:.2f}")

# %% [markdown]
# ## Step 7: Nelder-Mead refinement

# %%
def objective(params):
    s, r, tx, ty = params
    if s < 5 or s > 200:
        return 1000.0
    return score_grid_dt(dt_map, s, r, (tx, ty), flat_top, spacing=3.0)

result = minimize(objective,
                  [side_est, grid_rot, best_origin[0], best_origin[1]],
                  method='Nelder-Mead',
                  options={'maxiter': 300, 'xatol': 0.05, 'fatol': 0.005})

if result.fun < best_score:
    side_final, rot_final = result.x[0], result.x[1]
    origin_final = (result.x[2], result.x[3])
    score_final = result.fun
    print(f"Refined: s={side_final:.1f}, rot={rot_final:.1f}°, "
          f"origin=({origin_final[0]:.1f},{origin_final[1]:.1f}), "
          f"score={score_final:.2f}")
else:
    side_final, rot_final = side_est, grid_rot
    origin_final = best_origin
    score_final = best_score
    print(f"Refinement did not improve. Using coarse result.")

# Scale back to full resolution
side_full = side_final / scale_factor
origin_full = (origin_final[0] / scale_factor, origin_final[1] / scale_factor)

print(f"\n{'='*50}")
print(f"FINAL RESULT (full resolution)")
print(f"  Grid type:   {grid_type}")
print(f"  Side length: {side_full:.1f}px")
print(f"  Rotation:    {rot_final:.1f}°")
print(f"  Origin:      ({origin_full[0]:.1f}, {origin_full[1]:.1f})")
print(f"  Score:       {score_final:.2f}")
print(f"  Ground truth: flat-top hex, s≈37.8px, rot≈0°")

# %% [markdown]
# ## Step 8: Visualization

# %%
params = GridParams(
    grid_type=grid_type,
    side_length=side_final,
    rotation_deg=rot_final,
    origin=origin_final,
)

# Overlay on working image
work_color = cv2.resize(img_color, (ww, wh))
vis_work = overlay_grid(work_color, params, color=(0, 255, 0), thickness=1)

fig, axes = plt.subplots(1, 2, figsize=(16, 6))
axes[0].imshow(cv2.cvtColor(work_color, cv2.COLOR_BGR2RGB))
axes[0].set_title('Original')
axes[1].imshow(cv2.cvtColor(vis_work, cv2.COLOR_BGR2RGB))
axes[1].set_title(f'{grid_type}, s={side_final:.1f}px (full: {side_full:.1f}), rot={rot_final:.1f}°')
for ax in axes:
    ax.axis('off')
plt.suptitle('Hough + Gabor Grid Detection', fontsize=14)
plt.tight_layout()

# %% [markdown]
# ## Pipeline Summary
#
# | Step | Method | Output |
# |------|--------|--------|
# | 1. Preprocess | Bilateral filter → Canny | Clean edge map |
# | 2. Angle detection | Hough lines → angle histogram | Dominant angles |
# | 3. Hex triplet | Maximize hist[α]+hist[α+60]+hist[α+120] | Grid orientation α |
# | 4. Scale estimation | 1D FFT of projections ⊥ each angle | Apothem → side length |
# | 5. Grid enhancement | Gabor filters at 3 angles | Grid-only signal |
# | 6. Translation | DT + exhaustive phase search | Grid origin (ox, oy) |
# | 7. Refinement | Nelder-Mead on (s, rot, tx, ty) | Final parameters |
