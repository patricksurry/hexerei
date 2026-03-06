import numpy as np
import cv2
import scipy.optimize
from grid_model import GridModel

def build_homography_from_patches(votes, best_cluster):
    """
    Use local lattice vectors from the high-SNR patches in the winning cluster
    to estimate a global 3x3 homography via RANSAC.
    """
    members = best_cluster['members']
    if len(members) < 4:
        return None, None
        
    src_pts = []
    dst_pts = []
    
    # We define a local grid space around each patch.
    # To tie them together globally, we actually just want the mapping from
    # (u,v) grid space to (x,y) image space. But since each patch only gives
    # local vectors, we can construct local derivatives (Jacobians).
    # A simpler approach: use the consensus (side, rotation) as a pure 
    # similarity transform, or use the local patches to fit the full H.
    
    # Since we lack absolute grid indices for each patch, we can't do a direct
    # global point-to-point RANSAC easily without phase recovery first.
    # But wait! If we just want a good initialization, we can initialize
    # GridModel with 0 tilt, and use the Nelder-Mead optimizer to find tilt.
    # Let's rely on the robust Nelder-Mead with our new Structural Symmetry metric.
    pass

def generate_sample_points(w, h, params, flat_top):
    """
    Generate sample points for edges and centers for a given GridModel.
    params = [tx, ty, rot_deg, scale, tilt_x, tilt_y, focal]
    """
    model = GridModel(params)
    H = model.get_homography(w, h)
    
    # Generate points in integer grid space
    N = 30 # Search range
    
    # 1. Centers (Integer indices in triangular/square basis)
    centers_u = []
    centers_v = []
    
    for c in range(-N, N):
        for r in range(-N, N):
            # GridModel expects indices in the coordinate system of its basis vectors
            # Flat-top hex basis: e1=(1,0), e2=(0.5, sqrt(3)/2)
            # Centers in hex grid (staggered):
            # Col c, Row r -> center = c*e1 + r*(2*e2 - e1) ? No.
            # Let's use the same staggered logic as make_hex_grid but in unit coords.
            # Actually, GridModel basis is e1, e2.
            # Just use a simple grid of indices for now to ensure we have points.
            centers_u.append(c)
            centers_v.append(r)
            
    centers_uv = np.column_stack([centers_u, centers_v]).astype(np.float32)
    
    # 2. Edges (points along lines)
    edges_u = []
    edges_v = []
    
    # We'll sample points along the 3 axes of the grid lines
    # Unit vectors for triangular grid:
    # Axis 1: [1, 0]
    # Axis 2: [0.5, sqrt(3)/2]
    # Axis 3: [-0.5, sqrt(3)/2]
    
    ts = np.linspace(-N, N, N*4)
    
    # family 1 (horizontal lines in grid space)
    for j in range(-N, N):
        # Line: p(t) = t*[1,0] + j*[0.5, 0.866]
        xs = ts + j * 0.5
        ys = np.ones_like(ts) * j * (np.sqrt(3)/2)
        for x, y in zip(xs, ys):
            edges_u.append(x)
            edges_v.append(y)
            
    # family 2
    for i in range(-N, N):
        # Line: p(t) = i*[1,0] + t*[0.5, 0.866]
        xs = i + ts * 0.5
        ys = ts * (np.sqrt(3)/2)
        for x, y in zip(xs, ys):
            edges_u.append(x)
            edges_v.append(y)
            
    # family 3
    for k in range(-2*N, 2*N):
        # Line: p(t) = k*[1,0] + t*[-0.5, 0.866]
        xs = k - ts * 0.5
        ys = ts * (np.sqrt(3)/2)
        for x, y in zip(xs, ys):
            edges_u.append(x)
            edges_v.append(y)
                
    edges_uv = np.column_stack([edges_u, edges_v]).astype(np.float32)
    
    # Transform to image space
    centers_uv_r = centers_uv.reshape(-1, 1, 2)
    edges_uv_r = edges_uv.reshape(-1, 1, 2)
    
    centers_xy = cv2.perspectiveTransform(centers_uv_r, H).reshape(-1, 2)
    edges_xy = cv2.perspectiveTransform(edges_uv_r, H).reshape(-1, 2)
    
    # Filter valid
    valid_c = (centers_xy[:, 0] >= 0) & (centers_xy[:, 0] < w) & (centers_xy[:, 1] >= 0) & (centers_xy[:, 1] < h)
    valid_e = (edges_xy[:, 0] >= 0) & (edges_xy[:, 0] < w) & (edges_xy[:, 1] >= 0) & (edges_xy[:, 1] < h)
    
    return centers_xy[valid_c], edges_xy[valid_e]

def structural_symmetry_score(params, img_gray, flat_top):
    """
    Evaluate structural consistency: a good grid aligns its edges with 
    high-contrast features and its centers with homogeneous regions.
    Instead of variance, we can use edge magnitude (Sobel/Canny).
    """
    h, w = img_gray.shape
    centers_xy, edges_xy = generate_sample_points(w, h, params, flat_top)
    
    if len(centers_xy) < 10 or len(edges_xy) < 10:
        return 1000.0 # Bad penalty
        
    # We want edges to be dark (or high gradient) and centers to be light (or low gradient)
    # Let's use the gradient magnitude image (which we can precompute).
    
    # Actually, we can precompute a gradient image and pass it in for speed.
    # To keep it self-contained for the signature, we assume img_gray is already a gradient/edge image
    # Or distance transform.
    
    # If img_gray is a distance transform to edges (dt_map):
    # Centers should be FAR from edges (high DT value)
    # Edges should be CLOSE to edges (low DT value)
    
    cx = centers_xy[:, 0].astype(int)
    cy = centers_xy[:, 1].astype(int)
    
    ex = edges_xy[:, 0].astype(int)
    ey = edges_xy[:, 1].astype(int)
    
    # Score = Mean(DT at edges) - lambda * Mean(DT at centers)
    # We want DT at edges to be small, DT at centers to be large.
    # So we MINIMIZE: Mean(DT edges) - 0.5 * Mean(DT centers)
    
    dt_edges = np.mean(img_gray[ey, ex])
    dt_centers = np.mean(img_gray[cy, cx])
    
    score = dt_edges - 0.2 * dt_centers
    return float(score)

def optimize_grid(img_gray, initial_params, flat_top):
    """
    Refine the grid parameters to maximize structural symmetry.
    initial_params: [tx, ty, rot_deg, scale, tilt_x, tilt_y, focal]
    """
    h, w = img_gray.shape
    
    # Precompute edge/DT map for speed
    edges = cv2.Canny(img_gray, 50, 150)
    dt_map = cv2.distanceTransform(cv2.bitwise_not(edges), cv2.DIST_L2, 5)
    
    def objective(p):
        return structural_symmetry_score(p, dt_map, flat_top)
        
    # We do a bounded/constrained Nelder-Mead or just standard
    # Let's only optimize tx, ty, rot, scale initially
    
    res = scipy.optimize.minimize(objective, initial_params, method='Nelder-Mead', 
                                  options={'maxiter': 300, 'xatol': 0.1, 'fatol': 0.1})
                                  
    return res.x, res.fun, dt_map
