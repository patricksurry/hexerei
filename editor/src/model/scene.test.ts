import { describe, it, expect } from 'vitest';
import { MapModel } from './map-model.js';
import { ViewportState, worldToScreen } from './viewport.js';
import { hexAtScreen } from './hit-test.js';
import { buildScene } from './scene.js';
import { Hex } from '@hexmap/core';

const MOCK_YAML = `
hexmap: "1.0"
metadata:
  title: "Test Map"
layout:
  orientation: flat-down
  label: XXYY
  all: "0101 0201"
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
    // col 1, row 1 (CCRR 0101) in flat-down
    const cube = Hex.offsetToCube(1, 1, 'flat-down');
    const worldCenter = Hex.hexToPixel(cube, 1); // HEX_SIZE=1
    const screen = worldToScreen(worldCenter, vp);
    const label = hexAtScreen(screen, vp, model);
    expect(label).toBe('0101');
    
    // col 2, row 1 (CCRR 0201) in flat-down
    const cube2 = Hex.offsetToCube(2, 1, 'flat-down');
    const worldCenter2 = Hex.hexToPixel(cube2, 1);
    const screen2 = worldToScreen(worldCenter2, vp);
    const label2 = hexAtScreen(screen2, vp, model);
    expect(label2).toBe('0201');
  });

  it('hexAtScreen should return null for far off-map point', () => {
    const label = hexAtScreen({ x: 1000, y: 1000 }, vp, model);
    expect(label).toBeNull();
  });

  it('buildScene should include all visible hexes', () => {
    const scene = buildScene(model, vp);
    expect(scene.hexagons).toHaveLength(2);
  });

  it('buildScene should cull hexes far off screen', () => {
    const smallVp: ViewportState = {
      center: { x: 100, y: 100 }, // far away
      zoom: 10,
      width: 20, 
      height: 20
    };
    const scene = buildScene(model, smallVp);
    expect(scene.hexagons).toHaveLength(0);
  });
});
