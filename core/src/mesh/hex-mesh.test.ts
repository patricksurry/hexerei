import { describe, it, expect } from 'vitest';
import { HexMesh } from './hex-mesh.js';
import * as Hex from '../math/hex-math.js';

describe('HexMesh Topology', () => {
    // Create a simple map with 2 adjacent hexes: 0,0,0 and 1,-1,0 (Direction 0 from center)
    const center = Hex.createHex(0, 0, 0);
    const neighbor = Hex.hexNeighbor(center, 0); // 1, -1, 0
    // And one non-adjacent
    const far = Hex.createHex(0, 2, -2);

    // Grid with 3 hexes
    const mesh = new HexMesh([center, neighbor, far]);

    const areaCenter = mesh.getArea(Hex.hexId(center))!;
    const areaNeighbor = mesh.getArea(Hex.hexId(neighbor))!;
    const areaFar = mesh.getArea(Hex.hexId(far))!;

    it('should identify areas correctly', () => {
        expect(areaCenter).toBeDefined();
        expect(areaNeighbor).toBeDefined();
        expect(areaFar).toBeDefined();
        expect(mesh.getArea("100,100,-200")).toBeUndefined();
    });

    it('should find correct neighbors', () => {
        const neighbors = mesh.getNeighbors(areaCenter);
        expect(neighbors).toHaveLength(1);
        expect(neighbors[0].id).toBe(areaNeighbor.id);

        const farNeighbors = mesh.getNeighbors(areaFar);
        expect(farNeighbors).toHaveLength(0);
    });

    it('should share a canonical boundary between neighbors', () => {
        const conn1 = mesh.getConnection(areaCenter, areaNeighbor);
        const conn2 = mesh.getConnection(areaNeighbor, areaCenter);

        expect(conn1).toBeDefined();
        expect(conn2).toBeDefined();
        // Check identity
        expect(conn1!.boundary).toBe(conn2!.boundary);
        expect(conn1!.boundary.id).toBe(conn2!.boundary.id);
    });

    it('should generate boundary loops including void edges', () => {
        const loop = mesh.getBoundaryLoop(areaCenter);
        expect(loop).toHaveLength(6);

        // One boundary should be the shared one with neighbor
        const shared = mesh.getConnection(areaCenter, areaNeighbor)!.boundary;
        expect(loop).toContain(shared);

        // The other 5 should be VOID boundaries
        const voids = loop.filter(b => b.areas[1] === null);
        expect(voids).toHaveLength(5);
    });

    it('should ensure void boundaries are unique per direction', () => {
        const loop = mesh.getBoundaryLoop(areaCenter);
        const ids = new Set(loop.map(b => b.id));
        expect(ids.size).toBe(6);
    });
});
