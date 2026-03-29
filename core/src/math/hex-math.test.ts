import { describe, expect, it } from 'vitest';
import * as Hex from './hex-math.js';
import {
  createHex,
  edgeEndpoints,
  formatHexLabel,
  hexId,
  parseBoundaryId,
  parseHexLabel,
  parseVertexId,
  vertexPoint,
} from './hex-math.js';

describe('Hex Math', () => {
  describe('Edge and Vertex Geometry', () => {
    it('edgeEndpoints and vertexPoint math helpers', () => {
      const c = createHex(0, 0, 0);
      const pts = edgeEndpoints(c, 0, 10, 'flat');
      expect(pts.length).toBe(2);

      const v = vertexPoint(c, 0, 10, 'flat');
      expect(v.x).toBeDefined();
    });
  });

  describe('Label Formatting', () => {
    it('XXYY format with first=[1,1]', () => {
      const hex = createHex(0, 0, 0);
      expect(formatHexLabel(hex, 'XXYY', 'flat-down', 1, 1)).toBe('0101');
    });

    it('XXYY format with first=[0,0] (default)', () => {
      const hex = createHex(0, 0, 0);
      expect(formatHexLabel(hex, 'XXYY', 'flat-down', 0, 0)).toBe('0000');
      expect(formatHexLabel(hex, 'XXYY', 'flat-down')).toBe('0000');
    });

    it('XX.YY format', () => {
      const hex = createHex(0, 0, 0);
      expect(formatHexLabel(hex, 'XX.YY', 'flat-down', 1, 1)).toBe('01.01');
    });

    it('AYY format', () => {
      const hex = createHex(0, 0, 0);
      expect(formatHexLabel(hex, 'AYY', 'flat-down', 1, 1)).toBe('A01');
    });

    it('AYY format column 3', () => {
      const hex = createHex(2, -1, -1);
      expect(formatHexLabel(hex, 'AYY', 'flat-down', 1, 1)).toBe('C01');
    });

    it('unknown format falls back to XXYY', () => {
      const hex = createHex(0, 0, 0);
      expect(formatHexLabel(hex, 'ZZZZ', 'flat-down', 1, 1)).toBe('0101');
    });
  });

  describe('Label Parsing', () => {
    it('round-trips XXYY', () => {
      const hex = createHex(2, -1, -1);
      const label = formatHexLabel(hex, 'XXYY', 'flat-down', 1, 1);
      const parsed = parseHexLabel(label, 'XXYY', 'flat-down', 1, 1);
      expect(parsed.q).toBe(hex.q);
      expect(parsed.r).toBe(hex.r);
      expect(parsed.s).toBe(hex.s);
    });

    it('round-trips XX.YY', () => {
      const hex = createHex(2, -1, -1);
      const label = formatHexLabel(hex, 'XX.YY', 'flat-down', 1, 1);
      const parsed = parseHexLabel(label, 'XX.YY', 'flat-down', 1, 1);
      expect(parsed.q).toBe(hex.q);
      expect(parsed.r).toBe(hex.r);
    });

    it('round-trips AYY', () => {
      const hex = createHex(2, -1, -1);
      const label = formatHexLabel(hex, 'AYY', 'flat-down', 1, 1);
      const parsed = parseHexLabel(label, 'AYY', 'flat-down', 1, 1);
      expect(parsed.q).toBe(hex.q);
      expect(parsed.r).toBe(hex.r);
    });

    it('parses with first=[0,0]', () => {
      const hex = createHex(0, 0, 0);
      const label = formatHexLabel(hex, 'XXYY', 'flat-down', 0, 0);
      expect(label).toBe('0000');
      const parsed = parseHexLabel('0000', 'XXYY', 'flat-down', 0, 0);
      expect(parsed.q).toBe(0);
      expect(parsed.r).toBe(0);
    });
  });

  describe('ID Parsers', () => {
    it('Boundary and Vertex ID codecs', () => {
      const bId = parseBoundaryId('0,0,0|1,-1,0');
      expect(hexId(bId.hexA)).toBe('0,0,0');
      if (bId.hexB === null) throw new Error('hexB should not be null');
      expect(hexId(bId.hexB)).toBe('1,-1,0');

      const bIdVoid = parseBoundaryId('0,0,0|VOID|3');
      expect(hexId(bIdVoid.hexA)).toBe('0,0,0');
      expect(bIdVoid.hexB).toBeNull();
      expect(bIdVoid.direction).toBe(3);

      const vId = parseVertexId('-1,0,1^0,-1,1^0,0,0');
      expect(vId.length).toBe(3);
      expect(hexId(vId[0])).toBe('-1,0,1');
    });
  });

  describe('Direction Codecs', () => {
    it('Direction codecs work correctly', () => {
      expect(Hex.DIRECTION_NAMES.flat[0]).toBe('ne');
      expect(Hex.directionIndex('ne', 'flat')).toBe(0);
      expect(Hex.directionName(0, 'flat')).toBe('ne');
    });
  });

  describe('hexToPixel & pixelToHex Round-trips', () => {
    const sizes = [1, 10, 25.5];
    const hexes: Hex.Cube[] = [
      { q: 0, r: 0, s: 0 },
      { q: 1, r: 0, s: -1 },
      { q: 0, r: 1, s: -1 },
      { q: -1, r: 2, s: -1 },
      { q: 5, r: -3, s: -2 },
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
        const dist = Math.sqrt((corner.x - center.x) ** 2 + (corner.y - center.y) ** 2);
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
        const dist = Math.sqrt((corner.x - center.x) ** 2 + (corner.y - center.y) ** 2);
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
      const pathAb = Hex.hexLine(a, b, 1);
      const pathBa = Hex.hexLine(b, a, 1);
      expect(pathAb).toEqual([...pathBa].reverse());
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

  // ─────────────────────────────────────────────────────────────────────────
  // Bias formula correctness: s gets coefficient +2, r gets coefficient −3
  //
  // Each test passes the nudge value that equals the correct effective_sign
  // for that path (base_sign × parity_sign), so the test is purely sensitive
  // to the formula coefficients — not to parity-correction logic in HexPath.
  //
  // Mnemonic for the correct assignments:
  //   biased_q = lerp_q + (1 · eps · sign)   ← q is the column-like axis
  //   biased_s = lerp_s + (2 · eps · sign)   ← s is the diagonal axis
  //   biased_r = lerp_r − (3 · eps · sign)   ← r is the row-like axis
  // ─────────────────────────────────────────────────────────────────────────
  describe('hexLine bias formula: s gets +2 coefficient, r gets −3', () => {
    // Flat-up (base=−1).  Odd start col → parity=+1 → effective=−1.
    it('flat-up, nudge=−1: col 5→11 row 2 stays at row 2 (odd-start col)', () => {
      const a = Hex.offsetToCube(5, 2, 'flat-up');
      const b = Hex.offsetToCube(11, 2, 'flat-up');
      for (const hex of Hex.hexLine(a, b, -1)) {
        expect(Hex.cubeToOffset(hex, 'flat-up').y).toBe(2);
      }
    });

    // Flat-up (base=−1).  Even start col → parity=−1 → effective=+1.
    it('flat-up, nudge=+1: col 8→16 row 3 stays at row 3 (even-start col)', () => {
      const a = Hex.offsetToCube(8, 3, 'flat-up');
      const b = Hex.offsetToCube(16, 3, 'flat-up');
      for (const hex of Hex.hexLine(a, b, 1)) {
        expect(Hex.cubeToOffset(hex, 'flat-up').y).toBe(3);
      }
    });

    // Flat-down (base=+1).  Odd start col → parity=+1 → effective=+1.
    it('flat-down, nudge=+1: col 5→11 row 2 stays at row 2 (odd-start col)', () => {
      const a = Hex.offsetToCube(5, 2, 'flat-down');
      const b = Hex.offsetToCube(11, 2, 'flat-down');
      for (const hex of Hex.hexLine(a, b, 1)) {
        expect(Hex.cubeToOffset(hex, 'flat-down').y).toBe(2);
      }
    });

    // Flat-down (base=+1).  Even start col → parity=−1 → effective=−1.
    it('flat-down, nudge=−1: col 8→14 row 2 stays at row 2 (even-start col)', () => {
      const a = Hex.offsetToCube(8, 2, 'flat-down');
      const b = Hex.offsetToCube(14, 2, 'flat-down');
      for (const hex of Hex.hexLine(a, b, -1)) {
        expect(Hex.cubeToOffset(hex, 'flat-down').y).toBe(2);
      }
    });

    // Pointy-right (base=+1).  Odd start row → parity=+1 → effective=+1.
    it('pointy-right, nudge=+1: rows 5→11 col 2 stays at col 2 (odd-start row)', () => {
      const a = Hex.offsetToCube(2, 5, 'pointy-right');
      const b = Hex.offsetToCube(2, 11, 'pointy-right');
      for (const hex of Hex.hexLine(a, b, 1)) {
        expect(Hex.cubeToOffset(hex, 'pointy-right').x).toBe(2);
      }
    });

    // Pointy-right (base=+1).  Even start row → parity=−1 → effective=−1.
    it('pointy-right, nudge=−1: rows 6→12 col 4 stays at col 4 (even-start row)', () => {
      const a = Hex.offsetToCube(4, 6, 'pointy-right');
      const b = Hex.offsetToCube(4, 12, 'pointy-right');
      for (const hex of Hex.hexLine(a, b, -1)) {
        expect(Hex.cubeToOffset(hex, 'pointy-right').x).toBe(4);
      }
    });

    // Pointy-left (base=−1).  Odd start row → parity=+1 → effective=−1.
    it('pointy-left, nudge=−1: rows 5→11 col 2 stays at col 2 (odd-start row)', () => {
      const a = Hex.offsetToCube(2, 5, 'pointy-left');
      const b = Hex.offsetToCube(2, 11, 'pointy-left');
      for (const hex of Hex.hexLine(a, b, -1)) {
        expect(Hex.cubeToOffset(hex, 'pointy-left').x).toBe(2);
      }
    });

    // Pointy-left (base=−1).  Even start row → parity=−1 → effective=+1.
    it('pointy-left, nudge=+1: rows 6→12 col 4 stays at col 4 (even-start row)', () => {
      const a = Hex.offsetToCube(4, 6, 'pointy-left');
      const b = Hex.offsetToCube(4, 12, 'pointy-left');
      for (const hex of Hex.hexLine(a, b, 1)) {
        expect(Hex.cubeToOffset(hex, 'pointy-left').x).toBe(4);
      }
    });

    // Reversal symmetry holds for the corrected formula.
    it('reversal symmetry: flat-up nudge=−1', () => {
      const a = Hex.offsetToCube(5, 2, 'flat-up');
      const b = Hex.offsetToCube(11, 2, 'flat-up');
      expect(Hex.hexLine(a, b, -1)).toEqual([...Hex.hexLine(b, a, -1)].reverse());
    });

    it('reversal symmetry: pointy-right nudge=+1', () => {
      const a = Hex.offsetToCube(2, 5, 'pointy-right');
      const b = Hex.offsetToCube(2, 11, 'pointy-right');
      expect(Hex.hexLine(a, b, 1)).toEqual([...Hex.hexLine(b, a, 1)].reverse());
    });
  });

  describe('Boundary and Vertex ID codecs', () => {
    it('should parse boundary IDs correctly', () => {
      const bId = Hex.parseBoundaryId('0,0,0|1,-1,0');
      expect(Hex.hexId(bId.hexA)).toBe('0,0,0');
      if (bId.hexB === null) throw new Error('hexB should not be null');
      expect(Hex.hexId(bId.hexB)).toBe('1,-1,0');
      expect(bId.direction).toBeUndefined();

      const bIdVoid = Hex.parseBoundaryId('0,0,0|VOID|3');
      expect(Hex.hexId(bIdVoid.hexA)).toBe('0,0,0');
      expect(bIdVoid.hexB).toBeNull();
      expect(bIdVoid.direction).toBe(3);
    });

    it('should parse vertex IDs correctly', () => {
      const vId = Hex.parseVertexId('-1,0,1^0,-1,1^0,0,0');
      expect(vId).toHaveLength(3);
      expect(Hex.hexId(vId[0])).toBe('-1,0,1');
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
      let id2;
      let id3;
      for (let i = 0; i < 6; i++) {
        const id = Hex.getCanonicalVertexId(h2, i);
        if (id.includes(Hex.hexId(h1)) && id.includes(Hex.hexId(h3))) {
          id2 = id;
        }
      }
      for (let i = 0; i < 6; i++) {
        const id = Hex.getCanonicalVertexId(h3, i);
        if (id.includes(Hex.hexId(h1)) && id.includes(Hex.hexId(h2))) {
          id3 = id;
        }
      }

      expect(id1).toBe(id2);
      expect(id1).toBe(id3);
    });

    it('should be stable across all 3 sharing hexes for pointy-top corner 0', () => {
      const h1 = { q: 0, r: 0, s: 0 };
      // For pointy, corner 0 touches neighbors at (corner+1)%6=1 and (corner+2)%6=2
      const n1 = Hex.hexNeighbor(h1, 1);
      const n2 = Hex.hexNeighbor(h1, 2);

      const id1 = Hex.getCanonicalVertexId(h1, 0, 'pointy');

      const parts = id1.split('^');
      expect(parts).toHaveLength(3);
      expect(parts).toContain(Hex.hexId(h1));
      expect(parts).toContain(Hex.hexId(n1));
      expect(parts).toContain(Hex.hexId(n2));

      // Verify stability from the other two hexes
      let id2;
      let id3;
      for (let i = 0; i < 6; i++) {
        const id = Hex.getCanonicalVertexId(n1, i, 'pointy');
        if (id.includes(Hex.hexId(h1)) && id.includes(Hex.hexId(n2))) {
          id2 = id;
        }
      }
      for (let i = 0; i < 6; i++) {
        const id = Hex.getCanonicalVertexId(n2, i, 'pointy');
        if (id.includes(Hex.hexId(h1)) && id.includes(Hex.hexId(n1))) {
          id3 = id;
        }
      }

      expect(id1).toBe(id2);
      expect(id1).toBe(id3);
    });

    it('all 6 corners produce distinct vertex IDs for pointy orientation', () => {
      const h = { q: 0, r: 0, s: 0 };
      const ids = new Set<string>();
      for (let i = 0; i < 6; i++) {
        ids.add(Hex.getCanonicalVertexId(h, i, 'pointy'));
      }
      expect(ids.size).toBe(6);
    });

    it('pointy vertex IDs differ from flat vertex IDs for same corner', () => {
      const h = { q: 0, r: 0, s: 0 };
      // Corner 0 in flat and pointy should touch different neighbor sets
      const flatId = Hex.getCanonicalVertexId(h, 0, 'flat');
      const pointyId = Hex.getCanonicalVertexId(h, 0, 'pointy');
      expect(flatId).not.toBe(pointyId);
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

    it.each([
      'flat-down',
      'flat-up',
      'pointy-right',
      'pointy-left',
    ] as Hex.Orientation[])('round-trip raw offsets for %s', (orientation) => {
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

  describe('getEdgeNeighbors', () => {
    it('edge has 4 neighbors (2 per endpoint vertex)', () => {
      const origin: Hex.Cube = { q: 0, r: 0, s: 0 };
      const neighbor = Hex.hexNeighbor(origin, 0);
      const edgeId = Hex.getCanonicalBoundaryId(origin, neighbor, 0);
      const neighbors = Hex.getEdgeNeighbors(edgeId);
      expect(neighbors.length).toBe(4);
      for (const n of neighbors) expect(n).toMatch(/\|/);
      expect(neighbors).not.toContain(edgeId);
    });

    it('edge neighbors are distinct', () => {
      const origin: Hex.Cube = { q: 0, r: 0, s: 0 };
      const neighbor = Hex.hexNeighbor(origin, 0);
      const edgeId = Hex.getCanonicalBoundaryId(origin, neighbor, 0);
      const neighbors = Hex.getEdgeNeighbors(edgeId);
      expect(new Set(neighbors).size).toBe(4);
    });
  });
});
