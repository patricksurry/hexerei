"""
Shared utilities for grid detection via frequency-domain analysis.

Functions for:
- Synthetic grid generation (hex flat-top, hex pointy-top, square)
- 2D FFT / power spectrum computation
- Spectral peak finding
- Lattice vector extraction and grid classification
- Phase-based translation recovery
- Visualization helpers
"""

import numpy as np
import cv2
from dataclasses import dataclass


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class GridParams:
    """Detected grid parameters."""
    grid_type: str          # 'hex_flat', 'hex_pointy', 'square'
    side_length: float      # pixel size of one grid cell side
    rotation_deg: float     # grid rotation in degrees
    origin: tuple[float, float]  # (x, y) pixel position of grid origin
    lattice_vectors: tuple[np.ndarray, np.ndarray] | None = None


# ---------------------------------------------------------------------------
# Synthetic grid generation
# ---------------------------------------------------------------------------

def make_hex_grid(w: int, h: int, side: float, rotation_deg: float = 0.0,
                  origin: tuple[float, float] = (0.0, 0.0),
                  flat_top: bool = True, line_width: int = 1,
                  color: int = 0, bg: int = 255) -> np.ndarray:
    """
    Draw a synthetic hex grid on a white image.

    For flat-top hexes:
      - column spacing dx = 1.5 * side
      - row spacing    dy = sqrt(3) * side
      - odd columns offset by dy/2

    For pointy-top hexes:
      - row spacing    dy = 1.5 * side
      - column spacing dx = sqrt(3) * side
      - odd rows offset by dx/2

    The triangle mesh underlying the hex grid has three families of
    parallel lines at 0, 60, 120 degrees (flat-top) or 30, 90, 150 (pointy-top).
    """
    img = np.full((h, w), bg, dtype=np.uint8)

    # Compute hex vertices and draw edges
    s = side
    if flat_top:
        dx = 1.5 * s
        dy = np.sqrt(3) * s
    else:
        dx = np.sqrt(3) * s
        dy = 1.5 * s

    rot_rad = np.radians(rotation_deg)
    cos_r, sin_r = np.cos(rot_rad), np.sin(rot_rad)
    ox, oy = origin

    # Determine range of grid indices needed to cover image
    diag = np.hypot(w, h)
    n_cols = int(diag / dx) + 4
    n_rows = int(diag / dy) + 4

    def rotate_point(x, y):
        """Rotate (x, y) around origin then translate."""
        rx = cos_r * x - sin_r * y + ox
        ry = sin_r * x + cos_r * y + oy
        return rx, ry

    def hex_corners(cx, cy):
        """Return 6 corners of a hex centered at (cx, cy) in local coords."""
        corners = []
        for k in range(6):
            if flat_top:
                angle = np.radians(60 * k)
            else:
                angle = np.radians(60 * k + 30)
            corners.append((cx + s * np.cos(angle), cy + s * np.sin(angle)))
        return corners

    drawn_edges = set()

    for col in range(-n_cols, n_cols):
        for row in range(-n_rows, n_rows):
            if flat_top:
                cx = col * dx
                cy = row * dy + (col % 2) * dy / 2
            else:
                cx = col * dx + (row % 2) * dx / 2
                cy = row * dy

            corners = hex_corners(cx, cy)
            for i in range(6):
                p1_local = corners[i]
                p2_local = corners[(i + 1) % 6]

                # Deduplicate edges by rounding endpoints
                key = tuple(sorted([
                    (round(p1_local[0], 1), round(p1_local[1], 1)),
                    (round(p2_local[0], 1), round(p2_local[1], 1))
                ]))
                if key in drawn_edges:
                    continue
                drawn_edges.add(key)

                p1 = rotate_point(*p1_local)
                p2 = rotate_point(*p2_local)

                # Clip check
                if (max(p1[0], p2[0]) < -s or min(p1[0], p2[0]) > w + s or
                    max(p1[1], p2[1]) < -s or min(p1[1], p2[1]) > h + s):
                    continue

                cv2.line(img,
                         (int(round(p1[0])), int(round(p1[1]))),
                         (int(round(p2[0])), int(round(p2[1]))),
                         color, line_width, cv2.LINE_AA)

    return img


