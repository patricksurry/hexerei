import { MapModel } from './map-model.js';
import { HexPath, GeometryType } from '@hexmap/core';

export interface HexPathPreview {
  hexIds: string[];
  segmentPath?: string[];   // ordered hex IDs for drawing center-to-center line
  type: GeometryType;
  error?: {
    message: string;
    offset: number;
  };
}

/**
 * Parses raw input as a HexPath expression.
 */
export function parseHexPathInput(input: string, model: MapModel): HexPathPreview {
  if (!input.trim()) {
    return { hexIds: [], type: 'hex' };
  }

  const hexPath = new HexPath(model.mesh, {
    labelFormat: model.grid.labelFormat,
    orientation: model.grid.orientation,
    firstCol: model.grid.firstCol,
    firstRow: model.grid.firstRow
  });

  // I1: detect trailing separator before resolve() — avoids silent partial result
  if (/[./]$/.test(input.trim())) {
    return {
      hexIds: [],
      segmentPath: [],
      type: 'hex',
      error: { message: `Incomplete expression: '${input.trim()}'`, offset: input.trim().length - 1 }
    };
  }

  try {
    const result = hexPath.resolve(input);
    return {
      hexIds: result.type === 'hex' ? result.items : [],
      // I2: use path (traversal order, allows repeated visits) instead of items (Set)
      segmentPath: result.type === 'hex' ? (result.path ?? result.items) : [],
      type: result.type
    };
  } catch (e: any) {
    return {
      hexIds: [],
      segmentPath: [],
      type: 'hex',
      error: {
        message: e.message || 'Invalid expression',
        offset: 0 // TODO: Enhance HexPath to report error offsets
      }
    };
  }
}
