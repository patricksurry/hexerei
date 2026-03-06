import cv2
import numpy as np
import scipy.optimize
import argparse
from grid_model import GridModel
import scipy.signal

def resize_img(img, width=1000):
    h, w = img.shape[:2]
    scale = width / w
    return cv2.resize(img, (width, int(h*scale))), scale

def estimate_scale_fft(edge_map):
    # FFT
    proj_x = np.sum(edge_map, axis=0)
    proj_y = np.sum(edge_map, axis=1)
    
    proj_x = proj_x - np.mean(proj_x)
    proj_y = proj_y - np.mean(proj_y)
    
    freqs_x = np.fft.rfftfreq(len(proj_x))
    fft_x = np.abs(np.fft.rfft(proj_x))
    
    freqs_y = np.fft.rfftfreq(len(proj_y))
    fft_y = np.abs(np.fft.rfft(proj_y))
    
    def find_peak(freqs, fft_mag, min_period=10, max_period=150):
        valid = (freqs > 1/max_period) & (freqs < 1/min_period)
        if not np.any(valid): return None
        idx = np.argmax(fft_mag[valid])
        return 1.0 / freqs[valid][idx]
        
    p_x = find_peak(freqs_x, fft_x)
    p_y = find_peak(freqs_y, fft_y)
    
    print(f"FFT Estimated Periods: X={p_x}, Y={p_y}")
    
    est_s = []
    if p_x: est_s.append(p_x / 1.5)
    if p_y: est_s.append(p_y / np.sqrt(3))
    
    if est_s: return np.mean(est_s)
    return 40.0

def detect_orientation_hough(edges, min_length):
    # Probabilistic Hough Transform
    # Limit maxLineGap to bridge gaps in dashed lines only slightly
    # Scribbles should be ignored.
    # Increase threshold to require many votes
    
    threshold = int(min_length)
    max_gap = 2
    
    lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=threshold, minLineLength=min_length, maxLineGap=max_gap)
    
    filtered = np.zeros_like(edges)
    if lines is None: 
        print("No lines detected!")
        return filtered, 0.0
        
    angles = []
    line_count = 0
    
    for line in lines:
        x1, y1, x2, y2 = line[0]
        angle = np.degrees(np.arctan2(y2-y1, x2-x1))
        # Map to 0-180
        if angle < 0: angle += 180
        angles.append(angle)
        cv2.line(filtered, (x1, y1), (x2, y2), 255, 1)
        line_count += 1
        
    print(f"Hough: Detected {line_count} lines (> {min_length:.1f} px)")
        
    # Histogram
    hist, bins = np.histogram(angles, bins=180, range=(0, 180))
    # Smooth
    hist = np.convolve(hist, np.ones(5)/5, mode='same')
    
    # Find optimal grid orientation (Alpha)
    # Sum(Hist[alpha] + Hist[alpha+60] + Hist[alpha+120])
    best_alpha = 0
    best_sum = 0
    
    for a in range(60):
        # Indices in 0-179
        i1 = a
        i2 = (a + 60) % 180
        i3 = (a + 120) % 180
        s = hist[i1] + hist[i2] + hist[i3]
        if s > best_sum:
            best_sum = s
            best_alpha = a
            
    # Normalize to -30 to 30 convention if possible
    # We found angle in 0-60.
    # Grid rotation usually defined -30 to 30.
    # If angle > 30, subtract 60.
    if best_alpha > 30: best_alpha -= 60
            
    print(f"Hough Estimated Rotation: {best_alpha} degrees")
    
    # Plot Histogram?
    plt.figure()
    plt.plot(hist)
    plt.axvline(best_alpha if best_alpha >=0 else best_alpha+60, color='r')
    plt.title(f"Angle Histogram (Peak={best_alpha})")
    plt.savefig("diagnostics/00_angle_hist.png")
    plt.close()
    
    return filtered, best_alpha

