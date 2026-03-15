import { parseDocument, Document } from 'yaml';
import type { HexMapLayout, HexMapMetadata, Feature, TerrainVocabulary, TerrainTypeDef } from './types.js';

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
        if (value === undefined || value === null) {
            // Delete the key rather than storing null/undefined
            if (this.doc.hasIn(['metadata', key])) {
                this.doc.deleteIn(['metadata', key]);
            }
            return;
        }
        if (!this.doc.has('metadata')) {
            this.doc.set('metadata', this.doc.createNode({}));
        }
        this.doc.setIn(['metadata', key], value);
    }

    /**
     * Helper to get all metadata fields.
     */
    getMetadata(): HexMapMetadata {
        const metadataNode = this.doc.get('metadata') as any;
        const raw = metadataNode?.toJSON?.() || {};
        // Normalize YAML nulls to undefined so callers don't need to handle both
        for (const key of Object.keys(raw)) {
            if (raw[key] === null) raw[key] = undefined;
        }
        return raw;
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
     * Get all features as a typed array.
     */
    getFeatures(): Feature[] {
        const featuresNode = this.doc.get('features');
        if (!featuresNode) return [];
        return (featuresNode as any).toJSON() as Feature[];
    }

    /**
     * Delete a feature by index. Returns the deleted feature.
     */
    deleteFeature(index: number): Feature {
        const features = this.getFeatures();
        if (index < 0 || index >= features.length) {
            throw new RangeError(`Feature index ${index} out of bounds (${features.length} features)`);
        }
        const deleted = features[index];
        this.doc.deleteIn(['features', index]);
        return deleted;
    }

    /**
     * Update a feature by index with partial changes.
     */
    updateFeature(index: number, changes: Partial<Feature>): void {
        const features = this.getFeatures();
        if (index < 0 || index >= features.length) {
            throw new RangeError(`Feature index ${index} out of bounds (${features.length} features)`);
        }
        for (const [key, value] of Object.entries(changes)) {
            if (value === undefined) {
                this.doc.deleteIn(['features', index, key]);
            } else {
                this.doc.setIn(['features', index, key], value);
            }
        }
    }

    /**
     * Reorder a feature from one index to another.
     */
    reorderFeature(fromIndex: number, toIndex: number): void {
        const features = this.getFeatures();
        if (fromIndex < 0 || fromIndex >= features.length || toIndex < 0 || toIndex >= features.length) {
            throw new RangeError(`Feature index out of bounds: from=${fromIndex}, to=${toIndex} (${features.length} features)`);
        }
        if (fromIndex === toIndex) return;
        const feature = this.deleteFeature(fromIndex);
        // toIndex is the target position in the resulting array (no adjustment needed)
        const adjustedTo = toIndex;
        // Re-insert at the target position
        const featuresSeq = this.doc.get('features') as any;
        featuresSeq.items.splice(adjustedTo, 0, this.doc.createNode(feature));
    }

    /**
     * Get the full terrain vocabulary.
     */
    getTerrain(): TerrainVocabulary {
        const terrainNode = this.doc.get('terrain');
        if (!terrainNode) return {};
        return (terrainNode as any).toJSON() as TerrainVocabulary;
    }

    /**
     * Set (add or update) a terrain type definition.
     */
    setTerrainType(geometry: 'hex' | 'edge' | 'vertex', key: string, def: TerrainTypeDef): void {
        if (!this.doc.has('terrain')) {
            this.doc.set('terrain', this.doc.createNode({}));
        }
        if (!this.doc.hasIn(['terrain', geometry])) {
            this.doc.setIn(['terrain', geometry], this.doc.createNode({}));
        }
        this.doc.setIn(['terrain', geometry, key], def);
    }

    /**
     * Delete a terrain type definition.
     */
    deleteTerrainType(geometry: 'hex' | 'edge' | 'vertex', key: string): void {
        if (this.doc.hasIn(['terrain', geometry, key])) {
            this.doc.deleteIn(['terrain', geometry, key]);
        }
    }

    /**
     * Return a plain JavaScript object representing the document.
     */
    toJS(): any {
        return this.doc.toJS();
    }
}
