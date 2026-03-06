import cv2
import numpy as np
import matplotlib.pyplot as plt
import sys
import os

def experiment_fft(img_path):
    print(f"Processing {img_path}...")
    img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        print("Error loading image")
        return

    # Resize for speed/display?
    # FFT on full size is better for resolution.
    h, w = img.shape
    
    # Optional: Windowing to reduce edge effects
    # window = np.outer(np.hanning(h), np.hanning(w))
    # img = img * window
    
    # FFT
    f = np.fft.fft2(img)
    fshift = np.fft.fftshift(f)
    
    # Magnitude Spectrum
    magnitude_spectrum = 20 * np.log(np.abs(fshift) + 1)
    
    # Expected Frequency
    # Hex Size (Scale) ~ 33 px (Side)
    # Hex Width (flat top) = 2 * Scale = 66 px? No.
    # Flat top: Width = 2 * size. Height = sqrt(3) * size.
    # Distance between column centers = 1.5 * size = 1.5 * 33 = 49.5 px.
    # Distance between row centers = sqrt(3) * size = 57 px.
    
    # Frequencies:
    # k_x = w / T_x
    # k_y = h / T_y
    
    scale_est = 33.0
    Tx = 1.5 * scale_est # 49.5
    Ty = np.sqrt(3) * scale_est # 57.1
    Ty_half = Ty / 2.0 # Rows are offset?
    
    kx = w / Tx
    ky = h / Ty
    
    print(f"Image Size: {w}x{h}")
    print(f"Expected kx: {kx:.1f}, ky: {ky:.1f} (roughly)")
    
    plt.figure(figsize=(12, 12))
    plt.imshow(magnitude_spectrum, cmap='gray')
    # Load Scale from Params if available
    base_name = os.path.basename(img_path).split('.')[0]
    json_path = f"diagnostics/{base_name}_params.json"
    
    if os.path.exists(json_path):
        import json
        with open(json_path, 'r') as f:
            params = json.load(f)
        scale_est = params[3]
        print(f"Loaded scale from params: {scale_est:.2f}")
    
    # Calculate expected frequency radius
    # Hex Height (row spacing) h_hex = sqrt(3) * s
    # Frequency k = N / h_hex
    # N = average dimension? Or use specific dim for kx/ky?
    # For isotropic FFT radius:
    avg_N = (w + h) / 2
    r_hex = avg_N / (np.sqrt(3) * scale_est)
    print(f"Expected Frequency Radius: {r_hex:.1f} px")
    # If period is 33px. k = N/33.
    # Let's verify.
    
    cx, cy = w//2, h//2
    
    plt.title(f'Magnitude Spectrum (Log Scale)\nSize: {w}x{h}, Est Scale: {scale_est}px')
    
    # Annotate expected ring?
    # Radius in freq domain roughly N / T.
    # Lets draw a circle at radius N / 33? 
    # Average N.
    # r = avg_N / scale_est
    # No, r is cycles per image.
    
    # Draw circles for various potential scales
    scales = [30, 33, 36]
    for s in scales:
        # Hex lattice implies 6 points.
        # Fundamental frequency corresponds to lattice spacing.
        # Spacing is d = sqrt(3)/2 * 2*s = sqrt(3)*s (row spacing)
        # And 1.5*s (col spacing).
        
        # Let's just draw the circle corresponding to period 's'
        # k = N / s.
        radius = avg_N / s
        circle = plt.Circle((cx, cy), radius, color='r', fill=False, linestyle='--', alpha=0.5)
        # plt.gca().add_patch(circle)
        
    # Draw expected peaks for Hex Grid
    from matplotlib.patches import Arc
    
    # Spacing is roughly sqrt(3)*s = 57px.
    # Radius = avg_N / 57.
    r_hex = avg_N / (np.sqrt(3) * scale_est)
    
    # Draw Half Circle (0 to 180 deg) so user can see peaks under the other half
    # Diameter = 2 * r_hex
    arc = Arc((cx, cy), 2*r_hex, 2*r_hex, angle=0, theta1=0, theta2=180, 
              color='g', linewidth=2, label=f'Freq for {57:.1f}px (Row Height)')
    plt.gca().add_patch(arc)

    # r_col = avg_N / (1.5 * scale_est)
    # circle2 = plt.Circle((cx, cy), r_col, color='y', fill=False, label=f'Freq for {49.5:.1f}px (Col Spacing)')
    # plt.gca().add_patch(circle2)

    plt.legend()
    
    base_name = os.path.basename(img_path).split('.')[0]
    out_path = f"diagnostics/{base_name}_04_fft.png"
    plt.savefig(out_path)
    print(f"Saved {out_path}")
    
    # Zoomed Plot (Center +/- 200px)
    zoom_r = 200
    r_start = cy - zoom_r
    r_end = cy + zoom_r
    c_start = cx - zoom_r
    c_end = cx + zoom_r
    
    # Crop spectrum
    mag_zoom = magnitude_spectrum[r_start:r_end, c_start:c_end]
    
    plt.figure(figsize=(10, 10))
    plt.imshow(mag_zoom, cmap='gray', extent=[-zoom_r, zoom_r, -zoom_r, zoom_r])
    plt.title(f'Zoomed Magnitude Spectrum (+/- {zoom_r} px)\nLow Frequency = Large Features')
    
    # Draw Arc on Zoomed (Coordinates relative to center 0,0)
    # r_hex is radius.
    from matplotlib.patches import Arc
    arc = Arc((0, 0), 2*r_hex, 2*r_hex, angle=0, theta1=0, theta2=180, 
              color='g', linewidth=2, label=f'Freq for 57px (Row Height)')
    plt.gca().add_patch(arc)
    
    plt.legend()
    out_zoom = f"diagnostics/{base_name}_05_fft_zoom.png"
    plt.savefig(out_zoom)
    print(f"Saved {out_zoom}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        experiment_fft(sys.argv[1])
    else:
        experiment_fft("tests/battle-for-moscow-map-full.jpg")
