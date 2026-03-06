import cv2
import numpy as np
import matplotlib.pyplot as plt
import sys
import os

def experiment_fft_mask(img_path):
    print(f"Processing {img_path}...")
    img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        print("Error loading image")
        return

    h, w = img.shape
    f = np.fft.fft2(img)
    fshift = np.fft.fftshift(f)
    
    # Create Mask
    # Donut around expected frequency
    # Scale ~ 33 px.
    # Freq Radius r_hex = avg_N / (sqrt(3)*s) ~ 50 px.
    
    # Load Scale from Params if available
    base_name = os.path.basename(img_path).split('.')[0]
    json_path = f"diagnostics/{base_name}_params.json"
    
    scale_est = 33.0
    if os.path.exists(json_path):
        import json
        with open(json_path, 'r') as f:
            params = json.load(f)
        scale_est = params[3] # Index 3 is scale
        print(f"Loaded scale from params: {scale_est:.2f}")
    
    avg_N = (w + h) / 2
    
    # We want to check around scale_est
    # Let's search range 0.8 to 1.2
    scales = np.arange(0.8, 1.25, 0.1)
    
    rows, cols = h, w
    crow, ccol = rows//2, cols//2
    y, x = np.ogrid[:rows, :cols]
    r_map = np.sqrt((x - ccol)**2 + (y - crow)**2)
    
    for mult in scales:
        s = scale_est * mult
        r_center = avg_N / (np.sqrt(3) * s)
        
        # Bandwidth relative to center frequency?
        # r_center is small (~12px for s=136).
        # Bandwidth 5 is huge relative to 12.
        # Let's use proportional bandwidth.
        
        # Mask (Float for Gaussian)
        mask = np.zeros((rows, cols), np.float32)
        
        # Harmonics
        # Gaussian Mask
        harmonic = 1
        r_h = r_center * harmonic
        sigma = max(2, r_h * 0.15) # Sigma ~ 15%
        
        # Gaussian: exp(-0.5 * ((r - r_h)/sigma)**2)
        g_mask = np.exp(-0.5 * ((r_map - r_h) / sigma)**2)
        
        # Add to mask (or max?)
        # Since we only have one band, just assign.
        mask = g_mask
        
        # Apply Mask (Float multiplication)
        fshift_masked = fshift * mask
        
        # Inverse FFT
        f_ishift = np.fft.ifftshift(fshift_masked)
        img_back = np.fft.ifft2(f_ishift)
        img_back = np.abs(img_back)
        
        img_back_norm = cv2.normalize(img_back, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        
        base_name = os.path.basename(img_path).split('.')[0]
        out_path = f"diagnostics/{base_name}_06_fft_inverse_scale_{mult:.1f}.png"
        cv2.imwrite(out_path, img_back_norm)
        print(f"Saved {out_path}")
    
    # Save Mask visualization
    mask_disp = mask * 255
    # Zoom mask
    zoom_r = 200
    mask_zoom = mask_disp[crow-zoom_r:crow+zoom_r, ccol-zoom_r:ccol+zoom_r]
    cv2.imwrite(f"diagnostics/{base_name}_06_fft_mask.png", mask_zoom)
    print(f"Saved mask diagnostics.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        experiment_fft_mask(sys.argv[1])
    else:
        experiment_fft_mask("tests/battle-for-moscow-map-full.jpg")
