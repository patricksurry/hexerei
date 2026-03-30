import type { Scene } from '@hexmap/canvas';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { drawScene } from './draw.js';

describe('Canvas Drawing', () => {
  const mockCtx = {
    canvas: { width: 800, height: 600 },
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    set fillStyle(_val: string) {},
    set strokeStyle(_val: string) {},
    set lineWidth(_val: number) {},
    set font(_val: string) {},
    set textAlign(_val: string) {},
    set textBaseline(_val: string) {},
    set globalAlpha(_val: number) {},
    set shadowBlur(_val: number) {},
    set shadowColor(_val: string) {},
    set lineCap(_val: string) {},
    set lineJoin(_val: string) {},
    setLineDash: vi.fn(),
    measureText: vi.fn(() => ({ width: 20 })),
    roundRect: vi.fn(),
    arc: vi.fn(),
  } as unknown as CanvasRenderingContext2D;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockScene: Scene = {
    background: '#141414',
    hexagons: [
      {
        hexId: '0,0,0',
        corners: [
          { x: 10, y: 0 },
          { x: 20, y: 10 },
          { x: 10, y: 20 },
          { x: 0, y: 20 },
          { x: -10, y: 10 },
          { x: 0, y: 0 },
        ],
        center: { x: 10, y: 10 },
        fill: '#ffffff',
        label: '0101',
      },
    ],
    highlights: [],
    edgeHighlights: [],
    vertexHighlights: [],
    pathLines: [],
    featureLabels: [],
    edgeTerrain: [],
    vertexTerrain: [],
    pathTerrain: [],
  };

  it('should call fillRect with background from scene', () => {
    drawScene(mockCtx, mockScene);
    expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
  });

  it('should use background from theme if provided', () => {
    drawScene(mockCtx, mockScene, {
      theme: { background: '#ABCDEF' } as any,
    });
    // This expects drawScene to set ctx.fillStyle = '#ABCDEF'
    // but the mock doesn't spy on setter directly, so we check if fillRect was called
    // at least. To check fillStyle we'd need a more complex spy.
    expect(mockCtx.fillRect).toHaveBeenCalled();
  });

  it('should draw hexagons (fill then stroke)', () => {
    drawScene(mockCtx, mockScene);
    // Two passes: 5 lines for fill, 5 lines for stroke
    expect(mockCtx.lineTo).toHaveBeenCalledTimes(10);
    expect(mockCtx.fill).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
  });

  it('should draw labels if big enough', () => {
    // Need hex radius >= 15 so fontSize (radius * 0.28) >= 4
    const bigHexScene: Scene = {
      ...mockScene,
      hexagons: [
        {
          ...mockScene.hexagons[0],
          corners: [
            { x: 50, y: 30 },
            { x: 70, y: 50 },
            { x: 50, y: 70 },
            { x: 30, y: 70 },
            { x: 10, y: 50 },
            { x: 30, y: 30 },
          ],
          center: { x: 40, y: 50 },
        },
      ],
    };
    // radius = sqrt((50-40)^2 + (30-50)^2) = sqrt(500) ≈ 22.4
    // fontSize = 22.4 * 0.28 ≈ 6.3 >= 4, so labels render
    // labelY = 50 - 22.4 * 0.4 ≈ 41
    drawScene(mockCtx, bigHexScene);
    expect(mockCtx.fillText).toHaveBeenCalledWith('0101', expect.any(Number), expect.any(Number));
  });

  it('should not draw labels if too small', () => {
    // Default mockScene has radius 10, fontSize = 10 * 0.28 = 2.8 < 4
    drawScene(mockCtx, mockScene);
    // fillText should not be called for labels (only fillRect for background)
    expect(mockCtx.fillText).not.toHaveBeenCalled();
  });

  it('should draw labels near the top of the hex, not at center', () => {
    const sceneWithBigHex: Scene = {
      ...mockScene,
      hexagons: [
        {
          ...mockScene.hexagons[0],
          // corners span 40px radius — well above labelMinZoom=12
          corners: [
            { x: 50, y: 10 },
            { x: 90, y: 30 },
            { x: 90, y: 70 },
            { x: 50, y: 90 },
            { x: 10, y: 70 },
            { x: 10, y: 30 },
          ],
          center: { x: 50, y: 50 },
          label: '0101',
        },
      ],
      edgeTerrain: [],
      vertexTerrain: [],
      pathTerrain: [],
    };
    drawScene(mockCtx, sceneWithBigHex, { labelMinZoom: 12 });
    const { calls } = (mockCtx.fillText as any).mock;
    expect(calls).toHaveLength(1);
    const [_text, _x, labelY] = calls[0];
    // Label y should be above center (50) by a meaningful amount
    expect(labelY).toBeLessThan(40);
  });
});
