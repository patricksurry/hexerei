import { Hex } from '@hexmap/core';
import { Point, ViewportState, worldToScreen } from './viewport.js';
import { MapModel } from './map-model.js';
import { HEX_SIZE } from './hit-test.js';
import { SceneHighlight } from './selection.js';

export interface HexRenderItem {
  hexId: string;
  corners: Point[];    // 6 screen-space points
  center: Point;       // screen-space center
  fill: string;        // terrain CSS color
  label: string;       // coordinate label ("0507")
}

export interface HighlightRenderItem {
  hexId: string;
  corners: Point[];    // 6 screen-space points
  color: string;
  style: 'select' | 'hover' | 'ghost';
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

export interface Scene {
  background: string;
  hexagons: HexRenderItem[];
  highlights: HighlightRenderItem[];
  edgeHighlights: EdgeHighlightRenderItem[];
  vertexHighlights: VertexHighlightRenderItem[];
}

export function buildScene(
  model: MapModel,
  viewport: ViewportState,
  background: string = '#141414',
  highlights: SceneHighlight[] = []
): Scene {
  const hexagons: HexRenderItem[] = [];
  const orientation = model.grid.hexTop;
  
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
    const screenCorners = worldCorners.map(p => worldToScreen(p, viewport));
    
    hexagons.push({
      hexId: area.id,
      corners: screenCorners,
      center: screenCenter,
      fill: model.terrainColor(area.terrain),
      label: model.hexIdToLabel(area.id)
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
        const screenCorners = worldCorners.map(p => worldToScreen(p, viewport));
        
        highlightItems.push({
          hexId,
          corners: screenCorners,
          color: hl.color,
          style: hl.style
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
        for(let i=0; i<6; i++) {
          if (Hex.hexId(Hex.hexNeighbor(h1, i)) === Hex.hexId(h2)) {
            dir = i;
            break;
          }
        }
      }
      
      const corners = Hex.hexCorners(c1, HEX_SIZE, orientation);
      // Flat-top: edge i is between corner i and (i+1)%6
      // Pointy-top: check RFC/RedBlob
      const p1 = worldToScreen(corners[dir], viewport);
      const p2 = worldToScreen(corners[(dir + 1) % 6], viewport);
      
      edgeHighlights.push({
        boundaryId: hl.boundaryId,
        p1, p2,
        color: hl.color
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
      for(let i=0; i<6; i++) {
        const n1 = Hex.hexId(Hex.hexNeighbor(h1, i));
        const n2 = Hex.hexId(Hex.hexNeighbor(h1, (i+1)%6));
        if ((n1 === h2Id && n2 === h3Id) || (n1 === h3Id && n2 === h2Id)) {
          cornerIdx = i;
          break;
        }
      }
      
      vertexHighlights.push({
        vertexId: hl.vertexId,
        point: worldToScreen(corners[cornerIdx], viewport),
        color: hl.color
      });
    }
  }

  return {
    background,
    hexagons,
    highlights: highlightItems,
    edgeHighlights,
    vertexHighlights
  };
}
