import { describe, it, expect, beforeEach } from 'vitest';
import { HexMesh } from '../mesh/hex-mesh.js';
import * as Hex from '../math/hex-math.js';
import { HexPath } from './hex-path.js';

describe('HexPath DSL', () => {
    let mesh: HexMesh;
    let hexPath: HexPath;

    beforeEach(() => {
        const grid = Hex.createRectangularGrid(10, 10, Hex.Stagger.Odd);
        mesh = new HexMesh(grid);
        hexPath = new HexPath(mesh);
    });

    describe('Flat List & Connectivity', () => {
        it('should return a flat list of items with links', () => {
            const result = hexPath.resolve('0101 0102');
            // Path: 0101 -> 0102
            expect(result.items).toHaveLength(2);
            expect(result.items[0].id).toBe('0,0,0');
            expect(result.items[0].next).toBe('0,1,-1');
            expect(result.items[1].id).toBe('0,1,-1');
            expect(result.items[1].prev).toBe('0,0,0');
        });

        it('should handle Jumps (comma) by breaking links', () => {
            const result = hexPath.resolve('0101, 0103');
            expect(result.items).toHaveLength(2);
            expect(result.items[0].next).toBeUndefined();
            expect(result.items[1].prev).toBeUndefined();
        });

        it('should close loops with links between first and last', () => {
            const result = hexPath.resolve('0101 0102 0202 ;');
            const first = result.items.find(i => i.id === '0,0,0')!;
            const last = result.items[result.items.length - 1];
            
            expect(first.prev).toBeDefined();
            expect(last.next).toBe(first.id);
            expect(first.prev).toBe(last.id);
        });

        it('should treat filled items as singletons (no links)', () => {
            const result = hexPath.resolve('0101 0301 0103 !');
            // Mock fill returns 1,-1,0
            const filled = result.items.find(i => i.id === '1,-1,0')!;
            expect(filled.next).toBeUndefined();
            expect(filled.prev).toBeUndefined();
        });
    });

    describe('Label Formats', () => {
        it('should support A1 format', () => {
            const result = hexPath.resolve('a1');
            expect(result.items[0].id).toBe('0,0,0');
        });

        it('should support @all reference', () => {
            const result = hexPath.resolve('@all');
            expect(result.items).toHaveLength(100);
            expect(result.items[0].next).toBeUndefined(); // All items are singletons in @all
        });
    });
});
