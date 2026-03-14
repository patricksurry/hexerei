import { parseDocument } from 'yaml';
/**
 * A wrapper around the YAML CST/AST to allow safe editing of HexMap documents
 * while preserving comments and structure.
 */
export class HexMapDocument {
    doc;
    constructor(source) {
        this.doc = parseDocument(source);
        // TODO: Add schema validation hook here
    }
    /**
     * Get the raw YAML document for direct manipulation if needed.
     */
    get raw() {
        return this.doc;
    }
    /**
     * Return the stringified YAML, preserving implementation details.
     */
    toString() {
        return this.doc.toString();
    }
    /**
     * Helper to set a metadata field safely.
     */
    setMetadata(key, value) {
        if (!this.doc.has('metadata')) {
            this.doc.set('metadata', this.doc.createNode({}));
        }
        // direct set on the document path handles the node wrapping
        this.doc.setIn(['metadata', key], value);
    }
    /**
     * Helper to get all metadata fields.
     */
    getMetadata() {
        const metadataNode = this.doc.get('metadata');
        return metadataNode?.toJSON?.() || {};
    }
    /**
     * Set a layout field safely.
     */
    setLayout(key, value) {
        if (!this.doc.has('layout')) {
            this.doc.set('layout', this.doc.createNode({}));
        }
        this.doc.setIn(['layout', key], value);
    }
    /**
     * Get the layout configuration.
     */
    getLayout() {
        const layoutNode = this.doc.get('layout');
        return layoutNode?.toJSON?.() || { orientation: 'flat-down', all: 'base' };
    }
    /**
     * Add a feature to the document.
     */
    addFeature(feature) {
        if (!this.doc.has('features')) {
            this.doc.set('features', this.doc.createNode([]));
        }
        this.doc.addIn(['features'], feature);
    }
    /**
     * Return a plain JavaScript object representing the document.
     */
    toJS() {
        return this.doc.toJS();
    }
}