def make_square_grid(w: int, h: int, cell_size: float,
                     rotation_deg: float = 0.0,
                     origin: tuple[float, float] = (0.0, 0.0),
                     line_width: int = 1,
                     color: int = 0, bg: int = 255) -> np.ndarray:
    """Draw a synthetic square grid."""
    img = np.full((h, w), bg, dtype=np.uint8)

    rot_rad = np.radians(rotation_deg)
    cos_r, sin_r = np.cos(rot_rad), np.sin(rot_rad)
    ox, oy = origin

    diag = np.hypot(w, h)
    n = int(diag / cell_size) + 4

    def rotate_point(x, y):
        return cos_r * x - sin_r * y + ox, sin_r * x + cos_r * y + oy

    # Horizontal lines
    for i in range(-n, n):
        y = i * cell_size
        p1 = rotate_point(-diag, y)
        p2 = rotate_point(diag, y)
        cv2.line(img, (int(round(p1[0])), int(round(p1[1]))),
                 (int(round(p2[0])), int(round(p2[1]))),
                 color, line_width, cv2.LINE_AA)

    # Vertical lines
    for i in range(-n, n):
        x = i * cell_size
        p1 = rotate_point(x, -diag)
        p2 = rotate_point(x, diag)
        cv2.line(img, (int(round(p1[0])), int(round(p1[1]))),
                 (int(round(p2[0])), int(round(p2[1]))),
                 color, line_width, cv2.LINE_AA)

    return img


# ---------------------------------------------------------------------------
# FFT / Power Spectrum
# ---------------------------------------------------------------------------

def compute_power_spectrum(img: np.ndarray,
                           window: str = 'hann',
                           pad_factor: float = 1.0,
                           log_scale: bool = True) -> tuple[np.ndarray, np.ndarray]:
    """
    Compute the 2D power spectrum of a grayscale image.

    Parameters
    ----------
    img : 2D uint8 or float array
    window : 'hann', 'tukey', or 'none'
    pad_factor : multiply dimensions by this before FFT (1.0 = no padding)
    log_scale : if True, return log(1 + |F|^2)

    Returns
    -------
    power : 2D array, shifted so DC is at center
    fft_complex : complex 2D array (shifted), for phase recovery
    """
    img_f = img.astype(np.float64)
    h, w = img_f.shape

    # Apply window
    if window == 'hann':
        win_y = np.hanning(h)
        win_x = np.hanning(w)
        win_2d = np.outer(win_y, win_x)
        img_f = img_f * win_2d
    elif window == 'tukey':
        from scipy.signal.windows import tukey
        win_y = tukey(h, alpha=0.1)
        win_x = tukey(w, alpha=0.1)
        win_2d = np.outer(win_y, win_x)
        img_f = img_f * win_2d

    # Zero-pad
    if pad_factor > 1.0:
        ph = int(h * pad_factor)
        pw = int(w * pad_factor)
        padded = np.zeros((ph, pw), dtype=np.float64)
        padded[:h, :w] = img_f
        img_f = padded

    # FFT
    f = np.fft.fft2(img_f)
    fshift = np.fft.fftshift(f)

    power = np.abs(fshift) ** 2
    if log_scale:
        power = np.log1p(power)

    return power, fshift


# ---------------------------------------------------------------------------
# Peak finding in power spectrum
# ---------------------------------------------------------------------------

