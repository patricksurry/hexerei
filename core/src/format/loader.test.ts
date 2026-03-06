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

    it('should have some areas', () => {
        const allAreas = Array.from(mesh.getAllAreas());
        expect(allAreas.length).toBeGreaterThan(0);
    });

    it('should include valid corner hexes', () => {
        // Let's just find them in allAreas to be sure what loader produced
        const allIds = new Set(Array.from(mesh.getAllAreas()).map(a => a.id));
        
        // 0101 (Top Left)
        const tl = Hex.hexId(Hex.offsetToCube(1 - 1, 1 - 1, Hex.Stagger.Even));
        expect(allIds).toContain(tl);
    });

    it('should exclude phantom hexes', () => {
        // q=2, r=10, s=-12
        expect(mesh.getArea("2,10,-12")).toBeUndefined();
    });
});
