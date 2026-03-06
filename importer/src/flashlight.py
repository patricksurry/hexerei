import numpy as np
import cv2
from scipy.ndimage import gaussian_gradient_magnitude
from skimage.feature import peak_local_max

from grid_utils import (
    compute_power_spectrum,
    classify_grid,
    lattice_to_grid_params,
    GridParams
)

def preprocess(img_gray, sigma=1.5):
    """Edge-enhance via gradient magnitude."""
    grad = gaussian_gradient_magnitude(img_gray.astype(float), sigma=sigma)
    return np.clip(grad, 0, 255).astype(np.uint8)

def compute_autocorrelation(img, window='hann'):
    """2D autocorrelation via Wiener-Khinchin."""
    img_f = img.astype(np.float64)
    h, w = img_f.shape
    if window == 'hann':
        win = np.outer(np.hanning(h), np.hanning(w))
        img_f = img_f * win
    img_f -= img_f.mean()
    F = np.fft.fft2(img_f)
    power = np.abs(F) ** 2
    acorr = np.real(np.fft.ifft2(power))
    acorr = np.fft.fftshift(acorr)
    if acorr.max() > 0:
        acorr /= acorr.max()
    return acorr

def extract_lattice_from_autocorr(img, min_distance=10, min_vector_len=10):
    """
    Extract two fundamental lattice vectors from autocorrelation.
    Returns (v1, v2, peak_strength) where peak_strength is a confidence measure.
    """
    acorr = compute_autocorrelation(img)
    h, w = acorr.shape
    cy, cx = h // 2, w // 2
    
    # Mask center
    masked = acorr.copy()
    yy, xx = np.ogrid[:h, :w]
    r = np.sqrt((xx - cx)**2 + (yy - cy)**2)
    masked[r < min_distance] = 0
    
    coords = peak_local_max(masked, min_distance=min_distance,
                            num_peaks=30, threshold_rel=0.05)
    
    if len(coords) == 0:
        raise ValueError('No autocorrelation peaks found')
    
    # Get vectors in upper half-plane (to avoid conjugate duplicates)
    vectors = []
    for row, col in coords:
        dx, dy = float(col - cx), float(row - cy)
        dist = np.hypot(dx, dy)
        if dist < min_vector_len:
            continue
        val = acorr[row, col]
        if dy < 0 or (dy == 0 and dx > 0):
            vectors.append((dx, dy, val, dist))
            
    vectors.sort(key=lambda v: v[3])  # Sort by distance
    
    if len(vectors) < 2:
        raise ValueError(f'Found {len(vectors)} vectors, need >= 2')
        
    v1 = np.array([vectors[0][0], vectors[0][1]])
    v1_strength = vectors[0][2]
    
    # Find shortest independent vector
    v2 = None
    v2_strength = 0
    for dx, dy, val, dist in vectors[1:]:
        candidate = np.array([dx, dy])
        cross = abs(v1[0] * candidate[1] - v1[1] * candidate[0])
        if cross > 0.34 * np.linalg.norm(v1) * np.linalg.norm(candidate):
            v2 = candidate
            v2_strength = val
            break
            
    if v2 is None:
        raise ValueError('No independent second vector found')
        
    # Confidence: geometric mean of the two peak strengths
    confidence = np.sqrt(v1_strength * v2_strength)
    
    return v1, v2, confidence

def measure_patch_snr(img_patch):
    """
    Measure how strongly periodic the patch is by comparing
    the strongest autocorrelation peaks to the background level.
    """
    acorr = compute_autocorrelation(img_patch)
    h, w = acorr.shape
    cy, cx = h // 2, w // 2
    
    yy, xx = np.ogrid[:h, :w]
    r = np.sqrt((xx - cx)**2 + (yy - cy)**2)
    
    # Background: annular region away from center
    min_r = min(h, w) // 8
    max_r = min(h, w) // 3
    annulus = (r >= min_r) & (r <= max_r)
    
    if not np.any(annulus):
        return 0.0
        
    bg_std = np.std(acorr[annulus])
    bg_mean = np.mean(acorr[annulus])
    
    peak_val = np.max(acorr[annulus])
    
    if bg_std < 1e-10:
        return 0.0
        
    return (peak_val - bg_mean) / bg_std

def gaussian_spotlight(img_gray, cx, cy, sigma):
    """Apply a Gaussian spotlight to the image with reflection padding handling."""
    h, w = img_gray.shape
    # We use a bounding box approach so we don't multiply the full image if it's large,
    # but for simplicity, we do full image if it's not huge.
    yy, xx = np.ogrid[:h, :w]
    gauss = np.exp(-((xx - cx)**2 + (yy - cy)**2) / (2 * sigma**2))
    return img_gray.astype(float) * gauss

