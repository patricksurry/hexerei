import { describe, it, test, expect } from 'vitest';
import { HexMesh } from './hex-mesh.js';
import type { HexMapLayout } from '../format/types.js';
import * as Hex from '../math/hex-math.js';

describe('HexMesh Topology', () => {
  // Create a simple map with 2 adjacent hexes: 0,0,0 and 1,-1,0 (Direction 0 from center)
  const center = Hex.createHex(0, 0, 0);
  const neighbor = Hex.hexNeighbor(center, 0); // 1, -1, 0
  // And one non-adjacent
  const far = Hex.createHex(0, 2, -2);

  // Grid with 3 hexes
  const mesh = new HexMesh([center, neighbor, far]);

  const hexCenter = mesh.getHex(Hex.hexId(center))!;
  const hexNeighbor = mesh.getHex(Hex.hexId(neighbor))!;
  const hexFar = mesh.getHex(Hex.hexId(far))!;

  it('should identify hexes correctly', () => {
    expect(hexCenter).toBeDefined();
    expect(hexNeighbor).toBeDefined();
    expect(hexFar).toBeDefined();
    expect(mesh.getHex('100,100,-200')).toBeUndefined();
  });

  it('should find correct neighbors', () => {
    const neighbors = mesh.getNeighbors(hexCenter);
    expect(neighbors).toHaveLength(1);
    expect(neighbors[0].id).toBe(hexNeighbor.id);

    const farNeighbors = mesh.getNeighbors(hexFar);
    expect(farNeighbors).toHaveLength(0);
  });

  it('should share a canonical edge between neighbors', () => {
    const conn1 = mesh.getConnection(hexCenter, hexNeighbor);
    const conn2 = mesh.getConnection(hexNeighbor, hexCenter);

    expect(conn1).toBeDefined();
    expect(conn2).toBeDefined();
    // Check identity
    expect(conn1!.edge).toBe(conn2!.edge);
    expect(conn1!.edge.id).toBe(conn2!.edge.id);
  });

  it('should generate edge loops including void edges', () => {
    const loop = mesh.getEdgeLoop(hexCenter);
    expect(loop).toHaveLength(6);

    // One edge should be the shared one with neighbor
    const shared = mesh.getConnection(hexCenter, hexNeighbor)!.edge;
    expect(loop).toContain(shared);

    // The other 5 should be VOID edges
    const voids = loop.filter((e) => e.hexes[1] === null);
    expect(voids).toHaveLength(5);
  });

  it('should ensure void edges are unique per direction', () => {
    const loop = mesh.getEdgeLoop(hexCenter);
    const ids = new Set(loop.map((e) => e.id));
    expect(ids.size).toBe(6);
  });
});

test('HexMesh uses HexMapLayout in config', () => {
  const layout: HexMapLayout = { orientation: 'flat-down', all: 'base' };
  const mesh = new HexMesh([], { layout });
  expect(mesh.layout.all).toBe('base');
});
