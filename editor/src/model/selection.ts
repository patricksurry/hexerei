import { Selection } from '../types';
import { MapModel } from './map-model';
import { Hex } from '@hexmap/core';

export interface SceneHighlight {
  type: 'hex' | 'edge' | 'vertex';
  hexIds: string[];
  boundaryId?: string;
  vertexId?: string;
  color: string;
  style: 'select' | 'hover' | 'ghost';
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

export function boundaryIdToHexPath(boundaryId: string, model: MapModel): string {
  const parts = boundaryId.split('|');
  const h1 = Hex.hexFromId(parts[0]);
  const label1 = model.hexIdToLabel(parts[0]);
  const orientation = model.grid.orientation;
  const top = Hex.orientationTop(orientation);

  if (parts[1]?.startsWith('VOID') || parts[1]?.startsWith('dir')) {
    const dir = parseInt(parts[1].split('/')[1]);
    return `${label1}/${directionName(dir, top)}`;
  }
  // Find direction from h1 to h2
  const h2 = Hex.hexFromId(parts[1]);
  for (let d = 0; d < 6; d++) {
    if (Hex.hexId(Hex.hexNeighbor(h1, d)) === Hex.hexId(h2)) {
      return `${label1}/${directionName(d, top)}`;
    }
  }
  return label1; // fallback
}

export function vertexIdToHexPath(vertexId: string, model: MapModel): string {
  const ids = vertexId.split('^');
  const h1 = Hex.hexFromId(ids[0]);
  const label1 = model.hexIdToLabel(ids[0]);
  // Find which corner of h1 this vertex is
  for (let i = 0; i < 6; i++) {
    const n1 = Hex.hexId(Hex.hexNeighbor(h1, i));
    const n2 = Hex.hexId(Hex.hexNeighbor(h1, (i + 1) % 6));
    if (ids.includes(n1) && ids.includes(n2)) {
      return `${label1}.${i}`;
    }
  }
  return label1;
}

// Helper — orientation-aware direction name
function directionName(dir: number, top: 'flat' | 'pointy'): string {
  const flatNames = ['NE', 'SE', 'S', 'SW', 'NW', 'N'];
  const pointyNames = ['E', 'NE', 'NW', 'W', 'SW', 'SE'];
  return top === 'flat' ? flatNames[dir] : pointyNames[dir];
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
      return [{ type: 'hex', hexIds: [selection.hexId], color: '#00D4FF', style: 'select' }];
    case 'edge':
      const [id1, id2] = selection.boundaryId.split('|');
      const hexIds = [id1];
      if (id2 && id2 !== 'VOID' && !id2.startsWith('dir')) hexIds.push(id2);
      
      return [
        { type: 'edge', boundaryId: selection.boundaryId, hexIds: [], color: '#FF44FF', style: 'select' },
        { type: 'hex', hexIds, color: '#FF44FF', style: 'hover' } // Subtle background
      ];
    case 'vertex':
      const ids = selection.vertexId.split('^');
      return [
        { type: 'vertex', vertexId: selection.vertexId, hexIds: [], color: '#FFDD00', style: 'select' },
        { type: 'hex', hexIds: ids, color: '#FFDD00', style: 'hover' } // Subtle background
      ];
    case 'feature':
      const featureHexIds = selection.indices.flatMap(idx => model.hexIdsForFeature(idx));
      return [{ type: 'hex', hexIds: Array.from(new Set(featureHexIds)), color: '#00D4FF', style: 'select' }];
  }
}

export function highlightsForHover(
  hoverIndex: number | null,
  model: MapModel
): SceneHighlight[] {
  if (hoverIndex === null) return [];
  const hexIds = model.hexIdsForFeature(hoverIndex);
  return [{ type: 'hex', hexIds, color: '#00D4FF', style: 'hover' }];
}

export function highlightsForCursor(
  cursorHexId: string | null,
  model: MapModel
): SceneHighlight[] {
  if (cursorHexId === null) return [];
  if (!model.mesh.getHex(cursorHexId)) return [];
  return [{ type: 'hex', hexIds: [cursorHexId], color: '#00D4FF', style: 'hover' }];
}
