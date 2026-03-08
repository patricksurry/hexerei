/** A feature as the editor UI sees it */
export interface FeatureItem {
  index: number;
  terrain: string;
  label?: string;
  id?: string;
  tags: string[];
  at: string;
  isBase: boolean;
  hexIds: string[];
  raw?: any;
}

/** What is currently selected in the editor */
export type Selection =
  | { type: 'none' }
  | { type: 'hex'; hexId: string; label: string }
  | { type: 'edge'; boundaryId: string; hexLabels: [string, string | null] }
  | { type: 'vertex'; vertexId: string }
  | { type: 'feature'; indices: number[] };

export type HitResult =
  | { type: 'hex'; hexId: string; label: string }
  | { type: 'edge'; boundaryId: string; hexLabels: [string, string | null] }
  | { type: 'vertex'; vertexId: string }
  | null;
