import type { Orientation } from '../math/hex-math.js';

export type LayoutOrigin = 'top-left' | 'bottom-left' | 'top-right' | 'bottom-right';
export type TerrainTypeClass = 'base' | 'modifier';
export type FeatureSide = 'both' | 'in' | 'out' | 'left' | 'right';

export interface GeoReference {
  scale?: number;
  anchor?: { lat: number; lng: number };
  anchor_hex?: string;
  bearing?: number;
  projection?: string;
}

export interface HexMapLayout {
  orientation: Orientation;
  all: string;
  label?: string;
  origin?: LayoutOrigin;
  georef?: GeoReference;
}

export interface HexMapMetadata {
  id?: string;
  version?: string;
  title?: string;
  description?: string;
  designer?: string;
  publisher?: string;
  date?: string;
  source?: { url?: string; notes?: string };
}

export interface TerrainStyle {
  color?: string;
  pattern?: string;
  stroke?: string;
  stroke_width?: number;
}

export interface TerrainTypeDef {
  name?: string;
  type?: TerrainTypeClass;
  onesided?: boolean;
  style?: TerrainStyle;
  properties?: Record<string, unknown>;
}

export interface TerrainVocabulary {
  hex?: Record<string, TerrainTypeDef>;
  edge?: Record<string, TerrainTypeDef>;
  vertex?: Record<string, TerrainTypeDef>;
}

export interface Feature {
  at: string;
  terrain?: string;
  elevation?: number;
  label?: string;
  id?: string;
  tags?: string;
  side?: FeatureSide;
  properties?: Record<string, unknown>;
}
