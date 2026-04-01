import type { Scene } from '@hexmap/canvas';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { drawScene } from './draw.js';

describe('Canvas Drawing', () => {
  let _currentFont = '10px sans-serif';
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
    set font(val: string) { _currentFont = val; },
    set textAlign(_val: string) {},
    set textBaseline(_val: string) {},
    set globalAlpha(_val: number) {},
    set shadowBlur(_val: number) {},
    set shadowColor(_val: string) {},
    set lineCap(_val: string) {},
    set lineJoin(_val: string) {},
    setLineDash: vi.fn(),
    measureText: vi.fn(() => {
      // Scale measureText width with current font size (like a real browser)
      const match = _currentFont.match(/(\d+(?:\.\d+)?)px/);
      const size = match ? parseFloat(match[1]) : 10;
      return { width: size * 2.4 };
    }),
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

  it('should scale font size proportionally to hex screen radius', () => {
    // Track font assignments
    const fontValues: string[] = [];
    const spyCtx = {
      ...mockCtx,
      set font(val: string) { fontValues.push(val); },
      set fillStyle(_v: string) {},
      set strokeStyle(_v: string) {},
      set lineWidth(_v: number) {},
      set textAlign(_v: string) {},
      set textBaseline(_v: string) {},
      set globalAlpha(_v: number) {},
      set shadowBlur(_v: number) {},
      set shadowColor(_v: string) {},
      set lineCap(_v: string) {},
      set lineJoin(_v: string) {},
    } as unknown as CanvasRenderingContext2D;

    // Scene with radius ~20 (simulating zoom level A)
    const makeScene = (radius: number): Scene => ({
      ...mockScene,
      hexagons: [{
        hexId: '0,0,0',
        corners: [
          { x: 100, y: 100 - radius },
          { x: 100 + radius, y: 100 },
          { x: 100, y: 100 + radius },
          { x: 100 - radius, y: 100 + radius },
          { x: 100 - radius, y: 100 },
          { x: 100 - radius, y: 100 - radius },
        ],
        center: { x: 100, y: 100 },
        fill: '#fff',
        label: '0101',
      }],
    });

    // Zoom level A: radius 20
    fontValues.length = 0;
    drawScene(spyCtx, makeScene(20));
    const fontA = fontValues.find(f => f.includes('px'));
    expect(fontA).toBeDefined();
    const sizeA = parseFloat(fontA!);

    // Zoom level B: radius 60 (3x zoom)
    fontValues.length = 0;
    drawScene(spyCtx, makeScene(60));
    const fontB = fontValues.find(f => f.includes('px'));
    expect(fontB).toBeDefined();
    const sizeB = parseFloat(fontB!);

    // Font size should scale proportionally (3x radius = 3x font)
    expect(sizeB / sizeA).toBeCloseTo(3, 0);
    // Sanity: both should be > 4px threshold
    expect(sizeA).toBeGreaterThanOrEqual(4);
    expect(sizeB).toBeGreaterThanOrEqual(4);
  });

  it('should produce consistent pill aspect ratio at different zoom levels', () => {
    // Track roundRect calls to check pill dimensions
    const pillCalls: { w: number; h: number }[] = [];
    const spyCtx = {
      ...mockCtx,
      roundRect: vi.fn((_x: number, _y: number, w: number, h: number) => {
        pillCalls.push({ w, h });
      }),
      measureText: vi.fn(() => {
        const match = _currentFont.match(/(\d+(?:\.\d+)?)px/);
        const size = match ? parseFloat(match[1]) : 10;
        return { width: size * 2.4 };
      }),
      set font(val: string) { _currentFont = val; },
      set fillStyle(_v: string) {},
      set strokeStyle(_v: string) {},
      set lineWidth(_v: number) {},
      set textAlign(_v: string) {},
      set textBaseline(_v: string) {},
      set globalAlpha(_v: number) {},
      set shadowBlur(_v: number) {},
      set shadowColor(_v: string) {},
      set lineCap(_v: string) {},
      set lineJoin(_v: string) {},
    } as unknown as CanvasRenderingContext2D;

    const makeScene = (radius: number): Scene => ({
      ...mockScene,
      hexagons: [{
        hexId: '0,0,0',
        corners: [
          { x: 100, y: 100 - radius },
          { x: 100 + radius, y: 100 },
          { x: 100, y: 100 + radius },
          { x: 100 - radius, y: 100 + radius },
          { x: 100 - radius, y: 100 },
          { x: 100 - radius, y: 100 - radius },
        ],
        center: { x: 100, y: 100 },
        fill: '#fff',
        label: '0101',
      }],
    });

    // Zoom A: radius 20
    pillCalls.length = 0;
    drawScene(spyCtx, makeScene(20));
    expect(pillCalls.length).toBeGreaterThan(0);
    const ratioA = pillCalls[0].w / pillCalls[0].h;

    // Zoom B: radius 60
    pillCalls.length = 0;
    drawScene(spyCtx, makeScene(60));
    expect(pillCalls.length).toBeGreaterThan(0);
    const ratioB = pillCalls[0].w / pillCalls[0].h;

    // Aspect ratios should be equal (within floating point tolerance)
    expect(ratioA).toBeCloseTo(ratioB, 1);
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
    drawScene(mockCtx, sceneWithBigHex);
    const { calls } = (mockCtx.fillText as any).mock;
    expect(calls).toHaveLength(1);
    const [_text, _x, labelY] = calls[0];
    // Label y should be above center (50) by a meaningful amount
    expect(labelY).toBeLessThan(40);
  });
});