def calc_score_dt(params, grid_model, dt_map, w, h):
    grid_model.params = params
    segments = grid_model.project_grid_lines(w, h, grid_range=30)
    
    total_dist = 0
    count = 0
    
    for p1, p2 in segments:
        length = np.hypot(p2[0]-p1[0], p2[1]-p1[1])
        if length < 1: continue
        num_pts = int(length / 2)
        if num_pts < 2: num_pts = 2
        
        ts = np.linspace(0, 1, num_pts)
        xs = p1[0] + (p2[0]-p1[0])*ts
        ys = p1[1] + (p2[1]-p1[1])*ts
        
        valid = (xs >= 0) & (xs < w) & (ys >= 0) & (ys < h)
        xs = xs[valid].astype(int)
        ys = ys[valid].astype(int)
        
        if len(xs) > 0:
            dists = dt_map[ys, xs]
            # Gaussian Score
            sigma = 3.0
            s_vals = np.exp(- (dists**2) / (2 * sigma**2))
            total_dist += np.sum(s_vals)
            count += len(dists)
            
    if count == 0: return 0.0 # Bad score
    
    # We want to MAXIMIZE Mean Score (0 to 1).
    # Optimizer minimizes. So return -Mean.
    return - (total_dist / count)

import matplotlib.pyplot as plt

def plot_translation_landscape(params, model, dt_map, w, h):
    tx, ty, rot, s, tilt_x, tilt_y, f = params
    
    # Search Range: +/- 1.0 * s
    rang = s * 1.0
    steps = 20
    
    xs = np.linspace(tx - rang, tx + rang, steps)
    ys = np.linspace(ty - rang, ty + rang, steps)
    
    scores = np.zeros((steps, steps))
    
    # Note: Optimization minimizes negative score.
    # Diagnostic plot should show positive score (Max is best).
    
    print("Computing Translation Landscape...")
    for i, y in enumerate(ys):
        for j, x in enumerate(xs):
            p = [x, y, rot, s, tilt_x, tilt_y, f]
            # Negate back to get positive score (0 to 1)
            scores[i, j] = -calc_score_dt(p, model, dt_map, w, h)
            
    # Plot
    plt.figure(figsize=(10, 8))
    plt.imshow(scores, extent=[xs[0], xs[-1], ys[-1], ys[0]], origin='upper', cmap='inferno') # Bright = High Score
    plt.colorbar(label='Alignment Score (0-1)')
    plt.plot(tx, ty, 'gx', label='Optimized', markersize=10) # Green X
    plt.title(f"Translation Landscape (Scale={s:.1f})")
    plt.xlabel("Tx")
    plt.ylabel("Ty")
    plt.legend()
    plt.savefig("diagnostics/01_translation_landscape.png")
    print("Saved diagnostics/01_translation_landscape.png")

