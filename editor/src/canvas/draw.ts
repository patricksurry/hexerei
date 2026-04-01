import type { Scene } from '@hexmap/canvas';

export interface CanvasTheme {
  background: string;
  gridStroke: string;
  gridGlow: string | null;
  gridLineWidth: number;
  terrainOpacity: number;
  labelColor: string;
  labelGlow: string | null;
  labelPillColor: string;
  selectionGlow: number;
  hoverGlow: number;
  featureLabelColor: string;
  featureLabelShadow: string;
  featureLabelPillColor: string;
  accentHex: string;
  accentEdge: string;
  accentVertex: string;
  // Geometric rendering constants
  pathLineWidth: number;
  vertexRadius: number;
  hexLabelScale: number;
  hexLabelOffset: number;
  featureLabelScale: number;
  // Resolved font families (Canvas 2D cannot use CSS variables)
  fontMono: string;
  fontSans: string;
}

const DEFAULT_THEME: CanvasTheme = {
  background: '#141414',
  gridStroke: '#3A3A3A',
  gridGlow: null,
  gridLineWidth: 1,
  terrainOpacity: 1.0,
  labelColor: '#888888',
  labelGlow: null,
  labelPillColor: 'rgba(0, 0, 0, 0)',
  selectionGlow: 0,
  hoverGlow: 0,
  featureLabelColor: '#ffffff',
  featureLabelShadow: 'rgba(0,0,0,0.8)',
  featureLabelPillColor: 'rgba(0, 0, 0, 0)',
  accentHex: '#00D4FF',
  accentEdge: '#FF44FF',
  accentVertex: '#FFDD00',
  pathLineWidth: 5,
  vertexRadius: 5,
  hexLabelScale: 0.22,
  hexLabelOffset: 0.55,
  featureLabelScale: 0.22,
  fontMono: 'ui-monospace, "Cascadia Code", monospace',
  fontSans: 'sans-serif',
};

interface DrawOptions {

