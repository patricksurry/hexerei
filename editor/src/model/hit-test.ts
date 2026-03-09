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
  const orientation = Hex.orientationTop(model.grid.orientation);
  const worldPt = screenToWorld(screenPt, viewport);
  const cube = Hex.pixelToHex(worldPt, HEX_SIZE, orientation);
  const id = Hex.hexId(cube);

  // Find nearest hex even if it's off-map, to allow selecting near edges
  const center = Hex.hexToPixel(cube, HEX_SIZE, orientation);

  // Calculate distances to center, midpoints, and corners
  const corners = Hex.hexCorners(center, HEX_SIZE, orientation);
  const midpoints = Hex.hexEdgeMidpoints(center, HEX_SIZE, orientation);

  const isCenterOnMap = !!model.mesh.getHex(id);

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
    const n1Dir = minCornerIdx;
    const n2Dir = (minCornerIdx + 1) % 6;
    const n1Id = Hex.hexId(Hex.hexNeighbor(cube, n1Dir));
    const n2Id = Hex.hexId(Hex.hexNeighbor(cube, n2Dir));
    
    // Only return vertex hit if at least one participating hex is on the map
    if (isCenterOnMap || model.mesh.getHex(n1Id) || model.mesh.getHex(n2Id)) {
      return {
        type: 'vertex',
        vertexId: Hex.getCanonicalVertexId(cube, minCornerIdx)
      };
    }
  }

  if (minEdgeDist < HEX_SIZE * 0.30) {
    const neighborDir = (minEdgeIdx + 1) % 6;
    const neighbor = Hex.hexNeighbor(cube, neighborDir);
    const nId = Hex.hexId(neighbor);
    const hasNeighbor = !!model.mesh.getHex(nId);
    
    // Only return edge hit if at least one participating hex is on the map
    if (isCenterOnMap || hasNeighbor) {
      return {
        type: 'edge',
        boundaryId: Hex.getCanonicalBoundaryId(cube, hasNeighbor ? neighbor : null, neighborDir),
        hexLabels: [model.hexIdToLabel(id), hasNeighbor ? model.hexIdToLabel(nId) : null]
      };
    }
  }

  if (isCenterOnMap) {
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
  const cube = Hex.pixelToHex(worldPt, HEX_SIZE, Hex.orientationTop(model.grid.orientation)); // separate function, own scope
  const id = Hex.hexId(cube);
  if (model.mesh.getHex(id)) {
    return model.hexIdToLabel(id);
  }
  return null;
}
