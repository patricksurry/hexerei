import { type GeometryType, HexPath } from '@hexmap/core';
import type { MapModel } from './model.js';

export interface HexPathPreview {
  hexIds: string[];
  segments?: string[][]; // connected segments for polyline rendering
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
    return { hexIds: [], segments: [], type: 'hex' };
  }

  const hexPath = new HexPath(model.mesh, {
    labelFormat: model.grid.labelFormat,
    orientation: model.grid.orientation,
    firstCol: model.grid.firstCol,
    firstRow: model.grid.firstRow,
  });

  // I1: detect trailing separator before resolve() — avoids silent partial result
  if (/[./]$/.test(input.trim())) {
    return {
      hexIds: [],
      segments: [],
      type: 'hex',
      error: {
        message: `Incomplete expression: '${input.trim()}'`,
        offset: input.trim().length - 1,
      },
    };
  }

  try {
    const result = hexPath.resolve(input);
    return {
      hexIds: result.type === 'hex' ? result.items : [],
      segments: result.segments ?? [],
      type: result.type,
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Invalid expression';
    return {
      hexIds: [],
      segments: [],
      type: 'hex',
      error: {
        message,
        offset: 0, // TODO: Enhance HexPath to report error offsets
      },
    };
  }
}
