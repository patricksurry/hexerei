import * as d3 from 'd3';
import { MeshMap, HexArea, Hex } from '@hexmap/core';

export interface RendererConfig {
  element: HTMLElement;
  width: number;
  height: number;
  hexSize: number;
  origin?: { x: number; y: number };
}

const TERRAIN_COLORS: Record<string, string> = {
  clear: '#ffffff',
  forest: '#aaddaa',
  swamp: '#cccc88',
  city: '#888888',
  major_city: '#444444',
  water: '#aaddff',
  off_map: '#333333',
  default: '#ffffff',
};

export class HexRenderer {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;

  private mainGroup: d3.Selection<SVGGElement, unknown, null, undefined>;

  private highlightsGroup: d3.Selection<SVGGElement, unknown, null, undefined>;

  private config: RendererConfig;

  private mesh: MeshMap;

  constructor(mesh: MeshMap, config: RendererConfig) {
    this.mesh = mesh;
    this.config = config;

    // Clean container
    d3.select(config.element).selectAll('*').remove();

    // Create SVG
    this.svg = d3
      .select(config.element)
      .append('svg')
      .attr('width', config.width)
      .attr('height', config.height)
      .attr('viewBox', `0 0 ${config.width} ${config.height}`);

    // Create Main Group for Zoom/Pan
    this.mainGroup = this.svg.append('g');

    // Setup Groups in Layer Order
    this.mainGroup.append('g').attr('id', 'grid');
    this.mainGroup.append('g').attr('id', 'labels');
    this.mainGroup.append('g').attr('id', 'city-labels');
    this.highlightsGroup = this.mainGroup.append('g').attr('id', 'highlights');

    // Setup Zoom
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .on('zoom', (event) => {
        this.mainGroup.attr('transform', event.transform);
      });

    this.svg.call(zoom);

    this.render();
  }

  /**
   * Draw a temporary overlay for the specified hexes.
   */
  highlight(hexIds: string[]): void {
    const size = this.config.hexSize;
    const originX = this.config.origin?.x ?? 0;
    const originY = this.config.origin?.y ?? 0;

    const orientation = this.mesh.layout?.orientation ?? 'flat-down';
    const top = Hex.orientationTop(orientation);
    const corners = Hex.hexCorners({ x: 0, y: 0 }, size, top);
    const hexPoints = corners.map((p) => [p.x, p.y] as [number, number]);

    const pathGen = d3.line<[number, number]>().curve(d3.curveLinearClosed);

    this.highlightsGroup
      .selectAll('path')
      .data(hexIds)
      .join('path')
      .attr('d', () => pathGen(hexPoints))
      .attr('transform', (id: string) => {
        const hex = Hex.hexFromId(id);
        const p = Hex.hexToPixel(hex, size, top);
        return `translate(${p.x + originX}, ${p.y + originY})`;
      })
      .attr('fill', 'rgba(255, 255, 0, 0.4)') // Yellow semi-transparent
      .attr('pointer-events', 'none') // Don't block clicks
      .attr('stroke', '#ff0')
      .attr('stroke-width', 2);
  }

  /**
   * Re-render using a new mesh.
   */
  update(mesh: MeshMap): void {
    this.mesh = mesh;
    this.render();
  }

  private render() {
    const size = this.config.hexSize;
    const hexes = Array.from(this.mesh.getAllHexes());

    const layout = this.mesh.layout || {};
    const orientation = layout.orientation || 'flat-down';
    const top = Hex.orientationTop(orientation);

    const corners = Hex.hexCorners({ x: 0, y: 0 }, size, top);
    const hexPoints = corners.map((p) => [p.x, p.y] as [number, number]);

    const pathGen = d3.line<[number, number]>().curve(d3.curveLinearClosed);

    const gGrid = this.mainGroup.select('#grid');
    const gLabels = this.mainGroup.select('#labels');

    const originX = this.config.origin?.x ?? 0;
    const originY = this.config.origin?.y ?? 0;

    // Render Hexes
    gGrid
      .selectAll('path')
      .data(hexes, (d: HexArea) => d.id)
      .join('path')
      .attr('d', () => pathGen(hexPoints))
      .attr('transform', (d: HexArea) => {
        const hex = Hex.hexFromId(d.id);
        const p = Hex.hexToPixel(hex, size, top);
        return `translate(${p.x + originX}, ${p.y + originY})`;
      })
      .attr('fill', (d: HexArea) => {
        const parts = d.terrain.split(/\s+/);
        const terrain = parts[parts.length - 1];
        return TERRAIN_COLORS[terrain] || '#fff';
      })
      .attr('stroke', '#ccc')
      .attr('stroke-width', 1)
      .on('mouseover', function mouseOver() {
        d3.select(this).attr('stroke', '#000').attr('stroke-width', 2);
      })
      .on('mouseout', function mouseOut() {
        d3.select(this).attr('stroke', '#ccc').attr('stroke-width', 1);
      });

    // Render Labels
    gLabels
      .selectAll('text')
      .data(hexes, (d: HexArea) => d.id)
      .join('text')
      .attr('transform', (d: HexArea) => {
        const hex = Hex.hexFromId(d.id);
        const p = Hex.hexToPixel(hex, size, top);
        return `translate(${p.x + originX}, ${p.y + originY})`;
      })
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', size * 0.4)
      .attr('fill', '#000') // Darker text for visibility
      .text((d: HexArea) => {
        // cubeToOffset returns raw col/row (matching firstCol/firstRow convention)
        const hex = Hex.hexFromId(d.id);
        const offset = Hex.cubeToOffset(hex, orientation);
        const c = offset.x.toString().padStart(2, '0');
        const r = offset.y.toString().padStart(2, '0');
        return `${c}${r}`;
      });
  }
}
