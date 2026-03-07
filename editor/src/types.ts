/** A feature as the editor UI sees it */
export interface FeatureItem {
  /** Index in the features array (used as key and for reorder operations) */
  index: number;
  /** Feature id from the hexmap, if present */
  id?: string;
  /** Primary terrain type (first base type) */
  terrain?: string;
  /** Display label */
  label?: string;
  /** Raw HexPath string from the `at` field */
  at: string;
  /** Whether this feature targets @all */
  isBase: boolean;
}

/** What is currently selected in the editor */
export type Selection =
  | { type: 'none' }
  | { type: 'feature'; indices: number[] }
  | { type: 'hex'; id: string }
  | { type: 'edge'; id: string }
  | { type: 'vertex'; id: string };
