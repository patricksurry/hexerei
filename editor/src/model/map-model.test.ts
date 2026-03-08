import { describe, it, expect } from 'vitest';
import { MapModel } from './map-model.js';

const MOCK_YAML = `
hexmap: "1.0"
metadata:
  title: "Test Map"
layout:
  orientation: flat-down
  label: XXYY
  all: "0101 0201"
terrain:
  hex:
    clear:
      style: { color: "#ffffff" }
    forest:
      style: { color: "#00ff00" }
features:
  - at: "@all"
    terrain: clear
  - at: "0201"
    terrain: forest
    label: "Target"
`;

describe('MapModel', () => {
  it('should load metadata', () => {
    const model = MapModel.load(MOCK_YAML);
    expect(model.metadata.title).toBe('Test Map');
  });

  it('should build mesh with correct terrain', () => {
    const model = MapModel.load(MOCK_YAML);
    const mesh = model.mesh;
    
    // 0201 is forest
    const id0201 = '2,0,-2'; 
    expect(mesh.getHex(id0201)?.terrain).toBe('clear forest');
    
    // 0101 is clear
    const id0101 = '1,1,-2';
    expect(mesh.getHex(id0101)?.terrain).toBe('clear');
  });

  it('should return terrain colors', () => {
    const model = MapModel.load(MOCK_YAML);
    expect(model.terrainColor('clear')).toBe('#ffffff');
    expect(model.terrainColor('clear forest')).toBe('#00ff00');
  });

  it('should process features list', () => {
    const model = MapModel.load(MOCK_YAML);
    expect(model.features).toHaveLength(2);
    expect(model.features[1].label).toBe('Target');
  });

  it('should return computed hex state with features', () => {
    const model = MapModel.load(MOCK_YAML);
    const id0201 = '2,0,-2';
    const state = model.computedHex(id0201);
    expect(state).toBeDefined();
    expect(state?.label).toBe('0201');
    expect(state?.terrain).toBe('clear forest');
    expect(state?.contributingFeatures).toHaveLength(2);
  });

  it('should support reverse feature mapping', () => {
    const model = MapModel.load(MOCK_YAML);
    const hexIds = model.hexIdsForFeature(1);
    expect(hexIds).toContain('2,0,-2');
    
    const features = model.featuresAtHex('2,0,-2');
    expect(features).toHaveLength(2);
    expect(features[1].label).toBe('Target');
  });
});
