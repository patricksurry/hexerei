import { describe, it, expect } from 'vitest';
import { MapModel } from './map-model.js';

const MOCK_YAML = `
hexmap: "1.0"
metadata:
  title: "Test Map"
layout:
  hex_top: flat
  stagger: low
  label: XXYY
  all: "0101 0301 0303 0103 ! - 0303"
terrain:
  hex:
    clear:
      style: { color: "#ffffff" }
    forest:
      style: { color: "#00ff00" }
features:
  - at: "@all"
    terrain: clear
  - at: "0202"
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
    
    // 0202 is forest
    const id0202 = '1,1,-2'; // offset(1,1) in XXYY starting at 0101
    expect(mesh.getHex(id0202)?.terrain).toBe('clear forest'); // layered
    
    // 0101 is clear
    const id0101 = '0,0,0';
    expect(mesh.getHex(id0101)?.terrain).toBe('clear');
    
    // 0303 is excluded from @all
    const id0303 = '2,2,-4';
    expect(mesh.getHex(id0303)).toBeUndefined();
  });

  it('should return terrain colors', () => {
    const model = MapModel.load(MOCK_YAML);
    expect(model.terrainColor('clear')).toBe('#ffffff');
    expect(model.terrainColor('clear forest')).toBe('#00ff00'); // last one wins
    expect(model.terrainColor('unknown')).toBe('#555555');
  });

  it('should process features list', () => {
    const model = MapModel.load(MOCK_YAML);
    expect(model.features).toHaveLength(2); // From YAML
    expect(model.features[0].terrain).toBe('clear');
    expect(model.features[1].label).toBe('Target');
  });

  it('should return computed hex state', () => {
    const model = MapModel.load(MOCK_YAML);
    const id0202 = '1,1,-2';
    const state = model.computedHex(id0202);
    expect(state).toBeDefined();
    expect(state?.label).toBe('0202');
    expect(state?.terrain).toBe('clear forest');
    expect(state?.terrainColor).toBe('#00ff00');
    expect(state?.neighborLabels).toContain('0201');
    expect(state?.neighborLabels).toContain('0102');
  });
});
