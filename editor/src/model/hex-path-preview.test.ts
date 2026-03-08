import { describe, it, expect } from 'vitest';
import { parseHexPathInput } from './hex-path-preview.js';
import { MapModel } from './map-model.js';

const MOCK_YAML = `
hexmap: "1.0"
layout:
  hex_top: flat
  stagger: low
  label: XXYY
  all: "0101 0303 !"
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
    const result = parseHexPathInput('0101 0103', model);
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
});
