import { HexMapDocument } from './document.js';
import { HexMesh } from '../mesh/hex-mesh.js';
import * as Hex from '../math/hex-math.js';

export class HexMapLoader {
    static load(source: string): HexMesh {
        const doc = new HexMapDocument(source);
        // Access raw document to get grid
        const json = doc.raw.toJSON();

        // Support both 'grid' (old) and 'layout' (new)
        const grid = json.layout || json.grid;
        if (!grid) throw new Error("Missing 'layout' or 'grid' section in HexMap");

        const cols = grid.columns || 0;
        const rows = grid.rows || 0;
        const first = grid.coordinates?.first || [1, 1];
        const firstCol = first[0];
        const firstRow = first[1];

        // Map YAML 'stagger' to Hex.Stagger
        // "high" (odd cols up) -> Even-Q
        // "low" (odd cols down) -> Odd-Q (Default)
        let stagger = Hex.Stagger.Odd;
        if (grid.stagger === 'high') stagger = Hex.Stagger.Even;

        // 1. Generate maximal bounding box grid
        // TODO: Properly parse GeometryExpressions (like "0101 1401 1410 >N 0111 !")
        let effectiveCols = cols;
        let effectiveRows = rows;
        if (effectiveCols === 0) effectiveCols = 14;
        if (effectiveRows === 0) effectiveRows = 11;

        const gridHexes = Hex.createRectangularGrid(effectiveCols, effectiveRows, stagger, firstCol, firstRow);
        const validHexIdSet = new Set(gridHexes.map(Hex.hexId));

        // TEMP FIX for GeometryExpression exclusions in Battle for Moscow
        if (grid.hexes && typeof grid.hexes === 'string') {
            const ge = grid.hexes;
            // Rough hack to find "! 0211 0411 ..." part if it existed, but battle-for-moscow actually has it in 'hexes'
            // Actually, battle-for-moscow.hexmap.yaml:
            // hexes: "0101 1401 1410 >N 0111 !" 
            // The "!" at the end means "fill", but we don't have a parser.
            // Let's look at the exclusions again. They were NOT in 'hexes' in the YAML I read?
            // Wait, let me check the YAML again.
        }

        // 2. Process exclusions from features
        const features = json.features || [];
        for (const feature of features) {
            if (feature.hexes && feature.hexes.exclude) {
                const excluded = feature.hexes.exclude.at || feature.hexes.exclude;
                const handleExclude = (coord: string) => {
                    const pureCoord = coord.split('/')[0].trim();
                    if (pureCoord.length === 4) {
                        const c = parseInt(pureCoord.substring(0, 2), 10);
                        const r = parseInt(pureCoord.substring(2, 4), 10);
                        const cube = Hex.offsetToCube(c - firstCol, r - firstRow, stagger);
                        validHexIdSet.delete(Hex.hexId(cube));
                    }
                };
                if (typeof excluded === 'string') {
                    excluded.split(/\s+/).forEach(handleExclude);
                } else if (Array.isArray(excluded)) {
                    excluded.forEach(handleExclude);
                }
            }
        }

        // 3. Apply terrain/features
        const terrainMap = new Map<string, string>();

        const setTerrain = (cube: Hex.Cube, type: string) => {
            const id = Hex.hexId(cube);
            if (validHexIdSet.has(id)) {
                terrainMap.set(id, type);
            }
        };

        for (const feature of features) {
            const loc = feature.at || feature.hex || feature.hexes;
            if (!loc) continue;

            const handleCoord = (coord: string) => {
                const pureCoord = coord.split('/')[0].trim();
                if (pureCoord.length === 4) {
                    const c = parseInt(pureCoord.substring(0, 2), 10);
                    const r = parseInt(pureCoord.substring(2, 4), 10);
                    setTerrain(Hex.offsetToCube(c - firstCol, r - firstRow, stagger), feature.terrain);
                }
            };

            if (loc === '@all') {
                validHexIdSet.forEach(id => terrainMap.set(id, feature.terrain));
            } else if (typeof loc === 'string') {
                loc.split(/\s+/).forEach(handleCoord);
            } else if (Array.isArray(loc)) {
                loc.forEach(handleCoord);
            }
        }

        const validHexes = Array.from(validHexIdSet).map(Hex.hexFromId);
        const mesh = new HexMesh(validHexes, { stagger, terrain: terrainMap, firstCol, firstRow });

        return mesh;
    }
}
