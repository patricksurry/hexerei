import type { CanvasTheme } from './draw';

export function resolveCanvasTheme(): CanvasTheme {
  const style = getComputedStyle(document.documentElement);
  const get = (prop: string) => style.getPropertyValue(prop).trim();
  const getNum = (prop: string, fallback: number) => {
    const v = parseFloat(get(prop));
    return Number.isNaN(v) ? fallback : v;
  };

  return {
    background: get('--bg-canvas') || '#080C12',
    gridStroke: get('--canvas-grid-stroke') || 'rgba(0, 180, 220, 0.25)',
    gridGlow: get('--canvas-grid-glow') || 'rgba(0, 0, 0, 0.10)',
    gridLineWidth: getNum('--canvas-grid-line-width', 1.0),
    terrainOpacity: getNum('--canvas-terrain-opacity', 0.6),
    labelColor: get('--canvas-label-color') || 'rgba(0, 180, 220, 0.5)',
    labelGlow: get('--text-glow') || null,
    labelPillColor: get('--canvas-label-pill') || 'rgba(10, 14, 20, 0.28)',
    selectionGlow: getNum('--canvas-selection-glow', 8),
    hoverGlow: getNum('--canvas-hover-glow', 4),
    featureLabelColor: get('--text-primary') || '#E6EDF3',
    featureLabelShadow: 'rgba(0,0,0,0.8)',
    featureLabelPillColor: get('--canvas-feature-pill') || 'rgba(10, 14, 20, 0.35)',
    accentHex: get('--accent-hex') || '#00D4FF',
    accentEdge: get('--accent-edge') || '#FF44FF',
    accentVertex: get('--accent-vertex') || '#FFDD00',
    pathLineWidth: getNum('--canvas-path-line-width', 5),
    vertexRadius: getNum('--canvas-vertex-radius', 5),
    hexLabelScale: getNum('--canvas-hex-label-scale', 0.32),
    hexLabelOffset: getNum('--canvas-hex-label-offset', 0.4),
    featureLabelScale: getNum('--canvas-feature-label-scale', 0.22),
    fontMono: get('--font-mono') || 'ui-monospace, "Cascadia Code", monospace',
    fontSans: get('--font-sans') || 'sans-serif',
  };
}
