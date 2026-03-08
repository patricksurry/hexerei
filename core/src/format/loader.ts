import { HexMapDocument } from './document.js';
import { HexMesh } from '../mesh/hex-mesh.js';
import * as Hex from '../math/hex-math.js';
import { HexPath } from '../hexpath/hex-path.js';

export class HexMapLoader {
    static load(source: string): HexMesh {
        const doc = new HexMapDocument(source);
        const json = doc.toJS();

        const layout = json.layout;
        if (!layout) throw new Error("Missing mandatory 'layout' section in HexMap document");
        if (!layout.all) throw new Error("Missing mandatory 'layout.all' HexPath defining map extent");

        // 1. Determine Stagger/Coordinates from layout
        const stagger = layout.stagger === 'high' ? Hex.Stagger.Even : Hex.Stagger.Odd;
        const firstCol = layout.coordinates?.first?.[0] ?? 1;
        const firstRow = layout.coordinates?.first?.[1] ?? 1;
        const labelFormat = layout.label || "XXYY";

        // 2. Resolve Map Extent (@all)
        const tempMesh = new HexMesh([], { stagger, firstCol, firstRow, layout });
        const hexPath = new HexPath(tempMesh, { 
            labelFormat, 
            stagger, 
            firstCol, 
            firstRow 
        });
        const allResult = hexPath.resolve(layout.all);
        const validHexes = allResult.items.map(Hex.hexFromId);
        const validHexIdSet = new Set(allResult.items);

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
            const at = feature.at;
            if (!at) continue;

            try {
                const result = meshHexPath.resolve(at);
                
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
