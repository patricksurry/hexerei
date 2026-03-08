import { Hex } from '@hexmap/core';
import { Point, ViewportState, screenToWorld } from './viewport.js';
import { MapModel } from './map-model.js';

import { HitResult } from '../types';

export const HEX_SIZE = 1;

export function hitTest(
  screenPt: Point,
  viewport: ViewportState,
  model: MapModel
): HitResult {
  const worldPt = screenToWorld(screenPt, viewport);
  const cube = Hex.pixelToHex(worldPt, HEX_SIZE, model.grid.hexTop);
  const id = Hex.hexId(cube);
  
  // Find nearest hex even if it's off-map, to allow selecting near edges
  const center = Hex.hexToPixel(cube, HEX_SIZE, model.grid.hexTop);
  
  // Calculate distances to center, midpoints, and corners
  const corners = Hex.hexCorners(center, HEX_SIZE, model.grid.hexTop);
  const midpoints = Hex.hexEdgeMidpoints(center, HEX_SIZE, model.grid.hexTop);

  let minCornerDist = Infinity;
  let minCornerIdx = -1;
  corners.forEach((p, i) => {
    const d = Math.sqrt(Math.pow(worldPt.x - p.x, 2) + Math.pow(worldPt.y - p.y, 2));
    if (d < minCornerDist) {
      minCornerDist = d;
      minCornerIdx = i;
    }
  });

  let minEdgeDist = Infinity;
  let minEdgeIdx = -1;
  midpoints.forEach((p, i) => {
    const d = Math.sqrt(Math.pow(worldPt.x - p.x, 2) + Math.pow(worldPt.y - p.y, 2));
    if (d < minEdgeDist) {
      minEdgeDist = d;
      minEdgeIdx = i;
    }
  });

  // Thresholds as fraction of HEX_SIZE
  if (minCornerDist < HEX_SIZE * 0.25) {
    return {
      type: 'vertex',
      vertexId: Hex.getCanonicalVertexId(cube, minCornerIdx)
    };
  }

  if (minEdgeDist < HEX_SIZE * 0.30) {
    const neighbor = Hex.hexNeighbor(cube, minEdgeIdx);
    const nId = Hex.hexId(neighbor);
    const hasNeighbor = !!model.mesh.getHex(nId);
    return {
      type: 'edge',
      boundaryId: Hex.getCanonicalBoundaryId(cube, hasNeighbor ? neighbor : null, minEdgeIdx),
      hexLabels: [model.hexIdToLabel(id), hasNeighbor ? model.hexIdToLabel(nId) : null]
    };
  }

  const area = model.mesh.getHex(id);
  if (area) {
    return {
      type: 'hex',
      hexId: id,
      label: model.hexIdToLabel(id)
    };
  }

  return null;
}

export function hexAtScreen(
  screenPt: Point,
  viewport: ViewportState,
  model: MapModel
): string | null {
  const hit = hitTest(screenPt, viewport, model);
  if (hit?.type === 'hex') return hit.label;
  
  // Fallback to nearest hex label for status bar
  const worldPt = screenToWorld(screenPt, viewport);
  const cube = Hex.pixelToHex(worldPt, HEX_SIZE, model.grid.hexTop);
  const id = Hex.hexId(cube);
  if (model.mesh.getHex(id)) {
    return model.hexIdToLabel(id);
  }
  return null;
}
