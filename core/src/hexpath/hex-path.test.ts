import { describe, it, expect, beforeEach } from 'vitest';
import { HexMesh } from '../mesh/hex-mesh.js';
import * as Hex from '../math/hex-math.js';
import { HexPath } from './hex-path.js';

describe('HexPath RFC Compliance', () => {
    let mesh: HexMesh;
    let hexPath: HexPath;

    beforeEach(() => {
        // 10x10 rectangular grid, stagger low (Odd-Q)
        // Red Blob Games Odd-Q (Stagger.Odd): 
        // col 0 (even) is high
        // col 1 (odd) is low
        const grid = Hex.createRectangularGrid(10, 10, Hex.Stagger.Odd);
        mesh = new HexMesh(grid);
        hexPath = new HexPath(mesh);
    });

    describe('Type Inference', () => {
        it('should infer HEX from absolute coordinate', () => {
            const result = hexPath.resolve('0101');
            expect(result.type).toBe('hex');
            expect(result.items).toContain('0,0,0');
        });

        it('should infer EDGE from slash notation', () => {
            const result = hexPath.resolve('0101/N');
            expect(result.type).toBe('edge');
            // Canonical edge ID format: "A,B,C|D,E,F" or "A,B,C|VOID|dir"
            expect(result.items[0]).toContain('|');
        });

        it('should infer VERTEX from dot notation', () => {
            const result = hexPath.resolve('0101.N');
            expect(result.type).toBe('vertex');
            expect(result.items[0]).toContain('^');
        });

        it('should throw error on mixed types', () => {
            // Hex and Edge mixed
            expect(() => hexPath.resolve('0101 0101/N')).toThrow(/Inconsistent geometry type/);
        });
    });

    describe('Floating Anchors', () => {
        it('should resolve relative steps before an absolute anchor', () => {
            // 1n 0101
            // If 0101 is anchor, 1n before it means the segment started 1 step south of 0101.
            // North neighbor of X is 0101, so X is south neighbor of 0101.
            // South neighbor (dir 2 or 3) of 0101 (0,0,0) in Odd-Q
            const result = hexPath.resolve('1n 0101');
            expect(result.items).toContain('0,0,0'); // 0101
            // North neighbor of (0,1,-1) is (0,0,0). So (0,1,-1) is 1n before (0,0,0).
            expect(result.items).toContain('0,1,-1'); // 0102
        });
    });

    describe('Operators', () => {
        it('should support Jump (comma)', () => {
            const result = hexPath.resolve('0101, 0103');
            expect(result.items).toHaveLength(2);
            expect(result.items).toContain(Hex.hexId(Hex.offsetToCube(0, 0))); // 0101
            expect(result.items).toContain(Hex.hexId(Hex.offsetToCube(0, 2))); // 0103
        });

        it('should support Include (+) and Exclude (-) modes', () => {
            // Path from 0101 to 0103 is [0101, 0102, 0103]
            // We subtract 0102
            const result = hexPath.resolve('0101 0103 - 0102');
            expect(result.items).toContain(Hex.hexId(Hex.offsetToCube(0, 0)));
            expect(result.items).toContain(Hex.hexId(Hex.offsetToCube(0, 2)));
            expect(result.items).not.toContain(Hex.hexId(Hex.offsetToCube(0, 1)));
        });

        it('should support Close (semicolon)', () => {
            // Triangle: 0101 -> 0102 -> 0202 -> 0101
            const result = hexPath.resolve('0101 0102 0202 ;');
            expect(result.items).toContain(Hex.hexId(Hex.offsetToCube(0, 0)));
            expect(result.items).toContain(Hex.hexId(Hex.offsetToCube(0, 1)));
            expect(result.items).toContain(Hex.hexId(Hex.offsetToCube(1, 1)));
        });

        it('should support Fill (!) operator for HEX collections', () => {
            // Center of 3x3 (0101..0303) is 0202
            const result3x3 = hexPath.resolve('0101 0301 0303 0103 !');
            const centerHex = Hex.hexId(Hex.offsetToCube(1, 1)); // 0202
            expect(result3x3.items).toContain(centerHex);
        });

        it('should support Modal Exclude (-) for fill', () => {
            // Fill 3x3, then subtract a 2x2 area inside it
            // 0101..0303 fill (+)
            // 0101..0202 fill (-)
            const result = hexPath.resolve('0101 0301 0303 0103 ! - 0101 0201 0202 0102 !');
            const centerHex = Hex.hexId(Hex.offsetToCube(1, 1)); // 0202
            expect(result.items).not.toContain(centerHex);
            expect(result.items).toContain(Hex.hexId(Hex.offsetToCube(2, 2))); // 0303
        });
    });

    describe('References', () => {
        it('should support @all identifier', () => {
            const result = hexPath.resolve('@all');
            expect(result.items).toHaveLength(100);
        });
    });
});
