import { describe, it, expect, test } from 'vitest';
import { HexMapDocument } from './document.js';
import type { Feature } from './types.js';

const SAMPLE_YAML = `hexmap: "1.0"
metadata:
  title: "Test Map"
  # This comment should be preserved
  id: "test-map"

grid:
  columns: 10
  rows: 10
`;

describe('HexMapDocument', () => {
    it('should parse and round-trip essentially identical content', () => {
        const doc = new HexMapDocument(SAMPLE_YAML);
        expect(doc.toString()).toBe(SAMPLE_YAML);
    });

    it('should allow modifying metadata while preserving structure', () => {
        const doc = new HexMapDocument(SAMPLE_YAML);
        doc.setMetadata('title', 'New Title');

        const output = doc.toString();
        expect(output).toContain('title: "New Title"');
        expect(output).toContain('# This comment should be preserved');
        expect(output).toContain('id: "test-map"');
    });

    it('should create metadata if missing', () => {
        const minimal = `hexmap: "1.0"\n`;
        const doc = new HexMapDocument(minimal);
        doc.setMetadata('designer', 'Me');
        expect(doc.toString()).toContain('designer: Me');
    });
});

test('HexMapDocument typed methods', () => {
    const doc = new HexMapDocument('hexmap: "1.0"\nlayout:\n  orientation: flat-down\n  all: base\n');
    doc.setMetadata('title', 'New Map');
    expect(doc.getMetadata().title).toBe('New Map');
    
    expect(doc.getLayout().orientation).toBe('flat-down');
    
    const feature: Feature = { at: '0101', terrain: 'M' };
    doc.addFeature(feature); // should not throw
});

const SAMPLE_YAML_WITH_FEATURES = `
hexmap: "1.0"
layout:
  orientation: flat-down
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

describe('HexMapDocument features mutation', () => {
  test('getFeatures returns all features as typed array', () => {
    const doc = new HexMapDocument(SAMPLE_YAML_WITH_FEATURES);
    const features = doc.getFeatures();
    expect(features).toHaveLength(2);
    expect(features[0].at).toBe('@all');
    expect(features[1].terrain).toBe('forest');
  });

  test('deleteFeature removes feature at index', () => {
    const doc = new HexMapDocument(SAMPLE_YAML_WITH_FEATURES);
    const deleted = doc.deleteFeature(1);
    expect(deleted.terrain).toBe('forest');
    expect(doc.getFeatures()).toHaveLength(1);
    // Verify YAML round-trips correctly
    const reparsed = new HexMapDocument(doc.toString());
    expect(reparsed.getFeatures()).toHaveLength(1);
  });

  test('updateFeature merges partial changes', () => {
    const doc = new HexMapDocument(SAMPLE_YAML_WITH_FEATURES);
    doc.updateFeature(1, { label: 'Dark Forest', elevation: 3 });
    const features = doc.getFeatures();
    expect(features[1].label).toBe('Dark Forest');
    expect(features[1].elevation).toBe(3);
    expect(features[1].terrain).toBe('forest'); // unchanged fields preserved
  });

  test('reorderFeature moves feature from one index to another', () => {
    const doc = new HexMapDocument(SAMPLE_YAML_WITH_FEATURES);
    doc.reorderFeature(1, 0);
    const features = doc.getFeatures();
    expect(features[0].terrain).toBe('forest');
    expect(features[1].at).toBe('@all');
  });
});
