import json

with open("notebooks_hough/01_hough_angle_histogram.ipynb", "r") as f:
    nb = json.load(f)

# Re-enable Canny edge detection in Step 1
for cell in nb["cells"]:
    if cell["cell_type"] == "code":
        sources = cell["source"]
        for i, line in enumerate(sources):
            if "edges = blurred" in line:
                sources[i] = "edges = cv2.Canny(blurred, 50, 150)\n"
            elif "No Canny edges" in line:
                sources[i] = "# Canny edges on the blurred image\n"
        cell["source"] = sources

# Find Step 2
idx = -1
for i, cell in enumerate(nb["cells"]):
    if cell["cell_type"] == "markdown":
        text = "".join(cell["source"])
        if "Step 2: Hough line" in text:
            idx = i
            break

if idx != -1:
    nb["cells"][idx]["source"] = [
        "## Step 2: Hough Transform & Accumulator Visualization\n",
        "Visualizing the standard Hough Transform space (rho vs theta) to understand the angle distribution."
    ]
    
    code = """from skimage.transform import hough_line, hough_line_peaks
import matplotlib.pyplot as plt
import numpy as np

# Standard Hough transform using scikit-image
# Angles from -90 to 90 degrees
tested_angles = np.linspace(-np.pi / 2, np.pi / 2, 360, endpoint=False)
h, theta, d = hough_line(edges, theta=tested_angles)

fig, axes = plt.subplots(1, 4, figsize=(20, 5))

# Plot accumulator
axes[0].imshow(np.log(1 + h),
               extent=[np.rad2deg(theta[-1]), np.rad2deg(theta[0]), d[-1], d[0]],
               cmap='inferno', aspect='auto')
axes[0].set_title('Hough Accumulator (log scale)')
axes[0].set_xlabel('Normal Angle (degrees)')
axes[0].set_ylabel('Distance (pixels)')

# Find top peaks in accumulator
accum, peak_angles, dists = hough_line_peaks(h, theta, d, num_peaks=30)

axes[1].imshow(edges, cmap='gray')
axes[1].set_title('Top 30 Detected Lines')
axes[1].set_ylim((edges.shape[0], 0))
axes[1].set_xlim((0, edges.shape[1]))

for _, angle, dist in zip(accum, peak_angles, dists):
    # Plot line
    if np.abs(np.sin(angle)) > 0.001:
        y0 = (dist - 0 * np.cos(angle)) / np.sin(angle)
        y1 = (dist - edges.shape[1] * np.cos(angle)) / np.sin(angle)
        axes[1].plot((0, edges.shape[1]), (y0, y1), '-r', alpha=0.5)
    else:
        x0 = dist / np.cos(angle)
        axes[1].plot((x0, x0), (0, edges.shape[0]), '-r', alpha=0.5)

# Plot Angular Histogram (summing over distance)
angle_hist = np.sum(h, axis=0) # shape (360,)

# We want the distribution of Line Angles (0 to 180 degrees)
# Line angle = normal angle + 90
line_angles = (np.rad2deg(theta) + 90) % 180

# Sort the angles from 0 to 180 to plot them properly
sort_idx = np.argsort(line_angles)
line_angles_sorted = line_angles[sort_idx]
angle_hist_sorted = angle_hist[sort_idx]

axes[2].plot(line_angles_sorted, angle_hist_sorted, color='steelblue')
axes[2].set_title('Accumulator Sum vs Line Angle')
axes[2].set_xlabel('Line Angle (degrees)')
axes[2].set_ylabel('Total Votes')
axes[2].set_xlim(0, 180)

# Also plot the raw line segment angles from HoughLinesP just for comparison
lines_p = cv2.HoughLinesP(edges, 1, np.pi/180, 50, minLineLength=20, maxLineGap=3)
if lines_p is not None:
    angles_p = [(np.degrees(np.arctan2(y2-y1, x2-x1)) % 180) for x1,y1,x2,y2 in lines_p[:,0]]
    axes[3].hist(angles_p, bins=180, range=(0,180), color='coral')
    axes[3].set_title('HoughLinesP Segment Angles')
    axes[3].set_xlabel('Line Angle (degrees)')
    axes[3].set_xlim(0, 180)

plt.tight_layout()
plt.show()

# Export variables for Step 3
angles = line_angles_sorted
hist = angle_hist_sorted

# Apply slight smoothing for peak finding in Step 3
kernel = np.ones(5) / 5
hist_padded = np.concatenate([hist[-2:], hist, hist[:2]])
hist = np.convolve(hist_padded, kernel, mode='same')[2:-2]

n_lines = len(peak_angles)
"""
    code_lines = [line + "\n" for line in code.split("\n")]
    code_lines[-1] = code_lines[-1][:-1]
    
    nb["cells"][idx+1]["source"] = code_lines

with open("notebooks_hough/01_hough_angle_histogram.ipynb", "w") as f:
    json.dump(nb, f, indent=1)
