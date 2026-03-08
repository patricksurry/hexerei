import { MapModel } from './map-model.js';
import { HexPath, GeometryType } from '@hexmap/core';

export interface HexPathPreview {
  hexIds: string[];
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

  try {
    const result = hexPath.resolve(input);
    return {
      hexIds: result.items,
      type: result.type
    };
  } catch (e: any) {
    return {
      hexIds: [],
      type: 'hex',
      error: {
        message: e.message || 'Invalid expression',
        offset: 0 // TODO: Enhance HexPath to report error offsets
      }
    };
  }
}
