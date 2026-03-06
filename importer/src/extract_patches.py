import cv2
import numpy as np
import json
import os
import sys
from grid_model import GridModel

def load_grid_params(json_path):
    with open(json_path, 'r') as f:
        params = json.load(f)
    print(f"Loaded params: {params}")
    return params

def get_visible_edges(model, w, h, margin=50):
    # Determine bounds in grid space
    # Simple approach: Project corners of image back to u,v space?
    # Or just brute force a large range since grid logic is cheap.
    # Image 2000x2000? scale 30. range ~ 60-70.
    # Let's use range -40 to 80 (since origin is center).
    
    # Grid Basis
    # P(i, j) = i*e1 + j*e2
    # e1 = [1, 0, 0]
    # e2 = [0.5, sqrt(3)/2, 0]
    
    N_min, N_max = -50, 50 
    # Just iterate and filter.
    
    edges = []
    
    # Pre-transform vertices? efficient?
    # Let's do batch transform.
    
    # Create meshgrid of i, j
    ii, jj = np.meshgrid(np.arange(N_min, N_max), np.arange(N_min, N_max))
    # Shape (100, 100)
    
    i_flat = ii.flatten()
    j_flat = jj.flatten() # 10000 points
    
    # e1, e2
    vals_u = i_flat * 1.0 + j_flat * 0.5
    vals_v = i_flat * 0.0 + j_flat * (np.sqrt(3)/2.0)
    
    pts_uv = np.column_stack([vals_u, vals_v]).astype(np.float32)
    # Reshape for perspectiveTransform: (N, 1, 2)
    pts_uv_r = pts_uv.reshape(-1, 1, 2)
    
    H = model.get_homography(w, h)
    pts_xy = cv2.perspectiveTransform(pts_uv_r, H).reshape(-1, 2)
    
    # Store in a map for easy lookup?
    # Map (i, j) -> (x, y)
    v_map = {}
    for k in range(len(i_flat)):
        if -margin < pts_xy[k, 0] < w + margin and -margin < pts_xy[k, 1] < h + margin:
            v_map[(i_flat[k], j_flat[k])] = pts_xy[k]
            
    # Generate Edges
    # Directions: (1,0), (0,1), (-1, 1) or (1,-1)?
    # Triangle Grid Edges from (i, j):
    # 1. (i+1, j)
    # 2. (i, j+1)
    # 3. (i+1, j-1) ?? No.
    # e1=(1,0), e2=(0.5, 0.866). e3=e2-e1=(-0.5, 0.866).
    # So (i, j) connect to (i, j) + (-1, 1).
    # i.e. (i-1, j+1).
    # So equivalent to (i, j) connecting to (i+1, j-1)?
    # Directions: (1, 0), (0, 1), (1, -1) to cover all forward links.
    
    dirs = [(1, 0), (0, 1), (1, -1)]
    
    visited_edges = set()
    
    valid_edges = []
    
    for (i, j), p1 in v_map.items():
        for di, dj in dirs:
            ni, nj = i + di, j + dj
            if (ni, nj) in v_map:
                p2 = v_map[(ni, nj)]
                
                # Check if edge center is in image (strict)
                mc = (p1 + p2) / 2
                if 0 <= mc[0] < w and 0 <= mc[1] < h:
                    valid_edges.append((p1, p2))

    print(f"Found {len(valid_edges)} valid edges inside image.")
    return valid_edges

def extract_patch(img, p1, p2, patch_w=60, patch_h=20):
    # 1. Center
    center = (p1 + p2) / 2.0
    
    # 2. Angle
    diff = p2 - p1
    angle = np.degrees(np.arctan2(diff[1], diff[0]))
    
    # 3. Get Rotation Matrix
    # We want the edge to be horizontal in the patch?
    M = cv2.getRotationMatrix2D(tuple(center), angle, 1.0)
    
    # 4. Extract Rect
    # getRectSubPix is good.
    # But it takes center and size. It assumes axis aligned?
    # No, getRectSubPix extracts an axis-aligned patch from the source.
    # If we want a rotated patch, we warp first?
    # Or use warpAffine with M.
    
    # M translates center to (0,0) then rotates? No.
    # getRotationMatrix2D rotates around center.
    # We want to map the source rotated rectangle to a dst ax-aligned rectangle.
    
    # Destination Image Size
    pw, ph = int(patch_w), int(patch_h)
    
    # Center in Destination
    cx_dst, cy_dst = pw / 2.0, ph / 2.0
    
    # We want M mapping Source -> Dest
    # Translate Source Center to Origin -> Rotate -> Translate to Dest Center.
    
    # Build M manually is safer.
    theta = np.radians(angle)
    c, s = np.cos(theta), np.sin(theta)
    
    # R = [[c, s], [-s, c]] (Inverse rotation to align edge with X axis?)
    # If edge is at Angle A. We want to rotate by -A.
    # So we use cos(-A)=c, sin(-A)=-s.
    
    # M = [ [c, s, tx], [-s, c, ty] ]
    # M * center_src = center_dst
    
    # c*sx + s*sy + tx = dx
    # -s*sx + c*sy + ty = dy
    
    # tx = dx - (c*sx + s*sy)
    # ty = dy - (-s*sx + c*sy)
    
    dx, dy = cx_dst, cy_dst
    sx, sy = center
    
    tx = dx - (c * sx + s * sy)
    ty = dy - (-s * sx + c * sy)
    
    M = np.array([[c, s, tx], [-s, c, ty]])
    
    patch = cv2.warpAffine(img, M, (pw, ph), flags=cv2.INTER_LINEAR)
    return patch

