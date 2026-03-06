import cv2
import numpy as np
import json
import os
from grid_model import GridModel
from sklearn.cluster import KMeans

def load_grid_params(json_path):
    with open(json_path, 'r') as f:
        params = json.load(f)
    return params

def get_visible_edges(model, w, h, margin=50):
    N_min, N_max = -50, 50 
    ii, jj = np.meshgrid(np.arange(N_min, N_max), np.arange(N_min, N_max))
    i_flat = ii.flatten()
    j_flat = jj.flatten()
    
    vals_u = i_flat * 1.0 + j_flat * 0.5
    vals_v = i_flat * 0.0 + j_flat * (np.sqrt(3)/2.0)
    
    pts_uv = np.column_stack([vals_u, vals_v]).astype(np.float32)
    pts_uv_r = pts_uv.reshape(-1, 1, 2)
    
    H = model.get_homography(w, h)
    pts_xy = cv2.perspectiveTransform(pts_uv_r, H).reshape(-1, 2)
    
    v_map = {}
    for k in range(len(i_flat)):
        if -margin < pts_xy[k, 0] < w + margin and -margin < pts_xy[k, 1] < h + margin:
            v_map[(i_flat[k], j_flat[k])] = pts_xy[k]
            
    # Directions: (1, 0), (0, 1), (1, -1)
    dirs = [(1, 0), (0, 1), (1, -1)]
    valid_edges = []
    
    for (i, j), p1 in v_map.items():
        for di, dj in dirs:
            ni, nj = i + di, j + dj
            if (ni, nj) in v_map:
                p2 = v_map[(ni, nj)]
                mc = (p1 + p2) / 2
                if 0 <= mc[0] < w and 0 <= mc[1] < h:
                    # Store as ((i1, j1), (i2, j2), p1, p2)
                    valid_edges.append(((i, j), (ni, nj), p1, p2))
    return valid_edges

def extract_patch(img, p1, p2, patch_w=60, patch_h=20):
    center = (p1 + p2) / 2.0
    diff = p2 - p1
    angle = np.degrees(np.arctan2(diff[1], diff[0]))
    
    pw, ph = int(patch_w), int(patch_h)
    cx_dst, cy_dst = pw / 2.0, ph / 2.0
    
    theta = np.radians(angle)
    c, s = np.cos(theta), np.sin(theta)
    
    dx, dy = cx_dst, cy_dst
    sx, sy = center
    
    tx = dx - (c * sx + s * sy)
    ty = dy - (-s * sx + c * sy)
    
    M = np.array([[c, s, tx], [-s, c, ty]])
    patch = cv2.warpAffine(img, M, (pw, ph), flags=cv2.INTER_LINEAR)
    return patch

def classify_edges(img, edges):
    # edges is list of ((i1, j1), (i2, j2), p1, p2)
    patches = []
    meta = []
    
    for item in edges:
        p1, p2 = item[2], item[3]
        patch = extract_patch(img, p1, p2, patch_w=64, patch_h=32)
        if patch is not None:
            patches.append(patch)
            meta.append(item)
            
    if not patches:
        return [], []
        
    scores = []
    for p in patches:
        gray = cv2.cvtColor(p, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape
        mid = h // 2
        
        # Robust Contrast Score +/- 4px
        center_band = gray[mid-4:mid+5, :]
        if center_band.shape[0] == 0:
             scores.append(0)
             continue
             
        row_means = np.mean(center_band, axis=1)
        min_center = np.min(row_means)
        
        if h < 10: 
            scores.append(0)
            continue
            
        top = gray[0:5, :]
        bot = gray[-5:, :]
        mean_outer = (np.mean(top) + np.mean(bot)) / 2.0
        
        score = mean_outer - min_center
        scores.append(score)
        
    scores = np.array(scores).reshape(-1, 1)
    
    kmeans = KMeans(n_clusters=2, random_state=0).fit(scores)
    centers = kmeans.cluster_centers_
    threshold = np.mean(centers)
    
    grid_label = 1 if centers[1] > centers[0] else 0
    labels = kmeans.labels_
    
    grid_edges = [meta[i] for i in range(len(meta)) if labels[i] == grid_label]
    internal_edges = [meta[i] for i in range(len(meta)) if labels[i] != grid_label]
    
    print(f"Classification Threshold: {threshold:.2f}")
    return grid_edges, internal_edges