def find_spectral_peaks(power: np.ndarray,
                        min_radius: float = 5.0,
                        max_radius: float | None = None,
                        n_peaks: int = 12,
                        exclude_radius: float = 3.0) -> np.ndarray:
    """
    Find bright peaks in the power spectrum, excluding the DC component.

    Parameters
    ----------
    power : 2D power spectrum (DC at center)
    min_radius : minimum distance from DC to consider
    max_radius : maximum distance from DC (default: half the smaller dimension)
    n_peaks : number of peaks to return
    exclude_radius : radius around each found peak to suppress

    Returns
    -------
    peaks : (n_peaks, 3) array of (row, col, value) sorted by value descending
    """
    from skimage.feature import peak_local_max

    h, w = power.shape
    cy, cx = h // 2, w // 2

    if max_radius is None:
        max_radius = min(h, w) / 2 - 5

    # Create mask: annular region excluding DC
    yy, xx = np.ogrid[:h, :w]
    r = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    mask = (r >= min_radius) & (r <= max_radius)

    # Mask the power spectrum
    masked = power.copy()
    masked[~mask] = 0

    # Find peaks
    coords = peak_local_max(masked, min_distance=int(exclude_radius),
                            num_peaks=n_peaks, threshold_rel=0.1)

    if len(coords) == 0:
        return np.array([]).reshape(0, 3)

    values = power[coords[:, 0], coords[:, 1]]
    order = np.argsort(-values)
    coords = coords[order]
    values = values[order]

    result = np.column_stack([coords, values])
    return result[:n_peaks]


def peaks_to_frequency_vectors(peaks: np.ndarray,
                               image_shape: tuple[int, int]) -> list[np.ndarray]:
    """
    Convert peak positions (row, col) in the power spectrum to
    frequency vectors (fx, fy) in cycles/pixel.

    Parameters
    ----------
    peaks : (N, 3) array from find_spectral_peaks
    image_shape : (H, W) of the power spectrum

    Returns
    -------
    freq_vectors : list of (fx, fy) arrays in cycles/pixel
    """
    h, w = image_shape
    cy, cx = h // 2, w // 2

    vectors = []
    for row, col, _ in peaks:
        # Frequency in cycles/pixel
        fx = (col - cx) / w
        fy = (row - cy) / h
        vectors.append(np.array([fx, fy]))

    return vectors


# ---------------------------------------------------------------------------
# Lattice vector extraction
# ---------------------------------------------------------------------------

def peaks_to_lattice_vectors(peaks: np.ndarray,
                             image_shape: tuple[int, int]) -> tuple[np.ndarray, np.ndarray]:
    """
    Extract the two fundamental lattice vectors from spectral peaks.

    The peaks come in conjugate pairs (symmetric about DC). We take
    peaks in one half-plane, find the two shortest independent frequency
    vectors, then convert to spatial lattice vectors.

    Returns
    -------
    a1, a2 : spatial lattice vectors in pixels
    """
    h, w = image_shape
    cy, cx = h // 2, w // 2

    # Take only peaks with positive fy (or fy=0 and positive fx)
    half_peaks = []
    for row, col, val in peaks:
        fy = row - cy
        fx = col - cx
        if fy > 0 or (fy == 0 and fx > 0):
            half_peaks.append((fx, fy, val))

    if len(half_peaks) < 2:
        raise ValueError(f"Need at least 2 peaks in half-plane, got {len(half_peaks)}")

    # Sort by distance from DC
    half_peaks.sort(key=lambda p: p[0]**2 + p[1]**2)

    # First vector: shortest
    f1 = np.array([half_peaks[0][0], half_peaks[0][1]])

    # Second vector: shortest that's not parallel to f1
    f2 = None
    for fx, fy, val in half_peaks[1:]:
        candidate = np.array([fx, fy])
        # Check independence: cross product should be non-negligible
        cross = abs(f1[0] * candidate[1] - f1[1] * candidate[0])
        if cross > 0.5 * np.linalg.norm(f1) * np.linalg.norm(candidate) * np.sin(np.radians(20)):
            f2 = candidate
            break

    if f2 is None:
        raise ValueError("Could not find second independent frequency vector")

    # Convert frequency vectors to spatial lattice vectors
    # If f is in pixels (offset from DC in the DFT), then the spatial
    # period vector is perpendicular with magnitude N/|f|.
    # More precisely: frequency vector (fx, fy) in DFT bins corresponds
    # to spatial period T = N / |f| along direction of f.
    # The spatial lattice vector is: a = (fx, fy) * (N^2 / |f|^2) ... no.
    #
    # Actually, the relationship is:
    #   If we have frequency peaks at f1 and f2 (in DFT bins),
    #   the real-space lattice vectors a1, a2 satisfy:
    #     a1 . f1 = N, a1 . f2 = 0  (where N = image size in that direction)
    #     a2 . f1 = 0, a2 . f2 = N
    #   This is the reciprocal lattice relationship.
    #
    # For a non-square image, we need to be more careful.
    # f1 = (fx1, fy1) in DFT bins means frequency (fx1/W, fy1/H) in cycles/pixel.
    # The spatial lattice vectors satisfy: ai . fj = delta_ij
    # where fj is in cycles/pixel.

    # Convert to cycles/pixel
    f1_cpp = np.array([f1[0] / w, f1[1] / h])
    f2_cpp = np.array([f2[0] / w, f2[1] / h])

    # Reciprocal lattice: [a1; a2] = inv([f1; f2]^T)
    F = np.array([f1_cpp, f2_cpp]).T  # 2x2 matrix with f vectors as columns
    A = np.linalg.inv(F).T  # rows are spatial lattice vectors

    a1 = A[0]
    a2 = A[1]

    return a1, a2


