// Redefined HitResult
export type HitResult =
  | { type: 'none' }
  | { type: 'hex'; hexId: string; label: string }
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
  hexIds: string[];
  elevation?: number;
  properties?: Record<string, unknown>;
  side?: 'both' | 'in' | 'out' | 'left' | 'right';
}

export type Selection =
  | { type: 'none' }
  | { type: 'hex'; hexId: string; label: string }
  | { type: 'edge'; boundaryId: string; hexLabels: [string, string | null] }
  | { type: 'vertex'; vertexId: string }
  | { type: 'feature'; indices: number[] };