def optimize_grid(img_path):
    orig = cv2.imread(img_path)
    if orig is None:
        print("Error: Could not load image")
        return
        
    work_width = 800
    work_img, scale_factor = resize_img(orig, width=work_width)
    h, w = work_img.shape[:2]
    
    # 1. Estimation Phase (Raw Edges)
    gray = cv2.cvtColor(work_img, cv2.COLOR_BGR2GRAY)
    edges_raw = cv2.Canny(gray, 50, 150)
    
    print("Estimating Scale via FFT on RAW edges...")
    est_scale = estimate_scale_fft(edges_raw)
    if est_scale < 10 or est_scale > 100: est_scale = 30.0
    print(f"Estimated Scale: {est_scale:.2f}")
    
    # Estimate Rotation on RAW edges (Hough)
    min_len = est_scale * 0.5
    print(f"Estimating Rotation on RAW edges (lines > {min_len:.1f} px)...")
    _, est_rot = detect_orientation_hough(edges_raw, min_length=min_len)

    # 2. Optimization Phase (Blurred Edges)
    print("Generating Blurred Edges for Optimization...")
    blurred = cv2.GaussianBlur(gray, (0, 0), 2.0)
    edges_opt = cv2.Canny(blurred, 30, 100) # Lower thresholds for blurred
    cv2.imwrite("diagnostics/00_edges_blurred.png", edges_opt)
    
    # 3. Distance Transform on Blurred Edges
    edges_inv = cv2.bitwise_not(edges_opt)
    dt_map = cv2.distanceTransform(edges_inv, cv2.DIST_L2, 5)
    cv2.imwrite("diagnostics/00_dt_map.png", (dt_map / dt_map.max() * 255).astype(np.uint8))
    
    # 4. Search
    print("Performing Coarse Search...")
    best_score = float('inf')
    best_params = None
    
    scales = np.linspace(est_scale * 0.9, est_scale * 1.1, 8)
    
    # Search Rotation around Estimated (+/- 5 deg)
    rots = np.linspace(est_rot - 5, est_rot + 5, 5)
    
    cx, cy = w/2, h/2
    model = GridModel()
    
    for s in scales:
        dx = 1.5 * s
        dy = np.sqrt(3) * s
        
        phases_x = np.linspace(-dx/2, dx/2, 3)
        phases_y = np.linspace(-dy/2, dy/2, 3)
        
        for r in rots:
            for px in phases_x:
                for py in phases_y:
                    p = [cx + px, cy + py, r, s, 0, 0, 1000]
                    score = calc_score_dt(p, model, dt_map, w, h)
                    if score < best_score:
                        best_score = score
                        best_params = p
                
    print(f"Coarse Params: {best_params}")
    
    # 5. Fine Optimization
    def objective(p):
        return calc_score_dt(p, model, dt_map, w, h)
    
    print("Fine Tuning...")
    # Nelder-Mead
    res = scipy.optimize.minimize(objective, best_params, method='Nelder-Mead', 
                                  options={'maxiter': 300, 'xatol': 0.01, 'fatol': 0.01})
                                  
    print(f"Result: {res.x}")
    print(f"Final Score: {res.fun}")
    
    # Diagnostic Plot: Translation Landscape
    plot_translation_landscape(res.x, model, dt_map, w, h)
    
    # Visualize Result
    model.params = res.x
    vis = model.draw_grid(work_img, color=(0, 255, 0), thickness=1)
    cv2.imwrite("diagnostics/01_optimized_grid.png", vis)
    
    # Visualize on Blurred Edges (used for optimization)
    # Convert single channel edges to BGR for drawing
    edges_bgr = cv2.cvtColor(edges_opt, cv2.COLOR_GRAY2BGR)
    vis_edges = model.draw_grid(edges_bgr, color=(0, 255, 0), thickness=1)
    # Visualize on Blurred Edges
    edges_bgr = cv2.cvtColor(edges_opt, cv2.COLOR_GRAY2BGR)
    vis_edges = model.draw_grid(edges_bgr, color=(0, 255, 0), thickness=1)
    
    # Compute Full Res Params
    final_params_full = res.x.copy()
    final_params_full[0] /= scale_factor
    final_params_full[1] /= scale_factor
    final_params_full[3] /= scale_factor
    final_params_full[6] /= scale_factor
    
    # Save parameters to JSON
    import json
    base_name = os.path.basename(img_path).split('.')[0]
    diag_dir = "diagnostics"
    if not os.path.exists(diag_dir): os.makedirs(diag_dir)
    
    json_path = f"{diag_dir}/{base_name}_params.json"
    with open(json_path, 'w') as f:
        json.dump(final_params_full.tolist(), f, indent=2)
    print(f"Saved params to {json_path}")
    
    vis_full = GridModel(final_params_full).draw_grid(orig, thickness=2)
    
    # Save with prefix
    base_name = os.path.basename(img_path).split('.')[0]
    diag_dir = "diagnostics"
    if not os.path.exists(diag_dir): os.makedirs(diag_dir)
    
    cv2.imwrite(f"{diag_dir}/{base_name}_00_edges_raw.png", edges_raw)
    cv2.imwrite(f"{diag_dir}/{base_name}_00_edges_blurred.png", edges_opt)
    cv2.imwrite(f"{diag_dir}/{base_name}_00_dt_map.png", (dt_map / dt_map.max() * 255).astype(np.uint8))
    cv2.imwrite(f"{diag_dir}/{base_name}_01_optimized_grid.png", vis)
    cv2.imwrite(f"{diag_dir}/{base_name}_01_optimized_grid_on_blurred.png", vis_edges)
    cv2.imwrite(f"{diag_dir}/{base_name}_01_optimized_grid_full.png", vis_full)
    
    # Save Landscape (already computed but not saved with prefix in function)
    # Actually plot_translation_landscape saves internally. Ideally pass prefix to it.
    # For now, let's just rename the last generated landscape? Or modify plot_translation_landscape.
    if os.path.exists(f"{diag_dir}/01_translation_landscape.png"):
        os.rename(f"{diag_dir}/01_translation_landscape.png", f"{diag_dir}/{base_name}_01_translation_landscape.png")
    if os.path.exists(f"{diag_dir}/00_angle_hist.png"):
        os.rename(f"{diag_dir}/00_angle_hist.png", f"{diag_dir}/{base_name}_00_angle_hist.png")

import sys
import os

if __name__ == "__main__":
    if len(sys.argv) > 1:
        img_path = sys.argv[1]
    else:
        img_path = "tests/battle-for-moscow-map-full.jpg"
        
    optimize_grid(img_path)