# ---------------------------------------------------------------------------
# Grid classification
# ---------------------------------------------------------------------------

def classify_grid(a1: np.ndarray, a2: np.ndarray) -> str:
    """
    Classify grid type from two lattice vectors.

    Hex grid: |a1| ≈ |a2|, angle between them ≈ 60° or 120°
    Square grid: |a1| ≈ |a2|, angle ≈ 90°

    Returns 'hex_flat', 'hex_pointy', or 'square'.
    """
    len1 = np.linalg.norm(a1)
    len2 = np.linalg.norm(a2)
    ratio = max(len1, len2) / min(len1, len2)

    cos_angle = np.dot(a1, a2) / (len1 * len2)
    angle = np.degrees(np.arccos(np.clip(cos_angle, -1, 1)))

    # Hex: angle ≈ 60° or 120°, ratio ≈ 1
    if ratio < 1.3 and (abs(angle - 60) < 15 or abs(angle - 120) < 15):
        # Determine flat-top vs pointy-top from orientation
        # Flat-top: one lattice vector is approximately horizontal
        # Pointy-top: one lattice vector is approximately vertical
        angles_from_x = [np.degrees(np.arctan2(a1[1], a1[0])) % 60,
                         np.degrees(np.arctan2(a2[1], a2[0])) % 60]
        min_angle = min(angles_from_x)
        if min_angle < 15 or min_angle > 45:
            return 'hex_flat'
        else:
            return 'hex_pointy'

    # Square: angle ≈ 90°, ratio ≈ 1
    if ratio < 1.3 and abs(angle - 90) < 15:
        return 'square'

    # Rectangular or unknown - default to hex
    return 'hex_flat'


