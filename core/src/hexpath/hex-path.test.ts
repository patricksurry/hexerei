import { describe, it, expect, beforeEach } from 'vitest';
import { HexMesh } from '../mesh/hex-mesh.js';
import * as Hex from '../math/hex-math.js';
import { HexPath } from './hex-path.js';

describe('HexPath RFC Compliance', () => {
    let mesh: HexMesh;
    let hexPath: HexPath;

    beforeEach(() => {
        // 10x10 rectangular grid, orientation: flat-down, firstCol: 0, firstRow: 0
        const grid = Hex.createRectangularGrid(10, 10, 'flat-down', 0, 0);
        mesh = new HexMesh(grid, { layout: { orientation: 'flat-down', coordinates: { first: [0, 0] } } });
        hexPath = new HexPath(mesh);
    });

    describe('Type Inference', () => {
        it('should infer HEX from absolute coordinate', () => {
            const result = hexPath.resolve('0101');
            expect(result.type).toBe('hex');
            // CCRR 0101 with firstCol:0, firstRow:0 => col 1, row 1
            // offsetToCube(1, 1, Odd-Q) => q=1, r = 1 - (1-1)/2 = 1 => 1,1,-2
            expect(result.items).toContain('1,1,-2');
        });

        it('should infer EDGE from slash notation', () => {
            const result = hexPath.resolve('0101/N');
            expect(result.type).toBe('edge');
            expect(result.items[0]).toContain('|');
        });

        it('should infer VERTEX from dot notation', () => {
            const result = hexPath.resolve('0101.N');
            expect(result.type).toBe('vertex');
            expect(result.items[0]).toContain('^');
        });

        it('should throw error on mixed types', () => {
            expect(() => hexPath.resolve('0101 0101/N')).toThrow(/Inconsistent geometry type/);
        });
    });

    describe('Floating Anchors', () => {
        it('should resolve relative steps before an absolute anchor', () => {
            // 1n 0101
            // 0101 is col 1, row 1 => 1,1,-2
            // 1n (North) BEFORE 0101 means we started at 0102 and went North to 0101.
            // 0102 is col 1, row 2 => offsetToCube(1, 2, Odd-Q) => q=1, r=2-(1-1)/2 = 2 => 1,2,-3
            const result = hexPath.resolve('1n 0101');
            expect(result.items).toContain('1,1,-2'); // 0101
            expect(result.items).toContain('1,2,-3'); // 0102
        });
    });

    describe('Operators', () => {
        it('should support Jump (comma)', () => {
            const result = hexPath.resolve('0101, 0103');
            expect(result.items).toHaveLength(2);
            expect(result.items).toContain(Hex.hexId(Hex.offsetToCube(1, 1, 'flat-down'))); 
            expect(result.items).toContain(Hex.hexId(Hex.offsetToCube(1, 3, 'flat-down')));
        });

        it('should support Include (+) and Exclude (-) modes', () => {
            const result = hexPath.resolve('0101 0103 - 0102');
            expect(result.items).toContain(Hex.hexId(Hex.offsetToCube(1, 1, 'flat-down')));
            expect(result.items).toContain(Hex.hexId(Hex.offsetToCube(1, 3, 'flat-down')));
            expect(result.items).not.toContain(Hex.hexId(Hex.offsetToCube(1, 2, 'flat-down')));
        });

        it('should support Close (semicolon)', () => {
            const result = hexPath.resolve('0101 0102 0202 ;');
            expect(result.items).toContain(Hex.hexId(Hex.offsetToCube(1, 1, 'flat-down')));
            expect(result.items).toContain(Hex.hexId(Hex.offsetToCube(1, 2, 'flat-down')));
            expect(result.items).toContain(Hex.hexId(Hex.offsetToCube(2, 2, 'flat-down')));
        });

        it('should support Fill (!) operator for HEX collections', () => {
            const result3x3 = hexPath.resolve('0101 0301 0303 0103 !');
            const centerHex = Hex.hexId(Hex.offsetToCube(2, 2, 'flat-down')); 
            expect(result3x3.items).toContain(centerHex);
        });

        it('should support Modal Exclude (-) for fill', () => {
            const result = hexPath.resolve('0101 0301 0303 0103 ! - 0101 0201 0202 0102 !');
            const centerHex = Hex.hexId(Hex.offsetToCube(2, 2, 'flat-down'));
            expect(result.items).not.toContain(centerHex);
            expect(result.items).toContain(Hex.hexId(Hex.offsetToCube(3, 3, 'flat-down')));
        });
    });

    describe('References', () => {
        it('should support @all identifier', () => {
            const result = hexPath.resolve('@all');
            expect(result.items).toHaveLength(100);
        });
    });

    describe('Orientation', () => {
        it('should fill correctly for flat-top (default)', () => {
            const result = hexPath.resolve('0101 0301 0303 0103 !');
            const centerHex = Hex.hexId(Hex.offsetToCube(2, 2, 'flat-down'));
            expect(result.items).toContain(centerHex);
        });

        it('should fill correctly for pointy-top', () => {
            const pointyMesh = new HexMesh(Hex.createRectangularGrid(10, 10, 'pointy-right', 0, 0), { layout: { orientation: 'pointy-right', coordinates: { first: [0, 0] } } });
            const pointyPath = new HexPath(pointyMesh);
            const result = pointyPath.resolve('0101 0301 0303 0103 !');
            const centerHex = Hex.hexId(Hex.offsetToCube(2, 2, 'pointy-right'));
            expect(result.items).toContain(centerHex);
        });
    });

    describe('direction validation', () => {
        it('rejects E/W on flat-top', () => {
            expect(() => hexPath.resolve('0101 1e')).toThrow(/invalid direction/i);
            expect(() => hexPath.resolve('0101 1w')).toThrow(/invalid direction/i);
        });
        it('rejects N/S on pointy-top', () => {
            const pointyMesh = new HexMesh(Hex.createRectangularGrid(10, 10, 'pointy-right', 0, 0), { layout: { orientation: 'pointy-right' } });
            const pointyPath = new HexPath(pointyMesh);
            expect(() => pointyPath.resolve('0101 1n')).toThrow(/invalid direction/i);
            expect(() => pointyPath.resolve('0101 1s')).toThrow(/invalid direction/i);
        });
    });

    describe('~ nudge operator', () => {
        it('should resolve differently than default nudge on ambiguous paths', () => {
            // 0,0,0 to 1,1,-2
            const resultDefault = hexPath.resolve('0000 0101');
            const resultFlipped = hexPath.resolve('0000 ~0101');
            
            expect(resultDefault.items).not.toEqual(resultFlipped.items);
            expect(resultDefault.items).toHaveLength(3);
            expect(resultFlipped.items).toHaveLength(3);
        });

        it('should exhibit reversal symmetry with flipped nudge', () => {
            // hexLine(a, b, nudge) == reverse(hexLine(b, a, nudge))
            // So a ~b should be reverse of b ~a
            const pathAB = hexPath.resolve('0000 ~0102');
            const pathBA = hexPath.resolve('0102 ~0000');
            expect(pathAB.items).toEqual([...pathBA.items].reverse());
        });

        it('should have no effect on first coordinate', () => {
            const result1 = hexPath.resolve('~0000 0102');
            const result2 = hexPath.resolve('0000 0102');
            expect(result1.items).toEqual(result2.items);
        });

        it('should have no effect on non-ambiguous paths', () => {
            // 0,0,0 to 2,0,-2
            const result1 = hexPath.resolve('0000 0201');
            const result2 = hexPath.resolve('0000 ~0201');
            expect(result1.items).toEqual(result2.items);
        });
    });

    describe('* step disambiguation', () => {
        it('should parse 3*s as 3 steps south', () => {
            const result = hexPath.resolve('0000 3*s');
            // 0,0,0 -> 0,1,-1 -> 0,2,-2 -> 0,3,-3
            expect(result.items).toHaveLength(4);
            expect(result.items).toContain(Hex.hexId({q:0, r:3, s:-3}));
        });
    });
});
