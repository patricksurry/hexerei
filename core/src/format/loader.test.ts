import { describe, it, expect } from 'vitest';
import { HexMapLoader } from './loader.js';
import * as Hex from '../math/hex-math.js';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('HexMapLoader - Battle for Moscow', () => {
    // Read the actual map file from the sibling directory
    const mapPath = join(__dirname, '../../../maps/definitions/battle-for-moscow.hexmap.yaml');
    const mapSource = readFileSync(mapPath, 'utf-8');

    const mesh = HexMapLoader.load(mapSource);

    it('should have some hexes', () => {
        const allHexes = Array.from(mesh.getAllHexes());
        expect(allHexes.length).toBeGreaterThan(0);
    });

    it('should include valid corner hexes', () => {
        const allIds = new Set(Array.from(mesh.getAllHexes()).map(h => h.id));
        
        // 0101 (Top Left) in Battle for Moscow (Orientation: flat-up, firstCol: 1, firstRow: 1)
        const tl = Hex.hexId(Hex.offsetToCube(1, 1, 'flat-up'));
        expect(allIds).toContain(tl);
    });

    it('should exclude phantom hexes', () => {
        // 0211 is phantom in BfM (even column in 14x11 flat-up)
        // 0211 => col 2 (even), row 11. 
        const phantom = Hex.hexId(Hex.offsetToCube(2, 11, 'flat-up'));
        expect(mesh.getHex(phantom)).toBeUndefined();
    });
});

describe('HexMapLoader - Format Compatibility', () => {
    it('should load layout: with all: successfully', () => {
        const source = `
hexmap: "1.0"
layout:
  orientation: flat-down
  all: "0101 - 0301 - 0303 - 0103 fill"
`;
        const mesh = HexMapLoader.load(source);
        expect(Array.from(mesh.getAllHexes())).toHaveLength(9);
    });

    it('should throw error if layout is not present', () => {
        const source = 'hexmap: "1.0"\nmetadata: { title: "nothing" }';
        expect(() => HexMapLoader.load(source)).toThrow(/Missing mandatory 'layout' section/);
    });
});