def lattice_to_grid_params(a1: np.ndarray, a2: np.ndarray,
                           grid_type: str) -> tuple[float, float]:
    """
    Extract side length and rotation from lattice vectors.

    Parameters
    ----------
    a1, a2 : spatial lattice vectors in pixels
    grid_type : 'hex_flat', 'hex_pointy', or 'square'

    Returns
    -------
    side_length : in pixels
    rotation_deg : grid rotation in degrees
    """
    if grid_type.startswith('hex'):
        # For hex grids, the lattice vectors correspond to the
        # center-to-center distances. The side length s relates to
        # lattice vector magnitude |a| by:
        #   |a| = sqrt(3) * s  (for the row-spacing direction)
        #   |a| = sqrt(3) * s  (both vectors same length in regular hex)
        # Actually for a triangle mesh with side s, both lattice vectors
        # have length s. For hex grid (dual), lattice vectors have
        # length sqrt(3)*s where s is the hex side.
        #
        # The relationship depends on whether we're looking at the
        # triangle mesh or the hex dual. Since our FFT detects the
        # line pattern (triangle mesh), the lattice spacing IS the
        # triangle side length, which equals the hex side length.
        avg_len = (np.linalg.norm(a1) + np.linalg.norm(a2)) / 2
        side_length = avg_len

        # Rotation: angle of first lattice vector
        # For flat-top hex, one set of lines is horizontal (0°)
        # For pointy-top, one set is vertical (90°)
        angle1 = np.degrees(np.arctan2(a1[1], a1[0]))
        angle2 = np.degrees(np.arctan2(a2[1], a2[0]))

        # The grid rotation is the deviation of the nearest lattice
        # direction from its expected angle
        if grid_type == 'hex_flat':
            # Expected directions: 0°, 60°, 120° (or equivalently 0°, ±60°)
            rotation_deg = angle1 % 60
            if rotation_deg > 30:
                rotation_deg -= 60
        else:
            # Pointy-top: expected directions: 30°, 90°, 150°
            rotation_deg = (angle1 - 30) % 60
            if rotation_deg > 30:
                rotation_deg -= 60

    elif grid_type == 'square':
        avg_len = (np.linalg.norm(a1) + np.linalg.norm(a2)) / 2
        side_length = avg_len
        angle1 = np.degrees(np.arctan2(a1[1], a1[0]))
        rotation_deg = angle1 % 90
        if rotation_deg > 45:
            rotation_deg -= 90
    else:
        raise ValueError(f"Unknown grid type: {grid_type}")

    return side_length, rotation_deg


# ---------------------------------------------------------------------------
# Phase recovery (translation)
# ---------------------------------------------------------------------------

def recover_translation(fft_complex: np.ndarray,
                        peaks: np.ndarray,
                        image_shape: tuple[int, int]) -> tuple[float, float]:
    """
    Recover grid translation from phase at peak frequencies.

    The phase of the FFT at a peak frequency encodes the position
    of the grid relative to the image origin, modulo one grid cell.

    Parameters
    ----------
    fft_complex : shifted complex FFT (from compute_power_spectrum)
    peaks : (N, 3) peak array
    image_shape : (H, W)

    Returns
    -------
    tx, ty : translation in pixels (modulo cell size)
    """
    h, w = image_shape
    cy, cx = h // 2, w // 2

    if len(peaks) < 2:
        return 0.0, 0.0

    # Use the two strongest peaks
    p1_row, p1_col = int(peaks[0, 0]), int(peaks[0, 1])
    p2_row, p2_col = int(peaks[1, 0]), int(peaks[1, 1])

    phase1 = np.angle(fft_complex[p1_row, p1_col])
    phase2 = np.angle(fft_complex[p2_row, p2_col])

    # Frequency vectors in cycles/pixel
    f1 = np.array([(p1_col - cx) / w, (p1_row - cy) / h])
    f2 = np.array([(p2_col - cx) / w, (p2_row - cy) / h])

    # Phase = 2*pi * (f . t) where t is the translation
    # So: [phase1; phase2] = 2*pi * [f1; f2] . [tx; ty]
    # Solve for t:
    F = np.array([f1, f2])
    phases = np.array([phase1, phase2]) / (2 * np.pi)

    try:
        t = np.linalg.solve(F, phases)
        return t[0], t[1]
    except np.linalg.LinAlgError:
        return 0.0, 0.0


# ---------------------------------------------------------------------------
# Polar analysis helpers
# ---------------------------------------------------------------------------

def radial_profile(power: np.ndarray,
                   min_radius: float = 1.0,
                   max_radius: float | None = None) -> tuple[np.ndarray, np.ndarray]:
    """
    Compute the radial profile (azimuthal average) of the power spectrum.

    Returns arrays of (radius, mean_power_at_radius).
    """
    h, w = power.shape
    cy, cx = h // 2, w // 2
    if max_radius is None:
        max_radius = min(h, w) / 2 - 1

    yy, xx = np.ogrid[:h, :w]
    r = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)

    # Bin by integer radius
    r_int = np.round(r).astype(int)
    max_r = int(max_radius)
    min_r = max(1, int(min_radius))

    radii = np.arange(min_r, max_r + 1)
    profile = np.zeros(len(radii))

    for i, ri in enumerate(radii):
        mask = r_int == ri
        if np.any(mask):
            profile[i] = np.mean(power[mask])

    return radii.astype(float), profile


