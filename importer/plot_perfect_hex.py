import sys
import os
sys.path.insert(0, os.path.abspath('src'))

import cv2
import numpy as np
import matplotlib.pyplot as plt
from skimage.transform import hough_line
from grid_utils import GridParams, overlay_grid

# 1. Create a perfectly black image
size = 600
img_color = np.zeros((size, size, 3), dtype=np.uint8)

# 2. Define and draw a perfect flat-top hex grid
params = GridParams(
    grid_type='hex_flat',
    side_length=30.0,
    rotation_deg=0.0,
    origin=(0.0, 0.0)
)

# overlay_grid draws the grid
img_grid = overlay_grid(img_color, params, color=(255, 255, 255), thickness=1)
img_gray = cv2.cvtColor(img_grid, cv2.COLOR_BGR2GRAY)

# 3. Standard Hough Transform
tested_angles = np.linspace(-np.pi / 2, np.pi / 2, 720, endpoint=False)
hough, theta, d = hough_line(img_gray, theta=tested_angles)

# 4. Plotting
fig, axes = plt.subplots(1, 4, figsize=(22, 5))

# Plot the raw grid
axes[0].imshow(img_gray, cmap='gray')
axes[0].set_title('Perfect Hex Grid')
axes[0].axis('off')

# Plot the P/Theta Accumulator space (log scale for visibility)
axes[1].imshow(np.log(1 + hough),
               extent=[np.rad2deg(theta[-1]), np.rad2deg(theta[0]), d[-1], d[0]],
               cmap='inferno', aspect='auto')
axes[1].set_title('Hough Accumulator (log scale)')
axes[1].set_xlabel('Normal Angle (degrees)')
axes[1].set_ylabel('Distance (pixels)')

# Plot Angular Histogram (Summed over rho)
# Here we square the accumulator values to give more weight to strong lines
# because a grid is made of few very strong lines, rather than many weak ones
angle_hist = np.sum(hough, axis=0)
angle_hist_sq = np.sum(hough**2, axis=0)

line_angles = (np.rad2deg(theta) + 90) % 180
sort_idx = np.argsort(line_angles)
line_angles_sorted = line_angles[sort_idx]
angle_hist_sorted = angle_hist[sort_idx]
angle_hist_sq_sorted = angle_hist_sq[sort_idx]

axes[2].plot(line_angles_sorted, angle_hist_sorted, color='steelblue')
axes[2].set_title('Accumulator Sum vs Line Angle')
axes[2].set_xlabel('Line Angle (degrees)')
axes[2].set_ylabel('Total Votes (Linear)')
axes[2].set_xlim(0, 180)
axes[2].set_xticks(np.arange(0, 181, 30))
axes[2].grid(True, alpha=0.3)

axes[3].plot(line_angles_sorted, angle_hist_sq_sorted, color='coral')
axes[3].set_title('Accumulator Sum of Squares vs Line Angle')
axes[3].set_xlabel('Line Angle (degrees)')
axes[3].set_ylabel('Total Votes (Squared)')
axes[3].set_xlim(0, 180)
axes[3].set_xticks(np.arange(0, 181, 30))
axes[3].grid(True, alpha=0.3)

plt.tight_layout()
out_path = '/Users/psurry/.gemini/antigravity/brain/585f6413-42cd-43b2-b944-d6499191e022/perfect_hex_hough.png'
plt.savefig(out_path, dpi=150)
print(f"Saved plot to {out_path}")
