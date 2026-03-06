import cv2
import numpy as np
import json
import os
import sys
from grid_model import GridModel
from patch_extractor import load_grid_params, get_visible_edges, classify_edges

def reconstruct_hexes(img_path):
    print(f"Reconstructing Hexes for {img_path}...")
    base_name = os.path.basename(img_path).split('.')[0]
    json_path = f"diagnostics/{base_name}_params.json"
    
    if not os.path.exists(json_path):
        print("Error: Grid params not found.")
        return

    params = load_grid_params(json_path)
    model = GridModel(params)
    
    img = cv2.imread(img_path)
    if img is None: return
    h, w = img.shape[:2]
    
    # 1. Get All Candidate Edges mapped to Grid Coords
    print("Generating candidate edges...")
    all_edges = get_visible_edges(model, w, h)
    print(f"Total Candidate Edges: {len(all_edges)}")
    
    # 2. Classify
    print("Classifying edges...")
    grid_edges_meta, _ = classify_edges(img, all_edges)
    print(f"Confirmed Grid Edges: {len(grid_edges_meta)}")
    
    # 3. Build Graph
    # Nodes: (i, j)
    # Edges: Connected nodes
    adj = {}
    for (u, v, p1, p2) in grid_edges_meta:
        if u not in adj: adj[u] = []
        if v not in adj: adj[v] = []
        adj[u].append(v)
        adj[v].append(u)
        
    # --- REPAIR STEP ---
    print("Repairing Grid (Inferring missing edges)...")
    
    # Needs full potential adjacency for validation
    all_adj = {}
    for (u, v, p1, p2) in all_edges:
        if u not in all_adj: all_adj[u] = []
        if v not in all_adj: all_adj[v] = []
        all_adj[u].append(v)
        all_adj[v].append(u)
        
    # Find paths of length 5 (Almost Hexagons)
    # And check closure
    repaired_edges = []
    
    # DFS for partial paths (len 5 nodes implies 4 edges? No. 6 nodes = 5 edges)
    # Hexagon has 6 vertices, 6 edges.
    # Open chain of 5 edges connects 6 vertices. Distance 1.
    # Closing edge is (start, end).
    
    # We want paths of length 6 (nodes).
    # Check if (path[0], path[-1]) is in all_adj.
    # If so, add it.
    
    target_len = 6 # 6 nodes -> 5 edges
    
    # Init node coords lookup for all potential edges
    node_coords = {}
    for (u, v, p1, p2) in all_edges:
        node_coords[u] = p1
        node_coords[v] = p2

    # Needs loop until convergence
    max_passes = 5
    for pass_num in range(max_passes):
        # Use a set to avoid duplicates
        repair_candidates = set()
        
        def find_open_chains(start_node, current_node, path, visited):
            if len(path) == target_len:
                # Check closure in ALL_ADJ
                if start_node in all_adj.get(current_node, []):
                    # Check if edge already exists in ADJ (if so, it's a closed hex already)
                    if start_node not in adj.get(current_node, []):
                        # Found a potential repair!
                        edge = tuple(sorted((start_node, current_node)))
                        repair_candidates.add(edge)
                return

            # Use ADJ for traversal (only follow confirmed edges)
            for neighbor in adj.get(current_node, []):
                if neighbor == start_node: continue 
                if neighbor not in path:
                    if neighbor < start_node: continue 
                    find_open_chains(start_node, neighbor, path + [neighbor], visited)
                    
        nodes = list(adj.keys())
        # nodes.sort()
        for node in nodes:
            find_open_chains(node, node, [node], set())
            
        print(f"Pass {pass_num+1}: Found {len(repair_candidates)} missing edges to repair.")
        if not repair_candidates:
            break
            
        # Add repaired edges
        for (u, v) in repair_candidates:
            if u not in adj: adj[u] = []
            if v not in adj: adj[v] = []
            if v not in adj[u]: adj[u].append(v)
            if u not in adj[v]: adj[v].append(u)
            
            # Add to meta for drawing
            if u in node_coords and v in node_coords:
                p1 = node_coords[u]
                p2 = node_coords[v]
                grid_edges_meta.append((u, v, p1, p2))
                
    print(f"Grid Repaired. Total Edges: {len(grid_edges_meta)}")
    
    # --- END REPAIR ---   
    
    # 4. Find Hexagons (Cycles of length 6)
    
    hexagons = []
    seen_hexes = set() # store sorted tuple of vertices
    
    # Optimized search:
    # Iterate predicted Hex Centers?
    # Triangle Grid Dual = Hex Grid.
    # Triangle vertices are Hex Centers? No.
    # If the fitted grid was the "Triangle Grid" lines.
    # The intersection points are the Triangle Vertices.
    # If the map is a Hexagon Grid.
    # The Lines pass through the Hex Corners? (Honeycomb).
    
    # Let's visualise the confirmed edges first.
    vis_edges = img.copy()
    for (u, v, p1, p2) in grid_edges_meta:
        pt1 = (int(p1[0]), int(p1[1]))
        pt2 = (int(p2[0]), int(p2[1]))
        cv2.line(vis_edges, pt1, pt2, (0, 255, 0), 4) # Thicker (4px)
        
    cv2.imwrite(f"diagnostics/{base_name}_07_confirmed_edges.png", vis_edges)
    print(f"Saved confirmed edges map.")

    print(f"Saved confirmed edges map.")

    # 4. Find Hexagons (Cycles of length 6)
    print("Finding Hexagons (Cycles of 6)...")
    hexagons = []
    seen_hexes = set()
    
    # Adjacency list is 'adj'
    nodes = list(adj.keys())
    # Sort nodes to ensure deterministic order (and maybe optimization?)
    nodes.sort()
    
    # DFS for cycles
    def find_cycles(start_node, current_node, path, visited):
        if len(path) == 6:
            # Check if connected to start
            if start_node in adj[current_node]:
                # Found cycle
                cycle = sorted(path)
                cycle_tuple = tuple(cycle)
                if cycle_tuple not in seen_hexes:
                    seen_hexes.add(cycle_tuple)
                    hexagons.append(path[:])
            return

        for neighbor in adj[current_node]:
            # Constraint: Don't go back immediately (unless closing loop, but len check handles)
            # Basic Visited check for current path
            if neighbor == start_node and len(path) < 5: continue 
            if neighbor not in path: # Avoid loops within path
                # Optimization: Only visit neighbors > start_node to avoid duplicates/permutations?
                # Actually, sorted tuple check handles duplicates.
                # To speed up: restrict indices.
                if neighbor < start_node: continue
                
                find_cycles(start_node, neighbor, path + [neighbor], visited)

    # This DFS is expensive if graph is large.
    # But graph is sparse (degree ~3). max depth 6.
    # Should be fast.
    for node in nodes:
        find_cycles(node, node, [node], set())
        
    print(f"Found {len(hexagons)} Hexagons.")
    
    # Visualize Hexagons
    vis_hexes = img.copy()
    overlay = vis_hexes.copy()
    
    # Iterate grid_edges_meta again.
    node_coords = {}
    for (u, v, p1, p2) in grid_edges_meta:
        node_coords[u] = p1
        node_coords[v] = p2
        
    for hex_cycle in hexagons:
        pts = []
        for node in hex_cycle:
             if node in node_coords:
                 pts.append(node_coords[node])
                 
        if len(pts) == 6:
            pts = np.array(pts, np.int32)
            # Compute convex hull to ensure ordering?
            # Or just fillPoly if ordered?
            # DFS path is ordered.
            
            # Check area to filter weird crossing cycles?
            # Hexagon should be convex.
            # cv2.fillConvexPoly is safer.
            cv2.fillPoly(overlay, [pts], (255, 255, 0)) # Cyan
            
    cv2.addWeighted(overlay, 0.3, vis_hexes, 0.7, 0, vis_hexes)
    
    # Draw edges on top
    for (u, v, p1, p2) in grid_edges_meta:
        pt1 = (int(p1[0]), int(p1[1]))
        pt2 = (int(p2[0]), int(p2[1]))
        cv2.line(vis_hexes, pt1, pt2, (0, 255, 0), 2)

    out_hex = f"diagnostics/{base_name}_08_reconstructed_hexes.png"
    cv2.imwrite(out_hex, vis_hexes)
    print(f"Saved {out_hex}")
    
if __name__ == "__main__":
    if len(sys.argv) > 1:
        reconstruct_hexes(sys.argv[1])
    else:
        reconstruct_hexes("tests/battle-for-moscow-map-full.jpg")
