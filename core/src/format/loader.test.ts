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
        
        // 0101 (Top Left) in Battle for Moscow (Stagger High)
        const tl = Hex.hexId(Hex.offsetToCube(0, 0, Hex.Stagger.Even));
        expect(allIds).toContain(tl);
    });

    it('should exclude phantom hexes', () => {
        // 0211 is phantom in BfM (even column in 14x11 stagger high)
        const phantom = Hex.hexId(Hex.offsetToCube(1, 10, Hex.Stagger.Even));
        expect(mesh.getHex(phantom)).toBeUndefined();
    });
});
