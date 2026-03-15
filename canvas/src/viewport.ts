import { Hex } from '@hexmap/core';

export type Point = Hex.Point;

export interface ViewportState {
  center: Point; // world-space point at screen center
  zoom: number; // screen pixels per world unit
  width: number; // screen width in pixels
  height: number; // screen height in pixels
}

export function screenToWorld(screen: Point, vp: ViewportState): Point {
  const screenCenter = { x: vp.width / 2, y: vp.height / 2 };
  return {
    x: (screen.x - screenCenter.x) / vp.zoom + vp.center.x,
    y: (screen.y - screenCenter.y) / vp.zoom + vp.center.y,
  };
}

export function worldToScreen(world: Point, vp: ViewportState): Point {
  const screenCenter = { x: vp.width / 2, y: vp.height / 2 };
  return {
    x: (world.x - vp.center.x) * vp.zoom + screenCenter.x,
    y: (world.y - vp.center.y) * vp.zoom + screenCenter.y,
  };
}

export function panBy(vp: ViewportState, screenDelta: Point): ViewportState {
  return {
    ...vp,
    center: {
      x: vp.center.x - screenDelta.x / vp.zoom,
      y: vp.center.y - screenDelta.y / vp.zoom,
    },
  };
}

export function zoomAt(vp: ViewportState, screenPoint: Point, factor: number): ViewportState {
  const worldPointBefore = screenToWorld(screenPoint, vp);
  const newZoom = vp.zoom * factor;

  // We want worldPointBefore to stay at the same screenPoint after zoom.
  // screenPoint = (worldPointBefore - newCenter) * newZoom + screenCenter
  // (screenPoint - screenCenter) / newZoom = worldPointBefore - newCenter
  // newCenter = worldPointBefore - (screenPoint - screenCenter) / newZoom

  const screenCenter = { x: vp.width / 2, y: vp.height / 2 };
  const newCenter = {
    x: worldPointBefore.x - (screenPoint.x - screenCenter.x) / newZoom,
    y: worldPointBefore.y - (screenPoint.y - screenCenter.y) / newZoom,
  };

  return {
    ...vp,
    center: newCenter,
    zoom: newZoom,
  };
}

export function fitExtent(
  worldBounds: { min: Point; max: Point },
  width: number,
  height: number,
  padding: number = 0.08
): ViewportState {
  const worldWidth = worldBounds.max.x - worldBounds.min.x;
  const worldHeight = worldBounds.max.y - worldBounds.min.y;

  const availWidth = width * (1 - padding * 2);
  const availHeight = height * (1 - padding * 2);

  const zoomX = availWidth / worldWidth;
  const zoomY = availHeight / worldHeight;
  const zoom = Math.min(zoomX, zoomY);

  const center = {
    x: (worldBounds.min.x + worldBounds.max.x) / 2,
    y: (worldBounds.min.y + worldBounds.max.y) / 2,
  };

  return {
    center,
    zoom,
    width,
    height,
  };
}

export function computeWorldBounds(
  hexCenters: Point[],
  hexSize: number,
  orientation: Hex.HexOrientation
): { min: Point; max: Point } {
  if (hexCenters.length === 0) return { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const center of hexCenters) {
    const corners = Hex.hexCorners(center, hexSize, orientation);
    for (const corner of corners) {
      minX = Math.min(minX, corner.x);
      minY = Math.min(minY, corner.y);
      maxX = Math.max(maxX, corner.x);
      maxY = Math.max(maxY, corner.y);
    }
  }

  return {
    min: { x: minX, y: minY },
    max: { x: maxX, y: maxY },
  };
}
