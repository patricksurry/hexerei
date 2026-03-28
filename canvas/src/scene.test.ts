import { Hex } from '@hexmap/core';
import { describe, expect, it } from 'vitest';
import { hitTest } from './hit-test.js';
import { MapModel } from './model.js';
import { buildScene, type SceneHighlight } from './scene.js';
import { type ViewportState, worldToScreen } from './viewport.js';

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
    height: 600,
  };

  it('hexAtScreen should return correct label at center of hex', () => {
    // col 1, row 1 (CCRR 0101) in flat-down
    const cube = Hex.offsetToCube(1, 1, 'flat-down');
    const worldCenter = Hex.hexToPixel(cube, 1); // 1=1
    const screen = worldToScreen(worldCenter, vp);
    const hit = hitTest(screen, vp, model);
    const label = hit.type === 'hex' ? hit.label : null;
    expect(label).toBe('0101');

    // col 2, row 1 (CCRR 0201) in flat-down
    const cube2 = Hex.offsetToCube(2, 1, 'flat-down');
    const worldCenter2 = Hex.hexToPixel(cube2, 1);
    const screen2 = worldToScreen(worldCenter2, vp);
    const hit2 = hitTest(screen2, vp, model);
    const label2 = hit2.type === 'hex' ? hit2.label : null;
    expect(label2).toBe('0201');
  });

  it('hexAtScreen should return null for far off-map point', () => {
    const hit = hitTest({ x: 1000, y: 1000 }, vp, model);
    const label = hit.type === 'hex' ? hit.label : null;
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
      height: 20,
    };
    const scene = buildScene(model, smallVp);
    expect(scene.hexagons).toHaveLength(0);
  });

  it('buildScene draws edge highlight between the correct corners', () => {
    // 0101 (col=1,row=1) and 0201 (col=2,row=1) are adjacent; direction 0 (NE) from 0101 to 0201
    const cube1 = Hex.offsetToCube(1, 1, 'flat-down');
    const cube2 = Hex.offsetToCube(2, 1, 'flat-down');
    const boundaryId = Hex.getCanonicalBoundaryId(cube1, cube2, 0);

    const hl: SceneHighlight = {
      type: 'edge',
      boundaryId,
      hexIds: [],
      color: '#FF3DFF',
      style: 'select',
    };
    const scene = buildScene(model, vp, { background: '#141414', highlights: [hl] });
    expect(scene.edgeHighlights).toHaveLength(1);

    // For a flat hex, the NE edge (direction 0) is between corner 5 (300°) and corner 0 (0°).
    // The midpoint of corners 5 and 0 is hexEdgeMidpoints[5] — the one pointing at ~330°.
    const orientation = Hex.orientationTop('flat-down');
    const worldCenter1 = Hex.hexToPixel(cube1, 1, orientation);
    const corners1 = Hex.hexCorners(worldCenter1, 1, orientation);

    const expectedP1 = worldToScreen(corners1[5], vp);
    const expectedP2 = worldToScreen(corners1[0], vp);

    const { p1, p2 } = scene.edgeHighlights[0];
    // Check that the drawn segment matches corners (5, 0), not (0, 1)
    expect(p1.x).toBeCloseTo(expectedP1.x, 3);
    expect(p1.y).toBeCloseTo(expectedP1.y, 3);
    expect(p2.x).toBeCloseTo(expectedP2.x, 3);
    expect(p2.y).toBeCloseTo(expectedP2.y, 3);
  });

  it('buildScene accepts SceneOptions object', () => {
    const hl: SceneHighlight = {
      type: 'hex',
      hexIds: [Hex.hexId(Hex.offsetToCube(1, 1, 'flat-down'))],
      color: '#00D4FF',
      style: 'select',
    };
    const scene = buildScene(model, vp, { highlights: [hl] });
    expect(scene.highlights).toHaveLength(1);
    expect(scene.highlights[0].color).toBe('#00D4FF');
  });

  it('buildScene includes feature label at centroid when feature has label', () => {
    // Use MOCK_YAML with a labeled feature
    const yaml = `
hexmap: "1.0"
layout:
  orientation: flat-down
  label: XXYY
  all: "0101 0201"
terrain:
  hex:
    city: { style: { color: "#888" } }
features:
  - at: "0101 - 0201"
    terrain: clear
  - at: "0101"
    terrain: city
    label: "Smolensk"
`;
    const m = MapModel.load(yaml);
    const scene = buildScene(m, vp);
    expect(scene.featureLabels).toHaveLength(1);
    expect(scene.featureLabels[0].text).toBe('Smolensk');
  });

  it('buildScene accepts edge highlight without hexIds', () => {
    const cube1 = Hex.offsetToCube(1, 1, 'flat-down');
    const cube2 = Hex.offsetToCube(2, 1, 'flat-down');
    const boundaryId = Hex.getCanonicalBoundaryId(cube1, cube2, 0);
    const hl: SceneHighlight = {
      type: 'edge',
      boundaryId,
      color: '#FF3DFF',
      style: 'ghost',
    };
    const scene = buildScene(model, vp, { highlights: [hl] });
    expect(scene.edgeHighlights).toHaveLength(1);
  });

  it('buildScene accepts vertex highlight without hexIds', () => {
    const h1 = Hex.offsetToCube(1, 1, 'flat-down');
    const h2 = Hex.hexNeighbor(h1, 0);
    const h3 = Hex.hexNeighbor(h1, 1);
    const vertexId = [Hex.hexId(h1), Hex.hexId(h2), Hex.hexId(h3)].join('^');
    const hl: SceneHighlight = {
      type: 'vertex',
      vertexId,
      color: '#FFDD00',
      style: 'ghost',
    };
    const scene = buildScene(model, vp, { highlights: [hl] });
    expect(scene.vertexHighlights).toHaveLength(1);
  });

  it('dim highlight style is accepted', () => {
    const hl: SceneHighlight = {
      type: 'hex',
      hexIds: [Hex.hexId(Hex.offsetToCube(1, 1, 'flat-down'))],
      color: '#000000',
      style: 'dim',
    };
    const scene = buildScene(model, vp, { highlights: [hl] });
    expect(scene.highlights).toHaveLength(1);
    expect(scene.highlights[0].style).toBe('dim');
  });
});
