import cv2
import numpy as np

img = cv2.imread('../tests/asl_02.png', 0)
blurred = cv2.bilateralFilter(img, d=9, sigmaColor=75, sigmaSpace=75)

lines = cv2.HoughLinesP(blurred, 1, np.pi/180, 50, minLineLength=20, maxLineGap=3)
if lines is not None:
    print(len(lines))
else:
    print("No lines")
