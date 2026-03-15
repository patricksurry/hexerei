import { HexMapLoader } from '@hexmap/core/loader';
import { HexRenderer } from '../src/index';

// We need to fetch the raw map file.
// Vite can serve static assets. We'll assume the yaml file is available.
const MAP_URL = '/battle-for-moscow.hexmap.yaml';

async function init() {
  try {
    const response = await fetch(MAP_URL);
    if (!response.ok) throw new Error(`Failed to fetch map: ${response.statusText}`);
    const yaml = await response.text();

    const mesh = HexMapLoader.load(yaml);
    const container = document.getElementById('render-container')!;

    // Config for Full Map
    // Image: 3300 x 2448 (Rotated)
    const width = 3300;
    const height = 2448;
    const hexSize = 50; // Estimated from width analysis

    // Resize container to match image for accurate overlay/scroll
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
    container.style.position = 'relative';

    const renderer = new HexRenderer(mesh, {
      element: container,
      width,
      height,
      hexSize,
      origin: { x: 50, y: 50 }, // Update margins?
    });

    // Controls
    const img = document.getElementById('source-image') as HTMLImageElement;
    const chkOverlay = document.getElementById('chk-overlay') as HTMLInputElement;
    const rngOpacity = document.getElementById('rng-opacity') as HTMLInputElement;

    // Ensure image matches container scale if displayed
    img.width = width;
    img.height = height;
    // Absolute position to overlay?
    img.style.position = 'absolute';
    img.style.top = '0';
    img.style.left = '0';
    img.style.pointerEvents = 'none'; // Let clicks pass through to renderer
    img.style.zIndex = '10'; // On top

    chkOverlay.addEventListener('change', () => {
      img.style.display = chkOverlay.checked ? 'block' : 'none';
    });

    rngOpacity.addEventListener('input', () => {
      img.style.opacity = rngOpacity.value;
    });
  } catch (e) {
    console.error('Initialization Error:', e);
  }
}

init();
