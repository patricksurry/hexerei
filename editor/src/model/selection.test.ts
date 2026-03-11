import { describe, it, expect } from 'vitest';
import { boundaryIdToHexPath, vertexIdToHexPath } from './selection.js';
import { MapModel } from './map-model.js';
import { Hex } from '@hexmap/core';

const YAML = `
hexmap: "1.0"
layout:
  orientation: flat-down
  coordinates:
    label: XXYY
    first: [1, 1]
  all: "0101 0201 0202"
`;

describe('Selection Helpers', () => {
  const model = MapModel.load(YAML);

  it('boundaryIdToHexPath returns label/direction for a shared edge', () => {
    // 0101 and 0201 are adjacent in flat-down
    const c1 = Hex.offsetToCube(1, 1, 'flat-down');
    const c2 = Hex.offsetToCube(2, 1, 'flat-down');
    // Direction from c1 to c2 is 0 (NE)
    const bid = Hex.getCanonicalBoundaryId(c1, c2, 0);
    const result = boundaryIdToHexPath(bid, model);
    expect(result).toBe('0101/NE');
  });

  it('boundaryIdToHexPath returns label/direction for a VOID edge', () => {
    const c1 = Hex.offsetToCube(1, 1, 'flat-down');
    const bid = Hex.hexId(c1) + '|VOID/5'; // North edge
    const result = boundaryIdToHexPath(bid, model);
    expect(result).toBe('0101/N');
  });

  it('vertexIdToHexPath returns label.index for a vertex', () => {
    // 0101, 0201, 0102 meet at a vertex (vertex index 1 for 0101)
    const h1 = Hex.offsetToCube(1, 1, 'flat-down');
    const h2 = Hex.offsetToCube(2, 1, 'flat-down');
    const h3 = Hex.offsetToCube(2, 2, 'flat-down'); // not used in simple vertex
    
    // In flat-down, corners are 0=30°, 1=90°, 2=150°, 3=210°, 4=270°, 5=330°
    // Corner 1 is shared between h1, h2, and h3 (if they are in a triangle)
    const vid = Hex.getCanonicalVertexId(h1, 1);
    const result = vertexIdToHexPath(vid, model);
    expect(result).toBe('0101.1');
  });
});
