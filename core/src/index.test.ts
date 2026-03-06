import { describe, it, expect } from 'vitest';
import { HexMapLoader, HexMapDocument, HexMesh, Hex } from './index.js';

describe('Index Exports', () => {
    it('should export HexMapLoader', () => {
        expect(HexMapLoader).toBeDefined();
        expect(typeof HexMapLoader.load).toBe('function');
    });

    it('should export HexMapDocument', () => {
        expect(HexMapDocument).toBeDefined();
    });

    it('should export HexMesh', () => {
        expect(HexMesh).toBeDefined();
    });

    it('should export Hex (math)', () => {
        expect(Hex).toBeDefined();
        expect(typeof Hex.createRectangularGrid).toBe('function');
    });
});
