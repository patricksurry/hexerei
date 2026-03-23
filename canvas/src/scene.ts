import { Hex } from '@hexmap/core';
import { Point, ViewportState, worldToScreen } from './viewport.js';
import { MapModel } from './model.js';

const HEX_SIZE = 1;

export interface SceneHighlight {
  type: 'hex' | 'edge' | 'vertex';
  hexIds: string[];
  boundaryId?: string;
  vertexId?: string;
  color: string;
  style: 'select' | 'hover' | 'ghost' | 'dim';
}

export interface SceneOptions {
  background?: string;
  highlights?: SceneHighlight[];
  segmentPath?: string[];
}

export interface HexRenderItem {
  hexId: string;
  corners: Point[]; // 6 screen-space points
  center: Point; // screen-space center
  fill: string; // terrain CSS color
  label: string; // coordinate label ("0507")
}

export interface HighlightRenderItem {
  hexId: string;
  corners: Point[]; // 6 screen-space points
  color: string;
  style: 'select' | 'hover' | 'ghost' | 'dim';
}

export interface EdgeHighlightRenderItem {
  boundaryId: string;
  p1: Point;
  p2: Point;
  color: string;
}

export interface VertexHighlightRenderItem {
  vertexId: string;
  point: Point;
  color: string;
}

export interface PathLineRenderItem {
  points: Point[]; // screen-space centers in path order
  color: string;
}

export interface FeatureLabelRenderItem {
  text: string;
  point: Point; // screen-space centroid
}

export interface EdgeTerrainRenderItem {
  edgeId: string;
  p1: Point;
  p2: Point;
  color: string;
  onesided?: boolean;
  activeHexCenter?: Point; // screen-space center of the "active" hex (for onesided markers)
}

export interface VertexTerrainRenderItem {
  vertexId: string;
  point: Point;
  color: string;
}

export interface PathTerrainRenderItem {
  points: Point[]; // screen-space hex centers in segment order
  color: string;
}

export interface Scene {
  background: string;
  hexagons: HexRenderItem[];
  highlights: HighlightRenderItem[];
  edgeHighlights: EdgeHighlightRenderItem[];
  vertexHighlights: VertexHighlightRenderItem[];
  pathLines: PathLineRenderItem[];
  featureLabels: FeatureLabelRenderItem[];
  edgeTerrain: EdgeTerrainRenderItem[];
  vertexTerrain: VertexTerrainRenderItem[];
  pathTerrain: PathTerrainRenderItem[];
}

