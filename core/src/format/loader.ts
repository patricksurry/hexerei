import { HexMapDocument } from './document.js';
import { HexMesh } from '../mesh/hex-mesh.js';
import * as Hex from '../math/hex-math.js';
import { HexPath } from '../hexpath/hex-path.js';

export class HexMapLoader {
    static load(source: string): HexMesh {
        const doc = new HexMapDocument(source);
        const json = doc.toJS();

        // Support both 'layout' (RFC) and 'grid' (legacy)
        const layout = json.layout || json.grid;
        if (!layout) throw new Error("Missing mandatory 'layout' or 'grid' section in HexMap document");

        // 1. Determine Stagger/Coordinates from layout
        const stagger = layout.stagger === 'high' ? Hex.Stagger.Even : Hex.Stagger.Odd;
        const firstCol = layout.coordinates?.first?.[0] ?? layout.firstCol ?? layout.first?.[0] ?? 1;
        const firstRow = layout.coordinates?.first?.[1] ?? layout.firstRow ?? layout.first?.[1] ?? 1;
        const labelFormat = layout.label || layout.coordinates?.label || "XXYY";

        // 2. Determine Map Extent (validHexes)
        let validHexes: Hex.Cube[] = [];
        if (layout.all) {
            const tempMesh = new HexMesh([], { stagger, firstCol, firstRow, layout });
            const hexPath = new HexPath(tempMesh, { 
                labelFormat, 
                stagger, 
                firstCol, 
                firstRow 
            });
            const allResult = hexPath.resolve(layout.all);
            validHexes = allResult.items.map(Hex.hexFromId);
        } else if (layout.columns && layout.rows) {
            // Legacy fallback: generate rectangular grid
            validHexes = Hex.createRectangularGrid(layout.columns, layout.rows, stagger, firstCol, firstRow);
        } else {
            throw new Error("Missing mandatory 'layout.all' or legacy grid dimensions");
        }
        
        const validHexIdSet = new Set(validHexes.map(Hex.hexId));

        // 3. Process Features
        const terrainMap = new Map<string, string>();
        const elevationMap = new Map<string, number>();
        const tagsMap = new Map<string, Set<string>>();
        const features = json.features || [];

        const mesh = new HexMesh(validHexes, { 
            stagger, 
            firstCol,
            firstRow,
            layout: layout
        });
        const meshHexPath = new HexPath(mesh, { 
            labelFormat,
            stagger,
            firstCol,
            firstRow
        });

        for (const feature of features) {
            const at = feature.at || feature.hex || feature.hexes;
            if (!at) continue;

            try {
                const pathStr = Array.isArray(at) ? at.join(' ') : at;
                if (typeof pathStr !== 'string') continue;

                const result = meshHexPath.resolve(pathStr);
                
                if (result.type === 'hex') {
                    for (const id of result.items) {
                        if (!validHexIdSet.has(id)) continue;

                        if (feature.terrain) {
                            const current = terrainMap.get(id) || '';
                            terrainMap.set(id, current ? `${current} ${feature.terrain}` : feature.terrain);
                        }
                        if (feature.elevation !== undefined) elevationMap.set(id, feature.elevation);
                        if (feature.tags) {
                            if (!tagsMap.has(id)) tagsMap.set(id, new Set());
                            const tags = Array.isArray(feature.tags) ? feature.tags : feature.tags.split(/\s+/);
                            tags.forEach((t: string) => tagsMap.get(id)!.add(t));
                        }
                    }
                }
            } catch (e) {
                console.warn(`Failed to resolve HexPath in feature: ${at}`, e);
            }
        }

        // Finalize mesh hexes
        for (const hex of mesh.getAllHexes()) {
            const id = hex.id;
            if (terrainMap.has(id)) hex.terrain = terrainMap.get(id)!;
            if (elevationMap.has(id)) hex.elevation = elevationMap.get(id);
            if (tagsMap.has(id)) {
                hex.props.tags = Array.from(tagsMap.get(id)!);
            }
        }

        return mesh;
    }
}
