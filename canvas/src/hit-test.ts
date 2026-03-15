import { Hex } from '@hexmap/core';
import { Point, ViewportState, screenToWorld } from './viewport.js';
import { MapModel } from './model.js';

import { HitResult } from './types.js';

const HEX_SIZE = 1;

export function hitTest(screenPt: Point, viewport: ViewportState, model: MapModel): HitResult {
  const orientation = Hex.orientationTop(model.grid.orientation);
  const worldPt = screenToWorld(screenPt, viewport);
  const cube = Hex.pixelToHex(worldPt, HEX_SIZE, orientation);
  const id = Hex.hexId(cube);

  const center = Hex.hexToPixel(cube, HEX_SIZE, orientation);

  const corners = Hex.hexCorners(center, HEX_SIZE, orientation);
  const midpoints = Hex.hexEdgeMidpoints(center, HEX_SIZE, orientation);

  const isCenterOnMap = !!model.mesh.getHex(id);

  let minCornerDist = Infinity;
  let minCornerIdx = -1;
  corners.forEach((p, i) => {
    const d = Math.sqrt((worldPt.x - p.x) ** 2 + (worldPt.y - p.y) ** 2);
    if (d < minCornerDist) {
      minCornerDist = d;
      minCornerIdx = i;
    }
  });

  let minEdgeDist = Infinity;
  let minEdgeIdx = -1;
  midpoints.forEach((p, i) => {
    const d = Math.sqrt((worldPt.x - p.x) ** 2 + (worldPt.y - p.y) ** 2);
    if (d < minEdgeDist) {
      minEdgeDist = d;
      minEdgeIdx = i;
    }
  });

  if (minCornerDist < HEX_SIZE * 0.25) {
    const n1Dir = minCornerIdx;
    const n2Dir = (minCornerIdx + 1) % 6;
    const n1Id = Hex.hexId(Hex.hexNeighbor(cube, n1Dir));
    const n2Id = Hex.hexId(Hex.hexNeighbor(cube, n2Dir));

    if (isCenterOnMap || model.mesh.getHex(n1Id) || model.mesh.getHex(n2Id)) {
      return {
        type: 'vertex',
        vertexId: Hex.getCanonicalVertexId(cube, minCornerIdx),
      };
    }
  }

  if (minEdgeDist < HEX_SIZE * 0.3) {
    const neighborDir = (minEdgeIdx + 1) % 6;
    const neighbor = Hex.hexNeighbor(cube, neighborDir);
    const nId = Hex.hexId(neighbor);
    const hasNeighbor = !!model.mesh.getHex(nId);

    if (isCenterOnMap || hasNeighbor) {
      return {
        type: 'edge',
        boundaryId: Hex.getCanonicalBoundaryId(cube, hasNeighbor ? neighbor : null, neighborDir),
        hexLabels: [
          Hex.formatHexLabel(
            Hex.hexFromId(id),
            model.grid.labelFormat,
            model.grid.orientation,
            model.grid.firstCol,
            model.grid.firstRow
          ),
          hasNeighbor
            ? Hex.formatHexLabel(
                Hex.hexFromId(nId),
                model.grid.labelFormat,
                model.grid.orientation,
                model.grid.firstCol,
                model.grid.firstRow
            )
            : null,
        ],
      };
    }
  }

  if (isCenterOnMap) {
    return {
      type: 'hex',
      hexId: id,
      label: Hex.formatHexLabel(
        Hex.hexFromId(id),
        model.grid.labelFormat,
        model.grid.orientation,
        model.grid.firstCol,
        model.grid.firstRow
      ),
    };
  }

  return { type: 'none' };
}
