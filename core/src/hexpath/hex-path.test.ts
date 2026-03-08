import { describe, it, expect, beforeEach } from 'vitest';
import { HexMesh } from '../mesh/hex-mesh.js';
import * as Hex from '../math/hex-math.js';
import { HexPath } from './hex-path.js';

describe('HexPath RFC Compliance', () => {
    let mesh: HexMesh;
    let hexPath: HexPath;

    beforeEach(() => {
        // 10x10 rectangular grid, stagger low (Odd-Q), firstCol: 0, firstRow: 0
        const grid = Hex.createRectangularGrid(10, 10, Hex.Stagger.Odd, 0, 0);
        mesh = new HexMesh(grid, { layout: { stagger: 'low', coordinates: { first: [0, 0] } } });
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
            expect(result.items).toContain(Hex.hexId(Hex.offsetToCube(1, 1, Hex.Stagger.Odd))); 
            expect(result.items).toContain(Hex.hexId(Hex.offsetToCube(1, 3, Hex.Stagger.Odd)));
        });

        it('should support Include (+) and Exclude (-) modes', () => {
            const result = hexPath.resolve('0101 0103 - 0102');
            expect(result.items).toContain(Hex.hexId(Hex.offsetToCube(1, 1, Hex.Stagger.Odd)));
            expect(result.items).toContain(Hex.hexId(Hex.offsetToCube(1, 3, Hex.Stagger.Odd)));
            expect(result.items).not.toContain(Hex.hexId(Hex.offsetToCube(1, 2, Hex.Stagger.Odd)));
        });

        it('should support Close (semicolon)', () => {
            const result = hexPath.resolve('0101 0102 0202 ;');
            expect(result.items).toContain(Hex.hexId(Hex.offsetToCube(1, 1, Hex.Stagger.Odd)));
            expect(result.items).toContain(Hex.hexId(Hex.offsetToCube(1, 2, Hex.Stagger.Odd)));
            expect(result.items).toContain(Hex.hexId(Hex.offsetToCube(2, 2, Hex.Stagger.Odd)));
        });

        it('should support Fill (!) operator for HEX collections', () => {
            const result3x3 = hexPath.resolve('0101 0301 0303 0103 !');
            const centerHex = Hex.hexId(Hex.offsetToCube(2, 2, Hex.Stagger.Odd)); 
            expect(result3x3.items).toContain(centerHex);
        });

        it('should support Modal Exclude (-) for fill', () => {
            const result = hexPath.resolve('0101 0301 0303 0103 ! - 0101 0201 0202 0102 !');
            const centerHex = Hex.hexId(Hex.offsetToCube(2, 2, Hex.Stagger.Odd));
            expect(result.items).not.toContain(centerHex);
            expect(result.items).toContain(Hex.hexId(Hex.offsetToCube(3, 3, Hex.Stagger.Odd)));
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
            const centerHex = Hex.hexId(Hex.offsetToCube(2, 2, Hex.Stagger.Odd));
            expect(result.items).toContain(centerHex);
        });

        it('should fill correctly for pointy-top', () => {
            const pointyMesh = new HexMesh(Hex.createRectangularGrid(10, 10, Hex.Stagger.Odd, 0, 0), { layout: { hex_top: 'pointy', stagger: 'low', coordinates: { first: [0, 0] } } });
            const pointyPath = new HexPath(pointyMesh);
            const result = pointyPath.resolve('0101 0301 0303 0103 !');
            const centerHex = Hex.hexId(Hex.offsetToCube(2, 2, Hex.Stagger.Odd));
            expect(result.items).toContain(centerHex);
        });
    });
});
