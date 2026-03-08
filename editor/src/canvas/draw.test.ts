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
    highlights: []
  };

  it('should call fillRect with background', () => {
    drawScene(mockCtx, mockScene);
    expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
  });

  it('should draw hexagons', () => {
    drawScene(mockCtx, mockScene);
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.moveTo).toHaveBeenCalled();
    expect(mockCtx.lineTo).toHaveBeenCalledTimes(5);
    expect(mockCtx.closePath).toHaveBeenCalled();
    expect(mockCtx.fill).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
  });

  it('should draw labels if big enough', () => {
    drawScene(mockCtx, mockScene, { labelMinZoom: 5 });
    expect(mockCtx.fillText).toHaveBeenCalledWith('0101', 10, 10);
  });

  it('should not draw labels if too small', () => {
    drawScene(mockCtx, mockScene, { labelMinZoom: 50 });
    expect(mockCtx.fillText).not.toHaveBeenCalled();
  });
});
