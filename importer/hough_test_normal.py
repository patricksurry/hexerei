import cv2
import numpy as np

img_path = 'tests/asl_02.png'
img_color = cv2.imread(img_path)
img_gray = cv2.cvtColor(img_color, cv2.COLOR_BGR2GRAY)

h, w = img_gray.shape
scale_factor = 1.0
MAX_DIM = 1200
if max(h, w) > MAX_DIM:
    scale_factor = MAX_DIM / max(h, w)
    work_gray = cv2.resize(img_gray, (int(w * scale_factor), int(h * scale_factor)))
else:
    work_gray = img_gray.copy()

blurred = cv2.bilateralFilter(work_gray, d=9, sigmaColor=75, sigmaSpace=75)
edges = cv2.Canny(blurred, 50, 150)

# Use HoughLines instead of HoughLinesP
# threshold depends on image size, number of edge points required on a line
# Since minLineLength for HoughLinesP was min_len (~15-24)
min_len = max(15, min(work_gray.shape) // 50)
threshold = min_len * 2 # A reasonable threshold for number of votes

lines = cv2.HoughLines(edges, rho=1, theta=np.pi/180, threshold=threshold)

if lines is not None:
    print(f"Found {len(lines)} lines")
    # lines shaped (N, 1, 2) where element is [rho, theta]
    # theta is normal angle in radians [0, pi]
    # line angle is theta + 90 degrees
    thetas = lines[:, 0, 1]
    
    # Line angle in degrees
    line_angles_deg = np.degrees(thetas) + 90
    line_angles_deg = line_angles_deg % 180
    
    # Histogram
    bin_edges = np.linspace(0, 180, 180 + 1)
    # Give uniform weight of 1 per line (or magnitude of rho? no just 1)
    hist, _ = np.histogram(line_angles_deg, bins=bin_edges)
    
    bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2
    top_indices = np.argsort(hist)[::-1][:10]
    for idx in top_indices:
        print(f"Angle {bin_centers[idx]:.1f}°: Count {hist[idx]}")
else:
    print("No lines found")
