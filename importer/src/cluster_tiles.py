import cv2
import numpy as np
import os
import glob
import json
import math
import shutil
from sklearn.cluster import KMeans

def ensure_dir(path):
    if not os.path.exists(path):
        os.makedirs(path)

def pixel_to_axial(x, y, size, origin):
    # Flat Top Geometry
    # x, y relative to origin
    px = x - origin[0]
    py = y - origin[1]
    
    # Red Blob Games: Pixel to Hex (Flat Top)
    # q = (2./3 * px) / size
    # r = (-1./3 * px + math.sqrt(3)/3 * py) / size
    q = (2.0/3 * px) / size
    r = (-1.0/3 * px + math.sqrt(3)/3 * py) / size
    
    return axial_round(q, r)

def axial_round(q, r):
    # Convert to cube
    x = q
    z = r
    y = -x - z
    
    rx = round(x)
    ry = round(y)
    rz = round(z)
    
    x_diff = abs(rx - x)
    y_diff = abs(ry - y)
    z_diff = abs(rz - z)
    
    if x_diff > y_diff and x_diff > z_diff:
        rx = -ry - rz
    elif y_diff > z_diff:
        ry = -rx - rz
    else:
        rz = -rx - ry
        
    return int(rx), int(rz)

def load_data(tiles_dir="tiles/faces", grid_file="grid.json"):
    # Load Grid Metadata
    with open(grid_file, "r") as f:
        grid_data = json.load(f)
        
    origin = grid_data["grid"]["origin"]
    size = grid_data["grid"]["s"]
    hex_centers = grid_data["hexes"] # List of [cx, cy]
    
    # Load Images
    # We assume tile_0000.png correpsonds to hex_centers[0]
    images = []
    coords = [] # List of (q, r)
    ids = [] # List of "q_r" strings
    
    files = sorted(glob.glob(os.path.join(tiles_dir, "tile_*.png")))
    if len(files) != len(hex_centers):
        print(f"Warning: Number of tiles ({len(files)}) != Number of hexes in grid.json ({len(hex_centers)})")
        # Proceed with min length
        n = min(len(files), len(hex_centers))
    else:
        n = len(files)
        
    for i in range(n):
        f = files[i]
        img = cv2.imread(f)
        if img is None: continue
        
        # Calculate Axial Coords
        cx, cy = hex_centers[i]
        q, r = pixel_to_axial(cx, cy, size, origin)
        
        images.append(img)
        coords.append((q, r))
        ids.append(f"{q}_{r}")
        
    return images, coords, ids

def extract_features(images):
    print("Extracting features (HSV Histogram)...")
    features = []
    
    for img in images:
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # Global Histogram
        # H(8), S(4), V(2) - V is less important for terrain class
        hist_h = cv2.calcHist([hsv], [0], None, [8], [0, 180])
        hist_s = cv2.calcHist([hsv], [1], None, [4], [0, 256])
        
        # Center Crop (Focus on terrain)
        h, w = hsv.shape[:2]
        pad_h, pad_w = int(h*0.25), int(w*0.25)
        center = hsv[pad_h:h-pad_h, pad_w:w-pad_w]
        
        hist_h_c = cv2.calcHist([center], [0], None, [8], [0, 180])
        hist_s_c = cv2.calcHist([center], [1], None, [4], [0, 256])
        
        # Normalize
        cv2.normalize(hist_h, hist_h)
        cv2.normalize(hist_s, hist_s)
        cv2.normalize(hist_h_c, hist_h_c)
        cv2.normalize(hist_s_c, hist_s_c)
        
        # Flatten and Concatenate
        # Weight Center features more
        feat = np.concatenate([
            hist_h.flatten(), 
            hist_s.flatten(), 
            hist_h_c.flatten() * 2.0, 
            hist_s_c.flatten() * 2.0
        ])
        features.append(feat)
        
    return np.array(features)

def create_gallery(images, labels, n_clusters, output_dir):
    ensure_dir(output_dir)
    
    # Target size for gallery
    th, tw = 64, 64
    
    for c in range(n_clusters):
        indices = np.where(labels == c)[0]
        if len(indices) == 0: continue
        
        # Sort by similarity to centroid? Or just random/indices.
        selection = indices[:60] # Show up to 60 tiles
        
        if len(selection) == 0: continue
        
        cols = 10
        rows = math.ceil(len(selection) / cols)
        
        gallery = np.zeros((rows * th, cols * tw, 3), dtype=np.uint8)
        
        for idx, img_idx in enumerate(selection):
            r = idx // cols
            c_idx = idx % cols
            
            # Resize to target
            img = images[img_idx]
            resized = cv2.resize(img, (tw, th))
            
            gallery[r*th:(r+1)*th, c_idx*tw:(c_idx+1)*tw] = resized
            
        filename = os.path.join(output_dir, f"cluster_gallery_{c:02d}.png")
        cv2.imwrite(filename, gallery)
        print(f"Saved {filename} ({len(indices)} items)")

def main():
    tiles_dir = "tiles/faces"
    output_dir = "diagnostics/clusters"
    ensure_dir(output_dir)
    
    print("Loading Data...")
    images, coords, ids = load_data(tiles_dir, "grid.json")
    print(f"Loaded {len(images)} tiles.")
    
    if not images:
        print("No images found.")
        return
        
    features = extract_features(images)
    
    # Clustering
    k = 12
    print(f"Clustering with K={k}...")
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = kmeans.fit_predict(features)
    
    # Save Results
    results = {}
    for tile_id, label in zip(ids, labels):
        results[tile_id] = int(label) # JSON needs int, not int32
        
    with open(os.path.join(output_dir, "clusters.json"), "w") as f:
        json.dump(results, f, indent=2)
    print(f"Saved clusters.json to {output_dir}")
    
    # Create Galleries
    create_gallery(images, labels, k, output_dir)
    
    # Optional: Scatter Plot of (q,r) colored by Label? 
    # To see spatial distribution.
    # Map (q,r) -> (x,y) for plotting? No need, q,r are coords.
    qs = [c[0] for c in coords]
    rs = [c[1] for c in coords]
    
    import matplotlib.pyplot as plt
    plt.figure(figsize=(10, 8))
    # Flip y axis (r) effectively? 
    # Axial coords: q is East, r is Southeast. 
    # Just plot raw q,r for now.
    scatter = plt.scatter(qs, rs, c=labels, cmap='tab20', s=100, marker='h')
    plt.colorbar(scatter)
    plt.title("Spatial Distribution of Clusters")
    plt.gca().invert_yaxis() # Traditional map view (top-down)
    plt.axis('equal')
    plt.savefig(os.path.join(output_dir, "cluster_map.png"))
    print("Saved cluster_map.png")

if __name__ == "__main__":
    main()
