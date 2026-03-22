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

  it('detects off-board hexes for paint mode', () => {
    // 0202 is on board. 0303 is off board but might not be a direct neighbor depending on orientation.
    // 0302 is definitely a neighbor of 0202.
    // In flat-down: (col, row) -> 0202 is col 2, row 2. 
    // Wait, the easiest way to test is to take 0000 and find a neighbor not on the board.
    // Let's use 0000, and find a neighbor at direction 3 (West) which is off the board.
    const onBoardHexCube = Hex.createHex(0, 0, 0); // 0000
    const offBoardAdjCube = Hex.hexNeighbor(onBoardHexCube, 3); // neighbor in direction 3
    const offBoardAdjPixel = Hex.hexToPixel(offBoardAdjCube, 1, 'flat');
    
    // Create viewport to convert pixel back and test
    const vp: ViewportState = {
      center: { x: 0, y: 0 },
      zoom: 100, // Zoom = pixels per hex unit (since HEX_SIZE=1 in hit-test)
      width: 800,
      height: 600,
    };
    const offBoardAdjScreenPt = worldToScreen(offBoardAdjPixel, vp);

    const hit = hitTest(offBoardAdjScreenPt, vp, model, { includeOffBoard: true });
    expect(hit?.type).toBe('hex');
    if (hit?.type === 'hex') {
      expect(hit.offBoard).toBe(true);
    }
  });

  it('returns none for off-board hex when includeOffBoard is false', () => {
    const onBoardHexCube = Hex.createHex(0, 0, 0);
    const offBoardAdjCube = Hex.hexNeighbor(onBoardHexCube, 3);
    const offBoardAdjPixel = Hex.hexToPixel(offBoardAdjCube, 1, 'flat');
    const vp: ViewportState = { center: { x: 0, y: 0 }, zoom: 100, width: 800, height: 600 };
    const offBoardAdjScreenPt = worldToScreen(offBoardAdjPixel, vp);

    const hit = hitTest(offBoardAdjScreenPt, vp, model);
    expect(hit.type).toBe('none');
  });

  it('returns off-board hex when includeOffBoard is true', () => {
    const onBoardHexCube = Hex.createHex(0, 0, 0);
    const offBoardAdjCube = Hex.hexNeighbor(onBoardHexCube, 3);
    const offBoardAdjPixel = Hex.hexToPixel(offBoardAdjCube, 1, 'flat');
    const vp: ViewportState = { center: { x: 0, y: 0 }, zoom: 100, width: 800, height: 600 };
    const offBoardAdjScreenPt = worldToScreen(offBoardAdjPixel, vp);

    const hit = hitTest(offBoardAdjScreenPt, vp, model, { includeOffBoard: true });
    expect(hit.type).toBe('hex');
    if (hit.type === 'hex') {
      expect(hit.offBoard).toBe(true);
    }
  });
});
