import { describe, it, expect } from 'vitest';
import { ViewportState, worldToScreen } from './viewport.js';
import { Hex } from '@hexmap/core';
import { hitTest } from './hit-test.js';
import { MapModel } from './model.js';

const MOCK_YAML = `
hexmap: "1.0"
layout:
  orientation: flat-down
  all: "0000 - 0202 fill"
`;

describe('hitTest', () => {
  const model = MapModel.load(MOCK_YAML);
  const vp: ViewportState = {
    center: { x: 0, y: 0 },
    zoom: 100,
    width: 800,
    height: 600,
  };

  it('should hit the correct neighbor for edge 0 (SE neighbor for flat-top)', () => {
    // Use raw cube (0,0,0) as center
    const centerCube = Hex.createHex(0, 0, 0);
    const centerPixel = Hex.hexToPixel(centerCube, 1, 'flat');
    const midpoints = Hex.hexEdgeMidpoints(centerPixel, 1, 'flat');

    // Midpoint 0 is at 30 degrees (ESE) - between East (0) and South-East (60)
    // For flat-top:
    // direction 0 = NE
    // direction 1 = SE
    // Midpoint 0 should correspond to direction 1 (SE)
    const mp0 = midpoints[0];
    // Nudge slightly towards the center to ensure we're inside the intended hex logic
    const nudgedPt = {
      x: mp0.x * 0.99 + centerPixel.x * 0.01,
      y: mp0.y * 0.99 + centerPixel.y * 0.01,
    };
    const screenPt = worldToScreen(nudgedPt, vp);

    const hit = hitTest(screenPt, vp, model);
    expect(hit?.type).toBe('edge');

    const neighborCube = Hex.hexNeighbor(centerCube, 1);
    const expectedLabel = Hex.formatHexLabel(
      neighborCube,
      model.grid.labelFormat,
      model.grid.orientation
    );
    const centerLabel = Hex.formatHexLabel(
      centerCube,
      model.grid.labelFormat,
      model.grid.orientation
    );

    if (hit?.type === 'edge') {
      expect(hit.hexLabels).toContain(centerLabel);
      expect(hit.hexLabels).toContain(expectedLabel);
    } else {
      expect.unreachable('Expected edge hit');
    }
  });
});
