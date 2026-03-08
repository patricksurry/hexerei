import { Selection } from '../types';
import { MapModel } from './map-model';

export interface SceneHighlight {
  hexIds: string[];
  color: string;
  style: 'select' | 'hover';
}

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
      const next = currentIndices.filter(i => i !== index);
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
    return { type: 'feature', indices: Array.from(new Set([...currentIndices, ...next])).sort((a, b) => a - b) };
  }

  return { type: 'feature', indices: [index] };
}

export function topmostFeatureAtHex(hexId: string, model: MapModel): number | null {
  const features = model.featuresAtHex(hexId);
  const nonBase = features.filter(f => !f.isBase);
  return nonBase.length > 0 ? nonBase[0].index : null;
}

export function highlightsForSelection(
  selection: Selection,
  model: MapModel
): SceneHighlight[] {
  switch (selection.type) {
    case 'none':
      return [];
    case 'hex':
      return [{ hexIds: [selection.hexId], color: '#00D4FF', style: 'select' }];
    case 'edge':
      // Highlight the two adjacent hexes
      const [id1, id2] = selection.boundaryId.split('|');
      const hexIds = [id1];
      if (id2 && id2 !== 'VOID') hexIds.push(id2);
      return [{ hexIds, color: '#FF3DFF', style: 'select' }];
    case 'vertex':
      // Highlight the meeting hexes
      const ids = selection.vertexId.split('^');
      return [{ hexIds: ids, color: '#FFD600', style: 'select' }];
    case 'feature':
      const featureHexIds = selection.indices.flatMap(idx => model.hexIdsForFeature(idx));
      return [{ hexIds: Array.from(new Set(featureHexIds)), color: '#00D4FF', style: 'select' }];
  }
}

export function highlightsForHover(
  hoverIndex: number | null,
  model: MapModel
): SceneHighlight[] {
  if (hoverIndex === null) return [];
  const hexIds = model.hexIdsForFeature(hoverIndex);
  return [{ hexIds, color: '#00D4FF', style: 'hover' }];
}
