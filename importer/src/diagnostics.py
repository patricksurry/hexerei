import os
import base64
import io
import cv2
import matplotlib.pyplot as plt
from matplotlib.patches import Circle
import numpy as np

class DiagnosticReport:
    def __init__(self, output_dir, image_name):
        self.output_dir = output_dir
        self.image_name = image_name
        self.sections = []
        os.makedirs(output_dir, exist_ok=True)
        
    def add_section(self, title, text, fig=None):
        img_tag = ""
        if fig is not None:
            buf = io.BytesIO()
            fig.savefig(buf, format='png', bbox_inches='tight')
            buf.seek(0)
            img_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
            img_tag = f'<img src="data:image/png;base64,{img_b64}" style="max-width:100%; border:1px solid #ccc;"/>'
            plt.close(fig)
            
        self.sections.append(f"<h2>{title}</h2><p>{text}</p>{img_tag}<hr>")
        
    def save(self):
        html_content = f"""
        <html>
        <head>
            <title>Grid Detection Report - {self.image_name}</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; color: #333; }}
                h1, h2 {{ color: #2c3e50; }}
                hr {{ border: 0; height: 1px; background: #eee; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <h1>Grid Detection Diagnostics: {self.image_name}</h1>
            {''.join(self.sections)}
        </body>
        </html>
        """
        out_path = os.path.join(self.output_dir, f"{self.image_name}_report.html")
        with open(out_path, 'w') as f:
            f.write(html_content)
        return out_path

def plot_spotlights(img_gray, votes, best_cluster):
    """Plot spotlight locations on the image."""
    fig, ax = plt.subplots(1, 1, figsize=(10, 10))
    ax.imshow(img_gray, cmap='gray')
    
    winning_set = set(id(m) for m in best_cluster['members'])
    
    snrs = np.array([v['snr'] for v in votes])
    snr_max = snrs.max() if len(snrs) > 0 else 1.0
    
    for v in votes:
        cx, cy = v['cx'], v['cy']
        sig = v.get('sigma', 50)
        is_winner = id(v) in winning_set
        color = 'lime' if is_winner else 'red'
        snr_frac = v['snr'] / snr_max if snr_max > 0 else 0
        
        ax.add_patch(Circle((cx, cy), sig, fill=False, edgecolor=color, linewidth=1.0 + snr_frac, alpha=0.7))
        ax.plot(cx, cy, '+', color=color, markersize=6, markeredgewidth=1)
        
    ax.set_title("Spotlight Locations (Green=Winning Cluster, Red=Other)")
    ax.axis('off')
    return fig

def plot_vote_scatter(votes, clusters):
    """Scatter plot of the SNR-weighted votes."""
    fig, axes = plt.subplots(1, 2, figsize=(15, 5))
    
    best = clusters[0]
    winning_set = set(id(m) for m in best['members'])
    
    snrs = np.array([v['snr'] for v in votes])
    sides = [v['side'] for v in votes]
    rots = [v['rotation'] for v in votes]
    colors = ['green' if id(v) in winning_set else 'red' for v in votes]
    
    axes[0].scatter(sides, rots, c=snrs, cmap='RdYlGn', s=50, edgecolors=colors, linewidths=1.5, vmin=0)
    
    for i, c in enumerate(clusters[:3]):
        marker = '*' if i == 0 else 'D'
        axes[0].plot(c['side'], c['rotation'], marker, color='blue' if i == 0 else 'gray',
                     markersize=15, markeredgecolor='black', markeredgewidth=1.5,
                     label=f'Cluster {i}: n={c["n_votes"]}, w={c["weight"]:.0f}')
                     
    axes[0].set_xlabel('Side length (px)')
    axes[0].set_ylabel('Rotation (deg)')
    axes[0].set_title('Vote Scatter (Color=SNR)')
    axes[0].legend()
    
    # SNR Histogram
    snr_win = [v['snr'] for v in votes if id(v) in winning_set]
    snr_lose = [v['snr'] for v in votes if id(v) not in winning_set]
    
    bins = np.linspace(0, max(snrs) * 1.1, 15) if len(snrs) > 0 else 10
    axes[1].hist(snr_win, bins=bins, alpha=0.7, color='green', label=f'Winning (n={len(snr_win)})')
    if snr_lose:
        axes[1].hist(snr_lose, bins=bins, alpha=0.7, color='red', label=f'Other (n={len(snr_lose)})')
        
    axes[1].set_xlabel('SNR')
    axes[1].set_ylabel('Count')
    axes[1].set_title('SNR Distribution')
    axes[1].legend()
    
    return fig

def plot_final_overlay(orig_img, params):
    """Plot the final detected grid on the original image."""
    from grid_utils import overlay_grid
    
    vis = overlay_grid(orig_img, params, color=(0, 255, 0), thickness=2)
    
    fig, ax = plt.subplots(1, 1, figsize=(12, 12))
    ax.imshow(cv2.cvtColor(vis, cv2.COLOR_BGR2RGB))
    ax.set_title(f"Final Detection: {params.grid_type}, s={params.side_length:.1f}, rot={params.rotation_deg:.1f}°")
    ax.axis('off')
    return fig

def plot_symmetry_optimization(dt_map, initial_params, final_params, flat_top):
    """Plot edge and center samples before and after optimization."""
    from symmetry_optimizer import generate_sample_points
    
    fig, axes = plt.subplots(1, 2, figsize=(15, 7))
    h, w = dt_map.shape
    
    # Init
    centers_xy_i, edges_xy_i = generate_sample_points(w, h, initial_params, flat_top)
    axes[0].imshow(dt_map, cmap='gray')
    if len(centers_xy_i) > 0:
        axes[0].plot(centers_xy_i[:, 0], centers_xy_i[:, 1], 'bo', markersize=2, label='Centers')
    if len(edges_xy_i) > 0:
        axes[0].plot(edges_xy_i[:, 0], edges_xy_i[:, 1], 'r.', markersize=1, label='Edges')
    axes[0].set_title(f"Initial: tx={initial_params[0]:.1f}, ty={initial_params[1]:.1f}")
    axes[0].axis('off')
    
    # Final
    centers_xy_f, edges_xy_f = generate_sample_points(w, h, final_params, flat_top)
    axes[1].imshow(dt_map, cmap='gray')
    if len(centers_xy_f) > 0:
        axes[1].plot(centers_xy_f[:, 0], centers_xy_f[:, 1], 'bo', markersize=2, label='Centers')
    if len(edges_xy_f) > 0:
        axes[1].plot(edges_xy_f[:, 0], edges_xy_f[:, 1], 'r.', markersize=1, label='Edges')
    axes[1].set_title(f"Final: tx={final_params[0]:.1f}, ty={final_params[1]:.1f}")
    axes[1].axis('off')
    
    return fig