def angular_profile(power: np.ndarray,
                    radius: float,
                    width: float = 3.0,
                    n_bins: int = 360) -> tuple[np.ndarray, np.ndarray]:
    """
    Compute the angular profile of the power spectrum at a given radius.

    Parameters
    ----------
    power : 2D power spectrum (DC at center)
    radius : radius at which to sample
    width : radial band width (± from radius)
    n_bins : number of angular bins

    Returns
    -------
    angles : array of angles in degrees [0, 360)
    profile : power at each angle
    """
    h, w = power.shape
    cy, cx = h // 2, w // 2

    yy, xx = np.ogrid[:h, :w]
    r = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    theta = np.degrees(np.arctan2(yy - cy, xx - cx)) % 360

    # Annular mask
    mask = (r >= radius - width) & (r <= radius + width)

    angles = np.linspace(0, 360, n_bins, endpoint=False)
    profile = np.zeros(n_bins)
    bin_width = 360 / n_bins

    theta_vals = theta[mask]
    power_vals = power[mask]

    for i, a in enumerate(angles):
        # Wrap-aware angular bin
        lo = a - bin_width / 2
        hi = a + bin_width / 2
        if lo < 0:
            in_bin = (theta_vals >= lo + 360) | (theta_vals < hi)
        elif hi >= 360:
            in_bin = (theta_vals >= lo) | (theta_vals < hi - 360)
        else:
            in_bin = (theta_vals >= lo) & (theta_vals < hi)

        if np.any(in_bin):
            profile[i] = np.mean(power_vals[in_bin])

    return angles, profile


# ---------------------------------------------------------------------------
# Fast grid scoring (point-sampling, no rendering)
# ---------------------------------------------------------------------------

def hex_grid_sample_points(w: int, h: int, side: float,
                           rotation_deg: float = 0.0,
                           origin: tuple[float, float] = (0.0, 0.0),
                           flat_top: bool = True,
                           spacing: float = 3.0) -> np.ndarray:
    """
    Generate sample points along hex grid edges without rendering an image.

    Uses the triangle-mesh decomposition: a hex grid is three families of
    parallel lines at 0/60/120 degrees (flat-top) or 30/90/150 (pointy-top).
    This is O(n_lines * points_per_line) — much faster than iterating over
    all hex cells.

    Parameters
    ----------
    w, h : image dimensions
    side : hex side length in pixels
    rotation_deg : grid rotation
    origin : (ox, oy) grid origin offset
    flat_top : True for flat-top hexes
    spacing : distance between sample points along edges (pixels)

    Returns
    -------
    points : (N, 2) array of (x, y) coordinates of sample points
    """
    s = side
    rot_rad = np.radians(rotation_deg)
    cos_r, sin_r = np.cos(rot_rad), np.sin(rot_rad)
    ox, oy = origin

    # For flat-top hex, the triangle mesh has three line families at 0°, 60°, 120°.
    # Line spacing (perpendicular distance between parallel lines) = sqrt(3)/2 * s
    # For pointy-top, families are at 30°, 90°, 150°.
    line_spacing = np.sqrt(3) / 2 * s

    if flat_top:
        base_angles_deg = [0.0, 60.0, 120.0]
    else:
        base_angles_deg = [30.0, 90.0, 150.0]

    diag = np.hypot(w, h)
    # How many lines we need in each family to cover the image
    n_lines = int(diag / line_spacing) + 4

    # Number of sample points per line crossing the image
    n_pts = max(2, int(2 * diag / spacing))
    ts = np.linspace(-diag, diag, n_pts)

    all_points = []

    for base_angle in base_angles_deg:
        angle_rad = np.radians(base_angle + rotation_deg)
        # Direction along the line
        lx, ly = np.cos(angle_rad), np.sin(angle_rad)
        # Normal direction (perpendicular)
        nx, ny = -ly, lx

        for i in range(-n_lines, n_lines + 1):
            # Offset from origin along the normal
            offset = i * line_spacing
            # Line center in local coords (shifted by origin)
            cx = ox + offset * nx
            cy = oy + offset * ny

            # Sample points along this line
            xs = cx + ts * lx
            ys = cy + ts * ly

            # Keep only in-bounds
            valid = (xs >= 0) & (xs < w) & (ys >= 0) & (ys < h)
            if np.any(valid):
                all_points.append(np.column_stack([xs[valid], ys[valid]]))

    if not all_points:
        return np.array([]).reshape(0, 2)
    return np.concatenate(all_points, axis=0)


