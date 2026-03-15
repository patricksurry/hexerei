import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { HexMapDocument } from '@hexmap/core';
import { MapModel } from './model.js';

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
    const { mesh } = model;

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

  // S2: empty terrain string must return a visible fallback, not transparent
  it('terrainColor for empty string returns a visible fallback color', () => {
    const model = MapModel.load(MOCK_YAML);
    const color = model.terrainColor('');
    expect(color).not.toBe('transparent');
    expect(color).not.toBe('rgba(0,0,0,0)');
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
    const { hexIds } = model.features[1];
    expect(hexIds).toContain('2,0,-2');

    const features = model.featuresAtHex('2,0,-2');
    expect(features).toHaveLength(2);
    expect(features[1].label).toBe('Target');
  });

  describe('bfm.yaml RFC compliance', () => {
    const yaml = readFileSync(resolve(__dirname, '../../maps/definitions/bfm.yaml'), 'utf-8');

    it('loads without error', () => {
      expect(() => MapModel.load(yaml)).not.toThrow();
    });

    it('has no features with at="complex"', () => {
      const model = MapModel.load(yaml);
      const complex = model.features.filter((f) => f.at === 'complex');
      expect(complex).toHaveLength(0);
    });

    it('resolves railroad features to hex IDs', () => {
      const model = MapModel.load(yaml);
      const rail = model.features.find((f) => f.label === 'Northern Rail');
      expect(rail).toBeDefined();
      expect(rail!.hexIds.length).toBeGreaterThan(0);
    });

    it('uses flat-up orientation', () => {
      const model = MapModel.load(yaml);
      expect(model.grid.orientation).toBe('flat-up');
    });
  });

  it('MapModel.fromDocument rebuilds model from a HexMapDocument', () => {
    const doc = new HexMapDocument(MOCK_YAML);
    const model = MapModel.fromDocument(doc);
    expect(model.metadata.title).toBe('Test Map');
    expect(model.features).toHaveLength(2);
    expect(model.features[1].label).toBe('Target');
  });

  it('MapModel.fromDocument reflects document mutations', () => {
    const doc = new HexMapDocument(MOCK_YAML);
    doc.addFeature({ at: '0101', terrain: 'forest', label: 'New' });
    const model = MapModel.fromDocument(doc);
    expect(model.features).toHaveLength(3);
    expect(model.features[2].label).toBe('New');
  });
});
