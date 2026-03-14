import {  Scene  } from '@hexmap/canvas';

export interface CanvasTheme {
  background: string;
  gridStroke: string;
  gridLineWidth: number;
  terrainOpacity: number;        // 0–1, applied to terrain fills
  labelColor: string;
  labelGlow: string | null;      // null = no glow
  selectionGlow: number;         // shadowBlur radius
  hoverGlow: number;
  featureLabelColor: string;
  featureLabelShadow: string;
}

export interface DrawOptions {
  showLabels?: boolean;
  labelMinZoom?: number;
  theme?: CanvasTheme;
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  options: DrawOptions = {}
): void {
  const { 
    showLabels = true, 
    labelMinZoom = 12,
    theme
  } = options;

  // Use theme colors or fallbacks from scene/hardcoded
  const background = theme?.background || scene.background.trim() || '#141414';
  const gridStroke = theme?.gridStroke || '#3A3A3A';
  const gridLineWidth = theme?.gridLineWidth ?? 1;
  const terrainOpacity = theme?.terrainOpacity ?? 1.0;
  const labelColor = theme?.labelColor || '#888888';

  // Clear canvas
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Draw hexes
  // First pass: Fill
  for (const hex of scene.hexagons) {
    ctx.beginPath();
    const corners = hex.corners;
    if (corners.length < 6) continue;
    
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();

    ctx.globalAlpha = terrainOpacity;
    ctx.fillStyle = hex.fill;
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }

  // Second pass: Grid Stroke (on top of fills)
  ctx.strokeStyle = gridStroke;
  ctx.lineWidth = gridLineWidth;
  for (const hex of scene.hexagons) {
    ctx.beginPath();
    const corners = hex.corners;
    if (corners.length < 6) continue;
    
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();
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
      // Glow effect for selection
      if (theme?.selectionGlow) {
        ctx.shadowColor = hl.color;
        ctx.shadowBlur = theme.selectionGlow;
      }
      
      ctx.fillStyle = `${hl.color}26`; // ~15% opacity
      ctx.fill();
      ctx.strokeStyle = hl.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.stroke();
      
      // Reset shadow
      ctx.shadowBlur = 0;
    } else if (hl.style === 'hover') {
      // Subtle glow for hover
      if (theme?.hoverGlow) {
        ctx.shadowColor = hl.color;
        ctx.shadowBlur = theme.hoverGlow;
      }
      ctx.fillStyle = `${hl.color}14`; // ~8% opacity
      ctx.fill();
      ctx.strokeStyle = hl.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;
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
    
    if (theme?.selectionGlow) {
      ctx.shadowColor = edge.color;
      ctx.shadowBlur = theme.selectionGlow;
    }
    
    ctx.strokeStyle = edge.color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Draw vertex highlights
  for (const vtx of scene.vertexHighlights) {
    ctx.beginPath();
    ctx.arc(vtx.point.x, vtx.point.y, 5, 0, Math.PI * 2);
    
    if (theme?.selectionGlow) {
      ctx.shadowColor = vtx.color;
      ctx.shadowBlur = theme.selectionGlow;
    }
    
    ctx.fillStyle = vtx.color;
    ctx.fill();
    
    // No black stroke as per design
    ctx.shadowBlur = 0;
  }

  // Draw path lines
  for (const line of scene.pathLines) {
    if (line.points.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(line.points[0].x, line.points[0].y);
    for (let i = 1; i < line.points.length; i++) {
      ctx.lineTo(line.points[i].x, line.points[i].y);
    }
    
    if (theme?.hoverGlow) {
      ctx.shadowColor = line.color;
      ctx.shadowBlur = theme.hoverGlow;
    }
    
    ctx.strokeStyle = `${line.color}99`; // 60% opacity
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
  }

  // Draw labels
  if (showLabels && scene.hexagons.length > 0) {
    const h0 = scene.hexagons[0];
    const hexScreenRadius = Math.sqrt(
      Math.pow(h0.corners[0].x - h0.center.x, 2) + 
      Math.pow(h0.corners[0].y - h0.center.y, 2)
    );
    
    if (hexScreenRadius > labelMinZoom) {
      const fontSize = Math.max(8, hexScreenRadius * 0.28);
      
      if (theme?.labelGlow) {
        ctx.shadowColor = theme.labelGlow;
        ctx.shadowBlur = 4;
      }
      
      ctx.fillStyle = labelColor;
      ctx.font = `${fontSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      for (const hex of scene.hexagons) {
        const labelY = hex.center.y - hexScreenRadius * 0.40;
        ctx.fillText(hex.label, hex.center.x, labelY);
      }
      ctx.shadowBlur = 0;
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
      ctx.font = `600 ${fontSize}px sans-serif`; // 600 weight per design
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const fl of scene.featureLabels) {
        if (theme?.featureLabelShadow) {
           ctx.shadowColor = 'rgba(0,0,0,0.8)';
           ctx.shadowBlur = 6;
        }
        
        // Double shadow for that HUD feel if theme specifies
        ctx.fillStyle = theme?.featureLabelColor || '#ffffff';
        ctx.fillText(fl.text, fl.point.x, fl.point.y);
        ctx.shadowBlur = 0;
      }
    }
  }
}
