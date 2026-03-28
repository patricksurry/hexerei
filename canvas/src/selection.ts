import { Hex, HexPath } from '@hexmap/core';
import { ACCENT_EDGE, ACCENT_HEX, ACCENT_VERTEX } from './constants.js';
import type { MapModel } from './model.js';
import type { SceneHighlight, Selection } from './types.js';

export function clearSelection(): Selection {
  return { type: 'none' };
}

export function selectHex(hexId: string, label: string): Selection {
  return { type: 'hex', hexId, label };
}

export function selectEdge(boundaryId: string, hexLabels: [string, string | null]): Selection {
  return { type: 'edge', boundaryId, hexLabels };
}

export function selectVertex(vertexId: string): Selection {
  return { type: 'vertex', vertexId };
}

export function boundaryIdToHexPath(boundaryId: string, model: MapModel): string {
  const hp = new HexPath(model.mesh, {
    labelFormat: model.grid.labelFormat,
    orientation: model.grid.orientation,
    firstCol: model.grid.firstCol,
    firstRow: model.grid.firstRow,
  });
  return hp.idToAtom(boundaryId, 'edge');
}

export function vertexIdToHexPath(vertexId: string, model: MapModel): string {
  const hp = new HexPath(model.mesh, {
    labelFormat: model.grid.labelFormat,
    orientation: model.grid.orientation,
    firstCol: model.grid.firstCol,
    firstRow: model.grid.firstRow,
  });
  return hp.idToAtom(vertexId, 'vertex');
}

export function selectFeature(
  index: number,
  current: Selection,
  modifier: 'none' | 'shift' | 'cmd'
): Selection {
  if (modifier === 'none') {
    return { type: 'feature', indices: [index] };
  }

  const currentIndices = current.type === 'feature' ? current.indices : [];

  if (modifier === 'cmd') {
    if (currentIndices.includes(index)) {
      const next = currentIndices.filter((i) => i !== index);
      return next.length === 0 ? { type: 'none' } : { type: 'feature', indices: next };
    }
    return { type: 'feature', indices: [...currentIndices, index].sort((a, b) => a - b) };
  }

  if (modifier === 'shift') {
    if (currentIndices.length === 0) return { type: 'feature', indices: [index] };
    const last = currentIndices[currentIndices.length - 1];
    const start = Math.min(last, index);
    const end = Math.max(last, index);
    const next = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    return {
      type: 'feature',
      indices: Array.from(new Set([...currentIndices, ...next])).sort((a, b) => a - b),
    };
  }

  return { type: 'feature', indices: [index] };
}

export function topmostFeatureAtHex(hexId: string, model: MapModel): number | null {
  const features = model.featuresAtHex(hexId);
  const nonBase = features.filter((f) => !f.isBase);
  return nonBase.length > 0 ? nonBase[nonBase.length - 1].index : null;
}

export function topmostFeatureAtEdge(boundaryId: string, model: MapModel): number | null {
  const features = model.featuresAtEdge(boundaryId);
  return features.length > 0 ? features[features.length - 1].index : null;
}

export function topmostFeatureAtVertex(vertexId: string, model: MapModel): number | null {
  const features = model.featuresAtVertex(vertexId);
  return features.length > 0 ? features[features.length - 1].index : null;
}

export function highlightsForSelection(
  selection: Selection,
  model: MapModel,
  colors?: { hex?: string; edge?: string; vertex?: string }
): SceneHighlight[] {
  const accentHex = colors?.hex || ACCENT_HEX;
  const accentEdge = colors?.edge || ACCENT_EDGE;
  const accentVertex = colors?.vertex || ACCENT_VERTEX;

  switch (selection.type) {
    case 'none':
      return [];
    case 'hex':
      return [{ type: 'hex', hexIds: [selection.hexId], color: accentHex, style: 'select' }];
    case 'edge': {
      const eParts = Hex.parseBoundaryId(selection.boundaryId);
      const hexIds = [Hex.hexId(eParts.hexA)];
      if (eParts.hexB) hexIds.push(Hex.hexId(eParts.hexB));

      return [
        {
          type: 'edge',
          boundaryId: selection.boundaryId,
          hexIds: [],
          color: accentEdge,
          style: 'select',
        },
        { type: 'hex', hexIds, color: accentEdge, style: 'hover' }, // Subtle background
      ];
    }
    case 'vertex': {
      const vParts = Hex.parseVertexId(selection.vertexId).map(Hex.hexId);
      return [
        {
          type: 'vertex',
          vertexId: selection.vertexId,
          hexIds: [],
          color: accentVertex,
          style: 'select',
        },
        { type: 'hex', hexIds: vParts, color: accentVertex, style: 'hover' }, // Subtle background
      ];
    }
    case 'feature': {
      const featureHexIds = selection.indices.flatMap((idx) => model.features[idx].hexIds);
      return [
        {
          type: 'hex',
          hexIds: Array.from(new Set(featureHexIds)),
          color: accentHex,
          style: 'select',
        },
      ];
    }
  }
}

export function highlightsForHover(
  hoverIndex: number | null,
  model: MapModel,
  color: string = ACCENT_HEX
): SceneHighlight[] {
  if (hoverIndex === null) return [];
  const { hexIds } = model.features[hoverIndex];
  return [{ type: 'hex', hexIds, color, style: 'hover' }];
}

export function highlightsForCursor(
  cursorHexId: string | null,
  model: MapModel,
  color: string = ACCENT_HEX
): SceneHighlight[] {
  if (cursorHexId === null) return [];
  if (!model.mesh.getHex(cursorHexId)) return [];
  return [{ type: 'hex', hexIds: [cursorHexId], color, style: 'hover' }];
}