  theme?: CanvasTheme;
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  options: DrawOptions = {}
): void {
  const theme = options.theme || DEFAULT_THEME;

  const background = theme.background || scene.background.trim() || DEFAULT_THEME.background;
  const gridStroke = theme.gridStroke;
  const gridLineWidth = theme.gridLineWidth;
  const terrainOpacity = theme.terrainOpacity;
  const labelColor = theme.labelColor;

  // Clear canvas
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Draw hexes
  // First pass: Fill
  for (const hex of scene.hexagons) {
    ctx.beginPath();
    const { corners } = hex;
    if (corners.length < 6) continue;

    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();

    if (hex.fill !== 'none') {
      ctx.globalAlpha = terrainOpacity;
      ctx.fillStyle = hex.fill;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
  }

  // Second pass: Grid Stroke (on top of fills)
  // Shadow underlay: wider dark stroke for contrast against terrain fills
  if (theme.gridGlow) {
    ctx.strokeStyle = theme.gridGlow;
    ctx.lineWidth = gridLineWidth + 2;
    for (const hex of scene.hexagons) {
      ctx.beginPath();
      const { corners } = hex;
      if (corners.length < 6) continue;
      ctx.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < 6; i++) {
        ctx.lineTo(corners[i].x, corners[i].y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  // Colored grid on top
  ctx.strokeStyle = gridStroke;
  ctx.lineWidth = gridLineWidth;
  for (const hex of scene.hexagons) {
    ctx.beginPath();
    const { corners } = hex;
    if (corners.length < 6) continue;

    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // Draw edge terrain
  for (const edge of scene.edgeTerrain) {
    ctx.beginPath();
    ctx.moveTo(edge.p1.x, edge.p1.y);
    ctx.lineTo(edge.p2.x, edge.p2.y);
    ctx.strokeStyle = edge.color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Onesided marker: small tick toward the active hex
    if (edge.onesided && edge.activeHexCenter) {
      const mx = (edge.p1.x + edge.p2.x) / 2;
      const my = (edge.p1.y + edge.p2.y) / 2;
      const dx = edge.activeHexCenter.x - mx;
      const dy = edge.activeHexCenter.y - my;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        const tickLen = 6;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + (dx / len) * tickLen, my + (dy / len) * tickLen);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  // Draw path terrain
  for (const path of scene.pathTerrain) {
    if (path.points.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(path.points[0].x, path.points[0].y);
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y);
    }
    ctx.strokeStyle = path.color;
    ctx.lineWidth = theme.pathLineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  // Draw vertex terrain
  for (const vtx of scene.vertexTerrain) {
    ctx.beginPath();
    ctx.arc(vtx.point.x, vtx.point.y, theme.vertexRadius, 0, Math.PI * 2);
    ctx.fillStyle = vtx.color;
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Draw highlights
  for (const hl of scene.highlights) {
    ctx.beginPath();
    const { corners } = hl;
    if (corners.length < 6) continue;

    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();

    if (hl.style === 'dim') {
      // Dark overlay to dim non-matching features
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fill();
    } else if (hl.style === 'select') {
      // Glow effect for selection
      if (theme.selectionGlow) {
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
      if (theme.hoverGlow) {
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

    if (theme.selectionGlow) {
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
    ctx.arc(vtx.point.x, vtx.point.y, theme.vertexRadius, 0, Math.PI * 2);

    if (theme.selectionGlow) {
      ctx.shadowColor = vtx.color;
      ctx.shadowBlur = theme.selectionGlow;
    }

    ctx.fillStyle = vtx.color;
    ctx.fill();
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

    if (theme.hoverGlow) {
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

  // Draw labels — scale with world space (like printing on the map)
  if (scene.hexagons.length > 0) {
    const h0 = scene.hexagons[0];
    const hexScreenRadius = Math.sqrt(
      (h0.corners[0].x - h0.center.x) ** 2 + (h0.corners[0].y - h0.center.y) ** 2
    );

    // Pure world-space scaling: labels shrink/grow with zoom
    const fontSize = hexScreenRadius * theme.hexLabelScale;

    // Only render when labels would be legible (≥4px)
    if (fontSize >= 4) {
      ctx.font = `${fontSize}px ${theme.fontMono}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const pad = fontSize * 0.2;
      const pillRadius = fontSize * 0.2;

      for (const hex of scene.hexagons) {
        const labelY = hex.center.y - hexScreenRadius * theme.hexLabelOffset;
        const metrics = ctx.measureText(hex.label);
        const pillW = metrics.width + pad * 2;
        const pillH = fontSize + pad * 2;
        const pillX = hex.center.x - pillW / 2;
        // Shift pill down slightly — font visual center sits above math midpoint
        const pillY = labelY - pillH / 2 + fontSize * 0.05;

        // Pill background
        ctx.fillStyle = theme.labelPillColor;
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, pillRadius);
        ctx.fill();

        // Label text
        if (theme.labelGlow) {
          ctx.shadowColor = theme.labelGlow;
          ctx.shadowBlur = 4;
        }
        ctx.fillStyle = labelColor;
        ctx.fillText(hex.label, hex.center.x, labelY);
        ctx.shadowBlur = 0;
      }
    }
  }

  // Feature labels — also world-space scaled
  if (scene.featureLabels.length > 0 && scene.hexagons.length > 0) {
    const h0 = scene.hexagons[0];
    const hexScreenRadius = Math.sqrt(
      (h0.corners[0].x - h0.center.x) ** 2 + (h0.corners[0].y - h0.center.y) ** 2
    );
    const fontSize = hexScreenRadius * theme.featureLabelScale;

    if (fontSize >= 4) {
      ctx.font = `600 ${fontSize}px ${theme.fontSans}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const fpad = fontSize * 0.25;
      const pillRadius = fontSize * 0.25;

      for (const fl of scene.featureLabels) {
        const metrics = ctx.measureText(fl.text);
        const pillW = metrics.width + fpad * 2;
        const pillH = fontSize + fpad * 2;
        const pillX = fl.point.x - pillW / 2;
        const pillY = fl.point.y - pillH / 2;

        // Pill background
        ctx.fillStyle = theme.featureLabelPillColor;
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, pillRadius);
        ctx.fill();

        // Label text
        ctx.fillStyle = theme.featureLabelColor;
        ctx.fillText(fl.text, fl.point.x, fl.point.y);
      }
    }
  }
}
