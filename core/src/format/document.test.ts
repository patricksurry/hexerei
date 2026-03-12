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
