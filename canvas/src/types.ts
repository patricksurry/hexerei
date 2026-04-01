import type { FeatureSide, GeometryType } from '@hexmap/core';

export type HighlightStyle = 'select' | 'hover' | 'ghost' | 'dim';

// Redefined HitResult
export type HitResult =
  | { type: 'none' }
  | { type: 'hex'; hexId: string; label: string; offBoard?: boolean }
  | { type: 'edge'; boundaryId: string; hexLabels: [string, string | null] }
  | { type: 'vertex'; vertexId: string };

export interface FeatureItem {
  index: number;
  terrain: string;
  label?: string;
  id?: string;
  tags: string[];
  at: string;
  isBase: boolean;
  geometryType: GeometryType;
  hexIds: string[];
  edgeIds: string[];
  vertexIds: string[];
  segments?: string[][]; // from HexPathResult.segments, for path rendering
  elevation?: number;
  properties?: Record<string, unknown>;
  side?: FeatureSide;
}

export interface SceneHighlight {
  type: GeometryType;
  hexIds?: string[];
  boundaryId?: string;
  vertexId?: string;
  color: string;
  style: HighlightStyle;
}

export type Selection =
  | { type: 'none' }
  | { type: 'hex'; hexId: string; label: string }
  | { type: 'edge'; boundaryId: string; hexLabels: [string, string | null] }
  | { type: 'vertex'; vertexId: string }
  | { type: 'feature'; indices: number[] };
