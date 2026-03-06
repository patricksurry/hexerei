import cv2
import numpy as np
import time

img = cv2.imread('tests/asl_02.png', 0)
blurred = cv2.bilateralFilter(img, d=9, sigmaColor=75, sigmaSpace=75)

t0 = time.time()
lines = cv2.HoughLinesP(blurred, 1, np.pi/180, 50, minLineLength=20, maxLineGap=3)
t1 = time.time()
print(f"Hough on blurred: {len(lines) if lines is not None else 0} lines in {t1-t0:.2f}s")

edges = cv2.Canny(blurred, 50, 150)
t0 = time.time()
lines = cv2.HoughLinesP(edges, 1, np.pi/180, 50, minLineLength=20, maxLineGap=3)
t1 = time.time()
print(f"Hough on Canny: {len(lines) if lines is not None else 0} lines in {t1-t0:.2f}s")