def main():
    base_name = "battle-for-moscow-map-full"
    
    json_path = f"diagnostics/{base_name}_params.json"
    img_path = f"tests/{base_name}.jpg"
    
    if len(sys.argv) > 1:
        img_path = sys.argv[1]
        base_name = os.path.basename(img_path).split('.')[0]
        json_path = f"diagnostics/{base_name}_params.json"

    if not os.path.exists(json_path):
        print(f"Error: JSON params not found: {json_path}")
        return

    params = load_grid_params(json_path)
    model = GridModel(params)
    
    img = cv2.imread(img_path)
    if img is None:
        print("Error loading image")
        return
    h, w = img.shape[:2]
    
    edges = get_visible_edges(model, w, h)
    
    print(f"Extracting patches for {len(edges)} edges...")
    
    patches = []
    edge_data = [] # List of (p1, p2, patch)
    
    # Process ALL edges (not just sample)
    for p1, p2 in edges:
        patch = extract_patch(img, p1, p2, patch_w=64, patch_h=32)
        if patch is not None:
             patches.append(patch)
             edge_data.append((p1, p2, patch))
             
    # Classification
    print("Classifying edges...")
    scores = []
    for p in patches:
        gray = cv2.cvtColor(p, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape
        # Robust Contrast Score
        mid = h // 2
        # Find darkest row in center region (to handle slight offset)
        # Search range: +/- 4 pixels from center
        center_band = gray[mid-4:mid+5, :] # 9 rows
        if center_band.shape[0] == 0: continue
        
        # Compute mean of each row in band
        row_means = np.mean(center_band, axis=1)
        min_center = np.min(row_means)
        
        # Outer regions (background)
        # Check if patch is large enough
        if h < 10: continue
        top = gray[0:5, :]
        bot = gray[-5:, :]
        
        mean_outer = (np.mean(top) + np.mean(bot)) / 2.0
        
        # Contrast Score: Positive if line is darker
        score = mean_outer - min_center
        scores.append(score)
        
    scores = np.array(scores)
    
    # Auto-threshold using Otsu's method? Or K-Means?
    # Otsu works on histograms.
    # Simple K-Means k=2
    from sklearn.cluster import KMeans
    kmeans = KMeans(n_clusters=2, random_state=0).fit(scores.reshape(-1, 1))
    centers = kmeans.cluster_centers_
    threshold = np.mean(centers)
    
    # Identify which cluster is "Grid" (higher contrast/score)
    # Actually, if score = outer - center.
    # Grid (Black line) -> Low Center -> High Score.
    # Texture -> Low contrast -> Low Score.
    
    grid_label = 1 if centers[1] > centers[0] else 0
    labels = kmeans.labels_
    
    grid_edges = [edge_data[i] for i in range(len(edge_data)) if labels[i] == grid_label]
    internal_edges = [edge_data[i] for i in range(len(edge_data)) if labels[i] != grid_label]
    
    print(f"Classified: {len(grid_edges)} Grid Edges, {len(internal_edges)} Internal Edges.")
    print(f"Threshold Score: {threshold:.2f}")
    
    # Save Histogram
    import matplotlib.pyplot as plt
    plt.figure()
    plt.hist(scores, bins=50, alpha=0.7, label='All Edges')
    plt.axvline(threshold, color='r', linestyle='dashed', linewidth=1, label='Threshold')
    plt.title("Edge Contrast Scores")
    plt.legend()
    plt.savefig(f"diagnostics/{base_name}_03_edge_scores.png")
    
    # Save Montages for each class (Sample 100)
    def save_montage(patch_list, filename):
        if not patch_list: return
        sample = random.sample(patch_list, min(len(patch_list), 100))
        pts1, pts2, imgs = zip(*sample)
        
        rows = 10
        cols = 10
        montage = np.zeros((rows * 32, cols * 64, 3), dtype=np.uint8)
        
        for idx, img in enumerate(imgs):
            r = idx // cols
            c = idx % cols
            if r >= rows: break
            if img.shape != (32, 64, 3):
                img = cv2.resize(img, (64, 32))
            montage[r*32:(r+1)*32, c*64:(c+1)*64] = img
        cv2.imwrite(filename, montage)

    import random
    save_montage(grid_edges, f"diagnostics/{base_name}_03_grid_edges.png")
    save_montage(internal_edges, f"diagnostics/{base_name}_03_internal_edges.png")
    
    # Visualize Classified Edges on Map
    vis_map = img.copy()
    for p1, p2, _ in grid_edges:
        pt1 = (int(p1[0]), int(p1[1]))
        pt2 = (int(p2[0]), int(p2[1]))
        cv2.line(vis_map, pt1, pt2, (0, 255, 0), 2) # Green for Grid
        
    for p1, p2, _ in internal_edges:
        pt1 = (int(p1[0]), int(p1[1]))
        pt2 = (int(p2[0]), int(p2[1]))
        cv2.line(vis_map, pt1, pt2, (0, 0, 255), 1) # Red for Internal
        
    cv2.imwrite(f"diagnostics/{base_name}_03_classified_map.png", vis_map)
    print(f"Saved classification diagnostics.")

if __name__ == "__main__":
    main()