def sample_spotlights(img_gray, n_samples=30, sigma=None, rng=None):
    """
    Generate Gaussian-weighted views of the full image at random positions.
    Returns list of (weighted_image, cx, cy, sigma) tuples.
    """
    if rng is None:
        rng = np.random.default_rng(42)
        
    h, w = img_gray.shape
    if sigma is None:
        sigma = min(h, w) / 4
        
    margin = sigma * 0.5
    
    samples = []
    for _ in range(n_samples):
        # We can sample near edges, the reflection padding isn't strictly needed 
        # if we just run the spotlight on the padded image, but let's keep it simple first
        # and sample within the image.
        cx = float(rng.uniform(-margin, w + margin))
        cy = float(rng.uniform(-margin, h + margin))
        
        # We can add reflection padding if we're sampling near edges
        pad_size = int(sigma)
        padded = cv2.copyMakeBorder(img_gray, pad_size, pad_size, pad_size, pad_size, cv2.BORDER_REFLECT)
        
        padded_cx = cx + pad_size
        padded_cy = cy + pad_size
        
        # Apply spotlight on padded
        ph, pw = padded.shape
        yy, xx = np.ogrid[:ph, :pw]
        gauss = np.exp(-((xx - padded_cx)**2 + (yy - padded_cy)**2) / (2 * sigma**2))
        weighted_padded = padded.astype(float) * gauss
        
        # Crop back to original size for consistency, or keep padded.
        # It's better to keep padded and just extract the useful window.
        # But for FFT we want a power-of-two or similar nice size.
        # Let's extract a 4*sigma x 4*sigma window around the center to speed up FFT.
        win_size = int(4 * sigma)
        x0 = int(padded_cx - win_size // 2)
        y0 = int(padded_cy - win_size // 2)
        x1 = x0 + win_size
        y1 = y0 + win_size
        
        # Ensure we don't go out of padded bounds
        x0_c = max(0, x0)
        y0_c = max(0, y0)
        x1_c = min(pw, x1)
        y1_c = min(ph, y1)
        
        weighted_crop = weighted_padded[y0_c:y1_c, x0_c:x1_c]
        
        samples.append((weighted_crop, cx, cy, sigma))
        
    return samples

def analyze_spotlight(weighted_img, min_distance=None):
    h, w = weighted_img.shape
    
    if min_distance is None:
        min_distance = max(8, min(h, w) // 40)
        
    processed = preprocess(weighted_img.astype(np.uint8), sigma=1.5)
    
    try:
        v1, v2, confidence = extract_lattice_from_autocorr(
            processed, min_distance=min_distance,
            min_vector_len=min_distance)
            
        grid_type = classify_grid(v1, v2)
        side, rotation = lattice_to_grid_params(v1, v2, grid_type)
        
        min_dim = min(h, w)
        if side < min_dim * 0.01 or side > min_dim * 0.3:
            return None
            
        snr = measure_patch_snr(processed)
        
        return {
            'v1': v1, 'v2': v2,
            'grid_type': grid_type,
            'side': side,
            'rotation': rotation,
            'confidence': confidence,
            'snr': snr,
        }
    except ValueError:
        return None

def combine_votes(votes, side_tolerance=0.15, angle_tolerance=5.0):
    """Cluster patch votes in (side, rotation) space and find the dominant cluster."""
    if not votes:
        raise ValueError('No votes to combine')
        
    sorted_votes = sorted(votes, key=lambda v: v['snr'], reverse=True)
    
    clusters = []
    assigned = [False] * len(sorted_votes)
    
    for i, vote in enumerate(sorted_votes):
        if assigned[i]:
            continue
            
        cluster = {
            'members': [vote],
            'indices': [i],
        }
        assigned[i] = True
        
        for j, other in enumerate(sorted_votes):
            if assigned[j]:
                continue
                
            side_match = abs(vote['side'] - other['side']) / vote['side'] < side_tolerance
            
            rot_diff = abs(vote['rotation'] - other['rotation'])
            rot_diff = min(rot_diff, 60 - rot_diff)  # Hex symmetry: 60 deg period
            rot_match = rot_diff < angle_tolerance
            
            if side_match and rot_match:
                cluster['members'].append(other)
                cluster['indices'].append(j)
                assigned[j] = True
                
        members = cluster['members']
        weights = np.array([m['snr'] for m in members])
        if weights.sum() > 0:
            weights = weights / weights.sum()
        else:
            weights = np.ones(len(members)) / len(members)
            
        cluster['side'] = float(np.average([m['side'] for m in members], weights=weights))
        cluster['rotation'] = float(np.average([m['rotation'] for m in members], weights=weights))
        cluster['weight'] = float(np.sum([m['snr'] for m in members]))
        cluster['n_votes'] = len(members)
        
        type_weights = {}
        for m, w in zip(members, weights):
            type_weights[m['grid_type']] = type_weights.get(m['grid_type'], 0) + w
        cluster['grid_type'] = max(type_weights, key=type_weights.get)
        
        clusters.append(cluster)
        
    clusters.sort(key=lambda c: c['weight'], reverse=True)
    return clusters[0], clusters

def run_flashlight_analysis(img_gray, n_samples=30, scale_factor=1.0):
    """
    End-to-end flashlight sampling and consensus.
    """
    h, w = img_gray.shape
    sigma = min(h, w) / 4
    
    spotlights = sample_spotlights(img_gray, n_samples=n_samples, sigma=sigma)
    
    votes = []
    failures = 0
    for weighted_crop, cx, cy, sig in spotlights:
        result = analyze_spotlight(weighted_crop)
        if result is not None:
            # Coordinates in original scale
            result['cx'] = cx / scale_factor
            result['cy'] = cy / scale_factor
            result['sigma'] = sig / scale_factor
            # Also scale side length and lattice vectors to original image scale
            result['side'] = result['side'] / scale_factor
            result['v1'] = result['v1'] / scale_factor
            result['v2'] = result['v2'] / scale_factor
            votes.append(result)
        else:
            failures += 1
            
    if len(votes) < 3:
        raise ValueError(f'Only {len(votes)} spotlights succeeded, need >= 3')
        
    best_cluster, all_clusters = combine_votes(votes)
    
    return best_cluster, all_clusters, votes
