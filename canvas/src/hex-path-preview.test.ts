import { describe, it, expect } from 'vitest';
import { parseHexPathInput } from './hex-path-preview.js';
import { MapModel } from '../../editor/src/model/map-model.js';

const MOCK_YAML = `
hexmap: "1.0"
layout:
  orientation: flat-down
  label: XXYY
  all: "0101 - 0303 fill"
`;

describe('HexPath Preview', () => {
  const model = MapModel.load(MOCK_YAML);

  it('should resolve a single hex', () => {
    const result = parseHexPathInput('0101', model);
    expect(result.hexIds).toHaveLength(1);
    expect(result.type).toBe('hex');
    expect(result.error).toBeUndefined();
  });

  it('should resolve a path', () => {
    const result = parseHexPathInput('0101 - 0103', model);
    expect(result.hexIds).toHaveLength(3);
    expect(result.error).toBeUndefined();
  });

  it('should handle invalid expressions (mixed types)', () => {
    const result = parseHexPathInput('0101 0101/N', model);
    expect(result.hexIds).toHaveLength(0);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toMatch(/Inconsistent geometry type/);
  });

  it('should return empty for empty input', () => {
    const result = parseHexPathInput('', model);
    expect(result.hexIds).toHaveLength(0);
    expect(result.error).toBeUndefined();
  });

  it('returns segmentPath in path order for a sequential hex path', () => {
    const result = parseHexPathInput('0101 0201 0301', model);
    expect(result.segmentPath).toHaveLength(3);
    result.segmentPath?.forEach(id => expect(id).toMatch(/^-?\d+,-?\d+,-?\d+$/));
    expect(result.segmentPath![0]).not.toEqual(result.segmentPath![1]);
  });

  // I1: trailing separator should be an error, not a silent partial result
  it('returns error for trailing dot (incomplete vertex expression)', () => {
    const result = parseHexPathInput('0101.', model);
    expect(result.error).toBeDefined();
    expect(result.hexIds).toHaveLength(0);
  });

  it('returns error for trailing slash (incomplete edge expression)', () => {
    const result = parseHexPathInput('0101/', model);
    expect(result.error).toBeDefined();
    expect(result.hexIds).toHaveLength(0);
  });

  // I2: segmentPath must preserve traversal order including repeated visits
  it('segmentPath preserves traversal order and includes repeated hex visits', () => {
    // 0101 → 0201 → 0101: hexIds deduplicates to 2, but segmentPath should have 3
    const result = parseHexPathInput('0101 0201 0101', model);
    expect(result.hexIds).toHaveLength(2);       // Set deduplication
    expect(result.segmentPath).toHaveLength(3);  // traversal order with repeats
    expect(result.segmentPath![0]).toEqual(result.segmentPath![2]); // 0101 at start and end
  });
});
