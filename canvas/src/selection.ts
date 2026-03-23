import { Hex } from '@hexmap/core';
import { Selection } from './types.js';
import { MapModel } from './model.js';
import { SceneHighlight } from './scene.js'; // Will move to scene.ts soon

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
  const parts = Hex.parseBoundaryId(boundaryId);
  const label1 = Hex.formatHexLabel(
    parts.hexA,
    model.grid.labelFormat,
    model.grid.orientation,
    model.grid.firstCol,
    model.grid.firstRow
  );
  const top = Hex.orientationTop(model.grid.orientation);

  if (parts.hexB === null && parts.direction !== undefined) {
    return `${label1}/${Hex.directionName(parts.direction, top).toUpperCase()}`;
  }
  if (parts.hexB) {
    for (let d = 0; d < 6; d++) {
      if (Hex.hexId(Hex.hexNeighbor(parts.hexA, d)) === Hex.hexId(parts.hexB)) {
        return `${label1}/${Hex.directionName(d, top).toUpperCase()}`;
      }
    }
  }
  return label1; // fallback
}

export function vertexIdToHexPath(vertexId: string, model: MapModel): string {
  const parts = Hex.parseVertexId(vertexId);
  const label1 = Hex.formatHexLabel(
    parts[0],
    model.grid.labelFormat,
    model.grid.orientation,
    model.grid.firstCol,
    model.grid.firstRow
  );
  for (let i = 0; i < 6; i++) {
    const n1 = Hex.hexId(Hex.hexNeighbor(parts[0], i));
    const n2 = Hex.hexId(Hex.hexNeighbor(parts[0], (i + 1) % 6));
    const ids = parts.map(Hex.hexId);
    if (ids.includes(n1) && ids.includes(n2)) {
      return `${label1}.${i}`;
    }
  }
  return label1;
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

export function highlightsForSelection(selection: Selection, model: MapModel): SceneHighlight[] {
  switch (selection.type) {
    case 'none':
      return [];
    case 'hex':
      return [{ type: 'hex', hexIds: [selection.hexId], color: '#00D4FF', style: 'select' }];
    case 'edge':
      const eParts = Hex.parseBoundaryId(selection.boundaryId);
      const hexIds = [Hex.hexId(eParts.hexA)];
      if (eParts.hexB) hexIds.push(Hex.hexId(eParts.hexB));

      return [
        {
          type: 'edge',
          boundaryId: selection.boundaryId,
          hexIds: [],
          color: '#FF44FF',
          style: 'select',
        },
        { type: 'hex', hexIds, color: '#FF44FF', style: 'hover' }, // Subtle background
      ];
    case 'vertex':
      const vParts = Hex.parseVertexId(selection.vertexId).map(Hex.hexId);
      return [
        {
          type: 'vertex',
          vertexId: selection.vertexId,
          hexIds: [],
          color: '#FFDD00',
          style: 'select',
        },
        { type: 'hex', hexIds: vParts, color: '#FFDD00', style: 'hover' }, // Subtle background
      ];
    case 'feature':
      const featureHexIds = selection.indices.flatMap((idx) => model.features[idx].hexIds);
      return [
        {
          type: 'hex',
          hexIds: Array.from(new Set(featureHexIds)),
          color: '#00D4FF',
          style: 'select',
        },
      ];
  }
}

export function highlightsForHover(hoverIndex: number | null, model: MapModel): SceneHighlight[] {
  if (hoverIndex === null) return [];
  const { hexIds } = model.features[hoverIndex];
  return [{ type: 'hex', hexIds, color: '#00D4FF', style: 'hover' }];
}

export function highlightsForCursor(cursorHexId: string | null, model: MapModel): SceneHighlight[] {
  if (cursorHexId === null) return [];
  if (!model.mesh.getHex(cursorHexId)) return [];
  return [{ type: 'hex', hexIds: [cursorHexId], color: '#00D4FF', style: 'hover' }];
}
