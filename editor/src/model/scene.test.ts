import { describe, it, expect } from 'vitest';
import { MapModel } from './map-model.js';
import { ViewportState, worldToScreen } from './viewport.js';
import { hexAtScreen } from './hit-test.js';
import { buildScene } from './scene.js';

const MOCK_YAML = `
hexmap: "1.0"
layout:
  hex_top: flat
  stagger: low
  label: XXYY
  all: "0101 0301 0303 0103 !"
terrain:
  hex:
    clear:
      style: { color: "#ffffff" }
features:
  - at: "@all"
    terrain: clear
`;

describe('HitTest & Scene', () => {
  const model = MapModel.load(MOCK_YAML);
  const vp: ViewportState = {
    center: { x: 0, y: 0 },
    zoom: 100,
    width: 800,
    height: 600
  };

  it('hexAtScreen should return correct label at center of hex', () => {
    // Hex 0,0 (CCRR 0101) is at world 0,0
    const screen = worldToScreen({ x: 0, y: 0 }, vp);
    const label = hexAtScreen(screen, vp, model);
    expect(label).toBe('0101');
    
    // Hex 1,0 (CCRR 0201) is at world size * 1.5, size * sqrt(3)/2
    // world: 1.5 * 1, sqrt(3)/2 * 1 ~= (1.5, 0.866)
    const screen2 = worldToScreen({ x: 1.5, y: 0.866 }, vp);
    const label2 = hexAtScreen(screen2, vp, model);
    expect(label2).toBe('0201');
  });

  it('hexAtScreen should return null for far off-map point', () => {
    const label = hexAtScreen({ x: 1000, y: 1000 }, vp, model);
    expect(label).toBeNull();
  });

  it('buildScene should include all visible hexes', () => {
    const scene = buildScene(model, vp);
    // 3x3 grid = 9 hexes
    expect(scene.hexagons).toHaveLength(9);
    
    // Check one hex item
    const hex = scene.hexagons[0];
    expect(hex.corners).toHaveLength(6);
    expect(hex.center).toBeDefined();
    expect(hex.fill).toBeDefined();
    expect(hex.label).toBeDefined();
  });

  it('buildScene should cull hexes far off screen', () => {
    const smallVp: ViewportState = {
      center: { x: 0, y: 0 },
      zoom: 10,
      width: 20, // very small viewport
      height: 20
    };
    const scene = buildScene(model, smallVp);
    // 0101 (0,0) is at center, so it should be visible.
    // Others might be culled.
    expect(scene.hexagons.length).toBeLessThan(9);
  });
});
