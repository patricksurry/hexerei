import cv2
import numpy as np
import matplotlib.pyplot as plt
from skimage.transform import hough_line, hough_line_peaks

# 1. Load image
#img_color = cv2.imread('tests/battle-for-moscow-map-full.jpg')
img_color = cv2.imread('tests/antietam.jpeg')
img_gray = cv2.cvtColor(img_color, cv2.COLOR_BGR2GRAY)

# Resize to workable dimensions if needed
MAX_DIM = 1200
h, w = img_gray.shape
if max(h, w) > MAX_DIM:
    scale = MAX_DIM / max(h, w)
    work_gray = cv2.resize(img_gray, (int(w * scale), int(h * scale)))
else:
    work_gray = img_gray.copy()

# 2. Extract edges
blurred = cv2.bilateralFilter(work_gray, d=9, sigmaColor=75, sigmaSpace=75)
# edges = cv2.Canny(blurred, 50, 150)
edges = blurred

# 3. Standard Hough Transform
# Test angles from -90 to 90 degrees (normal angles)
tested_angles = np.linspace(-np.pi / 2, np.pi / 2, 360, endpoint=False)
hough, theta, d = hough_line(edges, theta=tested_angles)

# 4. Plotting
fig, axes = plt.subplots(1, 4, figsize=(22, 5))

# Plot the original image
axes[0].imshow(cv2.cvtColor(work_color if 'work_color' in locals() else img_color, cv2.COLOR_BGR2RGB))
axes[0].set_title('Original Image (Moscow Map)')
axes[0].axis('off')

# Plot the raw Canny edges
axes[1].imshow(edges, cmap='gray')
axes[1].set_title('Canny Edges')
axes[1].axis('off')

# Plot the P/Theta Accumulator space (log scale for visibility)
axes[2].imshow(np.log(1 + hough),
               extent=[np.rad2deg(theta[-1]), np.rad2deg(theta[0]), d[-1], d[0]],
               cmap='inferno', aspect='auto')
axes[2].set_title('Hough Accumulator (log scale)')
axes[2].set_xlabel('Normal Angle $\\theta$ (degrees)')
axes[2].set_ylabel('Distance $\\rho$ (pixels)')

# Plot Angular Histogram (Sum of Squares)
angle_hist_sq = np.sum(hough**2, axis=0)

# Convert normal angle to line angle (0-180)
line_angles = (np.rad2deg(theta) + 90) % 180
sort_idx = np.argsort(line_angles)
line_angles_sorted = line_angles[sort_idx]
angle_hist_sq_sorted = angle_hist_sq[sort_idx]

# 5. Triplet Analysis
# Since lines don't have direction, 120 degree separation is equivalent to 60 degree separation
# in the 0-180 range. So we search for angle alpha in [0, 60) that maximizes:
# Score(alpha) = hist(alpha) + hist(alpha+60) + hist(alpha+120)

bin_width = 180.0 / len(angle_hist_sq_sorted)
best_alpha = 0
best_score = -1

for i in range(len(angle_hist_sq_sorted)):
    a = line_angles_sorted[i]
    if a >= 60:
        break
        
    i1 = i
    i2 = int(round((a + 60) / bin_width)) % len(angle_hist_sq_sorted)
    i3 = int(round((a + 120) / bin_width)) % len(angle_hist_sq_sorted)
    
    score = angle_hist_sq_sorted[i1] + angle_hist_sq_sorted[i2] + angle_hist_sq_sorted[i3]
    
    if score > best_score:
        best_score = score
        best_alpha = a

triplet = [best_alpha, best_alpha + 60, best_alpha + 120]

axes[3].plot(line_angles_sorted, angle_hist_sq_sorted, color='coral')
for t in triplet:
    axes[3].axvline(t, color='blue', linestyle='--', alpha=0.7, label=f'{t:.1f}°' if t == best_alpha else None)
axes[3].set_title(f'Triplets: $\\alpha$={best_alpha:.1f}°')
axes[3].set_xlabel('Line Angle (degrees)')
axes[3].set_ylabel('Total Votes (Squared)')
axes[3].set_xlim(0, 180)
axes[3].set_xticks(np.arange(0, 181, 30))
axes[3].grid(True, alpha=0.3)
axes[3].legend()

plt.tight_layout()
out_path = '/Users/psurry/.gemini/antigravity/brain/585f6413-42cd-43b2-b944-d6499191e022/moscow_hough.png'
plt.savefig(out_path, dpi=150)
# 6. Scale Extraction (1D FFT on Hough rho columns)
from scipy.signal import find_peaks

# Get the theta indices closest to the 3 dominant normal angles
# Line angle = Normal angle + 90
# Normal angle = Line angle - 90
target_normal_angles = [a - 90 for a in triplet]

# Map to scikit-image theta which is [-pi/2, pi/2]
# Normal angles can be < -90 or > 90, so wrap them
target_thetas = []
for t in target_normal_angles:
    t = t % 180
    if t >= 90:
        t -= 180
    target_thetas.append(np.deg2rad(t))

# Find closest indices in the theta array
theta_indices = [np.argmin(np.abs(theta - t_rad)) for t_rad in target_thetas]

periods = []
fft_results = []
fig2, axes2 = plt.subplots(3, 2, figsize=(14, 9))

for i, (idx, angle) in enumerate(zip(theta_indices, triplet)):
    # Extract the column
    profile = hough[:, idx]
    
    # 1D FFT
    profile_centered = profile - np.mean(profile)
    # The rho spacing is 1 pixel
    fft = np.fft.rfft(profile_centered * np.hanning(len(profile_centered)))
    fft_mag = np.abs(fft)
    freqs = np.fft.rfftfreq(len(profile_centered))
    
    # Valid frequencies (ignore DC and very high frequencies)
    valid = (freqs > 1/150) & (freqs < 1/10)
    mag_valid = fft_mag.copy()
    mag_valid[~valid] = 0
    
    # Find peak
    peak_idx = np.argmax(mag_valid)
    period = 1.0 / freqs[peak_idx] if freqs[peak_idx] > 0 else None
    
    periods.append(period)
    fft_results.append((freqs, fft_mag, valid))
    
    axes2[i, 0].plot(d, profile, color='steelblue')
    axes2[i, 0].set_title(f'Accumulator profile @ Line Angle {angle:.1f}°')
    axes2[i, 0].set_xlabel('Distance $\\rho$ (pixels)')
    
    axes2[i, 1].plot(1.0/freqs[valid], fft_mag[valid], color='coral')
    if period:
        axes2[i, 1].axvline(period, color='red', linestyle='--')
        axes2[i, 1].set_title(f'FFT Magnitude (Peak = {period:.1f}px)')
    else:
        axes2[i, 1].set_title(f'FFT Magnitude')
    axes2[i, 1].set_xlabel('Period $\\rho$ (pixels)')
    axes2[i, 1].set_xlim(5, 100)

plt.tight_layout()
out_path2 = '/Users/psurry/.gemini/antigravity/brain/585f6413-42cd-43b2-b944-d6499191e022/hough_scale.png'
plt.savefig(out_path2, dpi=150)

if periods:
    median_period = np.median([p for p in periods if p is not None])
    side_est = median_period / (np.sqrt(3) / 2)
    print(f"Median line spacing (apothem) from Hough: {median_period:.1f}px")
    print(f"Estimated hex side length: {side_est:.1f}px")

print(f"Saved plot to {out_path} with triplet {triplet}")
print(f"Saved scale plot to {out_path2}")
