import os
import sys
import argparse
import numpy as np
import cv2
import json

from grid_utils import GridParams, overlay_grid
from grid_model import GridModel
from flashlight import run_flashlight_analysis
from symmetry_optimizer import optimize_grid
from diagnostics import DiagnosticReport, plot_spotlights, plot_vote_scatter, plot_symmetry_optimization

def main():
    parser = argparse.ArgumentParser(description="Robust Hex Grid Detection Pipeline")
    parser.add_argument("image_path", help="Path to the input map image")
    parser.add_argument("--output-dir", default="./output", help="Directory for final output")
    parser.add_argument("--fast", action="store_true", help="Skip fine symmetry optimization")
    parser.add_argument("--samples", type=int, default=30, help="Number of random spotlights")
    parser.add_argument("--debug-dir", help="Directory to emit detailed HTML diagnostics")
    
    args = parser.parse_args()
    
    img_path = args.image_path
    if not os.path.exists(img_path):
        print(f"Error: Image {img_path} not found.")
        sys.exit(1)
        
    image_name = os.path.basename(img_path).split('.')[0]
    os.makedirs(args.output_dir, exist_ok=True)
    
    print(f"[INFO] Loading image: {img_path}")
    orig_img = cv2.imread(img_path)
    if orig_img is None:
        print(f"Error: Could not decode image {img_path}.")
        sys.exit(1)
        
    # Contrast-preserving grayscale
    # Using CLAHE (Contrast Limited Adaptive Histogram Equalization)
    gray = cv2.cvtColor(orig_img, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    gray_clahe = clahe.apply(gray)
    
    h, w = gray_clahe.shape
    print(f"[INFO] Image dimensions: {w}x{h}")
    
    # Scale down for faster flashlight
    MAX_DIM = 1200
    scale_factor = 1.0
    if max(h, w) > MAX_DIM:
        scale_factor = MAX_DIM / max(h, w)
        new_w = int(w * scale_factor)
        new_h = int(h * scale_factor)
        work_gray = cv2.resize(gray_clahe, (new_w, new_h))
        print(f"[INFO] Resized to {new_w}x{new_h} for Phase 1")
    else:
        work_gray = gray_clahe.copy()
        
    # Set up diagnostics
    report = None
    if args.debug_dir:
        report = DiagnosticReport(args.debug_dir, image_name)
        
    # --- PHASE 1 & 2: Flashlight Sampling & Consensus ---
    print(f"[INFO] Phase 1: Running {args.samples} flashlight samples...")
    try:
        best_cluster, all_clusters, votes = run_flashlight_analysis(
            work_gray, n_samples=args.samples, scale_factor=scale_factor
        )
    except Exception as e:
        print(f"[ERROR] Flashlight failed: {e}")
        sys.exit(1)
        
    side = best_cluster['side']
    rotation = best_cluster['rotation']
    grid_type = best_cluster['grid_type']
    flat_top = (grid_type == 'hex_flat')
    
    print(f"[INFO] Phase 2: Found consensus: {grid_type}, Side: ~{side:.2f}px, Rotation: {rotation:.2f}°")
    
    # --- PHASE 2.5: Coarse Translation Search ---
    print("[INFO] Phase 2.5: Searching for coarse translation...")
    # Work on downsampled image for speed
    edges_small = cv2.Canny(work_gray, 50, 150)
    dt_small = cv2.distanceTransform(cv2.bitwise_not(edges_small), cv2.DIST_L2, 5)
    
    # We want best (tx, ty) at small scale
    best_score_c = np.inf
    best_t_small = (0.0, 0.0)
    
    # Grid spacing at small scale
    s_small = side * scale_factor
    if flat_top:
        dx_s = 1.5 * s_small
        dy_s = np.sqrt(3) * s_small
    else:
        dx_s = np.sqrt(3) * s_small
        dy_s = 1.5 * s_small
        
    n_steps = 15
    for ty_f in np.linspace(0, 1, n_steps):
        for tx_f in np.linspace(0, 1, n_steps):
            tx_s = tx_f * dx_s
            ty_s = ty_f * dy_s
            from grid_utils import score_grid_dt
            score = score_grid_dt(dt_small, s_small, rotation, (tx_s, ty_s), flat_top)
            if score < best_score_c:
                best_score_c = score
                best_t_small = (tx_s, ty_s)
                
    # Scale back translation to full resolution
    tx_full = best_t_small[0] / scale_factor
    ty_full = best_t_small[1] / scale_factor
    print(f"[INFO] Coarse Translation: ({tx_full:.1f}, {ty_full:.1f})")

    # initial_params: [tx, ty, rot_deg, scale, tilt_x, tilt_y, focal]
    initial_params = np.array([tx_full, ty_full, rotation, side, 0.0, 0.0, 1000.0])
    
    if args.fast:
        print("[INFO] Phase 3: Skipping optimization (--fast flag enabled)")
        final_params = initial_params
    else:
        print("[INFO] Phase 3: Running Structural Symmetry Optimization...")
        final_params, final_score, dt_map = optimize_grid(gray_clahe, initial_params, flat_top)
        print(f"[INFO] Refined Grid - Side: {final_params[3]:.2f}px, Rotation: {final_params[2]:.2f}°, Origin: ({final_params[0]:.1f}, {final_params[1]:.1f})")
        
        if report:
            fig_opt = plot_symmetry_optimization(dt_map, initial_params, final_params, flat_top)
            report.add_section("Phase 3: Structural Symmetry Optimization",
                               f"Optimized to maximize gradient magnitude at edges and minimize it at centers. Final score: {final_score:.2f}",
                               fig_opt)
                               
    # Final Output
    final_side = final_params[3]
    final_rot = final_params[2]
    final_tx = final_params[0]
    final_ty = final_params[1]
    
    params = GridParams(
        grid_type=grid_type,
        side_length=final_side,
        rotation_deg=final_rot,
        origin=(final_tx, final_ty)
    )
    
    vis = overlay_grid(orig_img, params, color=(0, 255, 0), thickness=2)
    overlay_path = os.path.join(args.output_dir, f"{image_name}_overlay.png")
    cv2.imwrite(overlay_path, vis)
    print(f"[SUCCESS] Saved diagnostic overlay to {overlay_path}")
    
    if report:
        from diagnostics import plot_final_overlay
        fig_final = plot_final_overlay(orig_img, params)
        report.add_section("Final Grid Detection",
                           f"Final alignment after optimization. Grid: {grid_type}, Side: {final_side:.1f}px, Rotation: {final_rot:.1f}°",
                           fig_final)
    
    spec = {
        "image": img_path,
        "grid_type": grid_type,
        "side_length": final_side,
        "rotation_deg": final_rot,
        "origin_x": final_tx,
        "origin_y": final_ty,
        "tilt_x": final_params[4],
        "tilt_y": final_params[5],
        "focal": final_params[6]
    }
    
    spec_path = os.path.join(args.output_dir, f"{image_name}.hexmap.yaml")
    with open(spec_path, 'w') as f:
        json.dump(spec, f, indent=2) # saving as JSON subset of YAML for simplicity
    print(f"[SUCCESS] Saved HexMap spec to {spec_path}")
    
    if report:
        report_path = report.save()
        print(f"[SUCCESS] Saved HTML diagnostic report to {report_path}")

if __name__ == "__main__":
    main()
