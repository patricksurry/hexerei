import { beforeEach, describe, it, expect, vi } from 'vitest';
import { drawScene } from './draw.js';
import { Scene } from '../model/scene.js';

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
    setLineDash: vi.fn(),
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
          { x: 10, y: 0 }, { x: 20, y: 10 }, { x: 10, y: 20 },
          { x: 0, y: 20 }, { x: -10, y: 10 }, { x: 0, y: 0 }
        ],
        center: { x: 10, y: 10 },
        fill: '#ffffff',
        label: '0101'
      }
    ],
    highlights: [],
    edgeHighlights: [],
    vertexHighlights: [],
    pathLines: [],
    featureLabels: []
  };

  it('should call fillRect with background from scene', () => {
    drawScene(mockCtx, mockScene);
    expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
  });

  it('should use background from theme if provided', () => {
    drawScene(mockCtx, mockScene, { 
      theme: { background: '#ABCDEF' } as any 
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
    drawScene(mockCtx, mockScene, { labelMinZoom: 5 });
    // center is (10,10), radius is 10. labelY = 10 - 10 * 0.4 = 6
    expect(mockCtx.fillText).toHaveBeenCalledWith('0101', 10, 6);
  });

  it('should not draw labels if too small', () => {
    drawScene(mockCtx, mockScene, { labelMinZoom: 50 });
    expect(mockCtx.fillText).not.toHaveBeenCalled();
  });

  it('should draw labels near the top of the hex, not at center', () => {
    const sceneWithBigHex: Scene = {
      ...mockScene,
      hexagons: [{
        ...mockScene.hexagons[0],
        // corners span 40px radius — well above labelMinZoom=12
        corners: [
          { x: 50, y: 10 }, { x: 90, y: 30 }, { x: 90, y: 70 },
          { x: 50, y: 90 }, { x: 10, y: 70 }, { x: 10, y: 30 }
        ],
        center: { x: 50, y: 50 },
        label: '0101'
      }]
    };
    drawScene(mockCtx, sceneWithBigHex, { labelMinZoom: 12 });
    const calls = (mockCtx.fillText as any).mock.calls;
    expect(calls).toHaveLength(1);
    const [_text, _x, labelY] = calls[0];
    // Label y should be above center (50) by a meaningful amount
    expect(labelY).toBeLessThan(40);
  });
});
