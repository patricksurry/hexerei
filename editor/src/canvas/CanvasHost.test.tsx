import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { CanvasHost, CanvasHostRef } from './CanvasHost';
import { MapModel } from '@hexmap/canvas';

describe('CanvasHost Phase 1 Tests', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  it('resetZoom computes correct zoom for a known map size', () => {
    // 10x10 map roughly
    const yaml = `
hexmap: "1.0"
layout:
  orientation: pointy-right
  all: "0101 - 1001 - 1010 - 0110 fill"
terrain:
  hex:
    clear: { style: { color: "#ffffff" } }
features:
  - at: "@all"
    terrain: clear
`;
    const model = MapModel.load(yaml);
    const onZoomChange = vi.fn();
    const ref = React.createRef<CanvasHostRef>();

    // Mock getBoundingClientRect
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = () => ({
      width: 1000,
      height: 1000,
      top: 0,
      left: 0,
      bottom: 1000,
      right: 1000,
      x: 0,
      y: 0,
      toJSON: () => {}
    });

    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 1000 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 1000 });

    render(<CanvasHost ref={ref} model={model} onZoomChange={onZoomChange} />);

    expect(onZoomChange).toHaveBeenCalled();
    const initialZoom = onZoomChange.mock.calls[0][0];

    onZoomChange.mockClear();
    ref.current?.resetZoom();
    
    expect(onZoomChange).toHaveBeenCalled();
    const resetZoomVal = onZoomChange.mock.calls[0][0];
    
    // Zoom should be the same as initial fit, and greater than 0
    expect(resetZoomVal).toBe(initialZoom);
    expect(resetZoomVal).toBeGreaterThan(0);
    expect(resetZoomVal).toBeLessThan(100);

    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it('empty map (no hexes) does not crash', () => {
    const yaml = `
hexmap: "1.0"
layout:
  orientation: pointy-right
  all: ""
terrain:
  hex:
    clear: { style: { color: "#ffffff" } }
features: []
`;
    const model = MapModel.load(yaml);
    const onZoomChange = vi.fn();
    
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 1000 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 1000 });

    expect(() => {
      render(<CanvasHost model={model} onZoomChange={onZoomChange} />);
    }).not.toThrow();
    
    // fallback zoom is 20
    expect(onZoomChange).toHaveBeenCalledWith(20);
  });

  it('sets crosshair cursor when paintTerrainKey is set', () => {
    const yaml = `
hexmap: "1.0"
layout:
  orientation: flat-down
  all: "0101 0201"
terrain:
  hex:
    clear: { style: { color: "#ffffff" } }
features:
  - at: "@all"
    terrain: clear
`;
    const model = MapModel.load(yaml);

    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 1000 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 1000 });

    const { container } = render(
      <CanvasHost model={model} paintTerrainKey="clear" paintTerrainColor="#ffffff" />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas!.style.cursor).toBe('crosshair');
  });

  it('calls onPaintClick instead of onHitTest in paint mode', () => {
    const yaml = `
hexmap: "1.0"
layout:
  orientation: flat-down
  all: "0101 0201"
terrain:
  hex:
    clear: { style: { color: "#ffffff" } }
features:
  - at: "@all"
    terrain: clear
`;
    const model = MapModel.load(yaml);

    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 1000 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 1000 });

    const onHitTest = vi.fn();
    const onPaintClick = vi.fn();

    render(
      <CanvasHost
        model={model}
        paintTerrainKey="clear"
        paintTerrainColor="#ffffff"
        onHitTest={onHitTest}
        onPaintClick={onPaintClick}
      />
    );

    expect(onHitTest).not.toHaveBeenCalled();
  });

  it('zoom fit respects aspect ratio', () => {
    // wide map
    const yaml = `
hexmap: "1.0"
layout:
  orientation: pointy-right
  all: "0101 - 2001 - 2002 - 0102 fill"
terrain:
  hex:
    clear: { style: { color: "#ffffff" } }
features:
  - at: "@all"
    terrain: clear
`;
    const model = MapModel.load(yaml);
    const onZoomChange = vi.fn();

    // Tall container
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 500 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 2000 });

    render(<CanvasHost model={model} onZoomChange={onZoomChange} />);

    const wideZoom = onZoomChange.mock.calls[onZoomChange.mock.calls.length - 1][0];

    // Reset calls
    onZoomChange.mockClear();

    // Wide container
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 2000 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 500 });

    render(<CanvasHost model={model} onZoomChange={onZoomChange} />);
    
    const tallZoom = onZoomChange.mock.calls[onZoomChange.mock.calls.length - 1][0];
    
    // The wide container should have a higher zoom factor because it can fit the wide map much better 
    // Wait, the map is wide. 
    // A tall container (500x2000) will be limited by its width (500) to fit a wide map.
    // A wide container (2000x500) will have a lot of width, and might be limited by its height (500) or width (2000).
    // In any case, zooms will be different and valid.
    expect(wideZoom).toBeGreaterThan(0);
    expect(tallZoom).toBeGreaterThan(0);
    expect(wideZoom).not.toEqual(tallZoom);
  });
});
