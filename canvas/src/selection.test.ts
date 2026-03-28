import { Hex } from '@hexmap/core';
import { describe, expect, it } from 'vitest';
import { MapModel } from './model.js';
import {
  boundaryIdToHexPath,
  topmostFeatureAtEdge,
  topmostFeatureAtVertex,
  vertexIdToHexPath,
} from './selection.js';

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
    const bid = `${Hex.hexId(c1)}|VOID/5`; // North edge
    const result = boundaryIdToHexPath(bid, model);
    expect(result).toBe('0101/N');
  });

  it('vertexIdToHexPath returns label.index for a vertex', () => {
    // 0101, 0201, 0102 meet at a vertex (vertex index 1 for 0101)
    const h1 = Hex.offsetToCube(1, 1, 'flat-down');
    const _h2 = Hex.offsetToCube(2, 1, 'flat-down');
    const _h3 = Hex.offsetToCube(2, 2, 'flat-down'); // not used in simple vertex

    // In flat-down, corners are 0=30°, 1=90°, 2=150°, 3=210°, 4=270°, 5=330°
    // Corner 1 is shared between h1, h2, and h3 (if they are in a triangle)
    const vid = Hex.getCanonicalVertexId(h1, 1);
    const result = vertexIdToHexPath(vid, model);
    expect(result).toBe('0101.1');
  });

  describe('Feature hit detection', () => {
    const FeatureYaml = `
hexmap: "1.0"
layout:
  orientation: flat-down
  all: "0101 0201"
terrain:
  hex: { clear: { style: { color: "#fff" } } }
  edge: { river: { style: { color: "#00f" } } }
  vertex: { bridge: { style: { color: "#888" } } }
features:
  - at: "0101/NE"
    terrain: river
  - at: "0101.1"
    terrain: bridge
`;
    const model = MapModel.load(FeatureYaml);

    it('topmostFeatureAtEdge finds the feature index', () => {
      const h1 = Hex.offsetToCube(1, 1, 'flat-down');
      const h2 = Hex.offsetToCube(2, 1, 'flat-down');
      const bid = Hex.getCanonicalBoundaryId(h1, h2, 0);
      const index = topmostFeatureAtEdge(bid, model);
      expect(index).toBe(0);
    });

    it('topmostFeatureAtVertex finds the feature index', () => {
      const h1 = Hex.offsetToCube(1, 1, 'flat-down');
      const vid = Hex.getCanonicalVertexId(h1, 1);
      const index = topmostFeatureAtVertex(vid, model);
      expect(index).toBe(1);
    });
  });
});
