import { describe, it, expect } from 'vitest';
import {
  ViewportState,
  screenToWorld,
  worldToScreen,
  panBy,
  zoomAt,
  fitExtent,
} from './viewport.js';

describe('Viewport', () => {
  const vp: ViewportState = {
    center: { x: 100, y: 100 },
    zoom: 2,
    width: 800,
    height: 600,
  };

  it('should round-trip coordinates', () => {
    const world = { x: 50, y: 60 };
    const screen = worldToScreen(world, vp);
    const back = screenToWorld(screen, vp);
    expect(back.x).toBeCloseTo(world.x);
    expect(back.y).toBeCloseTo(world.y);
  });

  it('should transform center to screen center', () => {
    const screen = worldToScreen(vp.center, vp);
    expect(screen.x).toBe(vp.width / 2);
    expect(screen.y).toBe(vp.height / 2);
  });

  it('panBy should move the center correctly', () => {
    const delta = { x: 10, y: 20 };
    const newVp = panBy(vp, delta);
    // Move screen by +10 pixels => world center moves by -10/zoom = -5
    expect(newVp.center.x).toBe(vp.center.x - 5);
    expect(newVp.center.y).toBe(vp.center.y - 10);
  });

  it('zoomAt should preserve the world point under cursor', () => {
    const cursor = { x: 300, y: 200 };
    const worldBefore = screenToWorld(cursor, vp);

    const factor = 1.5;
    const newVp = zoomAt(vp, cursor, factor);

    expect(newVp.zoom).toBe(vp.zoom * factor);

    const worldAfter = screenToWorld(cursor, newVp);
    expect(worldAfter.x).toBeCloseTo(worldBefore.x);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y);
  });

  it('fitExtent should calculate correct zoom and center', () => {
    const bounds = {
      min: { x: 0, y: 0 },
      max: { x: 100, y: 100 },
    };
    const newVp = fitExtent(bounds, 800, 600, 0);
    // world size 100x100. screen size 800x600.
    // zoomX = 800/100 = 8. zoomY = 600/100 = 6.
    // zoom = min(8, 6) = 6.
    expect(newVp.zoom).toBe(6);
    expect(newVp.center.x).toBe(50);
    expect(newVp.center.y).toBe(50);
  });
});
