import { parseDocument, Document, YAMLMap } from 'yaml';

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
    setMetadata(key: string, value: any) {
        if (!this.doc.has('metadata')) {
            this.doc.set('metadata', this.doc.createNode({}));
        }
        // direct set on the document path handles the node wrapping
        this.doc.setIn(['metadata', key], value);
    }

    /**
     * Helper to get a metadata field.
     */
    getMetadata(key: string): any {
        const metadata = this.doc.get('metadata') as YAMLMap;
        return metadata?.get(key);
    }

    /**
     * Set a layout field safely.
     */
    setLayout(key: string, value: any) {
        if (!this.doc.has('layout')) {
            this.doc.set('layout', this.doc.createNode({}));
        }
        this.doc.setIn(['layout', key], value);
    }

    /**
     * Add a feature to the document.
     */
    addFeature(feature: any) {
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
