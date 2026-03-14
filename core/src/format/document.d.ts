import { Document } from 'yaml';
import type { HexMapLayout, HexMapMetadata, Feature } from './types.js';
/**
 * A wrapper around the YAML CST/AST to allow safe editing of HexMap documents
 * while preserving comments and structure.
 */
export declare class HexMapDocument {
    private doc;
    constructor(source: string);
    /**
     * Get the raw YAML document for direct manipulation if needed.
     */
    get raw(): Document;
    /**
     * Return the stringified YAML, preserving implementation details.
     */
    toString(): string;
    /**
     * Helper to set a metadata field safely.
     */
    setMetadata<K extends keyof HexMapMetadata>(key: K, value: HexMapMetadata[K]): void;
    /**
     * Helper to get all metadata fields.
     */
    getMetadata(): HexMapMetadata;
    /**
     * Set a layout field safely.
     */
    setLayout<K extends keyof HexMapLayout>(key: K, value: HexMapLayout[K]): void;
    /**
     * Get the layout configuration.
     */
    getLayout(): HexMapLayout;
    /**
     * Add a feature to the document.
     */
    addFeature(feature: Feature): void;
    /**
     * Return a plain JavaScript object representing the document.
     */
    toJS(): any;
}
