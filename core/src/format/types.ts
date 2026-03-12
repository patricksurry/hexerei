import type { Orientation } from '../math/hex-math.js';

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
  origin?: 'top-left' | 'bottom-left' | 'top-right' | 'bottom-right';
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
