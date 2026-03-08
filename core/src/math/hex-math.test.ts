import { describe, it, expect } from 'vitest';
import * as Hex from './hex-math.js';

describe('Hex Math', () => {
    describe('hexToPixel & pixelToHex Round-trips', () => {
        const sizes = [1, 10, 25.5];
        const hexes: Hex.Cube[] = [
            { q: 0, r: 0, s: 0 },
            { q: 1, r: 0, s: -1 },
            { q: 0, r: 1, s: -1 },
            { q: -1, r: 2, s: -1 },
            { q: 5, r: -3, s: -2 }
        ];

        it('should round-trip for flat-top', () => {
            for (const size of sizes) {
                for (const hex of hexes) {
                    const pixel = Hex.hexToPixel(hex, size, 'flat');
                    const back = Hex.pixelToHex(pixel, size, 'flat');
                    expect(back.q).toBe(hex.q);
                    expect(back.r).toBe(hex.r);
                    expect(back.s).toBe(hex.s);
                }
            }
        });

        it('should round-trip for pointy-top', () => {
            for (const size of sizes) {
                for (const hex of hexes) {
                    const pixel = Hex.hexToPixel(hex, size, 'pointy');
                    const back = Hex.pixelToHex(pixel, size, 'pointy');
                    expect(back.q).toBe(hex.q);
                    expect(back.r).toBe(hex.r);
                    expect(back.s).toBe(hex.s);
                }
            }
        });
    });

    describe('hexCorners', () => {
        it('should return 6 corners at distance size from center for flat-top', () => {
            const center = { x: 10, y: 20 };
            const size = 5;
            const corners = Hex.hexCorners(center, size, 'flat');
            expect(corners).toHaveLength(6);
            for (const corner of corners) {
                const dist = Math.sqrt(Math.pow(corner.x - center.x, 2) + Math.pow(corner.y - center.y, 2));
                expect(dist).toBeCloseTo(size);
            }
            // First corner for flat-top should be at 0 degrees (East)
            expect(corners[0].x).toBeCloseTo(center.x + size);
            expect(corners[0].y).toBeCloseTo(center.y);
        });

        it('should return 6 corners at distance size from center for pointy-top', () => {
            const center = { x: 10, y: 20 };
            const size = 5;
            const corners = Hex.hexCorners(center, size, 'pointy');
            expect(corners).toHaveLength(6);
            for (const corner of corners) {
                const dist = Math.sqrt(Math.pow(corner.x - center.x, 2) + Math.pow(corner.y - center.y, 2));
                expect(dist).toBeCloseTo(size);
            }
            // First corner for pointy-top should be at 30 degrees
            expect(corners[0].x).toBeCloseTo(center.x + size * Math.cos(Math.PI / 6));
            expect(corners[0].y).toBeCloseTo(center.y + size * Math.sin(Math.PI / 6));
        });
    });

    describe('hexToPixel coordinates', () => {
        it('should match flat-top expected values', () => {
            const size = 10;
            // q=1, r=0 => x = 1.5 * 10 = 15, y = sqrt(3)/2 * 10 = 5 * sqrt(3) ~= 8.66
            const p = Hex.hexToPixel({ q: 1, r: 0, s: -1 }, size, 'flat');
            expect(p.x).toBeCloseTo(15);
            expect(p.y).toBeCloseTo(8.66025, 4);
        });

        it('should match pointy-top expected values', () => {
            const size = 10;
            // q=0, r=1 => x = sqrt(3)/2 * 10 = 5 * sqrt(3) ~= 8.66, y = 1.5 * 10 = 15
            const p = Hex.hexToPixel({ q: 0, r: 1, s: -1 }, size, 'pointy');
            expect(p.x).toBeCloseTo(8.66025, 4);
            expect(p.y).toBeCloseTo(15);
        });
    });

    describe('hexEdgeMidpoints', () => {
        it('should return 6 midpoints between corners', () => {
            const center = { x: 0, y: 0 };
            const size = 10;
            const corners = Hex.hexCorners(center, size, 'flat');
            const midpoints = Hex.hexEdgeMidpoints(center, size, 'flat');

            expect(midpoints).toHaveLength(6);
            for (let i = 0; i < 6; i++) {
                const c1 = corners[i];
                const c2 = corners[(i + 1) % 6];
                expect(midpoints[i].x).toBeCloseTo((c1.x + c2.x) / 2);
                expect(midpoints[i].y).toBeCloseTo((c1.y + c2.y) / 2);
            }
        });
    });

    describe('Orientation helpers', () => {
        it('maps flat-down correctly', () => {
            expect(Hex.orientationTop('flat-down')).toBe('flat');
            expect(Hex.orientationStagger('flat-down')).toBe(1);
            expect(Hex.defaultNudge('flat-down')).toBe(1);
        });

        it('maps flat-up correctly', () => {
            expect(Hex.orientationTop('flat-up')).toBe('flat');
            expect(Hex.orientationStagger('flat-up')).toBe(-1);
            expect(Hex.defaultNudge('flat-up')).toBe(-1);
        });

        it('maps pointy-right correctly', () => {
            expect(Hex.orientationTop('pointy-right')).toBe('pointy');
            expect(Hex.orientationStagger('pointy-right')).toBe(1);
            expect(Hex.defaultNudge('pointy-right')).toBe(1);
        });

        it('maps pointy-left correctly', () => {
            expect(Hex.orientationTop('pointy-left')).toBe('pointy');
            expect(Hex.orientationStagger('pointy-left')).toBe(-1);
            expect(Hex.defaultNudge('pointy-left')).toBe(-1);
        });
    });

    describe('hexLine with nudge', () => {
        it('exhibits reversal symmetry', () => {
            const a = { q: 0, r: 0, s: 0 };
            const b = { q: 1, r: -2, s: 1 };
            // hexLine(a, b, 1) should be same as hexLine(b, a, 1).reverse()
            const pathAB = Hex.hexLine(a, b, 1);
            const pathBA = Hex.hexLine(b, a, 1);
            expect(pathAB).toEqual([...pathBA].reverse());
        });

        it('produces different results for flipped nudge on ambiguous path', () => {
            const a = { q: 0, r: 0, s: 0 };
            const b = { q: 1, r: -2, s: 1 }; // Ambiguous point at t=0.5: (0.5, -1, 0.5)
            const path1 = Hex.hexLine(a, b, 1);
            const path2 = Hex.hexLine(a, b, -1);
            expect(path1).not.toEqual(path2);
            expect(path1).toHaveLength(3);
            expect(path2).toHaveLength(3);
        });

        it('produces same results regardless of nudge for non-ambiguous path', () => {
            const a = { q: 0, r: 0, s: 0 };
            const b = { q: 2, r: 0, s: -2 }; 
            const path1 = Hex.hexLine(a, b, 1);
            const path2 = Hex.hexLine(a, b, -1);
            expect(path1).toEqual(path2);
        });
    });

    describe('getCanonicalVertexId', () => {
        it('should be the same for all three hexes sharing the vertex', () => {
            const h1 = { q: 0, r: 0, s: 0 };
            const h2 = Hex.hexNeighbor(h1, 0); // corner 0 is between neighbors 0 and 1
            const h3 = Hex.hexNeighbor(h1, 1);

            // corner 0 of h1
            const id1 = Hex.getCanonicalVertexId(h1, 0);
            
            // corner 2 of h2 (neighbor 0) should be same vertex
            // Neighbors of h2: 0, 1, 2, 3, 4, 5
            // h1 is neighbor 3 of h2
            // Let's verify this more systematically.
            // A vertex is shared by hex, neighbor(i), neighbor((i+5)%6)
            // Let's just check that it's stable and uses the same IDs.
            const id1Again = Hex.getCanonicalVertexId(h1, 0);
            expect(id1).toBe(id1Again);

            const parts = id1.split('^');
            expect(parts).toHaveLength(3);
            expect(parts).toContain(Hex.hexId(h1));
            expect(parts).toContain(Hex.hexId(h2));
            expect(parts).toContain(Hex.hexId(h3));
            
            // Sort order check
            expect(parts).toEqual([...parts].sort());
        });

        it('should be stable across all 3 sharing hexes for flat-top corner 0', () => {
            const h1 = { q: 0, r: 0, s: 0 };
            const h2 = Hex.hexNeighbor(h1, 0); // NE neighbor (1, -1, 0)
            const h3 = Hex.hexNeighbor(h1, 1); // SE neighbor (1, 0, -1)
            
            // For flat-top corner 0 (East), the sharing hexes are:
            // h1 (0,0,0)
            // h2 (1,-1,0) -- neighbor at direction 0
            // h3 (1,0,-1) -- neighbor at direction 1
            
            const id1 = Hex.getCanonicalVertexId(h1, 0);
            
            // Find which corner of h2 and h3 this vertex is
            // h1 is neighbor 3 of h2. Vertex is corner 2 or 4 of h2? 
            // Manual check:
            // h1 (0,0,0) corner 0 is shared with h2 (dir 0) and h3 (dir 1).
            // Let's just check stability by trying all corners of neighbors.
            let id2, id3;
            for(let i=0; i<6; i++) {
                const id = Hex.getCanonicalVertexId(h2, i);
                if (id.includes(Hex.hexId(h1)) && id.includes(Hex.hexId(h3))) {
                    id2 = id;
                }
            }
            for(let i=0; i<6; i++) {
                const id = Hex.getCanonicalVertexId(h3, i);
                if (id.includes(Hex.hexId(h1)) && id.includes(Hex.hexId(h2))) {
                    id3 = id;
                }
            }
            
            expect(id1).toBe(id2);
            expect(id1).toBe(id3);
        });
    });

    describe('createRectangularGrid stagger parity', () => {
        it('should respect actual column values for stagger when firstCol is odd', () => {
            // Battle for Moscow uses: stagger: high (Even-Q), firstCol: 1
            // Even-Q rule: even columns are shifted down (r_offset = r + q/2)
            // If col=1 (odd), it should NOT be shifted down.
            // If col=2 (even), it SHOULD be shifted down.
            
            const cols = 2;
            const rows = 1;
            const firstCol = 1;
            const firstRow = 1;
            const orientation: Hex.Orientation = 'flat-up';
            
            const grid = Hex.createRectangularGrid(cols, rows, orientation, firstCol, firstRow);
            expect(grid).toHaveLength(2);
            
            // Hex 0101 (col=1, row=1)
            // RFC/Standard: col 1 is odd. 
            // In Even-Q, col 1 is high, col 2 is low.
            const h0101 = grid[0];
            const h0201 = grid[1];
            
            const p0101 = Hex.cubeToOffset(h0101, orientation);
            const p0201 = Hex.cubeToOffset(h0201, orientation);
            
            expect(p0101.x).toBe(1);
            expect(p0101.y).toBe(1);
            expect(p0201.x).toBe(2);
            expect(p0201.y).toBe(1);
        });

        it('round-trip raw offsets', () => {
            const orientation: Hex.Orientation = 'flat-up';
            for (let q = -10; q <= 10; q++) {
                for (let r = -10; r <= 10; r++) {
                    const cube = Hex.offsetToCube(q, r, orientation);
                    const back = Hex.cubeToOffset(cube, orientation);
                    expect(back.x).toBe(q);
                    expect(back.y).toBe(r);
                }
            }
        });
    });
});
