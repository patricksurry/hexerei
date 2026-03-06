import yaml
import json
import argparse
import sys

def int_to_col_label(i):
    # 0 -> A, 25 -> Z, 26 -> AA
    if i < 0: return "?"
    
    label = ""
    while True:
        label = chr(ord('A') + (i % 26)) + label
        i = (i // 26) - 1
        if i < 0:
            break
            
    return label

def get_asl_label(q, r, min_q, min_r):
    # Adjust to 0-based
    col_idx = q - min_q
    row_idx = r - min_r + 1 # 1-based rows
    
    col_str = int_to_col_label(col_idx)
        
    return f"{col_str}{row_idx}"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--grid", default="diagnostics/grid_stats.json")
    parser.add_argument("--clusters", default="diagnostics/clusters.json")
    parser.add_argument("--labels", default="labels.yaml")
    parser.add_argument("--output", default="output.hexmap.yaml")
    args = parser.parse_args()
    
    # Load Data
    with open(args.grid) as f:
        grid = json.load(f)
        
    with open(args.clusters) as f:
        # Key is "q_r", Val is cluster_id
        cluster_map = json.load(f)
        
    # Load Labels (Optional for prototype)
    try:
        with open(args.labels) as f:
            label_map = yaml.safe_load(f) or {}
    except FileNotFoundError:
        print("No labels.yaml found. Using defaults.")
        label_map = {} # map cluster_id -> terrain_type
        
    # Determine bounds
    coords = [list(map(int, k.split('_'))) for k in cluster_map.keys()]
    qs = [c[0] for c in coords]
    rs = [c[1] for c in coords]
    
    min_q, max_q = min(qs), max(qs)
    min_r, max_r = min(rs), max(rs)
    
    cols = max_q - min_q + 1
    rows = max_r - min_r + 1
    
    # Build HexMap Object
    hexmap = {
        "hexmap": "1.0",
        "metadata": {
            "title": "Imported ASL Map",
            "source": {"generated_by": "hexmap-importer"}
        },
        "grid": {
            "hex_top": grid['orientation'], # 'flat' or 'pointy'
            "columns": cols,
            "rows": rows,
            "coordinates": {
                "label": "custom", # Since we generate labels explicitly
                "origin": "top-left"
            },
            # "pixel_geo": grid['params'] # Store raw params?
        },
        "terrain": {
            "hex": {
                "clear": {"style": {"color": "#aaddaa"}},
                "forest": {"style": {"color": "#228822"}},
                "city": {"style": {"color": "#888888"}},
                "unknown": {"style": {"color": "#cccccc"}}
            }
        },
        "features": []
    }
    
    # Generate Hex Features
    for key, cid in cluster_map.items():
        q, r = map(int, key.split('_'))
        
        # Determine terrain
        terrain_type = label_map.get(cid, "unknown")
        if terrain_type not in ["clear", "forest", "city", "unknown"]:
             # If mapping points to un-defined type, use unknown
             pass
             
        label = get_asl_label(q, r, min_q, min_r)
        
        # User Coordinates (e.g. "A1") vs Cube?
        # The schema supports 'hex: "A1"'
        
        feature = {
            "hex": label,
            "terrain": terrain_type,
            # Store debug info
            "debug": {
                "q": q,
                "r": r,
                "cluster": cid
            }
        }
        
        hexmap["features"].append(feature)
        
    # Write Output
    with open(args.output, "w") as f:
        yaml.dump(hexmap, f, sort_keys=False)
        
    print(f"Generated {args.output} with {len(hexmap['features'])} hexes.")

if __name__ == "__main__":
    main()