export function buildScene(
  model: MapModel,
  viewport: ViewportState,
  options?: SceneOptions
): Scene {
  const background = options?.background ?? '#141414';
  const highlights = options?.highlights ?? [];
  const segmentPath = options?.segmentPath ?? [];
  const hexagons: HexRenderItem[] = [];
  const orientation = Hex.orientationTop(model.grid.orientation);

  // Padding for culling: 1.5x size to be safe
  const cullPadding = HEX_SIZE * 1.5 * viewport.zoom;

  for (const area of model.mesh.getAllHexes()) {
    const cube = Hex.hexFromId(area.id);
    const worldCenter = Hex.hexToPixel(cube, HEX_SIZE, orientation);
    const screenCenter = worldToScreen(worldCenter, viewport);

    // Frustum culling
    if (
      screenCenter.x < -cullPadding ||
      screenCenter.x > viewport.width + cullPadding ||
      screenCenter.y < -cullPadding ||
      screenCenter.y > viewport.height + cullPadding
    ) {
      continue;
    }

    const worldCorners = Hex.hexCorners(worldCenter, HEX_SIZE, orientation);
    const screenCorners = worldCorners.map((p) => worldToScreen(p, viewport));

    hexagons.push({
      hexId: area.id,
      corners: screenCorners,
      center: screenCenter,
      fill: model.terrainColor('hex', area.terrain),
      label: Hex.formatHexLabel(
        Hex.hexFromId(area.id),
        model.grid.labelFormat,
        model.grid.orientation,
        model.grid.firstCol,
        model.grid.firstRow
      ),
    });
  }

  const highlightItems: HighlightRenderItem[] = [];
  const edgeHighlights: EdgeHighlightRenderItem[] = [];
  const vertexHighlights: VertexHighlightRenderItem[] = [];

  for (const hl of highlights) {
    if (hl.type === 'hex') {
      for (const hexId of hl.hexIds) {
        const cube = Hex.hexFromId(hexId);
        const worldCenter = Hex.hexToPixel(cube, HEX_SIZE, orientation);
        const worldCorners = Hex.hexCorners(worldCenter, HEX_SIZE, orientation);
        const screenCorners = worldCorners.map((p) => worldToScreen(p, viewport));

        highlightItems.push({
          hexId,
          corners: screenCorners,
          color: hl.color,
          style: hl.style,
        });
      }
    } else if (hl.type === 'edge' && hl.boundaryId) {
      const [id1, id2] = hl.boundaryId.split('|');
      const h1 = Hex.hexFromId(id1);
      const c1 = Hex.hexToPixel(h1, HEX_SIZE, orientation);

      // Find direction from h1 to h2 or VOID/dir
      let dir = 0;
      if (id2.startsWith('VOID/')) {
        dir = parseInt(id2.split('/')[1]);
      } else {
        const h2 = Hex.hexFromId(id2);
        for (let i = 0; i < 6; i++) {
          if (Hex.hexId(Hex.hexNeighbor(h1, i)) === Hex.hexId(h2)) {
            dir = i;
            break;
          }
        }
      }

      const corners = Hex.hexCorners(c1, HEX_SIZE, orientation);
      // Edge in direction d lies between corners (d+5)%6 and d for flat,
      // or (d+4)%6 and (d+5)%6 for pointy.
      const edgeStart = orientation === 'flat' ? (dir + 5) % 6 : (dir + 4) % 6;
      const p1 = worldToScreen(corners[edgeStart], viewport);
      const p2 = worldToScreen(corners[(edgeStart + 1) % 6], viewport);

      edgeHighlights.push({
        boundaryId: hl.boundaryId,
        p1,
        p2,
        color: hl.color,
      });
    } else if (hl.type === 'vertex' && hl.vertexId) {
      const ids = hl.vertexId.split('^');
      // Averaging hex centers is not precise for vertex, better to use corners
      const h1 = Hex.hexFromId(ids[0]);
      const c1 = Hex.hexToPixel(h1, HEX_SIZE, orientation);
      const corners = Hex.hexCorners(c1, HEX_SIZE, orientation);

      // We need to find which corner of h1 this vertex is.
      // It's the corner that is shared with both h2 and h3.
      const h2Id = ids[1];
      const h3Id = ids[2];

      let cornerIdx = 0;
      for (let i = 0; i < 6; i++) {
        const n1 = Hex.hexId(Hex.hexNeighbor(h1, i));
        const n2 = Hex.hexId(Hex.hexNeighbor(h1, (i + 1) % 6));
        if ((n1 === h2Id && n2 === h3Id) || (n1 === h3Id && n2 === h2Id)) {
          cornerIdx = i;
          break;
        }
      }

      vertexHighlights.push({
        vertexId: hl.vertexId,
        point: worldToScreen(corners[cornerIdx], viewport),
        color: hl.color,
      });
    }
  }

  const pathLines: PathLineRenderItem[] = [];
  if (segmentPath.length > 1) {
    const points = segmentPath.map((hexId) => {
      const cube = Hex.hexFromId(hexId);
      const world = Hex.hexToPixel(cube, HEX_SIZE, orientation);
      return worldToScreen(world, viewport);
    });
    pathLines.push({ points, color: '#00D4FF' });
  }

  // Edge terrain
  const edgeTerrain: EdgeTerrainRenderItem[] = [];
  for (const feature of model.features) {
    if (feature.geometryType !== 'edge' || !feature.terrain) continue;
    const color = model.terrainColor('edge', feature.terrain);
    const onesided = model.terrainDefs('edge').get(feature.terrain)?.onesided;
    for (const edgeId of feature.edgeIds) {
      const [id1, id2] = edgeId.split('|');
      const h1 = Hex.hexFromId(id1);
      const c1 = Hex.hexToPixel(h1, HEX_SIZE, orientation);

      let dir = 0;
      if (id2.startsWith('VOID/')) {
        dir = parseInt(id2.split('/')[1]);
      } else {
        const h2 = Hex.hexFromId(id2);
        for (let i = 0; i < 6; i++) {
          if (Hex.hexId(Hex.hexNeighbor(h1, i)) === Hex.hexId(h2)) {
            dir = i;
            break;
          }
        }
      }

      const corners = Hex.hexCorners(c1, HEX_SIZE, orientation);
      const edgeStart = orientation === 'flat' ? (dir + 5) % 6 : (dir + 4) % 6;
      const p1 = worldToScreen(corners[edgeStart], viewport);
      const p2 = worldToScreen(corners[(edgeStart + 1) % 6], viewport);
      const item: EdgeTerrainRenderItem = { edgeId, p1, p2, color };
      if (onesided) {
        item.onesided = true;
        item.activeHexCenter = worldToScreen(c1, viewport);
      }
      edgeTerrain.push(item);
    }
  }

  // Vertex terrain
  const vertexTerrain: VertexTerrainRenderItem[] = [];
  for (const feature of model.features) {
    if (feature.geometryType !== 'vertex' || !feature.terrain) continue;
    const color = model.terrainColor('vertex', feature.terrain);
    for (const vertexId of feature.vertexIds) {
      const ids = vertexId.split('^');
      const h1 = Hex.hexFromId(ids[0]);
      const c1 = Hex.hexToPixel(h1, HEX_SIZE, orientation);
      const corners = Hex.hexCorners(c1, HEX_SIZE, orientation);
      const h2Id = ids[1];
      const h3Id = ids[2];

      let cornerIdx = 0;
      for (let i = 0; i < 6; i++) {
        const n1 = Hex.hexId(Hex.hexNeighbor(h1, i));
        const n2 = Hex.hexId(Hex.hexNeighbor(h1, (i + 1) % 6));
        if ((n1 === h2Id && n2 === h3Id) || (n1 === h3Id && n2 === h2Id)) {
          cornerIdx = i;
          break;
        }
      }
      vertexTerrain.push({
        vertexId,
        point: worldToScreen(corners[cornerIdx], viewport),
        color,
      });
    }
  }

  // Path terrain (hex features with path: true)
  const pathTerrain: PathTerrainRenderItem[] = [];
  for (const feature of model.features) {
    if (feature.geometryType !== 'hex' || !feature.terrain) continue;
    const def = model.terrainDefs('hex').get(feature.terrain);
    if (!def?.properties?.path) continue;
    const color = model.terrainColor('hex', feature.terrain);

    const segments = feature.segments ?? [feature.hexIds];
    for (const segment of segments) {
      if (segment.length < 2) continue;
      const points = segment.map((hexId) => {
        const cube = Hex.hexFromId(hexId);
        const world = Hex.hexToPixel(cube, HEX_SIZE, orientation);
        return worldToScreen(world, viewport);
      });
      pathTerrain.push({ points, color });
    }
  }

  const featureLabels: FeatureLabelRenderItem[] = [];
  for (const feature of model.features) {
    if (!feature.label || feature.isBase || feature.hexIds.length === 0) continue;

    // Average screen-space center of all feature hexes
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    for (const hexId of feature.hexIds) {
      const cube = Hex.hexFromId(hexId);
      const world = Hex.hexToPixel(cube, HEX_SIZE, orientation);
      const screen = worldToScreen(world, viewport);
      sumX += screen.x;
      sumY += screen.y;
      count++;
    }
    if (count > 0) {
      featureLabels.push({ text: feature.label, point: { x: sumX / count, y: sumY / count } });
    }
  }

  return {
    background,
    hexagons,
    highlights: highlightItems,
    edgeHighlights,
    vertexHighlights,
    pathLines,
    featureLabels,
    edgeTerrain,
    vertexTerrain,
    pathTerrain,
  };
}