def score_grid_dt(dt_map: np.ndarray, side: float,
                  rotation_deg: float = 0.0,
                  origin: tuple[float, float] = (0.0, 0.0),
                  flat_top: bool = True,
                  spacing: float = 3.0) -> float:
    """
    Score a grid hypothesis against a distance transform.

    Lower score = grid lines are closer to image edges = better fit.

    Parameters
    ----------
    dt_map : distance transform of inverted edge image
    side, rotation_deg, origin, flat_top : grid parameters
    spacing : sample point spacing along edges

    Returns
    -------
    mean distance of grid sample points to nearest edge
    """
    h, w = dt_map.shape
    pts = hex_grid_sample_points(w, h, side, rotation_deg, origin,
                                 flat_top, spacing)
    if len(pts) == 0:
        return 1000.0

    xs = pts[:, 0].astype(int)
    ys = pts[:, 1].astype(int)
    return float(np.mean(dt_map[ys, xs]))


# ---------------------------------------------------------------------------
# Visualization
# ---------------------------------------------------------------------------

def overlay_grid(image: np.ndarray, params: GridParams,
                 color: tuple[int, int, int] = (0, 255, 0),
                 thickness: int = 1) -> np.ndarray:
    """Draw detected grid overlay on an image."""
    if len(image.shape) == 2:
        vis = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
    else:
        vis = image.copy()

    h, w = vis.shape[:2]
    s = params.side_length
    rot = params.rotation_deg
    ox, oy = params.origin

    if params.grid_type == 'square':
        grid = make_square_grid(w, h, s, rot, (ox, oy), thickness, color=0)
        mask = grid < 128
        vis[mask] = color
    else:
        flat_top = params.grid_type == 'hex_flat'
        grid = make_hex_grid(w, h, s, rot, (ox, oy), flat_top=flat_top,
                             line_width=thickness, color=0)
        mask = grid < 128
        vis[mask] = color

    return vis


def plot_power_spectrum(power: np.ndarray, peaks: np.ndarray | None = None,
                        title: str = 'Power Spectrum',
                        ax=None):
    """
    Display the power spectrum with optional peak annotations.

    Returns the matplotlib axes for further customization.
    """
    import matplotlib.pyplot as plt

    if ax is None:
        fig, ax = plt.subplots(1, 1, figsize=(8, 8))

    h, w = power.shape

    # Display with reasonable dynamic range
    vmax = np.percentile(power, 99.5)
    ax.imshow(power, cmap='inferno', vmax=vmax,
              extent=[-w//2, w//2, h//2, -h//2])

    if peaks is not None and len(peaks) > 0:
        cy, cx = h // 2, w // 2
        px = peaks[:, 1] - cx
        py = peaks[:, 0] - cy
        ax.plot(px, py, 'g+', markersize=12, markeredgewidth=2)
        for i, (r, c, v) in enumerate(peaks):
            ax.annotate(f'{i}', (c - cx + 2, r - cy - 2),
                        color='lime', fontsize=8)

    ax.set_title(title)
    ax.set_xlabel('Frequency (pixels)')
    ax.set_ylabel('Frequency (pixels)')

    return ax
