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

min_len = max(15, min(work_gray.shape) // 50)

lines = cv2.HoughLinesP(edges, rho=1, theta=np.pi/180,
                        threshold=30, minLineLength=min_len, maxLineGap=3)

angles_raw = []
lengths = []
for line in lines:
    x1, y1, x2, y2 = line[0]
    angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
    angle = angle % 180
    length = np.hypot(x2 - x1, y2 - y1)
    angles_raw.append(angle)
    lengths.append(length)

angles_raw = np.array(angles_raw)
lengths = np.array(lengths)

bin_edges = np.linspace(0, 180, 180 + 1)
hist, _ = np.histogram(angles_raw, bins=bin_edges, weights=lengths)

bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2
top_indices = np.argsort(hist)[::-1][:10]
for idx in top_indices:
    print(f"Angle {bin_centers[idx]:.1f}°: Weight {hist[idx]:.1f}")
