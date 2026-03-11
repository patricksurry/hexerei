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
    labelMinZoom = 12, 
    labelColor = '#888888' 
  } = options;

  // Clear canvas
  ctx.fillStyle = scene.background.trim() || '#141414';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Draw hexes
  ctx.strokeStyle = '#3A3A3A';
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
      ctx.fillStyle = `${hl.color}33`; 
      ctx.fill();
      ctx.strokeStyle = hl.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.stroke();
    } else if (hl.style === 'ghost') {
      ctx.strokeStyle = hl.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.fillStyle = `${hl.color}1A`; 
      ctx.fill();
    }
  }

  // Draw edge highlights
  for (const edge of scene.edgeHighlights) {
    ctx.beginPath();
    ctx.moveTo(edge.p1.x, edge.p1.y);
    ctx.lineTo(edge.p2.x, edge.p2.y);
    ctx.strokeStyle = edge.color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // Draw vertex highlights
  for (const vtx of scene.vertexHighlights) {
    ctx.beginPath();
    ctx.arc(vtx.point.x, vtx.point.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = vtx.color;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Draw path lines
  for (const line of scene.pathLines) {
    if (line.points.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(line.points[0].x, line.points[0].y);
    for (let i = 1; i < line.points.length; i++) {
      ctx.lineTo(line.points[i].x, line.points[i].y);
    }
    ctx.strokeStyle = line.color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw labels
  if (showLabels && scene.hexagons.length > 0) {
    const h0 = scene.hexagons[0];
    const hexScreenRadius = Math.sqrt(
      Math.pow(h0.corners[0].x - h0.center.x, 2) + 
      Math.pow(h0.corners[0].y - h0.center.y, 2)
    );
    
    if (hexScreenRadius > labelMinZoom) {
      // Scale font with hex size, no hard cap so labels grow with zoom
      const fontSize = Math.max(8, hexScreenRadius * 0.28);
      ctx.fillStyle = labelColor;
      ctx.font = `${fontSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      for (const hex of scene.hexagons) {
        // Position near top of hex — shift up by ~40% of radius
        const labelY = hex.center.y - hexScreenRadius * 0.40;
        ctx.fillText(hex.label, hex.center.x, labelY);
      }
    }
  }

  // Feature labels
  if (scene.featureLabels.length > 0 && scene.hexagons.length > 0) {
    const h0 = scene.hexagons[0];
    const hexScreenRadius = Math.sqrt(
      Math.pow(h0.corners[0].x - h0.center.x, 2) +
      Math.pow(h0.corners[0].y - h0.center.y, 2)
    );
    if (hexScreenRadius > (options.labelMinZoom ?? 12)) {
      const fontSize = Math.max(7, hexScreenRadius * 0.22);
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const fl of scene.featureLabels) {
        // Dark outline for legibility on any terrain
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 3;
        ctx.strokeText(fl.text, fl.point.x, fl.point.y);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(fl.text, fl.point.x, fl.point.y);
      }
    }
  }
}
