import { Hex } from '@hexmap/core';
import { ACCENT_HEX, HEX_SIZE, SCENE_CULL_PADDING_FACTOR } from './constants.js';
import type { MapModel } from './model.js';
import type { SceneHighlight } from './types.js';
import { type Point, type ViewportState, worldToScreen } from './viewport.js';

export interface SceneOptions {
  background?: string;
  highlights?: SceneHighlight[];
  segments?: string[][];
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
  const orientation = Hex.orientationTop(model.grid.orientation);

  const hexagons = buildHexagons(model, viewport, orientation);
  const { highlightItems, edgeHighlights, vertexHighlights } = buildHighlights(
    options?.highlights ?? [],
    viewport,
    orientation
  );

  const pathLines = buildPathLines(options?.segments ?? [], viewport, orientation);
  const edgeTerrain = buildEdgeTerrain(model, viewport, orientation);
  const vertexTerrain = buildVertexTerrain(model, viewport, orientation);
  const pathTerrain = buildPathTerrain(model, viewport, orientation);
  const featureLabels = buildFeatureLabels(model, viewport, orientation);

  return {
    background: options?.background ?? '#141414',
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

function buildHexagons(
  model: MapModel,
  viewport: ViewportState,
  orientation: 'flat' | 'pointy'
): HexRenderItem[] {
  const hexagons: HexRenderItem[] = [];
  const cullPadding = HEX_SIZE * SCENE_CULL_PADDING_FACTOR * viewport.zoom;

  for (const area of model.mesh.getAllHexes()) {
    const cube = Hex.hexFromId(area.id);
    const worldCenter = Hex.hexToPixel(cube, HEX_SIZE, orientation);
    const screenCenter = worldToScreen(worldCenter, viewport);

    if (
      screenCenter.x < -cullPadding ||
      screenCenter.x > viewport.width + cullPadding ||
      screenCenter.y < -cullPadding ||
      screenCenter.y > viewport.height + cullPadding
    ) {
      continue;
    }

    const worldCorners = Hex.hexCorners(worldCenter, HEX_SIZE, orientation);
    const terrainDef = model.terrainDefs('hex').get(area.terrain);

    hexagons.push({
      hexId: area.id,
      corners: worldCorners.map((p) => worldToScreen(p, viewport)),
      center: screenCenter,
      fill: terrainDef?.properties?.path ? 'none' : model.terrainColor('hex', area.terrain),
      label: Hex.formatHexLabel(
        cube,
        model.grid.labelFormat,
        model.grid.orientation,
        model.grid.firstCol,
        model.grid.firstRow
      ),
    });
  }
  return hexagons;
}

function buildHighlights(
  highlights: SceneHighlight[],
  viewport: ViewportState,
  orientation: 'flat' | 'pointy'
) {
  const highlightItems: HighlightRenderItem[] = [];
  const edgeHighlights: EdgeHighlightRenderItem[] = [];
  const vertexHighlights: VertexHighlightRenderItem[] = [];

  for (const hl of highlights) {
    if (hl.type === 'hex') {
      for (const hexId of hl.hexIds ?? []) {
        const cube = Hex.hexFromId(hexId);
        const worldCenter = Hex.hexToPixel(cube, HEX_SIZE, orientation);
        const worldCorners = Hex.hexCorners(worldCenter, HEX_SIZE, orientation);
        highlightItems.push({
          hexId,
          corners: worldCorners.map((p) => worldToScreen(p, viewport)),
          color: hl.color,
          style: hl.style,
        });
      }
    } else if (hl.type === 'edge' && hl.boundaryId) {
      const { p1, p2 } = getEdgePoints(hl.boundaryId, orientation, viewport);
      edgeHighlights.push({ boundaryId: hl.boundaryId, p1, p2, color: hl.color });
    } else if (hl.type === 'vertex' && hl.vertexId) {
      vertexHighlights.push({
        vertexId: hl.vertexId,
        point: getVertexPoint(hl.vertexId, orientation, viewport),
        color: hl.color,
      });
    }
  }
  return { highlightItems, edgeHighlights, vertexHighlights };
}

function buildPathLines(
  segments: string[][],
  viewport: ViewportState,
  orientation: 'flat' | 'pointy'
): PathLineRenderItem[] {
  return segments
    .filter((s) => s.length >= 2)
    .map((segment) => ({
      points: segment.map((hexId) =>
        worldToScreen(Hex.hexToPixel(Hex.hexFromId(hexId), HEX_SIZE, orientation), viewport)
      ),
      color: ACCENT_HEX,
    }));
}

function buildEdgeTerrain(
  model: MapModel,
  viewport: ViewportState,
  orientation: 'flat' | 'pointy'
): EdgeTerrainRenderItem[] {
  const edgeTerrain: EdgeTerrainRenderItem[] = [];
  for (const feature of model.features) {
    if (feature.geometryType !== 'edge' || !feature.terrain) continue;
    const color = model.terrainColor('edge', feature.terrain);
    const onesided = model.terrainDefs('edge').get(feature.terrain)?.onesided;

    for (const edgeId of feature.edgeIds) {
      const { p1, p2, c1 } = getEdgePoints(edgeId, orientation, viewport);
      const item: EdgeTerrainRenderItem = { edgeId, p1, p2, color };
      if (onesided) {
        item.onesided = true;
        item.activeHexCenter = c1;
      }
      edgeTerrain.push(item);
    }
  }
  return edgeTerrain;
}

function buildVertexTerrain(
  model: MapModel,
  viewport: ViewportState,
  orientation: 'flat' | 'pointy'
): VertexTerrainRenderItem[] {
  const vertexTerrain: VertexTerrainRenderItem[] = [];
  for (const feature of model.features) {
    if (feature.geometryType !== 'vertex' || !feature.terrain) continue;
    const color = model.terrainColor('vertex', feature.terrain);
    for (const vertexId of feature.vertexIds) {
      vertexTerrain.push({
        vertexId,
        point: getVertexPoint(vertexId, orientation, viewport),
        color,
      });
    }
  }
  return vertexTerrain;
}

function buildPathTerrain(
  model: MapModel,
  viewport: ViewportState,
  orientation: 'flat' | 'pointy'
): PathTerrainRenderItem[] {
  const pathTerrain: PathTerrainRenderItem[] = [];
  for (const feature of model.features) {
    if (feature.geometryType !== 'hex' || !feature.terrain) continue;
    const def = model.terrainDefs('hex').get(feature.terrain);
    if (!def?.properties?.path) continue;

    const color = model.terrainColor('hex', feature.terrain);
    const segments = feature.segments ?? [feature.hexIds];
    for (const segment of segments) {
      if (segment.length < 2) continue;
      pathTerrain.push({
        points: segment.map((hexId) =>
          worldToScreen(Hex.hexToPixel(Hex.hexFromId(hexId), HEX_SIZE, orientation), viewport)
        ),
        color,
      });
    }
  }
  return pathTerrain;
}

function buildFeatureLabels(
  model: MapModel,
  viewport: ViewportState,
  orientation: 'flat' | 'pointy'
): FeatureLabelRenderItem[] {
  const featureLabels: FeatureLabelRenderItem[] = [];
  for (const feature of model.features) {
    if (!feature.label || feature.isBase || feature.hexIds.length === 0) continue;

    let sumX = 0;
    let sumY = 0;
    for (const hexId of feature.hexIds) {
      const screen = worldToScreen(
        Hex.hexToPixel(Hex.hexFromId(hexId), HEX_SIZE, orientation),
        viewport
      );
      sumX += screen.x;
      sumY += screen.y;
    }
    featureLabels.push({
      text: feature.label,
      point: { x: sumX / feature.hexIds.length, y: sumY / feature.hexIds.length },
    });
  }
  return featureLabels;
}

function getEdgePoints(
  boundaryId: string,
  orientation: 'flat' | 'pointy',
  viewport: ViewportState
): { p1: Point; p2: Point; c1: Point } {
  const [id1, id2] = boundaryId.split('|');
  const h1 = Hex.hexFromId(id1);
  const c1World = Hex.hexToPixel(h1, HEX_SIZE, orientation);

  let dir = 0;
  if (id2.startsWith('VOID/')) {
    dir = Number.parseInt(id2.split('/')[1], 10);
  } else {
    const h2 = Hex.hexFromId(id2);
    for (let i = 0; i < 6; i++) {
      if (Hex.hexId(Hex.hexNeighbor(h1, i)) === Hex.hexId(h2)) {
        dir = i;
        break;
      }
    }
  }

  const corners = Hex.hexCorners(c1World, HEX_SIZE, orientation);
  const edgeStart = orientation === 'flat' ? (dir + 5) % 6 : (dir + 4) % 6;
  return {
    p1: worldToScreen(corners[edgeStart], viewport),
    p2: worldToScreen(corners[(edgeStart + 1) % 6], viewport),
    c1: worldToScreen(c1World, viewport),
  };
}

function getVertexPoint(
  vertexId: string,
  orientation: 'flat' | 'pointy',
  viewport: ViewportState
): Point {
  const ids = vertexId.split('^');
  const h1 = Hex.hexFromId(ids[0]);
  const c1 = Hex.hexToPixel(h1, HEX_SIZE, orientation);
  const corners = Hex.hexCorners(c1, HEX_SIZE, orientation);

  const h2Id = ids[1];
  const h3Id = ids[2];
  const isPointy = orientation === 'pointy';
  let cornerIdx = 0;
  for (let i = 0; i < 6; i++) {
    const n1 = Hex.hexId(Hex.hexNeighbor(h1, i));
    const n2 = Hex.hexId(Hex.hexNeighbor(h1, (i + 1) % 6));
    if ((n1 === h2Id && n2 === h3Id) || (n1 === h3Id && n2 === h2Id)) {
      cornerIdx = (i - (isPointy ? 1 : 0) + 6) % 6;
      break;
    }
  }
  return worldToScreen(corners[cornerIdx], viewport);
}
