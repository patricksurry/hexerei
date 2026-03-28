import { Hex } from '@hexmap/core';
import { HEX_SIZE, HIT_THRESHOLD_EDGE, HIT_THRESHOLD_VERTEX } from './constants.js';
import type { MapModel } from './model.js';
import type { HitResult } from './types.js';
import { type Point, screenToWorld, type ViewportState } from './viewport.js';

export interface HitTestOptions {
  includeOffBoard?: boolean;
}

export function hitTest(
  screenPt: Point,
  viewport: ViewportState,
  model: MapModel,
  options?: HitTestOptions
): HitResult {
  const orientation = Hex.orientationTop(model.grid.orientation);
  const worldPt = screenToWorld(screenPt, viewport);
  const cube = Hex.pixelToHex(worldPt, HEX_SIZE, orientation);
  const id = Hex.hexId(cube);

  const center = Hex.hexToPixel(cube, HEX_SIZE, orientation);
  const isCenterOnMap = !!model.mesh.getHex(id);

  // 1. Vertex Hit
  const vertexHit = checkVertexHit(worldPt, center, cube, orientation, isCenterOnMap, model);
  if (vertexHit) return vertexHit;

  // 2. Edge Hit
  const edgeHit = checkEdgeHit(worldPt, center, cube, orientation, isCenterOnMap, model);
  if (edgeHit) return edgeHit;

  // 3. Hex Hit
  if (isCenterOnMap) {
    return {
      type: 'hex',
      hexId: id,
      label: Hex.formatHexLabel(cube, model.grid.labelFormat, model.grid.orientation),
    };
  }

  // 4. Off-board neighbor hit (for paint mode)
  if (options?.includeOffBoard) {
    for (let dir = 0; dir < 6; dir++) {
      const neighborId = Hex.hexId(Hex.hexNeighbor(cube, dir));
      if (model.mesh.getHex(neighborId)) {
        return {
          type: 'hex',
          hexId: id,
          label: Hex.formatHexLabel(cube, model.grid.labelFormat, model.grid.orientation),
          offBoard: true,
        };
      }
    }
  }

  return { type: 'none' };
}

function checkVertexHit(
  worldPt: Point,
  center: Point,
  cube: Hex.Cube,
  orientation: 'flat' | 'pointy',
  isCenterOnMap: boolean,
  model: MapModel
): HitResult | null {
  const corners = Hex.hexCorners(center, HEX_SIZE, orientation);
  let minCornerDist = Infinity;
  let minCornerIdx = -1;

  corners.forEach((p, i) => {
    const d = Math.sqrt((worldPt.x - p.x) ** 2 + (worldPt.y - p.y) ** 2);
    if (d < minCornerDist) {
      minCornerDist = d;
      minCornerIdx = i;
    }
  });

  if (minCornerDist < HIT_THRESHOLD_VERTEX) {
    const isPointy = orientation === 'pointy';
    const n1Dir = (minCornerIdx + (isPointy ? 1 : 0)) % 6;
    const n2Dir = (minCornerIdx + (isPointy ? 2 : 1)) % 6;
    const n1Id = Hex.hexId(Hex.hexNeighbor(cube, n1Dir));
    const n2Id = Hex.hexId(Hex.hexNeighbor(cube, n2Dir));

    if (isCenterOnMap || model.mesh.getHex(n1Id) || model.mesh.getHex(n2Id)) {
      return {
        type: 'vertex',
        vertexId: Hex.getCanonicalVertexId(cube, minCornerIdx, orientation),
      };
    }
  }
  return null;
}

function checkEdgeHit(
  worldPt: Point,
  center: Point,
  cube: Hex.Cube,
  orientation: 'flat' | 'pointy',
  isCenterOnMap: boolean,
  model: MapModel
): HitResult | null {
  const midpoints = Hex.hexEdgeMidpoints(center, HEX_SIZE, orientation);
  let minEdgeDist = Infinity;
  let minEdgeIdx = -1;

  midpoints.forEach((p, i) => {
    const d = Math.sqrt((worldPt.x - p.x) ** 2 + (worldPt.y - p.y) ** 2);
    if (d < minEdgeDist) {
      minEdgeDist = d;
      minEdgeIdx = i;
    }
  });

  if (minEdgeDist < HIT_THRESHOLD_EDGE) {
    const isPointy = orientation === 'pointy';
    const neighborDir = (minEdgeIdx + (isPointy ? 2 : 1)) % 6;
    const neighbor = Hex.hexNeighbor(cube, neighborDir);
    const nId = Hex.hexId(neighbor);
    const hasNeighbor = !!model.mesh.getHex(nId);

    if (isCenterOnMap || hasNeighbor) {
      return {
        type: 'edge',
        boundaryId: Hex.getCanonicalBoundaryId(cube, hasNeighbor ? neighbor : null, neighborDir),
        hexLabels: [
          Hex.formatHexLabel(cube, model.grid.labelFormat, model.grid.orientation),
          hasNeighbor
            ? Hex.formatHexLabel(neighbor, model.grid.labelFormat, model.grid.orientation)
            : null,
        ],
      };
    }
  }
  return null;
}
