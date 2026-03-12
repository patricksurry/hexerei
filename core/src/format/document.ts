import { parseDocument, Document } from 'yaml';
import type { HexMapLayout, HexMapMetadata, Feature } from './types.js';

/**
 * A wrapper around the YAML CST/AST to allow safe editing of HexMap documents
 * while preserving comments and structure.
 */
export class HexMapDocument {
    private doc: Document;

    constructor(source: string) {
        this.doc = parseDocument(source);
        // TODO: Add schema validation hook here
    }

    /**
     * Get the raw YAML document for direct manipulation if needed.
     */
    get raw(): Document {
        return this.doc;
    }

    /**
     * Return the stringified YAML, preserving implementation details.
     */
    toString(): string {
        return this.doc.toString();
    }

    /**
     * Helper to set a metadata field safely.
     */
    setMetadata<K extends keyof HexMapMetadata>(key: K, value: HexMapMetadata[K]): void {
        if (!this.doc.has('metadata')) {
            this.doc.set('metadata', this.doc.createNode({}));
        }
        // direct set on the document path handles the node wrapping
        this.doc.setIn(['metadata', key], value);
    }

    /**
     * Helper to get all metadata fields.
     */
    getMetadata(): HexMapMetadata {
        const metadataNode = this.doc.get('metadata') as any;
        return metadataNode?.toJSON?.() || {};
    }

    /**
     * Set a layout field safely.
     */
    setLayout<K extends keyof HexMapLayout>(key: K, value: HexMapLayout[K]): void {
        if (!this.doc.has('layout')) {
            this.doc.set('layout', this.doc.createNode({}));
        }
        this.doc.setIn(['layout', key], value);
    }

    /**
     * Get the layout configuration.
     */
    getLayout(): HexMapLayout {
        const layoutNode = this.doc.get('layout') as any;
        return layoutNode?.toJSON?.() || { orientation: 'flat-down', all: 'base' };
    }

    /**
     * Add a feature to the document.
     */
    addFeature(feature: Feature): void {
        if (!this.doc.has('features')) {
            this.doc.set('features', this.doc.createNode([]));
        }
        this.doc.addIn(['features'], feature);
    }

    /**
     * Return a plain JavaScript object representing the document.
     */
    toJS(): any {
        return this.doc.toJS();
    }
}
