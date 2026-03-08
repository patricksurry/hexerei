import { Scene } from '../model/scene.js';

export interface DrawOptions {
  showLabels?: boolean;
  labelMinZoom?: number;
  labelColor?: string;
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  options: DrawOptions = {}
): void {
  const { 
    showLabels = true, 
    labelMinZoom = 20, 
    labelColor = '#555555' 
  } = options;

  // Clear canvas
  ctx.fillStyle = scene.background.trim() || '#141414';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Draw hexes
  ctx.strokeStyle = '#2A2A2A';
  ctx.lineWidth = 1;

  for (const hex of scene.hexagons) {
    ctx.beginPath();
    const corners = hex.corners;
    if (corners.length < 6) continue;
    
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = hex.fill;
    ctx.fill();
    ctx.stroke();
  }

  // Draw highlights
  for (const hl of scene.highlights) {
    ctx.beginPath();
    const corners = hl.corners;
    if (corners.length < 6) continue;
    
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();

    if (hl.style === 'select') {
      ctx.fillStyle = `${hl.color}33`; // 20% alpha (0x33)
      ctx.fill();
      ctx.strokeStyle = hl.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.fillStyle = `${hl.color}1A`; // 10% alpha (0x1A)
      ctx.fill();
    }
  }

  // Draw labels
  if (showLabels) {
    // We need a way to check zoom. We can infer it from the first hex size if needed,
    // or pass it in options. Let's assume we want to draw if they are big enough.
    // Calculate distance between two corners as a proxy for zoom
    if (scene.hexagons.length > 0) {
      const h0 = scene.hexagons[0];
      const dist = Math.sqrt(
        Math.pow(h0.corners[0].x - h0.center.x, 2) + 
        Math.pow(h0.corners[0].y - h0.center.y, 2)
      );
      
      if (dist > labelMinZoom) {
        ctx.fillStyle = labelColor;
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        for (const hex of scene.hexagons) {
          ctx.fillText(hex.label, hex.center.x, hex.center.y);
        }
      }
    }
  }
}
