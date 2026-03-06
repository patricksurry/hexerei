import { describe, it, expect } from 'vitest';
import { HexMapDocument } from './document.js';

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
        doc.setMetadata('author', 'Me');
        expect(doc.toString()).toContain('author: Me');
    });
});
