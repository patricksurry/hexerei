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
  style: 'select' | 'hover';
}

export interface Scene {
  background: string;
  hexagons: HexRenderItem[];
  highlights: HighlightRenderItem[];
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

  for (const hl of highlights) {
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
  }

  return {
    background,
    hexagons,
    highlights: highlightItems
  };
}
